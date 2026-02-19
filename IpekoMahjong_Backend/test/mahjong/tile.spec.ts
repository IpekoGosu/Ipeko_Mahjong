import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { Suit } from '@src/modules/mahjong/interfaces/mahjong.types'

describe('Tile', () => {
    describe('equals', () => {
        it('should return true for identical tiles', () => {
            const tile1 = new Tile('m' as Suit, 5, false, 0)
            const tile2 = new Tile('m' as Suit, 5, false, 1)
            expect(tile1.equals(tile2)).toBe(true)
        })

        it('should return true for identical red tiles', () => {
            const tile1 = new Tile('p' as Suit, 5, true, 0)
            const tile2 = new Tile('p' as Suit, 5, true, 1)
            expect(tile1.equals(tile2)).toBe(true)
        })

        it('should return false for different ranks', () => {
            const tile1 = new Tile('s' as Suit, 1, false, 0)
            const tile2 = new Tile('s' as Suit, 2, false, 0)
            expect(tile1.equals(tile2)).toBe(false)
        })

        it('should return false for different suits', () => {
            const tile1 = new Tile('m' as Suit, 1, false, 0)
            const tile2 = new Tile('p' as Suit, 1, false, 0)
            expect(tile1.equals(tile2)).toBe(false)
        })

        it('should return false when one is red and the other is not', () => {
            const tile1 = new Tile('m' as Suit, 5, true, 0)
            const tile2 = new Tile('m' as Suit, 5, false, 0)
            expect(tile1.equals(tile2)).toBe(false)
        })
    })

    describe('equalsIgnoreRed', () => {
        it('should return true for identical tiles', () => {
            const tile1 = new Tile('m' as Suit, 5, false, 0)
            const tile2 = new Tile('m' as Suit, 5, false, 1)
            expect(tile1.equalsIgnoreRed(tile2)).toBe(true)
        })

        it('should return true even if red status differs', () => {
            const tile1 = new Tile('m' as Suit, 5, true, 0)
            const tile2 = new Tile('m' as Suit, 5, false, 1)
            expect(tile1.equalsIgnoreRed(tile2)).toBe(true)
        })

        it('should return false for different ranks', () => {
            const tile1 = new Tile('s' as Suit, 1, false, 0)
            const tile2 = new Tile('s' as Suit, 2, false, 0)
            expect(tile1.equalsIgnoreRed(tile2)).toBe(false)
        })

        it('should return false for different suits', () => {
            const tile1 = new Tile('m' as Suit, 1, false, 0)
            const tile2 = new Tile('p' as Suit, 1, false, 0)
            expect(tile1.equalsIgnoreRed(tile2)).toBe(false)
        })
    })

    describe('fromString', () => {
        it('should create a normal tile from string', () => {
            const tile = Tile.fromString('5m', 10)
            expect(tile.getSuit()).toBe('m')
            expect(tile.getRank()).toBe(5)
            expect(tile.isRed).toBe(false)
            expect(tile.id).toBe('m_5_10')
        })

        it('should create a red tile from string', () => {
            const tile = Tile.fromString('0s', 5)
            expect(tile.getSuit()).toBe('s')
            expect(tile.getRank()).toBe(5)
            expect(tile.isRed).toBe(true)
            expect(tile.id).toBe('s_5_5')
        })

        it('should create an honor tile from string', () => {
            const tile = Tile.fromString('1z', 1)
            expect(tile.getSuit()).toBe('z')
            expect(tile.getRank()).toBe(1)
            expect(tile.isRed).toBe(false)
        })
    })

    describe('toIgnoreRedString', () => {
        it('should return 5m for both normal and red 5m', () => {
            const tile1 = new Tile('m' as Suit, 5, false, 0)
            const tile2 = new Tile('m' as Suit, 5, true, 0)
            expect(tile1.toIgnoreRedString()).toBe('5m')
            expect(tile2.toIgnoreRedString()).toBe('5m')
        })
    })

    describe('helper methods', () => {
        it('isHonor should return true for z suit', () => {
            expect(new Tile('z' as Suit, 1, false, 0).isHonor()).toBe(true)
            expect(new Tile('m' as Suit, 1, false, 0).isHonor()).toBe(false)
        })

        it('isTerminal should return true for 1 and 9 of mps suits', () => {
            expect(new Tile('m' as Suit, 1, false, 0).isTerminal()).toBe(true)
            expect(new Tile('m' as Suit, 9, false, 0).isTerminal()).toBe(true)
            expect(new Tile('m' as Suit, 5, false, 0).isTerminal()).toBe(false)
            expect(new Tile('z' as Suit, 1, false, 0).isTerminal()).toBe(false)
        })

        it('isTerminalOrHonor should work correctly', () => {
            expect(new Tile('z' as Suit, 1, false, 0).isTerminalOrHonor()).toBe(
                true,
            )
            expect(new Tile('m' as Suit, 1, false, 0).isTerminalOrHonor()).toBe(
                true,
            )
            expect(new Tile('m' as Suit, 5, false, 0).isTerminalOrHonor()).toBe(
                false,
            )
        })
    })

    describe('getDoraFromIndicator', () => {
        it('should handle number suits correctly (4p)', () => {
            expect(Tile.getDoraFromIndicator('1m')).toBe('2m')
            expect(Tile.getDoraFromIndicator('9m')).toBe('1m')
            expect(Tile.getDoraFromIndicator('0m')).toBe('6m') // Red 5m
        })

        it('should handle Sanma Manzu rules correctly', () => {
            expect(Tile.getDoraFromIndicator('1m', true)).toBe('9m')
            expect(Tile.getDoraFromIndicator('9m', true)).toBe('1m')
            expect(Tile.getDoraFromIndicator('1p', true)).toBe('2p') // Other suits same
        })

        it('should handle winds correctly', () => {
            expect(Tile.getDoraFromIndicator('1z')).toBe('2z')
            expect(Tile.getDoraFromIndicator('2z')).toBe('3z')
            expect(Tile.getDoraFromIndicator('3z')).toBe('4z')
            expect(Tile.getDoraFromIndicator('4z')).toBe('1z')
        })

        it('should handle dragons correctly', () => {
            expect(Tile.getDoraFromIndicator('5z')).toBe('6z')
            expect(Tile.getDoraFromIndicator('6z')).toBe('7z')
            expect(Tile.getDoraFromIndicator('7z')).toBe('5z')
        })
    })
})
