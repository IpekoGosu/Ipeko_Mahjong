import {
    ScoreCalculation,
    RiichiResult,
    WinContext,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { Player } from '@src/modules/mahjong/classes/player.class'
import { Tile } from '@src/modules/mahjong/classes/tile.class'
import Riichi from 'riichi'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class RuleManager {
    private readonly logger = new Logger(RuleManager.name)

    getActualDora(indicator: string, isSanma: boolean = false): string {
        return Tile.getDoraFromIndicator(indicator, isSanma)
    }

    getRiichiDiscards(player: Player): string[] {
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
                this.logger.error(
                    `Error calculating shanten for tile ${tileStr}:`,
                    e,
                )
            }
        }

        return validDiscards
    }

    getAnkanOptions(player: Player): string[] {
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
                // We need waits for the 13-tile hand (before drawing the 4th tile)
                const currentHand = hand.filter(
                    (t) => t.getId() !== player.lastDrawnTile?.getId(),
                )
                const currentHandStr = this.convertTilesToRiichiString(
                    currentHand.map((t) => t.toString()),
                )

                let currentWaits: string[] = []
                try {
                    const result = new Riichi(
                        currentHandStr,
                    ).calc() as RiichiResult
                    if (result.hairi?.now === 0 && result.hairi.wait) {
                        currentWaits.push(...Object.keys(result.hairi.wait))
                    }
                    if (
                        result.hairi7and13?.now === 0 &&
                        result.hairi7and13.wait
                    ) {
                        currentWaits.push(
                            ...Object.keys(result.hairi7and13.wait),
                        )
                    }
                    currentWaits = Array.from(new Set(currentWaits)).sort()
                } catch (e) {
                    this.logger.error(
                        'Error calculating current waits for Ankan check',
                        e,
                    )
                    return false
                }

                // Simulated waits after Ankan
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
                    this.logger.error('Error simulating Ankan waits', e)
                    return false
                }
            })
        }

        return possibleAnkans
    }

    getKakanOptions(player: Player): string[] {
        if (player.isRiichi) return [] // Cannot Kakan in Riichi

        const hand = player.getHand()
        const melds = player.getMelds()
        const ponMelds = melds.filter((m) => m.type === 'pon')

        if (ponMelds.length === 0) return []

        const options: string[] = []
        ponMelds.forEach((pon) => {
            // Pon tiles are all same, take first
            const ponTile = pon.tiles[0]

            // Check if we have the 4th tile in hand
            const match = hand.find((t) => t.equalsIgnoreRed(ponTile))
            if (match) {
                options.push(match.toString())
            }
        })

        return options
    }

    calculateFuriten(player: Player): boolean {
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

    getWaits(player: Player): string[] {
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
            this.logger.error(
                `Error getting waits for player ${player.getId()}:`,
                e,
            )
            return []
        }
    }

    countTerminalsAndHonors(player: Player): number {
        const hand = player.getHand()
        const uniqueTiles = new Set<string>()

        hand.forEach((tile) => {
            if (tile.isTerminalOrHonor()) {
                uniqueTiles.add(tile.toIgnoreRedString())
            }
        })

        return uniqueTiles.size
    }

    getActualDoraList(
        indicators: string[],
        isSanma: boolean = false,
    ): string[] {
        return indicators.map((indicator) =>
            this.getActualDora(indicator, isSanma),
        )
    }

    isTenpai(player: Player): boolean {
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
            this.logger.error(
                `Error checking Tenpai for player ${player.getId()}:`,
                e,
            )
            return false
        }
    }

    private convertTilesToRiichiString(tiles: string[]): string {
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

    calculateScore(
        player: Player,
        context: WinContext,
        isSanma: boolean = false,
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
                this.logger.error('Winning tile required for Ron')
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
        const dora = context.dora.map((d) => this.getActualDora(d, isSanma))

        // Add Uradora if Riichi
        if (context.isRiichi && context.uradora) {
            const uradoraList = context.uradora.map((u) =>
                this.getActualDora(u, isSanma),
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

    verifyWin(
        player: Player,
        tileString: string,
        context: WinContext,
        isSanma: boolean = false,
    ): { isAgari: boolean; score?: ScoreCalculation } {
        const ctx = { ...context, winningTile: tileString }
        const score = this.calculateScore(player, ctx, isSanma)
        return {
            isAgari: !!score,
            score: score || undefined,
        }
    }
}
