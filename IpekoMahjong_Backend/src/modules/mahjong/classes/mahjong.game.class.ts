import { AbstractWall } from './AbstractWall'
import { Player } from './player.class'
import { Tile } from './tile.class'
import { PossibleActions, ScoreCalculation } from '../interfaces/mahjong.types'
import { SimpleAI } from '../ai/simple.ai'
import { GameObservation } from '../ai/mahjong-ai.interface'
import { RuleManager } from './rule.manager'
import { Logger } from '@nestjs/common'
import { AbstractRoundManager } from './managers/AbstractRoundManager'
import { TurnManager } from './managers/TurnManager'
import { AbstractActionManager } from './managers/AbstractActionManager'

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
 * AbstractMahjongGame 클래스는 한 판의 마작 게임에 대한 모든 규칙과 상태를 관리합니다.
 * 외부에서는 이 클래스의 메서드를 호출하여 게임을 진행시키고,
 * 메서드는 게임 상태 변화에 대한 요약본인 GameUpdate 객체를 반환합니다.
 */
export abstract class AbstractMahjongGame {
    protected readonly logger = new Logger(AbstractMahjongGame.name)
    protected wall: AbstractWall
    protected players: Player[]

    public roundManager: AbstractRoundManager
    public turnManager: TurnManager
    public actionManager: AbstractActionManager

    // Delegated State
    protected get currentTurnIndex() {
        return this.turnManager.currentTurnIndex
    }
    protected get turnCounter() {
        return this.turnManager.turnCounter
    }

    // Hanchan State delegated to RoundManager
    protected get bakaze() {
        return this.roundManager.bakaze
    }
    protected set bakaze(v) {
        this.roundManager.bakaze = v
    }

    protected get kyokuNum() {
        return this.roundManager.kyokuNum
    }
    protected set kyokuNum(v) {
        this.roundManager.kyokuNum = v
    }

    protected get honba() {
        return this.roundManager.honba
    }
    protected set honba(v) {
        this.roundManager.honba = v
    }

    protected get kyotaku() {
        return this.roundManager.kyotaku
    }
    protected set kyotaku(v) {
        this.roundManager.kyotaku = v
    }

    protected get oyaIndex() {
        return this.roundManager.oyaIndex
    }
    protected set oyaIndex(v) {
        this.roundManager.oyaIndex = v
    }

    protected get isSuddenDeath() {
        return this.roundManager.isSuddenDeath
    }
    protected set isSuddenDeath(v) {
        this.roundManager.isSuddenDeath = v
    }

    protected get initialPlayerOrder() {
        return this.roundManager.initialPlayerOrder
    }
    protected set initialPlayerOrder(v) {
        this.roundManager.initialPlayerOrder = v
    }

    // Action State delegated to ActionManager
    protected get anyCallDeclared() {
        return this.actionManager.anyCallDeclared
    }
    protected set anyCallDeclared(v: boolean) {
        this.actionManager.anyCallDeclared = v
    }

    protected get pendingDoraReveal() {
        return this.actionManager.pendingDoraReveal
    }
    protected set pendingDoraReveal(v: boolean) {
        this.actionManager.pendingDoraReveal = v
    }

    protected get rinshanFlag() {
        return this.actionManager.rinshanFlag
    }
    protected set rinshanFlag(v: boolean) {
        this.actionManager.rinshanFlag = v
    }

    protected get activeDiscard() {
        return this.actionManager.activeDiscard
    }
    protected set activeDiscard(v: { playerId: string; tile: Tile } | null) {
        this.actionManager.activeDiscard = v
    }

    constructor(
        playerInfos: { id: string; isAi: boolean }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
    ) {
        this.roundManager = roundManager
        this.turnManager = turnManager
        this.actionManager = actionManager
        this.wall = this.createWall()
        // Wall shuffling moved to startKyoku

        this.players = playerInfos.map((info) => this.createPlayer(info))
        // dealInitialHands removed from constructor
    }

    protected abstract createWall(): AbstractWall

    protected createPlayer(info: { id: string; isAi: boolean }): Player {
        const player = new Player(info.id, false, info.isAi) // isOya set later
        if (info.isAi) {
            player.ai = new SimpleAI()
        }
        return player
    }

    // #region Public Methods - Game Flow Control

    /** 게임을 시작하고 첫 국(Kyoku)의 정보를 반환합니다. */
    startGame(roomId: string): GameUpdate {
        this.logger.log('Starting game')

        // Randomize seating (Oya selection)
        // Fisher-Yates shuffle
        for (let i = this.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[this.players[i], this.players[j]] = [
                this.players[j],
                this.players[i],
            ]
        }

        // Initialize RoundManager with new seat order
        this.roundManager.initialize(this.players.map((p) => p.getId()))

        return this.startKyoku(roomId)
    }

    /** 새로운 국(Kyoku)을 시작하고 초기 상태(13장)를 반환합니다. */
    private startKyoku(roomId: string): GameUpdate {
        this.logger.log(
            `Starting Kyoku: ${this.bakaze}-${this.kyokuNum}, Honba: ${this.honba}`,
        )

        // 1. Reset Wall
        this.wall = this.createWall()
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
        this.turnManager.reset(this.oyaIndex)
        this.actionManager.reset()

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
                waits: RuleManager.getWaits(p),
            },
            to: 'player',
            playerId: p.getId(),
        }))

        // Kyuushu Kyuuhai is declared by client action.

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

    /** Kyuushu Kyuuhai Declaration */
    declareAbortiveDraw(
        roomId: string,
        playerId: string,
        type: 'kyuushu-kyuuhai',
    ): GameUpdate {
        const player = this.getPlayer(playerId)
        if (!player) return { roomId, isGameOver: false, events: [] }

        if (type === 'kyuushu-kyuuhai') {
            // Validate: First turn, no calls, 9+ terminals/honors
            if (this.anyCallDeclared || player.getDiscards().length > 0) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: {
                                message: 'Too late for Kyuushu Kyuuhai',
                            },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }

            const terminals = RuleManager.countTerminalsAndHonors(player)
            if (terminals < 9) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: 'Not enough terminals/honors' },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }

            return this.endKyoku(roomId, {
                reason: 'ryuukyoku',
                abortReason: 'kyuushu-kyuuhai',
            })
        }
        return { roomId, isGameOver: false, events: [] }
    }

    /** 현재 턴인 플레이어가 타일을 버립니다. */
    discardTile(
        roomId: string,
        playerId: string,
        tileString: string,
        isRiichi: boolean = false,
    ): GameUpdate {
        this.logger.log(`Discarding tile: ${tileString}, isRiichi: ${isRiichi}`)
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

        let doraRevealedEvent: GameUpdate['events'][0] | null = null
        if (this.pendingDoraReveal) {
            this.wall.revealDora()
            this.pendingDoraReveal = false
            const doraIndicators = this.getDora().map((t) => t.toString())
            const actualDora = RuleManager.getActualDoraList(doraIndicators)
            doraRevealedEvent = {
                eventName: 'dora-revealed',
                payload: {
                    dora: doraIndicators,
                    actualDora: actualDora,
                },
                to: 'all',
            }
        }

        // Handle Riichi Declaration
        if (isRiichi) {
            // Rule: Must have 4+ tiles in wall (Tenhou rule)
            if (this.wall.getRemainingTiles() < 4) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: {
                                message:
                                    'Cannot declare Riichi with less than 4 tiles remaining',
                            },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }

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

            if (player.points < 1000) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: {
                                message: 'Not enough points for Riichi',
                            },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
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

        // Reset Temporary Furiten on Discard
        player.isTemporaryFuriten = false

        if (isRiichi) {
            player.isRiichi = true
            player.ippatsuEligible = true
            player.riichiDeclarationTurn = this.turnCounter
            player.points -= 1000
            this.kyotaku += 1

            if (!this.anyCallDeclared && player.getDiscards().length === 1) {
                player.isDoubleRiichi = true
            }

            // Check Suucha Riichi (Four Riichi)
            if (this.players.every((p) => p.isRiichi)) {
                return this.endKyoku(roomId, {
                    reason: 'ryuukyoku',
                    abortReason: 'suucha-riichi',
                })
            }
        }

        // Update Furiten status
        // Furiten check: Waits in Discards (Standard) OR Temporary/Riichi Furiten
        const standardFuriten = RuleManager.calculateFuriten(player)
        player.isFuriten =
            standardFuriten ||
            player.isTemporaryFuriten ||
            player.isRiichiFuriten

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

        // Check Suufuu Renda (Four Same Winds)
        // Must be first turn (turnCounter < 4), no calls.
        if (!this.anyCallDeclared && this.turnCounter < 4) {
            const wind = tileString[1] === 'z' ? tileString : null

            if (this.turnCounter === 0) {
                // First player's discard
                if (wind) {
                    this.turnManager.firstTurnDiscards = {
                        wind: tileString,
                        count: 1,
                    }
                } else {
                    this.turnManager.firstTurnDiscards = null
                }
            } else {
                // Subsequent players
                if (
                    wind &&
                    this.turnManager.firstTurnDiscards &&
                    this.turnManager.firstTurnDiscards.wind === tileString
                ) {
                    this.turnManager.firstTurnDiscards.count++
                } else {
                    this.turnManager.firstTurnDiscards = null // Sequence broken
                }
            }

            if (this.turnManager.firstTurnDiscards?.count === 4) {
                return this.endKyoku(roomId, {
                    reason: 'ryuukyoku',
                    abortReason: 'suufuu-renda',
                })
            }
        }

        // 턴을 넘기기 전, 버린 패 정보를 생성
        const events: GameUpdate['events'] = [
            {
                eventName: 'update-discard',
                payload: {
                    playerId,
                    tile: tileString,
                    isFuriten: player.isFuriten,
                },
                to: 'all',
            },
            {
                eventName: 'update-waits',
                payload: {
                    waits: RuleManager.getWaits(player),
                },
                to: 'player',
                playerId: player.getId(),
            },
        ]

        if (doraRevealedEvent) {
            events.push(doraRevealedEvent)
        }

        if (isRiichi) {
            events.push({
                eventName: 'riichi-declared',
                payload: {
                    playerId,
                    score: player.points,
                    kyotaku: this.kyotaku,
                },
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
        const result = this.actionManager.verifyTsumo(
            player,
            this.wall,
            this.roundManager,
            this.turnManager,
            this.players,
        )

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
        return this.actionManager.getPossibleActions(
            discarderId,
            tileString,
            this.players,
            this.wall,
            this.roundManager,
        )
    }

    /** 치/펑/깡/론 행동을 수행합니다. */
    performAction(
        roomId: string,
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron' | 'ankan' | 'kakan',
        tileString: string,
        consumedTiles: string[] = [],
    ): GameUpdate {
        return this.actionManager.performAction(
            roomId,
            playerId,
            actionType,
            tileString,
            consumedTiles,
            this.players,
            this.wall,
            this.roundManager,
            this.turnManager,
        )
    }

    /** 다음 국으로 진행합니다. */
    nextRound(roomId: string): GameUpdate {
        return this.startKyoku(roomId)
    }

    protected endKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string // Target for Ron
            score?: ScoreCalculation
            abortReason?: string
        },
    ): GameUpdate {
        return this.roundManager.endRound(roomId, this.players, {
            reason: result.reason,
            winners:
                result.winners ||
                (result.reason === 'ron' && result.winnerId && result.score
                    ? [{ winnerId: result.winnerId, score: result.score }]
                    : undefined),
            winnerId: result.winnerId,
            loserId: result.loserId,
            score: result.score,
            abortReason: result.abortReason,
        })
    }

    /**
     * 플레이어가 가능한 행동을 포기(Skip)합니다.
     * 모든 플레이어가 포기하면 다음 턴으로 진행할 수 있는 상태인지 반환합니다.
     */
    skipAction(
        roomId: string,
        playerId: string,
    ): { shouldProceed: boolean; update?: GameUpdate } {
        const result = this.actionManager.skipAction(
            roomId,
            playerId,
            this.players,
            this.turnManager,
            this.roundManager,
            this.wall,
        )

        if (result.shouldProceed) {
            const update = this.drawTileForCurrentPlayer(roomId)
            return { shouldProceed: true, update }
        }

        return { shouldProceed: false }
    }

    // #endregion

    // #region Private Helper Methods

    /** 턴을 다음 플레이어로 넘깁니다. */
    private advanceTurn(): void {
        this.turnManager.advanceTurn(this.players.length)
    }

    /** 현재 턴의 플레이어를 위해 타일을 뽑고, AI라면 자동으로 버립니다. */
    protected drawTileForCurrentPlayer(roomId: string): GameUpdate {
        const currentPlayer = this.getCurrentTurnPlayer()
        const events = this.turnManager.drawTile(this.wall, currentPlayer)

        if (!events) {
            return this.endKyoku(roomId, { reason: 'ryuukyoku' })
        }

        // Inject canTsumo for human player
        if (!currentPlayer.isAi) {
            const drawEvent = events.find(
                (e) => e.eventName === 'new-tile-drawn',
            )
            if (drawEvent && drawEvent.payload) {
                const canTsumo = this.actionManager.verifyTsumo(
                    currentPlayer,
                    this.wall,
                    this.roundManager,
                    this.turnManager,
                    this.players,
                ).isAgari
                drawEvent.payload.canTsumo = canTsumo
            }
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

    getWall(): AbstractWall {
        return this.wall
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
        const result = this.actionManager.verifyTsumo(
            player,
            this.wall,
            this.roundManager,
            this.turnManager,
            this.players,
        )
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

export { MahjongGame } from './MahjongGame.4p'
export { SanmaMahjongGame } from './MahjongGame.Sanma'
