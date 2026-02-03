import { Wall } from './wall.class'
import { Player, Meld } from './player.class'
import { Tile } from './tile.class'
import { SimpleAI } from '../ai/simple.ai'
import Riichi from 'riichi'

/**
 * 게임 내에서 발생하는 모든 상태 변화를 담는 객체.
 * 게이트웨이는 이 객체를 받아 클라이언트에게 어떤 이벤트를 보낼지 결정합니다.
 */
export interface GameUpdate {
    roomId: string
    isGameOver: boolean
    reason?: 'tsumo' | 'ryuukyoku' | 'player-disconnected'
    events: {
        eventName: string
        payload: any
        to: 'all' | 'player'
        playerId?: string
    }[]
}

/**
 * MahjongGame 클래스는 한 판의 마작 게임에 대한 모든 규칙과 상태를 관리합니다.
 * 외부에서는 이 클래스의 메서드를 호출하여 게임을 진행시키고,
 * 메서드는 게임 상태 변화에 대한 요약본인 GameUpdate 객체를 반환합니다.
 */
export class MahjongGame {
    private wall: Wall
    private players: Player[]
    private currentTurnIndex: number
    private activeDiscard: { playerId: string; tile: Tile } | null = null

    constructor(playerInfos: { id: string; isAi: boolean }[]) {
        this.wall = new Wall()
        this.wall.shuffle() // Shuffle the wall upon creation

        this.players = playerInfos.map(
            (info, index) => new Player(info.id, index === 0, info.isAi),
        )
        this.dealInitialHands()
        this.currentTurnIndex = 0 // Oya starts
    }

    // #region Public Methods - Game Flow Control

    /** 게임을 시작하고 첫 턴의 정보를 반환합니다. */
    async startGame(roomId: string): Promise<GameUpdate> {
        console.log('Starting game')
        const currentPlayer = this.getCurrentTurnPlayer()

        // AI 턴 처리 (Oya가 AI인 경우)
        if (currentPlayer.isAi) {
            if (currentPlayer.lastDrawnTile) {
                const tileToDiscard = SimpleAI.decideDiscard(
                    currentPlayer.getHand().map((t) => t.toString()),
                )
                const discardResult = await this.discardTile(
                    roomId,
                    currentPlayer.getId(),
                    tileToDiscard,
                )
                return {
                    ...discardResult,
                    events: [
                        {
                            eventName: 'turn-changed',
                            payload: {
                                playerId: currentPlayer.getId(),
                                wallCount: this.wall.getRemainingTiles(),
                                deadWallCount: this.wall.getRemainingDeadWall(),
                            },
                            to: 'all',
                        },
                        ...discardResult.events,
                    ],
                }
            }
        }

        // 사람 플레이어 턴 (이미 14장을 가지고 시작함)
        return {
            roomId,
            isGameOver: false,
            events: [
                {
                    eventName: 'turn-changed',
                    payload: {
                        playerId: currentPlayer.getId(),
                        wallCount: this.wall.getRemainingTiles(),
                        deadWallCount: this.wall.getRemainingDeadWall(),
                    },
                    to: 'all',
                },
            ],
        }
    }

    /** 현재 턴인 플레이어가 타일을 버립니다. */
    async discardTile(
        roomId: string,
        playerId: string,
        tileString: string,
    ): Promise<GameUpdate> {
        console.log(`Discarding tile: ${tileString}`)
        const player = this.getPlayer(playerId)
        const currentPlayer = this.getCurrentTurnPlayer()

        if (!player || player !== currentPlayer) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Not your turn' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }

        const discardedTile = player.discard(tileString)
        if (!discardedTile) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Invalid tile to discard' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }

        this.activeDiscard = { playerId, tile: discardedTile }

        // 턴을 넘기기 전, 버린 패 정보를 생성
        const events: GameUpdate['events'] = [
            {
                eventName: 'update-discard',
                payload: { playerId, tile: tileString },
                to: 'all',
            },
        ]

        // 버린 패 정보만 반환 (턴 넘기기는 별도로 수행)
        return {
            roomId,
            isGameOver: false,
            events: events,
        }
    }

    /** 턴을 넘기고 다음 플레이어의 턴을 진행합니다. */
    async proceedToNextTurn(roomId: string): Promise<GameUpdate> {
        this.advanceTurn()
        return this.drawTileForCurrentPlayer(roomId)
    }

    /** 현재 턴인 플레이어가 쓰모를 선언합니다. */
    declareTsumo(roomId: string, playerId: string): GameUpdate {
        const player = this.getPlayer(playerId)
        if (!player) {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Player not found' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }
        const result = this.verifyTsumo(player)

        if (result.isAgari) {
            return {
                roomId,
                isGameOver: true,
                reason: 'tsumo',
                events: [
                    {
                        eventName: 'game-over',
                        payload: {
                            reason: 'tsumo',
                            winnerId: playerId,
                            score: result.score,
                        },
                        to: 'all',
                    },
                ],
            }
        } else {
            return {
                roomId,
                isGameOver: false,
                events: [
                    {
                        eventName: 'error',
                        payload: { message: 'Invalid Tsumo' },
                        to: 'player',
                        playerId,
                    },
                ],
            }
        }
    }

    /**
     * 타패된 패에 대해 다른 플레이어들이 취할 수 있는 행동을 계산합니다.
     */
    getPossibleActions(
        discarderId: string,
        tileString: string,
    ): { [playerId: string]: any } {
        const discarder = this.getPlayer(discarderId)
        if (!discarder) return {}

        const discarderIndex = this.players.indexOf(discarder)
        const actions: { [playerId: string]: any } = {}

        this.players.forEach((player, index) => {
            if (player.getId() === discarderId) return

            const hand = player.getHand()
            const possibleActions: any = {}
            let hasAction = false

            // 1. Check Ron (Simple check)
            const handStr = player.getHandString() + tileString
            const ronCheck = new Riichi(handStr).calc()
            if (ronCheck.isAgari) {
                possibleActions.ron = true
                hasAction = true
            }

            // 2. Check Pon/Kan
            const count = hand.filter((t) => t.toString() === tileString).length
            if (count >= 2) {
                possibleActions.pon = true
                hasAction = true
            }
            if (count >= 3) {
                possibleActions.kan = true
                hasAction = true
            }

            // 3. Check Chi (Only next player)
            if ((discarderIndex + 1) % this.players.length === index) {
                const chiOptions = this.checkChi(player, tileString)
                if (chiOptions.length > 0) {
                    possibleActions.chi = true
                    possibleActions.chiOptions = chiOptions
                    hasAction = true
                }
            }

            if (hasAction) {
                actions[player.getId()] = possibleActions
            }
        })

        return actions
    }

    /** 치/펑/깡/론 행동을 수행합니다. */
    performAction(
        roomId: string,
        playerId: string,
        actionType: 'chi' | 'pon' | 'kan' | 'ron',
        tileString: string,
        consumedTiles: string[] = [], // Hand tiles used for the call
    ): GameUpdate {
        const player = this.getPlayer(playerId)
        if (!player) throw new Error('Player not found')

        if (actionType === 'ron') {
            return this.declareTsumo(roomId, playerId) // Reusing tsumo logic for now
        }

        // Validate active discard
        if (!this.activeDiscard || this.activeDiscard.tile.toString() !== tileString) {
             console.error("Action attempted on invalid tile", this.activeDiscard?.tile.toString(), tileString);
             // Proceed cautiously or return error. For now, assuming sync is correct.
        }
        
        // Handle Chi/Pon/Kan
        // 1. Remove tiles from hand
        const removedTiles = player.removeTiles(consumedTiles)

        // 2. Create Meld
        const discarder = this.getPlayer(this.activeDiscard!.playerId)!
        const takenTile = discarder.removeDiscard(tileString) 
        
        if (!takenTile) {
            console.error("Could not find discarded tile in discarder's pile");
            // Fallback: use the activeDiscard.tile if not in pile (should not happen if logic is correct)
        }

        const meldTiles = [...removedTiles, takenTile || this.activeDiscard!.tile];
        // Sort/Order might be needed for display, but simple array is fine for now.
        
        const meld: Meld = {
            type: actionType,
            tiles: meldTiles
        }
        player.addMeld(meld)

        // Reset active discard since it's consumed
        this.activeDiscard = null

        // Update turn to this player
        this.currentTurnIndex = this.players.indexOf(player)

        // Create event
        const events: GameUpdate['events'] = [
            {
                eventName: 'update-meld',
                payload: {
                    playerId,
                    type: actionType,
                    tiles: meldTiles.map(t => t.toString()),
                },
                to: 'all',
            },
            {
                eventName: 'turn-changed',
                payload: {
                    playerId,
                    wallCount: this.wall.getRemainingTiles(),
                    deadWallCount: this.wall.getRemainingDeadWall(),
                },
                to: 'all',
            },
        ]

        // After calling, the player must discard.
        // If it was Kan, they might need to draw a replacement tile.
        // For Chi/Pon, they just discard.

        return {
            roomId,
            isGameOver: false,
            events,
        }
    }

    // #endregion

    // #region Private Helper Methods

    /** 턴을 다음 플레이어로 넘깁니다. */
    private advanceTurn(): void {
        console.log('Advancing turn')
        console.log(`Current turn index: ${this.currentTurnIndex}`)
        this.currentTurnIndex =
            (this.currentTurnIndex + 1) % this.players.length
    }

    /** 현재 턴의 플레이어를 위해 타일을 뽑고, AI라면 자동으로 버립니다. */
    private async drawTileForCurrentPlayer(
        roomId: string,
    ): Promise<GameUpdate> {
        const currentPlayer = this.getCurrentTurnPlayer()
        const tile = this.wall.draw()

        if (!tile) {
            // 유국 (Ryuukyoku)
            return {
                roomId,
                isGameOver: true,
                reason: 'ryuukyoku',
                events: [
                    {
                        eventName: 'game-over',
                        payload: { reason: 'ryuukyoku' },
                        to: 'all',
                    },
                ],
            }
        }

        currentPlayer.draw(tile)

        // AI 턴 처리
        if (currentPlayer.isAi) {
            if (currentPlayer.lastDrawnTile) {
                const tileToDiscard = SimpleAI.decideDiscard(
                    currentPlayer.getHand().map((t) => t.toString()),
                ) // 쯔모기리
                const discardResult = await this.discardTile(
                    roomId,
                    currentPlayer.getId(),
                    tileToDiscard,
                )
                return {
                    ...discardResult,
                    events: [
                        {
                            eventName: 'turn-changed',
                            payload: {
                                playerId: currentPlayer.getId(),
                                wallCount: this.wall.getRemainingTiles(),
                                deadWallCount: this.wall.getRemainingDeadWall(),
                            },
                            to: 'all',
                        },
                        ...discardResult.events,
                    ],
                }
            }
        }

        // 사람 플레이어 턴
        return {
            roomId,
            isGameOver: false,
            events: [
                {
                    eventName: 'turn-changed',
                    payload: {
                        playerId: currentPlayer.getId(),
                        wallCount: this.wall.getRemainingTiles(),
                        deadWallCount: this.wall.getRemainingDeadWall(),
                    },
                    to: 'all',
                },
                {
                    eventName: 'new-tile-drawn',
                    payload: { tile: tile.toString() },
                    to: 'player',
                    playerId: currentPlayer.getId(),
                },
            ],
        }
    }

    /** 플레이어의 패가 쓰모 조건에 맞는지 검증합니다. */
    private verifyTsumo(player: Player): { isAgari: boolean; score: any } {
        if (!player || player.lastDrawnTile === null) {
            return { isAgari: false, score: null }
        }
        const handString = player.getFullHandString()
        const result = new Riichi(handString).calc()

        if (result.isAgari) {
            return {
                isAgari: true,
                score: {
                    han: result.han,
                    fu: result.fu,
                    ten: result.ten,
                    yaku: result.yaku,
                    yakuman: result.yakuman,
                    oya: result.oya,
                    ko: result.ko,
                    name: result.name,
                    text: result.text,
                },
            }
        }
        return { isAgari: false, score: null }
    }

    private dealInitialHands(): void {
        // 왕패 14장을 미리 분리
        this.wall.separateDeadWall()

        for (let i = 0; i < 13; i++) {
            for (const player of this.players) {
                const tile = this.wall.draw()
                if (tile) {
                    player.draw(tile)
                }
            }
        }

        // Oya(선)에게 14번째 패(첫 쯔모)를 배패합니다.
        const oya = this.players[0]
        const tile = this.wall.draw()
        if (tile) {
            oya.draw(tile)
        }

        // 첫 도라패 공개
        this.wall.revealDora()
    }

    private checkChi(player: Player, tileString: string): string[][] {
        const rank = parseInt(tileString.slice(0, -1))
        const suit = tileString.slice(-1)
        if (suit === 'z') return []

        const hand = player.getHand()
        const options: string[][] = []

        const has = (r: number) =>
            hand.some((t) => t.getSuit() === suit && t.getRank() === r)

        // Check -2, -1 (e.g. 3,4 for 5)
        if (has(rank - 2) && has(rank - 1)) {
            options.push([`${rank - 2}${suit}`, `${rank - 1}${suit}`])
        }
        // Check -1, +1 (e.g. 4,6 for 5)
        if (has(rank - 1) && has(rank + 1)) {
            options.push([`${rank - 1}${suit}`, `${rank + 1}${suit}`])
        }
        // Check +1, +2 (e.g. 6,7 for 5)
        if (has(rank + 1) && has(rank + 2)) {
            options.push([`${rank + 1}${suit}`, `${rank + 2}${suit}`])
        }

        return options
    }

    // #endregion

    // #region Public Getters

    getPlayers(): Player[] {
        return this.players
    }

    getPlayer(id: string): Player | undefined {
        return this.players.find((p) => p.getId() === id)
    }

    getCurrentTurnPlayer(): Player {
        return this.players[this.currentTurnIndex]
    }

    getDora(): Tile[] {
        return this.wall.getDora()
    }

    getWallCount(): number {
        return this.wall.getRemainingTiles()
    }

    getDeadWallCount(): number {
        return this.wall.getRemainingDeadWall()
    }

    // #endregion
}
