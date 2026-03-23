import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { createTestManagers, mockLogger } from '../test_utils'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestPlayer extends Player {
    public setHand(tiles: Tile[]) {
        this._hand = tiles
    }
    public setPoints(p: number) {
        this._points = p
    }
}

class TestMahjongGame extends MahjongGame {
    protected createPlayer(info: { id: string; isAi: boolean }): Player {
        const player = new TestPlayer(info.id, false, info.isAi, mockLogger)
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

describe('Mahjong - Pao (Responsibility Payment) Rules', () => {
    let game: TestMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        const managers = createTestManagers()
        game = new TestMahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: false },
                { id: 'p3', isAi: false },
                { id: 'p4', isAi: false },
            ],
            managers.roundManager,
            managers.turnManager,
            managers.actionManager,
            managers.ruleEffectManager,
            managers.ruleManager,
            DEFAULT_4P_RULES,
            mockLogger,
        )
        const p1 = new TestPlayer('p1', true, false, mockLogger)
        const p2 = new TestPlayer('p2', false, false, mockLogger)
        const p3 = new TestPlayer('p3', false, false, mockLogger)
        const p4 = new TestPlayer('p4', false, false, mockLogger)
        game.setPlayers([p1, p2, p3, p4])
        game.roundManager.initialize(['p1', 'p2', 'p3', 'p4'])
        game.setOyaIndex(0) // p1 is Oya
        game.getPlayers().forEach((p) => (p.points = 25000))
    })

    it('should trigger Pao for Daisangen when a player discards the 3rd dragon (Tsumo)', () => {
        const players = game.getPlayers()
        const p1 = game.getTestPlayer('p1')
        p1.setHand([
            new Tile('z', 5, false, 1),
            new Tile('z', 5, false, 2),
            new Tile('z', 6, false, 1),
            new Tile('z', 6, false, 2),
            new Tile('z', 7, false, 1),
            new Tile('z', 7, false, 2),
        ])

        // 1st Dragon from p2
        game.actionManager.activeDiscard = {
            playerId: 'p2',
            tile: new Tile('z', 5, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '5z', ['5z', '5z'])

        // 2nd Dragon from p3
        game.actionManager.activeDiscard = {
            playerId: 'p3',
            tile: new Tile('z', 6, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '6z', ['6z', '6z'])

        // 3rd Dragon from p4 (responsible)
        game.actionManager.activeDiscard = {
            playerId: 'p4',
            tile: new Tile('z', 7, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '7z', ['7z', '7z'])

        // Manually inject pao status to ensure RoundManager logic is tested
        game.setPaoStatus('p1', 'Daisangen', 'p4')

        const yakumanScore: ScoreCalculation = {
            han: 13,
            fu: 20,
            ten: 48000,
            yaku: { Daisangen: '13' },
            yakuman: 1,
            oya: [16000],
            ko: [16000, 8000],
            name: 'Daisangen',
            text: 'Yakuman',
        }

        // p1 wins by Tsumo
        game.callEndKyoku(roomId, {
            reason: 'tsumo',
            winnerId: 'p1',
            score: yakumanScore,
            pao: [{ winnerId: 'p1', responsiblePlayerId: 'p4' }],
        })

        // p4 (responsible) should pay all 48000
        expect(p1.points).toBe(73000)
        expect(players.find((p) => p.id === 'p4')?.points).toBe(-23000)
        expect(players.find((p) => p.id === 'p2')?.points).toBe(25000)
        expect(players.find((p) => p.id === 'p3')?.points).toBe(25000)
    })

    it('should split payment between discarder and responsible player for Ron in Pao', () => {
        const players = game.getPlayers()
        const p1 = game.getTestPlayer('p1')
        p1.setHand([
            new Tile('z', 5, false, 1),
            new Tile('z', 5, false, 2),
            new Tile('z', 6, false, 1),
            new Tile('z', 6, false, 2),
            new Tile('z', 7, false, 1),
            new Tile('z', 7, false, 2),
        ])

        // Setup Daisangen Pao for p1 (p4 responsible)
        game.actionManager.activeDiscard = {
            playerId: 'p2',
            tile: new Tile('z', 5, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '5z', ['5z', '5z'])
        game.actionManager.activeDiscard = {
            playerId: 'p3',
            tile: new Tile('z', 6, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '6z', ['6z', '6z'])
        game.actionManager.activeDiscard = {
            playerId: 'p4',
            tile: new Tile('z', 7, false, 0),
        }
        game.performAction(roomId, 'p1', 'pon', '7z', ['7z', '7z'])

        // Manually inject pao status
        game.setPaoStatus('p1', 'Daisangen', 'p4')

        // Now p2 discards a winning tile for p1
        game.actionManager.activeDiscard = {
            playerId: 'p2',
            tile: new Tile('m', 1, false, 0),
        }

        const yakumanScore: ScoreCalculation = {
            han: 13,
            fu: 20,
            ten: 48000,
            yaku: { Daisangen: '13' },
            yakuman: 1,
            oya: [16000],
            ko: [16000, 8000],
            name: 'Daisangen',
            text: 'Yakuman',
        }

        // p1 wins by Ron on p2
        game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: 'p1', score: yakumanScore }],
            loserId: 'p2',
            pao: [{ winnerId: 'p1', responsiblePlayerId: 'p4' }],
        })

        // p1: 25000 + 48000 = 73000
        // p2 (discarder): 25000 - 24000 = 1000
        // p4 (responsible): 25000 - 24000 = 1000
        expect(p1.points).toBe(73000)
        expect(players.find((p) => p.id === 'p2')?.points).toBe(1000)
        expect(players.find((p) => p.id === 'p4')?.points).toBe(1000)
    })

    it('should split payment between discarder and responsible player for Ron in Pao with honba', () => {
        const players = game.getPlayers()
        const p1 = game.getTestPlayer('p1')
        game.roundManager.honba = 1 // 1 honba = 300 points

        // Setup Daisangen Pao for p1 (p4 responsible)
        game.setPaoStatus('p1', 'Daisangen', 'p4')

        const yakumanScore: ScoreCalculation = {
            han: 13,
            fu: 20,
            ten: 48000,
            yaku: { Daisangen: '13' },
            yakuman: 1,
            oya: [16000],
            ko: [16000, 8000],
            name: 'Daisangen',
            text: 'Yakuman',
        }

        // p1 wins by Ron on p2
        game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: 'p1', score: yakumanScore }],
            loserId: 'p2',
            pao: [{ winnerId: 'p1', responsiblePlayerId: 'p4' }],
        })

        // Expected (Standard Rules):
        // totalPoints = 48000 + 300 = 48300
        // halfBase = 48000 / 2 = 24000
        // loser (p2) pays halfBase + honba = 24000 + 300 = 24300
        // responsible (p4) pays halfBase = 24000
        // p1: 25000 + 48300 = 73300
        // p2: 25000 - 24300 = 700
        // p4: 25000 - 24000 = 1000

        expect(p1.points).toBe(73300)
        expect(players.find((p) => p.id === 'p2')?.points).toBe(700)
        expect(players.find((p) => p.id === 'p4')?.points).toBe(1000)
    })
})
