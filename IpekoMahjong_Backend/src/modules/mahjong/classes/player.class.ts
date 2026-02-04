import { Tile } from './tile.class'
import { Meld } from '../interfaces/mahjong.types'
import { MahjongAI } from '../ai/mahjong-ai.interface'

export class Player {
    private readonly id: string
    public readonly isOya: boolean
    readonly isAi: boolean
    public ai?: MahjongAI
    private hand: Tile[] = []
    private discards: Tile[] = []
    private melds: Meld[] = []
    public lastDrawnTile: Tile | null = null
    public isRiichi: boolean = false
    public isDoubleRiichi: boolean = false
    public ippatsuEligible: boolean = false
    public riichiDeclarationTurn: number | null = null
    public isFuriten: boolean = false
    public points: number = 25000

    constructor(id: string, isOya: boolean = false, isAi: boolean = false) {
        this.id = id
        this.isOya = isOya
        this.isAi = isAi
    }

    // ... (keep existing methods)

    isHandClosed(): boolean {
        return this.melds.every((m) => !m.opened)
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
        const index = this.discards.findIndex(
            (t) => t.toString() === tileString,
        )
        if (index !== -1) {
            return this.discards.splice(index, 1)[0]
        }
        return null
    }

    addMeld(meld: Meld): void {
        this.melds.push(meld)
    }

    getHandStringForRiichi(): string {
        // Concealed tiles are those currently in this.hand
        const handTiles = this.getHand()
        let tilesToSort = [...handTiles]

        let lastTileStr = ''

        // If we have a drawn tile (Tsumo case), we must place it at the end
        // for the riichi library to correctly identify it as the agari tile.
        if (this.lastDrawnTile) {
            const idx = tilesToSort.findIndex(
                (t) => t.id === this.lastDrawnTile!.id,
            )
            if (idx !== -1) {
                const [lastTile] = tilesToSort.splice(idx, 1)
                lastTileStr = lastTile.toString()
            }
        }

        const handMap: Record<string, string[]> = { m: [], p: [], s: [], z: [] }
        tilesToSort.forEach((t) => {
            const s = t.toString()
            handMap[t.getSuit()].push(s[0])
        })

        let handString = ''
        ;(['m', 'p', 's', 'z'] as const).forEach((suit) => {
            if (handMap[suit].length > 0) {
                handString += handMap[suit].sort().join('') + suit
            }
        })

        return handString + lastTileStr
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
