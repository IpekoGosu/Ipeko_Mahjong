import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { Player } from './player.class'
import { Tile } from './tile.class'
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

    static calculateScore(player: Player, context: WinContext): ScoreCalculation | null {
        // 1. Construct Hand String
        let handStr = player.getHandStringForRiichi()
        
        // Add melds
        const melds = player.getMelds()
        if (melds.length > 0) {
            melds.forEach(meld => {
                // Format: +123m or +111z
                const meldStr = meld.tiles.map(t => t.toString()).join('')
                handStr += `+${meldStr}`
            })
        }

        // Add winning tile for Ron
        if (!context.isTsumo) {
            if (!context.winningTile) {
                console.error("Winning tile required for Ron")
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
