import { MahjongGame } from '@src/modules/mahjong/classes/AbstractMahjongGame'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

describe('MahjongGame Naki (Call) System', () => {
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

    it('should detect PON opportunity', () => {
        const p1 = game.getPlayer('p1')!
        p1.resetKyokuState()
        // Give p1 two 1m
        p1.draw(new Tile('m', 1, false, 0))
        p1.draw(new Tile('m', 1, false, 1))

        // p2 discards 1m
        const actions = game.actionManager.getPossibleActions(
            'p2',
            '1m',
            game.getPlayers(),
            game.getWall(),
            game.roundManager,
        )

        expect(actions['p1']?.pon).toBe(true)
    })

    it('should detect RON opportunity', () => {
        const p1 = game.getPlayer('p1')!
        p1.resetKyokuState()
        // Give p1 a tenpai hand waiting for 1m
        // 23m 456m 789m 111p 22z
        // Let's just use verifyRon directly or setup hand
        const tiles = [
            new Tile('m', 2, false, 0),
            new Tile('m', 3, false, 1),
            new Tile('m', 4, false, 2),
            new Tile('m', 5, false, 3),
            new Tile('m', 6, false, 4),
            new Tile('m', 7, false, 5),
            new Tile('m', 8, false, 6),
            new Tile('m', 9, false, 7),
            new Tile('p', 1, false, 8),
            new Tile('p', 1, false, 9),
            new Tile('p', 1, false, 10),
            new Tile('z', 2, false, 11),
            new Tile('z', 2, false, 12),
        ]
        tiles.forEach((t) => p1.draw(t))

        const actions = game.getPossibleActions('p2', '1m')
        expect(actions['p1']?.ron).toBe(true)
    })
})
