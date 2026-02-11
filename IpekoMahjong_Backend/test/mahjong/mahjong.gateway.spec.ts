import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { Socket, io } from 'socket.io-client'
import { MahjongModule } from '@src/modules/mahjong/mahjong.module'
import { AddressInfo } from 'net'
import { Server } from 'http'
import { JwtService } from '@nestjs/jwt'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { initializeEnv } from '@src/common/utils/env'

// Load .env for tests
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

describe('MahjongGateway', () => {
    let app: INestApplication
    let client: Socket
    let port: number
    let jwtService: JwtService
    let token: string

    beforeAll(async () => {
        await initializeEnv()

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [MahjongModule],
        }).compile()

        jwtService = moduleFixture.get<JwtService>(JwtService)
        token = jwtService.sign({ sub: 1, email: 'test@example.com' })

        app = moduleFixture.createNestApplication({ logger: false })
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
        client = io(`http://localhost:${port}`, {
            auth: { token },
            transports: ['websocket'],
            forceNew: true,
        })
        client.on('connect', () => {
            done()
        })
        client.on('connect_error', (err) => {
            console.error('Connection Error:', err.message)
            done(err)
        })
    })

    afterEach(() => {
        if (client) {
            client.close()
        }
    })

    it('should start a game and receive initial state', (done) => {
        client.emit('start-game')

        let gameStartedReceived = false
        let turnChangedReceived = false
        let doneCalled = false

        client.on('game-started', (data: Record<string, unknown>) => {
            gameStartedReceived = true
            expect(data).toHaveProperty('roomId')
            expect(data).toHaveProperty('yourPlayerId', client.id)
            expect(data.players).toHaveLength(4)
            expect(data.hand).toHaveLength(13)
            expect(data.dora).toHaveLength(1)

            // Check if all events are received
            if (gameStartedReceived && turnChangedReceived && !doneCalled) {
                doneCalled = true
                done()
            }
        })

        client.on('turn-changed', (data: Record<string, unknown>) => {
            turnChangedReceived = true
            expect(data).toHaveProperty('playerId')
            if (gameStartedReceived && turnChangedReceived && !doneCalled) {
                doneCalled = true
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
        let myPlayerId: string
        let myTurnCount = 0
        let doneCalled = false

        client.on(
            'game-started',
            (data: {
                roomId: string
                hand: string[]
                yourPlayerId: string
                oyaId: string
            }) => {
                myRoomId = data.roomId
                myPlayerId = data.yourPlayerId
                // console.log(`[TEST] Game started. Room: ${myRoomId}, Me: ${myPlayerId}`)
            },
        )

        client.on('turn-changed', (data: { playerId: string }) => {
            // console.log(`[TEST] Turn changed to: ${data.playerId}`)
            if (data.playerId === myPlayerId) {
                myTurnCount++
                // console.log(`[TEST] My turn count: ${myTurnCount}`)
                if (myTurnCount === 2 && !doneCalled) {
                    doneCalled = true
                    // console.log(`[TEST] Success! Reached my second turn.`)
                    done()
                }
            }
        })

        client.on('new-tile-drawn', (data: { tile: string }) => {
            // console.log(`[TEST] New tile drawn: ${data.tile}`)
            // Always discard when drawing a tile to keep the game moving
            // console.log(`[TEST] Discarding ${data.tile} for me`)
            client.emit('discard-tile', {
                roomId: myRoomId,
                tile: data.tile,
            })
        })

        client.on(
            'update-discard',
            (data: { playerId: string; tile: string }) => {
                // console.log(`[TEST] Discard: ${data.tile} by ${data.playerId}`)
            },
        )
    }, 20000)
})
