import { SanmaMahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.Sanma'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { createTestSanmaManagers } from '../test_utils'
import { DEFAULT_3P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestSanmaGame extends SanmaMahjongGame {
    public triggerEndKyoku(
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
}

describe('Sanma Scoring Logic', () => {
    let game: TestSanmaGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room-sanma'
        const managers = createTestSanmaManagers()
        game = new TestSanmaGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: false },
                { id: 'p3', isAi: false },
            ],
            managers.roundManager,
            managers.turnManager,
            managers.actionManager,
            managers.ruleEffectManager,
            managers.ruleManager,
            DEFAULT_3P_RULES,
        )
        game.startGame(roomId)
        game.getPlayers().forEach((p) => (p.points = 25000))
        game.roundManager.kyotaku = 0
    })

    it('should correctly distribute points for Oya Tsumo in Sanma', () => {
        const players = game.getPlayers()
        const oya = players.find((p) => p.isOya)!
        const kos = players.filter((p) => !p.isOya)

        // Mock 40 fu 2 han Oya Tsumo (3900 total, 1300 from each Ko)
        const score: ScoreCalculation = {
            han: 2,
            fu: 40,
            ten: 3900,
            yaku: { Test: '2' },
            yakuman: 0,
            oya: [1300], // Each Ko pays 1300
            ko: [1300],
            name: '',
            text: '',
        }

        game.triggerEndKyoku(roomId, {
            reason: 'tsumo',
            winnerId: oya.id,
            score,
        })

        expect(oya.points).toBe(25000 + 3900) // 25000 + ten (3900)
        kos.forEach((ko) => {
            expect(ko.points).toBe(25000 - 1300)
        })
    })

    it('should correctly distribute points for Ko Tsumo in Sanma', () => {
        const players = game.getPlayers()
        const winner = players.find((p) => !p.isOya)!
        const oya = players.find((p) => p.isOya)!
        const otherKo = players.find((p) => !p.isOya && p !== winner)!

        // Mock 40 fu 2 han Ko Tsumo (2700 total: 1300 from Oya, 700 from other Ko)
        // Note: 1300 + 700 = 2000. In Sanma usually North's share is ignored or handled differently.
        // Our current implementation in RoundManagerSanma:
        // oyaPayment = score.ko[0] (1300)
        // koPayment = score.ko[1] (700)
        const score: ScoreCalculation = {
            han: 2,
            fu: 40,
            ten: 2700,
            yaku: { Test: '2' },
            yakuman: 0,
            oya: [1300],
            ko: [1300, 700],
            name: '',
            text: '',
        }

        game.triggerEndKyoku(roomId, {
            reason: 'tsumo',
            winnerId: winner.id,
            score,
        })

        expect(winner.points).toBe(25000 + 2700)
        expect(oya.points).toBe(25000 - 1300)
        expect(otherKo.points).toBe(25000 - 700)
    })
})
