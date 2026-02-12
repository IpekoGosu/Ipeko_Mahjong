import { Player } from '../player.class'
import { AbstractWall } from '../AbstractWall'
import { Tile } from '../tile.class'
import {
    PossibleActions,
    GameUpdate,
    ScoreCalculation,
    MeldType,
    Suit,
} from '../../interfaces/mahjong.types'
import { RuleManager, WinContext } from '../rule.manager'
import { AbstractRoundManager } from './AbstractRoundManager'
import { TurnManager } from './TurnManager'
import { AbstractActionManager } from './AbstractActionManager'
import { Injectable, Scope } from '@nestjs/common'

@Injectable({ scope: Scope.TRANSIENT })
export class ActionManager4p extends AbstractActionManager {
    public getPossibleActions(
        discarderId: string,
        tileString: string,
        players: Player[],
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        isKakan: boolean = false,
    ): Record<string, PossibleActions> {
        const discarder = players.find((p) => p.getId() === discarderId)
        if (!discarder) return {}

        this.potentialRonners = []
        this.receivedRonCommands = []
        this.processedRonners = []

        const discarderIndex = players.indexOf(discarder)
        const actions: Record<string, PossibleActions> = {}

        players.forEach((player, index) => {
            if (player.getId() === discarderId) return

            const hand = player.getHand()
            const possibleActions: PossibleActions = {}
            let hasAction = false

            const result = this.verifyRon(
                player,
                tileString,
                wall,
                roundManager,
                players,
                isKakan,
            )
            if (result.isAgari) {
                possibleActions.ron = true
                hasAction = true
                this.potentialRonners.push(player.getId())
            }

            // Chankan (Ron on Kakan) is only Ron. No Pon/Chi/Kan allowed on Kakan.
            if (isKakan) {
                if (hasAction) actions[player.getId()] = possibleActions
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

            if ((discarderIndex + 1) % players.length === index) {
                const chiOptions = this.checkChi(player, tileString)
                if (chiOptions.length > 0) {
                    possibleActions.chi = true
                    possibleActions.chiOptions = chiOptions
                    hasAction = true
                }
            }

            if (hasAction) {
                actions[player.getId()] = possibleActions
            }
        })

        this.pendingActions = actions
        return actions
    }

    public performAction(
        roomId: string,
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[],
        players: Player[],
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
    ): GameUpdate {
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
                    return this.processRons(roomId, players, roundManager, wall)
                } else {
                    return { roomId, isGameOver: false, events: [] }
                }
            } else {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Invalid Ron attempt' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
        }

        if (this.potentialRonners.length > 0) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Wait for Ron decisions' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }

        // Validation for other actions
        if (actionType === 'ankan' || actionType === 'kakan') {
            if (turnManager.currentTurnIndex !== playerIndex) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Not your turn' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
        } else {
            // chi, pon, kan (daiminkan)
            const pending = this.pendingActions[playerId]
            if (!pending || !pending[actionType]) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Action not allowed' },
                            to: 'player',
                            playerId,
                        },
                    ],
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
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Not enough tiles' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }

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
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Tile not in hand' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }

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
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Corresponding Pon not found' },
                            to: 'player',
                            playerId,
                        },
                    ],
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
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'No active discard to call' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
            stolenFromId = this.activeDiscard.playerId
            const stolenTile = this.activeDiscard.tile
            
            const removedTiles = player.removeTiles(consumedTiles)
            if (removedTiles.length !== consumedTiles.length) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Invalid consumed tiles' },
                            to: 'player',
                            playerId,
                        },
                    ],
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

        turnManager.currentTurnIndex = playerIndex

        const events: GameUpdate['events'] = [
            {
                eventName: 'update-meld',
                payload: {
                    playerId,
                    type: actionType,
                    tiles: meldTiles.map((t) => t.toString()),
                    stolenFromId,
                    consumedTiles: tilesToMove,
                },
                to: 'all',
            },
        ]

        if (
            actionType === 'ankan' ||
            actionType === 'kakan' ||
            actionType === 'kan'
        ) {
            const replacementEvents = turnManager.drawTile(wall, player)
            if (!replacementEvents) {
                return roundManager.endRound(roomId, players, {
                    reason: 'ryuukyoku',
                })
            }
            events.push(...replacementEvents)
        }

        return { roomId, isGameOver: false, events }
    }

    public skipAction(
        roomId: string,
        playerId: string,
        players: Player[],
        turnManager: TurnManager,
        _roundManager: AbstractRoundManager,
        _wall: AbstractWall,
    ): { shouldProceed: boolean; update?: GameUpdate } {
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
            turnManager.advanceTurn(players.length)
            return { shouldProceed: true }
        }
        return { shouldProceed: false }
    }

    private processRons(
        roomId: string,
        players: Player[],
        roundManager: AbstractRoundManager,
        wall: AbstractWall,
    ): GameUpdate {
        const discarderId = this.activeDiscard?.playerId
        const discarder = players.find((p) => p.getId() === discarderId!)!
        const discarderIndex = players.indexOf(discarder)

        const sortedRons = this.receivedRonCommands.sort((a, b) => {
            const idxA = players.findIndex((p) => p.getId() === a.playerId)
            const idxB = players.findIndex((p) => p.getId() === b.playerId)
            const distA =
                (idxA - discarderIndex + players.length) % players.length
            const distB =
                (idxB - discarderIndex + players.length) % players.length
            return distA - distB
        })

        const winners: { winnerId: string; score: ScoreCalculation }[] = []
        for (const cmd of sortedRons) {
            const player = players.find((p) => p.getId() === cmd.playerId)!
            const result = this.verifyRon(
                player,
                cmd.tileString,
                wall,
                roundManager,
                players,
            )
            if (result.isAgari && result.score) {
                winners.push({ winnerId: player.getId(), score: result.score })
            }
        }

        return roundManager.endRound(roomId, players, {
            reason: 'ron',
            winners,
            loserId: discarderId,
        })
    }

    public verifyRon(
        player: Player,
        tileString: string,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        players: Player[],
        isKakan: boolean = false,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const context: WinContext = {
            bakaze: roundManager.bakaze,
            seatWind: roundManager.getSeatWind(players.indexOf(player)),
            isTsumo: false,
            isIppatsu: player.ippatsuEligible,
            isRinshan: false,
            isChankan: isKakan,
            isHaitei: false,
            isHoutei: wall.getRemainingTiles() === 0,
            dora: wall.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? wall.getUradora().map((t) => t.toString())
                : [],
        }

        return RuleManager.verifyWin(player, tileString, context)
    }

    public verifyTsumo(
        player: Player,
        wall: AbstractWall,
        roundManager: AbstractRoundManager,
        _turnManager: TurnManager,
        players: Player[],
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const lastTile = player.getHand().slice(-1)[0]
        const context: WinContext = {
            bakaze: roundManager.bakaze,
            seatWind: roundManager.getSeatWind(players.indexOf(player)),
            isTsumo: true,
            isRiichi: player.isRiichi,
            isDoubleRiichi: player.isDoubleRiichi,
            isIppatsu: player.ippatsuEligible,
            isRinshan: this.rinshanFlag,
            isChankan: false,
            isHaitei: wall.getRemainingTiles() === 0,
            isHoutei: false,
            dora: wall.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? wall.getUradora().map((t) => t.toString())
                : [],
        }

        return RuleManager.verifyWin(player, lastTile.toString(), context)
    }

    public checkChi(player: Player, tileString: string): string[][] {
        const suit = tileString[1]
        if (suit === 'z') return []

        const rank = parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
        const hand = player.getHand()

        const options: string[][] = []

        const getTilesOfRank = (r: number) =>
            hand.filter((t) => t.getSuit() === suit && t.getRank() === r)

        const checkGroup = (r1: number, r2: number) => {
            const tiles1 = getTilesOfRank(r1)
            const tiles2 = getTilesOfRank(r2)

            if (tiles1.length > 0 && tiles2.length > 0) {
                // If either rank is 5, we need to consider both normal 5 and red 5 (0)
                const t1Strings = Array.from(
                    new Set(tiles1.map((t) => t.toString())),
                )
                const t2Strings = Array.from(
                    new Set(tiles2.map((t) => t.toString())),
                )

                for (const s1 of t1Strings) {
                    for (const s2 of t2Strings) {
                        options.push([s1, s2])
                    }
                }
            }
        }

        if (rank >= 3) checkGroup(rank - 2, rank - 1)
        if (rank >= 2 && rank <= 8) checkGroup(rank - 1, rank + 1)
        if (rank <= 7) checkGroup(rank + 1, rank + 2)

        return options
    }
}
