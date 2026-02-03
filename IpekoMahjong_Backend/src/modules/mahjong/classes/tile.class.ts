import { Suit } from '../interfaces/mahjong.types'

export class Tile {
    readonly id: string
    private readonly suit: Suit
    private readonly rank: number
    readonly isRed: boolean

    constructor(
        suit: Suit,
        rank: number,
        isRed: boolean = false,
        index: number,
    ) {
        this.suit = suit
        this.rank = rank
        this.isRed = isRed
        this.id = `${suit}_${rank}_${index}`
    }

    getSuit(): Suit {
        return this.suit
    }

    getRank(): number {
        return this.rank
    }

    toString(): string {
        // 赤5통은 0p, 赤5만은 0m, 赤5삭은 0s로 표현하는 경우가 많지만,
        // riichi 라이브러리와의 호환성을 위해 일단은 일반 패와 같이 표현합니다.
        // 클라이언트에서 isRed 플래그를 보고 구분해서 렌더링해야 합니다.
        return `${this.rank}${this.suit}`
    }
}
