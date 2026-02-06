import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class UserLoginDto {
    constructor(email: string, password: string) {
        this.email = email
        this.password = password
    }

    @IsEmail()
    @IsNotEmpty()
    readonly email: string

    @IsString()
    @IsNotEmpty()
    readonly password: string
}
