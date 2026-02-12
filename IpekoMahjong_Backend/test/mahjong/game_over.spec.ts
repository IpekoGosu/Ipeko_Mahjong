import {
    MahjongGame,
    GameUpdate,
} from '@src/modules/mahjong/classes/AbstractMahjongGame'
import { RoundManager4p } from '@src/modules/mahjong/classes/managers/RoundManager.4p'
import { TurnManager } from '@src/modules/mahjong/classes/managers/TurnManager'
import { ActionManager4p } from '@src/modules/mahjong/classes/managers/ActionManager.4p'

interface FinalRankingEntry {
    id: string
    points: number
    rank: number
}

describe('MahjongGame - Game Over and Ranking', () => {
    let game: MahjongGame
    let roomId: string

    beforeEach(() => {
        roomId = 'test-room'
        // Create game with specific IDs to test tie-breaking
        // Seating order will be randomized in startGame, but we'll use IDs to track.
        game = new MahjongGame(
            [
                { id: 'p1', isAi: false },
                { id: 'p2', isAi: true },
                { id: 'p3', isAi: true },
                { id: 'p4', isAi: true },
            ],
            new RoundManager4p(),
            new TurnManager(),
            new ActionManager4p(),
        )
        game.startGame(roomId)
    })

    it('should correctly rank players based on points and handle tie-breaking with initial seat order', () => {
        const players = game.getPlayers()
        // Force points
        players[0].points = 35000 // Top
        players[1].points = 25000 // Tied
        players[2].points = 25000 // Tied
        players[3].points = 15000 // Last

        // p2 and p3 are tied. Tie-breaker is initial seat order.
        // RoundManager uses initialPlayerOrder to tie-break.
        // We need to see who comes first in initialPlayerOrder.
        const order = game.roundManager.initialPlayerOrder
        const p2Idx = order.indexOf(players[1].getId())
        const p3Idx = order.indexOf(players[2].getId())

        const expectedRank2 =
            p2Idx < p3Idx ? players[1].getId() : players[2].getId()
        const expectedRank3 =
            p2Idx < p3Idx ? players[2].getId() : players[1].getId()

        // Trigger game over via dobon (simplest way)
        players[3].points = -500

        const result: GameUpdate = game.roundManager.handleGameOver(
            roomId,
            players,
            [],
        )

        expect(result.isGameOver).toBe(true)
        const ranking = result.events.find((e) => e.eventName === 'game-over')
            ?.payload.finalRanking as FinalRankingEntry[]

        expect(ranking[0].id).toBe(players[0].getId())
        expect(ranking[1].id).toBe(expectedRank2)
        expect(ranking[2].id).toBe(expectedRank3)
        expect(ranking[3].id).toBe(players[3].getId())

        expect(ranking[0].rank).toBe(1)
        expect(ranking[1].rank).toBe(2)
        expect(ranking[2].rank).toBe(3)
        expect(ranking[3].rank).toBe(4)
    })
})
