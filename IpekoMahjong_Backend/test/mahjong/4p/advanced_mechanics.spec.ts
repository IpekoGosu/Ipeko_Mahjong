import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { createTestManagers } from '../test_utils'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

class TestPlayer extends Player {
    public setHand(tiles: Tile[]) {
        this.hand = tiles
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

    public setWallCount(count: number) {
        while (this.wall.getRemainingTiles() > count) {
            this.wall.draw()
        }
    }
}

describe('Advanced Mahjong Mechanics', () => {
    let game: TestMahjongGame
    let roomId: string
    let ruleManager: RuleManager

    beforeEach(() => {
        roomId = 'test-room'
        const managers = createTestManagers()
        ruleManager = managers.ruleManager
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

    describe('Kan Dora Timing', () => {
        it('should reveal Kan Dora IMMEDIATELY for Ankan (before drawing replacement)', () => {
            const p1 = game.getTestPlayer('p1')
            game.turnManager.currentTurnIndex = game.getPlayers().indexOf(p1)

            // Give p1 four 1m tiles
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('m', 1, false, 3),
                new Tile('z', 1, false, 4),
            ])
            p1.lastDrawnTile = p1.getHand()[0]

            const initialDoraCount = game.getDora().length

            game.performAction(roomId, p1.getId(), 'ankan', '1m', [])

            // Dora should have increased
            expect(game.getDora().length).toBe(initialDoraCount + 1)
        })

        it('should reveal Kan Dora AFTER discard for Kakan', () => {
            const p1 = game.getTestPlayer('p1')
            game.turnManager.currentTurnIndex = game.getPlayers().indexOf(p1)

            // Give p1 a Pon of 1m
            p1.addMeld({
                type: 'pon',
                tiles: [
                    new Tile('m', 1, false, 0),
                    new Tile('m', 1, false, 1),
                    new Tile('m', 1, false, 2),
                ],
                opened: true,
            })
            p1.setHand([new Tile('m', 1, false, 3), new Tile('z', 1, false, 4)])

            const initialDoraCount = game.getDora().length

            // Perform Kakan
            game.performAction(roomId, p1.getId(), 'kakan', '1m', [])

            // Dora should NOT be revealed yet
            expect(game.getDora().length).toBe(initialDoraCount)

            // Now discard a tile
            game.discardTile(roomId, p1.getId(), '1z')

            // Dora should be revealed now
            expect(game.getDora().length).toBe(initialDoraCount + 1)
        })
    })

    describe('Closed Kan after Riichi', () => {
        it('should allow Ankan after Riichi if it DOES NOT change waits', () => {
            const p1 = game.getTestPlayer('p1')
            p1.isRiichi = true

            // Hand: 111m 222p 333s 444z 5z (Wait for 5z)
            // Ankan 1m -> Hand: (1111m) 222p 333s 444z 5z (Still wait for 5z)
            const hand = [
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('m', 1, false, 3), // Drawn tile
                new Tile('p', 2, false, 4),
                new Tile('p', 2, false, 5),
                new Tile('p', 2, false, 6),
                new Tile('s', 3, false, 7),
                new Tile('s', 3, false, 8),
                new Tile('s', 3, false, 9),
                new Tile('z', 4, false, 10),
                new Tile('z', 4, false, 11),
                new Tile('z', 4, false, 12),
                new Tile('z', 5, false, 13),
            ]
            p1.setHand(hand)
            p1.lastDrawnTile = hand[3] // 1m

            const ankanOptions = ruleManager.getAnkanOptions(p1)
            expect(ankanOptions).toContain('1m')
        })

        it('should NOT allow Ankan after Riichi if it CHANGES waits', () => {
            const p1 = game.getTestPlayer('p1')
            p1.isRiichi = true

            // Hand: 1112345678999m (Wait for 1,2,3,4,5,6,7,8,9m)
            // Ankan 1m -> Hand: (1111m) 2345678999m - Wait set definitely changes.
            const hand = [
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('m', 2, false, 3),
                new Tile('m', 3, false, 4),
                new Tile('m', 4, false, 5),
                new Tile('m', 5, false, 6),
                new Tile('m', 6, false, 7),
                new Tile('m', 7, false, 8),
                new Tile('m', 8, false, 9),
                new Tile('m', 9, false, 10),
                new Tile('m', 9, false, 11),
                new Tile('m', 9, false, 12),
                new Tile('m', 1, false, 13), // Drawn tile
            ]
            p1.setHand(hand)
            p1.lastDrawnTile = hand[13] // 1m

            const ankanOptions = ruleManager.getAnkanOptions(p1)
            expect(ankanOptions).not.toContain('1m')
        })
    })

    describe('Kuikae Nashi (No Swap-calling)', () => {
        it('should NOT allow discarding the same tile that was just called (Pon)', () => {
            const p1 = game.getTestPlayer('p1')
            game.turnManager.currentTurnIndex = 0

            const p2 = game.getPlayers()[1]
            // p2 (index 1) discards 1m
            const discardedTile = new Tile('m', 1, false, 99)
            game.actionManager.activeDiscard = {
                playerId: p2.getId(),
                tile: discardedTile,
            }
            game.actionManager.pendingActions[p1.getId()] = { pon: true }

            // Hand has THREE 1m tiles. Uses two for Pon, one remains.
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
                new Tile('z', 1, false, 3),
            ])

            // Perform Pon (using 1m_0 and 1m_1)
            game.performAction(roomId, p1.getId(), 'pon', '1m', ['1m', '1m'])

            // Try to discard the remaining 1m (Forbidden)
            const result = game.discardTile(roomId, p1.getId(), '1m')
            expect(result.events.some((e) => e.eventName === 'error')).toBe(
                true,
            )
        })

        it('should NOT allow discarding the tile that completes the sequence in the other end (Chi)', () => {
            const p1 = game.getTestPlayer('p1')
            const players = game.getPlayers()
            const p1Index = players.indexOf(p1)
            const pKamichaIndex = (p1Index + 3) % 4

            // Case 1: Same tile (Chi 3m with 1m-2m, then try to discard 3m)
            const discardedTile1 = new Tile('m', 3, false, 99)
            game.actionManager.activeDiscard = {
                playerId: players[pKamichaIndex].getId(),
                tile: discardedTile1,
            }
            game.actionManager.pendingActions[p1.getId()] = {
                chi: true,
                chiOptions: [['1m', '2m']],
            }

            // Hand has 1m, 2m AND another 3m.
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 2, false, 1),
                new Tile('m', 3, false, 2),
                new Tile('z', 1, false, 3),
            ])
            game.performAction(roomId, p1.getId(), 'chi', '3m', ['1m', '2m'])

            const result1 = game.discardTile(roomId, p1.getId(), '3m')
            expect(result1.events.some((e) => e.eventName === 'error')).toBe(
                true,
            )

            // Case 2: Other end (Chi 3m with 4m-5m, then try to discard 6m)
            p1.resetKyokuState()
            const discardedTile2 = new Tile('m', 3, false, 100)
            game.actionManager.activeDiscard = {
                playerId: players[pKamichaIndex].getId(),
                tile: discardedTile2,
            }
            game.actionManager.pendingActions[p1.getId()] = {
                chi: true,
                chiOptions: [['4m', '5m']],
            }

            // Hand has 4m, 5m AND 6m.
            p1.setHand([
                new Tile('m', 4, false, 0),
                new Tile('m', 5, false, 1),
                new Tile('m', 6, false, 2),
                new Tile('z', 1, false, 3),
            ])
            game.performAction(roomId, p1.getId(), 'chi', '3m', ['4m', '5m'])

            const result2 = game.discardTile(roomId, p1.getId(), '6m')
            expect(result2.events.some((e) => e.eventName === 'error')).toBe(
                true,
            )
        })
    })

    describe('Houtei Call Restriction', () => {
        it('should NOT allow calling (Pon/Chi/Kan) on the very last tile of the wall', () => {
            const players = game.getPlayers()
            const p1 = game.getTestPlayer('p1')
            const p2 = players.find((p) => p.getId() !== p1.getId())!

            // Set wall to 0 tiles remaining
            game.setWallCount(0)

            // p1 has tiles for Pon/Chi
            p1.setHand([
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 2, false, 2),
            ])

            // p2 discards 1m
            const actions = game.getPossibleActions(p2.getId(), '1m')

            // p1 should NOT have Pon/Chi options because it's Houtei
            expect(actions[p1.getId()]?.pon).toBeFalsy()
            expect(actions[p1.getId()]?.chi).toBeFalsy()
        })

        it('should STILL allow Ron on the very last tile (Houtei Raoyue)', () => {
            const players = game.getPlayers()
            const p1 = game.getTestPlayer('p1')
            const p2 = players.find((p) => p.getId() !== p1.getId())!

            game.setWallCount(0)

            // p1 is waiting for 1z or 2z (Shanpon wait)
            p1.setHand([
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

            // p2 discards 1z
            const actions = game.getPossibleActions(p2.getId(), '1z')
            expect(actions[p1.getId()]?.ron).toBe(true)
        })
    })

    describe('Furiten Rules', () => {
        it('should NOT allow Ron if player is in same-turn furiten (passed a winning tile)', () => {
            const players = game.getPlayers()
            const p1 = game.getTestPlayer('p1')
            const p2 = players.find((p) => p.getId() !== p1.getId())!
            const p3 = players.find(
                (p) => p.getId() !== p1.getId() && p.getId() !== p2.getId(),
            )!

            // p1 is waiting for 1z or 2z
            p1.setHand([
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

            // p2 discards 1z. p1 is eligible for Ron.
            const actions1 = game.getPossibleActions(p2.getId(), '1z')
            expect(actions1[p1.getId()]?.ron).toBe(true)

            // p1 skips the action
            game.skipAction(roomId, p1.getId())
            expect(p1.isTemporaryFuriten).toBe(true)

            // In the SAME TURN, p3 discards 2z. p1 should NOT be able to Ron because of same-turn furiten.
            const actions2 = game.getPossibleActions(p3.getId(), '2z')
            expect(actions2[p1.getId()]?.ron).toBeFalsy()
        })
    })
})
