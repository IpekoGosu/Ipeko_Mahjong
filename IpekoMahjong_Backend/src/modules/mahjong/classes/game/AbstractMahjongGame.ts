import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import {
    PossibleActions,
    ScoreCalculation,
    GameUpdate,
    GameState,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Logger } from '@nestjs/common'
import { AbstractRoundManager } from '@src/modules/mahjong/classes/managers/AbstractRoundManager'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { AbstractActionManager } from '@src/modules/mahjong/classes/managers/AbstractActionManager'
import { AbstractRuleEffectManager } from '@src/modules/mahjong/classes/managers/AbstractRuleEffectManager'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { GameObservation } from '@src/modules/mahjong/interfaces/mahjong-ai.interface'
import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import { GameRulesConfig } from '@src/modules/mahjong/interfaces/game-rules.config'

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
    public ruleEffectManager: AbstractRuleEffectManager
    public ruleManager: RuleManager
    public gameRulesConfig: GameRulesConfig

    /** Track Pao (responsibility payment) per player. map[playerId][yakumanName] = responsiblePlayerId */
    protected paoStatus: Map<string, Map<string, string>> = new Map()

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

    protected get isSanma(): boolean {
        return this.players.length === 3
    }

    constructor(
        playerInfos: { id: string; isAi: boolean; ai?: MahjongAI }[],
        roundManager: AbstractRoundManager,
        turnManager: TurnManager,
        actionManager: AbstractActionManager,
        ruleEffectManager: AbstractRuleEffectManager,
        ruleManager: RuleManager,
        gameRulesConfig: GameRulesConfig,
    ) {
        this.roundManager = roundManager
        this.turnManager = turnManager
        this.actionManager = actionManager
        this.ruleEffectManager = ruleEffectManager
        this.ruleManager = ruleManager
        this.gameRulesConfig = gameRulesConfig
        this.wall = this.createWall()
        // Wall shuffling moved to startKyoku

        this.players = playerInfos.map((info) => this.createPlayer(info))
        this.players.forEach(
            (p) => (p.points = this.gameRulesConfig.startPoints),
        )
    }

    protected abstract createWall(): AbstractWall

    protected createPlayer(info: {
        id: string
        isAi: boolean
        ai?: MahjongAI
    }): Player {
        const player = new Player(info.id, false, info.isAi) // isOya set later
        if (info.isAi) {
            if (!info.ai) throw new CommonError(ERROR_STATUS.AI_NOT_PROVIDED)
            player.ai = info.ai
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
        this.roundManager.initialize(this.players.map((p) => p.id))

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
            player.isOya = player.id === this.players[this.oyaIndex].id
            player.resetKyokuState()
        })
        this.paoStatus.clear()

        // 3. Deal Tiles
        this.dealInitialHands()

        // 4. Set Turn to Oya
        this.turnManager.reset(this.oyaIndex)
        this.actionManager.reset()

        // 5. Generate round-started events (Everyone has 13 tiles)
        const doraIndicators = this.getDora().map((t) => t.toString())
        const actualDora = this.ruleManager.getActualDoraList(
            doraIndicators,
            this.isSanma,
        )

        const startEvents: GameUpdate['events'] = this.players.map((p) => ({
            eventName: 'round-started',
            payload: {
                hand: p.hand.map((t) => t.toString()),
                dora: doraIndicators,
                actualDora: actualDora,
                wallCount: this.wall.getRemainingTiles(),
                bakaze: this.bakaze,
                kyoku: this.kyokuNum,
                honba: this.honba,
                kyotaku: this.kyotaku,
                oyaId: this.players[this.oyaIndex].id,
                scores: this.players.map((pl) => ({
                    id: pl.id,
                    points: pl.points,
                    jikaze: this.getSeatWind(pl),
                })),
                waits: this.ruleManager.getWaits(p),
            },
            to: 'player',
            playerId: p.id,
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
            const check = this.ruleEffectManager.checkKyuushuKyuuhai(
                player,
                this.anyCallDeclared,
            )
            if (!check.success) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: check.error },
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
        // console.log(`[DiscardTile] Player: ${playerId}, Tile: ${tileString}`)
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

        // Kuikae prevention
        if (player.forbiddenDiscard.length > 0) {
            const rank = Tile.parseRank(tileString)
            const suit = tileString[1]

            // Check for both same tile and opposite end (for Chi)
            const isForbidden = player.forbiddenDiscard.some((f) => {
                const fRank = Tile.parseRank(f)
                const fSuit = f[1]
                return rank === fRank && suit === fSuit
            })

            if (isForbidden) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: {
                                message: 'Kuikae (Swap-calling) is forbidden',
                            },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }
        }

        let doraRevealedEvent: GameUpdate['events'][0] | null = null
        if (this.pendingDoraReveal) {
            this.wall.revealDora()
            this.pendingDoraReveal = false
            const doraIndicators = this.getDora().map((t) => t.toString())
            const actualDora = this.ruleManager.getActualDoraList(
                doraIndicators,
                this.isSanma,
            )
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
            const riichiResult = this.ruleEffectManager.handleRiichi(
                player,
                tileString,
                this.turnCounter,
                this.wall,
                this.anyCallDeclared,
            )

            if (!riichiResult.success) {
                return {
                    roomId,
                    isGameOver: false,
                    events: [
                        {
                            eventName: 'error',
                            payload: { message: riichiResult.error },
                            to: 'player',
                            playerId,
                        },
                    ],
                }
            }

            this.kyotaku += 1

            // Check Suucha Riichi (Four Riichi)
            if (this.ruleEffectManager.checkSuuchaRiichi(this.players)) {
                return this.endKyoku(roomId, {
                    reason: 'ryuukyoku',
                    abortReason: 'suucha-riichi',
                })
            }
        }

        // Enforce Tsumogiri during Riichi (cannot discard other tiles)
        if (player.isRiichi && !isRiichi) {
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

        // Handle side effects after discard
        player.isTemporaryFuriten = false
        player.forbiddenDiscard = []
        this.ruleEffectManager.updateFuritenStatus(player)
        this.ruleEffectManager.handleIppatsuExpiration(player, this.turnCounter)

        // Clear Rinshan flag after discard
        this.rinshanFlag = false
        this.activeDiscard = { playerId, tile: discardedTile }

        // Check Suufuu Renda (Four Same Winds)
        if (
            this.ruleEffectManager.checkSuufuuRenda(
                tileString,
                this.turnCounter,
                this.anyCallDeclared,
                this.turnManager,
            )
        ) {
            return this.endKyoku(roomId, {
                reason: 'ryuukyoku',
                abortReason: 'suufuu-renda',
            })
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
                    waits: this.ruleManager.getWaits(player),
                },
                to: 'player',
                playerId: player.id,
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
        const result = this.actionManager.verifyTsumo(player, {
            bakaze: this.bakaze,
            seatWind: this.getSeatWind(player),
            dora: this.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? this.wall.getUradora().map((t) => t.toString())
                : [],
            isHaitei: this.wall.getRemainingTiles() === 0,
            rinshanFlag: this.rinshanFlag,
        })

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
        isKakan: boolean = false,
    ): Record<string, PossibleActions> {
        return this.actionManager.getPossibleActions(
            discarderId,
            tileString,
            this.players,
            {
                bakaze: this.bakaze,
                dora: this.getDora().map((t) => t.toString()),
                playerContexts: this.players.map((p) => ({
                    playerId: p.id,
                    seatWind: this.getSeatWind(p),
                    uradora: p.isRiichi
                        ? this.wall.getUradora().map((t) => t.toString())
                        : [],
                })),
                isHoutei: this.wall.getRemainingTiles() === 0,
            },
            isKakan,
            this.isSanma,
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
        const result = this.actionManager.performAction(
            playerId,
            actionType,
            tileString,
            consumedTiles,
            this.players,
            this.currentTurnIndex,
        )

        if (!result.success) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: result.error || 'Action failed' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }

        const events = [...result.events]
        const player = this.getPlayer(playerId)!

        if (actionType === 'pon' || actionType === 'chi') {
            const stolenRank = Tile.parseRank(tileString)
            const suit = tileString[1]
            const forbidden: string[] = [tileString]

            if (actionType === 'chi') {
                const ranks = consumedTiles.map((t) => Tile.parseRank(t))
                ranks.push(stolenRank)
                ranks.sort((a, b) => a - b)
                // ranks is now the full sequence, e.g., [3, 4, 5]

                // Forbid discarding any tile that could have formed the same meld (suji-kuikae).
                // Case 1: Called tile is the lowest in the sequence (e.g., chi 3m with 4m-5m).
                if (ranks[0] === stolenRank && ranks[0] > 1) {
                    const otherSide = ranks[2] + 1
                    if (otherSide <= 9) {
                        forbidden.push(`${otherSide}${suit}`)
                    }
                }
                // Case 2: Called tile is the highest in the sequence (e.g., chi 7m with 5m-6m).
                else if (ranks[2] === stolenRank && ranks[2] < 9) {
                    const otherSide = ranks[0] - 1
                    if (otherSide >= 1) {
                        forbidden.push(`${otherSide}${suit}`)
                    }
                }
                // Case 3: Called tile is in the middle (e.g., chi 4m with 3m-5m).
                else if (ranks[1] === stolenRank) {
                    const lowerSuji = ranks[0] - 1
                    if (lowerSuji >= 1) {
                        forbidden.push(`${lowerSuji}${suit}`)
                    }
                    const upperSuji = ranks[2] + 1
                    if (upperSuji <= 9) {
                        forbidden.push(`${upperSuji}${suit}`)
                    }
                }
            }
            player.forbiddenDiscard = forbidden
        }

        // Check Pao (Big Three Dragons / Big Four Winds)
        // This is moved after player.forbiddenDiscard because handleMeldAction already added the meld to player.melds
        if (
            actionType === 'pon' ||
            actionType === 'kan' ||
            actionType === 'kakan'
        ) {
            const latestMeld = player.melds.slice(-1)[0]
            const paoCheck = this.ruleEffectManager.checkPao(player, latestMeld)
            if (paoCheck) {
                if (!this.paoStatus.has(playerId)) {
                    this.paoStatus.set(playerId, new Map())
                }
                this.paoStatus
                    .get(playerId)!
                    .set(paoCheck.yakumanName, paoCheck.responsiblePlayerId)
            }
        }

        if (result.roundEnd) {
            if (result.roundEnd.reason === 'ron') {
                // Fill scores for Ron winners
                const winners = result.roundEnd.winners!.map((w) => {
                    const winner = this.getPlayer(w.winnerId)!
                    const score = this.actionManager.verifyRon(
                        winner,
                        tileString,
                        {
                            bakaze: this.bakaze,
                            seatWind: this.getSeatWind(winner),
                            dora: this.getDora().map((t) => t.toString()),
                            uradora: winner.isRiichi
                                ? this.wall
                                      .getUradora()
                                      .map((t) => t.toString())
                                : [],
                            isHoutei: this.wall.getRemainingTiles() === 0,
                        },
                        actionType === 'kakan',
                        this.isSanma,
                    ).score!
                    return { winnerId: w.winnerId, score }
                })
                return this.endKyoku(roomId, {
                    reason: 'ron',
                    winners,
                    loserId: result.roundEnd.loserId,
                })
            }
        }

        if (result.needsReplacementTile) {
            const player = this.getPlayer(playerId)!

            // For Ankan, flip dora immediately (Tenhou/Mahjong Soul rules)
            if (actionType === 'ankan') {
                this.wall.revealDora()
                this.pendingDoraReveal = false
                const doraIndicators = this.getDora().map((t) => t.toString())
                const actualDora = this.ruleManager.getActualDoraList(
                    doraIndicators,
                    this.isSanma,
                )
                events.push({
                    eventName: 'dora-revealed',
                    payload: {
                        dora: doraIndicators,
                        actualDora: actualDora,
                    },
                    to: 'all',
                })
            }

            // When a call is made (chi/pon/kan), it becomes that player's turn.
            // Actually only chi/pon/kan (daiminkan) do this. Ankan/Kakan don't change turn index (already their turn).
            if (
                actionType === 'chi' ||
                actionType === 'pon' ||
                actionType === 'kan'
            ) {
                const playerIndex = this.players.indexOf(player)
                this.turnManager.currentTurnIndex = playerIndex
            }

            // Check Suukan Settsu (Four Kans)
            if (
                this.ruleEffectManager.checkSuukanSettsu(this.players)
                    .isAbortive
            ) {
                return this.endKyoku(roomId, {
                    reason: 'ryuukyoku',
                    abortReason: 'suukan-settsu',
                })
            }

            const replacementEvents = this.turnManager.drawTile(
                this.wall,
                player,
            )
            if (!replacementEvents) {
                return this.endKyoku(roomId, { reason: 'ryuukyoku' })
            }
            events.push(...replacementEvents)
        } else if (
            actionType === 'chi' ||
            actionType === 'pon' ||
            actionType === 'kan'
        ) {
            // Update turn index for Chi/Pon/Daiminkan (not ending round)
            const player = this.getPlayer(playerId)!
            this.turnManager.currentTurnIndex = this.players.indexOf(player)
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

    protected endKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string // Target for Ron
            score?: ScoreCalculation
            abortReason?: string
            pao?: { winnerId: string; responsiblePlayerId: string }[]
        },
    ): GameUpdate {
        const winners =
            result.winners ||
            (result.reason === 'ron' && result.winnerId && result.score
                ? [{ winnerId: result.winnerId, score: result.score }]
                : undefined)

        const paoInfos: { winnerId: string; responsiblePlayerId: string }[] =
            result.pao || []
        if (winners && paoInfos.length === 0) {
            winners.forEach((w) => {
                const winnerPaoMap = this.paoStatus.get(w.winnerId)
                if (winnerPaoMap) {
                    for (const [
                        yakumanName,
                        responsiblePlayerId,
                    ] of winnerPaoMap.entries()) {
                        if (w.score.yaku[yakumanName]) {
                            paoInfos.push({
                                winnerId: w.winnerId,
                                responsiblePlayerId,
                            })
                        }
                    }
                }
            })
        }

        return this.roundManager.endRound(roomId, this.players, {
            reason: result.reason,
            winners: winners,
            winnerId: result.winnerId,
            loserId: result.loserId,
            score: result.score,
            abortReason: result.abortReason,
            pao: paoInfos.length > 0 ? paoInfos : undefined,
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
        const result = this.actionManager.skipAction(playerId, this.players)

        if (result.shouldProceed) {
            this.turnManager.advanceTurn(this.players.length)
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
                const canTsumo = this.actionManager.verifyTsumo(currentPlayer, {
                    bakaze: this.bakaze,
                    seatWind: this.getSeatWind(currentPlayer),
                    dora: this.getDora().map((t) => t.toString()),
                    uradora: currentPlayer.isRiichi
                        ? this.wall.getUradora().map((t) => t.toString())
                        : [],
                    isHaitei: this.wall.getRemainingTiles() === 0,
                    rinshanFlag: this.rinshanFlag,
                }, this.isSanma).isAgari
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
            myHand: player.hand.map((t) => t.toString()),
            myLastDraw: player.lastDrawnTile?.toString() || null,
            myIndex: myIndex,
            players: this.players.map((p, idx) => ({
                id: p.id,
                handCount: p.hand.length,
                discards: p.discards.map((t) => t.toString()),
                melds: p.melds.map((m) => ({
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
            bakaze: parseInt(this.bakaze[0]),
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

    public getGameState(): GameState {
        const doraIndicators = this.getDora().map((t) => t.toString())
        return {
            bakaze: this.bakaze,
            kyoku: this.kyokuNum,
            honba: this.honba,
            kyotaku: this.kyotaku,
            oyaIndex: this.oyaIndex,
            currentTurnIndex: this.currentTurnIndex,
            turnCounter: this.turnCounter,
            isSuddenDeath: this.isSuddenDeath,
            wallCount: this.wall.getRemainingTiles(),
            deadWallCount: this.wall.getRemainingDeadWall(),
            doraIndicators: doraIndicators,
            actualDora: this.ruleManager.getActualDoraList(
                doraIndicators,
                this.isSanma,
            ),
            gameMode: this.isSanma ? 'sanma' : '4p',
        }
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
        return this.players.find((p) => p.id === id)
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
        const result = this.actionManager.verifyTsumo(player, {
            bakaze: this.bakaze,
            seatWind: this.getSeatWind(player),
            dora: this.getDora().map((t) => t.toString()),
            uradora: player.isRiichi
                ? this.wall.getUradora().map((t) => t.toString())
                : [],
            isHaitei: this.wall.getRemainingTiles() === 0,
            rinshanFlag: this.rinshanFlag,
        }, this.isSanma)
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
