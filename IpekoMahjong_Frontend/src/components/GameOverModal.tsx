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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-gray-900 border-2 border-yellow-600 rounded-xl p-6 max-w-md w-full shadow-2xl relative max-h-[95vh] overflow-y-auto">
                <h2 className="text-2xl font-black text-center text-yellow-500 mb-4 uppercase tracking-widest border-b border-gray-700 pb-2">
                    {data.reason === 'tsumo'
                        ? 'TSUMO!'
                        : data.reason === 'ryuukyoku'
                          ? 'DRAW'
                          : 'RON!'}
                </h2>

                {data.winnerId && (
                    <div className="text-center mb-3">
                        <span className="text-gray-400 text-xs">Winner</span>
                        <div className="text-xl font-bold text-white">
                            {data.winnerId}
                        </div>
                        {score && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300 mt-1 inline-block">
                                {isDealerWin
                                    ? 'Dealer (Oya)'
                                    : 'Non-Dealer (Ko)'}
                            </span>
                        )}
                    </div>
                )}

                {score && (
                    <div className="space-y-3 bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-end border-b border-gray-600 pb-2">
                            <div className="text-lg font-bold text-white">
                                {score.name || 'Win'}
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-yellow-400">
                                    {score.ten}{' '}
                                    <span className="text-xs text-gray-400 font-normal">
                                        pts
                                    </span>
                                </div>
                                {/* Show Tsumo payments if applicable */}
                                {data.reason === 'tsumo' && (
                                    <div className="text-[10px] text-gray-400">
                                        {isDealerWin
                                            ? `All pay ${score.oya[0]}`
                                            : `Pay: ${score.ko[0]} / ${score.ko[1]}`}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 text-xs text-gray-300">
                            <div>
                                <span className="font-bold text-white">
                                    {score.han}
                                </span>{' '}
                                Han
                            </div>
                            <div>
                                <span className="font-bold text-white">
                                    {score.fu}
                                </span>{' '}
                                Fu
                            </div>
                        </div>

                        {score.yaku && Object.keys(score.yaku).length > 0 && (
                            <div className="space-y-1 mt-1">
                                <div className="text-[10px] text-gray-500 uppercase font-bold border-b border-gray-700 pb-1 mb-1">
                                    Yaku List
                                </div>
                                {Object.entries(score.yaku).map(
                                    ([name, value]) => (
                                        <div
                                            key={name}
                                            className="flex justify-between text-xs text-white"
                                        >
                                            <span>{name}</span>
                                            <span className="font-mono text-yellow-600">
                                                {value}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}

                        {score.text && (
                            <div className="mt-2 text-[10px] text-gray-500 italic border-t border-gray-700 pt-2 text-center">
                                {score.text}
                            </div>
                        )}
                    </div>
                )}

                {data.disconnectedPlayerId && (
                    <div className="text-center text-red-400 mt-2 text-sm">
                        Player {data.disconnectedPlayerId} disconnected.
                    </div>
                )}

                <div className="mt-6 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg transition-transform hover:scale-105"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GameOverModal
