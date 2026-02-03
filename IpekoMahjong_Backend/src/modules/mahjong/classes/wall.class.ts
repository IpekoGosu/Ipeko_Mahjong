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

    revealDora(): void {
        // 첫 도라패를 공개합니다. 왕패의 5번째 패 (인덱스 4)
        if (this.deadWall.length >= 5) {
            this.dora.push(this.deadWall[4])
        }
    }

    draw(): Tile | null {
        if (this.tiles.length === 0) {
            return null
        }
        return this.tiles.shift() as Tile
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
