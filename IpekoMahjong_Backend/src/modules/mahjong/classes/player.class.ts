import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Meld } from '@src/modules/mahjong/interfaces/mahjong.types'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

export class Player {
    public isOya: boolean
    public ai?: MahjongAI
    protected _hand: Tile[] = []
    protected _discards: Tile[] = []
    protected _melds: Meld[] = []
    public lastDrawnTile: Tile | null = null
    public isRiichi: boolean = false
    public isDoubleRiichi: boolean = false
    public ippatsuEligible: boolean = false
    public riichiDeclarationTurn: number | null = null
    public isFuriten: boolean = false
    public isTemporaryFuriten: boolean = false
    public isRiichiFuriten: boolean = false
    public isNagashiEligible: boolean = true
    public points: number = 25000
    public initialSeatIndex?: number
    public forbiddenDiscard: string[] = []

    constructor(
        public readonly id: string,
        isOya: boolean = false,
        public readonly isAi: boolean = false,
        private readonly logger: WinstonLoggerService,
    ) {
        this.isOya = isOya
    }

    resetKyokuState(): void {
        this._hand = []
        this._discards = []
        this._melds = []
        this.lastDrawnTile = null
        this.isRiichi = false
        this.isDoubleRiichi = false
        this.ippatsuEligible = false
        this.riichiDeclarationTurn = null
        this.isFuriten = false
        this.isTemporaryFuriten = false
        this.isRiichiFuriten = false
        this.isNagashiEligible = true
        this.forbiddenDiscard = []
    }

    isHandClosed(): boolean {
        return this._melds.every((m) => !m.opened)
    }

    get hand(): Tile[] {
        return [...this._hand]
    }

    get melds(): Meld[] {
        return [...this._melds]
    }

    get discards(): Tile[] {
        return [...this._discards]
    }

    draw(tile: Tile): void {
        if (tile) {
            this._hand.push(tile)
            this.lastDrawnTile = tile
            this.sortHand()
        }
    }

    discard(tileString: string): Tile | null {
        const tileIndex = this._hand.findIndex(
            (t) => t.toString() === tileString,
        )

        if (tileIndex === -1) {
            this.logger.error(
                `Player ${this.id} does not have tile ${tileString}`,
                undefined,
                Player.name,
            )
            return null // Tile not in hand
        }

        const [discardedTile] = this._hand.splice(tileIndex, 1)
        this._discards.push(discardedTile)
        this.lastDrawnTile = null // Reset after discard
        return discardedTile
    }

    removeTiles(tileStrings: string[]): Tile[] {
        const removed: Tile[] = []
        for (const s of tileStrings) {
            const idx = this._hand.findIndex((t) => t.toString() === s)
            if (idx !== -1) {
                removed.push(this._hand.splice(idx, 1)[0])
            }
        }
        return removed
    }

    removeFromHand(tileString: string): Tile | null {
        const idx = this._hand.findIndex((t) => t.toString() === tileString)
        if (idx !== -1) {
            return this._hand.splice(idx, 1)[0]
        }
        return null
    }

    removeDiscard(tileString: string): Tile | null {
        const index = this._discards.findIndex(
            (t) => t.toString() === tileString,
        )
        if (index !== -1) {
            return this._discards.splice(index, 1)[0]
        }
        return null
    }

    addMeld(meld: Meld): void {
        this._melds.push(meld)
    }

    upgradePonToKan(tileToUpgrade: string, addedTile: Tile): Meld | null {
        const targetTile = Tile.fromString(tileToUpgrade)

        const meldIndex = this._melds.findIndex(
            (m) =>
                m.type === 'pon' &&
                m.tiles.some((t) => t.equalsIgnoreRed(targetTile)),
        )

        if (meldIndex !== -1) {
            const meld = this._melds[meldIndex]
            meld.tiles.push(addedTile)
            meld.type = 'kan'
            // Keep opened: true (Pon was open)
            return meld
        }
        return null
    }

    getHandStringForRiichi(): string {
        // Concealed tiles are those currently in this.hand
        const handTiles = this.hand
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
            handMap[t.suit].push(s[0])
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
        return this._hand.map((tile) => tile.toString()).join('')
    }

    private sortHand(): void {
        this._hand.sort((a, b) => {
            if (a.suit !== b.suit) {
                return a.suit.localeCompare(b.suit)
            }
            return a.rank - b.rank
        })
    }
}
