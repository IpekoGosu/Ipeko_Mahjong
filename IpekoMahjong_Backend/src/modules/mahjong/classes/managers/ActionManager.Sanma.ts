import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    PossibleActions,
    ActionResult,
    ScoreCalculation,
    MeldType,
    WinContext,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'

export class ActionManagerSanma extends AbstractActionManager {
    public getPossibleActions(
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
        isKakan: boolean = false,
    ): Record<string, PossibleActions> {
        const discarder = players.find((p) => p.getId() === discarderId)
        if (!discarder) return {}

        this.potentialRonners = []
        this.receivedRonCommands = []
        this.processedRonners = []

        const actions: Record<string, PossibleActions> = {}

        players.forEach((player) => {
            if (player.getId() === discarderId) return

            const hand = player.getHand()
            const possibleActions: PossibleActions = {}
            let hasAction = false

            const playerCtx = context.playerContexts.find(
                (c) => c.playerId === player.getId(),
            )!

            const result = this.verifyRon(
                player,
                tileString,
                {
                    bakaze: context.bakaze,
                    seatWind: playerCtx.seatWind,
                    dora: context.dora,
                    uradora: playerCtx.uradora,
                    isHoutei: context.isHoutei,
                },
                isKakan,
            )

            const isFuriten =
                player.isFuriten ||
                player.isTemporaryFuriten ||
                player.isRiichiFuriten

            if (result.isAgari && !isFuriten) {
                possibleActions.ron = true
                hasAction = true
                this.potentialRonners.push(player.getId())
            }

            if (isKakan) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            // Houtei restriction: cannot call last tile except for Ron
            if (context.isHoutei) {
                if (possibleActions.ron) {
                    actions[player.getId()] = { ron: true }
                }
                return
            }

            if (player.isRiichi) {
                if (hasAction) actions[player.getId()] = possibleActions
                return
            }

            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const matches = hand.filter(
                (t) => t.getRank() === rank && t.getSuit() === suit,
            )

            if (matches.length >= 2) {
                possibleActions.pon = true
                hasAction = true
            }
            if (matches.length >= 3) {
                possibleActions.kan = true
                hasAction = true
            }

            // Sanma: No Chi.

            if (hasAction) {
                actions[player.getId()] = possibleActions
            }
        })

        this.pendingActions = actions
        return actions
    }

    public performAction(
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        currentPlayerIndex: number,
    ): ActionResult {
        const player = players.find((p) => p.getId() === playerId)!
        const playerIndex = players.indexOf(player)

        if (actionType === 'ron') {
            if (this.potentialRonners.includes(playerId)) {
                this.receivedRonCommands.push({ playerId, tileString })
                this.processedRonners.push(playerId)

                if (
                    this.processedRonners.length ===
                    this.potentialRonners.length
                ) {
                    return {
                        success: true,
                        events: [],
                        roundEnd: {
                            reason: 'ron',
                            winners: this.receivedRonCommands.map((cmd) => ({
                                winnerId: cmd.playerId,
                                score: {} as ScoreCalculation,
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

        if (this.potentialRonners.length > 0) {
            return {
                success: false,
                error: 'Wait for Ron decisions',
                events: [],
            }
        }

        if (actionType === 'ankan' || actionType === 'kakan') {
            if (currentPlayerIndex !== playerIndex) {
                return { success: false, error: 'Not your turn', events: [] }
            }
        } else {
            const pending = this.pendingActions[playerId]
            if (!pending || !pending[actionType]) {
                return {
                    success: false,
                    error: 'Action not allowed',
                    events: [],
                }
            }
        }

        this.pendingActions = {}
        players.forEach((p) => (p.ippatsuEligible = false))
        this.anyCallDeclared = true

        let tilesToMove: string[] = []
        let meldTiles: Tile[] = []
        let stolenFromId: string | undefined = undefined

        if (actionType === 'ankan') {
            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const matches = player
                .getHand()
                .filter((t) => t.getRank() === rank && t.getSuit() === suit)
            if (matches.length < 4)
                return { success: false, error: 'Not enough tiles', events: [] }

            meldTiles = matches.slice(0, 4)
            tilesToMove = meldTiles.map((t) => t.toString())
            player.removeTiles(tilesToMove)
            player.addMeld({ type: 'ankan', tiles: meldTiles, opened: false })
            this.pendingDoraReveal = true
            this.rinshanFlag = true
        } else if (actionType === 'kakan') {
            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const tile = player
                .getHand()
                .find((t) => t.getRank() === rank && t.getSuit() === suit)
            if (!tile)
                return { success: false, error: 'Tile not in hand', events: [] }

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
                    events: [],
                }

            player.removeFromHand(tile.toString())
            ponMeld.type = 'kakan'
            ponMeld.tiles.push(tile)
            tilesToMove = [tile.toString()]
            meldTiles = ponMeld.tiles
            this.pendingDoraReveal = true
            this.rinshanFlag = true
        } else {
            if (!this.activeDiscard) {
                return {
                    success: false,
                    error: 'No active discard to call',
                    events: [],
                }
            }
            stolenFromId = this.activeDiscard.playerId
            const stolenTile = this.activeDiscard.tile

            const removedTiles = player.removeTiles(consumedTiles)
            if (removedTiles.length !== consumedTiles.length) {
                return {
                    success: false,
                    error: 'Invalid consumed tiles',
                    events: [],
                }
            }

            meldTiles = [...removedTiles, stolenTile]
            player.addMeld({
                type: actionType as MeldType,
                tiles: meldTiles,
                opened: true,
            })
            tilesToMove = consumedTiles
            this.activeDiscard = null
        }

        const events: ActionResult['events'] = [
            {
                eventName: 'update-meld',
                payload: {
                    playerId,
                    type: actionType,
                    tiles: meldTiles.map((t) => t.toString()),
                    stolenFrom: stolenFromId,
                    consumedTiles: tilesToMove,
                },
                to: 'all',
            },
        ]

        let needsReplacementTile = false
        if (
            actionType === 'ankan' ||
            actionType === 'kakan' ||
            actionType === 'kan'
        ) {
            needsReplacementTile = true
        }

        return {
            success: true,
            events,
            needsReplacementTile,
        }
    }

    public skipAction(
        playerId: string,
        players: Player[],
    ): { shouldProceed: boolean; actionsRemaining: boolean } {
        const pending = this.pendingActions[playerId]
        if (pending && pending.ron) {
            const player = players.find((p) => p.getId() === playerId)
            if (player) {
                player.isTemporaryFuriten = true
                if (player.isRiichi) player.isRiichiFuriten = true
            }
        }
        delete this.pendingActions[playerId]

        if (Object.keys(this.pendingActions).length === 0) {
            return { shouldProceed: true, actionsRemaining: false }
        }
        return { shouldProceed: false, actionsRemaining: true }
    }

    public verifyRon(
        player: Player,
        tileString: string,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHoutei: boolean
        },
        isKakan: boolean = false,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const winCtx: WinContext = {
            bakaze: context.bakaze,
            seatWind: context.seatWind,
            isTsumo: false,
            isIppatsu: player.ippatsuEligible,
            isChankan: isKakan,
            isHoutei: context.isHoutei,
            dora: context.dora,
            uradora: context.uradora,
        }
        return RuleManager.verifyWin(player, tileString, winCtx)
    }

    public verifyTsumo(
        player: Player,
        context: {
            bakaze: string
            seatWind: string
            dora: string[]
            uradora: string[]
            isHaitei: boolean
            rinshanFlag: boolean
        },
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const lastTile = player.getHand().slice(-1)[0]
        const winCtx: WinContext = {
            bakaze: context.bakaze,
            seatWind: context.seatWind,
            isTsumo: true,
            isRiichi: player.isRiichi,
            isIppatsu: player.ippatsuEligible,
            isRinshan: context.rinshanFlag,
            isHaitei: context.isHaitei,
            dora: context.dora,
            uradora: context.uradora,
        }
        return RuleManager.verifyWin(player, lastTile.toString(), winCtx)
    }
}
