import { Player } from '../player.class'
import { ScoreCalculation, GameUpdate } from '../../interfaces/mahjong.types'
import { RuleManager } from '../rule.manager'
import { AbstractRoundManager } from './AbstractRoundManager'
import { Injectable, Scope } from '@nestjs/common'

@Injectable({ scope: Scope.TRANSIENT })
export class RoundManagerSanma extends AbstractRoundManager {
    public readonly playerCount = 3

    public getSeatWind(playerIndex: number): string {
        const relativePos = (playerIndex - this.oyaIndex + 3) % 3
        // 1z: East, 2z: South, 3z: West. (North is skipped in 3p rotation for winds)
        return `${relativePos + 1}z`
    }

    public endRound(
        roomId: string,
        players: Player[],
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
            abortReason?: string
        },
    ): GameUpdate {
        const startScores: Record<string, number> = {}
        players.forEach((p) => (startScores[p.getId()] = p.points))

        const events: GameUpdate['events'] = []
        let nextOyaIndex = this.oyaIndex
        let nextKyokuNum = this.kyokuNum
        let nextBakaze = this.bakaze
        let nextHonba = this.honba
        let nextKyotaku = this.kyotaku
        let renchan = false
        let isGameOver = false

        let stickClaimer: Player | null = null

        if (result.reason === 'ron' && result.winners && result.loserId) {
            const loser = players.find((p) => p.getId() === result.loserId)!
            for (const [idx, winnerInfo] of result.winners.entries()) {
                const winner = players.find(
                    (p) => p.getId() === winnerInfo.winnerId,
                )!
                const isHeadbump = idx === 0
                const honbaPoints = isHeadbump ? this.honba * 300 : 0
                const basePoints = this.calculateRonBasePoints(
                    winner,
                    loser,
                    winnerInfo.score,
                )
                const totalPoints = basePoints + honbaPoints
                winner.points += totalPoints
                loser.points -= totalPoints
                if (isHeadbump) stickClaimer = winner
                if (winner.isOya) renchan = true

                events.push({
                    eventName: 'score-update',
                    payload: {
                        winnerId: winnerInfo.winnerId,
                        loserId: result.loserId,
                        score: basePoints,
                        totalPoints:
                            basePoints +
                            honbaPoints +
                            (isHeadbump ? this.kyotaku * 1000 : 0),
                        reason: 'ron',
                    },
                    to: 'all',
                })
            }
            if (renchan) nextHonba++
            else nextHonba = 0
        } else if (
            result.reason === 'tsumo' &&
            result.winnerId &&
            result.score
        ) {
            const winner = players.find((p) => p.getId() === result.winnerId)!
            const honbaPoints = this.honba * 300
            const totalPoints = result.score.ten + honbaPoints
            winner.points += totalPoints
            stickClaimer = winner

            const otherPlayers = players.filter((p) => p !== winner)
            if (winner.isOya) {
                // Tsumo as Oya: Ko pays (ten/3) rounded up.
                // In Sanma, usually it's just divided.
                const payment = result.score.oya[0] + 100 * this.honba
                otherPlayers.forEach((p) => (p.points -= payment))
                renchan = true
                nextHonba++
            } else {
                const oya = players.find((p) => p.isOya)!
                const ko = otherPlayers.find((p) => !p.isOya)!
                const oyaPayment = result.score.ko[0] + 100 * this.honba
                const koPayment = result.score.ko[1] + 100 * this.honba
                oya.points -= oyaPayment
                ko.points -= koPayment
                nextHonba = 0
            }
            events.push({
                eventName: 'score-update',
                payload: {
                    winnerId: result.winnerId,
                    score: result.score.ten,
                    totalPoints: totalPoints + this.kyotaku * 1000,
                    reason: 'tsumo',
                },
                to: 'all',
            })
        } else if (result.reason === 'ryuukyoku') {
            // Tenpai-noten logic for 3p
            const tenpaiList = players.filter((p) => RuleManager.isTenpai(p))
            const notenList = players.filter((p) => !tenpaiList.includes(p))
            if (tenpaiList.length > 0 && notenList.length > 0) {
                const flow = 3000
                const payReceive = flow / tenpaiList.length
                const payGive = flow / notenList.length
                tenpaiList.forEach((p) => (p.points += payReceive))
                notenList.forEach((p) => (p.points -= payGive))
            }
            const oya = players[this.oyaIndex]
            if (tenpaiList.includes(oya)) {
                renchan = true
                nextHonba++
            } else {
                nextHonba++
                // nextOyaIndex will handle rotation below
            }
        }

        if (players.some((p) => p.points < 0)) isGameOver = true

        const maxPoints = Math.max(...players.map((p) => p.points))
        const isLastGame =
            (this.bakaze === '2z' && this.kyokuNum === 3) || this.isSuddenDeath

        if (!isGameOver) {
            if (!renchan) {
                nextOyaIndex = (this.oyaIndex + 1) % 3
                nextKyokuNum++
                if (nextKyokuNum > 3) {
                    nextKyokuNum = 1
                    nextBakaze = this.bakaze === '1z' ? '2z' : '1z' // Usually East/South only
                }
                if (isLastGame) {
                    if (maxPoints >= 35000) isGameOver = true
                    else this.isSuddenDeath = true
                }
            }
        }

        if (isGameOver) {
            if (this.kyotaku > 0) {
                players[this.oyaIndex].points += this.kyotaku * 1000
                nextKyotaku = 0
            }
        } else if (stickClaimer) {
            stickClaimer.points += this.kyotaku * 1000
            nextKyotaku = 0
        }

        this.honba = nextHonba
        this.kyotaku = nextKyotaku
        this.oyaIndex = nextOyaIndex
        this.kyokuNum = nextKyokuNum
        this.bakaze = nextBakaze

        const scoreDeltas: Record<string, number> = {}
        players.forEach(
            (p) => (scoreDeltas[p.getId()] = p.points - startScores[p.getId()]),
        )

        events.push({
            eventName: 'round-ended',
            payload: {
                reason: result.reason,
                scores: players.map((p) => ({
                    id: p.getId(),
                    points: p.points,
                })),
                scoreDeltas,
                winnerId: result.winnerId || result.winners?.[0]?.winnerId,
                nextState: {
                    bakaze: this.bakaze,
                    kyoku: this.kyokuNum,
                    honba: this.honba,
                    isGameOver,
                },
            },
            to: 'all',
        })

        if (isGameOver) return this.handleGameOver(roomId, players, events)
        return { roomId, isGameOver: false, events }
    }

    protected calculateRonBasePoints(
        winner: Player,
        loser: Player,
        score: ScoreCalculation,
    ): number {
        if (winner.isOya) return score.ten
        return loser.isOya ? score.oya[0] : score.ko[0]
    }

    public handleGameOver(
        roomId: string,
        players: Player[],
        events: GameUpdate['events'],
    ): GameUpdate {
        const sorted = [...players].sort((a, b) => b.points - a.points)
        const finalRanking = sorted.map((p, idx) => ({
            id: p.getId(),
            points: p.points,
            rank: idx + 1,
        }))
        // TODO implement Sanma specific uma and oka
        return {
            roomId,
            isGameOver: true,
            events: [
                ...events,
                {
                    eventName: 'game-over',
                    payload: { finalRanking },
                    to: 'all',
                },
            ],
        }
    }
}
