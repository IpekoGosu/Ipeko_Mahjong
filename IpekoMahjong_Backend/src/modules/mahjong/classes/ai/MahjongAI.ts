import { GameObservation } from '@src/modules/mahjong/interfaces/mahjong-ai.interface'
import { PossibleActions } from '@src/modules/mahjong/interfaces/mahjong.types'

/**
 * Abstract AI interface for Mahjong.
 * This can be implemented by simple heuristic-based AIs or sophisticated neural networks.
 */
export abstract class MahjongAI {
    /**
     * Decides which tile to discard given the current game observation.
     */
    abstract decideDiscard(observation: GameObservation): Promise<string>

    /**
     * Decides whether to perform an action (Chi, Pon, Kan, Ron) on a discarded tile.
     * Returns the action type or 'skip'.
     */
    abstract decideAction(
        observation: GameObservation,
        discardedTile: string,
        possibleActions: PossibleActions,
    ): Promise<'chi' | 'pon' | 'kan' | 'ron' | 'skip'>
}
