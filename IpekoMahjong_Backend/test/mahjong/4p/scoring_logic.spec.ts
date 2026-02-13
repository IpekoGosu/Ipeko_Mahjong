import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { createTestManagers } from '../test_utils'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestMahjongGame extends MahjongGame {
    public triggerEndKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
            abortReason?: string
        },
    ) {
        return this.endKyoku(roomId, result)
    }
}

describe('Mahjong Scoring Logic', () => {
    let game: TestMahjongGame
    let players: Player[]

    beforeEach(() => {
        // 4 players
        const ai = new SimpleAI()
        const managers = createTestManagers()
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
        // Seating is randomized in startGame, but we can force it or inspect it.
        game.startGame('test-room')
        players = game.getPlayers()
        // Reset points for predictability
        players.forEach((p) => (p.points = 25000))
    })

    it('should deduct more points from Oya when a Ko wins by Ron (40 fu 1 han)', () => {
        // Find Oya
        const oya = players.find((p) => p.isOya)!
        const ko = players.find((p) => !p.isOya)!

        // Mock a Ron score result for 40 fu 1 han
        const scoreResult: ScoreCalculation = {
            han: 1,
            fu: 40,
            ten: 1300,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        // Scenario 1: Ko wins from Oya
        game.triggerEndKyoku('test-room', {
            reason: 'ron',
            winners: [{ winnerId: ko.getId(), score: scoreResult }],
            loserId: oya.getId(),
        })

        expect(oya.points).toBe(25000 - 2000)
        expect(ko.points).toBe(25000 + 2000)
    })

    it('should deduct standard points from Ko when a Ko wins by Ron (40 fu 1 han)', () => {
        // Find 2 Kos
        const kos = players.filter((p) => !p.isOya)
        const winner = kos[0]
        const loser = kos[1]

        const scoreResult: ScoreCalculation = {
            han: 1,
            fu: 40,
            ten: 1300,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        game.triggerEndKyoku('test-room', {
            reason: 'ron',
            winners: [{ winnerId: winner.getId(), score: scoreResult }],
            loserId: loser.getId(),
        })

        expect(loser.points).toBe(25000 - 1300)
        expect(winner.points).toBe(25000 + 1300)
    })

    it('should deduct points correctly when Oya wins by Ron (40 fu 1 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const ko = players.find((p) => !p.isOya)!

        // Oya Ron 40fu 1han => 2000
        const scoreResult: ScoreCalculation = {
            han: 1,
            fu: 40,
            ten: 2000,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        game.triggerEndKyoku('test-room', {
            reason: 'ron',
            winners: [{ winnerId: oya.getId(), score: scoreResult }],
            loserId: ko.getId(),
        })

        expect(ko.points).toBe(25000 - 2000)
        expect(oya.points).toBe(25000 + 2000)
    })

    it('should deduct correct points from Oya and Ko when a Ko wins by Tsumo (40 fu 2 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const winner = players.find((p) => !p.isOya)!
        const otherKos = players.filter((p) => !p.isOya && p !== winner)

        // 40 fu 2 han Ko Tsumo => (1300, 700)
        const scoreResult: ScoreCalculation = {
            han: 2,
            fu: 40,
            ten: 2700,
            yaku: { test: '2飜' },
            yakuman: 0,
            oya: [1300, 1300, 1300],
            ko: [1300, 700, 700],
            name: '',
            text: '',
        }

        game.triggerEndKyoku('test-room', {
            reason: 'tsumo',
            winnerId: winner.getId(),
            score: scoreResult,
        })

        expect(oya.points).toBe(25000 - 1300)
        otherKos.forEach((ko) => {
            expect(ko.points).toBe(25000 - 700)
        })
        expect(winner.points).toBe(25000 + 1300 + 700 + 700)
    })

    it('should deduct correct points from all Ko when Oya wins by Tsumo (40 fu 2 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const kos = players.filter((p) => !p.isOya)

        // 40 fu 2 han Oya Tsumo => (1300all)
        const scoreResult: ScoreCalculation = {
            han: 2,
            fu: 40,
            ten: 3900,
            yaku: { test: '2飜' },
            yakuman: 0,
            oya: [1300, 1300, 1300],
            ko: [1300, 700, 700],
            name: '',
            text: '',
        }

        game.triggerEndKyoku('test-room', {
            reason: 'tsumo',
            winnerId: oya.getId(),
            score: scoreResult,
        })

        kos.forEach((ko) => {
            expect(ko.points).toBe(25000 - 1300)
        })
        expect(oya.points).toBe(25000 + 3900)
    })
})
