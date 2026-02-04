import Riichi from 'riichi'
import { GameObservation, MahjongAI } from './mahjong-ai.interface'
import { PossibleActions, RiichiResult } from '../interfaces/mahjong.types'

export class SimpleAI implements MahjongAI {
    /**
     * Decides which tile to discard to minimize Shanten.
     */
    decideDiscard(obs: GameObservation): string {
        const handTiles = [...obs.myHand]
        if (obs.myLastDraw) {
            // If we don't already have the last draw in the hand (it usually is added to hand in our engine)
            // But let's check if it's there. The engine's draw() sorts the hand.
            // In MahjongGame.drawTileForCurrentPlayer, draw(tile) is called before decideDiscard.
        }

        if (handTiles.length === 0) return ''

        let bestDiscard = handTiles[handTiles.length - 1]
        let minShanten = 100

        // Try discarding each unique tile
        const uniqueTiles = Array.from(new Set(handTiles))

        for (const tile of uniqueTiles) {
            const remainingTiles = [...handTiles]
            const idx = remainingTiles.indexOf(tile)
            if (idx > -1) remainingTiles.splice(idx, 1)

            const handStr = this.convertTilesToString(remainingTiles)
            const result = new Riichi(handStr).calc() as RiichiResult

            const shanten = result.hairi?.now ?? 100

            if (shanten < minShanten) {
                minShanten = shanten
                bestDiscard = tile
            }
        }

        return bestDiscard
    }

    /**
     * Simple AI always skips actions for now.
     */
    decideAction(
        _obs: GameObservation,
        _discardedTile: string,
        _possibleActions: PossibleActions,
    ): 'chi' | 'pon' | 'kan' | 'ron' | 'skip' {
        return 'skip'
    }

    /**
     * Static helper for quick access if needed, though instance usage is preferred with the interface.
     */
    static decideDiscard(handTiles: string[]): string {
        // Temporary wrapper for existing calls if any
        const ai = new SimpleAI()
        return ai.decideDiscard({
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
