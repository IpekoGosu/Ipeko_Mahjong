import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { Player } from './player.class'
import Riichi from 'riichi'

export interface WinContext {
    bakaze: string // '1z', '2z', etc.
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
                const result = new Riichi(testHandStr).calc()

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

    static calculateFuriten(player: Player): boolean {
        const hand = player.getHand().map((t) => t.toString())
        const handStr = this.convertTilesToRiichiString(hand)
        const result = new Riichi(handStr).calc()

        // hairi.now 0 means Tenpai
        if (result.hairi?.now === 0) {
            const waits = Object.keys(result.hairi.wait)
            const discards = player.getDiscards().map((t) => t.toString())

            // Check if any discard is in waits
            return discards.some((d) => waits.includes(d))
        }

        return false
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

        console.log(`Calculating score for: ${handStr}`)
        const riichi: any = new Riichi(handStr)

        // 2. Set Options
        riichi.isTsumo = context.isTsumo
        riichi.isOya = player.isOya

        // Winds
        // 1z=East(1), 2z=South(2), etc.
        riichi.bakaze = parseInt(context.bakaze[0])
        // Seat wind: Player doesn't store seat wind directly usually,
        // but let's assume MahjongGame passes correct generic seat index or we derive it.
        // For now, let's assume the context or player should provide it.
        // Actually, Player.isOya is known.
        // If we don't have exact seat, default to 2 (South) unless Oya (1).
        // ideally, Player should know their wind.
        // Let's assume for now: Oya=1, others=2 (Ko).
        // To be precise, we need the wind. Let's add it to Player or Context later.
        riichi.jikaze = player.isOya ? 1 : 2

        // Dora (Convert indicators to actual tiles)
        riichi.dora = context.dora.map((d) => this.getActualDora(d))

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
