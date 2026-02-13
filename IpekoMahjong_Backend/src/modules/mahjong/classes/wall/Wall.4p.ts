import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'
import { AbstractWall } from '@src/modules/mahjong/classes/wall/AbstractWall'

export class Wall4p extends AbstractWall {
    protected initialize(): void {
        this.tiles = []
        const suits: Suit[] = ['m', 'p', 's', 'z']
        let tileIndex = 0

        for (const suit of suits) {
            const maxRank = suit === 'z' ? 7 : 9
            for (let rank = 1; rank <= maxRank; rank++) {
                for (let i = 0; i < 4; i++) {
                    const isRed =
                        (suit === 'm' || suit === 'p' || suit === 's') &&
                        rank === 5 &&
                        i === 0
                    this.tiles.push(new Tile(suit, rank, isRed, tileIndex++))
                }
            }
        }
    }
}
