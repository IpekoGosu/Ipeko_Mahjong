import { Tile } from './tile.class'
import { Suit } from '../interfaces/mahjong.types'
import { AbstractWall } from './AbstractWall'

export class WallSanma extends AbstractWall {
    protected initialize(): void {
        this.tiles = []
        const suits: Suit[] = ['m', 'p', 's', 'z']
        let tileIndex = 0

        for (const suit of suits) {
            const maxRank = suit === 'z' ? 7 : 9
            for (let rank = 1; rank <= maxRank; rank++) {
                // Sanma: Remove 2-8 of Manzu
                if (suit === 'm' && rank >= 2 && rank <= 8) continue

                for (let i = 0; i < 4; i++) {
                    const isRed =
                        (suit === 'p' || suit === 's') && rank === 5 && i === 0
                    // Note: No red 5m in Sanma usually, as 5m is removed
                    this.tiles.push(new Tile(suit, rank, isRed, tileIndex++))
                }
            }
        }
    }
}
