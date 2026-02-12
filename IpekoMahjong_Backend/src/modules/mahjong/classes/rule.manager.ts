import {
    ScoreCalculation,
    RiichiResult,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { Player } from './player.class'
import Riichi from 'riichi'
import { Logger } from '@nestjs/common'

export interface WinContext {
    bakaze: string // '1z', '2z', etc.
    seatWind: string // '1z', '2z', etc.
    dora: string[] // List of dora tiles (e.g. ['1m'])
    isTsumo: boolean
    isRiichi?: boolean
    isDoubleRiichi?: boolean
    isIppatsu?: boolean
    isHaitei?: boolean
    isHoutei?: boolean
    isRinshan?: boolean
    isChankan?: boolean
    isTenhou?: boolean
    isChiihou?: boolean
    winningTile?: string // Required for Ron
    uradora?: string[]
}

export class RuleManager {
    private static readonly logger = new Logger(RuleManager.name)
    static getActualDora(indicator: string): string {
        const rank = parseInt(indicator[0])
        const suit = indicator[1]

        if (suit === 'z') {
            if (rank <= 4) {
                // Winds: E->S->W->N->E (1->2->3->4->1)
                return `${(rank % 4) + 1}z`
            } else {
                // Dragons: White->Green->Red->White (5->6->7->5)
                return rank === 7 ? '5z' : `${rank + 1}z`
            }
        } else {
            // Numbers: 1-9-1
            // Handle aka dora indicator (0) - technically doesn't happen but safe to handle as 5
            const actualRank = rank === 0 ? 5 : rank
            return `${(actualRank % 9) + 1}${suit}`
        }
    }

    static getRiichiDiscards(player: Player): string[] {
        if (!player.isHandClosed() || player.isRiichi) return []

        const hand = player.getHand()
        const uniqueTiles = Array.from(new Set(hand.map((t) => t.toString())))
        const validDiscards: string[] = []

        for (const tileStr of uniqueTiles) {
            try {
                // Simulate discard
                const remainingTiles = hand.map((t) => t.toString())
                const idx = remainingTiles.indexOf(tileStr)
                if (idx > -1) remainingTiles.splice(idx, 1)

                // Convert to string for riichi library
                const testHandStr =
                    this.convertTilesToRiichiString(remainingTiles)
                const result = new Riichi(testHandStr).calc() as RiichiResult

                // hairi.now 0 means Tenpai
                const shanten = result.hairi?.now ?? 100
                const shanten7and13 = result.hairi7and13?.now ?? 100

                if (shanten === 0 || shanten7and13 === 0) {
                    validDiscards.push(tileStr)
                }
            } catch (e) {
                RuleManager.logger.error(
                    `Error calculating shanten for tile ${tileStr}:`,
                    e,
                )
            }
        }

        return validDiscards
    }

    static getAnkanOptions(player: Player): string[] {
        const hand = player.getHand()
        const counts: Record<string, number> = {}
        hand.forEach((t) => {
            const s = t.toString()
            counts[s] = (counts[s] || 0) + 1
        })

        const possibleAnkans = Object.keys(counts).filter(
            (tile) => counts[tile] === 4,
        )

        if (player.isRiichi) {
            // Rule: Can only Ankan if:
            // 1. The Ankan involves the drawn tile (No "Sending Kan" / Okuri-kan).
            // 2. The Ankan does not change the waits.

            if (!player.lastDrawnTile) return []
            const drawnTileStr = player.lastDrawnTile.toString()

            return possibleAnkans.filter((tileStr) => {
                // 1. Must involve drawn tile
                if (tileStr !== drawnTileStr) return false

                // 2. Check if waits change
                // Current waits
                const currentWaits = this.getWaits(player).sort()

                // Simulated waits after Ankan
                // We need to simulate the hand state after Ankan.
                // Player class has 'getHandStringForRiichi'.
                // If we Ankan 'tileStr', we remove 4 tiles and add a 'closed kan' meld.
                // We can construct the string manually.

                // Construct hand string for simulation
                const remainingHand = hand.filter(
                    (t) => t.toString() !== tileStr,
                )
                let testHandStr = this.convertTilesToRiichiString(
                    remainingHand.map((t) => t.toString()),
                )

                // Add existing melds
                const melds = player.getMelds()
                melds.forEach((meld) => {
                    const suit = meld.tiles[0].getSuit()
                    const ranks = meld.tiles
                        .map((t) => t.toString()[0])
                        .sort()
                        .join('')
                    testHandStr += `+${ranks}${suit}`
                })

                // Add NEW Ankan Meld
                // Ankan in riichi lib format: "010m" (closed)?
                // Riichi lib format for closed kan: "1111m" treated as?
                // Actually riichi lib detects "1111m" as 4 tiles.
                // But we need to specify it's a Kan (meld).
                // In riichi string, "+1111m" might be open kan.
                // How to specify Closed Kan?
                // Usually Closed Kan is NOT separated with '+'.
                // BUT if we don't separate it, it's just 4 tiles in hand.
                // If 4 tiles in hand, can it be interpreted as Kan?
                // Riichi lib might have specific syntax for Closed Kan.
                // Often: (1111m) or similar.
                // Looking at `riichi` docs/source or assuming standard:
                // If we treat it as Melded for "Wait Calculation", it reduces hand size.
                // A closed kan is 4 tiles that don't count towards the 13-tile limit (standard 13 + 1).
                // It replaces 3 tiles effectively.
                // If we just remove the 4 tiles from "hand" string, the hand has 10 tiles.
                // We need to tell the calculator that we have a Kan.
                // If `riichi` lib doesn't support explicit Closed Kan syntax easily, we might struggle.
                // However, `riichi` lib usually treats `+1111m` as Meld.
                // For Wait Calculation, Open vs Closed Kan doesn't matter for *Waits* (shapes), only for Yaku (Suuankou vs Taiaitou).
                // So using `+1111m` (Meld) is safe for checking *Waits*.

                const rank = tileStr[0]
                const suit = tileStr[1]
                testHandStr += `+${rank}${rank}${rank}${rank}${suit}`

                try {
                    const result = new Riichi(
                        testHandStr,
                    ).calc() as RiichiResult
                    // Check waits
                    let newWaits: string[] = []
                    if (result.hairi?.now === 0 && result.hairi.wait) {
                        newWaits.push(...Object.keys(result.hairi.wait))
                    }
                    if (
                        result.hairi7and13?.now === 0 &&
                        result.hairi7and13.wait
                    ) {
                        newWaits.push(...Object.keys(result.hairi7and13.wait))
                    }
                    newWaits = Array.from(new Set(newWaits)).sort()

                    // Compare arrays
                    if (currentWaits.length !== newWaits.length) return false
                    for (let i = 0; i < currentWaits.length; i++) {
                        if (currentWaits[i] !== newWaits[i]) return false
                    }

                    return true
                } catch (e) {
                    RuleManager.logger.error('Error simulating Ankan waits', e)
                    return false
                }
            })
        }

        return possibleAnkans
    }

    static getKakanOptions(player: Player): string[] {
        if (player.isRiichi) return [] // Cannot Kakan in Riichi

        const hand = player.getHand()
        const melds = player.getMelds()
        const ponMelds = melds.filter((m) => m.type === 'pon')

        if (ponMelds.length === 0) return []

        const options: string[] = []
        ponMelds.forEach((pon) => {
            // Pon tiles are all same, take first
            const ponTile = pon.tiles[0]
            const rank = ponTile.getRank()
            const suit = ponTile.getSuit()

            // Check if we have the 4th tile in hand
            const match = hand.find(
                (t) => t.getRank() === rank && t.getSuit() === suit,
            )
            if (match) {
                options.push(match.toString())
            }
        })

        return options
    }

    static calculateFuriten(player: Player): boolean {
        const hand = player.getHand().map((t) => t.toString())
        const handStr = this.convertTilesToRiichiString(hand)
        const result = new Riichi(handStr).calc() as RiichiResult

        // hairi.now 0 means Tenpai
        if (result.hairi?.now === 0 && result.hairi.wait) {
            const waits = Object.keys(result.hairi.wait)
            const discards = player.getDiscards().map((t) => t.toString())

            // Check if any discard is in waits
            return discards.some((d) => waits.includes(d))
        }

        return false
    }

    static getWaits(player: Player): string[] {
        let handStr = player.getHandStringForRiichi()
        const melds = player.getMelds()
        if (melds.length > 0) {
            melds.forEach((meld) => {
                const suit = meld.tiles[0].getSuit()
                const ranks = meld.tiles
                    .map((t) => {
                        const s = t.toString()
                        return s[0]
                    })
                    .sort()
                    .join('')
                handStr += `+${ranks}${suit}`
            })
        }

        try {
            const result = new Riichi(handStr).calc() as RiichiResult
            // hairi.now 0 means Tenpai
            const waits: string[] = []
            if (result.hairi?.now === 0 && result.hairi.wait) {
                waits.push(...Object.keys(result.hairi.wait))
            }
            if (result.hairi7and13?.now === 0 && result.hairi7and13.wait) {
                waits.push(...Object.keys(result.hairi7and13.wait))
            }
            return Array.from(new Set(waits))
        } catch (e) {
            RuleManager.logger.error(
                `Error getting waits for player ${player.getId()}:`,
                e,
            )
            return []
        }
    }

    static countTerminalsAndHonors(player: Player): number {
        const hand = player.getHand()
        const uniqueTiles = new Set<string>()

        hand.forEach((tile) => {
            const rank = tile.getRank()
            const suit = tile.getSuit()

            // Check if terminal or honor
            if (suit === 'z' || rank === 1 || rank === 9) {
                // Determine uniqueness based on suit and rank (ignore id, aka)
                // Actually `tile.toString()` format is `1m`, `5z` etc.
                // 0m, 0p, 0s are 5.
                // 1m, 9m, 1p, 9p, 1s, 9s, 1z...7z
                // 0 is not 1 or 9, so safe.

                // If 1m and 1m exist, we count only 1 unique.
                // `tile.toString()` format: rank+suit. (e.g. 1m).
                // Red 5 is 0m. Rank is 5. Not terminal.
                // Wait, tile.toString() uses rank.
                // If I have 1m and 1m, uniqueTiles set handles it.
                uniqueTiles.add(`${rank}${suit}`)
            }
        })

        return uniqueTiles.size
    }

    static getActualDoraList(indicators: string[]): string[] {
        return indicators.map((indicator) => this.getActualDora(indicator))
    }

    static isTenpai(player: Player): boolean {
        // Construct hand string including melds
        let handStr = player.getHandStringForRiichi()
        const melds = player.getMelds()
        if (melds.length > 0) {
            melds.forEach((meld) => {
                const suit = meld.tiles[0].getSuit()
                const ranks = meld.tiles
                    .map((t) => {
                        const s = t.toString()
                        return s[0]
                    })
                    .sort()
                    .join('')
                handStr += `+${ranks}${suit}`
            })
        }

        try {
            const result = new Riichi(handStr).calc() as RiichiResult
            return (
                (result.hairi?.now ?? 100) === 0 ||
                (result.hairi7and13?.now ?? 100) === 0
            )
        } catch (e) {
            RuleManager.logger.error(
                `Error checking Tenpai for player ${player.getId()}:`,
                e,
            )
            return false
        }
    }

    private static convertTilesToRiichiString(tiles: string[]): string {
        const groups: Record<string, string[]> = { m: [], p: [], s: [], z: [] }
        tiles.forEach((t) => {
            const rank = t[0]
            const suit = t[1]
            if (groups[suit]) groups[suit].push(rank)
        })

        let result = ''
        ;(['m', 'p', 's', 'z'] as const).forEach((suit) => {
            if (groups[suit].length > 0) {
                result += groups[suit].sort().join('') + suit
            }
        })
        return result
    }

    static calculateScore(
        player: Player,
        context: WinContext,
    ): ScoreCalculation | null {
        // 1. Construct Hand String
        let handStr = player.getHandStringForRiichi()

        // Add melds
        const melds = player.getMelds()
        if (melds.length > 0) {
            melds.forEach((meld) => {
                // The riichi library expects melds in format: "123m" or "111z"
                const suit = meld.tiles[0].getSuit()
                const ranks = meld.tiles
                    .map((t) => {
                        const s = t.toString()
                        return s[0] // Get rank ('0' for aka, '1'-'9' otherwise)
                    })
                    .sort()
                    .join('')
                handStr += `+${ranks}${suit}`
            })
        }

        // Add winning tile for Ron as a separate segment
        // This sets isTsumo = false in the library constructor automatically
        if (!context.isTsumo) {
            if (!context.winningTile) {
                RuleManager.logger.error('Winning tile required for Ron')
                return null
            }
            handStr += `+${context.winningTile}`
        }

        // 3. Construct Extra String (Situational Yaku)
        let extra = ''
        if (context.isRiichi) extra += 'r'
        if (context.isDoubleRiichi) extra += 'w'
        if (context.isIppatsu) extra += 'i'
        if (context.isHaitei || context.isHoutei) extra += 'h'
        if (context.isRinshan || context.isChankan) extra += 'k'
        if (context.isTenhou || context.isChiihou) extra += 't'

        const riichi = new Riichi(handStr)
        const dora = context.dora.map((d) => this.getActualDora(d))

        // Add Uradora if Riichi
        if (context.isRiichi && context.uradora) {
            const uradoraList = context.uradora.map((u) =>
                this.getActualDora(u),
            )
            dora.push(...uradoraList)
        }

        Object.assign(riichi, {
            isTsumo: context.isTsumo,
            isOya: player.isOya,
            bakaze: parseInt(context.bakaze[0]),
            jikaze: parseInt(context.seatWind[0]),
            dora,
            extra,
        })

        // 4. Calculate
        const result = (riichi as { calc(): RiichiResult }).calc()

        // 5. Validate
        if (!result.isAgari) {
            return null
        }

        // Check for Yaku Nashi (No Yaku)
        // If not Yakuman and Han is 0, it's invalid.
        if (result.yakuman === 0 && result.han === 0) {
            return null
        }

        return {
            han: result.han,
            fu: result.fu,
            ten: result.ten,
            yaku: result.yaku,
            yakuman: result.yakuman,
            oya: result.oya,
            ko: result.ko,
            name: result.name,
            text: result.text,
        }
    }

    static verifyWin(
        player: Player,
        tileString: string,
        context: WinContext,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const ctx = { ...context, winningTile: tileString }
        const score = this.calculateScore(player, ctx)
        return {
            isAgari: !!score,
            score: score || undefined,
        }
    }
}
