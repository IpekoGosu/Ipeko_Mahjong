import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MahjongTileProps {
  tile: string;
  onClick?: () => void;
  isDrawn?: boolean;
  className?: string;
}

const MahjongTile: React.FC<MahjongTileProps> = ({ tile, onClick, isDrawn, className }) => {
  const getTileDisplay = (t: string) => {
    const num = t[0];
    const suit = t[1];
    
    if (suit === 'z') {
      const zNames: Record<string, string> = {
        '1': '東', '2': '南', '3': '西', '4': '北',
        '5': '白', '6': '發', '7': '中'
      };
      return { text: zNames[num] || t, color: 'text-black' };
    }
    
    const colors: Record<string, string> = {
      'm': 'text-blue-600',
      'p': 'text-red-600',
      's': 'text-green-600'
    };
    
    const suitNames: Record<string, string> = {
      'm': '만',
      'p': '통',
      's': '삭'
    };
    
    return { text: `${num}${suitNames[suit] || suit}`, color: colors[suit] || 'text-black' };
  };

  const { text, color } = getTileDisplay(tile);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative w-10 h-14 bg-white border border-gray-400 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors shadow-md",
        isDrawn && "ml-2",
        className
      )}
    >
      <span className={cn("text-lg font-bold leading-tight select-none", color)}>
        {text}
      </span>
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 rounded-t-sm opacity-50" />
    </div>
  );
};

export default MahjongTile;
