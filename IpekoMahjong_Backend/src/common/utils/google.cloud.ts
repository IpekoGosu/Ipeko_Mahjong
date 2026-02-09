import { Storage } from '@google-cloud/storage'
import { ENV } from '@src/common/utils/dotenv'
import { randomUUID } from 'crypto'

let googleStorage: Storage | null = null
const bucketName = ENV.GOOGLE_CLOUD_STORAGE_BUCKET

export function getGoogleStorage() {
    if (!googleStorage) {
        googleStorage = new Storage({})
    }
    return googleStorage
}

export async function uploadFileToGoogleStorage(
    fileName: string,
    file: Express.Multer.File,
) {
    const randomName = randomUUID()
    const fileExtension = file.originalname.split('.').pop()
    const newFileName = `${randomName}.${fileExtension}`
    const storage = getGoogleStorage()
    await storage.bucket(bucketName).file(newFileName).save(file.buffer)
    return newFileName
}

export async function downloadFileFromGoogleStorage(fileName: string) {
    const storage = getGoogleStorage()
    const file = await storage.bucket(bucketName).file(fileName).download()
    return file[0]
}
