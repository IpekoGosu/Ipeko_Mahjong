import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'

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

    static parseRank(tileString: string): number {
        const rank = parseInt(tileString[0])
        return rank === 0 ? 5 : rank
    }

    toString(): string {
        // Aka Dora (Red Five) is represented as '0' for rank in many riichi libraries,
        // including the one we use for calculation.
        const displayRank = this.isRed ? '0' : this.rank
        return `${displayRank}${this.suit}`
    }
}
