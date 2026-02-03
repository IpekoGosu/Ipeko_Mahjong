import { IsEmail, IsEmpty, IsNotEmpty, IsString } from 'class-validator'

export class UserCreateDto {
    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsNotEmpty()
    password: string

    @IsEmpty()
    type: number
}
