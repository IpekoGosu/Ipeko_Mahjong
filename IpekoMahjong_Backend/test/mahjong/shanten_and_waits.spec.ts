import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import { mockLogger } from './test_utils'
import Riichi from 'riichi'
import { RiichiResult } from '@src/modules/mahjong/interfaces/mahjong.types'

class MockTestPlayer extends Player {
    public setHand(tiles: Tile[]): void {
        this._hand = tiles
    }

    public setDiscards(tiles: Tile[]): void {
        this._discards = tiles
    }

    public addMeld(meld: {
        type: 'chi' | 'pon' | 'kan' | 'chakan' | 'ankan' | 'kakan'
        tiles: Tile[]
        opened: boolean
        stolenFrom?: string
    }): void {
        this._melds.push(meld)
    }
}

describe('Shanten and Waits Calculation (3p & 4p)', () => {
    let ruleManager: RuleManager

    beforeEach(() => {
        ruleManager = new RuleManager(mockLogger)
    })

    describe('Standard 4-Mentsu 1-Jantou Shanten Calculation', () => {
        it('should identify Agari (-1 shanten) for complete standard hand', () => {
            /* GEMINI THINKING */
            // 123m 456m 789m 11z 222z -> 14 tiles complete
            const handStr = '123456789m11222z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.isAgari).toBe(true)
            expect(result.hairi?.now).toBeUndefined()
        })

        it('should calculate 0 shanten (Tenpai) with Ryanmen (two-sided) wait', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 11z 23s -> waiting on 1s and 4s
            const handStr = '123m456p23789s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            expect(result.hairi?.wait).toBeDefined()
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1s')
            expect(waits).toContain('4s')
        })

        it('should calculate 0 shanten (Tenpai) with Kanchan (middle) wait', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 11z 24m -> waiting on 3m
            const handStr = '12324m456p789s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('3m')
        })

        it('should calculate 0 shanten (Tenpai) with Penchan (edge) wait', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 11z 12p -> waiting on 3p
            const handStr = '123m12456p789s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('3p')
        })

        it('should calculate 0 shanten (Tenpai) with Tanki (single) wait', () => {
            /* GEMINI THINKING */
            // 123m 456m 789m 123p 1z -> waiting on 1z
            const handStr = '123456789m123p1z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1z')
        })

        it('should calculate 0 shanten (Tenpai) with Shanpon (dual pair) wait', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 11z 22z -> waiting on 1z and 2z
            const handStr = '123m456p789s1122z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1z')
            expect(waits).toContain('2z')
        })

        it('should calculate multiple waits (Sanmenchan - 3-sided wait)', () => {
            /* GEMINI THINKING */
            // 123m 456p 11z 23456s -> waiting on 1s, 4s, 7s
            const handStr = '123m456p23456s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1s')
            expect(waits).toContain('4s')
            expect(waits).toContain('7s')
        })

        it('should identify 1 shanten (Iishanten)', () => {
            /* GEMINI THINKING */
            // 123m 456p 789s 1z 3z 4s 6s -> requires 2 tiles to win, 1 tile to tenpai
            const handStr = '123m456p46789s13z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(1)
        })

        it('should identify 2 shanten', () => {
            /* GEMINI THINKING */
            // 12345m 1278p 129s 11z (13 tiles, 2 shanten)
            const handStr = '12345m1278p129s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(2)
        })
    })

    describe('Special Hand Shanten (Chiitoitsu & Kokushi Musou)', () => {
        it('should identify Chiitoitsu Tenpai (0 shanten) with Tanki wait', () => {
            /* GEMINI THINKING */
            // 11m 33m 55p 77p 99s 11z 2z -> waiting on 2z
            const handStr = '1133m5577p99s112z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi7and13?.now).toBe(0)
            const waits = Object.keys(result.hairi7and13?.wait ?? {})
            expect(waits).toContain('2z')
        })

        it('should identify Kokushi Musou 13-sided wait Tenpai (0 shanten)', () => {
            /* GEMINI THINKING */
            // 19m 19p 19s 1234567z (13 distinct terminals and honors)
            const handStr = '19m19p19s1234567z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi7and13?.now).toBe(0)
            const waits = Object.keys(result.hairi7and13?.wait ?? {})
            expect(waits).toHaveLength(13)
            expect(waits).toContain('1m')
            expect(waits).toContain('9m')
            expect(waits).toContain('1p')
            expect(waits).toContain('9p')
            expect(waits).toContain('1s')
            expect(waits).toContain('9s')
            expect(waits).toContain('1z')
            expect(waits).toContain('7z')
        })

        it('should identify Kokushi Musou single terminal wait Tenpai', () => {
            /* GEMINI THINKING */
            // 119m 19p 19s 123456z -> waiting on 7z
            const handStr = '119m19p19s123456z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi7and13?.now).toBe(0)
            const waits = Object.keys(result.hairi7and13?.wait ?? {})
            expect(waits).toContain('7z')
        })
    })

    describe('RuleManager Tenpai & Waits API Tests', () => {
        let player: MockTestPlayer

        beforeEach(() => {
            player = new MockTestPlayer('test-p', false, false, mockLogger)
        })

        it('should return true for isTenpai when closed hand is in Tenpai', () => {
            /* GEMINI THINKING */
            // Hand: 123m 456m 789m 11z 23s (13 tiles, waiting on 1s, 4s)
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('4m'),
                Tile.fromString('5m'),
                Tile.fromString('6m'),
                Tile.fromString('7m'),
                Tile.fromString('8m'),
                Tile.fromString('9m'),
                Tile.fromString('1z'),
                Tile.fromString('1z'),
                Tile.fromString('2s'),
                Tile.fromString('3s'),
            ])

            expect(ruleManager.isTenpai(player)).toBe(true)
            const waits = ruleManager.getWaits(player)
            expect(waits).toContain('1s')
            expect(waits).toContain('4s')
        })

        it('should return true for isTenpai when hand has Melds (Open Hand)', () => {
            /* GEMINI THINKING */
            // Hand: 123m 456p 11z 23s (10 tiles) + Pon of 9s (3 tiles)
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('4m'),
                Tile.fromString('5m'),
                Tile.fromString('6m'),
                Tile.fromString('1z'),
                Tile.fromString('1z'),
                Tile.fromString('2s'),
                Tile.fromString('3s'),
            ])
            player.addMeld({
                type: 'pon',
                tiles: [
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                ],
                opened: true,
                stolenFrom: 'other-p',
            })

            expect(ruleManager.isTenpai(player)).toBe(true)
            const waits = ruleManager.getWaits(player)
            expect(waits).toContain('1s')
            expect(waits).toContain('4s')
        })

        it('should return correct valid Riichi discards (getRiichiDiscards)', () => {
            /* GEMINI THINKING */
            // 14 tiles: 123m 456p 789s 11z 23s 9m -> discarding 9m leaves Tenpai on 1s, 4s
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('4p'),
                Tile.fromString('5p'),
                Tile.fromString('6p'),
                Tile.fromString('7s'),
                Tile.fromString('8s'),
                Tile.fromString('9s'),
                Tile.fromString('1z'),
                Tile.fromString('1z'),
                Tile.fromString('2s'),
                Tile.fromString('3s'),
                Tile.fromString('9m'),
            ])

            const discards = ruleManager.getRiichiDiscards(player)
            expect(discards).toContain('9m')
            expect(discards).not.toContain('1m')
        })

        it('should NOT allow Riichi discards if player has an open meld', () => {
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('1z'),
                Tile.fromString('1z'),
                Tile.fromString('2s'),
                Tile.fromString('3s'),
                Tile.fromString('9m'),
            ])
            player.addMeld({
                type: 'pon',
                tiles: [
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                ],
                opened: true,
            })

            const discards = ruleManager.getRiichiDiscards(player)
            expect(discards).toEqual([])
        })
    })

    describe('Ankan & Kakan Verification under Riichi and Open Hand', () => {
        let player: MockTestPlayer

        beforeEach(() => {
            player = new MockTestPlayer('test-p', false, false, mockLogger)
        })

        it('should allow Ankan before Riichi if 4 identical tiles are present', () => {
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('1m'),
                Tile.fromString('1m'),
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('4p'),
                Tile.fromString('5p'),
                Tile.fromString('6p'),
                Tile.fromString('7s'),
                Tile.fromString('8s'),
                Tile.fromString('9s'),
                Tile.fromString('1z'),
                Tile.fromString('1z'),
            ])

            const ankanOptions = ruleManager.getAnkanOptions(player)
            expect(ankanOptions).toContain('1m')
        })

        it('should detect Kakan when player has Pon meld and draws the 4th matching tile', () => {
            player.setHand([
                Tile.fromString('1m'),
                Tile.fromString('2m'),
                Tile.fromString('3m'),
                Tile.fromString('5p'),
                Tile.fromString('9s'),
            ])
            player.addMeld({
                type: 'pon',
                tiles: [
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                ],
                opened: true,
            })

            const kakanOptions = ruleManager.getKakanOptions(player)
            expect(kakanOptions).toContain('9s')
        })

        it('should NOT allow Kakan when in Riichi', () => {
            player.isRiichi = true
            player.setHand([Tile.fromString('9s')])
            player.addMeld({
                type: 'pon',
                tiles: [
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                    Tile.fromString('9s'),
                ],
                opened: true,
            })

            const kakanOptions = ruleManager.getKakanOptions(player)
            expect(kakanOptions).toEqual([])
        })
    })

    describe('Sanma (3p) Shanten & Waits Calculation', () => {
        it('should calculate Tenpai correctly in Sanma where 2-8m are absent', () => {
            /* GEMINI THINKING */
            // Sanma tiles only use 1m, 9m, 1-9p, 1-9s, 1-7z
            // Hand: 111m 999m 123p 456s 1z -> waiting on 1z (Tanki wait)
            const handStr = '111999m123p456s1z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1z')
        })

        it('should calculate Ryanmen wait in Sanma with pinzu/souzu sequences', () => {
            /* GEMINI THINKING */
            // 111m 999m 11z 23p 789s -> waiting on 1p, 4p
            const handStr = '111999m23p789s11z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi?.now).toBe(0)
            const waits = Object.keys(result.hairi?.wait ?? {})
            expect(waits).toContain('1p')
            expect(waits).toContain('4p')
        })

        it('should calculate Chiitoitsu in Sanma without 2-8m', () => {
            /* GEMINI THINKING */
            // 11m 99m 11p 99p 11s 99s 1z -> waiting on 1z
            const handStr = '1199m1199p1199s1z'
            const result = new Riichi(handStr).calc() as RiichiResult
            expect(result.hairi7and13?.now).toBe(0)
            const waits = Object.keys(result.hairi7and13?.wait ?? {})
            expect(waits).toContain('1z')
        })
    })
})
