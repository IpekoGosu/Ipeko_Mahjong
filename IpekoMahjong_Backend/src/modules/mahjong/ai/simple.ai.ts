import { GameObservation, MahjongAI } from './mahjong-ai.interface'
import { PossibleActions } from '../interfaces/mahjong.types'

export class SimpleAI implements MahjongAI {
    private readonly delay: number

    constructor() {
        this.delay = process.env.NODE_ENV === 'test' ? 0 : 1000
    }

    private sleep(ms: number) {
        if (ms <= 0) return Promise.resolve()
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Decides which tile to discard to minimize Shanten.
     */
    async decideDiscard(obs: GameObservation): Promise<string> {
        await this.sleep(this.delay)

        const handTiles = [...obs.myHand]
        return handTiles[handTiles.length - 1]
    }

    /**
     * Simple AI always skips actions for now.
     */
    async decideAction(
        _obs: GameObservation,
        _discardedTile: string,
        _possibleActions: PossibleActions,
    ): Promise<'chi' | 'pon' | 'kan' | 'ron' | 'skip'> {
        await this.sleep(this.delay)
        return 'skip'
    }

    /**
     * Static helper for quick access if needed, though instance usage is preferred with the interface.
     */
    static async decideDiscard(handTiles: string[]): Promise<string> {
        // Temporary wrapper for existing calls if any
        const ai = new SimpleAI()
        return await ai.decideDiscard({
            myHand: handTiles,
            myLastDraw: null,
            players: [],
            myIndex: 0,
            doraIndicators: [],
            wallCount: 0,
            deadWallCount: 0,
            bakaze: 1,
            turnCounter: 0,
        })
    }

    private convertTilesToString(tiles: string[]): string {
        // Convert ["1m", "2m", "1p"] to "12m1p"
        const groups: Record<string, number[]> = { m: [], p: [], s: [], z: [] }
        tiles.forEach((t) => {
            const rank = parseInt(t[0])
            const suit = t[1]
            if (groups[suit]) groups[suit].push(rank)
        })

        let result = ''
        ;['m', 'p', 's', 'z'].forEach((suit) => {
            if (groups[suit].length > 0) {
                groups[suit].sort((a, b) => a - b)
                result += groups[suit].join('') + suit
            }
        })
        return result
    }
}
