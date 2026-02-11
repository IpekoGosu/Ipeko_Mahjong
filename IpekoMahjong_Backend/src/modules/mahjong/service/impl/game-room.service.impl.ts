import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { MahjongGame } from '../../classes/mahjong.game.class'
import { GameRoomService } from '../game-room.service'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

// 인터페이스는 구현 파일 내에서 직접 export하여 순환 참조를 방지합니다.
export interface GameRoom {
    readonly roomId: string
    readonly mahjongGame: MahjongGame
    gameStatus: 'in-progress' | 'finished'
    timer?: NodeJS.Timeout
}

@Injectable()
export class GameRoomServiceImpl
    extends GameRoomService
    implements OnModuleDestroy
{
    private readonly rooms = new Map<string, GameRoom>()

    constructor(private readonly logger: WinstonLoggerService) {
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

    createRoom(humanPlayerSocketId: string): GameRoom {
        const roomId = this.generateRoomId()
        const playerIds = [
            { id: humanPlayerSocketId, isAi: false },
            { id: 'ai-1', isAi: true },
            { id: 'ai-2', isAi: true },
            { id: 'ai-3', isAi: true },
        ]

        const mahjongGame = new MahjongGame(playerIds)

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
