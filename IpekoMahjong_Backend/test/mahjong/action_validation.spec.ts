import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

describe('Action Validation', () => {
    let game: MahjongGame
    let actionManager: ActionManager4p
    let turnManager: TurnManager
    let players: Player[]

    beforeEach(() => {
        actionManager = new ActionManager4p()
        turnManager = new TurnManager()
        game = new MahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: false },
                { id: 'p3', isAi: false },
                { id: 'p4', isAi: false },
            ],
            new RoundManager4p(),
            turnManager,
            actionManager,
        )
        // Manually start and initialize to have control
        game.startGame('room1')
        players = game.getPlayers()
    })

    it('should NOT allow a player to steal a turn with an unauthorized action', () => {
        // Player 0's turn (Oya)
        // Assume turnManager.currentTurnIndex is 0 (it should be after startGame)
        expect(turnManager.currentTurnIndex).toBe(0)

        // Player 0 discards a tile
        const discardedTileStr = players[0].getHand()[0].toString()
        game.discardTile('room1', 'p1', discardedTileStr)

        // Now it's pending actions for others.
        // Let's say Player 3 (index 2) tries to Pon, even if they were not eligible.
        // We simulate this by calling performAction directly or via game.

        // Ensure Player 3 is NOT eligible
        actionManager.pendingActions = {}

        const p3 = players[2]
        const p3Id = p3.getId()

        // Player 3 tries to "Pon" the tile discarded by Player 0
        game.performAction('room1', p3Id, 'pon', discardedTileStr, [])

        // CHECK: turnManager.currentTurnIndex should NOT be 2
        // If the bug exists, it will be 2.
        expect(turnManager.currentTurnIndex).not.toBe(2)
        expect(turnManager.currentTurnIndex).toBe(0) // Should still be 0 (or advanced if skip was called)
    })

    it('should NOT allow ankan when it is not the players turn', () => {
        expect(turnManager.currentTurnIndex).toBe(0)

        const p2 = players[1]
        const p2Id = p2.getId()

        // Give p2 four 1m tiles to make ankan possible if it were their turn
        p2.resetKyokuState()
        for (let i = 0; i < 4; i++) {
            p2.draw(new Tile('m', 1, false, i))
        }

        // p2 tries to ankan
        game.performAction('room1', p2Id, 'ankan', '1m', [])

        expect(turnManager.currentTurnIndex).toBe(0)
        expect(p2.getMelds().length).toBe(0)
    })

    it('should NOT allow an action with consumedTiles not in hand', () => {
        expect(turnManager.currentTurnIndex).toBe(0)

        // Player 0 discards 1m
        const discardedTile = new Tile('m', 1, false, 99)
        actionManager.activeDiscard = { playerId: 'p1', tile: discardedTile }

        // Player 1 (p2) is eligible for Pon
        actionManager.pendingActions['p2'] = { pon: true }

        const p2 = players[1]
        const p2Id = p2.getId()

        // Clear p2 hand and give only one 1m (not enough for Pon)
        p2.resetKyokuState()
        p2.draw(new Tile('m', 1, false, 1))

        // p2 tries to Pon using two 1m tiles (one of which they don't have)
        game.performAction('room1', p2Id, 'pon', '1m', ['1m', '1m'])

        // Should fail, currentTurnIndex should not change
        expect(turnManager.currentTurnIndex).toBe(0)
        expect(p2.getMelds().length).toBe(0)
    })
})
