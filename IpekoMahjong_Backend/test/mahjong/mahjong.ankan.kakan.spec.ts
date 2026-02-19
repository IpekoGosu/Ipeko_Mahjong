import { MahjongGame } from '@src/modules/mahjong/classes/game/MahjongGame.4p'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'
import { createTestGame } from './test_utils'
import { Meld } from '@src/modules/mahjong/interfaces/mahjong.types'

describe('Ankan and Kakan Logic', () => {
    let game: MahjongGame
    let player: Player
    let ruleManager: RuleManager

    beforeEach(() => {
        const ai = new SimpleAI()
        game = createTestGame([
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: true, ai },
            { id: 'p3', isAi: true, ai },
            { id: 'p4', isAi: true, ai },
        ])
        ruleManager = game.ruleManager
        game.startGame('room1')
        player = game.getCurrentTurnPlayer()
        player.resetKyokuState()
    })

    it('should identify Ankan option', () => {
        // Give player four 1m
        player.draw(new Tile('m', 1, false, 0))
        player.draw(new Tile('m', 1, false, 1))
        player.draw(new Tile('m', 1, false, 2))
        player.draw(new Tile('m', 1, false, 3))
        player.draw(new Tile('p', 1, false, 4)) // filler

        const options = ruleManager.getAnkanOptions(player)
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
        player.draw(new Tile('p', 5, false, 3))
        player.draw(new Tile('m', 1, false, 4))

        const options = ruleManager.getKakanOptions(player)
        expect(options).toContain('5p')
    })

    it('should perform Ankan correctly', () => {
        // Setup hand
        player.draw(new Tile('s', 2, false, 0))
        player.draw(new Tile('s', 2, false, 1))
        player.draw(new Tile('s', 2, false, 2))
        player.draw(new Tile('s', 2, false, 3))
        player.draw(new Tile('z', 1, false, 4))

        game.performAction('room1', player.getId(), 'ankan', '2s')

        // Check meld
        expect(player.getMelds().length).toBe(1)
        expect(player.getMelds()[0].type).toBe('ankan')
        expect(player.getMelds()[0].opened).toBe(false)
        expect(player.getMelds()[0].tiles.length).toBe(4)

        // Check hand reduced (4 removed, 1 replacement drawn)
        // Hand size: Started 5. Removed 4 -> 1. Drew 1 -> 2.
        expect(player.getHand().length).toBe(2)
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
        player.draw(new Tile('z', 5, false, 3))
        player.draw(new Tile('m', 1, false, 4))

        game.performAction('room1', player.getId(), 'kakan', '5z')

        // Check meld updated
        expect(player.getMelds().length).toBe(1)
        expect(player.getMelds()[0].type).toBe('kakan')
        expect(player.getMelds()[0].tiles.length).toBe(4)

        // Check hand reduced (1 removed, 1 replacement drawn)
        // Hand size: Started 2. Removed 1 -> 1. Drew 1 -> 2.
        expect(player.getHand().length).toBe(2)
    })
})
