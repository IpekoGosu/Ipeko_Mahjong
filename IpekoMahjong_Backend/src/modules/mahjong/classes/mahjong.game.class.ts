import { Wall } from './wall.class'
import { Player } from './player.class'
import { Tile } from './tile.class'
import {
    Meld,
    MeldType,
    PossibleActions,
    ScoreCalculation,
} from '../interfaces/mahjong.types'
import { SimpleAI } from '../ai/simple.ai'
import { GameObservation } from '../ai/mahjong-ai.interface'
import { RuleManager, WinContext } from './rule.manager'

/**
 * 게임 내에서 발생하는 모든 상태 변화를 담는 객체.
 * 게이트웨이는 이 객체를 받아 클라이언트에게 어떤 이벤트를 보낼지 결정합니다.
 */
export interface GameUpdate {
    roomId: string
    isGameOver: boolean
    reason?: 'tsumo' | 'ryuukyoku' | 'player-disconnected' | 'ron'
    events: {
        eventName: string
        payload: Record<string, unknown>
        to: 'all' | 'player'
        playerId?: string
    }[]
}

/**
 * MahjongGame 클래스는 한 판의 마작 게임에 대한 모든 규칙과 상태를 관리합니다.
 * 외부에서는 이 클래스의 메서드를 호출하여 게임을 진행시키고,
 * 메서드는 게임 상태 변화에 대한 요약본인 GameUpdate 객체를 반환합니다.
 */
export class MahjongGame {
    private wall: Wall
    private players: Player[]
    private currentTurnIndex: number
    private activeDiscard: { playerId: string; tile: Tile } | null = null
    private turnCounter: number = 0
    private anyCallDeclared: boolean = false
    private rinshanFlag: boolean = false
    private pendingActions: Record<string, PossibleActions> = {}

    // Hanchan State
    private bakaze: '1z' | '2z' | '3z' | '4z' = '1z' // 1z: East, 2z: South, 3z: West, 4z: North
    private kyokuNum: number = 1 // 1-4
    private honba: number = 0
    private kyotaku: number = 0
    private oyaIndex: number = 0

    constructor(playerInfos: { id: string; isAi: boolean }[]) {
        this.wall = new Wall()
        // Wall shuffling moved to startKyoku

        this.players = playerInfos.map((info) => {
            const player = new Player(info.id, false, info.isAi) // isOya set later
            if (info.isAi) {
                player.ai = new SimpleAI()
            }
            return player
        })
        // dealInitialHands removed from constructor
        this.currentTurnIndex = 0
    }

    // #region Public Methods - Game Flow Control

    /** 게임을 시작하고 첫 국(Kyoku)의 정보를 반환합니다. */
    startGame(roomId: string): GameUpdate {
        console.log('Starting game')

        // Randomize seating (Oya selection)
        // Fisher-Yates shuffle
        for (let i = this.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[this.players[i], this.players[j]] = [
                this.players[j],
                this.players[i],
            ]
        }

        // Initialize Game State
        this.bakaze = '1z'
        this.kyokuNum = 1
        this.honba = 0
        this.kyotaku = 0
        this.oyaIndex = 0 // Player at index 0 starts as Oya

        return this.startKyoku(roomId)
    }

    /** 새로운 국(Kyoku)을 시작하고 초기 상태(13장)를 반환합니다. */
    private startKyoku(roomId: string): GameUpdate {
        console.log(
            `Starting Kyoku: ${this.bakaze}-${this.kyokuNum}, Honba: ${this.honba}`,
        )

        // 1. Reset Wall
        this.wall = new Wall()
        this.wall.shuffle()
        this.wall.separateDeadWall()
        this.wall.revealDora()

        // 2. Reset Players (Hands, Discards, Melds, Flags)
        this.players.forEach((player) => {
            player.isOya =
                player.getId() === this.players[this.oyaIndex].getId()
            player.resetKyokuState()
        })

        // 3. Deal Tiles
        this.dealInitialHands()

        // 4. Set Turn to Oya
        this.currentTurnIndex = this.oyaIndex
        this.turnCounter = 0
        this.activeDiscard = null
        this.anyCallDeclared = false
        this.rinshanFlag = false
        this.pendingActions = {}

        // 5. Generate round-started events (Everyone has 13 tiles)
        const doraIndicators = this.getDora().map((t) => t.toString())
        const actualDora = RuleManager.getActualDoraList(doraIndicators)

        const startEvents: GameUpdate['events'] = this.players.map((p) => ({
            eventName: 'round-started',
            payload: {
                hand: p.getHand().map((t) => t.toString()),
                dora: doraIndicators,
                actualDora: actualDora,
                wallCount: this.wall.getRemainingTiles(),
                bakaze: this.bakaze,
                kyoku: this.kyokuNum,
                honba: this.honba,
                kyotaku: this.kyotaku,
                oyaId: this.players[this.oyaIndex].getId(),
                scores: this.players.map((pl) => ({
                    id: pl.getId(),
                    points: pl.points,
                    jikaze: this.getSeatWind(pl),
                })),
            },
            to: 'player',
            playerId: p.getId(),
        }))

        return {
            roomId,
            isGameOver: false,
            events: startEvents,
        }
    }

    /** 첫 턴(오야의 첫 쯔모)을 시작합니다. */
    public startFirstTurn(roomId: string): GameUpdate {
        return this.drawTileForCurrentPlayer(roomId)
    }

    /** 현재 턴인 플레이어가 타일을 버립니다. */
    discardTile(
        roomId: string,
        playerId: string,
        tileString: string,
        isRiichi: boolean = false,
    ): GameUpdate {
        console.log(`Discarding tile: ${tileString}, isRiichi: ${isRiichi}`)
        const player = this.getPlayer(playerId)
        const currentPlayer = this.getCurrentTurnPlayer()

        if (!player || player !== currentPlayer) {
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

        // Handle Riichi Declaration
        if (isRiichi) {
            const validRiichiDiscards = RuleManager.getRiichiDiscards(player)
            if (
                player.isRiichi ||
                !player.isHandClosed() ||
                !validRiichiDiscards.includes(tileString)
            ) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Invalid Riichi declaration' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
            player.isRiichi = true
            player.ippatsuEligible = true
            player.riichiDeclarationTurn = this.turnCounter

            if (!this.anyCallDeclared && player.getDiscards().length === 0) {
                player.isDoubleRiichi = true
            }
        }

        // Enforce Tsumogiri during Riichi (cannot discard other tiles)
        if (player.isRiichi && !isRiichi) {
            // Already in Riichi (not the declaration discard)
            if (
                player.lastDrawnTile &&
                player.lastDrawnTile.toString() !== tileString
            ) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: {
                                message:
                                    'Must discard drawn tile during Riichi',
                            },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
        }

        const discardedTile = player.discard(tileString)
        if (!discardedTile) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Invalid tile to discard' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }

        // Update Furiten status
        player.isFuriten = RuleManager.calculateFuriten(player)

        // Handle Ippatsu Expiration
        if (player.isRiichi && player.ippatsuEligible) {
            // If this is NOT the declaration turn, Ippatsu expires.
            if (player.riichiDeclarationTurn !== this.turnCounter) {
                player.ippatsuEligible = false
            }
        }

        // Clear Rinshan flag after discard
        this.rinshanFlag = false

        this.activeDiscard = { playerId, tile: discardedTile }

        // 턴을 넘기기 전, 버린 패 정보를 생성
        const events: GameUpdate['events'] = [
            {
                eventName: 'update-discard',
                payload: {
                    playerId,
                    tile: tileString,
                    isFuriten: player.isFuriten,
                    waits: RuleManager.getWaits(player),
                },
                to: 'all',
            },
        ]

        if (isRiichi) {
            events.push({
                eventName: 'riichi-declared',
                payload: { playerId },
                to: 'all',
            })
        }

        // 버린 패 정보만 반환 (턴 넘기기는 별도로 수행)
        return {
            roomId,
            isGameOver: false,
            events: events,
        }
    }

    /** 턴을 넘기고 다음 플레이어의 턴을 진행합니다. */
    proceedToNextTurn(roomId: string): GameUpdate {
        this.advanceTurn()
        return this.drawTileForCurrentPlayer(roomId)
    }

    /** 현재 턴인 플레이어가 쓰모를 선언합니다. */
    declareTsumo(roomId: string, playerId: string): GameUpdate {
        const player = this.getPlayer(playerId)
        if (!player) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Player not found' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }
        const result = this.verifyTsumo(player)

        if (result.isAgari) {
            return this.endKyoku(roomId, {
                reason: 'tsumo',
                winnerId: playerId,
                score: result.score!,
            })
        } else {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Invalid Tsumo' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }
    }

    /**
     * 타패된 패에 대해 다른 플레이어들이 취할 수 있는 행동을 계산합니다.
     */
    getPossibleActions(
        discarderId: string,
        tileString: string,
    ): Record<string, PossibleActions> {
        const discarder = this.getPlayer(discarderId)
        if (!discarder) return {}

        const discarderIndex = this.players.indexOf(discarder)
        const actions: Record<string, PossibleActions> = {}

        this.players.forEach((player, index) => {
            if (player.getId() === discarderId) return

            const hand = player.getHand()
            const possibleActions: PossibleActions = {}
            let hasAction = false

            // 1. Check Ron
            try {
                const context: WinContext = {
                    bakaze: this.bakaze,
                    dora: this.getDora().map((t) => t.toString()),
                    isTsumo: false,
                    winningTile: tileString,
                    isRiichi: player.isRiichi,
                    isDoubleRiichi: player.isDoubleRiichi,
                    isIppatsu: player.ippatsuEligible,
                    isHoutei: this.wall.getRemainingTiles() === 0,
                    isRinshan: false,
                    isChankan: false,
                    isTenhou: false,
                    isChiihou: false,
                }

                const ronScore = RuleManager.calculateScore(player, context)
                if (ronScore && !player.isFuriten) {
                    possibleActions.ron = true
                    hasAction = true
                }
            } catch (e) {
                console.error(
                    `Error checking Ron for player ${player.getId()}:`,
                    e,
                )
            }

            // Players in Riichi cannot declare Chi, Pon, or Daiminkan
            if (player.isRiichi) {
                if (hasAction) {
                    actions[player.getId()] = possibleActions
                }
                return
            }

            // 2. Check Pon/Kan
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

            // 3. Check Chi (Only next player)
            if ((discarderIndex + 1) % this.players.length === index) {
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

    /** 치/펑/깡/론 행동을 수행합니다. */
    performAction(
        roomId: string,
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[] = [], // Hand tiles used for the call
    ): GameUpdate {
        const player = this.getPlayer(playerId)
        if (!player) throw new Error('Player not found')

        // Action taken, clear pending actions
        this.pendingActions = {}

        if (actionType === 'ron') {
            const result = this.verifyRon(player, tileString)
            if (result.isAgari) {
                // Find loser (discarder)
                // We don't track activeDiscard logic here perfectly if multiple Rons, but for single Ron:
                const loserId = this.activeDiscard?.playerId
                return this.endKyoku(roomId, {
                    reason: 'ron',
                    winnerId: playerId,
                    loserId,
                    score: result.score!,
                })
            } else {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Invalid Ron' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
        }

        // Clear Ippatsu for all players
        this.players.forEach((p) => (p.ippatsuEligible = false))
        this.anyCallDeclared = true

        // 1. Prepare tiles to remove from hand
        let tilesToMove: string[] = []
        let meldTiles: Tile[] = []
        let stolenFromId: string | undefined = undefined

        if (actionType === 'ankan') {
            // Ankan: Remove 4 tiles from hand. Logic assumes tileString is one of them.
            // Usually consumedTiles should be sent or we infer.
            // Inference: All 4 match tileString.
            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const matches = player
                .getHand()
                .filter((t) => t.getRank() === rank && t.getSuit() === suit)

            if (matches.length < 4) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Not enough tiles for Ankan' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
            tilesToMove = matches.slice(0, 4).map((t) => t.toString())

            const removedTiles = player.removeTiles(tilesToMove)
            meldTiles = [...removedTiles]

            player.addMeld({
                type: 'kan',
                tiles: meldTiles,
                opened: false, // Closed Kan
            })
        } else if (actionType === 'kakan') {
            // Kakan: Remove 1 tile from hand. Add to existing Pon.
            const rank =
                parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
            const suit = tileString[1]
            const matches = player
                .getHand()
                .filter((t) => t.getRank() === rank && t.getSuit() === suit)

            if (matches.length < 1) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Tile for Kakan not found' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
            tilesToMove = [matches[0].toString()]

            const removedTiles = player.removeTiles(tilesToMove)
            const addedTile = removedTiles[0]

            const updatedMeld = player.upgradePonToKan(tileString, addedTile)
            if (!updatedMeld) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'No matching Pon for Kakan' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
            meldTiles = updatedMeld.tiles // Complete set for display
            stolenFromId = undefined // Kakan is self-action on own meld (effectively)
        } else {
            // Standard Chi/Pon/Kan (Daiminkan)
            tilesToMove = [...consumedTiles]

            // Auto-detect if consumedTiles is empty for Chi/Pon/Kan (Stolen from discard)
            if (
                tilesToMove.length === 0 &&
                (actionType === 'chi' ||
                    actionType === 'pon' ||
                    actionType === 'kan')
            ) {
                const rank =
                    parseInt(tileString[0]) === 0 ? 5 : parseInt(tileString[0])
                const suit = tileString[1]
                const isSelfAction = !this.activeDiscard

                if (actionType === 'pon') {
                    const matches = player
                        .getHand()
                        .filter(
                            (t) => t.getRank() === rank && t.getSuit() === suit,
                        )
                    if (matches.length >= 2)
                        tilesToMove = matches
                            .slice(0, 2)
                            .map((t) => t.toString())
                } else if (actionType === 'kan') {
                    const matches = player
                        .getHand()
                        .filter(
                            (t) => t.getRank() === rank && t.getSuit() === suit,
                        )
                    const needed = isSelfAction ? 4 : 3
                    if (matches.length >= needed)
                        tilesToMove = matches
                            .slice(0, needed)
                            .map((t) => t.toString())
                } else if (actionType === 'chi') {
                    // Chi requires specific sequences. This is complex to auto-detect without knowing which option was picked.
                    // However, Chi from AI is not yet implemented, and human FE always sends consumedTiles.
                    // For now, if empty, we might have an issue.
                }
            }

            const removedTiles = player.removeTiles(tilesToMove)
            meldTiles = [...removedTiles]

            // 2. Handle Tile Acquisition (Daiminkan/Chi/Pon)
            stolenFromId = this.activeDiscard?.playerId
            if (
                this.activeDiscard &&
                this.activeDiscard.tile.toString() === tileString
            ) {
                // Stealing a discard (Daiminkan, Chi, Pon)
                const discarder = this.getPlayer(this.activeDiscard.playerId)!
                const takenTile = discarder.removeDiscard(tileString)
                if (takenTile) {
                    meldTiles.push(takenTile)
                } else {
                    meldTiles.push(this.activeDiscard.tile) // Should not happen
                }
                // Reset active discard since it's consumed
                this.activeDiscard = null
                // Update turn to this player
                this.currentTurnIndex = this.players.indexOf(player)
            }

            const meld: Meld = {
                type: actionType as MeldType,
                tiles: meldTiles,
                opened: !!stolenFromId,
            }
            player.addMeld(meld)
        }

        // Update Furiten status
        player.isFuriten = RuleManager.calculateFuriten(player)

        const doraIndicators = this.getDora().map((t) => t.toString())
        const actualDora = RuleManager.getActualDoraList(doraIndicators)

        const events: GameUpdate['events'] = [
            {
                eventName: 'update-meld',
                payload: {
                    playerId,
                    type: actionType,
                    tiles: meldTiles.map((t) => t.toString()),
                    stolenFrom: stolenFromId,
                    isFuriten: player.isFuriten,
                    waits: RuleManager.getWaits(player),
                },
                to: 'all',
            },
            {
                eventName: 'turn-changed',
                payload: {
                    playerId,
                    wallCount: this.wall.getRemainingTiles(),
                    deadWallCount: this.wall.getRemainingDeadWall(),
                    dora: doraIndicators,
                    actualDora: actualDora,
                    isFuriten: player.isFuriten,
                },
                to: 'all',
            },
        ]

        // 3. Handle Kan Specifics (Rinshan Draw)
        if (
            actionType === 'kan' ||
            actionType === 'ankan' ||
            actionType === 'kakan'
        ) {
            this.rinshanFlag = true
            this.wall.revealDora() // Reveal new Dora indicator
            const replacementTile = this.wall.drawReplacement()
            if (replacementTile) {
                player.draw(replacementTile)

                // Recalculate Ankan/Kakan options for the new state
                const ankanList = RuleManager.getAnkanOptions(player)
                const kakanList = RuleManager.getKakanOptions(player)

                const newDoraIndicators = this.getDora().map((t) =>
                    t.toString(),
                )
                const newActualDora =
                    RuleManager.getActualDoraList(newDoraIndicators)

                events.push({
                    eventName: 'new-tile-drawn',
                    payload: {
                        tile: replacementTile.toString(),
                        riichiDiscards: RuleManager.getRiichiDiscards(player),
                        canTsumo: this.checkCanTsumo(player.getId()),
                        waits: RuleManager.getWaits(player),
                        ankanList,
                        kakanList,
                        dora: newDoraIndicators,
                        actualDora: newActualDora,
                    },
                    to: 'player',
                    playerId: player.getId(),
                })
            }
        } else {
            this.rinshanFlag = false
        }

        return {
            roomId,
            isGameOver: false,
            events,
        }
    }

    /** 다음 국으로 진행합니다. */
    nextRound(roomId: string): GameUpdate {
        return this.startKyoku(roomId)
    }

    private endKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winnerId?: string
            loserId?: string // Target for Ron
            score?: ScoreCalculation
        },
    ): GameUpdate {
        const startScores: Record<string, number> = {}
        this.players.forEach((p) => (startScores[p.getId()] = p.points))

        const events: GameUpdate['events'] = []
        let nextOyaIndex = this.oyaIndex
        let nextKyokuNum = this.kyokuNum
        let nextBakaze = this.bakaze
        let nextHonba = this.honba
        let nextKyotaku = this.kyotaku
        let renchan = false

        // 1. Calculate Score & Honba/Kyotaku Logic
        if (
            result.reason === 'ron' &&
            result.winnerId &&
            result.loserId &&
            result.score
        ) {
            const winner = this.getPlayer(result.winnerId)!
            const loser = this.getPlayer(result.loserId)!

            // Basic Score Update (Winner gets score + sticks + honba bonus)
            // Honba bonus: 300 pts per honba
            const honbaPoints = this.honba * 300
            const totalPoints =
                result.score.ten + honbaPoints + this.kyotaku * 1000

            winner.points += totalPoints
            loser.points -= result.score.ten + honbaPoints

            // Reset Kyotaku as it's claimed
            nextKyotaku = 0

            // Renchan check
            if (winner.isOya) {
                renchan = true
                nextHonba++
            } else {
                nextHonba = 0
            }

            events.push({
                eventName: 'score-update',
                payload: {
                    winnerId: winner.getId(),
                    loserId: loser.getId(),
                    score: result.score.ten,
                    totalPoints: totalPoints,
                    reason: 'ron',
                },
                to: 'all',
            })
        } else if (
            result.reason === 'tsumo' &&
            result.winnerId &&
            result.score
        ) {
            const winner = this.getPlayer(result.winnerId)!
            const honbaPoints = this.honba * 300 // Total honba payment (divided among losers)
            const totalPoints =
                result.score.ten + honbaPoints + this.kyotaku * 1000

            winner.points += totalPoints
            nextKyotaku = 0

            const otherPlayers = this.players.filter((p) => p !== winner)

            if (winner.isOya) {
                // Oya wins: All Ko pay `result.score.oya[0]` + honba bonus
                const paymentPerPlayer = result.score.oya[0] + 100 * this.honba
                otherPlayers.forEach((p) => (p.points -= paymentPerPlayer))
                renchan = true
                nextHonba++
            } else {
                // Ko wins: Oya pays `result.score.oya[0]`, other Ko pay `result.score.ko[0]`
                const oya = this.players.find((p) => p.isOya)!
                const kos = otherPlayers.filter((p) => !p.isOya)

                const oyaPayment = result.score.oya[0] + 100 * this.honba
                const koPayment = result.score.ko[0] + 100 * this.honba

                oya.points -= oyaPayment
                kos.forEach((p) => (p.points -= koPayment))

                nextHonba = 0
            }

            events.push({
                eventName: 'score-update',
                payload: {
                    winnerId: winner.getId(),
                    score: result.score.ten,
                    totalPoints: totalPoints,
                    reason: 'tsumo',
                },
                to: 'all',
            })
        } else if (result.reason === 'ryuukyoku') {
            // Check Tenpai
            const tenpaiList = this.players.filter(
                (p) => p.getHand().length <= 13 && RuleManager.isTenpai(p),
            )
            const notenList = this.players.filter(
                (p) => !tenpaiList.includes(p),
            )

            if (tenpaiList.length > 0 && notenList.length > 0) {
                const flow = 3000
                const payReceive = flow / tenpaiList.length
                const payGive = flow / notenList.length

                tenpaiList.forEach((p) => (p.points += payReceive))
                notenList.forEach((p) => (p.points -= payGive))
            }

            // Renchan logic
            const oya = this.players[this.oyaIndex]
            if (tenpaiList.includes(oya)) {
                renchan = true
                nextHonba++
            } else {
                nextHonba++ // Honba increases even if Oya passes in Ryuukyoku? Yes in Tenhou.
                // Wait, if Oya is noten, Oya passes.
            }
        }

        // 2. Progression Logic
        if (!renchan) {
            nextOyaIndex = (this.oyaIndex + 1) % 4
            nextKyokuNum++
            if (nextKyokuNum > 4) {
                nextKyokuNum = 1
                const windOrder: ('1z' | '2z' | '3z' | '4z')[] = [
                    '1z',
                    '2z',
                    '3z',
                    '4z',
                ]
                const currentIndex = windOrder.indexOf(this.bakaze)
                nextBakaze = windOrder[(currentIndex + 1) % windOrder.length]
            }
        }

        // Check for Game Over
        const maxPoints = Math.max(...this.players.map((p) => p.points))
        let isGameOver = false

        if (this.players.some((p) => p.points < 0)) {
            // Dobon (Bankruptcy)
            isGameOver = true
        } else if (this.bakaze === '1z') {
            // East round: game never ends unless bankruptcy
            isGameOver = false
        } else if (this.bakaze === '2z' && this.kyokuNum < 4) {
            // South 1-3: game never ends unless bankruptcy
            isGameOver = false
        } else {
            // South 4 or later (Encho-sen)
            if (maxPoints >= 30000) {
                // If it's S4 and Oya renchans, they must be in top to end (Agari-yame)
                // For simplicity, we'll follow: if anyone is >= 30000 at the end of S4+, game ends.
                isGameOver = true
            }
        }

        // Apply State
        this.honba = nextHonba
        this.kyotaku = nextKyotaku
        this.oyaIndex = nextOyaIndex
        this.kyokuNum = nextKyokuNum
        this.bakaze = nextBakaze

        // Calculate Deltas
        const scoreDeltas: Record<string, number> = {}
        this.players.forEach((p) => {
            scoreDeltas[p.getId()] = p.points - startScores[p.getId()]
        })

        // 3. Return Update
        events.push({
            eventName: 'round-ended',
            payload: {
                reason: result.reason,
                scores: this.players.map((p) => ({
                    id: p.getId(),
                    points: p.points,
                })),
                scoreDeltas,
                winScore: result.score,
                winnerId: result.winnerId,
                loserId: result.loserId,
                nextState: {
                    bakaze: this.bakaze,
                    kyoku: this.kyokuNum,
                    honba: this.honba,
                    isGameOver: isGameOver,
                },
            },
            to: 'all',
        })

        if (isGameOver) {
            return {
                roomId,
                isGameOver: true,
                events: [
                    ...events,
                    {
                        eventName: 'game-over',
                        payload: { scores: this.players.map((p) => p.points) },
                        to: 'all',
                    },
                ],
            }
        }

        return {
            roomId,
            isGameOver: false,
            events,
        }
    }

    /**
     * 플레이어가 가능한 행동을 포기(Skip)합니다.
     * 모든 플레이어가 포기하면 다음 턴으로 진행할 수 있는 상태인지 반환합니다.
     */
    skipAction(
        roomId: string,
        playerId: string,
    ): { shouldProceed: boolean; update?: GameUpdate } {
        delete this.pendingActions[playerId]

        if (Object.keys(this.pendingActions).length === 0) {
            // No more actions pending, proceed to next turn
            const update = this.proceedToNextTurn(roomId)
            return { shouldProceed: true, update }
        }

        return { shouldProceed: false }
    }

    // #endregion

    // #region Private Helper Methods

    /** 턴을 다음 플레이어로 넘깁니다. */
    private advanceTurn(): void {
        console.log('Advancing turn')
        console.log(`Current turn index: ${this.currentTurnIndex}`)
        this.currentTurnIndex =
            (this.currentTurnIndex + 1) % this.players.length
        this.turnCounter++
    }

    /** 현재 턴의 플레이어를 위해 타일을 뽑고, AI라면 자동으로 버립니다. */
    private drawTileForCurrentPlayer(roomId: string): GameUpdate {
        const currentPlayer = this.getCurrentTurnPlayer()
        const tile = this.wall.draw()

        if (!tile) {
            // 유국 (Ryuukyoku)
            return this.endKyoku(roomId, { reason: 'ryuukyoku' })
        }

        currentPlayer.draw(tile)
        currentPlayer.isFuriten = RuleManager.calculateFuriten(currentPlayer)

        const ankanList = RuleManager.getAnkanOptions(currentPlayer)
        const kakanList = RuleManager.getKakanOptions(currentPlayer)

        const doraIndicators = this.getDora().map((t) => t.toString())
        const actualDora = RuleManager.getActualDoraList(doraIndicators)

        // 모든 플레이어에게 턴 변경 알림
        const events: GameUpdate['events'] = [
            {
                eventName: 'turn-changed',
                payload: {
                    playerId: currentPlayer.getId(),
                    wallCount: this.wall.getRemainingTiles(),
                    deadWallCount: this.wall.getRemainingDeadWall(),
                    dora: doraIndicators,
                    actualDora: actualDora,
                    isFuriten: currentPlayer.isFuriten,
                },
                to: 'all',
            },
        ]

        // 사람 플레이어에게만 뽑은 타일 정보 전송
        if (!currentPlayer.isAi) {
            events.push({
                eventName: 'new-tile-drawn',
                payload: {
                    tile: tile.toString(),
                    riichiDiscards:
                        RuleManager.getRiichiDiscards(currentPlayer),
                    canTsumo: this.checkCanTsumo(currentPlayer.getId()),
                    isFuriten: currentPlayer.isFuriten,
                    waits: RuleManager.getWaits(currentPlayer),
                    ankanList,
                    kakanList,
                },
                to: 'player',
                playerId: currentPlayer.getId(),
            })
        }

        return {
            roomId,
            isGameOver: false,
            events,
        }
    }

    /**
     * AI를 위한 게임 관측 정보를 생성합니다.
     */
    public createGameObservation(player: Player): GameObservation {
        const myIndex = this.players.indexOf(player)
        return {
            myHand: player.getHand().map((t) => t.toString()),
            myLastDraw: player.lastDrawnTile?.toString() || null,
            myIndex: myIndex,
            players: this.players.map((p, idx) => ({
                id: p.getId(),
                handCount: p.getHand().length,
                discards: p.getDiscards().map((t) => t.toString()),
                melds: p.getMelds().map((m) => ({
                    type: m.type,
                    tiles: m.tiles.map((t) => t.toString()),
                    opened: m.opened,
                })),
                isRiichi: p.isRiichi,
                isFuriten: p.isFuriten,
                isIppatsu: p.ippatsuEligible,
                wind: idx + 1, // 1: East, 2: South, 3: West, 4: North
                points: p.points,
            })),
            doraIndicators: this.getDora().map((t) => t.toString()),
            wallCount: this.wall.getRemainingTiles(),
            deadWallCount: this.wall.getRemainingDeadWall(),
            bakaze: 1, // Assuming East Round for now
            turnCounter: this.turnCounter,
        }
    }

    /** 플레이어의 패가 쓰모 조건에 맞는지 검증합니다. */
    private verifyTsumo(player: Player): {
        isAgari: boolean
        score: ScoreCalculation | null
    } {
        if (!player || player.lastDrawnTile === null) {
            return { isAgari: false, score: null }
        }

        const isTenhou =
            player.isOya && this.turnCounter === 0 && !this.anyCallDeclared
        const isChiihou =
            !player.isOya &&
            player.getDiscards().length === 0 &&
            !this.anyCallDeclared

        const context: WinContext = {
            bakaze: this.bakaze, // Default East Round
            dora: this.getDora().map((t) => t.toString()),
            isTsumo: true,
            isRiichi: player.isRiichi,
            isDoubleRiichi: player.isDoubleRiichi,
            isIppatsu: player.ippatsuEligible,
            isHaitei: this.wall.getRemainingTiles() === 0 && !this.rinshanFlag, // Haitei not valid on Rinshan
            isRinshan: this.rinshanFlag,
            isChankan: false, // Tsumo cannot be Chankan
            isTenhou,
            isChiihou,
        }

        const score = RuleManager.calculateScore(player, context)
        return { isAgari: !!score, score }
    }

    /** 플레이어의 패가 론 조건에 맞는지 검증합니다. */
    private verifyRon(
        player: Player,
        winningTile: string,
    ): { isAgari: boolean; score: ScoreCalculation | null } {
        if (player.isFuriten) {
            return { isAgari: false, score: null }
        }

        const context: WinContext = {
            bakaze: this.bakaze,
            dora: this.getDora().map((t) => t.toString()),
            isTsumo: false,
            winningTile: winningTile,
            isRiichi: player.isRiichi,
            isDoubleRiichi: player.isDoubleRiichi,
            isIppatsu: player.ippatsuEligible,
            isHoutei: this.wall.getRemainingTiles() === 0,
            isRinshan: false, // Ron cannot be Rinshan
            isChankan: false, // TODO: Implement Chankan logic
            isTenhou: false,
            isChiihou: false,
        }

        const score = RuleManager.calculateScore(player, context)
        return { isAgari: !!score, score }
    }

    private dealInitialHands(): void {
        for (let i = 0; i < 13; i++) {
            for (const player of this.players) {
                const tile = this.wall.draw()
                if (tile) {
                    player.draw(tile)
                }
            }
        }
    }

    public checkChi(player: Player, tileString: string): string[][] {
        let rank = parseInt(tileString.slice(0, -1))
        const suit = tileString.slice(-1)
        if (suit === 'z') return []

        // If discarded tile is Red Five (0), treat it as 5 for sequence checking
        if (rank === 0) rank = 5

        const hand = player.getHand()
        const options: string[][] = []

        // Helper to find all tiles in hand matching a specific rank and suit
        const findTiles = (r: number): string[] => {
            return hand
                .filter((t) => t.getSuit() === suit && t.getRank() === r)
                .map((t) => t.toString())
        }

        // Check -2, -1 (e.g. 3,4 for 5)
        const minus2 = findTiles(rank - 2)
        const minus1 = findTiles(rank - 1)
        if (minus2.length > 0 && minus1.length > 0) {
            for (const t2 of minus2) {
                for (const t1 of minus1) {
                    options.push([t2, t1])
                }
            }
        }

        // Check -1, +1 (e.g. 4,6 for 5)
        const plus1 = findTiles(rank + 1)
        if (minus1.length > 0 && plus1.length > 0) {
            for (const t1 of minus1) {
                for (const t2 of plus1) {
                    options.push([t1, t2])
                }
            }
        }

        // Check +1, +2 (e.g. 6,7 for 5)
        const plus2 = findTiles(rank + 2)
        if (plus1.length > 0 && plus2.length > 0) {
            for (const t1 of plus1) {
                for (const t2 of plus2) {
                    options.push([t1, t2])
                }
            }
        }

        // Deduplicate options
        const uniqueOptions: string[][] = []
        const seen = new Set<string>()

        for (const option of options) {
            // Sort to ensure [3m, 4m] is same as [4m, 3m] (though current logic preserves order)
            // Current logic: minus2, minus1 -> strictly ordered. minus1, plus1 -> strictly ordered.
            // But checking duplicates is about the exact set of tiles.
            // Since we push in specific order, JSON.stringify is sufficient for identical pairs.
            const key = JSON.stringify(option)
            if (!seen.has(key)) {
                seen.add(key)
                uniqueOptions.push(option)
            }
        }

        return uniqueOptions
    }

    public getSeatWind(player: Player): string {
        const playerIndex = this.players.indexOf(player)
        // Winds relative to Oya
        // East=1z, South=2z, West=3z, North=4z
        const relativePos = (playerIndex - this.oyaIndex + 4) % 4
        return `${relativePos + 1}z`
    }

    // #endregion

    // #region Public Getters

    getPlayers(): Player[] {
        return this.players
    }

    getPlayer(id: string): Player | undefined {
        return this.players.find((p) => p.getId() === id)
    }

    getCurrentTurnPlayer(): Player {
        return this.players[this.currentTurnIndex]
    }

    getDora(): Tile[] {
        return this.wall.getDora()
    }

    getWallCount(): number {
        return this.wall.getRemainingTiles()
    }

    getDeadWallCount(): number {
        return this.wall.getRemainingDeadWall()
    }

    checkCanTsumo(playerId: string): boolean {
        const player = this.getPlayer(playerId)
        if (!player) return false
        const result = this.verifyTsumo(player)
        return result.isAgari
    }

    getBakaze(): string {
        return this.bakaze
    }

    getKyokuNum(): number {
        return this.kyokuNum
    }

    getHonba(): number {
        return this.honba
    }

    getKyotaku(): number {
        return this.kyotaku
    }

    // #endregion
}
