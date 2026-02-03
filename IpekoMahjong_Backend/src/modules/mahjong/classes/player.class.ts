import { Tile } from './tile.class'

// Meld is not used in Phase 2 yet, so we can define a simple interface for it.
export interface Meld {
    type: 'chi' | 'pon' | 'kan'
    tiles: Tile[]
}

export class Player {
    private readonly id: string
    public readonly isOya: boolean
    readonly isAi: boolean
    private hand: Tile[] = []
    private discards: Tile[] = []
    private melds: Meld[] = []
    public lastDrawnTile: Tile | null = null
    public isRiichi: boolean = false
    public isDoubleRiichi: boolean = false
    public ippatsuEligible: boolean = false
    public riichiDeclarationTurn: number | null = null

    constructor(id: string, isOya: boolean = false, isAi: boolean = false) {
        this.id = id
        this.isOya = isOya
        this.isAi = isAi
    }

    // ... (rest of the methods are the same)

    getId(): string {
        return this.id
    }

    getHand(): Tile[] {
        return [...this.hand]
    }

    getMelds(): Meld[] {
        return [...this.melds]
    }

    getDiscards(): Tile[] {
        return [...this.discards]
    }

    draw(tile: Tile): void {
        if (tile) {
            this.hand.push(tile)
            this.lastDrawnTile = tile
            this.sortHand()
        }
    }

    discard(tileString: string): Tile | null {
        const tileIndex = this.hand.findIndex(
            (t) => t.toString() === tileString,
        )

        if (tileIndex === -1) {
            console.error(`Player ${this.id} does not have tile ${tileString}`)
            return null // Tile not in hand
        }

        const [discardedTile] = this.hand.splice(tileIndex, 1)
        this.discards.push(discardedTile)
        this.lastDrawnTile = null // Reset after discard
        return discardedTile
    }

    removeTiles(tileStrings: string[]): Tile[] {
        const removed: Tile[] = []
        for (const s of tileStrings) {
            const idx = this.hand.findIndex((t) => t.toString() === s)
            if (idx !== -1) {
                removed.push(this.hand.splice(idx, 1)[0])
            }
        }
        return removed
    }

    removeDiscard(tileString: string): Tile | null {
        const index = this.discards.findIndex((t) => t.toString() === tileString)
        if (index !== -1) {
            return this.discards.splice(index, 1)[0]
        }
        return null
    }

    addMeld(meld: Meld): void {
        this.melds.push(meld)
    }

    getHandStringForRiichi(): string {
        return this.getFullHandString()
    }

    getFullHandString(): string {
        // For riichi check, we need to sort the string representation
        const handMap: Record<string, string[]> = { m: [], p: [], s: [], z: [] }
        this.hand.forEach((t) => {
            const s = t.toString()
            handMap[t.getSuit()].push(s[0])
        })

        let handString = ''
        ;(['m', 'p', 's', 'z'] as const).forEach((suit) => {
            if (handMap[suit].length > 0) {
                handString += handMap[suit].sort().join('') + suit
            }
        })
        return handString
    }
    getHandString(): string {
        return this.hand.map((tile) => tile.toString()).join('')
    }

    private sortHand(): void {
        this.hand.sort((a, b) => {
            if (a.getSuit() !== b.getSuit()) {
                return a.getSuit().localeCompare(b.getSuit())
            }
            return a.getRank() - b.getRank()
        })
    }
}
