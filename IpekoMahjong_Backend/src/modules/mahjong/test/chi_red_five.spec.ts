import { MahjongGame } from '../classes/mahjong.game.class'
import { Player } from '../classes/player.class'
import { Tile } from '../classes/tile.class'

describe('Chi Logic with Red Fives', () => {
    let game: MahjongGame
    let player: Player

    beforeEach(() => {
        game = new MahjongGame([
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: false },
        ])
        player = game.getPlayer('p1')!
        // Clear hand for setup
        const hand = player.getHand()
        if (hand.length > 0) {
            player.removeTiles(hand.map((t) => t.toString()))
        }
    })

    it('should offer Chi with Red Five (0s) when 6s is discarded', () => {
        // Setup hand: 0s (Red 5s), 7s
        const red5s = new Tile('s', 5, true, 0) // Red Five
        const tile7s = new Tile('s', 7, false, 1)
        player.draw(red5s)
        player.draw(tile7s)

        // Verify setup
        expect(player.getHand().map((t) => t.toString())).toContain('0s')
        expect(player.getHand().map((t) => t.toString())).toContain('7s')

        const options = game.checkChi(player, '6s')

        // Expect option to use '0s' and '7s'
        expect(options).toHaveLength(1)
        expect(options[0]).toEqual(expect.arrayContaining(['0s', '7s']))
    })

    it('should offer Chi with Normal Five (5s) when 6s is discarded', () => {
        // Setup hand: 5s, 7s
        const normal5s = new Tile('s', 5, false, 0)
        const tile7s = new Tile('s', 7, false, 1)
        player.draw(normal5s)
        player.draw(tile7s)

        const options = game.checkChi(player, '6s')

        expect(options).toHaveLength(1)
        expect(options[0]).toEqual(expect.arrayContaining(['5s', '7s']))
    })

    it('should offer multiple options if both Red Five and Normal Five are present', () => {
        // Setup hand: 0s, 5s, 7s
        const red5s = new Tile('s', 5, true, 0)
        const normal5s = new Tile('s', 5, false, 1)
        const tile7s = new Tile('s', 7, false, 2)
        player.draw(red5s)
        player.draw(normal5s)
        player.draw(tile7s)

        const options = game.checkChi(player, '6s')

        // Expect options: [0s, 7s] and [5s, 7s]
        expect(options).toHaveLength(2)
        const flatOptions = options.map((o: string[]) => [...o].sort().join(''))
        expect(flatOptions).toContain('0s7s')
        expect(flatOptions).toContain('5s7s')
    })

    it('should handle Red Five as discard (0s) treated as 5s', () => {
        // Setup hand: 4s, 6s
        const tile4s = new Tile('s', 4, false, 0)
        const tile6s = new Tile('s', 6, false, 1)
        player.draw(tile4s)
        player.draw(tile6s)

        const options = game.checkChi(player, '0s')

        expect(options).toHaveLength(1)
        expect(options[0]).toEqual(expect.arrayContaining(['4s', '6s']))
    })
})
