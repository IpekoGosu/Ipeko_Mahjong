import { Player } from '../player.class'
import { AbstractWall } from '../AbstractWall'
import { GameUpdate } from '../../interfaces/mahjong.types'
import { RuleManager } from '../rule.manager'
import { Logger, Injectable, Scope } from '@nestjs/common'

@Injectable({ scope: Scope.TRANSIENT })
export class TurnManager {
    private readonly logger = new Logger(TurnManager.name)
    public currentTurnIndex: number = 0
    public turnCounter: number = 0
    public firstTurnDiscards: { wind: string; count: number } | null = null

    constructor() {}

    public reset(oyaIndex: number) {
        this.currentTurnIndex = oyaIndex
        this.turnCounter = 0
        this.firstTurnDiscards = null
    }

    public advanceTurn(playerCount: number) {
        this.logger.log(`Advancing turn. Current: ${this.currentTurnIndex}`)
        this.currentTurnIndex = (this.currentTurnIndex + 1) % playerCount
        this.turnCounter++
    }

    public getCurrentTurnPlayer(players: Player[]): Player {
        return players[this.currentTurnIndex]
    }

    // Returns the tile if drawn, or null if wall is empty (Ryuukyoku condition)
    public drawTile(
        wall: AbstractWall,
        player: Player,
    ): GameUpdate['events'] | null {
        const tile = wall.draw()
        if (!tile) {
            return null // Signal empty wall
        }

        player.draw(tile)

        // Update Furiten logic
        player.isFuriten =
            RuleManager.calculateFuriten(player) ||
            player.isTemporaryFuriten ||
            player.isRiichiFuriten

        const ankanList = RuleManager.getAnkanOptions(player)
        const kakanList = RuleManager.getKakanOptions(player)
        const doraIndicators = wall.getDora().map((t) => t.toString())
        const actualDora = RuleManager.getActualDoraList(doraIndicators)

        const events: GameUpdate['events'] = [
            {
                eventName: 'turn-changed',
                payload: {
                    playerId: player.getId(),
                    wallCount: wall.getRemainingTiles(),
                    deadWallCount: wall.getRemainingDeadWall(),
                    dora: doraIndicators,
                    actualDora: actualDora,
                    isFuriten: player.isFuriten,
                },
                to: 'all',
            },
        ]

        if (!player.isAi) {
            events.push({
                eventName: 'new-tile-drawn',
                payload: {
                    tile: tile.toString(),
                    riichiDiscards: RuleManager.getRiichiDiscards(player),
                    // canTsumo is context-dependent, handled by ActionManager/Game
                    isFuriten: player.isFuriten,
                    waits: RuleManager.getWaits(player),
                    ankanList,
                    kakanList,
                },
                to: 'player',
                playerId: player.getId(),
            })
        }

        return events
    }
}
