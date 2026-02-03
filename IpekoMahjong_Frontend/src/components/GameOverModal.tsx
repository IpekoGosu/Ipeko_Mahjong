import React from 'react';
import { GameOverPayload } from '../types';

interface GameOverModalProps {
  data: GameOverPayload;
  onClose: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border-2 border-yellow-600 rounded-xl p-8 max-w-lg w-full shadow-2xl relative">
        <h2 className="text-3xl font-black text-center text-yellow-500 mb-6 uppercase tracking-widest border-b border-gray-700 pb-4">
          {data.reason === 'tsumo' ? 'WIN!' : data.reason === 'ryuukyoku' ? 'DRAW' : 'GAME OVER'}
        </h2>

        {data.winnerId && (
          <div className="text-center mb-4">
            <span className="text-gray-400 text-sm">Winner</span>
            <div className="text-2xl font-bold text-white">{data.winnerId}</div>
          </div>
        )}

        {data.score && (
          <div className="space-y-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-end border-b border-gray-600 pb-2">
              <div className="text-xl font-bold text-white">{data.score.name}</div>
              <div className="text-3xl font-black text-yellow-400">{data.score.ten} <span className="text-sm text-gray-400 font-normal">pts</span></div>
            </div>
            
            <div className="flex gap-4 text-sm text-gray-300">
              <div>{data.score.han} Han</div>
              <div>{data.score.fu} Fu</div>
            </div>

            {data.score.yaku && Object.keys(data.score.yaku).length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="text-xs text-gray-500 uppercase font-bold">Yaku</div>
                {Object.entries(data.score.yaku).map(([name, value]) => (
                  <div key={name} className="flex justify-between text-sm text-white">
                    <span>{name}</span>
                    <span className="font-mono text-yellow-600">{value}</span>
                  </div>
                ))}
              </div>
            )}
             
             {data.score.text && (
                 <div className="mt-2 text-sm text-gray-400 italic border-t border-gray-700 pt-2">
                     "{data.score.text}"
                 </div>
             )}
          </div>
        )}

        {data.disconnectedPlayerId && (
           <div className="text-center text-red-400 mt-4">
               Player {data.disconnectedPlayerId} disconnected.
           </div>
        )}

        <div className="mt-8 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg transition-transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
