import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { createTestManagers } from '../test_utils'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestPlayer extends Player {
    public setHand(tiles: Tile[]) {
        this.hand = tiles
    }
    public setPoints(p: number) {
        this.points = p
    }
}

class TestMahjongGame extends MahjongGame {
    protected createPlayer(info: { id: string; isAi: boolean }): Player {
        const player = new TestPlayer(info.id, false, info.isAi)
        if (info.isAi) {
            player.ai = new SimpleAI()
        }
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

    public setKyokuNum(val: number) {
        this.roundManager.kyokuNum = val
    }

    public setBakaze(val: '1z' | '2z' | '3z' | '4z') {
        this.roundManager.bakaze = val
    }

    public setWallCount(count: number) {
        // Manipulate wall for testing
        while (this.wall.getRemainingTiles() > count) {
            this.wall.draw()
        }
    }

    public callEndKyoku(
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

describe('Advanced Mahjong Rules', () => {
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
        )
        game.startGame(roomId)
    })

    describe('Abortive Draws (Tochuu Ryuukyoku)', () => {
        it('should trigger Kyuushu Kyuuhai when player has 9 different terminals/honors in first turn', () => {
            const p1 = game.getTestPlayer('p1')
            // Give 9 different terminals/honors
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 9, false, 1),
                new Tile('p', 1, false, 2),
                new Tile('p', 9, false, 3),
                new Tile('s', 1, false, 4),
                new Tile('s', 9, false, 5),
                new Tile('z', 1, false, 6),
                new Tile('z', 2, false, 7),
                new Tile('z', 3, false, 8),
                new Tile('z', 4, false, 9),
                new Tile('z', 5, false, 10),
                new Tile('z', 6, false, 11),
                new Tile('z', 7, false, 12),
            ])

            const result = game.declareAbortiveDraw(
                roomId,
                'p1',
                'kyuushu-kyuuhai',
            )
            expect(result.reason).toBe('ryuukyoku')
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.abortReason).toBe('kyuushu-kyuuhai')
        })

        it('should trigger Suucha Riichi when all 4 players declare riichi', () => {
            const p4 = game.getTestPlayer('p4')
            const players = game.getPlayers()

            // Make all but p4 riichi
            players.forEach((p) => {
                if (p.getId() !== p4.getId()) {
                    p.isRiichi = true
                }
            })

            // Last player (p4) declares riichi
            // MUST be tenpai to declare riichi
            p4.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('p', 1, false, 3),
                new Tile('p', 1, false, 4),
                new Tile('p', 1, false, 5),
                new Tile('s', 1, false, 6),
                new Tile('s', 1, false, 7),
                new Tile('s', 1, false, 8),
                new Tile('z', 1, false, 9),
                new Tile('z', 1, false, 10),
                new Tile('z', 2, false, 11),
                new Tile('z', 2, false, 12),
                new Tile('s', 2, false, 13), // Drawn tile
            ])
            const p4Index = game.getPlayers().indexOf(p4)
            game.turnManager.currentTurnIndex = p4Index
            game.turnManager.turnCounter = 10
            p4.setPoints(10000)
            const tile = '2s'

            const result = game.discardTile(roomId, p4.getId(), tile, true)

            expect(result.reason).toBe('ryuukyoku')
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.abortReason).toBe('suucha-riichi')
        })

        it('should trigger Suukan Settsu when 4 kans are made by multiple players', () => {
            const players = game.getPlayers()
            // Player 1 and 2 make 2 kans each
            players[0].addMeld({
                type: 'ankan',
                tiles: [
                    new Tile('m', 1, false, 0),
                    new Tile('m', 1, false, 1),
                    new Tile('m', 1, false, 2),
                    new Tile('m', 1, false, 3),
                ],
                opened: false,
            })
            players[0].addMeld({
                type: 'ankan',
                tiles: [
                    new Tile('m', 2, false, 0),
                    new Tile('m', 2, false, 1),
                    new Tile('m', 2, false, 2),
                    new Tile('m', 2, false, 3),
                ],
                opened: false,
            })
            players[1].addMeld({
                type: 'ankan',
                tiles: [
                    new Tile('m', 3, false, 0),
                    new Tile('m', 3, false, 1),
                    new Tile('m', 3, false, 2),
                    new Tile('m', 3, false, 3),
                ],
                opened: false,
            })

            // Now p2 makes the 4th kan
            // We need to simulate the action that triggers the 4th kan.
            const p2 = game.getTestPlayer('p2')
            p2.setHand([
                new Tile('m', 4, false, 0),
                new Tile('m', 4, false, 1),
                new Tile('m', 4, false, 2),
                new Tile('m', 4, false, 3),
            ])
            game.turnManager.currentTurnIndex = 1

            // p2 declares ankan
            game.turnManager.currentTurnIndex = game.getPlayers().indexOf(p2)
            const result = game.performAction('room1', 'p2', 'ankan', '4m', [])

            expect(result.reason).toBe('ryuukyoku')
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.abortReason).toBe('suukan-settsu')
        })

        it('should NOT trigger Suukan Settsu if all 4 kans are made by the same player', () => {
            const p1 = game.getTestPlayer('p1')
            // p1 makes 3 kans already
            for (let i = 1; i <= 3; i++) {
                p1.addMeld({
                    type: 'ankan',
                    tiles: [
                        new Tile('m', i, false, 0),
                        new Tile('m', i, false, 1),
                        new Tile('m', i, false, 2),
                        new Tile('m', i, false, 3),
                    ],
                    opened: false,
                })
            }

            p1.setHand([
                new Tile('m', 4, false, 0),
                new Tile('m', 4, false, 1),
                new Tile('m', 4, false, 2),
                new Tile('m', 4, false, 3),
            ])
            game.turnManager.currentTurnIndex = game.getPlayers().indexOf(p1)

            // p1 declares 4th ankan
            const result = game.performAction('room1', 'p1', 'ankan', '4m', [])

            // Should NOT be ryuukyoku (going for Suukantsu)
            expect(result.reason).not.toBe('ryuukyoku')
            expect(p1.getMelds().length).toBe(4)
        })

        it('should process Triple Ron when 3 players declare Ron on the same tile', () => {
            const players = game.getPlayers()
            // p1 discards, p2, p3, p4 all Ron
            const p1 = players[0] as TestPlayer

            game.turnManager.currentTurnIndex = 0
            p1.setHand([new Tile('m', 1, false, 0)])

            // Setup potential ronners in actionManager
            game.actionManager.activeDiscard = {
                playerId: 'p1',
                tile: new Tile('m', 1, false, 0),
            }
            game.actionManager.potentialRonners = ['p2', 'p3', 'p4']

            // Mock score calculation for Ron
            const mockScore: ScoreCalculation = {
                ten: 8000,
                oya: [8000],
                ko: [8000],
                yaku: {},
                fu: 30,
                han: 4,
                yakuman: 0,
                name: 'Mangan',
                text: 'Mangan',
            }

            // Since game.performAction calls verifyRon internally, we should mock it or provide real Tenpai hands.
            // But game.performAction handles the winners list correctly.
            // Let's mock verifyRon for this test.
            jest.spyOn(game.actionManager, 'verifyRon').mockReturnValue({
                isAgari: true,
                score: mockScore,
            })

            // p2, p3 declare Ron
            game.performAction('room1', 'p2', 'ron', '1m', [])
            game.performAction('room1', 'p3', 'ron', '1m', [])

            // p4 declares Ron - this should NOT trigger abortive draw, but endKyoku with 3 winners.
            const result = game.performAction('room1', 'p4', 'ron', '1m', [])

            expect(result.reason).toBe('ron')
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.reason).toBe('ron')
            expect(endEvent?.payload.allWinners).toHaveLength(3)
        })
    })

    describe('Nagashi Mangan', () => {
        it('should trigger Nagashi Mangan at the end of Kyoku if a player has only terminal/honors in discards and none were called', () => {
            const players = game.getPlayers()
            const p1 = game.getTestPlayer('p1')

            // Setup p1 discards with only terminals/honors
            p1.resetKyokuState()
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 9, false, 1),
                new Tile('z', 1, false, 2),
            ])
            p1.discard('1m')
            p1.discard('9m')
            p1.discard('1z')

            // Others discard regular tiles
            const p2 = game.getTestPlayer('p2')
            p2.setHand([new Tile('m', 1, false, 1), new Tile('m', 1, false, 2)])
            p2.discard('2m') // Placeholder

            // Manually set points to see the effect
            players.forEach((p) => (p.points = 25000))

            // Trigger ryuukyoku (wall empty)
            const result = game.callEndKyoku(roomId, { reason: 'ryuukyoku' })

            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.reason).toBe('ryuukyoku')
            // p1 is Ko (p2 is oya if not set, let's check oya)
            // If p1 is Ko, they get 2000 from each Ko and 4000 from Oya = 8000
            expect(p1.points).toBeGreaterThan(25000)
            const scoreUpdate = result.events.find(
                (e) => e.eventName === 'score-update',
            )
            expect(scoreUpdate?.payload.reason).toBe('nagashi-mangan')
        })

        it('should NOT trigger Nagashi Mangan if a terminal discard was stolen', () => {
            const players = game.getPlayers()
            const p1 = game.getTestPlayer('p1')

            // Setup p1 discards with only terminals/honors
            p1.resetKyokuState()
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 9, false, 1),
                new Tile('z', 1, false, 2),
            ])
            p1.discard('1m')
            p1.discard('9m')
            p1.discard('1z')

            // p2 steals p1's '1m'
            // We need activeDiscard to be set for handleOpenMeld (which is called via performAction)
            game.actionManager.activeDiscard = {
                playerId: 'p1',
                tile: new Tile('m', 1, false, 0),
            }
            // Populate pendingActions so performAction is allowed
            game.actionManager.getPossibleActions(
                'p1',
                '1m',
                game.getPlayers(),
                {
                    bakaze: '1z',
                    dora: [],
                    playerContexts: game.getPlayers().map((p) => ({
                        playerId: p.getId(),
                        seatWind: '1z',
                        uradora: [],
                    })),
                    isHoutei: false,
                },
            )

            // Use performAction to simulate stealing (Pon)
            game.performAction(roomId, 'p2', 'pon', '1m', ['1m', '1m'])

            // Manually set points
            players.forEach((p) => (p.points = 25000))

            // Trigger ryuukyoku (wall empty)
            const result = game.callEndKyoku(roomId, { reason: 'ryuukyoku' })

            const scoreUpdate = result.events.find(
                (e) =>
                    e.eventName === 'score-update' &&
                    e.payload.reason === 'nagashi-mangan',
            )
            expect(scoreUpdate).toBeUndefined()
            expect(p1.points).toBe(25000) // Should not have gained Nagashi points
        })
    })

    describe('Riichi Requirements', () => {
        it('should NOT allow riichi if player has less than 1000 points', () => {
            const p1 = game.getTestPlayer('p1')
            p1.setPoints(900)
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 2, false, 1),
                new Tile('m', 3, false, 2),
                new Tile('m', 4, false, 3),
                new Tile('m', 5, false, 4),
                new Tile('m', 6, false, 5),
                new Tile('m', 7, false, 6),
                new Tile('m', 8, false, 7),
                new Tile('m', 9, false, 8),
                new Tile('z', 1, false, 9),
                new Tile('z', 1, false, 10),
                new Tile('z', 2, false, 11),
                new Tile('z', 2, false, 12),
                new Tile('s', 1, false, 13),
            ])
            const tile = '1s'

            const result = game.discardTile(roomId, 'p1', tile, true)
            expect(result.events.some((e) => e.eventName === 'error')).toBe(
                true,
            )
            expect(p1.isRiichi).toBe(false)
        })

        it('should NOT allow riichi if there are less than 4 tiles in the wall', () => {
            game.setWallCount(3)
            const p1 = game.getTestPlayer('p1')
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 2, false, 1),
                new Tile('m', 3, false, 2),
                new Tile('m', 4, false, 3),
                new Tile('m', 5, false, 4),
                new Tile('m', 6, false, 5),
                new Tile('m', 7, false, 6),
                new Tile('m', 8, false, 7),
                new Tile('m', 9, false, 8),
                new Tile('z', 1, false, 9),
                new Tile('z', 1, false, 10),
                new Tile('z', 2, false, 11),
                new Tile('z', 2, false, 12),
                new Tile('s', 1, false, 13),
            ])
            const tile = '1s'

            const result = game.discardTile(roomId, 'p1', tile, true)
            expect(result.events.some((e) => e.eventName === 'error')).toBe(
                true,
            )
            expect(p1.isRiichi).toBe(false)
        })
    })

    describe('Dealer (Oya) Rules', () => {
        it('should retain dealership (Renchan) if Oya is Tenpai in Ryuukyoku', () => {
            const players = game.getPlayers()
            game.setOyaIndex(0) // players[0] is Oya
            const oya = players[0] as TestPlayer
            // Mock Tenpai for Oya
            oya.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('p', 1, false, 3),
                new Tile('p', 1, false, 4),
                new Tile('p', 1, false, 5),
                new Tile('s', 1, false, 6),
                new Tile('s', 1, false, 7),
                new Tile('s', 1, false, 8),
                new Tile('z', 1, false, 9),
                new Tile('z', 1, false, 10),
                new Tile('z', 2, false, 11),
                new Tile('z', 2, false, 12),
            ])

            // Others Noten
            players.slice(1).forEach((p) => {
                ;(p as TestPlayer).setHand([new Tile('z', 7, false, 0)])
            })

            const result = game.callEndKyoku(roomId, { reason: 'ryuukyoku' })
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.nextState.kyoku).toBe(1) // Still Kyoku 1
            expect(endEvent?.payload.nextState.honba).toBeGreaterThan(0)
        })

        it('should lose dealership if Oya is Noten in Ryuukyoku', () => {
            const players = game.getPlayers()
            game.setOyaIndex(0)
            // Give everyone a non-tenpai 13-tile hand
            players.forEach((p) => {
                ;(p as TestPlayer).setHand([
                    new Tile('m', 1, false, 0),
                    new Tile('m', 2, false, 1),
                    new Tile('m', 4, false, 2),
                    new Tile('p', 1, false, 3),
                    new Tile('p', 2, false, 4),
                    new Tile('p', 4, false, 5),
                    new Tile('s', 1, false, 6),
                    new Tile('s', 2, false, 7),
                    new Tile('s', 4, false, 8),
                    new Tile('z', 1, false, 9),
                    new Tile('z', 2, false, 10),
                    new Tile('z', 3, false, 11),
                    new Tile('z', 5, false, 12),
                ])
            })

            const result = game.callEndKyoku(roomId, { reason: 'ryuukyoku' })
            const endEvent = result.events.find(
                (e) => e.eventName === 'round-ended',
            )
            expect(endEvent?.payload.nextState.kyoku).toBe(2) // Advanced to Kyoku 2
        })
    })

    describe('Double Ron (Head-bump) Rules', () => {
        it('should process double ron and award honba/kyotaku only to the first winner (head-bump)', () => {
            const players = game.getPlayers()
            // p1 is oya (index 0)
            // p2 (index 1), p3 (index 2), p4 (index 3)
            game.setOyaIndex(0)
            game.roundManager.honba = 1
            game.roundManager.kyotaku = 1
            players.forEach((p) => (p.points = 25000))

            // p2 and p3 both win Ron from p1 (Oya)
            // p2 is closer to p1 in turn order (p1 -> p2 -> p3 -> p4)
            // So p2 is head-bump winner
            game.callEndKyoku(roomId, {
                reason: 'ron',
                winners: [
                    {
                        winnerId: players[1].getId(),
                        score: {
                            ten: 8000,
                            oya: [8000],
                            ko: [0],
                        } as unknown as ScoreCalculation,
                    },
                    {
                        winnerId: players[2].getId(),
                        score: {
                            ten: 8000,
                            oya: [8000],
                            ko: [0],
                        } as unknown as ScoreCalculation,
                    },
                ],
                loserId: players[0].getId(),
            })

            // p2 (Head-bump): 25000 + 8000 (base) + 300 (honba) + 1000 (kyotaku) = 34300
            // p3: 25000 + 8000 (base) = 33000
            // p1 (Loser): 25000 - 8300 (to p2) - 8000 (to p3) = 8700
            expect(players[1].points).toBe(34300)
            expect(players[2].points).toBe(33000)
            expect(players[0].points).toBe(8700)
        })
    })

    describe('Tie-breaking Rules', () => {
        it('should break ties based on initial seat order at game end', () => {
            const players = game.getPlayers()
            // Set to South 4
            game.setBakaze('2z')
            game.setKyokuNum(4)
            // Let's make index 3 the Oya
            game.setOyaIndex(3)

            // Force initial seat order to match current players array
            const playerIds = players.map((p) => p.getId())
            game.roundManager.initialPlayerOrder = playerIds

            // Give everyone same points
            players.forEach((p) => (p.points = 25000))

            // Trigger game over with Ron
            // p[0] wins Ron (8000) from p[1]
            // p[0]: 33000, p[1]: 17000, p[2]: 25000, p[3]: 25000
            const result = game.callEndKyoku(roomId, {
                reason: 'ron',
                winners: [
                    {
                        winnerId: players[0].getId(),
                        score: {
                            ten: 8000,
                            oya: [8000],
                            ko: [8000],
                        } as unknown as ScoreCalculation,
                    },
                ],
                loserId: players[1].getId(),
            })

            expect(result.isGameOver).toBe(true)
            const gameOverEvent = result.events.find(
                (e) => e.eventName === 'game-over',
            )
            const ranking = gameOverEvent?.payload.finalRanking as {
                id: string
            }[]
            // p[0] is Rank 1
            // p[2] and p[3] tied at 25000. p[2] was earlier in order.
            expect(ranking[0].id).toBe(players[0].getId())
            expect(ranking[1].id).toBe(players[2].getId()) // Rank 2
            expect(ranking[2].id).toBe(players[3].getId()) // Rank 3
            expect(ranking[3].id).toBe(players[1].getId()) // Rank 4
        })
    })
})
