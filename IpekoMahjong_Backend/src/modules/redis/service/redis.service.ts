export const REDIS_SERVICE = Symbol('RedisService')

export interface RedisService {
    get(key: string): Promise<string | null>
    /**
     * add data to redis
     * @param key identifier key
     * @param value value string
     * @param ttl time to live (seconds)
     */
    set(key: string, value: string, ttl?: number): Promise<'OK'>
    del(key: string): Promise<number>
    quit(): Promise<void>
}
