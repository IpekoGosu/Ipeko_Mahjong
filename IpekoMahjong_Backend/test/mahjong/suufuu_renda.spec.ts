import { MahjongGame } from '@src/modules/mahjong/classes/AbstractMahjongGame'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { SimpleAI } from '@src/modules/mahjong/ai/simple.ai'

class TestPlayer extends Player {
    public forceSetHandLast(tile: Tile) {
        this.hand.pop()
        this.hand.push(tile)
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

    private getTestPlayer(id: string): TestPlayer {
        return this.getPlayer(id) as TestPlayer
    }

    public setLastDrawnTile(playerId: string, tile: Tile) {
        this.getTestPlayer(playerId).forceSetHandLast(tile)
    }
}

describe('Suufuu Renda (Four Winds Discard)', () => {
    let game: TestMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        game = new TestMahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: false },
                { id: 'p3', isAi: false },
                { id: 'p4', isAi: false },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame(roomId)
    })

    it('should trigger Suufuu Renda when all 4 players discard the same wind in the first turn', () => {
        game.startFirstTurn(roomId)

        // Turn 0
        let currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 0))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        // Turn 1
        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 1))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        // Turn 2
        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 2))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        // Turn 3
        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 3))
        const result = game.discardTile(roomId, currentPlayerId, '1z')

        expect(result.reason).toBe('ryuukyoku')
        const endEvent = result.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(endEvent?.payload.abortReason).toBe('suufuu-renda')
    })

    it('should NOT trigger Suufuu Renda if the wind sequence is broken', () => {
        game.startFirstTurn(roomId)

        let currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 0))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 2, false, 0))
        const result = game.discardTile(roomId, currentPlayerId, '2z')

        expect(result.reason).not.toBe('ryuukyoku')
    })

    it('should NOT trigger Suufuu Renda if first player does not discard a wind', () => {
        game.startFirstTurn(roomId)

        const currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('m', 1, false, 0))
        const result = game.discardTile(roomId, currentPlayerId, '1m')
        expect(result.reason).not.toBe('ryuukyoku')
    })

    it('should NOT trigger Suufuu Renda if a call is made', () => {
        game.startFirstTurn(roomId)

        // Simulate a call happened (mocking property on ActionManager)
        game.actionManager.anyCallDeclared = true

        let currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 0))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 1))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 2))
        game.discardTile(roomId, currentPlayerId, '1z')
        game.proceedToNextTurn(roomId)

        currentPlayerId = game.getCurrentTurnPlayer().getId()
        game.setLastDrawnTile(currentPlayerId, new Tile('z', 1, false, 3))
        const result = game.discardTile(roomId, currentPlayerId, '1z')

        expect(result.reason).not.toBe('ryuukyoku')
    })
})
