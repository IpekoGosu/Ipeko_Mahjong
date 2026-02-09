import {
    ScoreCalculation,
    RiichiResult,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { Player } from './player.class'
import Riichi from 'riichi'

interface RiichiInstance {
    isTsumo: boolean
    isOya: boolean
    bakaze: number
    jikaze: number
    dora: string[]
    extra: string
    calc(): RiichiResult
}

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
                console.error(
                    `Error calculating shanten for tile ${tileStr}:`,
                    e,
                )
            }
        }

        return validDiscards
    }

    static getAnkanOptions(player: Player): string[] {
        if (player.isRiichi) return [] // Cannot Ankan in Riichi (unless special rule, but usually simplified to no for now or specific check)
        // Actually, you CAN Ankan in Riichi if it doesn't change wait.
        // For simplicity in Phase 3, let's disable Ankan in Riichi or implement full check.
        // Let's allow it if not Riichi. If Riichi, we need complex check.
        // Strict rule: Can Ankan in Riichi if:
        // 1. Tile drawn is the one to be Ankan'd.
        // 2. Hand structure doesn't change (wait doesn't change).
        // For now, let's block Ankan in Riichi to be safe, or allow it blindly?
        // Prompt says "Ankan does not count as disrupting menzen state", doesn't explicitly mention Riichi.
        // Let's stick to non-Riichi for now, or check generic valid moves.
        if (player.isRiichi) return []

        const hand = player.getHand()
        const counts: Record<string, number> = {}
        hand.forEach((t) => {
            const s = t.toString()
            counts[s] = (counts[s] || 0) + 1
        })

        return Object.keys(counts).filter((tile) => counts[tile] === 4)
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
            console.error(
                `Error getting waits for player ${player.getId()}:`,
                e,
            )
            return []
        }
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
            console.error(
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
                console.error('Winning tile required for Ron')
                return null
            }
            handStr += `+${context.winningTile}`
        }

        const riichi = new Riichi(handStr) as unknown as RiichiInstance

        // 2. Set Options
        riichi.isTsumo = context.isTsumo
        riichi.isOya = player.isOya

        // Winds
        // 1z=East(1), 2z=South(2), etc.
        riichi.bakaze = parseInt(context.bakaze[0])
        // Seat wind
        riichi.jikaze = parseInt(context.seatWind[0])

        // Dora (Convert indicators to actual tiles)
        riichi.dora = context.dora.map((d) => this.getActualDora(d))

        // Add Uradora if Riichi
        if (context.isRiichi && context.uradora) {
            const uradoraList = context.uradora.map((u) => this.getActualDora(u))
            riichi.dora = [...riichi.dora, ...uradoraList]
        }

        // 3. Construct Extra String (Situational Yaku)
        let extra = ''
        if (context.isRiichi) extra += 'r'
        if (context.isDoubleRiichi) extra += 'w'
        if (context.isIppatsu) extra += 'i'
        if (context.isHaitei || context.isHoutei) extra += 'h'
        if (context.isRinshan || context.isChankan) extra += 'k'
        if (context.isTenhou || context.isChiihou) extra += 't'

        riichi.extra = extra

        // 4. Calculate
        const result = riichi.calc()

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
}
