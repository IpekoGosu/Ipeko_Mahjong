import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface MahjongTileProps {
    tile: string
    onClick?: () => void
    isDrawn?: boolean
    isDora?: boolean
    className?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    rotation?: number
    mode?: 'text' | 'emoji'
}

const MahjongTile: React.FC<MahjongTileProps> = ({
    tile,
    onClick,
    isDrawn,
    isDora,
    className,
    size = 'lg',
    rotation = 0,
    mode = 'text',
}) => {
    const getTileDisplay = (t: string) => {
        let num = t[0]
        const suit = t[1]
        const isAka = num === '0'
        if (isAka) num = '5'

        if (mode === 'emoji') {
            const emojiMap: Record<string, string> = {
                '1m': '🀇', '2m': '🀈', '3m': '🀉', '4m': '🀊', '5m': '🀋', '6m': '🀌', '7m': '🀍', '8m': '🀎', '9m': '🀏',
                '1p': '🀙', '2p': '🀚', '3p': '🀛', '4p': '🀜', '5p': '🀝', '6p': '🀞', '7p': '🀟', '8p': '🀠', '9p': '🀡',
                '1s': '🀐', '2s': '🀑', '3s': '🀒', '4s': '🀓', '5s': '🀔', '6s': '🀕', '7s': '🀖', '8s': '🀗', '9s': '🀘',
                '1z': '🀀', '2z': '🀁', '3z': '🀂', '4z': '🀃', '5z': '🀆', '6z': '🀅', '7z': '🀄'
            }
            const key = isAka ? `5${suit}` : t
            return { text: emojiMap[key] || t, color: 'text-black', isEmoji: true, isAka }
        }

        if (suit === 'z') {
            const zNames: Record<string, string> = {
                '1': '東',
                '2': '南',
                '3': '西',
                '4': '北',
                '5': '',
                '6': '發',
                '7': '中',
            }

            let zColor = 'text-black'
            if (num === '6') zColor = 'text-green-700'
            if (num === '7') zColor = 'text-red-700'

            const text = zNames[num] !== undefined ? zNames[num] : t
            return { text, color: zColor, isZ: true, isAka: false, isEmoji: false }
        }

        const colors: Record<string, string> = {
            m: 'text-blue-700',
            p: 'text-red-700',
            s: 'text-green-700',
        }

        const suitNames: Record<string, string> = {
            m: '萬',
            p: '筒',
            s: '索',
        }

        const color = colors[suit] || 'text-black'

        return {
            text: num,
            subText: suitNames[suit] || suit,
            color,
            isZ: false,
            isAka,
            suit,
            isEmoji: false,
        }
    }

    const { text, subText, color, isZ, isAka, suit, isEmoji } = getTileDisplay(tile)

    const sizeClasses = {
        xs: 'w-[18px] h-[24px] text-[10px]',
        sm: 'w-[24px] h-[32px] text-[14px]',
        md: 'w-[36px] h-[48px] text-[20px]',
        lg: 'w-[48px] h-[64px] text-[28px]',
        xl: 'w-[60px] h-[80px] text-[34px]',
    }

    const zTextSizes = {
        xs: 'text-[12px]',
        sm: 'text-[18px]',
        md: 'text-[28px]',
        lg: 'text-[36px]',
        xl: 'text-[44px]',
    }

    const numTextSizes = {
        xs: 'text-[10px]',
        sm: 'text-[14px]',
        md: 'text-[20px]',
        lg: 'text-[28px]',
        xl: 'text-[34px]',
    }

    const emojiSizes = {
        xs: 'text-[20px]',
        sm: 'text-[28px]',
        md: 'text-[42px]',
        lg: 'text-[56px]',
        xl: 'text-[70px]',
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative transition-all duration-200 group',
                sizeClasses[size],
                isDrawn && 'ml-3',
                className,
            )}
        >
            <div
                style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
                className={cn(
                    'w-full h-full border border-gray-400 rounded flex flex-col items-center justify-center cursor-pointer transition-colors shadow-sm overflow-hidden',
                    isDora 
                        ? 'bg-[#fff9c4] ring-2 ring-yellow-400/70 border-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.4)]' 
                        : 'bg-[#f8f5e6] group-hover:bg-gray-100',
                )}
            >
                {isAka && (
                    <div className={cn(
                        "absolute bg-red-500 rounded-full shadow-sm z-10",
                        size === 'xs' ? 'top-0.5 right-0.5 w-1 h-1' : 'top-1 right-1 w-2 h-2'
                    )} />
                )}
                {isEmoji ? (
                    <span className={cn('leading-none select-none text-black flex items-center justify-center', emojiSizes[size])}>
                        {text}
                    </span>
                ) : isZ ? (
                    <span
                        className={cn(
                            'font-bold select-none leading-none',
                            zTextSizes[size],
                            color,
                        )}
                    >
                        {text}
                    </span>
                ) : (
                    <div className="flex flex-col items-center leading-none">
                        <span
                            className={cn(
                                'font-black select-none',
                                numTextSizes[size],
                                color,
                            )}
                        >
                            {text}
                        </span>
                        {size !== 'xs' && size !== 'sm' ? (
                            <span
                                className={cn(
                                    'font-bold select-none opacity-90',
                                    size === 'md' ? 'text-[10px]' : size === 'lg' ? 'text-[14px]' : 'text-[16px]',
                                    color,
                                )}
                            >
                                {subText}
                            </span>
                        ) : (
                            <span
                                className={cn(
                                    'font-bold select-none opacity-70 uppercase leading-none',
                                    size === 'xs' ? 'text-[5px]' : 'text-[7px]',
                                    color,
                                )}
                            >
                                {suit}
                            </span>
                        )}
                    </div>
                )}
                {!isEmoji && <div className="absolute top-0 left-0 w-full h-[15%] bg-blue-200/20 rounded-t-sm" />}
            </div>
        </div>
    )
}

export default MahjongTile
