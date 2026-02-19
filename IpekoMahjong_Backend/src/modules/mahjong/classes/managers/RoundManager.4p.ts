import { Player } from '@src/modules/mahjong/classes/player.class'
import {
    ScoreCalculation,
    GameUpdate,
} from '@src/modules/mahjong/interfaces/mahjong.types'
import { RuleManager } from '@src/modules/mahjong/classes/managers/RuleManager'
import { AbstractRoundManager } from '@src/modules/mahjong/classes/managers/AbstractRoundManager'
import { Injectable } from '@nestjs/common'
import { DEFAULT_4P_RULES } from '@src/modules/mahjong/interfaces/game-rules.config'

@Injectable()
export class RoundManager4p extends AbstractRoundManager {
    public readonly playerCount = 4

    constructor(private readonly ruleManager: RuleManager) {
        super()
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
            pao?: { winnerId: string; responsiblePlayerId: string }[]
        },
    ): GameUpdate {
        const startScores: Record<string, number> = {}
        players.forEach((p) => (startScores[p.id] = p.points))

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
            const loser = players.find((p) => p.id === result.loserId)!

            for (const [idx, winnerInfo] of result.winners.entries()) {
                const winner = players.find(
                    (p) => p.id === winnerInfo.winnerId,
                )!
                const isHeadbump = idx === 0
                const honbaPoints = isHeadbump ? this.honba * 300 : 0

                // Check Pao for Ron
                const paoInfo = result.pao?.find(
                    (p) => p.winnerId === winnerInfo.winnerId,
                )
                const basePoints = this.calculateRonBasePoints(
                    winner,
                    loser,
                    winnerInfo.score,
                )
                const totalPoints = basePoints + honbaPoints

                if (paoInfo) {
                    const responsiblePlayer = players.find(
                        (p) => p.id === paoInfo.responsiblePlayerId,
                    )!
                    const halfBase = basePoints / 2

                    winner.points += totalPoints
                    loser.points -= halfBase + honbaPoints
                    responsiblePlayer.points -= halfBase

                    if (isHeadbump) stickClaimer = winner
                    if (winner.isOya) renchan = true

                    const kyotakuPoints = isHeadbump ? this.kyotaku * 1000 : 0
                    events.push({
                        eventName: 'score-update',
                        payload: {
                            winnerId: winnerInfo.winnerId,
                            loserId: result.loserId,
                            responsiblePlayerId: responsiblePlayer.id,
                            score: basePoints,
                            totalPoints: totalPoints + kyotakuPoints,
                            reason: 'ron-pao',
                        },
                        to: 'all',
                    })
                } else {
                    winner.points += totalPoints
                    loser.points -= totalPoints

                    if (isHeadbump) stickClaimer = winner
                    if (winner.isOya) renchan = true

                    const kyotakuPoints = isHeadbump ? this.kyotaku * 1000 : 0
                    events.push({
                        eventName: 'score-update',
                        payload: {
                            winnerId: winnerInfo.winnerId,
                            loserId: result.loserId,
                            score: basePoints,
                            totalPoints: totalPoints + kyotakuPoints,
                            reason: 'ron',
                        },
                        to: 'all',
                    })
                }
            }

            if (renchan) nextHonba++
            else nextHonba = 0
        } else if (
            result.reason === 'tsumo' &&
            result.winnerId &&
            result.score
        ) {
            const winner = players.find((p) => p.id === result.winnerId)!
            const honbaPoints = this.honba * 300
            const totalPoints = result.score.ten + honbaPoints

            // Check Pao for Tsumo
            const paoInfo = result.pao?.find(
                (p) => p.winnerId === result.winnerId,
            )

            if (paoInfo) {
                const responsiblePlayer = players.find(
                    (p) => p.id === paoInfo.responsiblePlayerId,
                )!

                winner.points += totalPoints
                responsiblePlayer.points -= totalPoints
                stickClaimer = winner

                if (winner.isOya) {
                    renchan = true
                    nextHonba++
                } else {
                    nextHonba = 0
                }

                events.push({
                    eventName: 'score-update',
                    payload: {
                        winnerId: result.winnerId,
                        responsiblePlayerId: responsiblePlayer.id,
                        score: result.score.ten,
                        totalPoints:
                            totalPoints +
                            (isGameOver ? 0 : this.kyotaku * 1000),
                        reason: 'tsumo-pao',
                    },
                    to: 'all',
                })
            } else {
                winner.points += totalPoints
                stickClaimer = winner

                const otherPlayers = players.filter((p) => p !== winner)
                if (winner.isOya) {
                    const payment = result.score.oya[0] + 100 * this.honba
                    otherPlayers.forEach((p) => (p.points -= payment))
                    renchan = true
                    nextHonba++
                } else {
                    const oya = players.find((p) => p.isOya)!
                    const kos = otherPlayers.filter((p) => !p.isOya)
                    const oyaPayment = result.score.ko[0] + 100 * this.honba
                    const koPayment = result.score.ko[1] + 100 * this.honba
                    oya.points -= oyaPayment
                    kos.forEach((p) => (p.points -= koPayment))
                    nextHonba = 0
                }

                events.push({
                    eventName: 'score-update',
                    payload: {
                        winnerId: result.winnerId,
                        score: result.score.ten,
                        totalPoints:
                            totalPoints +
                            (isGameOver ? 0 : this.kyotaku * 1000),
                        reason: 'tsumo',
                    },
                    to: 'all',
                })
            }
        } else if (result.reason === 'ryuukyoku') {
            if (result.abortReason) {
                renchan = true
                nextHonba++
            } else {
                // 1. Check Nagashi Mangan
                const nagashiWinners = players.filter((p) => {
                    if (!p.isNagashiEligible) return false
                    const discards = p.discards
                    if (discards.length === 0) return false
                    return discards.every((t) => t.isTerminalOrHonor())
                })

                if (nagashiWinners.length > 0) {
                    for (const winner of nagashiWinners) {
                        const otherPlayers = players.filter((p) => p !== winner)
                        let totalNagashi = 0
                        if (winner.isOya) {
                            const payment = 4000 // Oya Mangan Tsumo: 4000 all
                            otherPlayers.forEach((p) => (p.points -= payment))
                            totalNagashi = payment * 3
                            renchan = true
                        } else {
                            otherPlayers.forEach((p) => {
                                const payment = p.isOya ? 4000 : 2000
                                p.points -= payment
                                totalNagashi += payment
                            })
                        }
                        winner.points += totalNagashi
                        events.push({
                            eventName: 'score-update',
                            payload: {
                                winnerId: winner.id,
                                score: totalNagashi,
                                reason: 'nagashi-mangan',
                            },
                            to: 'all',
                        })
                    }
                    if (nagashiWinners.some((p) => p.isOya)) {
                        renchan = true
                    }
                    nextHonba++
                } else {
                    // 2. Regular Tenpai/Noten payments
                    const tenpaiList = players.filter(
                        (p) =>
                            p.hand.length <= 13 && this.ruleManager.isTenpai(p),
                    )
                    const notenList = players.filter(
                        (p) => !tenpaiList.includes(p),
                    )

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
                    }
                    nextHonba++
                }
            }
        }

        if (players.some((p) => p.points < 0)) isGameOver = true

        const maxPoints = Math.max(...players.map((p) => p.points))
        const isLastGame =
            (this.bakaze === '2z' && this.kyokuNum === 4) || this.isSuddenDeath
        const currentOya = players[this.oyaIndex]
        const isTop = currentOya.points === maxPoints

        if (!isGameOver) {
            if (isLastGame && renchan) {
                if (isTop && currentOya.points >= 30000) isGameOver = true
            } else if (!renchan) {
                nextOyaIndex = (this.oyaIndex + 1) % 4
                nextKyokuNum++
                if (nextKyokuNum > 4) {
                    nextKyokuNum = 1
                    const windOrder: ('1z' | '2z' | '3z' | '4z')[] = [
                        '1z',
                        '2z',
                        '3z',
                        '4z',
                    ]
                    const currentIndex = windOrder.indexOf(this.bakaze)
                    nextBakaze =
                        windOrder[(currentIndex + 1) % windOrder.length]
                }

                if (!this.isSuddenDeath) {
                    if (this.bakaze === '2z' && this.kyokuNum === 4) {
                        if (maxPoints >= 30000) isGameOver = true
                        else this.isSuddenDeath = true
                    }
                } else {
                    if (maxPoints >= 30000) isGameOver = true
                }
            }
        }

        if (!isGameOver && this.isSuddenDeath) {
            if (maxPoints >= 30000) isGameOver = true
        }

        if (isGameOver) {
            if (this.kyotaku > 0) {
                const topPlayer = this.getSortedPlayers(players)[0]
                topPlayer.points += this.kyotaku * 1000
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
        players.forEach((p) => {
            scoreDeltas[p.id] = p.points - startScores[p.id]
        })

        let winScore = result.score
        if (
            result.reason === 'ron' &&
            result.winners &&
            result.winners.length > 0
        ) {
            winScore = result.winners[0].score
        }

        events.push({
            eventName: 'round-ended',
            payload: {
                reason: result.reason,
                abortReason: result.abortReason,
                scores: players.map((p) => ({
                    id: p.id,
                    points: p.points,
                })),
                scoreDeltas,
                winScore: winScore,
                winnerId:
                    result.winnerId ||
                    (result.winners && result.winners.length > 0
                        ? result.winners[0].winnerId
                        : undefined),
                loserId: result.loserId,
                allWinners: result.winners,
                nextState: {
                    bakaze: nextBakaze,
                    kyoku: nextKyokuNum,
                    honba: nextHonba,
                    isGameOver: isGameOver,
                },
            },
            to: 'all',
        })

        if (isGameOver) {
            return this.handleGameOver(roomId, players, events)
        }

        return {
            roomId,
            isGameOver: false,
            events,
            reason: result.reason,
        }
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
        const sortedPlayers = this.getSortedPlayers(players)
        const { returnPoints, uma, oka } = DEFAULT_4P_RULES

        const finalScores = sortedPlayers.map((p, idx) => {
            const playerUma = uma[idx]
            const finalPoint = p.points - returnPoints + playerUma
            return {
                id: p.id,
                points: p.points,
                finalScore: idx === 0 ? finalPoint + oka : finalPoint,
                rank: idx + 1,
            }
        })

        return {
            roomId,
            isGameOver: true,
            reason: events.find((e) => e.eventName === 'round-ended')?.payload
                ?.reason as GameUpdate['reason'],
            events: [
                ...events,
                {
                    eventName: 'game-over',
                    payload: {
                        scores: players.map((p) => p.points),
                        finalRanking: finalScores,
                    },
                    to: 'all',
                },
            ],
        }
    }
}
