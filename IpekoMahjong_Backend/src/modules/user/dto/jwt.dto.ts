import { ApiProperty } from '@nestjs/swagger'

export class JwtDto {
    constructor(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
    }

    @ApiProperty()
    readonly accessToken: string

    @ApiProperty()
    readonly refreshToken: string
}
