import {
    MahjongGame,
    GameUpdate,
} from '@src/modules/mahjong/classes/mahjong.game.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'

describe('Suufuu Renda (Four Winds Discard)', () => {
    let game: MahjongGame
    const roomId = 'test-room'

    beforeEach(() => {
        const playerInfos = [
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: false },
            { id: 'p3', isAi: false },
            { id: 'p4', isAi: false },
        ]
        game = new MahjongGame(playerInfos)
        game.startGame(roomId)
    })

    function setupPlayersWithTile(tileStr: string) {
        const rank = parseInt(tileStr[0])
        const suit = tileStr[1] as Suit
        game.getPlayers().forEach((p) => {
            p.draw(new Tile(suit, rank, false, 0))
        })
    }

    it('should trigger Suufuu Renda when all 4 players discard the same wind in the first turn', () => {
        const windTile = '1z' // East Wind
        setupPlayersWithTile(windTile)

        let update: GameUpdate | undefined
        for (let i = 0; i < 4; i++) {
            const currentPlayer = game.getCurrentTurnPlayer()
            update = game.discardTile(roomId, currentPlayer.getId(), windTile)

            if (i < 3) {
                game.proceedToNextTurn(roomId)
            }
        }

        const roundEndedEvent = update?.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(roundEndedEvent).toBeDefined()
        expect(roundEndedEvent?.payload.abortReason).toBe('suufuu-renda')
    })

    it('should NOT trigger Suufuu Renda if the wind sequence is broken', () => {
        setupPlayersWithTile('1z')
        setupPlayersWithTile('2z')

        let update: GameUpdate | undefined
        for (let i = 0; i < 4; i++) {
            const currentPlayer = game.getCurrentTurnPlayer()
            const tileToDiscard = i === 1 ? '2z' : '1z' // Second player discards different wind
            update = game.discardTile(
                roomId,
                currentPlayer.getId(),
                tileToDiscard,
            )

            if (i < 3) {
                game.proceedToNextTurn(roomId)
            }
        }

        const roundEndedEvent = update?.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(roundEndedEvent).toBeUndefined()
    })

    it('should NOT trigger Suufuu Renda if first player does not discard a wind', () => {
        setupPlayersWithTile('1z')
        setupPlayersWithTile('1m')

        let update: GameUpdate | undefined
        for (let i = 0; i < 4; i++) {
            const currentPlayer = game.getCurrentTurnPlayer()
            const tileToDiscard = i === 0 ? '1m' : '1z'
            update = game.discardTile(
                roomId,
                currentPlayer.getId(),
                tileToDiscard,
            )

            if (i < 3) {
                game.proceedToNextTurn(roomId)
            }
        }

        const roundEndedEvent = update?.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(roundEndedEvent).toBeUndefined()
    })

    it('should NOT trigger Suufuu Renda if a call is made', () => {
        const windTile = '1z'
        setupPlayersWithTile(windTile)

        // Player 0 discards 1z
        const p0 = game.getCurrentTurnPlayer()
        game.discardTile(roomId, p0.getId(), windTile)

        // Player 1 Pon Player 0's 1z
        game.proceedToNextTurn(roomId) // Move to P1 turn for potential action context?
        // Actually performAction handles it.
        const p1 = game.getCurrentTurnPlayer()
        // Give P1 two 1z tiles
        p1.draw(new Tile('z', 1, false, 0))
        p1.draw(new Tile('z', 1, false, 0))

        game.performAction(roomId, p1.getId(), 'pon', windTile, ['1z', '1z'])

        // Now Player 1 discards something else
        p1.draw(new Tile('m', 2, false, 0))
        game.discardTile(roomId, p1.getId(), '2m')

        game.proceedToNextTurn(roomId)
        const p2 = game.getCurrentTurnPlayer()
        game.discardTile(roomId, p2.getId(), windTile)

        game.proceedToNextTurn(roomId)
        const p3 = game.getCurrentTurnPlayer()
        const update = game.discardTile(roomId, p3.getId(), windTile)

        const roundEndedEvent = update.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(roundEndedEvent).toBeUndefined()
    })
})
