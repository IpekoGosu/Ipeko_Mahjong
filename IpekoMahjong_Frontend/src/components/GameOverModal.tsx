import React from 'react'
import { GameOverPayload } from '../types'

interface GameOverModalProps {
    data: GameOverPayload
    onClose: () => void
}

const GameOverModal: React.FC<GameOverModalProps> = ({ data, onClose }) => {
    const { score } = data

    // Helper to determine if dealer win (if score is available)
    // If ten matches the sum of oya payments, it's likely an Oya win (approximate check)
    // Ideally, we'd check dealerId from context, but this is a decent heuristic from score alone.
    const isDealerWin =
        score && score.ten === score.oya.reduce((a, b) => a + b, 0)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-6">
            <div className="bg-gray-900 border-4 border-yellow-600 rounded-[32px] p-10 max-w-2xl w-full shadow-[0_0_50px_rgba(202,138,4,0.3)] relative max-h-[95vh] overflow-y-auto ring-8 ring-black/40">
                <h2 className="text-5xl font-black text-center text-yellow-500 mb-8 uppercase tracking-[0.2em] border-b-2 border-gray-800 pb-6">
                    {data.reason === 'tsumo'
                        ? 'TSUMO!'
                        : data.reason === 'ryuukyoku'
                          ? 'DRAW'
                          : 'RON!'}
                </h2>

                {data.winnerId && (
                    <div className="text-center mb-8">
                        <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">Winner</span>
                        <div className="text-4xl font-black text-white mt-1">
                            {data.winnerId}
                        </div>
                        {score && (
                            <span className="text-xs px-3 py-1 rounded-full bg-gray-800 text-yellow-500 mt-3 inline-block font-black border border-yellow-500/20">
                                {isDealerWin
                                    ? 'Dealer (Oya)'
                                    : 'Non-Dealer (Ko)'}
                            </span>
                        )}
                    </div>
                )}

                {score && (
                    <div className="space-y-6 bg-gray-800/50 p-8 rounded-3xl border-2 border-gray-700/50 shadow-inner">
                        <div className="flex justify-between items-end border-b-2 border-gray-700 pb-6">
                            <div className="text-3xl font-black text-white">
                                {score.name || 'Win'}
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-black text-yellow-400">
                                    {score.ten}{' '}
                                    <span className="text-lg text-gray-500 font-bold uppercase tracking-tighter">
                                        pts
                                    </span>
                                </div>
                                {/* Show Tsumo payments if applicable */}
                                {data.reason === 'tsumo' && (
                                    <div className="text-sm text-gray-400 font-mono mt-1 font-bold">
                                        {isDealerWin
                                            ? `All pay ${score.oya[0]}`
                                            : `Pay: ${score.ko[0]} / ${score.ko[1]}`}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-8 text-lg font-bold text-gray-400">
                            <div className="bg-gray-900 px-4 py-2 rounded-xl">
                                <span className="text-white text-2xl font-black mr-2">
                                    {score.han}
                                </span>{' '}
                                Han
                            </div>
                            <div className="bg-gray-900 px-4 py-2 rounded-xl">
                                <span className="text-white text-2xl font-black mr-2">
                                    {score.fu}
                                </span>{' '}
                                Fu
                            </div>
                        </div>

                        {score.yaku && Object.keys(score.yaku).length > 0 && (
                            <div className="space-y-3 mt-4">
                                <div className="text-xs text-gray-500 uppercase font-black tracking-[0.2em] border-b border-gray-700 pb-2 mb-4">
                                    Yaku List
                                </div>
                                {Object.entries(score.yaku).map(
                                    ([name, value]) => (
                                        <div
                                            key={name}
                                            className="flex justify-between text-xl text-white font-bold"
                                        >
                                            <span className="opacity-90">{name}</span>
                                            <span className="font-mono text-yellow-600">
                                                {value}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}

                        {score.text && (
                            <div className="mt-6 text-sm text-gray-500 italic border-t border-gray-700 pt-6 text-center font-bold">
                                {score.text}
                            </div>
                        )}
                    </div>
                )}

                {data.disconnectedPlayerId && (
                    <div className="text-center text-red-400 mt-6 text-xl font-black animate-pulse">
                        Player {data.disconnectedPlayerId} disconnected.
                    </div>
                )}

                {data.finalRanking && (
                    <div className="mt-8 space-y-4">
                        <div className="text-xs text-gray-500 uppercase font-black tracking-[0.2em] border-b border-gray-700 pb-2 mb-4">
                            Final Ranking
                        </div>
                        {data.finalRanking.map((entry) => (
                            <div key={entry.id} className="flex justify-between items-center bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                        entry.rank === 1 ? 'bg-yellow-500 text-black' :
                                        entry.rank === 2 ? 'bg-gray-400 text-black' :
                                        entry.rank === 3 ? 'bg-orange-700 text-white' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {entry.rank}
                                    </div>
                                    <span className="font-bold text-lg text-white">Player {entry.id.slice(0, 6)}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-white">{entry.points} pts</div>
                                    <div className="text-xs text-gray-500 font-mono">Score: {entry.finalScore > 0 ? '+' : ''}{entry.finalScore}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-10 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xl rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 border-b-4 border-yellow-800"
                    >
                        Close Results
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GameOverModal
