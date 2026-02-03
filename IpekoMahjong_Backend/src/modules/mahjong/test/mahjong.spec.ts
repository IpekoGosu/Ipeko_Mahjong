import { Wall } from '../classes/wall.class'
import { Player } from '../classes/player.class'
import { Tile } from '../classes/tile.class'
import { RuleManager } from '../classes/rule.manager'

describe('Wall', () => {
    let wall: Wall

    beforeEach(() => {
        wall = new Wall()
    })

    it('should have 136 tiles on initialization', () => {
        expect(wall.getRemainingTiles()).toBe(136)
    })

    it('should shuffle the tiles', () => {
        const wall1 = new Wall()
        const wall2 = new Wall()

        // Of course, there is a small chance that the order is the same
        wall2.shuffle()

        // Note: private property access for testing purposes
        const wall1Tiles = (wall1 as any).tiles.map((t: any) => t.id).join('')
        const wall2Tiles = (wall2 as any).tiles.map((t: any) => t.id).join('')

        expect(wall1Tiles).not.toEqual(wall2Tiles)
    })
})

describe('Player', () => {
    let player: Player

    beforeEach(() => {
        player = new Player('p1')
    })

    it('should draw a tile and sort the hand', () => {
        player.draw(new Tile('m', 3, false, 0))
        player.draw(new Tile('m', 1, false, 1))
        expect(player.getHand().map((t) => t.toString())).toEqual(['1m', '3m'])
    })

    it('should discard a tile', () => {
        const tile = new Tile('p', 5, false, 0)
        player.draw(tile)
        const discarded = player.discard(tile.toString())
        expect(discarded).toEqual(tile)
        expect(player.getHand().length).toBe(0)
        expect(player.getDiscards().length).toBe(1)
    })

    it('should return the correct hand string', () => {
        player.draw(new Tile('s', 9, false, 0))
        player.draw(new Tile('z', 1, false, 1))
        player.draw(new Tile('p', 2, false, 2))
        // Player sorting logic: suit (m, p, s, z) then rank
        // p, s, z -> 2p9s1z
        expect(player.getHandString()).toBe('2p9s1z')
    })
})

describe('RuleManager', () => {
    let ruleManager: RuleManager

    it('should return correct shanten for a tenpai hand', () => {
        // Hand: 123m 456m 789m 11z 2z (Waiting for 2z)
        const handString = '123m456m789m11z2z'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkShanten()).toBe(0)
    })

    it('should return correct shanten for a non-tenpai hand', () => {
        // Hand: 124578m3467p123s
        const handString = '124578m3467p123s'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkShanten()).toBe(3)
    })

    it('should return true for a winning hand', () => {
        // Hand: 1112345678999s + 1s (14 tiles)
        const handString = '1112345678999s1s'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkWin()).toBe(true)
    })

    it('should return false for a non-winning hand', () => {
        const handString = '123456789m123p'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkWin()).toBe(false)
    })

    it('should return true for a tenpai hand', () => {
        const handString = '1112345678999s'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkTenpai()).toBe(true)
    })

    it('should return false for a non-tenpai hand', () => {
        const handString = '124578m3467p123s'
        ruleManager = new RuleManager(handString)
        expect(ruleManager.checkTenpai()).toBe(false)
    })
})