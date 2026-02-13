export interface GameRulesConfig {
    startPoints: number
    returnPoints: number
    uma: number[] // [1st, 2nd, 3rd, 4th]
    oka: number
}

export const DEFAULT_4P_RULES: GameRulesConfig = {
    startPoints: 25000,
    returnPoints: 30000,
    uma: [20000, 10000, -10000, -20000],
    oka: (30000 - 25000) * 4,
}

export const DEFAULT_3P_RULES: GameRulesConfig = {
    startPoints: 25000,
    returnPoints: 30000,
    uma: [20000, 0, -20000], // 3 people
    oka: (30000 - 25000) * 3,
}
