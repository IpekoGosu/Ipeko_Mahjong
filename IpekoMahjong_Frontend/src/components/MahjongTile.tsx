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
}

const MahjongTile: React.FC<MahjongTileProps> = ({
    tile,
    onClick,
    isDrawn,
    isDora,
    className,
    size = 'lg',
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

    const sizeClasses = {
        xs: 'w-4 h-6 text-[10px]',
        sm: 'w-6 h-8 text-[14px]',
        md: 'w-8 h-11 text-[20px]',
        lg: 'w-12 h-16 text-[28px]',
        xl: 'w-14 h-20 text-[34px]',
    }

    const zTextSizes = {
        xs: 'text-[12px]',
        sm: 'text-[18px]',
        md: 'text-[24px]',
        lg: 'text-[36px]',
        xl: 'text-[44px]',
    }

    const numTextSizes = {
        xs: 'text-[10px]',
        sm: 'text-[14px]',
        md: 'text-[18px]',
        lg: 'text-[28px]',
        xl: 'text-[34px]',
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative bg-[#f8f5e6] border border-gray-400 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors shadow-sm',
                sizeClasses[size],
                isDrawn && 'ml-3',
                isDora && 'bg-[#fff9c4] ring-2 ring-yellow-400/70 border-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.4)]',
                className,
            )}
        >
            {isAka && (
                <div className={cn(
                    "absolute bg-red-500 rounded-full shadow-sm",
                    size === 'xs' ? 'top-0.5 right-0.5 w-1 h-1' : 'top-1 right-1 w-2 h-2'
                )} />
            )}
            {isZ ? (
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
            <div className="absolute top-0 left-0 w-full h-[15%] bg-blue-200/20 rounded-t-sm" />
        </div>
    )
}

export default MahjongTile
