import { CommonError } from '@src/common/error/common.error'
import { ERROR_STATUS } from '@src/common/error/error.status'
import * as bcrypt from 'bcrypt'
const SALT_ROUNDS = 10

export async function hashPassword(password: string) {
    try {
        return await bcrypt.hash(password, SALT_ROUNDS)
    } catch (error) {
        console.error(error)
        throw new CommonError(ERROR_STATUS.BCRYPT_HASH_ERROR)
    }
}

export async function matchPassword(
    inputPassword: string,
    encryptedPassword: string,
) {
    try {
        return await bcrypt.compare(inputPassword, encryptedPassword)
    } catch (error) {
        console.error(error)
        throw new CommonError(ERROR_STATUS.BCRYPT_HASH_ERROR)
    }
}
