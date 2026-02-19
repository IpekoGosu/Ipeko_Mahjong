import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { createTestManagers } from '../test_utils'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

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
    let ruleManager: RuleManager

    beforeEach(() => {
        roomId = 'test-room'
        const ai = new SimpleAI()
        const managers = createTestManagers()
        ruleManager = managers.ruleManager
        game = new TestMahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true, ai },
                { id: 'p3', isAi: true, ai },
                { id: 'p4', isAi: true, ai },
            ],
            managers.roundManager,
            managers.turnManager,
            managers.actionManager,
            managers.ruleEffectManager,
            managers.ruleManager,
            DEFAULT_4P_RULES,
        )
        game.startGame(roomId)
        // Reset points to standard for predictable tests
        game.getPlayers().forEach((p) => (p.points = 25000))
    })

    it('should end the game and give kyotaku to the game winner when a player goes below 0 points after Ron (by a non-oya)', () => {
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
            winners: [{ winnerId: p3.id, score: mockScore }],
            loserId: p2.id,
        })

        expect(result.isGameOver).toBe(true)
        expect(p2.points).toBe(-500)

        // Winner (p3) gets Ron points (1000) + kyotaku points (1000): 25000 + 2000 = 27000
        expect(p3.points).toBe(27000)
        // Oya (p1) stays at 25000
        expect(p1.points).toBe(25000)
    })

    it('should give kyotaku points to the game winner when game ends by dobon in Ryuukyoku', () => {
        const players = game.getPlayers()
        const p1 = players[0] // Oya
        const p2 = players[1] // Noten dobon

        p2.points = 500
        game.setKyotaku(2) // 2000 points on table

        // Mock Tenpai check to make p2 noten and others tenpai
        jest.spyOn(ruleManager, 'isTenpai').mockImplementation((p) => {
            return p.id !== p2.id
        })

        const result = game.callEndKyoku(roomId, {
            reason: 'ryuukyoku',
        })

        expect(result.isGameOver).toBe(true)
        expect(p2.points).toBe(-2500) // Pays 3000 total (1000 each to p1, p3, p4)

        // p1, p3, p4 all have 26000. p1 is first in array.
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
            winners: [{ winnerId: p3.id, score: mockScore }],
            loserId: players[1].id,
        })

        expect(result.isGameOver).toBe(false)
        // Winner (p3) gets Ron (1000) + Kyotaku (1000) = 27000
        expect(p3.points).toBe(27000)
        // Oya (p1) stays at 25000
        expect(p1.points).toBe(25000)
    })

    it('should give kyotaku to the top player if game ends by dobon in multiple Ron', () => {
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
                { winnerId: p3.id, score: mockScore },
                { winnerId: p4.id, score: mockScore },
            ],
            loserId: p2.id,
        })

        expect(result.isGameOver).toBe(true)
        // Loser (p2) pays 1000 to p3 and 1000 to p4
        // p2: 500 - 2000 = -1500
        expect(p2.points).toBe(-1500)

        // Winner 1 (p3) gets 1000 (Ron) + 1000 (Kyotaku) = 27000
        expect(p3.points).toBe(27000)
        // Winner 2 (p4) gets 1000 only = 26000
        expect(p4.points).toBe(26000)
        // Oya (p1) stays at 25000
        expect(p1.points).toBe(25000)
    })

    it('should give kyotaku to game winner if game ends by dobon in Tsumo', () => {
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
            winnerId: p3.id,
            score: mockScore,
        })

        expect(result.isGameOver).toBe(true)
        // p3 (Winner) gets Tsumo (1100) + kyotaku 1000. Net 25000 + 2100 = 27100.
        expect(p3.points).toBe(27100)
        // Oya (p1) paid 500 for Tsumo. Net 24500.
        expect(p1.points).toBe(24500)
    })

    it('should NOT end the game if a player has exactly 0 points', () => {
        const players = game.getPlayers()
        const p2 = players[1]
        const p3 = players[2]

        p2.points = 1000 // Will be 0 after paying 1000

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
            winners: [{ winnerId: p3.id, score: mockScore }],
            loserId: p2.id,
        })

        expect(p2.points).toBe(0)
        expect(result.isGameOver).toBe(false)
    })
})
