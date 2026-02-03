import { users } from '@prisma/client'

export class UserEntity implements users {
    id: number
    email: string
    name: string
    password: string
    type: number
    created_at: Date | null
    updated_at: Date | null
}
