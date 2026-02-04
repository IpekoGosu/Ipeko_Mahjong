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
    className?: string
}

const MahjongTile: React.FC<MahjongTileProps> = ({
    tile,
    onClick,
    isDrawn,
    className,
}) => {
    const getTileDisplay = (t: string) => {
        let num = t[0]
        const suit = t[1]
        const isAka = num === '0'
        if (isAka) num = '5'

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

            let color = 'text-black'
            if (num === '6') color = 'text-green-700'
            if (num === '7') color = 'text-red-700'

            const text = zNames[num] !== undefined ? zNames[num] : t
            return { text, color, isZ: true, isAka: false }
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
        }
    }

    const { text, subText, color, isZ, isAka, suit } = getTileDisplay(tile)

    // Heuristic: if width is small (e.g. w-4), use smaller font
    const isXS = className?.includes('w-4')
    const isSmall = className?.includes('w-5')
    const isMedium =
        className?.includes('w-7') ||
        className?.includes('w-8') ||
        className?.includes('w-6')

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative w-10 h-14 bg-[#f8f5e6] border border-gray-400 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors shadow-sm',
                isDrawn && 'ml-2',
                className,
            )}
        >
            {isAka && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm" />
            )}
            {isZ ? (
                <span
                    className={cn(
                        'font-bold select-none leading-none',
                        isXS
                            ? 'text-[18px]'
                            : isSmall
                              ? 'text-[21px]'
                              : isMedium
                                ? 'text-[26px]'
                                : 'text-[42px]',
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
                            isXS
                                ? 'text-[12px]'
                                : isSmall
                                  ? 'text-[14px]'
                                  : isMedium
                                    ? 'text-[18px]'
                                    : 'text-[28px]',
                            color,
                        )}
                    >
                        {text}
                    </span>
                    {isXS || isSmall ? (
                        <span
                            className={cn(
                                'text-[6px] font-bold select-none opacity-70 uppercase leading-none',
                                color,
                            )}
                        >
                            {suit}
                        </span>
                    ) : (
                        <span
                            className={cn(
                                'font-bold select-none opacity-90',
                                isMedium ? 'text-[10px]' : 'text-[14px]',
                                color,
                            )}
                        >
                            {subText}
                        </span>
                    )}
                </div>
            )}
            <div className="absolute top-0 left-0 w-full h-[15%] bg-blue-200/20 rounded-t-sm" />
        </div>
    )
}

export default MahjongTile
