import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { Socket, io } from 'socket.io-client'
import { MahjongModule } from '../mahjong.module'
import { AddressInfo } from 'net'
import { Server } from 'http'

describe('MahjongGateway', () => {
    let app: INestApplication
    let client: Socket
    let port: number

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [MahjongModule],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.listen(0) // Listen on a random port
        const server = app.getHttpServer() as Server
        const address = server.address() as AddressInfo
        port = address.port
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach((done) => {
        // Connect to the WebSocket server
        client = io(`http://localhost:${port}`)
        client.on('connect', () => {
            done()
        })
    })

    afterEach(() => {
        if (client.connected) {
            client.disconnect()
        }
    })

    it('should start a game and receive initial state', (done) => {
        client.emit('start-game')

        let gameStartedReceived = false
        let turnChangedReceived = false

        client.on('game-started', (data: Record<string, unknown>) => {
            gameStartedReceived = true
            expect(data).toHaveProperty('roomId')
            expect(data).toHaveProperty('yourPlayerId', client.id)
            expect(data.players).toHaveLength(4)
            expect(data.hand).toHaveLength(13)
            expect(data.dora).toHaveLength(1)

            // Check if all events are received
            if (gameStartedReceived && turnChangedReceived) {
                done()
            }
        })

        client.on('turn-changed', (data: Record<string, unknown>) => {
            turnChangedReceived = true
            expect(data).toHaveProperty('playerId', client.id)
            if (gameStartedReceived && turnChangedReceived) {
                done()
            }
        })

        client.on('new-tile-drawn', (data: Record<string, unknown>) => {
            expect(data).toHaveProperty('tile')
            // This might not happen for Oya start
        })
    }, 10000)

    it('should play a full round (discard -> AI turns -> my turn)', (done) => {
        client.emit('start-game')

        let myRoomId: string
        let myHand: string[] = []

        client.on(
            'game-started',
            (data: { roomId: string; hand: string[] }) => {
                myRoomId = data.roomId
                myHand = data.hand

                // If I am Oya (which I am), I discard immediately to start the game
                const tileToDiscard = myHand[myHand.length - 1]
                client.emit('discard-tile', {
                    roomId: myRoomId,
                    tile: tileToDiscard,
                })
            },
        )

        client.on('new-tile-drawn', (data: Record<string, unknown>) => {
            // This event is received when it's my turn AGAIN (after AIs played)
            // or if I wasn't Oya (but I am).

            // If this fires, it means the round completed successfully!
            expect(data).toHaveProperty('tile')
            done()
        })
    }, 10000)
})
