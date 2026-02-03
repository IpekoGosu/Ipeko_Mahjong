import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import MahjongTile from './components/MahjongTile';
import ActionButtons from './components/ActionButtons';
import GameOverModal from './components/GameOverModal';
import { 
  GameState, 
  GameStartedPayload, 
  TurnChangedPayload, 
  NewTileDrawnPayload, 
  UpdateDiscardPayload, 
  GameOverPayload, 
  ErrorPayload,
  AskActionPayload,
  UpdateMeldPayload
} from './types';

const SOCKET_URL = 'http://localhost:3000';

function App() {
  const [state, setState] = useState<GameState>({
    isConnected: false,
    roomId: null,
    myPlayerId: null,
    myHand: [],
    drawnTile: null,
    dora: [],
    players: [],
    wallCount: 0,
    deadWallCount: 0,
    dealerId: null,
    actionRequest: null,
    gameOverData: null,
    logs: []
  });

  const socketRef = useRef<Socket | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);

  const sortTiles = (tiles: string[]) => {
    const suitOrder: Record<string, number> = { m: 0, p: 1, s: 2, z: 3 };
    return [...tiles].sort((a, b) => {
      const suitA = a[1];
      const suitB = b[1];
      if (suitA !== suitB) return suitOrder[suitA] - suitOrder[suitB];
      return a[0].localeCompare(b[0]);
    });
  };

  const addLog = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      logs: [message, ...prev.logs].slice(0, 50)
    }));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(prev => ({ ...prev, isConnected: true }));
      addLog('Connected to server');
    });

    socket.on('disconnect', () => {
      setState(prev => ({ ...prev, isConnected: false }));
      addLog('Disconnected from server');
    });

    socket.on('game-started', (payload: GameStartedPayload) => {
      addLog(`Game started: Room ${payload.roomId}`);
      myPlayerIdRef.current = payload.yourPlayerId;
      setState(prev => ({
        ...prev,
        roomId: payload.roomId,
        myPlayerId: payload.yourPlayerId,
        dora: payload.dora,
        wallCount: payload.wallCount,
        deadWallCount: payload.deadWallCount,
        dealerId: payload.players[0].id, // 첫 번째 플레이어를 오야로 가정
        myHand: sortTiles(payload.hand),
        players: payload.players.map(p => ({
          id: p.id,
          isAi: p.isAi,
          handCount: 13,
          discards: [],
          melds: [],
          isMyTurn: false
        }))
      }));
    });

    socket.on('turn-changed', (payload: TurnChangedPayload) => {
      setState(prev => {
        const newPlayers = prev.players.map(p => {
          const isTarget = p.id === payload.playerId;
          return {
            ...p,
            isMyTurn: isTarget,
            // If it's an AI's turn, we visually "add" a tile to their hand
            handCount: isTarget && p.id !== prev.myPlayerId ? p.handCount + 1 : p.handCount
          };
        });
        return { 
          ...prev, 
          players: newPlayers,
          wallCount: payload.wallCount,
          deadWallCount: payload.deadWallCount,
          actionRequest: null
        };
      });
    });

    socket.on('new-tile-drawn', (payload: NewTileDrawnPayload) => {
      addLog(`You drew: ${payload.tile}`);
      setState(prev => ({
        ...prev,
        drawnTile: payload.tile,
        actionRequest: null
      }));
    });

    socket.on('update-discard', (payload: UpdateDiscardPayload) => {
      const isMeLog = payload.playerId === myPlayerIdRef.current;
      addLog(`${isMeLog ? 'You' : 'Player ' + payload.playerId} discarded: ${payload.tile}`);
      myPlayerIdRef.current = payload.playerId === myPlayerIdRef.current ? myPlayerIdRef.current : myPlayerIdRef.current;
      
      setState(prev => {
        const isMe = payload.playerId === prev.myPlayerId;
        const newPlayers = prev.players.map(p => {
          if (p.id === payload.playerId) {
            return {
              ...p,
              discards: [...p.discards, payload.tile],
              handCount: isMe ? p.handCount : p.handCount - 1
            };
          }
          return p;
        });

        let newHand = [...prev.myHand];
        let newDrawnTile = prev.drawnTile;

        if (isMe) {
          if (payload.tile === prev.drawnTile) {
            newDrawnTile = null;
          } else {
            const index = newHand.indexOf(payload.tile);
            if (index > -1) {
              newHand.splice(index, 1);
              if (prev.drawnTile) {
                newHand.push(prev.drawnTile);
                newDrawnTile = null;
              }
            }
          }
          newHand = sortTiles(newHand);
        }

        return {
          ...prev,
          players: newPlayers,
          actionRequest: null, // Clear any pending actions on new discard
          myHand: newHand,
          drawnTile: newDrawnTile
        };
      });
    });

    socket.on('ask-action', (payload: AskActionPayload) => {
      addLog(`Action available: ${payload.ron ? 'RON ' : ''}${payload.pon ? 'PON ' : ''}${payload.chi ? 'CHI ' : ''}on ${payload.tile}`);
      setState(prev => ({ ...prev, actionRequest: payload }));
    });

    socket.on('update-meld', (payload: UpdateMeldPayload) => {
      const isMe = payload.playerId === myPlayerIdRef.current;
      addLog(`${isMe ? 'You' : 'Player ' + payload.playerId} declared ${payload.type.toUpperCase()}: ${payload.tiles.join(', ')}`);

      setState(prev => {
        const newPlayers = prev.players.map(p => {
          if (p.id === payload.playerId) {
            // When melding, hand count decreases (usually by 2 for Chi/Pon)
            const tilesTakenFromHand = payload.tiles.length - 1;
            return {
              ...p,
              melds: [...p.melds, payload.tiles],
              handCount: isMe ? p.handCount : p.handCount - tilesTakenFromHand
            };
          }
          return p;
        });

        let newHand = [...prev.myHand];
        if (isMe && prev.actionRequest) {
          // Remove the tiles used for meld from hand (excluding the stolen tile)
          const stolenTile = prev.actionRequest.tile;
          const tilesToRemove = [...payload.tiles];
          const stolenIdx = tilesToRemove.indexOf(stolenTile);
          if (stolenIdx > -1) tilesToRemove.splice(stolenIdx, 1);

          tilesToRemove.forEach(t => {
            const idx = newHand.indexOf(t);
            if (idx > -1) newHand.splice(idx, 1);
          });
          
          // If we had a drawn tile, it moves into the hand because meld happens on someone else's turn
          if (prev.drawnTile) {
            newHand.push(prev.drawnTile);
          }
          newHand = sortTiles(newHand);
        }

        return {
          ...prev,
          players: newPlayers,
          myHand: newHand,
          drawnTile: null,
          actionRequest: null
        };
      });
    });

    socket.on('game-over', (payload: GameOverPayload) => {
      let msg = `Game Over: ${payload.reason}`;
      if (payload.winnerId) msg += ` | Winner: ${payload.winnerId}`;
      if (payload.score) {
        msg += `Score Results: ${JSON.stringify(payload.score, null, 2)}`
      }
      addLog(msg);
      setState(prev => ({ ...prev, gameOverData: payload }));
    });

    socket.on('error', (payload: ErrorPayload) => {
      addLog(`Error: ${payload.message}`);
      alert(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [addLog]);

  const handleStartGame = () => {
    socketRef.current?.emit('start-game');
  };

  const handleDiscard = (tile: string) => {
    if (!state.roomId) return;
    socketRef.current?.emit('discard-tile', { roomId: state.roomId, tile });
  };

  const handleTsumo = () => {
    if (!state.roomId) return;
    socketRef.current?.emit('declare-tsumo', { roomId: state.roomId });
  };

  const handleTakeAction = (type: string, tiles?: string[]) => {
    if (!state.roomId) return;
    const targetTile = state.actionRequest?.tile;
    if (!targetTile && type !== 'skip') return;

    // Filter out the target tile from consumedTiles if present, 
    // because we only want to specify which tiles to remove from hand.
    // Although Player.removeTiles is safe, it's cleaner to send only hand tiles.
    const consumedTiles = tiles ? tiles.filter(t => t !== targetTile) : undefined;

    socketRef.current?.emit('select-action', { 
      roomId: state.roomId, 
      type, 
      tile: targetTile, 
      consumedTiles 
    });
  };

  const handleIgnoreAction = () => {
    if (!state.roomId) return;
    const targetTile = state.actionRequest?.tile;
    socketRef.current?.emit('select-action', { 
        roomId: state.roomId, 
        type: 'skip',
        tile: targetTile 
    });
    setState(prev => ({ ...prev, actionRequest: null }));
  };

  const myPlayer = state.players.find(p => p.id === state.myPlayerId);
  
  // 반시계 방향 배치 로직 (내 위치 기준)
  const myIndex = state.players.findIndex(p => p.id === state.myPlayerId);
  const getPlayerByOffset = (offset: number) => {
    if (myIndex === -1 || state.players.length === 0) return undefined;
    return state.players[(myIndex + offset) % state.players.length];
  };

  const rightPlayer = getPlayerByOffset(1);    // 하가 (Next)
  const oppositePlayer = getPlayerByOffset(2); // 대면
  const leftPlayer = getPlayerByOffset(3);     // 상가 (Prev)

  if (!state.roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold mb-8">Ipeko Mahjong</h1>
        <div className="p-8 bg-gray-800 rounded-lg shadow-xl">
          <p className="mb-4">Status: {state.isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
          <button
            onClick={handleStartGame}
            disabled={!state.isConnected}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-bold transition-colors"
          >
            Start Single Player Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Mahjong Table Area */}
      <div className="flex-grow flex items-center justify-center py-4">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 items-center justify-items-center w-full max-w-3xl aspect-square">
          
          {/* Row 1, Col 2: Opposite AI */}
          <div className="col-start-2 row-start-1 flex flex-col items-center">
            <div className="text-[10px] mb-1 flex items-center gap-1 opacity-80">
              {oppositePlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1 rounded font-bold">親</span>}
              Opposite AI ({oppositePlayer?.handCount}) {oppositePlayer?.isMyTurn ? '⬅️' : ''}
            </div>
            {/* Opposite Pond */}
            <div className="flex flex-wrap gap-0.5 w-[132px] justify-center content-start min-h-[80px] bg-gray-800/30 p-1 rounded">
              {oppositePlayer?.discards.map((t, i) => (
                <MahjongTile key={i} tile={t} className="w-5 h-7 text-[10px] shadow-none border-gray-700" />
              ))}
            </div>
          </div>

          {/* Row 2, Col 1: Left AI */}
          <div className="col-start-1 row-start-2 flex flex-row items-center gap-2">
            <div className="text-[10px] flex flex-col items-center gap-1 opacity-80 -rotate-90">
              {leftPlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1 rounded font-bold">親</span>}
              <span>Left AI ({leftPlayer?.handCount}) {leftPlayer?.isMyTurn ? '⬅️' : ''}</span>
            </div>
            {/* Left Pond */}
            <div className="flex flex-wrap gap-0.5 w-[132px] justify-center content-start min-h-[80px] bg-gray-800/30 p-1 rounded">
              {leftPlayer?.discards.map((t, i) => (
                <MahjongTile key={i} tile={t} className="w-5 h-7 text-[10px] shadow-none border-gray-700" />
              ))}
            </div>
          </div>

          {/* Row 2, Col 2: Center Info Box */}
          <div className="col-start-2 row-start-2 w-48 h-48 bg-gray-800 border-2 border-gray-700 rounded-lg shadow-2xl flex flex-col items-center justify-center p-4">
            <div className="text-[10px] font-bold text-gray-500 mb-1 tracking-widest">DORA</div>
            <div className="flex gap-1 mb-3">
              {state.dora.map((t, i) => <MahjongTile key={i} tile={t} className="w-7 h-10 text-xs" />)}
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-gray-400">
              <div className="flex flex-col items-center border-r border-gray-700 pr-4">
                <span>WALL</span>
                <span className="text-lg text-white">{state.wallCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span>DEAD</span>
                <span className="text-lg text-white">{state.deadWallCount}</span>
              </div>
            </div>
            <div className="text-[9px] opacity-30 mt-3">ROOM: {state.roomId.slice(-5)}</div>
          </div>

          {/* Row 2, Col 3: Right AI */}
          <div className="col-start-3 row-start-2 flex flex-row-reverse items-center gap-2">
            <div className="text-[10px] flex flex-col items-center gap-1 opacity-80 rotate-90">
              {rightPlayer?.id === state.dealerId && <span className="bg-red-600 text-white px-1 rounded font-bold">親</span>}
              <span>Right AI ({rightPlayer?.handCount}) {rightPlayer?.isMyTurn ? '⬅️' : ''}</span>
            </div>
            {/* Right Pond */}
            <div className="flex flex-wrap gap-0.5 w-[132px] justify-center content-start min-h-[80px] bg-gray-800/30 p-1 rounded">
              {rightPlayer?.discards.map((t, i) => (
                <MahjongTile key={i} tile={t} className="w-5 h-7 text-[10px] shadow-none border-gray-700" />
              ))}
            </div>
          </div>

          {/* Row 3, Col 2: My Pond */}
          <div className="col-start-2 row-start-3 flex flex-col items-center">
            <div className="flex flex-wrap gap-0.5 w-[132px] justify-center content-start min-h-[80px] bg-gray-800/30 p-1 rounded mb-1">
              {myPlayer?.discards.map((t, i) => (
                <MahjongTile key={i} tile={t} className="w-5 h-7 text-[10px] shadow-none border-gray-700" />
              ))}
            </div>
            <div className="text-[10px] opacity-80">YOUR DISCARDS</div>
          </div>

        </div>
      </div>

      {/* Player Area */}
      <div className="mt-auto border-t border-gray-800 pt-4 pb-2 bg-gray-900">
        <div className="flex flex-col items-center">
          {/* Player Melds */}
          <div className="flex gap-4 mb-2">
            {myPlayer?.melds.map((meld, i) => (
              <div key={i} className="flex border-2 border-blue-900 p-1 rounded bg-gray-800 shadow-lg">
                {meld.map((t, j) => <MahjongTile key={j} tile={t} className="w-8 h-12 text-sm" />)}
              </div>
            ))}
          </div>

          {/* Player Hand */}
          <div className="text-sm font-bold mb-2 flex items-center gap-2">
            {myPlayer?.id === state.dealerId && <span className="bg-red-600 text-white text-[10px] px-1 rounded font-bold">親</span>}
            Your Hand ({myPlayer?.handCount} tiles) {myPlayer?.isMyTurn ? '⬅️' : ''}
          </div>
          <div className="flex items-end gap-1 mb-4">
            {state.myHand.map((t, i) => (
              <MahjongTile 
                key={i} 
                tile={t} 
                onClick={() => myPlayer?.isMyTurn && handleDiscard(t)} 
              />
            ))}
            {state.drawnTile && (
              <MahjongTile 
                tile={state.drawnTile} 
                isDrawn 
                onClick={() => myPlayer?.isMyTurn && handleDiscard(state.drawnTile!)} 
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap justify-center relative">
            {state.actionRequest && (
              <ActionButtons 
                request={state.actionRequest} 
                onTakeAction={handleTakeAction} 
                onIgnoreAction={handleIgnoreAction} 
              />
            )}
            
            <button
              onClick={handleTsumo}
              disabled={!state.drawnTile || !myPlayer?.isMyTurn}
              className="px-8 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded font-bold uppercase transition-colors"
            >
              Tsumo
            </button>
          </div>
        </div>
      </div>

      {/* Log Console */}
      <div className="mt-8 bg-black bg-opacity-50 p-2 h-32 overflow-y-auto text-xs font-mono rounded">
        {state.logs.map((log, i) => (
          <div key={i} className="border-b border-gray-800 py-1">{log}</div>
        ))}
      </div>

      {/* Game Over Modal */}
      {state.gameOverData && (
        <GameOverModal 
          data={state.gameOverData} 
          onClose={() => setState(prev => ({ ...prev, gameOverData: null }))} 
        />
      )}
    </div>
  );
}

export default App;
