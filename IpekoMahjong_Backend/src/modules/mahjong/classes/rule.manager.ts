import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import Riichi from 'riichi'

export class RuleManager {
    readonly handString: string
    private hand: Riichi
    private calcResult: Riichi.Result

    constructor(handString: string) {
        this.handString = handString
        this.hand = new Riichi(handString)
        this.calcResult = this.hand.calc()
    }

    checkShanten(): number {
        return (
            this.calcResult.hairi?.now || this.calcResult.hairi7and13?.now || 0
        )
    }

    checkWin(): boolean {
        return this.calcResult.isAgari
    }

    checkTenpai(): boolean {
        return (
            this.calcResult.hairi?.now === 0 ||
            this.calcResult.hairi7and13?.now === 0
        )
    }

    calculateScore(): ScoreCalculation | null {
        if (this.calcResult.isAgari) {
            return { oya: this.calcResult.oya, ko: this.calcResult.ko }
        }
        return null
    }
}
