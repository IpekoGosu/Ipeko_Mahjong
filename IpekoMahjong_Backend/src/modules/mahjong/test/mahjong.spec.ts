import { Wall } from '../classes/wall.class'
import { Player } from '../classes/player.class'
import { Tile } from '../classes/tile.class'
import Riichi from 'riichi'
import { RiichiResult } from '../interfaces/mahjong.types'

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
        const wall1Tiles = (wall1 as unknown as { tiles: Tile[] }).tiles
            .map((t) => t.id)
            .join('')
        const wall2Tiles = (wall2 as unknown as { tiles: Tile[] }).tiles
            .map((t) => t.id)
            .join('')

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

describe('Riichi Logic (via library)', () => {
    it('should return correct shanten for a tenpai hand', () => {
        // Hand: 123m 456m 789m 11z 22z (Waiting for pair? No, already pair. Tenpai.)
        const handString = '123m456m789m11z22z'
        const result = new Riichi(handString).calc() as RiichiResult
        expect(result.hairi?.now).toBe(0)
    })

    it('should return correct shanten for a non-tenpai hand', () => {
        // Hand: 124578m3467p123s
        const handString = '124578m3467p123s'
        const result = new Riichi(handString).calc() as RiichiResult
        // 124578m 3467p 123s
        // 123s is 1 mentsu.
        // 3467p -> 34p (taatsu), 67p (taatsu)?
        // 124578m -> 12m, 45m, 78m?
        // This hand is a bit complex, let's trust the value 3 from original test
        expect(result.hairi?.now).toBe(3)
    })

    it('should return true for a winning hand', () => {
        // Hand: 1112345678999s + 1s (14 tiles)
        const handString = '1112345678999s1s'
        const result = new Riichi(handString).calc() as RiichiResult
        expect(result.isAgari).toBe(true)
    })

    it('should return false for a non-winning hand', () => {
        const handString = '123456789m123p'
        const result = new Riichi(handString).calc() as RiichiResult
        expect(result.isAgari).toBe(false)
    })

    it('should return true for a tenpai hand', () => {
        const handString = '1112345678999s'
        const result = new Riichi(handString).calc() as RiichiResult
        expect(result.hairi?.now).toBe(0)
    })

    it('should return false for a non-tenpai hand', () => {
        const handString = '124578m3467p123s'
        const result = new Riichi(handString).calc() as RiichiResult
        expect(result.hairi?.now).not.toBe(0)
    })
})
