import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'

export class Tile {
    private readonly _id: string
    private readonly _suit: Suit
    private readonly _rank: number
    private readonly _isRed: boolean

    constructor(
        suit: Suit,
        rank: number,
        isRed: boolean = false,
        index: number,
    ) {
        this._suit = suit
        this._rank = rank
        this._isRed = isRed
        this._id = `${suit}_${rank}_${index}`
    }

    get suit(): Suit {
        return this._suit
    }

    get rank(): number {
        return this._rank
    }

    get id(): string {
        return this._id
    }

    get isRed(): boolean {
        return this._isRed
    }

    static parseRank(tileString: string): number {
        const rank = parseInt(tileString[0])
        return rank === 0 ? 5 : rank
    }

    toString(): string {
        // Aka Dora (Red Five) is represented as '0' for rank in many riichi libraries,
        // including the one we use for calculation.
        const displayRank = this._isRed ? '0' : this._rank
        return `${displayRank}${this._suit}`
    }

    equals(other: Tile): boolean {
        return (
            this._suit === other._suit &&
            this._rank === other._rank &&
            this._isRed === other._isRed
        )
    }

    equalsIgnoreRed(other: Tile): boolean {
        return this._suit === other._suit && this._rank === other._rank
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
        return `${this._rank}${this._suit}`
    }

    isHonor(): boolean {
        return this._suit === 'z'
    }

    isTerminal(): boolean {
        return this._suit !== 'z' && (this._rank === 1 || this._rank === 9)
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
