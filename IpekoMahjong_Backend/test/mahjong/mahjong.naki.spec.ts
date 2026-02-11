import { MahjongGame } from '@src/modules/mahjong/classes/mahjong.game.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { SimpleAI } from '@src/modules/mahjong/ai/simple.ai'

class TestPlayer extends Player {
    public setHand(tiles: Tile[]) {
        this.hand = tiles
    }
}

class TestMahjongGame extends MahjongGame {
    protected createPlayer(info: { id: string; isAi: boolean }): Player {
        const player = new TestPlayer(info.id, false, info.isAi)
        if (info.isAi) {
            player.ai = new SimpleAI()
        }
        return player
    }
}

describe('MahjongGame Naki (Call) System', () => {
    let game: TestMahjongGame
    const roomId = 'test-room'

    beforeEach(() => {
        // Player 0: Human
        // Player 1, 2, 3: AI
        game = new TestMahjongGame([
            { id: 'human', isAi: false },
            { id: 'ai1', isAi: true },
            { id: 'ai2', isAi: true },
            { id: 'ai3', isAi: true },
        ])

        // Mock start game to initialize
        game.startGame(roomId)
    })

    it('should detect PON opportunity', () => {
        const human = game.getPlayer('human')
        expect(human).toBeDefined()
        if (!human) return // Force human hand to have two 1m (Man)
        ;(human as TestPlayer).setHand([
            new Tile('m', 1, false, 0),
            new Tile('m', 1, false, 1),
            new Tile('p', 1, false, 2),
            new Tile('p', 2, false, 3),
            new Tile('p', 3, false, 4),
            new Tile('s', 1, false, 5),
            new Tile('s', 2, false, 6),
            new Tile('s', 3, false, 7),
            new Tile('z', 1, false, 8),
            new Tile('z', 1, false, 9),
            new Tile('z', 2, false, 10),
            new Tile('z', 2, false, 11),
            new Tile('z', 3, false, 12),
        ])

        // AI1 discards 1m
        const actions = game.getPossibleActions('ai1', '1m')

        const humanActions = actions['human']
        expect(humanActions).toBeDefined()
        if (humanActions) {
            expect(humanActions.pon).toBe(true)
        }
    })

    it('should detect RON opportunity', () => {
        const human = game.getPlayer('human')
        expect(human).toBeDefined()
        if (!human)
            return // Set up Tenpai on 1z (East) - Shanpon wait with 2z
            // Hand: 111m 234m 567m 11z 22z
        ;(human as TestPlayer).setHand([
            new Tile('m', 1, false, 0),
            new Tile('m', 1, false, 1),
            new Tile('m', 1, false, 2),
            new Tile('m', 2, false, 3),
            new Tile('m', 3, false, 4),
            new Tile('m', 4, false, 5),
            new Tile('m', 5, false, 6),
            new Tile('m', 6, false, 7),
            new Tile('m', 7, false, 8),
            new Tile('z', 1, false, 9),
            new Tile('z', 1, false, 10),
            new Tile('z', 2, false, 11),
            new Tile('z', 2, false, 12),
        ])

        // AI1 discards 1z (East)
        const actions = game.getPossibleActions('ai1', '1z')

        const humanActions = actions['human']
        expect(humanActions).toBeDefined()
        if (humanActions) {
            expect(humanActions.ron).toBe(true)
        }
    })
})
