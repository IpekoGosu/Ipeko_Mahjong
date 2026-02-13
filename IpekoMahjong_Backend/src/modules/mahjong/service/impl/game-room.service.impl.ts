import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { GameRoomService } from '@src/modules/mahjong/service/game-room.service'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { MahjongFactory } from '@src/modules/mahjong/mahjong.factory'
import { GameRoom } from '@src/modules/mahjong/interfaces/mahjong.types'

@Injectable()
export class GameRoomServiceImpl
    extends GameRoomService
    implements OnModuleDestroy
{
    private readonly rooms = new Map<string, GameRoom>()

    constructor(
        private readonly logger: WinstonLoggerService,
        private readonly mahjongFactory: MahjongFactory,
    ) {
        super()
    }

    onModuleDestroy() {
        for (const room of this.rooms.values()) {
            if (room.timer) {
                clearTimeout(room.timer)
                room.timer = undefined
            }
        }
        this.rooms.clear()
    }

    async createRoom(humanPlayerSocketId: string): Promise<GameRoom> {
        const roomId = this.generateRoomId()
        const playerIds = [
            { id: humanPlayerSocketId, isAi: false },
            { id: 'ai-1', isAi: true },
            { id: 'ai-2', isAi: true },
            { id: 'ai-3', isAi: true },
        ]

        const mahjongGame = await this.mahjongFactory.create4pGame(playerIds)

        const room: GameRoom = {
            roomId,
            mahjongGame,
            gameStatus: 'in-progress',
        }

        this.rooms.set(roomId, room)
        this.logger.log(`Room created: ${roomId}`)
        return room
    }

    getRoom(roomId: string): GameRoom | undefined {
        return this.rooms.get(roomId)
    }

    removeRoom(roomId: string): void {
        const room = this.rooms.get(roomId)
        if (room?.timer) {
            clearTimeout(room.timer)
            room.timer = undefined
        }
        this.rooms.delete(roomId)
        this.logger.log(`Room removed: ${roomId}`)
    }

    findRoomByPlayerId(socketId: string): GameRoom | undefined {
        return Array.from(this.rooms.values()).find((room) =>
            room.mahjongGame
                .getPlayers()
                .some((player) => player.getId() === socketId),
        )
    }

    private generateRoomId(): string {
        return Math.random().toString(36).substring(2, 9)
    }
}
