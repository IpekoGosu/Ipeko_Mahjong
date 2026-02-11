import {
    MahjongGame,
    GameUpdate,
} from '@src/modules/mahjong/classes/mahjong.game.class'

interface FinalRankingItem {
    id: string
    points: number
    finalScore: number
    rank: number
}

class TestMahjongGame extends MahjongGame {
    public getInitialPlayerOrder(): string[] {
        return this.initialPlayerOrder
    }

    public triggerHandleGameOver(
        roomId: string,
        events: GameUpdate['events'],
    ): GameUpdate {
        return this.handleGameOver(roomId, events)
    }
}

describe('MahjongGame - Game Over and Ranking', () => {
    let game: TestMahjongGame
    const roomId = 'test-room'

    beforeEach(() => {
        const playerInfos = [
            { id: 'p1', isAi: false },
            { id: 'p2', isAi: false },
            { id: 'p3', isAi: false },
            { id: 'p4', isAi: false },
        ]
        game = new TestMahjongGame(playerInfos)
        game.startGame(roomId)
    })

    it('should correctly rank players based on points and handle tie-breaking with initial seat order', () => {
        const players = game.getPlayers()
        // Force specific points for testing
        // Let's say p1 and p2 tie with 30000 points.
        // Whoever was earlier in the initial seat order should be ranked higher.

        // We can check initialPlayerOrder
        const initialOrder = game.getInitialPlayerOrder()

        // Set everyone to 25000 initially (default)
        players.forEach((p) => (p.points = 25000))

        // p1: 30000, p2: 30000, p3: 20000, p4: 20000
        // Find them by ID to be sure
        const getPlayerById = (id: string) =>
            players.find((p) => p.getId() === id)!

        const firstId = initialOrder[0]
        const secondId = initialOrder[1]
        const thirdId = initialOrder[2]
        const fourthId = initialOrder[3]

        getPlayerById(firstId).points = 30000
        getPlayerById(secondId).points = 30000
        getPlayerById(thirdId).points = 20000
        getPlayerById(fourthId).points = 20000

        // Trigger game over by making someone go below 0 (dobon)
        getPlayerById(fourthId).points = -1000

        // Trigger game over through the helper method
        const update = game.triggerHandleGameOver(roomId, [])

        const gameOverEvent = update.events.find(
            (e) => e.eventName === 'game-over',
        )
        expect(gameOverEvent).toBeDefined()

        const ranking = gameOverEvent?.payload
            .finalRanking as FinalRankingItem[]

        // First should be firstId
        expect(ranking[0].id).toBe(firstId)
        expect(ranking[0].rank).toBe(1)

        // Second should be secondId (tie-broken by seat)
        expect(ranking[1].id).toBe(secondId)
        expect(ranking[1].rank).toBe(2)

        // Third should be thirdId
        expect(ranking[2].id).toBe(thirdId)
        expect(ranking[2].rank).toBe(3)

        // Fourth should be fourthId
        expect(ranking[3].id).toBe(fourthId)
        expect(ranking[3].rank).toBe(4)
    })
})
