import { ScoreCalculation } from '../interfaces/mahjong.types'
import { MahjongGame } from '../classes/mahjong.game.class'
import { Player } from '../classes/player.class'

describe('Mahjong Scoring Logic', () => {
    let game: MahjongGame
    let players: Player[]

    beforeEach(() => {
        // 4 players
        game = new MahjongGame([
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: true },
            { id: 'p3', isAi: true },
            { id: 'p4', isAi: true },
        ])
        // Seating is randomized in startGame, but we can force it or inspect it.
        game.startGame('test-room')
        players = game.getPlayers()
        // Reset points for predictability
        players.forEach((p) => (p.points = 25000))
    })

    it('should deduct more points from Oya when a Ko wins by Ron (40 fu 1 han)', () => {
        // Find Oya
        const oya = players.find((p) => p.isOya)!
        const ko = players.find((p) => !p.isOya)!

        // Mock a Ron score result for 40 fu 1 han
        // From my debug script: Ko Ron 40fu 1han => oya pays 2000, ko pays 1300.
        const scoreResult = {
            han: 1,
            fu: 40,
            ten: 1300,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        // We use private methods for testing if needed, or trigger via public ones.
        // endKyoku is private. We can use (game as any) for testing.

        // Scenario 1: Ko wins from Oya
        ;(
            game as unknown as {
                endKyoku: (
                    roomId: string,
                    result: {
                        reason: 'ron' | 'tsumo' | 'ryuukyoku'
                        winnerId?: string
                        loserId?: string
                        score?: ScoreCalculation
                    },
                ) => void
            }
        ).endKyoku('test-room', {
            reason: 'ron',
            winnerId: ko.getId(),
            loserId: oya.getId(),
            score: scoreResult,
        })

        expect(oya.points).toBe(25000 - 2000)
        expect(ko.points).toBe(25000 + 2000)
    })

    it('should deduct standard points from Ko when a Ko wins by Ron (40 fu 1 han)', () => {
        // Find 2 Kos
        const kos = players.filter((p) => !p.isOya)
        const winner = kos[0]
        const loser = kos[1]

        const scoreResult = {
            han: 1,
            fu: 40,
            ten: 1300,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        ;(
            game as unknown as {
                endKyoku: (
                    roomId: string,
                    result: {
                        reason: 'ron' | 'tsumo' | 'ryuukyoku'
                        winnerId?: string
                        loserId?: string
                        score?: ScoreCalculation
                    },
                ) => void
            }
        ).endKyoku('test-room', {
            reason: 'ron',
            winnerId: winner.getId(),
            loserId: loser.getId(),
            score: scoreResult,
        })

        expect(loser.points).toBe(25000 - 1300)
        expect(winner.points).toBe(25000 + 1300)
    })

    it('should deduct points correctly when Oya wins by Ron (40 fu 1 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const ko = players.find((p) => !p.isOya)!

        // Oya Ron 40fu 1han => 2000
        const scoreResult = {
            han: 1,
            fu: 40,
            ten: 2000,
            yaku: { test: '1飜' },
            yakuman: 0,
            oya: [2000],
            ko: [1300],
            name: '',
            text: '',
        }

        ;(
            game as unknown as {
                endKyoku: (
                    roomId: string,
                    result: {
                        reason: 'ron' | 'tsumo' | 'ryuukyoku'
                        winnerId?: string
                        loserId?: string
                        score?: ScoreCalculation
                    },
                ) => void
            }
        ).endKyoku('test-room', {
            reason: 'ron',
            winnerId: oya.getId(),
            loserId: ko.getId(),
            score: scoreResult,
        })

        expect(ko.points).toBe(25000 - 2000)
        expect(oya.points).toBe(25000 + 2000)
    })

    it('should deduct correct points from Oya and Ko when a Ko wins by Tsumo (40 fu 2 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const winner = players.find((p) => !p.isOya)!
        const otherKos = players.filter((p) => !p.isOya && p !== winner)

        // 40 fu 2 han Ko Tsumo => (1300, 700)
        const scoreResult = {
            han: 2,
            fu: 40,
            ten: 2700,
            yaku: { test: '2飜' },
            yakuman: 0,
            oya: [1300, 1300, 1300],
            ko: [1300, 700, 700],
            name: '',
            text: '',
        }

        ;(
            game as unknown as {
                endKyoku: (
                    roomId: string,
                    result: {
                        reason: 'ron' | 'tsumo' | 'ryuukyoku'
                        winnerId?: string
                        loserId?: string
                        score?: ScoreCalculation
                    },
                ) => void
            }
        ).endKyoku('test-room', {
            reason: 'tsumo',
            winnerId: winner.getId(),
            score: scoreResult,
        })

        expect(oya.points).toBe(25000 - 1300)
        otherKos.forEach((ko) => {
            expect(ko.points).toBe(25000 - 700)
        })
        expect(winner.points).toBe(25000 + 1300 + 700 + 700)
    })

    it('should deduct correct points from all Ko when Oya wins by Tsumo (40 fu 2 han)', () => {
        const oya = players.find((p) => p.isOya)!
        const kos = players.filter((p) => !p.isOya)

        // 40 fu 2 han Oya Tsumo => (1300all)
        const scoreResult = {
            han: 2,
            fu: 40,
            ten: 3900,
            yaku: { test: '2飜' },
            yakuman: 0,
            oya: [1300, 1300, 1300],
            ko: [1300, 700, 700],
            name: '',
            text: '',
        }

        ;(
            game as unknown as {
                endKyoku: (
                    roomId: string,
                    result: {
                        reason: 'ron' | 'tsumo' | 'ryuukyoku'
                        winnerId?: string
                        loserId?: string
                        score?: ScoreCalculation
                    },
                ) => void
            }
        ).endKyoku('test-room', {
            reason: 'tsumo',
            winnerId: oya.getId(),
            score: scoreResult,
        })

        kos.forEach((ko) => {
            expect(ko.points).toBe(25000 - 1300)
        })
        expect(oya.points).toBe(25000 + 3900)
    })
})
