import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'
import { createTestGame } from '../test_utils'

describe('Seat Wind Calculation', () => {
    let game: MahjongGame

    beforeEach(() => {
        const playerInfos = [
            { id: 'player0', isAi: false },
            { id: 'player1', isAi: false },
            { id: 'player2', isAi: false },
            { id: 'player3', isAi: false },
        ]
        game = createTestGame(playerInfos)
        // Set Oya to player 0 (default)
        // startGame will shuffle, but we can manually set state for testing
        // or just use the game instance after startGame
        game.startGame('test-room')
    })

    it('should allow West player to win with West wind yaku', () => {
        // Find the player who is West
        const westPlayer = game
            .getPlayers()
            .find((p) => game.getSeatWind(p) === '3z')!
        expect(westPlayer).toBeDefined()

        // Clear hand and set specific hand: 123m 456p 789s 333z (West Pung) + 1s1s (Pair)
        // This hand has ONLY Jikaze West as yaku (assuming no riichi, no tsumo, etc.)
        westPlayer.resetKyokuState()

        const tiles = [
            '1m',
            '2m',
            '3m',
            '4p',
            '5p',
            '6p',
            '7s',
            '8s',
            '9s',
            '3z',
            '3z',
            '3z',
            '1s',
        ]

        tiles.forEach((t) => {
            const rank = parseInt(t[0])
            const suit = t[1] as Suit
            westPlayer.draw(new Tile(suit, rank, false, 0))
        })

        // Find another player to be the discarder
        const discarder = game.getPlayers().find((p) => p !== westPlayer)!
        const actions = game.getPossibleActions(discarder.id, '1s')

        expect(actions[westPlayer.id]).toBeDefined()
        expect(actions[westPlayer.id].ron).toBe(true)
    })

    it('should allow North player to win with North wind yaku', () => {
        // Find the player who is North
        const northPlayer = game
            .getPlayers()
            .find((p) => game.getSeatWind(p) === '4z')!
        expect(northPlayer).toBeDefined()

        northPlayer.resetKyokuState()

        const tiles = [
            '1m',
            '2m',
            '3m',
            '4p',
            '5p',
            '6p',
            '7s',
            '8s',
            '9s',
            '4z',
            '4z',
            '4z',
            '1s',
        ]

        tiles.forEach((t) => {
            const rank = parseInt(t[0])
            const suit = t[1] as Suit
            northPlayer.draw(new Tile(suit, rank, false, 0))
        })

        const discarder = game.getPlayers().find((p) => p !== northPlayer)!
        const actions = game.getPossibleActions(discarder.id, '1s')

        expect(actions[northPlayer.id]).toBeDefined()
        expect(actions[northPlayer.id].ron).toBe(true)
    })

    it('should NOT allow West player to win with North wind Pung if it is not their seat wind', () => {
        const westPlayer = game
            .getPlayers()
            .find((p) => game.getSeatWind(p) === '3z')!
        expect(westPlayer).toBeDefined()

        westPlayer.resetKyokuState()

        const tiles = [
            '1m',
            '2m',
            '3m',
            '4p',
            '5p',
            '6p',
            '7s',
            '8s',
            '9s',
            '4z',
            '4z',
            '4z', // North Pung - not a yaku for West player
            '1s',
        ]

        tiles.forEach((t) => {
            const rank = parseInt(t[0])
            const suit = t[1] as Suit
            westPlayer.draw(new Tile(suit, rank, false, 0))
        })

        const discarder = game.getPlayers().find((p) => p !== westPlayer)!
        const actions = game.getPossibleActions(discarder.id, '1s')

        // Should not have Ron because no Yaku
        if (actions[westPlayer.id]) {
            expect(actions[westPlayer.id].ron).toBeUndefined()
        }
    })
})
