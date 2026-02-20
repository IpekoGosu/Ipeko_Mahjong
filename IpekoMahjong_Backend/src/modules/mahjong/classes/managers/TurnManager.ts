import { Player } from '@src/modules/mahjong/classes/player.class'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { GameUpdate } from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Injectable } from '@nestjs/common'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

@Injectable()
export class TurnManager {
    public currentTurnIndex: number = 0
    public turnCounter: number = 0
    public firstTurnDiscards: { wind: string; count: number } | null = null

    constructor(
        private readonly ruleManager: RuleManager,
        private readonly logger: WinstonLoggerService,
    ) {}

    public reset(oyaIndex: number) {
        this.currentTurnIndex = oyaIndex
        this.turnCounter = 0
        this.firstTurnDiscards = null
    }

    public advanceTurn(playerCount: number) {
        this.logger.log(
            `Advancing turn. Current: ${this.currentTurnIndex}`,
            TurnManager.name,
        )
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
            this.ruleManager.calculateFuriten(player) ||
            player.isTemporaryFuriten ||
            player.isRiichiFuriten

        const ankanList = this.ruleManager.getAnkanOptions(player)
        const kakanList = this.ruleManager.getKakanOptions(player)
        const doraIndicators = wall.getDora().map((t) => t.toString())
        const actualDora = this.ruleManager.getActualDoraList(doraIndicators)

        const events: GameUpdate['events'] = [
            {
                eventName: 'turn-changed',
                payload: {
                    playerId: player.id,
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
                    riichiDiscards: this.ruleManager.getRiichiDiscards(player),
                    // canTsumo is context-dependent, handled by ActionManager/Game
                    isFuriten: player.isFuriten,
                    waits: this.ruleManager.getWaits(player),
                    ankanList,
                    kakanList,
                },
                to: 'player',
                playerId: player.id,
            })
        }

        return events
    }
}
