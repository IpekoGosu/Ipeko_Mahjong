import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import MahjongTile from './components/MahjongTile'
import ActionButtons from './components/ActionButtons'
import GameOverModal from './components/GameOverModal'
import {
    GameState,
    GameStartedPayload,
    RoundStartedPayload,
    RoundEndedPayload,
    TurnChangedPayload,
    NewTileDrawnPayload,
    UpdateDiscardPayload,
    GameOverPayload,
    ErrorPayload,
    AskActionPayload,
    UpdateMeldPayload,
} from './types'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const SOCKET_URL = 'http://localhost:3000'

function App() {
    const [state, setState] = useState<GameState>({
        isConnected: false,
        roomId: null,
        myPlayerId: null,
        myHand: [],
        drawnTile: null,
        dora: [],
        actualDora: [],
        players: [],
        wallCount: 0,
        deadWallCount: 0,
        dealerId: null,
        actionRequest: null,
        gameOverData: null,
        roundEndedData: null,
        riichiDiscards: [],
        canTsumo: false,
        waits: [],
        ankanList: [],
        kakanList: [],
        logs: [],
        bakaze: '1z',
        kyoku: 1,
        honba: 0,
        kyotaku: 0
    })

    const [riichiIntent, setRiichiIntent] = useState(false)

    const socketRef = useRef<Socket | null>(null)
    const myPlayerIdRef = useRef<string | null>(null)

    const sortTiles = (tiles: string[]) => {
        const suitOrder: Record<string, number> = { m: 0, p: 1, s: 2, z: 3 }
        return [...tiles].sort((a, b) => {
            const suitA = a[1]
            const suitB = b[1]
            if (suitA !== suitB) return suitOrder[suitA] - suitOrder[suitB]

            // Treat '0' (Aka Dora) as '5' for sorting purposes
            const valA = a[0] === '0' ? '5' : a[0]
            const valB = b[0] === '0' ? '5' : b[0]

            if (valA !== valB) return valA.localeCompare(valB)

            // If both are rank 5, prioritize Aka Dora ('0' comes before '5')
            return a[0].localeCompare(b[0])
        })
    }

    const addLog = useCallback((message: string) => {
        setState((prev) => ({
            ...prev,
            logs: [message, ...prev.logs].slice(0, 50),
        }))
    }, [])

    useEffect(() => {
        const socket = io(SOCKET_URL)
        socketRef.current = socket

        socket.on('connect', () => {
            setState((prev) => ({ ...prev, isConnected: true }))
            addLog('Connected to server')
        })

        socket.on('disconnect', () => {
            setState((prev) => ({ ...prev, isConnected: false }))
            addLog('Disconnected from server')
        })

        socket.on('game-started', (payload: GameStartedPayload) => {
            addLog(`Game started: Room ${payload.roomId}`)
            myPlayerIdRef.current = payload.yourPlayerId
            setState((prev) => ({
                ...prev,
                roomId: payload.roomId,
                myPlayerId: payload.yourPlayerId,
                dora: payload.dora,
                actualDora: payload.actualDora || [],
                wallCount: payload.wallCount,
                deadWallCount: payload.deadWallCount,
                dealerId: payload.oyaId,
                myHand: sortTiles(payload.hand),
                riichiDiscards: payload.riichiDiscards || [],
                players: payload.players.map((p) => ({
                    id: p.id,
                    isAi: p.isAi,
                    handCount: 13,
                    discards: [],
                    melds: [],
                    isMyTurn: false,
                    isRiichi: false,
                    points: 25000, // Initial default
                    jikaze: p.jikaze
                })),
            }))
        })

        socket.on('round-started', (payload: RoundStartedPayload) => {
             addLog(`Round Started: ${payload.bakaze}-${payload.kyoku}`)
             setState(prev => ({
                 ...prev,
                 myHand: sortTiles(payload.hand),
                 dora: payload.dora,
                 actualDora: payload.actualDora || [],
                 wallCount: payload.wallCount,
                 bakaze: payload.bakaze,
                 kyoku: payload.kyoku,
                 honba: payload.honba,
                 kyotaku: payload.kyotaku,
                 dealerId: payload.oyaId,
                 roundEndedData: null,
                 gameOverData: null,
                 waits: [],
                 players: prev.players.map(p => {
                     const scoreInfo = payload.scores.find(s => s.id === p.id)
                     return {
                         ...p,
                         handCount: 13,
                         discards: [],
                         melds: [],
                         isRiichi: false,
                         isFuriten: false,
                         points: scoreInfo ? scoreInfo.points : p.points,
                         jikaze: scoreInfo ? scoreInfo.jikaze : p.jikaze
                     }
                 })
             }))
        })

        socket.on('round-ended', (payload: RoundEndedPayload) => {
            addLog(`Round Ended: ${payload.reason}`)
            setState(prev => ({
                ...prev,
                roundEndedData: payload,
                players: prev.players.map(p => {
                     const scoreInfo = payload.scores.find(s => s.id === p.id)
                     return {
                         ...p,
                         points: scoreInfo ? scoreInfo.points : p.points
                     }
                })
            }))
        })

        socket.on('turn-changed', (payload: TurnChangedPayload) => {
            setState((prev) => {
                const newPlayers = prev.players.map((p) => {
                    const isTarget = p.id === payload.playerId
                    return {
                        ...p,
                        isMyTurn: isTarget,
                        isFuriten: isTarget ? payload.isFuriten : p.isFuriten,
                        // If it's an AI's turn, we visually "add" a tile to their hand
                        handCount:
                            isTarget && p.id !== prev.myPlayerId
                                ? p.handCount + 1
                                : p.handCount,
                    }
                })
                return {
                    ...prev,
                    players: newPlayers,
                    wallCount: payload.wallCount,
                    deadWallCount: payload.deadWallCount,
                    dora: payload.dora || prev.dora,
                    actualDora: payload.actualDora || prev.actualDora,
                    actionRequest: null,
                    canTsumo: false,
                    riichiDiscards: [],
                    ankanList: [],
                    kakanList: [],
                }
            })
            setRiichiIntent(false)
        })

        socket.on('riichi-declared', (payload: { playerId: string }) => {
            addLog(
                `Player ${payload.playerId === myPlayerIdRef.current ? 'You' : payload.playerId} declared RIICHI!`,
            )
            setState((prev) => ({
                ...prev,
                players: prev.players.map((p) =>
                    p.id === payload.playerId ? { ...p, isRiichi: true } : p,
                ),
            }))
        })

        socket.on('new-tile-drawn', (payload: NewTileDrawnPayload) => {
            addLog(`You drew: ${payload.tile}`)
            setState((prev) => ({
                ...prev,
                drawnTile: payload.tile,
                riichiDiscards: payload.riichiDiscards || [],
                canTsumo: !!payload.canTsumo,
                waits: payload.waits || [],
                ankanList: payload.ankanList || [],
                kakanList: payload.kakanList || [],
                dora: payload.dora || prev.dora,
                actualDora: payload.actualDora || prev.actualDora,
                actionRequest: null,
                players: prev.players.map((p) =>
                    p.id === prev.myPlayerId
                        ? { ...p, isFuriten: payload.isFuriten }
                        : p,
                ),
            }))
        })

        socket.on('update-discard', (payload: UpdateDiscardPayload) => {
            const isMeLog = payload.playerId === myPlayerIdRef.current
            addLog(
                `${isMeLog ? 'You' : 'Player ' + payload.playerId} discarded: ${payload.tile}`,
            )

            setState((prev) => {
                const isMe = payload.playerId === prev.myPlayerId
                const newPlayers = prev.players.map((p) => {
                    if (p.id === payload.playerId) {
                        // Correctly update handCount for both me and AI
                        // (Client hand count should match actual hand size)
                        const currentCount = p.handCount
                        return {
                            ...p,
                            discards: [...p.discards, payload.tile],
                            handCount: Math.max(0, currentCount - 1),
                            isFuriten: payload.isFuriten,
                        }
                    }
                    return p
                })

                let newHand = [...prev.myHand]
                let newDrawnTile = prev.drawnTile

                if (isMe) {
                    if (payload.tile === prev.drawnTile) {
                        newDrawnTile = null
                    } else {
                        const index = newHand.indexOf(payload.tile)
                        if (index > -1) {
                            newHand.splice(index, 1)
                            if (prev.drawnTile) {
                                newHand.push(prev.drawnTile)
                                newDrawnTile = null
                            }
                        }
                    }
                    newHand = sortTiles(newHand)
                }

                return {
                    ...prev,
                    players: newPlayers,
                    actionRequest: null,
                    myHand: newHand,
                    drawnTile: newDrawnTile,
                    waits: payload.waits || prev.waits,
                }
            })
        })

        socket.on('ask-action', (payload: AskActionPayload) => {
            addLog(
                `Action available: ${payload.ron ? 'RON ' : ''}${payload.pon ? 'PON ' : ''}${payload.chi ? 'CHI ' : ''}on ${payload.tile}`,
            )
            setState((prev) => ({ ...prev, actionRequest: payload }))
        })

        socket.on('update-meld', (payload: UpdateMeldPayload) => {
            const isMe = payload.playerId === myPlayerIdRef.current
            addLog(
                `${isMe ? 'You' : 'Player ' + payload.playerId} declared ${payload.type.toUpperCase()}: ${payload.tiles.join(', ')}`,
            )

            setState((prev) => {
                const newPlayers = prev.players.map((p) => {
                    // Update the caller (person who made the meld)
                    if (p.id === payload.playerId) {
                        const tilesTakenFromHand = payload.tiles.length - 1
                        return {
                            ...p,
                            melds: [
                                ...p.melds,
                                {
                                    tiles: payload.tiles,
                                    stolenFrom: payload.stolenFrom,
                                },
                            ],
                            handCount: Math.max(
                                0,
                                p.handCount - tilesTakenFromHand,
                            ),
                            isFuriten: payload.isFuriten,
                        }
                    }

                    // Update the discarder (person whose tile was stolen)
                    if (payload.stolenFrom && p.id === payload.stolenFrom) {
                        const newDiscards = [...p.discards]
                        newDiscards.pop() // Remove the last discard
                        return {
                            ...p,
                            discards: newDiscards,
                        }
                    }

                    return p
                })

                let newHand = [...prev.myHand]
                if (isMe && prev.actionRequest) {
                    // Remove the tiles used for meld from hand (excluding the stolen tile)
                    const stolenTile = prev.actionRequest.tile
                    const tilesToRemove = [...payload.tiles]
                    const stolenIdx = tilesToRemove.indexOf(stolenTile)
                    if (stolenIdx > -1) tilesToRemove.splice(stolenIdx, 1)

                    tilesToRemove.forEach((t) => {
                        const idx = newHand.indexOf(t)
                        if (idx > -1) newHand.splice(idx, 1)
                    })

                    // If we had a drawn tile, it moves into the hand because meld happens on someone else's turn
                    if (prev.drawnTile) {
                        newHand.push(prev.drawnTile)
                    }
                    newHand = sortTiles(newHand)
                }

                return {
                    ...prev,
                    players: newPlayers,
                    myHand: newHand,
                    drawnTile: null,
                    actionRequest: null,
                    waits: payload.waits || prev.waits,
                }
            })
        })

        socket.on('game-over', (payload: GameOverPayload) => {
            let msg = `Game Over: ${payload.reason}`
            if (payload.winnerId) msg += ` | Winner: ${payload.winnerId}`
            if (payload.score) {
                msg += `Score Results: ${JSON.stringify(payload.score, null, 2)}`
            }
            addLog(msg)
            setState((prev) => ({ ...prev, gameOverData: payload }))
        })

        socket.on('error', (payload: ErrorPayload) => {
            addLog(`Error: ${payload.message}`)
            alert(payload.message)
        })

        return () => {
            socket.disconnect()
        }
    }, [addLog])

    const handleStartGame = () => {
        socketRef.current?.emit('start-game')
    }

    const handleNextRound = () => {
        if (!state.roomId) return
        socketRef.current?.emit('next-round', { roomId: state.roomId })
    }

    const handleDiscard = (tile: string) => {
        if (!state.roomId) return
        socketRef.current?.emit('discard-tile', {
            roomId: state.roomId,
            tile,
            isRiichi: riichiIntent,
        })
        setRiichiIntent(false)
    }

    const handleTsumo = () => {
        if (!state.roomId) return
        socketRef.current?.emit('declare-tsumo', { roomId: state.roomId })
    }

    const handleRiichi = () => {
        setRiichiIntent((prev) => !prev)
    }

    const handleTakeAction = (type: string, tiles?: string[]) => {
        if (!state.roomId) return
        const targetTile = state.actionRequest?.tile
        if (!targetTile && type !== 'skip') return

        // Filter out the target tile from consumedTiles if present,
        // because we only want to specify which tiles to remove from hand.
        // Although Player.removeTiles is safe, it's cleaner to send only hand tiles.
        const consumedTiles = tiles
            ? tiles.filter((t) => t !== targetTile)
            : undefined

        socketRef.current?.emit('select-action', {
            roomId: state.roomId,
            type,
            tile: targetTile,
            consumedTiles,
        })
    }

    const handleIgnoreAction = () => {
        if (!state.roomId) return
        const targetTile = state.actionRequest?.tile
        socketRef.current?.emit('select-action', {
            roomId: state.roomId,
            type: 'skip',
            tile: targetTile,
        })
        setState((prev) => ({ ...prev, actionRequest: null }))
    }

    const handleSelfKan = (type: 'ankan' | 'kakan', tile: string) => {
        if (!state.roomId) return
        socketRef.current?.emit('select-action', {
            roomId: state.roomId,
            type,
            tile,
        })
    }

    const myPlayer = state.players.find((p) => p.id === state.myPlayerId)

    // 반시계 방향 배치 로직 (내 위치 기준)
    const myIndex = state.players.findIndex((p) => p.id === state.myPlayerId)
    const getPlayerByOffset = (offset: number) => {
        if (myIndex === -1 || state.players.length === 0) return undefined
        return state.players[(myIndex + offset) % state.players.length]
    }

    const rightPlayer = getPlayerByOffset(1) // 하가 (Next)
    const oppositePlayer = getPlayerByOffset(2) // 대면
    const leftPlayer = getPlayerByOffset(3) // 상가 (Prev)

    // Helper to determine which tile in a meld should be rotated
    const getRotatedTileIndex = (playerId: string, stolenFromId?: string) => {
        if (!stolenFromId) return -1
        const playerIdx = state.players.findIndex((p) => p.id === playerId)
        const stolenFromIdx = state.players.findIndex(
            (p) => p.id === stolenFromId,
        )
        if (playerIdx === -1 || stolenFromIdx === -1) return -1

        // 1: Left player, 2: Opposite, 3: Right
        const relativePos = (playerIdx - stolenFromIdx + 4) % 4
        if (relativePos === 1) return 0 // Left player -> 1st tile
        if (relativePos === 2) return 1 // Opposite player -> Middle tile (approximated for Kan)
        if (relativePos === 3) return 2 // Right player -> Last tile (assuming 3 tiles for Pon/Chi)
        return -1
    }

    const getWindName = (wind: string) => {
        switch (wind) {
            case '1z': return 'East (東)'
            case '2z': return 'South (南)'
            case '3z': return 'West (西)'
            case '4z': return 'North (北)'
            default: return 'East'
        }
    }

    const isDora = (tile: string) => {
        // Red 5 is always dora in most rules (though usually designated by indicator too)
        // If rank is 0, it's aka dora.
        if (tile[0] === '0') return true
        return state.actualDora.includes(tile)
    }

    if (!state.roomId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-4xl font-bold mb-8">Ipeko Mahjong</h1>
                <div className="p-8 bg-gray-800 rounded-lg shadow-xl">
                    <p className="mb-4">
                        Status:{' '}
                        {state.isConnected ? '✅ Connected' : '❌ Disconnected'}
                    </p>
                    <button
                        onClick={handleStartGame}
                        disabled={!state.isConnected}
                        className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-bold transition-colors"
                    >
                        Start Single Player Game
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-2 flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
            {/* Mahjong Table Area */}
            <div className="flex-grow flex items-center justify-center py-2 min-h-0">
                <div className="grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center w-full max-w-2xl h-full max-h-[60vh]">
                    {/* Row 1, Col 2: Opposite AI */}
                    <div
                        className={cn(
                            'col-start-2 row-start-1 flex flex-col items-center p-2 rounded-lg transition-all',
                            oppositePlayer?.isMyTurn
                                ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : '',
                        )}
                    >
                        <div className="text-[10px] mb-0.5 flex items-center gap-1 opacity-80 font-bold uppercase tracking-tighter">
                            <span className="bg-gray-700 px-1 rounded text-white mr-1 font-mono">{oppositePlayer?.points}</span>
                            {oppositePlayer?.id === state.dealerId && (
                                <span className="bg-red-600 text-white px-1 rounded font-bold">
                                    親
                                </span>
                            )}
                            TOIMEN{' '}
                            {oppositePlayer?.isMyTurn && (
                                <span className="text-blue-400 animate-pulse ml-1">
                                    ●
                                </span>
                            )}
                            {oppositePlayer?.isRiichi && (
                                <span className="bg-orange-600 text-white px-1 rounded text-[8px] font-black animate-bounce ml-1 shadow-sm">
                                    RIICHI
                                </span>
                            )}
                            {oppositePlayer?.isFuriten && (
                                <span className="bg-purple-600 text-white px-1 rounded text-[8px] font-black ml-1 shadow-sm">
                                    FURITEN
                                </span>
                            )}
                        </div>

                        {/* Opposite Melds */}
                        <div className="flex gap-1 mb-1">
                            {oppositePlayer?.melds.map((meld, i) => {
                                const rotatedIdx = getRotatedTileIndex(
                                    oppositePlayer.id,
                                    meld.stolenFrom,
                                )
                                return (
                                    <div
                                        key={i}
                                        className="flex border border-blue-900/30 p-0.5 rounded bg-gray-800/50 scale-75 items-center"
                                    >
                                        {meld.tiles.map((t, j) => (
                                            <MahjongTile
                                                key={j}
                                                tile={t}
                                                isDora={isDora(t)}
                                                className={cn(
                                                    'w-4 h-6 shadow-none transition-transform',
                                                    j === rotatedIdx
                                                        ? 'rotate-90 -mx-0.5'
                                                        : '',
                                                )}
                                            />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Opposite Pond */}
                        <div className="flex flex-wrap gap-0.5 w-[140px] justify-center content-start min-h-[70px] bg-gray-800/30 p-1 rounded relative">
                            {oppositePlayer?.isRiichi && (
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-white border border-gray-400 rounded-sm shadow-sm flex items-center justify-center">
                                    <div className="w-0.5 h-0.5 bg-red-600 rounded-full"></div>
                                </div>
                            )}
                            {oppositePlayer?.discards.map((t, i) => (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    isDora={isDora(t)}
                                    className="w-5 h-7 shadow-none border-gray-700"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Row 2, Col 1: Left AI */}
                    <div
                        className={cn(
                            'col-start-1 row-start-2 flex flex-row items-center gap-1 p-2 rounded-lg transition-all',
                            leftPlayer?.isMyTurn
                                ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : '',
                        )}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-[10px] flex flex-col items-center gap-0.5 opacity-80 -rotate-90 font-bold uppercase tracking-tighter">
                                <span className="bg-gray-700 px-1 rounded text-white mb-1 font-mono">{leftPlayer?.points}</span>
                                {leftPlayer?.id === state.dealerId && (
                                    <span className="bg-red-600 text-white px-1 rounded font-bold">
                                        親
                                    </span>
                                )}
                                <span>KAMICHA</span>
                                {leftPlayer?.isMyTurn && (
                                    <span className="text-blue-400 animate-pulse mt-1">
                                        ●
                                    </span>
                                )}
                                {leftPlayer?.isRiichi && (
                                    <span className="bg-orange-600 text-white px-1 rounded text-[8px] font-black animate-bounce mt-1 shadow-sm">
                                        RIICHI
                                    </span>
                                )}
                                {leftPlayer?.isFuriten && (
                                    <span className="bg-purple-600 text-white px-1 rounded text-[8px] font-black mt-1 shadow-sm">
                                        FURITEN
                                    </span>
                                )}
                            </div>

                            {/* Left Melds */}
                            <div className="flex flex-col gap-1 -rotate-90 origin-center">
                                {leftPlayer?.melds.map((meld, i) => {
                                    const rotatedIdx = getRotatedTileIndex(
                                        leftPlayer.id,
                                        meld.stolenFrom,
                                    )
                                    return (
                                        <div
                                            key={i}
                                            className="flex border border-blue-900/30 p-0.5 rounded bg-gray-800/50 scale-75 items-center"
                                        >
                                            {meld.tiles.map((t, j) => (
                                                <MahjongTile
                                                    key={j}
                                                    tile={t}
                                                    isDora={isDora(t)}
                                                    className={cn(
                                                        'w-4 h-6 shadow-none',
                                                        j === rotatedIdx
                                                            ? 'rotate-90 -mx-0.5'
                                                            : '',
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Left Pond */}
                        <div className="flex flex-wrap gap-0.5 w-[140px] justify-center content-start min-h-[70px] bg-gray-800/30 p-1 rounded relative">
                            {leftPlayer?.isRiichi && (
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white border border-gray-400 rounded-sm shadow-sm flex flex-col items-center justify-center">
                                    <div className="w-0.5 h-0.5 bg-red-600 rounded-full"></div>
                                </div>
                            )}
                            {leftPlayer?.discards.map((t, i) => (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    isDora={isDora(t)}
                                    className="w-5 h-7 shadow-none border-gray-700"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Row 2, Col 2: Center Info Box */}
                    <div className="col-start-2 row-start-2 w-36 h-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl flex flex-col items-center justify-center p-1 relative">
                        <div className="absolute top-1 left-2 text-[10px] font-bold text-white">
                            {getWindName(state.bakaze)} {state.kyoku}-{state.honba}
                        </div>
                        <div className="absolute top-1 right-2 text-[10px] text-yellow-400 font-mono flex items-center gap-0.5">
                             <div className="w-1 h-3 bg-red-500 rounded-sm"></div> {state.kyotaku}
                        </div>

                        <div className="text-[8px] font-bold text-gray-500 mb-0.5 mt-4 tracking-widest uppercase">
                            Dora
                        </div>
                        <div className="flex gap-0.5 mb-1">
                            {state.dora.map((t, i) => (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    className="w-6 h-8"
                                />
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
                            <div className="flex flex-col items-center border-r border-gray-700 pr-2">
                                <span>WALL</span>
                                <span className="text-base text-white font-black">
                                    {state.wallCount}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span>DEAD</span>
                                <span className="text-base text-white font-black">
                                    {state.deadWallCount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2, Col 3: Right AI */}
                    <div
                        className={cn(
                            'col-start-3 row-start-2 flex flex-row-reverse items-center gap-1 p-2 rounded-lg transition-all',
                            rightPlayer?.isMyTurn
                                ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                : '',
                        )}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-[10px] flex flex-col items-center gap-0.5 opacity-80 rotate-90 font-bold uppercase tracking-tighter">
                                <span className="bg-gray-700 px-1 rounded text-white mb-1 font-mono">{rightPlayer?.points}</span>
                                {rightPlayer?.id === state.dealerId && (
                                    <span className="bg-red-600 text-white px-1 rounded font-bold">
                                        親
                                    </span>
                                )}
                                <span>SHIMOCHA</span>
                                {rightPlayer?.isMyTurn && (
                                    <span className="text-blue-400 animate-pulse mt-1">
                                        ●
                                    </span>
                                )}
                                {rightPlayer?.isRiichi && (
                                    <span className="bg-orange-600 text-white px-1 rounded text-[8px] font-black animate-bounce mt-1 shadow-sm">
                                        RIICHI
                                    </span>
                                )}
                                {rightPlayer?.isFuriten && (
                                    <span className="bg-purple-600 text-white px-1 rounded text-[8px] font-black mt-1 shadow-sm">
                                        FURITEN
                                    </span>
                                )}
                            </div>

                            {/* Right Melds */}
                            <div className="flex flex-col gap-1 rotate-90 origin-center">
                                {rightPlayer?.melds.map((meld, i) => {
                                    const rotatedIdx = getRotatedTileIndex(
                                        rightPlayer.id,
                                        meld.stolenFrom,
                                    )
                                    return (
                                        <div
                                            key={i}
                                            className="flex border border-blue-900/30 p-0.5 rounded bg-gray-800/50 scale-75 items-center"
                                        >
                                            {meld.tiles.map((t, j) => (
                                                <MahjongTile
                                                    key={j}
                                                    tile={t}
                                                    isDora={isDora(t)}
                                                    className={cn(
                                                        'w-4 h-6 shadow-none',
                                                        j === rotatedIdx
                                                            ? 'rotate-90 -mx-0.5'
                                                            : '',
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right Pond */}
                        <div className="flex flex-wrap gap-0.5 w-[140px] justify-center content-start min-h-[70px] bg-gray-800/30 p-1 rounded relative">
                            {rightPlayer?.isRiichi && (
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white border border-gray-400 rounded-sm shadow-sm flex flex-col items-center justify-center">
                                    <div className="w-0.5 h-0.5 bg-red-600 rounded-full"></div>
                                </div>
                            )}
                            {rightPlayer?.discards.map((t, i) => (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    isDora={isDora(t)}
                                    className="w-5 h-7 shadow-none border-gray-700"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Row 3, Col 2: My Pond */}
                    <div className="col-start-2 row-start-3 flex flex-col items-center">
                        <div className="flex flex-wrap gap-0.5 w-[140px] justify-center content-start min-h-[70px] bg-gray-800/30 p-1 rounded mb-0.5 relative">
                            {myPlayer?.isRiichi && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-white border border-gray-400 rounded-sm shadow-sm flex items-center justify-center">
                                    <div className="w-0.5 h-0.5 bg-red-600 rounded-full"></div>
                                </div>
                            )}
                            {myPlayer?.discards.map((t, i) => (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    isDora={isDora(t)}
                                    className="w-5 h-7 shadow-none border-gray-700"
                                />
                            ))}
                        </div>
                        <div className="text-[9px] opacity-80 uppercase tracking-tighter">
                            Pond{' '}
                            {myPlayer?.isRiichi && (
                                <span className="ml-1 text-orange-500 font-bold font-black">
                                    RIICHI
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Player Area */}
            <div
                className={cn(
                    'mt-auto border-t border-gray-800 pt-2 pb-1 transition-all',
                    myPlayer?.isMyTurn
                        ? 'bg-blue-500/10 shadow-[0_-10px_30px_rgba(59,130,246,0.2)]'
                        : 'bg-gray-900',
                )}
            >
                <div className="flex flex-col items-center">
                    {/* Player Melds */}
                    <div className="flex gap-2 mb-1">
                        {myPlayer?.melds.map((meld, i) => {
                            const rotatedIdx = getRotatedTileIndex(
                                myPlayer.id,
                                meld.stolenFrom,
                            )
                            return (
                                <div
                                    key={i}
                                    className="flex border border-blue-900/50 p-0.5 rounded bg-gray-800 shadow-sm items-center"
                                >
                                    {meld.tiles.map((t, j) => (
                                        <MahjongTile
                                            key={j}
                                            tile={t}
                                            isDora={isDora(t)}
                                            className={cn(
                                                'w-8 h-11',
                                                j === rotatedIdx
                                                    ? 'rotate-90 -mx-0.5'
                                                    : '',
                                            )}
                                        />
                                    ))}
                                </div>
                            )
                        })}
                    </div>

                    {/* Player Hand */}
                    <div className="text-xs font-bold mb-1 flex items-center gap-2">
                        <span className="bg-gray-700 px-1 rounded text-white mr-1 font-mono">{myPlayer?.points}</span>
                        {myPlayer?.id === state.dealerId && (
                            <span className="bg-red-600 text-white text-[8px] px-1 rounded font-bold">
                                親
                            </span>
                        )}
                        <span className="text-yellow-500 font-bold bg-gray-800 px-1 rounded text-[10px]">
                            {myPlayer?.jikaze ? getWindName(myPlayer.jikaze) : ''}
                        </span>
                        <span
                            className={cn(
                                'transition-colors uppercase tracking-widest',
                                myPlayer?.isMyTurn
                                    ? 'text-blue-400 font-black'
                                    : 'text-gray-500',
                            )}
                        >
                            Your Hand{' '}
                            {myPlayer?.isMyTurn && (
                                <span className="animate-pulse">●</span>
                            )}
                        </span>
                        {myPlayer?.isRiichi && (
                            <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[10px] font-black animate-bounce shadow-lg ring-1 ring-white/20">
                                RIICHI
                            </span>
                        )}
                        {myPlayer?.isFuriten && (
                            <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-black shadow-lg ring-1 ring-white/20">
                                FURITEN
                            </span>
                        )}
                    </div>
                    
                    {/* Waits Display */}
                    {state.waits.length > 0 && (
                        <div className="flex items-center gap-2 mb-1 bg-gray-800/40 px-2 py-0.5 rounded border border-gray-700/50">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Wait</span>
                            <div className="flex gap-1">
                                {state.waits.map((t, i) => (
                                    <MahjongTile key={i} tile={t} className="w-4 h-6 opacity-80" isDora={isDora(t)} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-end gap-0.5 mb-2">
                        {state.myHand.map((t, i) => {
                            const isValidRiichiTile =
                                state.riichiDiscards.includes(t)
                            const canClick =
                                myPlayer?.isMyTurn &&
                                (!myPlayer?.isRiichi
                                    ? !riichiIntent || isValidRiichiTile
                                    : false)

                            return (
                                <MahjongTile
                                    key={i}
                                    tile={t}
                                    isDora={isDora(t)}
                                    className={cn(
                                        'w-10 h-14',
                                        riichiIntent && isValidRiichiTile
                                            ? 'ring-4 ring-orange-500 ring-offset-1 ring-offset-gray-900'
                                            : riichiIntent
                                              ? 'opacity-40'
                                              : '',
                                    )}
                                    onClick={() => canClick && handleDiscard(t)}
                                />
                            )
                        })}
                        {state.drawnTile && (
                            <MahjongTile
                                tile={state.drawnTile}
                                isDrawn
                                isDora={isDora(state.drawnTile)}
                                className={cn(
                                    'w-10 h-14 ml-2',
                                    riichiIntent &&
                                        state.riichiDiscards.includes(
                                            state.drawnTile,
                                        )
                                        ? 'ring-4 ring-orange-500 ring-offset-1 ring-offset-gray-900'
                                        : riichiIntent
                                          ? 'opacity-40'
                                          : '',
                                )}
                                onClick={() => {
                                    const isValidRiichiTile =
                                        state.riichiDiscards.includes(
                                            state.drawnTile!,
                                        )
                                    const canClick =
                                        myPlayer?.isMyTurn &&
                                        (!riichiIntent || isValidRiichiTile)
                                    if (canClick)
                                        handleDiscard(state.drawnTile!)
                                }}
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap justify-center scale-90 origin-bottom">
                        {state.actionRequest && (
                            <ActionButtons
                                request={state.actionRequest}
                                onTakeAction={handleTakeAction}
                                onIgnoreAction={handleIgnoreAction}
                            />
                        )}

                        {state.riichiDiscards.length > 0 &&
                            !myPlayer?.isRiichi && (
                                <button
                                    onClick={handleRiichi}
                                    disabled={!myPlayer?.isMyTurn}
                                    className={`px-6 py-1.5 rounded text-sm font-bold uppercase transition-colors ${
                                        riichiIntent
                                            ? 'bg-orange-500 text-white animate-pulse'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-700'
                                    }`}
                                >
                                    {riichiIntent ? 'Select Tile' : 'Riichi'}
                                </button>
                            )}

                        {state.ankanList.map((tile, i) => (
                            <button
                                key={`ankan-${i}`}
                                onClick={() => handleSelfKan('ankan', tile)}
                                disabled={!myPlayer?.isMyTurn}
                                className="px-6 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-sm font-bold uppercase transition-colors flex items-center gap-2"
                            >
                                Ankan <MahjongTile tile={tile} className="w-4 h-6 inline-block" />
                            </button>
                        ))}

                        {state.kakanList.map((tile, i) => (
                            <button
                                key={`kakan-${i}`}
                                onClick={() => handleSelfKan('kakan', tile)}
                                disabled={!myPlayer?.isMyTurn}
                                className="px-6 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-sm font-bold uppercase transition-colors flex items-center gap-2"
                            >
                                Kakan <MahjongTile tile={tile} className="w-4 h-6 inline-block" />
                            </button>
                        ))}

                        {state.canTsumo && (
                            <button
                                onClick={handleTsumo}
                                disabled={
                                    !state.drawnTile || !myPlayer?.isMyTurn
                                }
                                className="px-6 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded text-sm font-bold uppercase transition-colors"
                            >
                                Tsumo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Log Console */}
            <div className="mt-2 bg-black bg-opacity-50 p-1.5 h-20 overflow-y-auto text-[10px] font-mono rounded border border-gray-800">
                {state.logs.map((log, i) => (
                    <div
                        key={i}
                        className="border-b border-gray-800/50 py-0.5 text-gray-400"
                    >
                        {log}
                    </div>
                ))}
            </div>

            {/* Round Ended Modal */}
            {state.roundEndedData && (
                 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
                        <h2 className="text-2xl font-bold mb-4 text-center text-white">Round Ended</h2>
                        <div className="text-center mb-6">
                            <div className="text-xl font-bold text-yellow-400 mb-2 uppercase">{state.roundEndedData.reason}</div>

                            {/* Win Details */}
                            {state.roundEndedData.winScore && (
                                <div className="bg-gray-700/50 p-3 rounded mb-4 text-left border border-gray-600">
                                    <div className="flex justify-between items-end border-b border-gray-600 pb-2 mb-2">
                                        <div>
                                            <div className="font-bold text-white text-lg leading-tight">
                                                {state.roundEndedData.winScore.name || 'Win'}
                                            </div>
                                            {state.roundEndedData.winnerId && (
                                                <div className="text-[10px] text-gray-400">
                                                    Winner: {state.roundEndedData.winnerId === state.myPlayerId ? 'You' : state.roundEndedData.winnerId}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-yellow-400 leading-none">
                                                {state.roundEndedData.winScore.ten}
                                            </div>
                                            <span className="text-[10px] text-gray-400">points</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 text-xs text-gray-300 mb-2 font-mono">
                                        <div>
                                            <span className="font-bold text-white text-sm">{state.roundEndedData.winScore.han}</span> Han
                                        </div>
                                        <div>
                                            <span className="font-bold text-white text-sm">{state.roundEndedData.winScore.fu}</span> Fu
                                        </div>
                                        {state.roundEndedData.winScore.yakuman > 0 && (
                                            <div className="text-red-500 font-black animate-pulse">
                                                YAKUMAN {state.roundEndedData.winScore.yakuman > 1 ? `x${state.roundEndedData.winScore.yakuman}` : ''}
                                            </div>
                                        )}
                                    </div>

                                    {state.roundEndedData.winScore.yaku && (
                                        <div className="space-y-1 bg-gray-800/50 p-2 rounded">
                                            {Object.entries(state.roundEndedData.winScore.yaku).map(([name, val]) => (
                                                <div key={name} className="flex justify-between text-xs text-gray-200">
                                                    <span>{name}</span>
                                                    <span className="font-mono text-yellow-600">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                {state.roundEndedData.scores.map(score => {
                                    const isMe = score.id === state.myPlayerId
                                    const delta = state.roundEndedData?.scoreDeltas?.[score.id]
                                    
                                    return (
                                        <div key={score.id} className={cn("flex justify-between items-center p-2 rounded", isMe ? "bg-blue-900/30 border border-blue-500/30" : "bg-gray-700/30")}>
                                            <span className={cn("font-bold text-sm", isMe ? "text-blue-300" : "text-gray-400")}>
                                                {isMe ? "You" : `Player ${score.id.slice(0,4)}`}
                                            </span>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="font-mono text-white font-bold">{score.points}</span>
                                                {delta !== undefined && delta !== 0 && (
                                                    <span className={cn("text-[10px] font-mono", delta > 0 ? "text-green-400" : "text-red-400")}>
                                                        {delta > 0 ? "+" : ""}{delta}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-6 text-sm text-gray-400">
                                {state.roundEndedData.nextState.isGameOver 
                                    ? 'Game Complete' 
                                    : `Next: ${getWindName(state.roundEndedData.nextState.bakaze)} ${state.roundEndedData.nextState.kyoku}-${state.roundEndedData.nextState.honba}`
                                }
                            </div>
                        </div>
                        
                        <div className="flex justify-center">
                            {!state.roundEndedData.nextState.isGameOver && (
                                <button 
                                    onClick={handleNextRound}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors"
                                >
                                    Next Round
                                </button>
                            )}
                            {state.roundEndedData.nextState.isGameOver && (
                                <button 
                                    onClick={() => setState(prev => ({ ...prev, roundEndedData: null }))}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors"
                                >
                                    View Final Results
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {state.gameOverData && (
                <GameOverModal
                    data={state.gameOverData}
                    onClose={() =>
                        setState((prev) => ({ ...prev, gameOverData: null }))
                    }
                />
            )}
        </div>
    )
}

export default App
