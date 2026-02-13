import { MahjongGame } from '@src/modules/mahjong/classes/AbstractMahjongGame'
import { ScoreCalculation } from '@src/modules/mahjong/interfaces/mahjong.types'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'
import { SimpleAI } from '@src/modules/mahjong/classes/ai/simple.ai'

class TestMahjongGame extends MahjongGame {
    public setSuddenDeath(val: boolean) {
        this.roundManager.isSuddenDeath = val
    }
    public setBakaze(val: '1z' | '2z' | '3z' | '4z') {
        this.roundManager.bakaze = val
    }
    public setKyokuNum(val: number) {
        this.roundManager.kyokuNum = val
    }
    public setOyaIndex(val: number) {
        this.roundManager.oyaIndex = val
        this.getPlayers().forEach((p, idx) => {
            p.isOya = idx === val
        })
    }
    public callEndKyoku(
        roomId: string,
        result: {
            reason: 'ron' | 'tsumo' | 'ryuukyoku'
            winners?: { winnerId: string; score: ScoreCalculation }[]
            winnerId?: string
            loserId?: string
            score?: ScoreCalculation
        },
    ) {
        return this.endKyoku(roomId, result)
    }
}

describe('MahjongGame - Indefinite Sudden Death', () => {
    let game: TestMahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        const ai = new SimpleAI()
        game = new TestMahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true, ai },
                { id: 'p3', isAi: true, ai },
                { id: 'p4', isAi: true, ai },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame(roomId)
    })

    it('should enter sudden death after South 4 if no one has 30000 points', () => {
        game.setBakaze('2z')
        game.setKyokuNum(4)
        game.setOyaIndex(3) // Last player is Oya

        const players = game.getPlayers()
        players.forEach((p) => (p.points = 25000))

        // Ko (p1) wins Ron from p2
        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: players[0].getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(false)
        expect(game.roundManager.isSuddenDeath).toBe(true)
        expect(game.roundManager.bakaze).toBe('3z') // North round
        expect(game.roundManager.kyokuNum).toBe(1)
    })

    it('should continue through North round in sudden death', () => {
        game.setSuddenDeath(true)
        game.setBakaze('3z')
        game.setKyokuNum(4)
        game.setOyaIndex(3)

        const players = game.getPlayers()
        players.forEach((p) => (p.points = 25000))

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: players[0].getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(false)
        expect(game.roundManager.bakaze).toBe('4z') // North 4 -> White 1? Actually the loop logic in RoundManager4p: nextBakaze = windOrder[(currentIndex + 1) % 4]
        expect(game.roundManager.kyokuNum).toBe(1)
    })

    it('should loop back to East round after North 4 if still no one has 30000 points', () => {
        game.setSuddenDeath(true)
        game.setBakaze('4z') // Assume 4z is North
        game.setKyokuNum(4)
        game.setOyaIndex(3)

        const players = game.getPlayers()
        players.forEach((p) => (p.points = 25000))

        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: players[0].getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(false)
        expect(game.roundManager.bakaze).toBe('1z') // Looped back to East
        expect(game.roundManager.kyokuNum).toBe(1)
    })

    it('should end the game immediately in sudden death if someone reaches 30000 points', () => {
        game.setSuddenDeath(true)
        game.setBakaze('3z')
        game.setKyokuNum(1)

        const players = game.getPlayers()
        players.forEach((p) => (p.points = 25000))
        const pWinner = players[2]
        pWinner.points = 29500

        // pWinner wins Ron (1000 pts) -> 30500
        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1000,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: pWinner.getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(true)
        expect(pWinner.points).toBeGreaterThanOrEqual(30000)
    })

    it('should allow Agari-yame for Oya in sudden death if they are top and reach 30000', () => {
        game.setSuddenDeath(true)
        game.setBakaze('3z')
        game.setKyokuNum(1)
        game.setOyaIndex(0) // 1st player in array is Oya

        const players = game.getPlayers()
        const oya = players[0]
        oya.points = 29500

        // oya wins by Ron (1500 pts)
        const mockScore: ScoreCalculation = {
            han: 1,
            fu: 30,
            ten: 1500,
            yaku: { Riichi: '1' },
            yakuman: 0,
            oya: [1500, 500],
            ko: [1000, 300, 500],
            name: 'Riichi',
            text: '1 Han 30 Fu',
        }

        const result = game.callEndKyoku(roomId, {
            reason: 'ron',
            winners: [{ winnerId: oya.getId(), score: mockScore }],
            loserId: players[1].getId(),
        })

        expect(result.isGameOver).toBe(true) // Agari-yame
        expect(oya.points).toBeGreaterThanOrEqual(30000)
    })
})
