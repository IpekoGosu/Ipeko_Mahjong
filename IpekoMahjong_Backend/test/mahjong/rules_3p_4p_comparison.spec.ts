import { Wall4p } from '@src/modules/mahjong/classes/wall/Wall.4p'
import { WallSanma } from '@src/modules/mahjong/classes/wall/Wall.Sanma'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { ActionManagerSanma } from '@src/modules/mahjong/classes/managers/ActionManager.Sanma'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { RoundManagerSanma } from '@src/modules/mahjong/classes/managers/RoundManager.Sanma'
import { RuleEffectManager } from '@src/modules/mahjong/classes/managers/RuleEffectManager'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
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

describe('3-Player (Sanma) vs 4-Player Rules Comparison', () => {
    let ruleManager: RuleManager
    let actionManager4p: ActionManager4p
    let actionManagerSanma: ActionManagerSanma
    let roundManager4p: RoundManager4p
    let roundManagerSanma: RoundManagerSanma
    let ruleEffectManager: RuleEffectManager

    const createTiles = (strList: string[]): Tile[] => {
        return strList.map((s, idx) => Tile.fromString(s, idx))
    }

    beforeEach(() => {
        ruleManager = new RuleManager(mockLogger)
        actionManager4p = new ActionManager4p(ruleManager, mockLogger)
        actionManagerSanma = new ActionManagerSanma(ruleManager, mockLogger)
        roundManager4p = new RoundManager4p(ruleManager, mockLogger)
        roundManagerSanma = new RoundManagerSanma(ruleManager, mockLogger)
        ruleEffectManager = new RuleEffectManager(ruleManager)
    })

    describe('Wall (Deck) Composition & Dora Indicators', () => {
        it('should have 136 tiles in 4p wall including full Manzu (1m-9m) and 3 Red Fives', () => {
            /* GEMINI THINKING */
            const wall = new Wall4p()
            expect(wall.getRemainingTiles()).toBe(136)

            const allTiles: Tile[] = []
            while (wall.getRemainingTiles() > 0) {
                const drawn = wall.draw()
                if (drawn) allTiles.push(drawn)
            }

            expect(allTiles.length).toBe(136)

            // Contains 2-8 of Manzu (7 ranks * 4 = 28 tiles)
            const manzu2to8 = allTiles.filter(
                (t) => t.suit === 'm' && t.rank >= 2 && t.rank <= 8,
            )
            expect(manzu2to8.length).toBe(28)

            // Red fives (5m, 5p, 5s)
            const redTiles = allTiles.filter((t) => t.isRed)
            expect(redTiles.length).toBe(3)
            expect(redTiles.some((t) => t.suit === 'm')).toBe(true)

            // Test dead wall separation
            const freshWall = new Wall4p()
            freshWall.separateDeadWall()
            expect(freshWall.getRemainingTiles()).toBe(122) // 136 - 14
        })

        it('should have 108 tiles in Sanma wall (2-8 Manzu removed, no Red 5m)', () => {
            /* GEMINI THINKING */
            const wall = new WallSanma()
            expect(wall.getRemainingTiles()).toBe(108)

            const allTiles: Tile[] = []
            while (wall.getRemainingTiles() > 0) {
                const drawn = wall.draw()
                if (drawn) allTiles.push(drawn)
            }

            expect(allTiles.length).toBe(108) // 136 - 28 = 108

            // Strictly 0 of 2-8 Manzu
            const manzu2to8 = allTiles.filter(
                (t) => t.suit === 'm' && t.rank >= 2 && t.rank <= 8,
            )
            expect(manzu2to8.length).toBe(0)

            // Only 1m and 9m in Manzu
            const manzuTiles = allTiles.filter((t) => t.suit === 'm')
            expect(manzuTiles.length).toBe(8) // 4 of 1m, 4 of 9m

            // Only 2 red tiles (5p, 5s - no 5m)
            const redTiles = allTiles.filter((t) => t.isRed)
            expect(redTiles.length).toBe(2)
            expect(redTiles.every((t) => t.suit !== 'm')).toBe(true)

            // Test dead wall separation in Sanma
            const freshWall = new WallSanma()
            freshWall.separateDeadWall()
            expect(freshWall.getRemainingTiles()).toBe(94) // 108 - 14
        })

        it('should handle Dora indicator sequence correctly: 4p vs Sanma Manzu rule', () => {
            /* GEMINI THINKING */
            // 4p: 1m -> 2m, 8m -> 9m, 9m -> 1m
            expect(ruleManager.getActualDora('1m', false)).toBe('2m')
            expect(ruleManager.getActualDora('8m', false)).toBe('9m')
            expect(ruleManager.getActualDora('9m', false)).toBe('1m')

            // Sanma: 1m -> 9m, 9m -> 1m (since 2-8m do not exist)
            expect(ruleManager.getActualDora('1m', true)).toBe('9m')
            expect(ruleManager.getActualDora('9m', true)).toBe('1m')

            // Pinzu / Souzu sequences remain standard in both modes
            expect(ruleManager.getActualDora('9p', false)).toBe('1p')
            expect(ruleManager.getActualDora('9p', true)).toBe('1p')
            expect(ruleManager.getActualDora('9s', false)).toBe('1s')
            expect(ruleManager.getActualDora('9s', true)).toBe('1s')

            // Honors cycle: East -> South -> West -> North -> East
            expect(ruleManager.getActualDora('1z', false)).toBe('2z')
            expect(ruleManager.getActualDora('4z', false)).toBe('1z')
            // Dragons cycle: White -> Green -> Red -> White
            expect(ruleManager.getActualDora('5z', false)).toBe('6z')
            expect(ruleManager.getActualDora('7z', false)).toBe('5z')
        })
    })

    describe('Call (Naki) Actions: Chi, Pon, Kan (4p vs Sanma)', () => {
        let p1: MockTestPlayer
        let p2: MockTestPlayer
        let p3: MockTestPlayer
        let p4: MockTestPlayer

        beforeEach(() => {
            p1 = new MockTestPlayer('p1', true, false, mockLogger)
            p2 = new MockTestPlayer('p2', false, false, mockLogger)
            p3 = new MockTestPlayer('p3', false, false, mockLogger)
            p4 = new MockTestPlayer('p4', false, false, mockLogger)
        })

        it('should allow Chi for kamicha (left player) in 4-Player mahjong', () => {
            /* GEMINI THINKING */
            // p1 discards '3s'. p2 (next turn player) has '2s', '4s' in hand -> can Chi
            p2.setHand(createTiles(['2s', '4s', '1m', '2m', '3m']))
            const players = [p1, p2, p3, p4]

            const actions = actionManager4p.getPossibleActions(
                'p1',
                '3s',
                players,
                {
                    bakaze: '1z',
                    dora: ['9p'],
                    playerContexts: players.map((p) => ({
                        playerId: p.id,
                        seatWind: '1z',
                        uradora: [],
                    })),
                    isHoutei: false,
                },
            )

            expect(actions['p2']).toBeDefined()
            expect(actions['p2'].chi).toBe(true)
            expect(actions['p2'].chiOptions).toBeDefined()
        })

        it('should NOT allow Chi under ANY circumstances in Sanma (3-Player)', () => {
            /* GEMINI THINKING */
            // In Sanma, Chi is strictly forbidden.
            p2.setHand(createTiles(['2s', '4s', '1m', '9m']))
            const players = [p1, p2, p3]

            const actions = actionManagerSanma.getPossibleActions(
                'p1',
                '3s',
                players,
                {
                    bakaze: '1z',
                    dora: ['9p'],
                    playerContexts: players.map((p) => ({
                        playerId: p.id,
                        seatWind: '1z',
                        uradora: [],
                    })),
                    isHoutei: false,
                },
            )

            // p2 cannot Chi even though holding '2s' and '4s'
            expect(actions['p2']?.chi).toBeUndefined()
        })

        it('should allow Pon and Kan in BOTH 4-Player and Sanma', () => {
            /* GEMINI THINKING */
            p2.setHand(createTiles(['9s', '9s', '1m', '2m']))
            p3.setHand(createTiles(['9s', '9s', '9s', '1m']))

            // 4p check
            const actions4p = actionManager4p.getPossibleActions(
                'p1',
                '9s',
                [p1, p2, p3, p4],
                {
                    bakaze: '1z',
                    dora: ['9p'],
                    playerContexts: [p1, p2, p3, p4].map((p) => ({
                        playerId: p.id,
                        seatWind: '1z',
                        uradora: [],
                    })),
                    isHoutei: false,
                },
            )
            expect(actions4p['p2'].pon).toBe(true)
            expect(actions4p['p3'].pon).toBe(true)
            expect(actions4p['p3'].kan).toBe(true)

            // Sanma check
            const actionsSanma = actionManagerSanma.getPossibleActions(
                'p1',
                '9s',
                [p1, p2, p3],
                {
                    bakaze: '1z',
                    dora: ['9p'],
                    playerContexts: [p1, p2, p3].map((p) => ({
                        playerId: p.id,
                        seatWind: '1z',
                        uradora: [],
                    })),
                    isHoutei: false,
                },
            )
            expect(actionsSanma['p2'].pon).toBe(true)
            expect(actionsSanma['p3'].pon).toBe(true)
            expect(actionsSanma['p3'].kan).toBe(true)
        })
    })

    describe('Seat Wind Rotation: 4p vs Sanma', () => {
        it('should rotate through East, South, West, North in 4-Player', () => {
            roundManager4p.oyaIndex = 0
            expect(roundManager4p.getSeatWind(0)).toBe('1z')
            expect(roundManager4p.getSeatWind(1)).toBe('2z')
            expect(roundManager4p.getSeatWind(2)).toBe('3z')
            expect(roundManager4p.getSeatWind(3)).toBe('4z')

            roundManager4p.oyaIndex = 1
            expect(roundManager4p.getSeatWind(1)).toBe('1z')
            expect(roundManager4p.getSeatWind(2)).toBe('2z')
            expect(roundManager4p.getSeatWind(3)).toBe('3z')
            expect(roundManager4p.getSeatWind(0)).toBe('4z')
        })

        it('should rotate through East, South, West in Sanma (skipping North)', () => {
            roundManagerSanma.oyaIndex = 0
            expect(roundManagerSanma.getSeatWind(0)).toBe('1z')
            expect(roundManagerSanma.getSeatWind(1)).toBe('2z')
            expect(roundManagerSanma.getSeatWind(2)).toBe('3z')

            roundManagerSanma.oyaIndex = 1
            expect(roundManagerSanma.getSeatWind(1)).toBe('1z')
            expect(roundManagerSanma.getSeatWind(2)).toBe('2z')
            expect(roundManagerSanma.getSeatWind(0)).toBe('3z')
        })
    })

    describe('Pao (Responsibility Payment) Mechanics in 4p & Sanma', () => {
        it('should trigger Pao for Daisangen when feeding the 3rd Dragon meld', () => {
            const winner = new MockTestPlayer(
                'winner',
                false,
                false,
                mockLogger,
            )
            winner.addMeld({
                type: 'pon',
                tiles: createTiles(['5z', '5z', '5z']),
                opened: true,
                stolenFrom: 'other-p',
            })
            winner.addMeld({
                type: 'pon',
                tiles: createTiles(['6z', '6z', '6z']),
                opened: true,
                stolenFrom: 'other-p',
            })

            const thirdMeld = {
                type: 'pon' as const,
                tiles: createTiles(['7z', '7z', '7z']),
                opened: true,
                stolenFrom: 'feeder-p',
            }
            winner.addMeld(thirdMeld)

            const paoResult = ruleEffectManager.checkPao(winner, thirdMeld)
            expect(paoResult).not.toBeNull()
            expect(paoResult?.responsiblePlayerId).toBe('feeder-p')
            expect(paoResult?.yakumanName).toBe('Daisangen')
        })

        it('should trigger Pao for Daisuushii when feeding the 4th Wind meld', () => {
            const winner = new MockTestPlayer(
                'winner',
                false,
                false,
                mockLogger,
            )
            winner.addMeld({
                type: 'pon',
                tiles: createTiles(['1z', '1z', '1z']),
                opened: true,
                stolenFrom: 'p1',
            })
            winner.addMeld({
                type: 'pon',
                tiles: createTiles(['2z', '2z', '2z']),
                opened: true,
                stolenFrom: 'p2',
            })
            winner.addMeld({
                type: 'pon',
                tiles: createTiles(['3z', '3z', '3z']),
                opened: true,
                stolenFrom: 'p3',
            })

            const fourthMeld = {
                type: 'pon' as const,
                tiles: createTiles(['4z', '4z', '4z']),
                opened: true,
                stolenFrom: 'feeder-p',
            }
            winner.addMeld(fourthMeld)

            const paoResult = ruleEffectManager.checkPao(winner, fourthMeld)
            expect(paoResult).not.toBeNull()
            expect(paoResult?.responsiblePlayerId).toBe('feeder-p')
            expect(paoResult?.yakumanName).toBe('Daisuushii')
        })
    })
})
