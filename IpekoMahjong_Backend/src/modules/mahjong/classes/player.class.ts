import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Meld } from '@src/modules/mahjong/interfaces/mahjong.types'
import { Logger } from '@nestjs/common'
import { MahjongAI } from '@src/modules/mahjong/classes/ai/MahjongAI'

export class Player {
    private readonly logger = new Logger(Player.name)
    protected readonly _id: string
    protected _isOya: boolean
    readonly isAi: boolean
    public ai?: MahjongAI
    protected _hand: Tile[] = []
    protected _discards: Tile[] = []
    protected _melds: Meld[] = []
    protected _lastDrawnTile: Tile | null = null
    protected _isRiichi: boolean = false
    protected _isDoubleRiichi: boolean = false
    protected _ippatsuEligible: boolean = false
    protected _riichiDeclarationTurn: number | null = null
    protected _isFuriten: boolean = false
    protected _isTemporaryFuriten: boolean = false
    protected _isRiichiFuriten: boolean = false
    protected _isNagashiEligible: boolean = true
    protected _points: number = 25000
    protected _initialSeatIndex?: number
    protected _forbiddenDiscard: string[] = []

    constructor(id: string, isOya: boolean = false, isAi: boolean = false) {
        this._id = id
        this._isOya = isOya
        this.isAi = isAi
    }

    // Getters and Setters
    get isOya(): boolean {
        return this._isOya
    }
    set isOya(value: boolean) {
        this._isOya = value
    }

    get lastDrawnTile(): Tile | null {
        return this._lastDrawnTile
    }
    set lastDrawnTile(value: Tile | null) {
        this._lastDrawnTile = value
    }

    get isRiichi(): boolean {
        return this._isRiichi
    }
    set isRiichi(value: boolean) {
        this._isRiichi = value
    }

    get isDoubleRiichi(): boolean {
        return this._isDoubleRiichi
    }
    set isDoubleRiichi(value: boolean) {
        this._isDoubleRiichi = value
    }

    get ippatsuEligible(): boolean {
        return this._ippatsuEligible
    }
    set ippatsuEligible(value: boolean) {
        this._ippatsuEligible = value
    }

    get riichiDeclarationTurn(): number | null {
        return this._riichiDeclarationTurn
    }
    set riichiDeclarationTurn(value: number | null) {
        this._riichiDeclarationTurn = value
    }

    get isFuriten(): boolean {
        return this._isFuriten
    }
    set isFuriten(value: boolean) {
        this._isFuriten = value
    }

    get isTemporaryFuriten(): boolean {
        return this._isTemporaryFuriten
    }
    set isTemporaryFuriten(value: boolean) {
        this._isTemporaryFuriten = value
    }

    get isRiichiFuriten(): boolean {
        return this._isRiichiFuriten
    }
    set isRiichiFuriten(value: boolean) {
        this._isRiichiFuriten = value
    }

    get isNagashiEligible(): boolean {
        return this._isNagashiEligible
    }
    set isNagashiEligible(value: boolean) {
        this._isNagashiEligible = value
    }

    get points(): number {
        return this._points
    }
    set points(value: number) {
        this._points = value
    }

    get initialSeatIndex(): number | undefined {
        return this._initialSeatIndex
    }
    set initialSeatIndex(value: number | undefined) {
        this._initialSeatIndex = value
    }

    get forbiddenDiscard(): string[] {
        return this._forbiddenDiscard
    }
    set forbiddenDiscard(value: string[]) {
        this._forbiddenDiscard = value
    }

    resetKyokuState(): void {
        this._hand = []
        this._discards = []
        this._melds = []
        this._lastDrawnTile = null
        this._isRiichi = false
        this._isDoubleRiichi = false
        this._ippatsuEligible = false
        this._riichiDeclarationTurn = null
        this._isFuriten = false
        this._isTemporaryFuriten = false
        this._isRiichiFuriten = false
        this._isNagashiEligible = true
        this._forbiddenDiscard = []
    }

    isHandClosed(): boolean {
        return this._melds.every((m) => !m.opened)
    }

    get id(): string {
        return this._id
    }

    get hand(): Tile[] {
        return [...this._hand]
    }
    set hand(value: Tile[]) {
        this._hand = value
    }

    get melds(): Meld[] {
        return [...this._melds]
    }

    get discards(): Tile[] {
        return [...this._discards]
    }
    set discards(value: Tile[]) {
        this._discards = value
    }

    draw(tile: Tile): void {
        if (tile) {
            this._hand.push(tile)
            this._lastDrawnTile = tile
            this.sortHand()
        }
    }

    discard(tileString: string): Tile | null {
        const tileIndex = this._hand.findIndex(
            (t) => t.toString() === tileString,
        )

        if (tileIndex === -1) {
            this.logger.error(
                `Player ${this._id} does not have tile ${tileString}`,
            )
            return null // Tile not in hand
        }

        const [discardedTile] = this._hand.splice(tileIndex, 1)
        this._discards.push(discardedTile)
        this._lastDrawnTile = null // Reset after discard
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
        if (this._lastDrawnTile) {
            const idx = tilesToSort.findIndex(
                (t) => t.id === this._lastDrawnTile!.id,
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
