import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsArray,
    IsEnum,
} from 'class-validator'

export class StartGameDto {
    @IsOptional()
    @IsEnum(['4p', 'sanma'])
    gameMode?: '4p' | 'sanma'
}

export class DiscardTileDto {
    @IsString()
    @IsNotEmpty()
    roomId!: string

    @IsString()
    @IsNotEmpty()
    tile!: string

    @IsOptional()
    @IsBoolean()
    isRiichi?: boolean
}

export class DeclareTsumoDto {
    @IsString()
    @IsNotEmpty()
    roomId!: string
}

export class NextRoundDto {
    @IsString()
    @IsNotEmpty()
    roomId!: string
}

export class SelectActionDto {
    @IsString()
    @IsNotEmpty()
    roomId!: string

    @IsEnum(['chi', 'pon', 'kan', 'ron', 'skip', 'ankan', 'kakan'])
    type!: 'chi' | 'pon' | 'kan' | 'ron' | 'skip' | 'ankan' | 'kakan'

    @IsString()
    @IsNotEmpty()
    tile!: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    consumedTiles?: string[]
}
