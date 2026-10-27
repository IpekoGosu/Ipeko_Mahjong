import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { WinContext } from '@src/modules/mahjong/interfaces/mahjong.types'
import { mockLogger } from './test_utils'

class MockTestPlayer extends Player {
    public setHand(tiles: Tile[]): void {
        this._hand = tiles
    }

    public addMeld(meld: {
        type: 'chi' | 'pon' | 'kan' | 'chakan' | 'ankan' | 'kakan'
        tiles: Tile[]
        opened: boolean
        stolenFrom?: string
    }): void {
        this._melds.push(meld)
    }
}

describe('All Riichi Mahjong Yaku Verification (3p & 4p)', () => {
    let ruleManager: RuleManager
    let player: MockTestPlayer

    const createTiles = (strList: string[]): Tile[] => {
        return strList.map((s, idx) => Tile.fromString(s, idx))
    }

    const defaultContext: WinContext = {
        bakaze: '1z', // East round
        seatWind: '1z', // East seat (Oya)
        dora: ['1s'], // Dora indicator
        isTsumo: false,
        winningTile: '1m',
    }

    beforeEach(() => {
        ruleManager = new RuleManager(mockLogger)
        player = new MockTestPlayer('player-yaku', true, false, mockLogger)
    })

    describe('1 Han Yaku (1飜)', () => {
        it('should detect Menzenchin Tsumohou (Fully Concealed Hand)', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 11z 222z (14 tiles tsumo, closed)
            player.setHand(
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
                    '2z',
                    '2z',
                    '2z',
                ]),
            )
            const context: WinContext = {
                ...defaultContext,
                isTsumo: true,
                winningTile: undefined,
            }

            const score = ruleManager.calculateScore(player, context)
            expect(score).not.toBeNull()
            expect(score?.yaku).toHaveProperty('門前清自摸和')
        })

        it('should detect Riichi and Ippatsu', () => {
            /* GEMINI THINKING */
            // Closed hand winning with Riichi & Ippatsu declared
            player.setHand(
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
                    '2z',
                    '2z',
                ]),
            )
            const context: WinContext = {
                ...defaultContext,
                isTsumo: false,
                winningTile: '2z',
                isRiichi: true,
                isIppatsu: true,
            }

            const score = ruleManager.calculateScore(player, context)
            expect(score).not.toBeNull()
            expect(score?.yaku).toHaveProperty('立直')
            expect(score?.yaku).toHaveProperty('一発')
        })

        it('should detect Pinfu (All Sequences, Valueless Pair, Two-sided Wait)', () => {
            /* GEMINI THINKING */
            // 123m 456m 123p 78s 22z(valueless pair for East round/South seat) + 9s (two-sided wait on 6s, 9s)
            player.isOya = false
            player.setHand(
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
                    '2z',
                    '2z',
                ]),
            )
            const context: WinContext = {
                ...defaultContext,
                seatWind: '3z', // West seat (2z is South wind - valueless pair)
                bakaze: '1z', // East round
                winningTile: '9s',
                isTsumo: false,
            }

            const score = ruleManager.calculateScore(player, context)
            expect(score).not.toBeNull()
            expect(score?.yaku).toHaveProperty('平和')
            expect(score?.fu).toBe(30) // Pinfu Ron is 30 fu
        })

        it('should detect Tanyao (All Simples - Concealed & Open Kuitan)', () => {
            /* GEMINI THINKING */
            // 234m 345p 678s 22p 333p (Only tiles 2-8)
            player.setHand(
                createTiles([
                    '2m',
                    '3m',
                    '4m',
                    '3p',
                    '4p',
                    '5p',
                    '6s',
                    '7s',
                    '8s',
                    '2p',
                    '2p',
                    '3p',
                    '3p',
                ]),
            )
            const closedScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '3p',
            })
            const hasTanyaoClosed = Object.keys(closedScore?.yaku ?? {}).some(
                (k) => k.includes('断'),
            )
            expect(hasTanyaoClosed).toBe(true)

            // Open Kuitan
            const openPlayer = new MockTestPlayer(
                'open-p',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
                createTiles([
                    '2m',
                    '3m',
                    '4m',
                    '3p',
                    '4p',
                    '5p',
                    '2p',
                    '2p',
                    '6s',
                    '7s',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['6s', '7s', '8s']),
                opened: true,
            })
            const openScore = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '8s',
            })
            const hasTanyaoOpen = Object.keys(openScore?.yaku ?? {}).some((k) =>
                k.includes('断'),
            )
            expect(hasTanyaoOpen).toBe(true)
        })

        it('should detect Iipeikou (Pure Double Chow)', () => {
            /* GEMINI THINKING */
            // Two identical sequences in closed hand: 234m 234m 456p 77s + 7s
            player.setHand(
                createTiles([
                    '2m',
                    '3m',
                    '4m',
                    '2m',
                    '3m',
                    '4m',
                    '4p',
                    '5p',
                    '6p',
                    '7s',
                    '7s',
                    '8s',
                    '8s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '8s',
            })
            expect(score?.yaku).toHaveProperty('一盃口')
        })

        it('should detect Yakuhai (Seat Wind, Round Wind, Dragons)', () => {
            /* GEMINI THINKING */
            // Round Wind: 1z(East), Seat Wind: 1z(East), Dragon: 5z(Haku), 6z(Hatsu), 7z(Chun)
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4p',
                    '5p',
                    '6p',
                    '2s',
                    '3s',
                    '4s',
                    '9s',
                    '9s',
                    '5z',
                    '5z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '5z',
            })
            const hasHaku = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('白'),
            )
            expect(hasHaku).toBe(true)
        })

        it('should detect Rinshan Kaihou, Chankan, Haitei, and Houtei', () => {
            /* GEMINI THINKING */
            // Rinshan Kaihou requires a Kan meld + isTsumo + isRinshan
            const rinshanPlayer = new MockTestPlayer(
                'rinshan-p',
                false,
                false,
                mockLogger,
            )
            rinshanPlayer.setHand(
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
                ]),
            )
            rinshanPlayer.addMeld({
                type: 'ankan',
                tiles: createTiles(['5z', '5z', '5z', '5z']),
                opened: false,
            })
            const rinshanScore = ruleManager.calculateScore(rinshanPlayer, {
                ...defaultContext,
                isTsumo: true,
                winningTile: undefined,
                isRinshan: true,
            })
            expect(rinshanScore?.yaku).toHaveProperty('嶺上開花')

            // Haitei Raoyue (Win on last drawn tile)
            player.setHand(
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
                    '5z',
                    '5z',
                    '5z',
                ]),
            )
            const haiteiScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                isTsumo: true,
                winningTile: undefined,
                isHaitei: true,
            })
            expect(haiteiScore?.yaku).toHaveProperty('海底摸月')

            // Houtei Raoyui (Win on last discard)
            const houteiPlayer = new MockTestPlayer(
                'houtei-p',
                false,
                false,
                mockLogger,
            )
            houteiPlayer.setHand(
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
                    '5z',
                    '5z',
                ]),
            )
            const houteiScore = ruleManager.calculateScore(houteiPlayer, {
                ...defaultContext,
                winningTile: '5z',
                isHoutei: true,
            })
            expect(houteiScore?.yaku).toHaveProperty('河底撈魚')

            // Chankan (Robbing a Kan)
            const chankanScore = ruleManager.calculateScore(houteiPlayer, {
                ...defaultContext,
                winningTile: '5z',
                isChankan: true,
            })
            const hasChankan = Object.keys(chankanScore?.yaku ?? {}).some((k) =>
                k.includes('槓'),
            )
            expect(hasChankan).toBe(true)
        })
    })

    describe('2 Han Yaku (2飜)', () => {
        it('should detect Double Riichi (Early Riichi)', () => {
            player.setHand(
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
                    '2z',
                    '2z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '2z',
                isDoubleRiichi: true,
                isRiichi: true,
            })
            expect(score?.yaku).toHaveProperty('ダブル立直')
        })

        it('should detect Sanshoku Doujun (Three Coloured Runs - 2 Han closed, 1 Han open)', () => {
            player.setHand(
                createTiles([
                    '2m',
                    '3m',
                    '4m',
                    '2p',
                    '3p',
                    '4p',
                    '2s',
                    '3s',
                    '4s',
                    '7s',
                    '8s',
                    '9s',
                    '1z',
                ]),
            )
            const closedScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(closedScore?.yaku).toHaveProperty('三色同順')
            expect(closedScore?.yaku['三色同順']).toBe('2飜')

            // Open Sanshoku (Kuisaage: 1 Han)
            const openPlayer = new MockTestPlayer(
                'open-sanshoku',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
                createTiles([
                    '2m',
                    '3m',
                    '4m',
                    '2p',
                    '3p',
                    '4p',
                    '7s',
                    '8s',
                    '9s',
                    '1z',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['2s', '3s', '4s']),
                opened: true,
            })
            const openScore = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(openScore?.yaku).toHaveProperty('三色同順')
            expect(openScore?.yaku['三色同順']).toBe('1飜')
        })

        it('should detect Ittsu (Pure Straight - 2 Han closed, 1 Han open)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '7m',
                    '8m',
                    '9m',
                    '1p',
                    '2p',
                    '3p',
                    '1z',
                ]),
            )
            const closedScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(closedScore?.yaku).toHaveProperty('一気通貫')
            expect(closedScore?.yaku['一気通貫']).toBe('2飜')

            // Open Ittsu
            const openPlayer = new MockTestPlayer(
                'open-ittsu',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
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
                    '1z',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['7m', '8m', '9m']),
                opened: true,
            })
            const openScore = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(openScore?.yaku).toHaveProperty('一気通貫')
            expect(openScore?.yaku['一気通貫']).toBe('1飜')
        })

        it('should detect Chanta (Mixed Outside Hand - 2 Han closed, 1 Han open)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '7p',
                    '8p',
                    '9p',
                    '1s',
                    '2s',
                    '3s',
                    '1z',
                    '1z',
                    '1z',
                    '9s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '9s',
            })
            const hasChanta = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('混全帯'),
            )
            expect(hasChanta).toBe(true)
        })

        it('should detect Chiitoitsu (Seven Pairs - 25 Fu 2 Han)', () => {
            player.setHand(
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
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(score?.yaku).toHaveProperty('七対子')
            expect(score?.fu).toBe(25)
        })

        it('should detect Toitoi (All Triplets) and Sanankou (Three Concealed Triplets)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '1m',
                    '3p',
                    '3p',
                    '3p',
                    '5s',
                    '5s',
                    '5s',
                    '7s',
                    '7s',
                    '1z',
                    '1z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '7s', // Won on Ron -> 3 concealed + 1 open triplet
            })
            expect(score?.yaku).toHaveProperty('対々和')
            expect(score?.yaku).toHaveProperty('三暗刻')
        })

        it('should detect Shousangen (Small Three Dragons) and Honroutou (All Terminals and Honors)', () => {
            player.setHand(
                createTiles([
                    '5z',
                    '5z',
                    '5z',
                    '6z',
                    '6z',
                    '6z',
                    '7z',
                    '7z',
                    '1m',
                    '1m',
                    '1m',
                    '9p',
                    '9p',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '9p',
            })
            expect(score?.yaku).toHaveProperty('小三元')
            expect(score?.yaku).toHaveProperty('混老頭')
            expect(score?.yaku).toHaveProperty('対々和')
        })

        it('should detect Sanshoku Doukou (Three Coloured Triplets)', () => {
            player.setHand(
                createTiles([
                    '2m',
                    '2m',
                    '2m',
                    '2p',
                    '2p',
                    '2p',
                    '2s',
                    '2s',
                    '2s',
                    '4s',
                    '5s',
                    '6s',
                    '1z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(score?.yaku).toHaveProperty('三色同刻')
        })

        it('should detect Sankantsu (Three Quads)', () => {
            player.setHand(createTiles(['1z', '1z', '1m', '2m']))
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['2p', '2p', '2p', '2p']),
                opened: true,
            })
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['3s', '3s', '3s', '3s']),
                opened: true,
            })
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['4m', '4m', '4m', '4m']),
                opened: true,
            })
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '3m',
            })
            expect(score?.yaku).toHaveProperty('三槓子')
        })
    })

    describe('3 Han & 6 Han Yaku (3飜 & 6飜)', () => {
        it('should detect Honitsu (Half Flush - 3 Han closed, 2 Han open)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '7m',
                    '8m',
                    '9m',
                    '1z',
                    '1z',
                    '1z',
                    '2z',
                ]),
            )
            const closedScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '2z',
            })
            expect(closedScore?.yaku).toHaveProperty('混一色')
            expect(closedScore?.yaku['混一色']).toBe('3飜')

            // Open Honitsu
            const openPlayer = new MockTestPlayer(
                'open-honitsu',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '1z',
                    '1z',
                    '1z',
                    '2z',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['7m', '8m', '9m']),
                opened: true,
            })
            const openScore = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '2z',
            })
            expect(openScore?.yaku).toHaveProperty('混一色')
            expect(openScore?.yaku['混一色']).toBe('2飜')
        })

        it('should detect Junchan (Pure Outside Hand - 3 Han closed, 2 Han open)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '7m',
                    '8m',
                    '9m',
                    '1p',
                    '2p',
                    '3p',
                    '7s',
                    '8s',
                    '9s',
                    '9s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '9s',
            })
            const hasJunchan = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('純全帯'),
            )
            expect(hasJunchan).toBe(true)
        })

        it('should detect Ryanpeikou (Twice Pure Double Chow - 3 Han closed only)', () => {
            player.setHand(
                createTiles([
                    '2m',
                    '2m',
                    '3m',
                    '3m',
                    '4m',
                    '4m',
                    '5p',
                    '5p',
                    '6p',
                    '6p',
                    '7p',
                    '7p',
                    '1z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(score?.yaku).toHaveProperty('二盃口')
            expect(score?.yaku['二盃口']).toBe('3飜')
        })

        it('should detect Chinitsu (Full Flush - 6 Han closed, 5 Han open)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '7m',
                    '8m',
                    '9m',
                    '9m',
                    '9m',
                    '2m',
                ]),
            )
            const closedScore = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '2m',
            })
            expect(closedScore?.yaku).toHaveProperty('清一色')
            expect(closedScore?.yaku['清一色']).toBe('6飜')

            // Open Chinitsu
            const openPlayer = new MockTestPlayer(
                'open-chinitsu',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '3m',
                    '4m',
                    '5m',
                    '9m',
                    '9m',
                    '9m',
                    '2m',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['6m', '7m', '8m']),
                opened: true,
            })
            const openScore = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '2m',
            })
            expect(openScore?.yaku).toHaveProperty('清一色')
            expect(openScore?.yaku['清一色']).toBe('5飜')
        })
    })

    describe('Yakuman (役満)', () => {
        it('should detect Kokushi Musou (Thirteen Orphans)', () => {
            player.setHand(
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
                    '4z',
                    '5z',
                    '6z',
                    '7z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1m',
            })
            expect(score).not.toBeNull()
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            const isKokushi = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('国士無双'),
            )
            expect(isKokushi).toBe(true)
        })

        it('should detect Suuankou (Four Concealed Triplets)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '1m',
                    '3p',
                    '3p',
                    '3p',
                    '5s',
                    '5s',
                    '5s',
                    '7s',
                    '7s',
                    '7s',
                    '1z',
                    '1z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                isTsumo: true,
                winningTile: undefined,
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            const isSuuankou = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('四暗刻'),
            )
            expect(isSuuankou).toBe(true)
        })

        it('should detect Daisangen (Big Three Dragons)', () => {
            player.setHand(
                createTiles([
                    '5z',
                    '5z',
                    '5z',
                    '6z',
                    '6z',
                    '6z',
                    '7z',
                    '7z',
                    '7z',
                    '1m',
                    '2m',
                    '3m',
                    '9s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '9s',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('大三元')
        })

        it('should detect Tsuuiisou (All Honors)', () => {
            player.setHand(
                createTiles([
                    '1z',
                    '1z',
                    '1z',
                    '2z',
                    '2z',
                    '2z',
                    '5z',
                    '5z',
                    '5z',
                    '6z',
                    '6z',
                    '6z',
                    '7z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '7z',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('字一色')
        })

        it('should detect Ryuuiisou (All Green)', () => {
            player.setHand(
                createTiles([
                    '2s',
                    '3s',
                    '4s',
                    '6s',
                    '6s',
                    '6s',
                    '8s',
                    '8s',
                    '8s',
                    '6z',
                    '6z',
                    '6z',
                    '2s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '2s',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('緑一色')
        })

        it('should detect Chinroutou (All Terminals)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '1m',
                    '9m',
                    '9m',
                    '9m',
                    '1p',
                    '1p',
                    '1p',
                    '9p',
                    '9p',
                    '9p',
                    '1s',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1s',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('清老頭')
        })

        it('should detect Suukantsu (Four Quads)', () => {
            /* GEMINI THINKING */
            // 4 Kans + 1 tile hand (pair formed with winningTile)
            player.setHand(createTiles(['1z']))
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['1m', '1m', '1m', '1m']),
                opened: true,
            })
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['2p', '2p', '2p', '2p']),
                opened: true,
            })
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['3s', '3s', '3s', '3s']),
                opened: true,
            })
            player.addMeld({
                type: 'kan',
                tiles: createTiles(['4m', '4m', '4m', '4m']),
                opened: true,
            })
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '1z',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('四槓子')
        })

        it('should detect Shousuushii (Small Four Winds)', () => {
            player.setHand(
                createTiles([
                    '1z',
                    '1z',
                    '1z',
                    '2z',
                    '2z',
                    '2z',
                    '3z',
                    '3z',
                    '3z',
                    '4z',
                    '4z',
                    '1m',
                    '2m',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '3m',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('小四喜')
        })

        it('should detect Daisuushii (Big Four Winds)', () => {
            player.setHand(
                createTiles([
                    '1z',
                    '1z',
                    '1z',
                    '2z',
                    '2z',
                    '2z',
                    '3z',
                    '3z',
                    '3z',
                    '4z',
                    '4z',
                    '4z',
                    '5z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '5z',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('大四喜')
        })

        it('should detect Chuuren Poutou (Nine Gates)', () => {
            player.setHand(
                createTiles([
                    '1m',
                    '1m',
                    '1m',
                    '2m',
                    '3m',
                    '4m',
                    '5m',
                    '6m',
                    '7m',
                    '8m',
                    '9m',
                    '9m',
                    '9m',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                winningTile: '5m',
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            const isChuuren = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('九蓮宝燈'),
            )
            expect(isChuuren).toBe(true)
        })

        it('should detect Tenhou (Heavenly Hand - Oya First Tsumo)', () => {
            player.isOya = true
            player.setHand(
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
                    '2z',
                    '2z',
                    '2z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                isTsumo: true,
                winningTile: undefined,
                isTenhou: true,
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('天和')
        })

        it('should detect Chiihou (Earthly Hand - Ko First Tsumo)', () => {
            player.isOya = false
            player.setHand(
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
                    '2z',
                    '2z',
                    '2z',
                ]),
            )
            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                seatWind: '2z',
                isTsumo: true,
                winningTile: undefined,
                isChiihou: true,
            })
            expect(score?.yakuman).toBeGreaterThanOrEqual(1)
            expect(score?.yaku).toHaveProperty('地和')
        })
    })

    describe('Yaku Nashi (No Yaku) & Dora Additions', () => {
        it('should return null when hand has complete shape but 0 Yaku (Yaku Nashi)', () => {
            const openPlayer = new MockTestPlayer(
                'no-yaku',
                false,
                false,
                mockLogger,
            )
            openPlayer.setHand(
                createTiles([
                    '1m',
                    '2m',
                    '3m',
                    '4p',
                    '5p',
                    '6p',
                    '2s',
                    '2s',
                    '8s',
                    '9s',
                ]),
            )
            openPlayer.addMeld({
                type: 'chi',
                tiles: createTiles(['7s', '8s', '9s']),
                opened: true,
            })

            const score = ruleManager.calculateScore(openPlayer, {
                ...defaultContext,
                winningTile: '7s',
                seatWind: '3z',
                bakaze: '1z',
            })
            expect(score).toBeNull()
        })

        it('should add normal Dora and Aka Dora correctly', () => {
            player.setHand([
                Tile.fromString('2m', 0), // Dora (since indicator is 1m)
                Tile.fromString('3m', 1),
                Tile.fromString('4m', 2),
                Tile.fromString('0p', 3), // Red 5p (Aka dora)
                Tile.fromString('6p', 4),
                Tile.fromString('7p', 5),
                Tile.fromString('3s', 6),
                Tile.fromString('4s', 7),
                Tile.fromString('5s', 8),
                Tile.fromString('2s', 9),
                Tile.fromString('2s', 10),
                Tile.fromString('6s', 11),
                Tile.fromString('7s', 12),
            ])

            const score = ruleManager.calculateScore(player, {
                ...defaultContext,
                dora: ['1m'], // indicator 1m -> dora 2m
                winningTile: '8s',
            })
            expect(score).not.toBeNull()
            const hasTanyao = Object.keys(score?.yaku ?? {}).some((k) =>
                k.includes('断'),
            )
            expect(hasTanyao).toBe(true)
            expect(score?.yaku).toHaveProperty('ドラ')
            expect(score?.yaku).toHaveProperty('赤ドラ')
        })
    })
})
