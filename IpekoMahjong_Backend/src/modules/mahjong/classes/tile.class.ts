import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'

export class Tile {
    private readonly id: string
    private readonly suit: Suit
    private readonly rank: number
    private readonly isRed: boolean

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

    getId(): string {
        return this.id
    }

    getIsRed(): boolean {
        return this.isRed
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

    equals(other: Tile): boolean {
        return (
            this.suit === other.suit &&
            this.rank === other.rank &&
            this.isRed === other.isRed
        )
    }

    equalsIgnoreRed(other: Tile): boolean {
        return this.suit === other.suit && this.rank === other.rank
    }

    static fromString(tileString: string, index: number = 0): Tile {
        const suit = tileString[1] as Suit
        const rankStr = tileString[0]
        const isRed = rankStr === '0'
        const rank = isRed ? 5 : parseInt(rankStr)
        return new Tile(suit, rank, isRed, index)
    }

    /**
     * Returns the string representation of the tile, ignoring its red status.
     * e.g., both '0m' and '5m' will return '5m'.
     */
    toIgnoreRedString(): string {
        return `${this.rank}${this.suit}`
    }

    isHonor(): boolean {
        return this.suit === 'z'
    }

    isTerminal(): boolean {
        return this.suit !== 'z' && (this.rank === 1 || this.rank === 9)
    }

    isTerminalOrHonor(): boolean {
        return this.isHonor() || this.isTerminal()
    }

    static getDoraFromIndicator(
        indicator: string,
        isSanma: boolean = false,
    ): string {
        const rankStr = indicator[0]
        const suit = indicator[1]
        const rank = rankStr === '0' ? 5 : parseInt(rankStr)

        if (suit === 'z') {
            if (rank <= 4) {
                // Winds: E->S->W->N->E (1->2->3->4->1)
                return `${(rank % 4) + 1}z`
            } else {
                // Dragons: White->Green->Red->White (5->6->7->5)
                return rank === 7 ? '5z' : `${rank + 1}z`
            }
        } else {
            if (isSanma && suit === 'm') {
                return rank === 1 ? '9m' : '1m'
            }
            // Numbers: 1-9-1
            return `${(rank % 9) + 1}${suit}`
        }
    }
}
