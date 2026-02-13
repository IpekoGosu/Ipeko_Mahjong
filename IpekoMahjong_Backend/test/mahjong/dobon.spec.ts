import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/rule.manager'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'

class TestMahjongGame extends MahjongGame {
    public setKyotaku(val: number) {
        this.roundManager.kyotaku = val
    }
    public callEndKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
        },
    ) {
        return this.endKyoku(roomId, result)
    }
    public callEndKyokuMulti(
        roomId: string,
        result: {
            reason: 'ron'
            winners: { winnerId: string; score: ScoreCalculation }[]
            loserId: string
        },
    ) {
        return this.endKyoku(roomId, result)
    }
}

describe('MahjongGame - Dobon (Bankruptcy) Rules', () => {
    let game: TestMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        const ai = new SimpleAI()
        game = new TestMahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true, ai },
                { id: 'p3', isAi: true, ai },
                { id: 'p4', isAi: true, ai },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame(roomId)
        // Reset points to standard for predictable tests
        game.getPlayers().forEach((p) => (p.points = 25000))
    })

    it('should end the game and give kyotaku to Oya when a player goes below 0 points after Ron (by a non-oya)', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p2 = players[1] // Ko
        const p3 = players[2] // Ko (Winner)

        p2.points = 500 // Will dobon if pays 1000
        game.setKyotaku(1) // 1000 points on table

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: p3.getId(), score: mockScore }],
            loserId: p2.getId(),
        })

        expect(result.isGameOver).toBe(true)
        expect(p2.points).toBe(-500)

        // Winner (p3) gets Ron points only: 25000 + 1000 = 26000
        expect(p3.points).toBe(26000)
        // Oya (p1) gets kyotaku points: 25000 + 1000 = 26000
        expect(p1.points).toBe(26000)
    })

    it('should give kyotaku points to the oya when game ends by dobon in Ryuukyoku', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p2 = players[1] // Noten dobon

        p2.points = 500
        game.setKyotaku(2) // 2000 points on table

        // Mock Tenpai check to make p2 noten and others tenpai
        jest.spyOn(RuleManager, 'isTenpai').mockImplementation((p) => {
            return p.getId() !== p2.getId()
        })

        const result = game.callEndKyoku(roomId, {
            reason: 'ryuukyoku',
        })

        expect(result.isGameOver).toBe(true)
        expect(p2.points).toBe(-2500) // Pays 3000 total (1000 each to p1, p3, p4)

        // p1 (Oya) was Tenpai: 25000 + 1000 (Tenpai) + 2000 (Kyotaku) = 28000
        expect(p1.points).toBe(28000)
    })

    it('should give kyotaku to winner if game DOES NOT end', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p3 = players[2] // Winner

        p1.points = 25000
        p3.points = 25000
        game.setKyotaku(1) // 1000 points on table

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: p3.getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(false)
        // Winner (p3) gets Ron (1000) + Kyotaku (1000) = 27000
        expect(p3.points).toBe(27000)
        // Oya (p1) stays at 25000
        expect(p1.points).toBe(25000)
    })

    it('should give kyotaku to Oya if game ends by dobon in multiple Ron', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p2 = players[1] // Loser (p2)
        const p3 = players[2] // Winner 1 (p3)
        const p4 = players[3] // Winner 2 (p4)

        p2.points = 500
        game.setKyotaku(1) // 1000 points on table

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyokuMulti(roomId, {
            reason: 'ron',
            winners: [
                { winnerId: p3.getId(), score: mockScore },
                { winnerId: p4.getId(), score: mockScore },
            ],
            loserId: p2.getId(),
        })

        expect(result.isGameOver).toBe(true)
        // Loser (p2) pays 1000 to p3 and 1000 to p4
        // p2: 500 - 2000 = -1500
        expect(p2.points).toBe(-1500)

        // Winner 1 (p3) gets 1000 only
        expect(p3.points).toBe(26000)
        // Winner 2 (p4) gets 1000 only
        expect(p4.points).toBe(26000)
        // Oya (p1) gets kyotaku 1000
        expect(p1.points).toBe(26000)
    })

    it('should give kyotaku to Oya if game ends by dobon in Tsumo', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p2 = players[1] // Ko
        const p3 = players[2] // Winner

        p2.points = 200 // Will dobon if pays 300
        game.setKyotaku(1) // 1000 points on table

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1100, // 300+300+500
            yaku: { Tsumo: '1' },
            yakuman: 0,
            oya: [500],
            ko: [500, 300],
            name: 'Tsumo',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'tsumo',
            winnerId: p3.getId(),
            score: mockScore,
        })

        expect(result.isGameOver).toBe(true)
        // Oya (p1) gets kyotaku 1000, but paid 500 for Tsumo. Net +500.
        expect(p1.points).toBe(25500)
    })
})
