import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Meld } from '@src/modules/mahjong/interfaces/mahjong.types'
import { Logger } from '@nestjs/common'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

export class Player {
    private readonly logger = new Logger(Player.name)
    private readonly id: string
    public isOya: boolean
    readonly isAi: boolean
    public ai?: MahjongAI
    protected hand: Tile[] = []
    protected discards: Tile[] = []
    protected melds: Meld[] = []
    public lastDrawnTile: Tile | null = null
    public isRiichi: boolean = false
    public isDoubleRiichi: boolean = false
    public ippatsuEligible: boolean = false
    public riichiDeclarationTurn: number | null = null
    public isFuriten: boolean = false
    public isTemporaryFuriten: boolean = false
    public isRiichiFuriten: boolean = false
    public points: number = 25000
    public initialSeatIndex?: number
    public forbiddenDiscard: string | null = null

    constructor(id: string, isOya: boolean = false, isAi: boolean = false) {
        this.id = id
        this.isOya = isOya
        this.isAi = isAi
    }

    resetKyokuState(): void {
        this.hand = []
        this.discards = []
        this.melds = []
        this.lastDrawnTile = null
        this.isRiichi = false
        this.isDoubleRiichi = false
        this.ippatsuEligible = false
        this.riichiDeclarationTurn = null
        this.isFuriten = false
        this.isTemporaryFuriten = false
        this.isRiichiFuriten = false
        this.forbiddenDiscard = null
    }

    isHandClosed(): boolean {
        return this.melds.every((m) => !m.opened)
    }

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
            this.logger.error(
                `Player ${this.id} does not have tile ${tileString}`,
            )
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

    removeFromHand(tileString: string): Tile | null {
        const idx = this.hand.findIndex((t) => t.toString() === tileString)
        if (idx !== -1) {
            return this.hand.splice(idx, 1)[0]
        }
        return null
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

    upgradePonToKan(tileToUpgrade: string, addedTile: Tile): Meld | null {
        const rank =
            parseInt(tileToUpgrade[0]) === 0 ? 5 : parseInt(tileToUpgrade[0])
        const suit = tileToUpgrade[1]

        const meldIndex = this.melds.findIndex(
            (m) =>
                m.type === 'pon' &&
                m.tiles.some(
                    (t) => t.getRank() === rank && t.getSuit() === suit,
                ),
        )

        if (meldIndex !== -1) {
            const meld = this.melds[meldIndex]
            meld.tiles.push(addedTile)
            meld.type = 'kan'
            // Keep opened: true (Pon was open)
            return meld
        }
        return null
    }

    getHandStringForRiichi(): string {
        // Concealed tiles are those currently in this.hand
        const handTiles = this.getHand()
        const tilesToSort = [...handTiles]

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
