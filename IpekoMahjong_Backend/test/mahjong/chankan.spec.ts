import { MahjongGame } from '@src/modules/mahjong/classes/mahjong.game.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

describe('Chankan (Robbing a Kan)', () => {
    let game: MahjongGame

    beforeEach(() => {
        game = new MahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true },
                { id: 'p3', isAi: true },
                { id: 'p4', isAi: true },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame('room1')
    })

    it('should detect RON (Chankan) when another player performs Kakan', () => {
        const p1 = game.getPlayer('p1')!
        const p2 = game.getPlayer('p2')!

        // 1. Setup p2 with a Pon of 1m
        p2.resetKyokuState()
        const ponTiles = [
            new Tile('m', 1, false, 0),
            new Tile('m', 1, false, 1),
            new Tile('m', 1, false, 2),
        ]
        p2.addMeld({ type: 'pon', tiles: ponTiles, opened: true })
        // p2 has the 4th 1m in hand to perform Kakan
        p2.draw(new Tile('m', 1, false, 3))

        // 2. Setup p1 with a tenpai hand waiting for 1m
        // Hand: 23m 456m 789m 111p 22z
        p1.resetKyokuState()
        const p1Tiles = [
            new Tile('m', 2, false, 10),
            new Tile('m', 3, false, 11),
            new Tile('m', 4, false, 12),
            new Tile('m', 5, false, 13),
            new Tile('m', 6, false, 14),
            new Tile('m', 7, false, 15),
            new Tile('m', 8, false, 16),
            new Tile('m', 9, false, 17),
            new Tile('p', 1, false, 18),
            new Tile('p', 1, false, 19),
            new Tile('p', 1, false, 20),
            new Tile('z', 2, false, 21),
            new Tile('z', 2, false, 22),
        ]
        p1Tiles.forEach((t) => p1.draw(t))

        // 3. p2 performs Kakan with 1m
        // We simulate what MahjongGame.performAction does but we check getPossibleActions with isKakan=true
        const actions = game.getPossibleActions('p2', '1m', true)

        expect(actions['p1']).toBeDefined()
        expect(actions['p1'].ron).toBe(true)
    })

    it('should not allow Pon/Chi/Kan on a Kakan', () => {
        const p1 = game.getPlayer('p1')!
        const p2 = game.getPlayer('p2')!

        // p2 performs Kakan 1m
        p2.resetKyokuState()
        p2.addMeld({
            type: 'pon',
            tiles: [
                new Tile('m', 1, false, 0),
                new Tile('m', 1, false, 1),
                new Tile('m', 1, false, 2),
            ],
            opened: true,
        })
        p2.draw(new Tile('m', 1, false, 3))

        // p1 has two 1m in hand (could normally Pon)
        p1.resetKyokuState()
        p1.draw(new Tile('m', 1, false, 4))
        p1.draw(new Tile('m', 1, false, 5))

        const actions = game.getPossibleActions('p2', '1m', true)

        // p1 cannot Pon a Kakan added tile
        if (actions['p1']) {
            expect(actions['p1'].pon).toBeUndefined()
        }
    })
})
