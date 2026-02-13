import { GameRoom } from '@src/modules/mahjong/interfaces/mahjong.types'

/**
 * GameRoomService는 게임 룸의 생명주기(생성, 삭제)와
 * 룸 인스턴스를 찾는 역할을 담당하는 서비스의 인터페이스입니다.
 */
export abstract class GameRoomService {
    /**
     * 새로운 게임 룸을 생성합니다.
     * @param humanPlayerSocketId 게임을 시작한 플레이어의 소켓 ID
     */
    abstract createRoom(humanPlayerSocketId: string): Promise<GameRoom>

    /**
     * ID로 게임 룸을 찾습니다.
     * @param roomId 찾을 룸의 ID
     */
    abstract getRoom(roomId: string): GameRoom | undefined

    /**
     * 게임 룸을 제거합니다.
     * @param roomId 제거할 룸의 ID
     */
    abstract removeRoom(roomId: string): void

    /**
     * 플레이어 ID로 해당 플레이어가 속한 룸을 찾습니다.
     * @param socketId 플레이어의 소켓 ID
     */
    abstract findRoomByPlayerId(socketId: string): GameRoom | undefined
}
