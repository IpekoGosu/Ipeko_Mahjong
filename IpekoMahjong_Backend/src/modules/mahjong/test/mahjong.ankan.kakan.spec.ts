import { MahjongGame } from '../classes/mahjong.game.class'
import { Tile } from '../classes/tile.class'
import { RuleManager } from '../classes/rule.manager'
import { Player } from '../classes/player.class'
import { Meld } from '../interfaces/mahjong.types'

describe('Ankan and Kakan Logic', () => {
    let game: MahjongGame
    let player: Player

    beforeEach(() => {
        game = new MahjongGame([
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: true },
            { id: 'p3', isAi: true },
            { id: 'p4', isAi: true },
        ])
        player = game.getPlayer('p1')!
    })

    it('should identify Ankan option', () => {
        // Give player four 1m
        const tiles = [
            new Tile('m', 1, false, 0),
            new Tile('m', 1, false, 1),
            new Tile('m', 1, false, 2),
            new Tile('m', 1, false, 3),
            new Tile('p', 1, false, 4), // filler
        ]
        // Override hand
        ;(player as unknown as { hand: Tile[] }).hand = tiles

        const options = RuleManager.getAnkanOptions(player)
        expect(options).toContain('1m')
    })

    it('should identify Kakan option', () => {
        // Give player a Pon of 5p
        const ponMeld: Meld = {
            type: 'pon',
            tiles: [
                new Tile('p', 5, false, 0),
                new Tile('p', 5, false, 1),
                new Tile('p', 5, false, 2),
            ],
            opened: true,
        }
        player.addMeld(ponMeld)

        // Give player the 4th 5p in hand
        ;(player as unknown as { hand: Tile[] }).hand = [
            new Tile('p', 5, false, 3),
            new Tile('m', 1, false, 4),
        ]

        const options = RuleManager.getKakanOptions(player)
        expect(options).toContain('5p')
    })

    it('should perform Ankan correctly', () => {
        // Setup hand
        ;(player as unknown as { hand: Tile[] }).hand = [
            new Tile('s', 2, false, 0),
            new Tile('s', 2, false, 1),
            new Tile('s', 2, false, 2),
            new Tile('s', 2, false, 3),
            new Tile('z', 1, false, 4),
        ]

        const update = game.performAction('room1', 'p1', 'ankan', '2s')

        // Check meld
        expect(player.getMelds().length).toBe(1)
        expect(player.getMelds()[0].type).toBe('kan')
        expect(player.getMelds()[0].opened).toBe(false)
        expect(player.getMelds()[0].tiles.length).toBe(4)

        // Check hand reduced (4 removed, 1 replacement drawn - wait, replacement is drawn in performAction)
        // Hand size: Started 5. Removed 4 -> 1. Drew 1 -> 2.
        // Wait, performAction draws replacement.
        expect(player.getHand().length).toBe(2)

        // Check Rinshan flag (internal state, hard to check directly without getter, but inferred by draw)
    })

    it('should perform Kakan correctly', () => {
        // Setup Pon
        const ponMeld: Meld = {
            type: 'pon',
            tiles: [
                new Tile('z', 5, false, 0),
                new Tile('z', 5, false, 1),
                new Tile('z', 5, false, 2),
            ],
            opened: true,
        }
        player.addMeld(ponMeld)

        // Setup hand
        ;(player as unknown as { hand: Tile[] }).hand = [
            new Tile('z', 5, false, 3),
            new Tile('m', 1, false, 4),
        ]

        game.performAction('room1', 'p1', 'kakan', '5z')

        // Check meld updated
        expect(player.getMelds().length).toBe(1)
        expect(player.getMelds()[0].type).toBe('kan')
        expect(player.getMelds()[0].tiles.length).toBe(4)

        // Check hand reduced (1 removed, 1 replacement drawn)
        // Hand size: Started 2. Removed 1 -> 1. Drew 1 -> 2.
        expect(player.getHand().length).toBe(2)
    })
})
