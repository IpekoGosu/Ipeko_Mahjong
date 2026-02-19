import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    PossibleActions,
    ActionResult,
    ScoreCalculation,
    MeldType,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { Logger } from '@nestjs/common'

export abstract class AbstractActionManager {
    protected readonly logger = new Logger(this.constructor.name)

    public pendingActions: Record<string, PossibleActions> = {}
    public activeDiscard: { playerId: string; tile: Tile } | null = null
    public anyCallDeclared: boolean = false
    public rinshanFlag: boolean = false
    public pendingDoraReveal: boolean = false

    public potentialRonners: string[] = []
    public receivedRonCommands: { playerId: string; tileString: string }[] = []
    public processedRonners: string[] = []

    public reset() {
        this.pendingActions = {}
        this.activeDiscard = null
        this.anyCallDeclared = false
        this.rinshanFlag = false
        this.pendingDoraReveal = false
        this.potentialRonners = []
        this.receivedRonCommands = []
        this.processedRonners = []
    }

    protected handleRonAction(
        playerId: string,
        tileString: string,
    ): ActionResult {
        if (this.potentialRonners.includes(playerId)) {
            this.receivedRonCommands.push({ playerId, tileString })
            this.processedRonners.push(playerId)

            if (this.processedRonners.length === this.potentialRonners.length) {
                // All ron decisions are made. Orchestrator will handle Ron processing.
                return {
                    success: true,
                    events: [],
                    roundEnd: {
                        reason: 'ron',
                        winners: this.receivedRonCommands.map((cmd) => ({
                            winnerId: cmd.playerId,
                            score: {} as ScoreCalculation, // Placeholder, Orchestrator will fill
                        })),
                        loserId: this.activeDiscard?.playerId,
                    },
                }
            } else {
                return { success: true, events: [] }
            }
        } else {
            return {
                success: false,
                error: 'Invalid Ron attempt',
                events: [],
            }
        }
    }

    protected handleMeldAction(
        player: Player,
        actionType: 'chi' | 'pon' | 'kan' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[],
        players: Player[],
    ): ActionResult {
        this.pendingActions = {}
        players.forEach((p) => (p.ippatsuEligible = false))
        this.anyCallDeclared = true

        let result: {
            success: boolean
            error?: string
            meldTiles?: Tile[]
            tilesToMove?: string[]
            stolenFromId?: string
        }

        if (actionType === 'ankan') {
            result = this.handleClosedKan(player, tileString)
        } else if (actionType === 'kakan') {
            result = this.handleAddedKan(player, tileString)
        } else {
            result = this.handleOpenMeld(
                player,
                actionType,
                consumedTiles,
                players,
            )
        }

        if (!result.success) {
            return { success: false, error: result.error, events: [] }
        }

        const meldTiles = result.meldTiles!
        const tilesToMove = result.tilesToMove!
        const stolenFromId = result.stolenFromId

        const events: ActionResult['events'] = [
            {
                eventName: 'update-meld',
                payload: {
                    playerId: player.getId(),
                    type: actionType,
                    tiles: meldTiles.map((t) => t.toString()),
                    stolenFrom: stolenFromId,
                    consumedTiles: tilesToMove,
                },
                to: 'all',
            },
        ]

        const needsReplacementTile =
            actionType === 'ankan' ||
            actionType === 'kakan' ||
            actionType === 'kan'

        return {
            success: true,
            events,
            needsReplacementTile,
        }
    }

    protected handleClosedKan(
        player: Player,
        tileString: string,
    ): {
        success: boolean
        error?: string
        meldTiles?: Tile[]
        tilesToMove?: string[]
    } {
        const rank = Tile.parseRank(tileString)
        const suit = tileString[1]
        const matches = player
            .getHand()
            .filter((t) => t.getRank() === rank && t.getSuit() === suit)
        if (matches.length < 4)
            return { success: false, error: 'Not enough tiles' }

        const meldTiles = matches.slice(0, 4)
        const tilesToMove = meldTiles.map((t) => t.toString())
        player.removeTiles(tilesToMove)
        player.addMeld({ type: 'ankan', tiles: meldTiles, opened: false })
        this.pendingDoraReveal = true
        this.rinshanFlag = true
        return { success: true, meldTiles, tilesToMove }
    }

    protected handleAddedKan(
        player: Player,
        tileString: string,
    ): {
        success: boolean
        error?: string
        meldTiles?: Tile[]
        tilesToMove?: string[]
    } {
        const rank = Tile.parseRank(tileString)
        const suit = tileString[1]
        const tile = player
            .getHand()
            .find((t) => t.getRank() === rank && t.getSuit() === suit)
        if (!tile) return { success: false, error: 'Tile not in hand' }

        const ponMeld = player
            .getMelds()
            .find(
                (m) =>
                    m.type === 'pon' &&
                    m.tiles[0].getRank() === rank &&
                    m.tiles[0].getSuit() === suit,
            )
        if (!ponMeld)
            return {
                success: false,
                error: 'Corresponding Pon not found',
            }

        player.removeFromHand(tile.toString())
        ponMeld.type = 'kakan'
        ponMeld.tiles.push(tile)
        const tilesToMove = [tile.toString()]
        const meldTiles = ponMeld.tiles
        this.pendingDoraReveal = true
        this.rinshanFlag = true
        return { success: true, meldTiles, tilesToMove }
    }

    protected handleOpenMeld(
        player: Player,
        actionType: 'chi' | 'pon' | 'kan',
        consumedTiles: string[],
        players: Player[],
    ): {
        success: boolean
        error?: string
        meldTiles?: Tile[]
        tilesToMove?: string[]
        stolenFromId?: string
    } {
        if (!this.activeDiscard) {
            return {
                success: false,
                error: 'No active discard to call',
            }
        }
        const stolenFromId = this.activeDiscard.playerId
        const stolenTile = this.activeDiscard.tile

        const removedTiles = player.removeTiles(consumedTiles)
        if (removedTiles.length !== consumedTiles.length) {
            return {
                success: false,
                error: 'Invalid consumed tiles',
            }
        }

        // Remove from discarder's discard pile
        const discarder = players.find((p) => p.getId() === stolenFromId)
        if (discarder) {
            discarder.removeDiscard(stolenTile.toString())
        }

        const meldTiles = [...removedTiles, stolenTile]
        player.addMeld({
            type: actionType as MeldType,
            tiles: meldTiles,
            opened: true,
        })
        const tilesToMove = consumedTiles
        this.activeDiscard = null
        return { success: true, meldTiles, tilesToMove, stolenFromId }
    }

    public abstract getPossibleActions(
        discarderId: string,
        tileString: string,
        players: Player[],
        context: {
            bakaze: string
            dora: string[]
            playerContexts: {
                playerId: string
                seatWind: string
                uradora: string[]
            }[]
            isHoutei: boolean
        },
        isKakan?: boolean,
    ): Record<string, PossibleActions>

    public abstract performAction(
        playerId: string,
        actionType: string,
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        currentPlayerIndex: number,
    ): ActionResult

    public abstract skipAction(
        playerId: string,
        players: Player[],
    ): { shouldProceed: boolean; actionsRemaining: boolean }

    public abstract verifyRon(
        player: Player,
        tileString: string,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHoutei: boolean
        },
        isKakan?: boolean,
    ): { isAgari: boolean; score?: ScoreCalculation }

    public abstract verifyTsumo(
        player: Player,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHaitei: boolean
            rinshanFlag: boolean
        },
    ): { isAgari: boolean; score?: ScoreCalculation }
}
