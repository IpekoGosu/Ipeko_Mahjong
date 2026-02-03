import {
    WebSocketGateway,
    SubscribeMessage,
    WebSocketServer,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { GameRoomService } from './service/game-room.service'
import { GameUpdate } from './classes/mahjong.game.class'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class MahjongGateway {
    @WebSocketServer()
    server: Server

    constructor(
        private readonly gameRoomService: GameRoomService,
        private readonly logger: WinstonLoggerService,
    ) {}

    // #region WebSocket Lifecycle Handlers

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
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
        const room = this.gameRoomService.createRoom(client.id)
        await client.join(room.roomId)

        // Send initial state to the human player
        const human = room.mahjongGame.getPlayer(client.id)
        if (human) {
            client.emit('game-started', {
                roomId: room.roomId,
                yourPlayerId: client.id,
                players: room.mahjongGame
                    .getPlayers()
                    .map((p) => ({ id: p.getId(), isAi: p.isAi })),
                hand: human.getHand().map((t) => t.toString()),
                dora: room.mahjongGame.getDora().map((t) => t.toString()),
                wallCount: room.mahjongGame.getWallCount(),
                deadWallCount: room.mahjongGame.getDeadWallCount(),
            })
        }

        // Start the game logic
        const gameUpdate = await room.mahjongGame.startGame(room.roomId)
        // Use a small delay to ensure the client has processed 'game-started'
        this.processGameUpdate(gameUpdate)

        // AI가 시작 플레이어여서 바로 타패한 경우, 다음 턴을 스케줄링합니다.
        const discardEvent = gameUpdate.events.find(
            (e) => e.eventName === 'update-discard',
        )
        if (discardEvent && !gameUpdate.isGameOver) {
            const discarderId = discardEvent.payload.playerId
            const tileString = discardEvent.payload.tile
            this.checkAndNotifyActions(room.roomId, discarderId, tileString)
        }
    }

    @SubscribeMessage('discard-tile')
    async handleDiscardTile(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; tile: string; isRiichi?: boolean },
    ): Promise<void> {
        const room = this.gameRoomService.getRoom(data.roomId)
        if (!room) return

        const gameUpdate = await room.mahjongGame.discardTile(
            data.roomId,
            client.id,
            data.tile,
            data.isRiichi,
        )
        this.processGameUpdate(gameUpdate)

        if (!gameUpdate.isGameOver) {
            this.checkAndNotifyActions(data.roomId, client.id, data.tile)
        }
    }

    @SubscribeMessage('declare-tsumo')
    handleDeclareTsumo(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string },
    ): void {
        const room = this.gameRoomService.getRoom(data.roomId)
        if (!room) return

        const gameUpdate = room.mahjongGame.declareTsumo(data.roomId, client.id)
        this.processGameUpdate(gameUpdate)
    }

    @SubscribeMessage('select-action')
    handleSelectAction(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            type: 'chi' | 'pon' | 'kan' | 'ron' | 'skip'
            tile: string
            consumedTiles?: string[]
        },
    ): void {
        const room = this.gameRoomService.getRoom(data.roomId)
        if (!room) return

        // 스킵인 경우, (실제로는 모든 대상자가 스킵했는지 확인해야 하지만)
        // 여기서는 타이머가 끝날 때까지 기다리거나, 바로 진행할 수 있습니다.
        // 간단히 구현하기 위해 스킵은 무시하고 타이머 만료를 기다리게 하거나,
        // 타이머를 취소하지 않습니다.
        if (data.type === 'skip') {
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
    }

    // #endregion

    // #region Private Helper Methods

    /**
     * 타패 후 다른 플레이어의 행동 가능 여부를 확인하고, 가능하면 이벤트를 보냅니다.
     * 행동이 없으면 자동으로 다음 턴을 스케줄링합니다.
     */
    private checkAndNotifyActions(
        roomId: string,
        discarderId: string,
        tileString: string,
    ): void {
        const room = this.gameRoomService.getRoom(roomId)
        if (!room) return

        const actions = room.mahjongGame.getPossibleActions(
            discarderId,
            tileString,
        )
        const hasActions = Object.keys(actions).length > 0

        if (hasActions) {
            console.log('Possible actions:', actions)
            // 행동이 가능한 플레이어에게 선택지를 보냅니다.
            Object.entries(actions).forEach(([playerId, actionData]) => {
                this.server
                    .to(playerId)
                    .emit('ask-action', { ...actionData, tile: tileString })
            })
            // 5초 대기 (아무도 선택하지 않으면 다음 턴)
            this.scheduleNextTurn(roomId, 5000)
        } else {
            // 행동할 수 있는 사람이 없으면 바로(혹은 짧은 딜레이 후) 다음 턴
            this.scheduleNextTurn(roomId, 1000)
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
            console.log(
                `Game over in room ${update.roomId}. Reason: ${update.reason}`,
            )
            this.gameRoomService.removeRoom(update.roomId)
        }
    }

    /**
     * 5초 뒤에 다음 턴을 진행하도록 스케줄링합니다.
     */
    private scheduleNextTurn(roomId: string, delay: number = 5000): void {
        const timer = setTimeout(async () => {
            const room = this.gameRoomService.getRoom(roomId)
            if (!room) return

            const gameUpdate = await room.mahjongGame.proceedToNextTurn(roomId)
            this.processGameUpdate(gameUpdate)

            // 다음 턴이 AI여서 바로 타패한 경우, 다시 다음 턴을 스케줄링합니다.
            // 단, 타패 후 행동(론/후로) 체크가 필요합니다.
            const discardEvent = gameUpdate.events.find(
                (e) => e.eventName === 'update-discard',
            )

            if (discardEvent && !gameUpdate.isGameOver) {
                const discarderId = discardEvent.payload.playerId
                const tileString = discardEvent.payload.tile
                // AI 타패 후 행동 체크
                this.checkAndNotifyActions(roomId, discarderId, tileString)
            }
        }, delay)

        const room = this.gameRoomService.getRoom(roomId)
        if (room) {
            room.timer = timer
        }
    }

    // #endregion
}
