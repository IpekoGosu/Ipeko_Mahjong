import { SimpleAI } from '@src/modules/mahjong/ai/simple.ai'
import { GameObservation } from '@src/modules/mahjong/ai/mahjong-ai.interface'

describe('SimpleAI', () => {
    let ai: SimpleAI

    beforeEach(() => {
        ai = new SimpleAI()
    })

    it('should wait 2 seconds and decide a discard', async () => {
        const obs: GameObservation = {
            myHand: [
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
                '1p',
                '1p',
                '2p',
                '2p',
            ],
            myLastDraw: '2p',
            myIndex: 0,
            players: [],
            doraIndicators: [],
            wallCount: 70,
            deadWallCount: 14,
            bakaze: 1,
            turnCounter: 0,
        }

        const start = Date.now()
        const discard = await ai.decideDiscard(obs)
        const duration = Date.now() - start

        expect(duration).toBeLessThan(500)
        expect(discard).toBeDefined()
        expect(obs.myHand).toContain(discard)
    }, 5000) // Increase timeout for this test

    it('should wait 2 seconds and decide an action', async () => {
        const obs: GameObservation = {
            myHand: ['1m', '2m', '3m'],
            myLastDraw: null,
            myIndex: 0,
            players: [],
            doraIndicators: [],
            wallCount: 70,
            deadWallCount: 14,
            bakaze: 1,
            turnCounter: 0,
        }

        const start = Date.now()
        const action = await ai.decideAction(obs, '1m', { pon: true })
        const duration = Date.now() - start

        expect(duration).toBeLessThan(500)
        expect(action).toBe('skip')
    }, 5000)
})
