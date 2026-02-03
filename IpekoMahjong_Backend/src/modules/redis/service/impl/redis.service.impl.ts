import { Injectable } from '@nestjs/common'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { RedisService } from '@src/modules/redis/service/redis.service'
import Redis from 'ioredis'

@Injectable()
export class RedisServiceImpl implements RedisService {
    private client: Redis

    constructor(private readonly logger: WinstonLoggerService) {
        // Redis 클라이언트 생성
        this.client = new Redis({
            host: 'localhost', // Redis 서버 주소
            port: 6379, // Redis 포트
            password: '', // Redis 비밀번호 (필요시 설정)
            db: 0, // 사용할 DB 번호
        })

        // 연결 상태 모니터링
        this.client.on('connect', () => {
            this.logger.log('Redis server connected.')
        })

        this.client.on('error', (err) => {
            this.logger.error('Redis server error:', err.message)
        })
    }

    // Redis에서 값 가져오기
    async get(key: string): Promise<string | null> {
        try {
            const value = await this.client.get(key)
            return value
        } catch (error) {
            this.logger.error('Redis get error:', error as string)
            throw error
        }
    }

    // Redis에 값 설정하기
    async set(key: string, value: string, ttl?: number): Promise<'OK'> {
        try {
            if (ttl) {
                // TTL(Time to live)이 설정된 경우
                return await this.client.set(key, value, 'EX', ttl)
            }
            return await this.client.set(key, value)
        } catch (error) {
            this.logger.error('Redis set error: ', error as string)
            throw error
        }
    }

    // Redis에 값 삭제하기
    async del(key: string): Promise<number> {
        try {
            return await this.client.del(key)
        } catch (error) {
            this.logger.error('Redis del error:', error as string)
            throw error
        }
    }

    // Redis 연결 종료
    async quit(): Promise<void> {
        await this.client.quit()
    }
}
