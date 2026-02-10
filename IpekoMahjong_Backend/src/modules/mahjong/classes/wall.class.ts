import { Tile } from './tile.class'
import { Suit } from '../interfaces/mahjong.types'

export class Wall {
    private tiles: Tile[] = []
    private deadWall: Tile[] = []
    private dora: Tile[] = []

    constructor() {
        this.initialize()
    }

    private initialize(): void {
        this.tiles = []
        const suits: Suit[] = ['m', 'p', 's', 'z']
        let tileIndex = 0

        for (const suit of suits) {
            const maxRank = suit === 'z' ? 7 : 9
            for (let rank = 1; rank <= maxRank; rank++) {
                for (let i = 0; i < 4; i++) {
                    // 아카도라(Red Five) 설정
                    const isRed =
                        (suit === 'm' || suit === 'p' || suit === 's') &&
                        rank === 5 &&
                        i === 0
                    this.tiles.push(new Tile(suit, rank, isRed, tileIndex++))
                }
            }
        }
    }

    shuffle(): void {
        // Fisher-Yates Shuffle
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]]
        }
    }

    separateDeadWall(): void {
        // 14장의 왕패(Dead Wall)를 분리합니다.
        if (this.tiles.length > 14) {
            this.deadWall = this.tiles.splice(-14)
        }
    }

    replenishDeadWall(): void {
        // Live wall usually pops from the end to replenish dead wall
        // Standard Mahjong: Dead wall slides, consuming the last tile of live wall.
        if (this.tiles.length > 0) {
            const tile = this.tiles.pop()
            if (tile) {
                this.deadWall.push(tile)
            }
        }
    }

    revealDora(): void {
        // Dora indicators are at index 4, 6, 8, 10, 12 relative to the current dead wall state
        // But since we SHIFT the dead wall on Kan, the indices shift.
        // Logic:
        // 0 Kans: Index 4.
        // 1 Kan: Shifted once. Next dora (was 6) is at 5.
        // 2 Kans: Shifted twice. Next dora (was 8) is at 6.
        // Formula: 4 + current_dora_count
        const index = 4 + this.dora.length
        if (index < this.deadWall.length) {
            this.dora.push(this.deadWall[index])
        }
    }

    getUradora(): Tile[] {
        // For each revealed dora, find its pair (the tile immediately following it in dead wall)
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

    draw(): Tile | null {
        if (this.tiles.length === 0) {
            return null
        }
        return this.tiles.shift() as Tile
    }

    drawReplacement(): Tile | null {
        // Draw from the "Rinshan" area of Dead Wall (Start of dead wall)
        if (this.deadWall.length === 0) return null

        // Take from index 0 (Rinshan)
        const tile = this.deadWall.shift()

        // Maintain 14 tiles in dead wall
        this.replenishDeadWall()

        return tile || null
    }

    getRemainingTiles(): number {
        return this.tiles.length
    }

    getDora(): Tile[] {
        return this.dora
    }

    getRemainingDeadWall(): number {
        return this.deadWall.length
    }
}
