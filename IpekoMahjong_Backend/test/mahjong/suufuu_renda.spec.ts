import { MahjongGame } from '@src/modules/mahjong/classes/mahjong.game.class'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

describe('Suufuu Renda (Four Winds Discard)', () => {
    let game: MahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        game = new MahjongGame(
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
        // We need to bypass the random wall and force discards.
        // turnCounter is used to check first turn.
        // TurnManager handles currentTurnIndex.

        const p1 = game.getPlayer('p1')!
        const p2 = game.getPlayer('p2')!
        const p3 = game.getPlayer('p3')!
        const p4 = game.getPlayer('p4')!

        // Force East wind discards
        // turn 0: p1 discards 1z
        game.discardTile(roomId, p1.getId(), '1z')
        // turn 1: p2 discards 1z
        game.discardTile(roomId, p2.getId(), '1z')
        // turn 2: p3 discards 1z
        game.discardTile(roomId, p3.getId(), '1z')
        // turn 3: p4 discards 1z
        const result = game.discardTile(roomId, p4.getId(), '1z')

        expect(result.reason).toBe('ryuukyoku')
        const endEvent = result.events.find(
            (e) => e.eventName === 'round-ended',
        )
        expect(endEvent?.payload.abortReason).toBe('suufuu-renda')
    })

    it('should NOT trigger Suufuu Renda if the wind sequence is broken', () => {
        const p1 = game.getPlayer('p1')!
        const p2 = game.getPlayer('p2')!

        game.discardTile(roomId, p1.getId(), '1z')
        const result = game.discardTile(roomId, p2.getId(), '2z') // Different wind

        expect(result.reason).not.toBe('ryuukyoku')
    })

    it('should NOT trigger Suufuu Renda if first player does not discard a wind', () => {
        const p1 = game.getPlayer('p1')!
        const result = game.discardTile(roomId, p1.getId(), '1m') // Not a wind
        expect(result.reason).not.toBe('ryuukyoku')
    })

    it('should NOT trigger Suufuu Renda if a call is made', () => {
        // Suufuu Renda only happens if no one has made a call.
        // anyCallDeclared is checked in discardTile.
        game.actionManager.anyCallDeclared = true

        const p1 = game.getPlayer('p1')!
        const p2 = game.getPlayer('p2')!
        const p3 = game.getPlayer('p3')!
        const p4 = game.getPlayer('p4')!

        game.discardTile(roomId, p1.getId(), '1z')
        game.discardTile(roomId, p2.getId(), '1z')
        game.discardTile(roomId, p3.getId(), '1z')
        const result = game.discardTile(roomId, p4.getId(), '1z')

        expect(result.reason).not.toBe('ryuukyoku')
    })
})
