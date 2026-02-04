import React from 'react'
import { AskActionPayload } from '../types'
import MahjongTile from './MahjongTile'

interface ActionButtonsProps {
    request: AskActionPayload
    onTakeAction: (type: string, tiles?: string[]) => void
    onIgnoreAction: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    request,
    onTakeAction,
    onIgnoreAction,
}) => {
    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex flex-col gap-1 z-50 items-center">
            <div className="bg-gray-800/95 p-3 rounded-xl border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] flex flex-wrap gap-3 items-center justify-center backdrop-blur-sm min-w-[250px]">
                {/* RON Action */}
                {request.ron && (
                    <button
                        onClick={() => onTakeAction('ron')}
                        className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black text-xl shadow-lg transform hover:scale-105 transition-all border-2 border-red-400 flex items-center gap-2"
                    >
                        <span>⚡ RON</span>
                    </button>
                )}

                {/* Separator if mixed actions */}
                {request.ron && (request.pon || request.kan || request.chi) && (
                    <div className="w-px h-8 bg-gray-600 mx-1"></div>
                )}

                {/* PON Action */}
                {request.pon && (
                    <button
                        onClick={() => onTakeAction('pon')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all border-2 border-blue-400"
                    >
                        PON
                    </button>
                )}

                {/* KAN Action */}
                {request.kan && (
                    <button
                        onClick={() => onTakeAction('kan')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all border-2 border-purple-400"
                    >
                        KAN
                    </button>
                )}

                {/* CHI Actions */}
                {request.chi &&
                    request.chiOptions?.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() =>
                                onTakeAction('chi', [...opt, request.tile])
                            }
                            className="group px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all border-2 border-green-400 flex flex-col items-center gap-1"
                        >
                            <span className="text-xs">CHI</span>
                            <div className="flex gap-0.5 bg-green-700/50 p-0.5 rounded">
                                {opt.map((t, i) => (
                                    <MahjongTile
                                        key={i}
                                        tile={t}
                                        className="w-5 h-7 text-[8px] shadow-sm border-gray-300 pointer-events-none"
                                    />
                                ))}
                            </div>
                        </button>
                    ))}

                <div className="w-px h-8 bg-gray-600 mx-1"></div>

                {/* Skip Action */}
                <button
                    onClick={onIgnoreAction}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg font-bold text-xs shadow-md hover:shadow-gray-500/50 transition-all hover:text-white"
                >
                    Skip
                </button>
            </div>
        </div>
    )
}

export default ActionButtons
