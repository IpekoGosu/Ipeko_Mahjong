import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { GameObservation } from '@src/modules/mahjong/interfaces/mahjong-ai.interface'
import { MahjongGame } from '@src/modules/mahjong/classes/MahjongGame.4p'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

describe('SimpleAI', () => {
    let ai: SimpleAI
    let game: MahjongGame

    beforeEach(() => {
        ai = new SimpleAI()
        game = new MahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true, ai: ai },
                { id: 'p3', isAi: true, ai: ai },
                { id: 'p4', isAi: true, ai: ai },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame('room1')
    })

    it('should wait 2 seconds and decide a discard', async () => {
        const player = game.getPlayer('p1')!
        const obs: GameObservation = game.createGameObservation(player)

        // ai.decideDiscard should return a tile from hand
        const discard = await ai.decideDiscard(obs)

        expect(discard).toBeDefined()
        expect(obs.myHand).toContain(discard)
    }, 5000)

    it('should wait 2 seconds and decide an action', async () => {
        const player = game.getPlayer('p1')!
        const obs: GameObservation = game.createGameObservation(player)

        const action = await ai.decideAction(obs, '1m', { pon: true })
        // For now SimpleAI always returns 'skip'
        expect(action).toBe('skip')
    }, 5000)
})
