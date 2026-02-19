import { SanmaMahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.Sanma'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { createTestSanmaManagers } from '../test_utils'
import { DEFAULT_3P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestPlayer extends Player {
    public setHand(tiles: Tile[]) {
        this.hand = tiles
    }
    public setPoints(p: number) {
        this.points = p
    }
}

class TestSanmaMahjongGame extends SanmaMahjongGame {
    protected createPlayer(info: { id: string; isAi: boolean }): Player {
        const player = new TestPlayer(info.id, false, info.isAi)
        return player
    }

    public getTestPlayer(id: string): TestPlayer {
        return this.getPlayer(id) as TestPlayer
    }

    public setOyaIndex(val: number) {
        this.roundManager.oyaIndex = val
        this.getPlayers().forEach((p, idx) => {
            p.isOya = idx === val
        })
    }

    public setPlayers(p: Player[]) {
        this.players = p
    }

    public callEndKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
            pao?: { winnerId: string; responsiblePlayerId: string }[]
        },
    ) {
        return this.endKyoku(roomId, result)
    }

    public setPaoStatus(
        winnerId: string,
        yakumanName: string,
        responsiblePlayerId: string,
    ) {
        let paoMap = this.paoStatus.get(winnerId)
        if (!paoMap) {
            paoMap = new Map<string, string>()
            this.paoStatus.set(winnerId, paoMap)
        }
        paoMap.set(yakumanName, responsiblePlayerId)
    }
}

describe('Mahjong Sanma - Pao (Responsibility Payment) Rules', () => {
    let game: TestSanmaMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room-sanma'
        const managers = createTestSanmaManagers()
        game = new TestSanmaMahjongGame(
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
        const p1 = new TestPlayer('p1', true, false)
        const p2 = new TestPlayer('p2', false, false)
        const p3 = new TestPlayer('p3', false, false)
        game.setPlayers([p1, p2, p3])
        game.roundManager.initialize(['p1', 'p2', 'p3'])
        game.setOyaIndex(0) // p1 is Oya
        game.getPlayers().forEach((p) => (p.points = 35000))
    })

    it('should split payment between discarder and responsible player for Ron in Pao with honba (Sanma)', () => {
        const players = game.getPlayers()
        const p1 = game.getTestPlayer('p1')
        game.roundManager.honba = 1 // 1 honba = 300 points

        // Setup Daisangen Pao for p1 (p3 responsible)
        game.setPaoStatus('p1', 'Daisangen', 'p3')

        const yakumanScore: ScoreCalculation = {
            han: 13,
            fu: 20,
            ten: 48000,
            yaku: { Daisangen: '13' },
            yakuman: 1,
            oya: [16000],
            ko: [16000, 16000], // In Sanma, Tsumo payments might be different, but for Yakuman it's usually 16000 each for Ko.
            name: 'Daisangen',
            text: 'Yakuman',
        }

        // p1 (Oya) wins by Ron on p2
        game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: 'p1', score: yakumanScore }],
            loserId: 'p2',
            pao: [{ winnerId: 'p1', responsiblePlayerId: 'p3' }],
        })

        // Expected (Standard Rules):
        // totalPoints = 48000 + 300 = 48300
        // halfBase = 48000 / 2 = 24000
        // loser (p2) pays halfBase + honba = 24000 + 300 = 24300
        // responsible (p3) pays halfBase = 24000
        // p1: 35000 + 48300 = 83300
        // p2: 35000 - 24300 = 10700
        // p3: 35000 - 24000 = 11000

        expect(p1.points).toBe(83300)
        expect(players.find((p) => p.id === 'p2')?.points).toBe(10700)
        expect(players.find((p) => p.id === 'p3')?.points).toBe(11000)
    })

    it('should handle Tsumo Pao in Sanma', () => {
        const players = game.getPlayers()
        const p1 = game.getTestPlayer('p1')
        game.roundManager.honba = 0

        // Setup Daisangen Pao for p1 (p3 responsible)
        game.setPaoStatus('p1', 'Daisangen', 'p3')

        const yakumanScore: ScoreCalculation = {
            han: 13,
            fu: 20,
            ten: 48000,
            yaku: { Daisangen: '13' },
            yakuman: 1,
            oya: [16000],
            ko: [16000, 16000],
            name: 'Daisangen',
            text: 'Yakuman',
        }

        // p1 wins by Tsumo
        game.callEndKyoku(roomId, {
            reason: 'tsumo',
            winnerId: 'p1',
            score: yakumanScore,
            pao: [{ winnerId: 'p1', responsiblePlayerId: 'p3' }],
        })

        // p3 (responsible) should pay all 48000
        expect(p1.points).toBe(83000)
        expect(players.find((p) => p.id === 'p3')?.points).toBe(35000 - 48000) // -13000
        expect(players.find((p) => p.id === 'p2')?.points).toBe(35000)
    })
})
