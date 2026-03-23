import { SanmaMahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.Sanma'
import { createTestSanmaGame } from '../test_utils'

describe('Sanma Mahjong Game Basics', () => {
    let game: SanmaMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room-sanma'
        game = createTestSanmaGame([
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: false },
            { id: 'p3', isAi: false },
        ])
    })

    it('should have 3 players', () => {
        expect(game.getPlayers().length).toBe(3)
    })

    it('should have 108 tiles in total wall (Sanma: no 2-8 man)', () => {
        // WallSanma should have 108 tiles
        // 4 * (9p + 9s + 7z + 2m (1,9m)) = 4 * 27 = 108
        expect(game.getWallCount() + game.getDeadWallCount()).toBe(108)
    })

    it('should not allow Chi in Sanma', () => {
        game.startGame(roomId)

        // p1 is Oya (usually index 0 after shuffle if we don't force it, but let's assume)

        // Let's find who is current turn player
        const currentPlayer = game.getCurrentTurnPlayer()
        const nextPlayerIndex =
            (game.getPlayers().indexOf(currentPlayer) + 1) % 3
        const nextPlayer = game.getPlayers()[nextPlayerIndex]

        // currentPlayer discards a tile that could be chi'd in 4p
        // But in Sanma, getPossibleActions should not return chi
        const actions = game.getPossibleActions(currentPlayer.id, '2s')

        expect(actions[nextPlayer.id]?.chi).toBeFalsy()
    })

    it('should handle round transition correctly in Sanma (skip North)', () => {
        game.startGame(roomId)
        // Seat winds in Sanma: 1z, 2z, 3z (East, South, West)
        const winds = game.getPlayers().map((p) => game.getSeatWind(p))
        expect(winds).toContain('1z')
        expect(winds).toContain('2z')
        expect(winds).toContain('3z')
        expect(winds).not.toContain('4z')
    })
})
