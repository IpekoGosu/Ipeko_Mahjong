import {
    WebSocketGateway,
    SubscribeMessage,
    WebSocketServer,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { GameRoomService } from '@src/modules/mahjong/service/game-room.service'
import { GameUpdate } from '@src/modules/mahjong/interfaces/mahjong.types'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '@src/modules/authorization/jwt-auth.guard'
import { JwtService } from '@nestjs/jwt'
import { extractJwt, RequestWithAuth } from '@src/common/utils/auth.utils'

@UseGuards(JwtAuthGuard)
@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
})
export class MahjongGateway {
    @WebSocketServer()
    declare server: Server

    constructor(
        private readonly gameRoomService: GameRoomService,
        private readonly logger: WinstonLoggerService,
        private readonly jwtService: JwtService,
    ) {}

    // #region WebSocket Lifecycle Handlers

    async handleConnection(client: Socket) {
        try {
            const token = extractJwt(client as RequestWithAuth)

            if (!token) {
                this.logger.warn(
                    `Client connection rejected: No token provided`,
                )
                client.disconnect()
                return
            }

            const rawPayload: unknown = await this.jwtService.verifyAsync(token)
            if (!rawPayload || typeof rawPayload !== 'object') {
                this.logger.warn(`Client connection rejected: Invalid token`)
                client.disconnect()
                return
            }

            const payload = rawPayload as Record<string, unknown>
            const sub = payload['sub']
            const email = payload['email']

            if (typeof sub !== 'number' || typeof email !== 'string') {
                this.logger.warn(`Client connection rejected: Invalid payload`)
                client.disconnect()
                return
            }

            // Store user info in socket data for later use
            const user = {
                userId: sub,
                email: email,
            }
            const data = client.data as Record<string, unknown>
            data['user'] = user
            this.logger.log(`Client connected: ${client.id} (User: ${email})`)
        } catch (error) {
            this.logger.error(
                `Client connection rejected: Invalid token`,
                error instanceof Error ? error.stack : String(error),
            )
            client.disconnect()
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`)
        const room = this.gameRoomService.findRoomByPlayerId(client.id)
        if (room) {
            // Notify other players and clean up the room
            const update: GameUpdate = {
                roomId: room.roomId,
                isGameOver: true,
                reason: 'player-disconnected',
                events: [
                    {
                        eventName: 'game-over',
                        payload: {
                            reason: 'player-disconnected',
                            disconnectedPlayerId: client.id,
                        },
                        to: 'all',
                    },
                ],
            }
            this.processGameUpdate(update)
        }
    }

    // #endregion

    // #region WebSocket Message Handlers

    @SubscribeMessage('start-game')
    async handleStartGame(@ConnectedSocket() client: Socket): Promise<void> {
        const room = await this.gameRoomService.createRoom(client.id)
        await client.join(room.roomId)

        // 1. Initialize round logic (deals 13 tiles)
        const gameUpdate = room.mahjongGame.startGame(room.roomId)

        // 2. Send initial state to the human player
        const human = room.mahjongGame.getPlayer(client.id)
        if (human) {
            const doraIndicators = room.mahjongGame
                .getDora()
                .map((t) => t.toString())

            client.emit('game-started', {
                roomId: room.roomId,
                yourPlayerId: client.id,
                oyaId: room.mahjongGame
                    .getPlayers()
                    .find((p) => p.isOya)
                    ?.getId(),
                players: room.mahjongGame.getPlayers().map((p) => ({
                    id: p.getId(),
                    isAi: p.isAi,
                    jikaze: room.mahjongGame.getSeatWind(p),
                })),
                hand: human.getHand().map((t) => t.toString()),
                dora: doraIndicators,
                actualDora: RuleManager.getActualDoraList(doraIndicators),
                wallCount: room.mahjongGame.getWallCount(),
                deadWallCount: room.mahjongGame.getDeadWallCount(),
                riichiDiscards: RuleManager.getRiichiDiscards(human),
                waits: RuleManager.getWaits(human),
            })
        }

        // 3. Emit 'round-started' (13 tiles)
        this.processGameUpdate(gameUpdate)

        // 4. Trigger first turn (Oya draws 14th tile)
        const drawUpdate = room.mahjongGame.startFirstTurn(room.roomId)
        this.processGameUpdate(drawUpdate)
        await this.handlePostUpdateActions(room.roomId, drawUpdate)
    }

    @SubscribeMessage('discard-tile')
    async handleDiscardTile(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; tile: string; isRiichi?: boolean },
    ): Promise<void> {
        try {
            const room = this.gameRoomService.getRoom(data.roomId)
            if (!room) return

            const gameUpdate = room.mahjongGame.discardTile(
                data.roomId,
                client.id,
                data.tile,
                data.isRiichi,
            )
            this.processGameUpdate(gameUpdate)

            // Only check actions if the discard was successful (i.e. no error events)
            const hasError = gameUpdate.events.some(
                (e) => e.eventName === 'error',
            )
            if (!gameUpdate.isGameOver && !hasError) {
                await this.handlePostUpdateActions(data.roomId, gameUpdate)
            }
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(
                    `Error in handleDiscardTile: ${error.message}`,
                    error.stack || '',
                )
            } else {
                this.logger.error(
                    `Unknown error in handleDiscardTile: ${String(error)}`,
                )
            }
            client.emit('error', {
                message: 'Internal server error during discard',
            })
        }
    }

    @SubscribeMessage('declare-tsumo')
    handleDeclareTsumo(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string },
    ): void {
        try {
            const room = this.gameRoomService.getRoom(data.roomId)
            if (!room) return

            const gameUpdate = room.mahjongGame.declareTsumo(
                data.roomId,
                client.id,
            )
            this.processGameUpdate(gameUpdate)
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(
                    `Error in handleDeclareTsumo: ${error.message}`,
                    error.stack || '',
                )
            } else {
                this.logger.error(
                    `Unknown error in handleDeclareTsumo: ${String(error)}`,
                )
            }
            client.emit('error', {
                message: 'Internal server error during tsumo',
            })
        }
    }

    @SubscribeMessage('next-round')
    handleNextRound(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string },
    ): void {
        try {
            const room = this.gameRoomService.getRoom(data.roomId)
            if (!room) return

            // 1. Initialize next round logic (deals 13 tiles)
            const gameUpdate = room.mahjongGame.nextRound(data.roomId)

            // 2. Emit 'round-started' (initial 13 tiles)
            this.processGameUpdate(gameUpdate)

            // 3. Trigger first turn (Oya draws 14th tile)
            const drawUpdate = room.mahjongGame.startFirstTurn(data.roomId)
            this.processGameUpdate(drawUpdate)

            this.handlePostUpdateActions(data.roomId, drawUpdate).catch((err) =>
                this.logger.error(
                    `Error in post-action for next-round: ${String(err)}`,
                ),
            )
        } catch (error) {
            this.logger.error(`Error in handleNextRound: ${String(error)}`)
        }
    }

    @SubscribeMessage('select-action')
    async handleSelectAction(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            type: 'chi' | 'pon' | 'kan' | 'ron' | 'skip' | 'ankan' | 'kakan'
            tile: string
            consumedTiles?: string[]
        },
    ): Promise<void> {
        try {
            const room = this.gameRoomService.getRoom(data.roomId)
            if (!room) return

            if (data.type === 'skip') {
                const result = room.mahjongGame.skipAction(
                    data.roomId,
                    client.id,
                )
                if (result.shouldProceed && result.update) {
                    if (room.timer) {
                        clearTimeout(room.timer)
                        room.timer = undefined
                    }
                    this.processGameUpdate(result.update)
                    await this.handlePostUpdateActions(
                        data.roomId,
                        result.update,
                    )
                }
                return
            }

            // 행동을 선택한 경우 타이머를 취소하고 행동을 수행합니다.
            if (room.timer) {
                clearTimeout(room.timer)
                room.timer = undefined
            }

            const gameUpdate = room.mahjongGame.performAction(
                data.roomId,
                client.id,
                data.type,
                data.tile,
                data.consumedTiles,
            )
            this.processGameUpdate(gameUpdate)
            await this.handlePostUpdateActions(data.roomId, gameUpdate)
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(
                    `Error in handleSelectAction: ${error.message}`,
                    error.stack || '',
                )
            } else {
                this.logger.error(
                    `Unknown error in handleSelectAction: ${String(error)}`,
                )
            }
            client.emit('error', {
                message: 'Internal server error during action',
            })
        }
    }

    // #endregion

    // #region Private Helper Methods

    /**
     * GameUpdate 후 추가적으로 처리해야 할 로직(AI 타패 후 행동 체크 등)을 수행합니다.
     */
    private async handlePostUpdateActions(
        roomId: string,
        update: GameUpdate,
    ): Promise<void> {
        if (update.isGameOver) return

        const discardEvent = update.events.find(
            (e) => e.eventName === 'update-discard',
        )
        if (discardEvent) {
            const discarderId = discardEvent.payload.playerId as string
            const tileString = discardEvent.payload.tile as string
            await this.checkAndNotifyActions(roomId, discarderId, tileString)
        }

        const meldEvent = update.events.find(
            (e) => e.eventName === 'update-meld',
        )
        if (meldEvent && meldEvent.payload.type === 'kakan') {
            const playerId = meldEvent.payload.playerId as string
            // For kakan, the added tile is the one being robbed.
            // ActionManager should have stored which tile was added, or we can infer it.
            // In ActionManager.4p, tilesToMove contains the added tile for kakan.
            const addedTiles = meldEvent.payload.consumedTiles as string[]
            const addedTile = addedTiles[0]
            await this.checkAndNotifyActions(roomId, playerId, addedTile, true)
        }

        const turnEvent = update.events.find(
            (e) => e.eventName === 'turn-changed',
        )
        if (turnEvent) {
            const nextPlayerId = turnEvent.payload.playerId as string
            await this.checkAndNotifyAiTurn(roomId, nextPlayerId)
        }
    }

    /**
     * 타패 후 다른 플레이어의 행동 가능 여부를 확인하고, 가능하면 이벤트를 보냅니다.
     */
    private async checkAndNotifyActions(
        roomId: string,
        discarderId: string,
        tileString: string,
        isKakan: boolean = false,
    ): Promise<void> {
        const room = this.gameRoomService.getRoom(roomId)
        if (!room) return

        const actions = room.mahjongGame.getPossibleActions(
            discarderId,
            tileString,
            isKakan,
        )
        const hasActions = Object.keys(actions).length > 0

        if (hasActions) {
            // 행동이 가능한 플레이어에게 선택지를 보냅니다.
            for (const [playerId, actionData] of Object.entries(actions)) {
                const player = room.mahjongGame.getPlayer(playerId)
                if (player?.isAi && player.ai) {
                    // AI decides action
                    const observation =
                        room.mahjongGame.createGameObservation(player)
                    const decision = await player.ai.decideAction(
                        observation,
                        tileString,
                        actionData,
                    )

                    if (decision === 'skip') {
                        const result = room.mahjongGame.skipAction(
                            roomId,
                            playerId,
                        )
                        if (result.shouldProceed && result.update) {
                            if (room.timer) {
                                clearTimeout(room.timer)
                                room.timer = undefined
                            }
                            this.processGameUpdate(result.update)
                            await this.handlePostUpdateActions(
                                roomId,
                                result.update,
                            )
                        }
                    } else {
                        // AI performs action (Chi, Pon, Kan, Ron)
                        // For now, SimpleAI only skips, so we'll implement this part when needed.
                        // But let's add a placeholder.
                        const gameUpdate = room.mahjongGame.performAction(
                            roomId,
                            playerId,
                            decision,
                            tileString,
                        )
                        this.processGameUpdate(gameUpdate)
                        await this.handlePostUpdateActions(roomId, gameUpdate)
                    }
                } else {
                    this.server
                        .to(playerId)
                        .emit('ask-action', { ...actionData, tile: tileString })
                }
            }
            // 15초 대기 (아무도 선택하지 않으면 다음 턴)
            this.scheduleNextTurn(
                roomId,
                process.env.NODE_ENV === 'test' ? 100 : 15000,
            )
        } else {
            // 행동할 수 있는 사람이 없으면 바로(혹은 짧은 딜레이 후) 다음 턴
            this.scheduleNextTurn(
                roomId,
                process.env.NODE_ENV === 'test' ? 10 : 1000,
            )
        }
    }

    /**
     * AI 턴인 경우 자동으로 타패를 수행합니다. (AI 자체의 딜레이가 적용됨)
     */
    private async checkAndNotifyAiTurn(
        roomId: string,
        playerId: string,
    ): Promise<void> {
        try {
            const room = this.gameRoomService.getRoom(roomId)
            if (!room) return

            const player = room.mahjongGame.getPlayer(playerId)
            if (!player || !player.isAi) return

            // AI의 타패 결정 (SimpleAI는 여기서 2초 대기함)
            let tileToDiscard: string
            if (player.isRiichi && player.lastDrawnTile) {
                tileToDiscard = player.lastDrawnTile.toString()
            } else {
                const observation =
                    room.mahjongGame.createGameObservation(player)
                if (player.ai) {
                    tileToDiscard = await player.ai.decideDiscard(observation)
                } else {
                    tileToDiscard = await SimpleAI.decideDiscard(
                        player.getHand().map((t) => t.toString()),
                    )
                }
            }

            // 결정된 타패로 게임 진행
            const gameUpdate = room.mahjongGame.discardTile(
                roomId,
                playerId,
                tileToDiscard,
            )
            this.processGameUpdate(gameUpdate)
            await this.handlePostUpdateActions(roomId, gameUpdate)
        } catch (error) {
            this.logger.error(
                `AI Turn Error in room ${roomId}: ${String(error)}`,
            )
        }
    }

    /**
     * GameUpdate 객체를 받아 적절한 클라이언트에게 이벤트를 전송합니다.
     */
    private processGameUpdate(update: GameUpdate): void {
        if (!update) return

        update.events.forEach((event) => {
            if (event.to === 'all') {
                this.server
                    .to(update.roomId)
                    .emit(event.eventName, event.payload)
            } else if (event.to === 'player' && event.playerId) {
                this.server
                    .to(event.playerId)
                    .emit(event.eventName, event.payload)
            }
        })

        if (update.isGameOver) {
            this.logger.log(
                `Game over in room ${update.roomId}. Reason: ${update.reason}`,
            )
            this.gameRoomService.removeRoom(update.roomId)
        }
    }

    /**
     * 5초 뒤에 다음 턴을 진행하도록 스케줄링합니다.
     */
    private scheduleNextTurn(roomId: string, delay: number = 5000): void {
        const room = this.gameRoomService.getRoom(roomId)
        if (!room) return

        // Clear existing timer if any
        if (room.timer) {
            clearTimeout(room.timer)
            room.timer = undefined
        }

        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const currentRoom = this.gameRoomService.getRoom(roomId)
                    if (!currentRoom) return

                    const gameUpdate =
                        currentRoom.mahjongGame.proceedToNextTurn(roomId)
                    this.processGameUpdate(gameUpdate)

                    await this.handlePostUpdateActions(roomId, gameUpdate)
                } catch (error) {
                    if (error instanceof Error) {
                        this.logger.error(
                            `Error in scheduled next turn for room ${roomId}: ${error.message}`,
                            error.stack,
                        )
                    } else {
                        this.logger.error(
                            `Unknown error in scheduled next turn for room ${roomId}: ${String(error)}`,
                        )
                    }
                }
            })()
        }, delay)

        room.timer = timer
    }

    // #endregion
}
