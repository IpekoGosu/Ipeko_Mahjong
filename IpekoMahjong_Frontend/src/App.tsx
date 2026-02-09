import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import MahjongTile from './components/MahjongTile'
import ActionButtons from './components/ActionButtons'
import GameOverModal from './components/GameOverModal'
import Login from './components/Login'
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
    RiichiDeclaredPayload,
    User,
} from './types'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const SOCKET_URL = 'http://localhost:3000'

function App() {
    const [tileMode, setTileMode] = useState<'text' | 'emoji'>('emoji')
    const [isLoadingAuth, setIsLoadingAuth] = useState(true)
    const [state, setState] = useState<GameState>({
        isAuthenticated: false,
        user: null,
        token: null,
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

    const handleLoginSuccess = (user: User, token: string | null) => {
        setState((prev) => ({
            ...prev,
            isAuthenticated: true,
            user,
            token,
        }))
    }

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('http://localhost:3000/user/me', {
                    credentials: 'include',
                })
                if (response.ok) {
                    const result = (await response.json()) as {
                        data: User
                    }
                    // If backend doesn't return token in /me, we might still need it for socket.
                    // But socket can also use cookie if we configure it correctly.
                    handleLoginSuccess(result.data, null)
                }
            } catch (error) {
                console.error('Auth check failed:', error)
            } finally {
                setIsLoadingAuth(false)
            }
        }
        void checkAuth()
    }, [])

    useEffect(() => {
        if (!state.isAuthenticated) return

        const socket = io(SOCKET_URL, {
            auth: state.token ? { token: state.token } : {},
            withCredentials: true, // Crucial for cookie-based auth
        })
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
                waits: payload.waits || [],
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

        socket.on('update-waits', (payload: { waits: string[] }) => {
            setState((prev) => ({ ...prev, waits: payload.waits }))
        })

        socket.on('round-started', (payload: RoundStartedPayload) => {
            addLog(`Round Started: ${payload.bakaze}-${payload.kyoku}`)
            setState((prev) => ({
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
                waits: payload.waits || [],
                players: prev.players.map((p) => {
                    const scoreInfo = payload.scores.find((s) => s.id === p.id)
                    return {
                        ...p,
                        handCount: 13,
                        discards: [],
                        melds: [],
                        isRiichi: false,
                        isFuriten: false,
                        points: scoreInfo ? scoreInfo.points : p.points,
                        jikaze: scoreInfo ? scoreInfo.jikaze : p.jikaze,
                    }
                }),
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

        socket.on('riichi-declared', (payload: RiichiDeclaredPayload) => {
            addLog(
                `Player ${payload.playerId === myPlayerIdRef.current ? 'You' : payload.playerId} declared RIICHI!`,
            )
            setState((prev) => ({
                ...prev,
                kyotaku: payload.kyotaku || prev.kyotaku,
                players: prev.players.map((p) =>
                    p.id === payload.playerId 
                        ? { 
                            ...p, 
                            isRiichi: true, 
                            riichiIndex: p.discards.length - 1,
                            points: payload.score || p.points
                          } 
                        : p,
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
    }, [addLog, state.isAuthenticated, state.token])

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
    const getRotatedTileIndex = (playerId: string, stolenFromId?: string, tileCount: number = 3) => {
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
        if (relativePos === 3) return tileCount - 1 // Right player -> Last tile
        return -1
    }

    const getWindName = (wind: string, short = false) => {
        switch (wind) {
            case '1z': return short ? '東' : 'East (東)'
            case '2z': return short ? '南' : 'South (南)'
            case '3z': return short ? '西' : 'West (西)'
            case '4z': return short ? '北' : 'North (北)'
            default: return 'East'
        }
    }

    const isDora = (tile: string) => {
        // Red 5 is always dora in most rules (though usually designated by indicator too)
        // If rank is 0, it's aka dora.
        if (tile[0] === '0') return true
        return state.actualDora.includes(tile)
    }

    const renderPond = (p: typeof state.players[0] | undefined, containerRotation: number, origin: string = 'center') => {
        if (!p) return null
        return (
            <div 
                style={{ transform: `rotate(${containerRotation}deg)`, transformOrigin: origin }}
                className="grid grid-cols-6 gap-x-0.5 gap-y-1 w-[156px] content-start"
            >
                {p.discards.map((t, i) => {
                    const isRiichiTile = p.riichiIndex === i
                    // Riichi tile is rotated 90 degrees relative to other tiles in the pond
                    const rotation = isRiichiTile ? 90 : 0
                    return (
                        <MahjongTile
                            key={i}
                            tile={t}
                            size="sm"
                            isDora={isDora(t)}
                            rotation={rotation}
                            mode={tileMode}
                            className={cn(
                                'shadow-none transition-all',
                                isRiichiTile && 'ring-1 ring-orange-500/50 z-10 shadow-md',
                            )}
                        />
                    )
                })}
            </div>
        )
    }

    const renderMelds = (p: typeof state.players[0] | undefined) => {
        if (!p || !p.melds.length) return null
        return (
            <div className="flex gap-2 ml-4">
                {p.melds.map((meld, i) => {
                    const rotatedIdx = getRotatedTileIndex(p.id, meld.stolenFrom, meld.tiles.length)
                    return (
                        <div key={i} className="flex bg-black/40 p-1 rounded gap-0.5 shadow-lg backdrop-blur-sm">
                            {meld.tiles.map((t, j) => {
                                const isRotated = j === rotatedIdx
                                return (
                                    <MahjongTile
                                        key={j}
                                        tile={t}
                                        size="sm"
                                        isDora={isDora(t)}
                                        rotation={isRotated ? 90 : 0}
                                        mode={tileMode}
                                        className={cn(
                                            'shadow-none',
                                            isRotated && "mx-1"
                                        )}
                                    />
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        )
    }

    if (isLoadingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!state.isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />
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
                    {state.user && (
                        <p className="mb-4 text-sm text-gray-400">
                            Logged in as: {state.user.email}
                        </p>
                    )}
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
        <div className="max-w-[1200px] mx-auto p-4 flex flex-col h-screen bg-gray-900 text-white overflow-hidden font-sans">
            {/* Mahjong Table Area */}
            <div className="flex-grow flex items-center justify-center py-4 min-h-0">
                <div className="aspect-[4/3] w-full max-h-full bg-gray-800/20 rounded-3xl border-4 border-gray-800 shadow-2xl relative flex items-center justify-center p-4">
                    
                    {/* Center Area with Ponds */}
                    <div className="relative w-56 h-56">
                        {/* Center Info Box */}
                        <div className="absolute inset-0 bg-gray-900/90 border-4 border-gray-700 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-2 z-20 ring-4 ring-black/20 overflow-hidden">
                            {/* Top: Opposite */}
                            <div className="absolute top-2 left-0 right-0 flex flex-col items-center">
                                <div className="flex items-center gap-1.5">
                                    {oppositePlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">親</span>}
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {oppositePlayer?.jikaze ? getWindName(oppositePlayer.jikaze, true) : ''}
                                    </span>
                                    <span className="text-lg font-mono font-black text-white">{oppositePlayer?.points}</span>
                                </div>
                                {oppositePlayer?.isRiichi && (
                                    <div className="w-16 h-1.5 bg-white border border-gray-400 rounded-full flex items-center justify-center mt-0.5">
                                        <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            {/* Left: Left Player */}
                            <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-center items-center rotate-90">
                                <div className="flex items-center gap-1.5">
                                    {leftPlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">親</span>}
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {leftPlayer?.jikaze ? getWindName(leftPlayer.jikaze, true) : ''}
                                    </span>
                                    <span className="text-lg font-mono font-black text-white">{leftPlayer?.points}</span>
                                </div>
                                {leftPlayer?.isRiichi && (
                                    <div className="w-16 h-1.5 bg-white border border-gray-400 rounded-full flex items-center justify-center mt-0.5">
                                        <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Right Player */}
                            <div className="absolute -right-3 top-0 bottom-0 flex flex-col justify-center items-center -rotate-90">
                                <div className="flex items-center gap-1.5">
                                    {rightPlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">親</span>}
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {rightPlayer?.jikaze ? getWindName(rightPlayer.jikaze, true) : ''}
                                    </span>
                                    <span className="text-lg font-mono font-black text-white">{rightPlayer?.points}</span>
                                </div>
                                {rightPlayer?.isRiichi && (
                                    <div className="w-16 h-1.5 bg-white border border-gray-400 rounded-full flex items-center justify-center mt-0.5">
                                        <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom: Me */}
                            <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center">
                                {myPlayer?.isRiichi && (
                                    <div className="w-16 h-1.5 bg-white border border-gray-400 rounded-full flex items-center justify-center mb-0.5">
                                        <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg font-mono font-black text-white">{myPlayer?.points}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {myPlayer?.jikaze ? getWindName(myPlayer.jikaze, true) : ''}
                                    </span>
                                    {myPlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">親</span>}
                                </div>
                            </div>

                            {/* Center: Kyoku Info */}
                            <div className="flex flex-col items-center justify-center bg-gray-800/80 p-3 rounded-2xl border-2 border-gray-700 shadow-inner">
                                <div className="text-xl font-black text-white leading-tight">
                                    {getWindName(state.bakaze, true)}{state.kyoku}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-[10px] font-mono text-yellow-500">{state.honba}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-1 bg-white border border-gray-400 rounded-full flex items-center justify-center">
                                            <div className="w-0.5 h-0.5 bg-red-600 rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-white">{state.kyotaku}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ponds */}
                        {/* Opposite Pond */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120px]">
                             {renderPond(oppositePlayer, 180, 'top center')}
                        </div>

                        {/* My Pond */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[120px]">
                             {renderPond(myPlayer, 0, 'top center')}
                        </div>

                        {/* Left Pond */}
                        <div className="absolute top-1/2 left-9 -translate-x-[120px]">
                             {renderPond(leftPlayer, 90, 'top center')}
                        </div>

                        {/* Right Pond */}
                        <div className="absolute top-1/2 left-9 translate-x-[120px]">
                             {renderPond(rightPlayer, 270, 'top center')}
                        </div>
                    </div>

                    {/* Dora & Wall Info (Moved to top left) */}
                    <div className="absolute top-4 left-4 flex gap-4 items-start">
                        <div className="bg-gray-800/80 p-3 rounded-2xl border-2 border-gray-700 shadow-lg backdrop-blur-sm flex flex-col items-center gap-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Dora</div>
                            <div className="flex gap-1">
                                {state.dora.map((t, i) => (
                                    <MahjongTile key={i} tile={t} size="sm" mode={tileMode} />
                                ))}
                            </div>
                            <div className="flex gap-4 mt-1 border-t border-gray-700 pt-2 w-full justify-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase">Wall</span>
                                    <span className="text-sm font-black text-white">{state.wallCount}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase">Dead</span>
                                    <span className="text-sm font-black text-white">{state.deadWallCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tile Mode Toggle (Top Right) */}
                    <div className="absolute top-4 right-4">
                        <div className="bg-gray-800/80 p-3 rounded-2xl border-2 border-gray-700 shadow-lg backdrop-blur-sm flex flex-col gap-2">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60 text-center">Mode</div>
                            <div className="flex bg-gray-900/50 p-1 rounded-xl">
                                <button
                                    onClick={() => setTileMode('text')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                                        tileMode === 'text' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    TEXT
                                </button>
                                <button
                                    onClick={() => setTileMode('emoji')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                                        tileMode === 'emoji' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    EMOJI
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Player Info Labels & Melds */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center">
                        <div className={cn(
                            "px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-200 transition-all whitespace-nowrap",
                            myPlayer?.isMyTurn && "bg-blue-500 ring-4 ring-blue-500/50 text-white"
                        )}>
                            YOU {myPlayer?.isMyTurn && "●"}
                        </div>
                        {renderMelds(myPlayer)}
                    </div>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center">
                        <div className={cn(
                            "px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-200 transition-all whitespace-nowrap",
                            oppositePlayer?.isMyTurn && "bg-blue-500 ring-4 ring-blue-500/50 text-white"
                        )}>
                            TOIMEN {oppositePlayer?.isMyTurn && "●"}
                        </div>
                        {renderMelds(oppositePlayer)}
                    </div>

                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center origin-center">
                        <div className={cn(
                            "px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-200 transition-all whitespace-nowrap",
                            leftPlayer?.isMyTurn && "bg-blue-500 ring-4 ring-blue-500/50 text-white"
                        )}>
                            KAMICHA {leftPlayer?.isMyTurn && "●"}
                        </div>
                        {renderMelds(leftPlayer)}
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center origin-center">
                        <div className={cn(
                            "px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-200 transition-all whitespace-nowrap",
                            rightPlayer?.isMyTurn && "bg-blue-500 ring-4 ring-blue-500/50 text-white"
                        )}>
                            SHIMOCHA {rightPlayer?.isMyTurn && "●"}
                        </div>
                        {renderMelds(rightPlayer)}
                    </div>
                </div>
            </div>

            {/* Player Area */}
            <div
                className={cn(
                    'mt-auto border-t-4 border-gray-800 pt-6 pb-4 transition-all rounded-t-[40px]',
                    myPlayer?.isMyTurn
                        ? 'bg-blue-500/10 shadow-[0_-20px_60px_rgba(59,130,246,0.3)] border-blue-500/30'
                        : 'bg-gray-900',
                )}
            >
                <div className="flex flex-col items-center max-w-6xl mx-auto px-4">
                    {/* Player Hand */}
                    <div className="text-base font-black mb-3 flex items-center gap-4">
                        <span
                            className={cn(
                                'transition-colors uppercase tracking-[0.2em] text-lg',
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
                        {myPlayer?.isFuriten && (
                            <span className="bg-purple-600 text-white px-3 py-1 rounded-md font-black shadow-xl ring-2 ring-white/30">
                                FURITEN
                            </span>
                        )}
                        {/* Waits Display */}
                        {state.waits.length > 0 && (
                            <div className="flex items-center gap-4 bg-gray-800/60 px-4 py-2 rounded-2xl border-2 border-gray-700/50 shadow-lg backdrop-blur-md">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest border-r border-gray-700 pr-4">Wait</span>
                                <div className="flex gap-2">
                                    {state.waits.map((t, i) => (
                                        <MahjongTile key={i} tile={t} size="sm" isDora={isDora(t)} mode={tileMode} className="opacity-90 hover:opacity-100" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    

                    <div className="flex items-end gap-1 mb-6">
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
                                    size="xl"
                                    isDora={isDora(t)}
                                    mode={tileMode}
                                    className={cn(
                                        'transition-all duration-200 hover:-translate-y-[5px]',
                                        riichiIntent && isValidRiichiTile
                                            ? 'ring-4 ring-orange-500 ring-offset-4 ring-offset-gray-900 scale-105 z-10'
                                            : riichiIntent
                                              ? 'opacity-40 grayscale-[0.5]'
                                              : '',
                                        !canClick && 'cursor-not-allowed opacity-90'
                                    )}
                                    onClick={() => canClick && handleDiscard(t)}
                                />
                            )
                        })}
                        {state.drawnTile && (
                            <MahjongTile
                                tile={state.drawnTile}
                                isDrawn
                                size="xl"
                                isDora={isDora(state.drawnTile)}
                                mode={tileMode}
                                className={cn(
                                    'ml-6 transition-all duration-200 hover:-translate-y-[5px]',
                                    riichiIntent &&
                                        state.riichiDiscards.includes(
                                            state.drawnTile,
                                        )
                                        ? 'ring-4 ring-orange-500 ring-offset-4 ring-offset-gray-900 scale-105 z-10'
                                        : riichiIntent
                                          ? 'opacity-40 grayscale-[0.5]'
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
                    <div className="flex gap-4 flex-wrap justify-center min-h-[48px]">
                        {state.actionRequest && (
                            <ActionButtons
                                request={state.actionRequest}
                                onTakeAction={handleTakeAction}
                                onIgnoreAction={handleIgnoreAction}
                                tileMode={tileMode}
                            />
                        )}

                        {state.riichiDiscards.length > 0 &&
                            !myPlayer?.isRiichi && (
                                <button
                                    onClick={handleRiichi}
                                    disabled={!myPlayer?.isMyTurn}
                                    className={cn(
                                        "px-10 py-3 rounded-xl text-lg font-black uppercase transition-all shadow-xl ring-2",
                                        riichiIntent
                                            ? 'bg-orange-500 text-white animate-pulse ring-white/50 scale-110'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white ring-orange-500/30 hover:scale-105 disabled:bg-gray-800 disabled:text-gray-600 disabled:ring-0'
                                    )}
                                >
                                    {riichiIntent ? 'Select Tile' : 'Riichi'}
                                </button>
                            )}

                        {state.ankanList.map((tile, i) => (
                            <button
                                key={`ankan-${i}`}
                                onClick={() => handleSelfKan('ankan', tile)}
                                disabled={!myPlayer?.isMyTurn}
                                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-lg font-black uppercase transition-all hover:scale-105 shadow-xl flex items-center gap-3 border-b-4 border-purple-900"
                            >
                                Ankan <MahjongTile tile={tile} size="xs" mode={tileMode} className="inline-block" />
                            </button>
                        ))}

                        {state.kakanList.map((tile, i) => (
                            <button
                                key={`kakan-${i}`}
                                onClick={() => handleSelfKan('kakan', tile)}
                                disabled={!myPlayer?.isMyTurn}
                                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-lg font-black uppercase transition-all hover:scale-105 shadow-xl flex items-center gap-3 border-b-4 border-purple-900"
                            >
                                Kakan <MahjongTile tile={tile} size="xs" mode={tileMode} className="inline-block" />
                            </button>
                        ))}

                        {state.canTsumo && (
                            <button
                                onClick={handleTsumo}
                                disabled={
                                    !state.drawnTile || !myPlayer?.isMyTurn
                                }
                                className="px-12 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-lg font-black uppercase transition-all hover:scale-110 shadow-xl border-b-4 border-red-900"
                            >
                                Tsumo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Log Console */}
            {/* <div className="mt-4 bg-black/60 p-3 h-32 overflow-y-auto text-[11px] font-mono rounded-2xl border-2 border-gray-800 shadow-inner backdrop-blur-sm">
                {state.logs.map((log, i) => (
                    <div
                        key={i}
                        className="border-b border-gray-800/30 py-1 text-gray-500 flex gap-2"
                    >
                        <span className="opacity-30">[{state.logs.length - i}]</span>
                        <span className="text-gray-400">{log}</span>
                    </div>
                ))}
            </div> */}

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