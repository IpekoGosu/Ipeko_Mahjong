import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { RoundManagerSanma } from '@src/modules/mahjong/classes/managers/RoundManager.Sanma'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    ScoreCalculation,
    WinContext,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { mockLogger } from './test_utils'

class MockTestPlayer extends Player {
    public setHand(tiles: Tile[]): void {
        this._hand = tiles
    }

    public setPoints(p: number): void {
        this.points = p
    }

    public setDiscards(tiles: Tile[]): void {
        this._discards = tiles
    }
}

describe('Comprehensive Scoring & Settlement Logic (Oya/Ko & 3p/4p)', () => {
    let ruleManager: RuleManager
    let roundManager4p: RoundManager4p
    let roundManagerSanma: RoundManagerSanma

    const createPlayer = (id: string, isOya: boolean): MockTestPlayer => {
        const p = new MockTestPlayer(id, isOya, false, mockLogger)
        p.points = 25000
        return p
    }

    const createTiles = (strList: string[]): Tile[] => {
        return strList.map((s, idx) => Tile.fromString(s, idx))
    }

    const createMockScore = (params: {
        han: number
        fu: number
        ten: number
        oya: number[]
        ko: number[]
        name?: string
        yakuman?: number
    }): ScoreCalculation => ({
        han: params.han,
        fu: params.fu,
        ten: params.ten,
        oya: params.oya,
        ko: params.ko,
        yaku: { 테스트역: `${params.han}飜` },
        yakuman: params.yakuman ?? 0,
        name: params.name ?? '',
        text: '',
    })

    beforeEach(() => {
        ruleManager = new RuleManager(mockLogger)
        roundManager4p = new RoundManager4p(ruleManager, mockLogger)
        roundManagerSanma = new RoundManagerSanma(ruleManager, mockLogger)
    })

    describe('RuleManager Scoring Tables (Fu & Han for Oya and Ko)', () => {
        it('should calculate 20 Fu Pinfu Tsumo for Ko (2 Han: 400/700, 1500 total)', () => {
            /* GEMINI THINKING */
            // 20 Fu 2 Han Pinfu Tsumo: 123m 456m 123p 78s 44z (4z North is valueless for East round / West seat)
            // 13 tiles hand + winningTile '9s'
            const koPlayer = new MockTestPlayer(
                'ko-p',
                false,
                false,
                mockLogger,
            )
            koPlayer.isOya = false
            koPlayer.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '1p',
                    '2p',
                    '3p',
                    '7s',
                    '8s',
                    '4z',
                    '4z',
                ]),
            )
            const context: WinContext = {
                bakaze: '1z',
                seatWind: '3z',
                dora: ['9s'], // Indicator 9s -> Dora 1s (No dora in hand)
                isTsumo: true,
                winningTile: '9s',
            }

            const score = ruleManager.calculateScore(koPlayer, context)
            expect(score).not.toBeNull()
            expect(score?.fu).toBe(20)
            expect(score?.han).toBe(2) // Menzen Tsumo (1) + Pinfu (1)
            expect(score?.ko[0]).toBe(700) // Oya payment
            expect(score?.ko[1]).toBe(400) // Ko payment
            expect(score?.ten).toBe(1500)
        })

        it('should calculate 25 Fu Chiitoitsu (2 Han: 1600 for Ko, 2400 for Oya)', () => {
            const koPlayer = new MockTestPlayer(
                'ko-chii',
                false,
                false,
                mockLogger,
            )
            koPlayer.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '9m',
                    '9m',
                    '2p',
                    '2p',
                    '8p',
                    '8p',
                    '3s',
                    '3s',
                    '7s',
                    '7s',
                    '1z',
                ]),
            )
            const koScore = ruleManager.calculateScore(koPlayer, {
                bakaze: '1z',
                seatWind: '2z',
                dora: ['9s'],
                isTsumo: false,
                winningTile: '1z',
            })
            expect(koScore?.fu).toBe(25)
            expect(koScore?.han).toBe(2)
            expect(koScore?.ten).toBe(1600)

            // Oya
            const oyaPlayer = new MockTestPlayer(
                'oya-chii',
                true,
                false,
                mockLogger,
            )
            oyaPlayer.setHand(koPlayer.hand)
            const oyaScore = ruleManager.calculateScore(oyaPlayer, {
                bakaze: '1z',
                seatWind: '1z',
                dora: ['9s'],
                isTsumo: false,
                winningTile: '1z',
            })
            expect(oyaScore?.fu).toBe(25)
            expect(oyaScore?.ten).toBe(2400)
        })

        it('should calculate 30 Fu standard hands (1-4 Han for Ko and Oya)', () => {
            const koPlayer = new MockTestPlayer(
                'ko-30',
                false,
                false,
                mockLogger,
            )
            // 123m 456p 789s 44z 23s + 1s (Pinfu Ron is 30 Fu, no Ittsu)
            koPlayer.setHand(
                createTiles([
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
                    '2s',
                    '3s',
                ]),
            )
            // 1 Han Pinfu Ron
            const score1Han = ruleManager.calculateScore(koPlayer, {
                bakaze: '1z',
                seatWind: '2z',
                dora: ['9p'],
                isTsumo: false,
                winningTile: '1s',
            })
            expect(score1Han?.fu).toBe(30)
            expect(score1Han?.han).toBe(1)
            expect(score1Han?.ten).toBe(1000)

            // 2 Han (Pinfu + Riichi)
            const score2Han = ruleManager.calculateScore(koPlayer, {
                bakaze: '1z',
                seatWind: '2z',
                dora: ['9p'],
                isTsumo: false,
                winningTile: '1s',
                isRiichi: true,
            })
            expect(score2Han?.fu).toBe(30)
            expect(score2Han?.han).toBe(2)
            expect(score2Han?.ten).toBe(2000)
        })

        it('should calculate Mangan, Haneman, Baiman, Sanbaiman, and Yakuman limit thresholds', () => {
            const koPlayer = new MockTestPlayer(
                'ko-limit',
                false,
                false,
                mockLogger,
            )
            const oyaPlayer = new MockTestPlayer(
                'oya-limit',
                true,
                false,
                mockLogger,
            )

            // Chinitsu (6 Han): 123m 345m 678m 22m 33m + 3m
            const chinitsuHand = createTiles([
                '1m',
                '2m',
                '3m',
                '3m',
                '4m',
                '5m',
                '6m',
                '7m',
                '8m',
                '2m',
                '2m',
                '3m',
                '3m',
            ])

            koPlayer.setHand(chinitsuHand)
            const koHaneman = ruleManager.calculateScore(koPlayer, {
                bakaze: '1z',
                seatWind: '2z',
                dora: ['9p'],
                isTsumo: false,
                winningTile: '3m',
            })
            expect(koHaneman?.han).toBe(6)
            expect(koHaneman?.ten).toBe(12000) // Haneman Ko Ron

            oyaPlayer.setHand(chinitsuHand)
            const oyaHaneman = ruleManager.calculateScore(oyaPlayer, {
                bakaze: '1z',
                seatWind: '1z',
                dora: ['9p'],
                isTsumo: false,
                winningTile: '3m',
            })
            expect(oyaHaneman?.han).toBe(6)
            expect(oyaHaneman?.ten).toBe(18000) // Haneman Oya Ron
        })
    })

    describe('4-Player Round Settlement (RoundManager4p.endRound)', () => {
        let p1: MockTestPlayer // Oya
        let p2: MockTestPlayer // Ko
        let p3: MockTestPlayer // Ko
        let p4: MockTestPlayer // Ko
        let players: MockTestPlayer[]

        // Standard 13-tile noten hand
        const createNotenHand = (): Tile[] =>
            createTiles([
                '1m',
                '2m',
                '4m',
                '5m',
                '7m',
                '8m',
                '3p',
                '4p',
                '6p',
                '7p',
                '1s',
                '2s',
                '4s',
            ])

        beforeEach(() => {
            p1 = createPlayer('p1', true)
            p2 = createPlayer('p2', false)
            p3 = createPlayer('p3', false)
            p4 = createPlayer('p4', false)
            players = [p1, p2, p3, p4]
            roundManager4p.oyaIndex = 0
            roundManager4p.honba = 0
            roundManager4p.kyotaku = 0
        })

        it('should correctly settle Ko Ron directly from Oya (Ron against Dealer)', () => {
            const score = createMockScore({
                han: 1,
                fu: 40,
                ten: 1300,
                oya: [2000],
                ko: [1300],
            })

            roundManager4p.endRound('room-4p', players, {
                reason: 'ron',
                winners: [{ winnerId: 'p2', score }],
                loserId: 'p1',
            })

            expect(p1.points).toBe(25000 - 2000)
            expect(p2.points).toBe(25000 + 2000)
            expect(p3.points).toBe(25000)
            expect(p4.points).toBe(25000)
            expect(roundManager4p.oyaIndex).toBe(1)
            expect(roundManager4p.honba).toBe(0)
        })

        it('should correctly settle Ko Ron directly from another Ko (Ron against Non-dealer)', () => {
            const score = createMockScore({
                han: 1,
                fu: 40,
                ten: 1300,
                oya: [2000],
                ko: [1300],
            })

            roundManager4p.endRound('room-4p', players, {
                reason: 'ron',
                winners: [{ winnerId: 'p2', score }],
                loserId: 'p3',
            })

            expect(p1.points).toBe(25000)
            expect(p2.points).toBe(25000 + 1300)
            expect(p3.points).toBe(25000 - 1300)
            expect(p4.points).toBe(25000)
            expect(roundManager4p.oyaIndex).toBe(1)
        })

        it('should correctly settle Oya Ron from Ko with Honba and Kyotaku', () => {
            roundManager4p.honba = 2
            roundManager4p.kyotaku = 1
            const score = createMockScore({
                han: 2,
                fu: 30,
                ten: 2900,
                oya: [1000, 1000, 1000],
                ko: [1000, 500, 500],
            })

            roundManager4p.endRound('room-4p', players, {
                reason: 'ron',
                winners: [{ winnerId: 'p1', score }],
                loserId: 'p2',
            })

            const totalPoints = 2900 + 600
            expect(p1.points).toBe(25000 + totalPoints + 1000)
            expect(p2.points).toBe(25000 - totalPoints)
            expect(p3.points).toBe(25000)
            expect(p4.points).toBe(25000)
            expect(roundManager4p.oyaIndex).toBe(0)
            expect(roundManager4p.honba).toBe(3)
            expect(roundManager4p.kyotaku).toBe(0)
        })

        it('should correctly settle Oya Tsumo (All Kos pay equal)', () => {
            const score = createMockScore({
                han: 5,
                fu: 30,
                ten: 12000,
                oya: [4000, 4000, 4000],
                ko: [4000, 2000, 2000],
            })

            roundManager4p.endRound('room-4p', players, {
                reason: 'tsumo',
                winnerId: 'p1',
                score,
            })

            expect(p1.points).toBe(25000 + 12000)
            expect(p2.points).toBe(25000 - 4000)
            expect(p3.points).toBe(25000 - 4000)
            expect(p4.points).toBe(25000 - 4000)
            expect(roundManager4p.oyaIndex).toBe(0)
            expect(roundManager4p.honba).toBe(1)
        })

        it('should correctly settle Ko Tsumo (Oya pays double of Ko)', () => {
            const score = createMockScore({
                han: 5,
                fu: 30,
                ten: 8000,
                oya: [4000, 4000, 4000],
                ko: [4000, 2000, 2000],
            })

            roundManager4p.endRound('room-4p', players, {
                reason: 'tsumo',
                winnerId: 'p2',
                score,
            })

            expect(p2.points).toBe(25000 + 8000)
            expect(p1.points).toBe(25000 - 4000)
            expect(p3.points).toBe(25000 - 2000)
            expect(p4.points).toBe(25000 - 2000)
            expect(roundManager4p.oyaIndex).toBe(1)
            expect(roundManager4p.honba).toBe(0)
        })

        it('should settle Ryuukyoku Noten payments (1 Tenpai receives 3000 from 3 Noten)', () => {
            /* GEMINI THINKING */
            // p1 is Tenpai (123m 456p 789s 11z 23s -> waiting on 1s, 4s)
            p1.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4p',
                    '5p',
                    '6p',
                    '7s',
                    '8s',
                    '9s',
                    '1z',
                    '1z',
                    '2s',
                    '3s',
                ]),
            )
            p2.setHand(createNotenHand())
            p3.setHand(createNotenHand())
            p4.setHand(createNotenHand())

            roundManager4p.endRound('room-4p', players, {
                reason: 'ryuukyoku',
            })

            expect(p1.points).toBe(25000 + 3000)
            expect(p2.points).toBe(25000 - 1000)
            expect(p3.points).toBe(25000 - 1000)
            expect(p4.points).toBe(25000 - 1000)
            expect(roundManager4p.oyaIndex).toBe(0)
            expect(roundManager4p.honba).toBe(1)
        })

        it('should settle Ryuukyoku Noten payments (2 Tenpai split 3000 -> 1500 each)', () => {
            /* GEMINI THINKING */
            const tenpaiHand = createTiles([
                '1m',
                '2m',
                '3m',
                '4p',
                '5p',
                '6p',
                '7s',
                '8s',
                '9s',
                '1z',
                '1z',
                '2s',
                '3s',
            ])
            p2.setHand(tenpaiHand)
            p3.setHand(tenpaiHand)
            p1.setHand(createNotenHand())
            p4.setHand(createNotenHand())

            roundManager4p.endRound('room-4p', players, {
                reason: 'ryuukyoku',
            })

            expect(p2.points).toBe(25000 + 1500)
            expect(p3.points).toBe(25000 + 1500)
            expect(p1.points).toBe(25000 - 1500)
            expect(p4.points).toBe(25000 - 1500)
            expect(roundManager4p.oyaIndex).toBe(1)
            expect(roundManager4p.honba).toBe(1)
        })

        it('should settle Nagashi Mangan for Oya (4000 all) and Ko (4000/2000)', () => {
            p1.setDiscards(
                createTiles([
                    '1m',
                    '9m',
                    '1p',
                    '9p',
                    '1s',
                    '9s',
                    '1z',
                    '2z',
                    '3z',
                ]),
            )
            p1.isNagashiEligible = true

            roundManager4p.endRound('room-4p', players, {
                reason: 'ryuukyoku',
            })

            expect(p1.points).toBe(25000 + 12000)
            expect(p2.points).toBe(25000 - 4000)
            expect(p3.points).toBe(25000 - 4000)
            expect(p4.points).toBe(25000 - 4000)
            expect(roundManager4p.oyaIndex).toBe(0)
            expect(roundManager4p.honba).toBe(1)
        })
    })

    describe('3-Player (Sanma) Round Settlement (RoundManagerSanma.endRound)', () => {
        let p1: MockTestPlayer // Oya
        let p2: MockTestPlayer // Ko
        let p3: MockTestPlayer // Ko
        let players: MockTestPlayer[]

        // 13-tile noten hand for Sanma (no 2-8m)
        const createSanmaNotenHand = (): Tile[] =>
            createTiles([
                '1m',
                '9m',
                '1p',
                '2p',
                '4p',
                '5p',
                '7p',
                '8p',
                '1s',
                '2s',
                '4s',
                '5s',
                '7s',
            ])

        beforeEach(() => {
            p1 = createPlayer('p1', true)
            p2 = createPlayer('p2', false)
            p3 = createPlayer('p3', false)
            players = [p1, p2, p3]
            roundManagerSanma.oyaIndex = 0
            roundManagerSanma.honba = 0
            roundManagerSanma.kyotaku = 0
        })

        it('should correctly settle Oya Tsumo in Sanma (both Kos pay equal share)', () => {
            const score = createMockScore({
                han: 2,
                fu: 40,
                ten: 3900,
                oya: [1300, 1300],
                ko: [1300],
            })

            roundManagerSanma.endRound('room-sanma', players, {
                reason: 'tsumo',
                winnerId: 'p1',
                score,
            })

            expect(p1.points).toBe(25000 + 3900)
            expect(p2.points).toBe(25000 - 1300)
            expect(p3.points).toBe(25000 - 1300)
            expect(roundManagerSanma.oyaIndex).toBe(0)
            expect(roundManagerSanma.honba).toBe(1)
        })

        it('should correctly settle Ko Tsumo in Sanma (Oya pays oya share, other Ko pays ko share)', () => {
            const score = createMockScore({
                han: 2,
                fu: 40,
                ten: 2700,
                oya: [1300],
                ko: [1300, 700],
            })

            roundManagerSanma.endRound('room-sanma', players, {
                reason: 'tsumo',
                winnerId: 'p2',
                score,
            })

            expect(p2.points).toBe(25000 + 2700)
            expect(p1.points).toBe(25000 - 1300)
            expect(p3.points).toBe(25000 - 700)
            expect(roundManagerSanma.oyaIndex).toBe(1)
            expect(roundManagerSanma.honba).toBe(0)
        })

        it('should settle Sanma Ryuukyoku Noten payments (1 Tenpai receives 3000, 2 Noten pay 1500 each)', () => {
            /* GEMINI THINKING */
            // Sanma valid Tenpai hand: 111m 999m 11z 23p 789s -> waiting on 1p, 4p
            p1.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '1m',
                    '9m',
                    '9m',
                    '9m',
                    '1z',
                    '1z',
                    '2p',
                    '3p',
                    '7s',
                    '8s',
                    '9s',
                ]),
            )
            p2.setHand(createSanmaNotenHand())
            p3.setHand(createSanmaNotenHand())

            roundManagerSanma.endRound('room-sanma', players, {
                reason: 'ryuukyoku',
            })

            expect(p1.points).toBe(25000 + 3000)
            expect(p2.points).toBe(25000 - 1500)
            expect(p3.points).toBe(25000 - 1500)
            expect(roundManagerSanma.oyaIndex).toBe(0)
            expect(roundManagerSanma.honba).toBe(1)
        })

        it('should settle Sanma Ryuukyoku Noten payments (2 Tenpai get 1500 each, 1 Noten pays 3000)', () => {
            /* GEMINI THINKING */
            const sanmaTenpaiHand = createTiles([
                '1m',
                '1m',
                '1m',
                '9m',
                '9m',
                '9m',
                '1z',
                '1z',
                '2p',
                '3p',
                '7s',
                '8s',
                '9s',
            ])
            p2.setHand(sanmaTenpaiHand)
            p3.setHand(sanmaTenpaiHand)
            p1.setHand(createSanmaNotenHand())

            roundManagerSanma.endRound('room-sanma', players, {
                reason: 'ryuukyoku',
            })

            expect(p2.points).toBe(25000 + 1500)
            expect(p3.points).toBe(25000 + 1500)
            expect(p1.points).toBe(25000 - 3000)
            expect(roundManagerSanma.oyaIndex).toBe(1)
            expect(roundManagerSanma.honba).toBe(1)
        })
    })
})
