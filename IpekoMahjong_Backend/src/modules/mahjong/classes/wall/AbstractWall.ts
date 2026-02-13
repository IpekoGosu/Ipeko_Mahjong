import { Tile } from '@src/modules/mahjong/classes/tile.class'

export abstract class AbstractWall {
    protected tiles: Tile[] = []
    protected deadWall: Tile[] = []
    protected dora: Tile[] = []

    constructor() {
        this.initialize()
    }

    protected abstract initialize(): void

    public shuffle(): void {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]]
        }
    }

    public separateDeadWall(): void {
        if (this.tiles.length > 14) {
            this.deadWall = this.tiles.splice(-14)
        }
    }

    public replenishDeadWall(): void {
        if (this.tiles.length > 0) {
            const tile = this.tiles.pop()
            if (tile) {
                this.deadWall.push(tile)
            }
        }
    }

    public revealDora(): void {
        const index = 4 + this.dora.length
        if (index < this.deadWall.length) {
            this.dora.push(this.deadWall[index])
        }
    }

    public getUradora(): Tile[] {
        return this.dora
            .map((d) => {
                const idx = this.deadWall.indexOf(d)
                if (idx !== -1 && idx + 1 < this.deadWall.length) {
                    return this.deadWall[idx + 1]
                }
                return null
            })
            .filter((t): t is Tile => t !== null)
    }

    public draw(): Tile | null {
        if (this.tiles.length === 0) {
            return null
        }
        return this.tiles.shift() as Tile
    }

    public drawReplacement(): Tile | null {
        if (this.deadWall.length === 0) return null
        const tile = this.deadWall.shift()
        this.replenishDeadWall()
        return tile || null
    }

    public getRemainingTiles(): number {
        return this.tiles.length
    }

    public getDora(): Tile[] {
        return this.dora
    }

    public getRemainingDeadWall(): number {
        return this.deadWall.length
    }
}
