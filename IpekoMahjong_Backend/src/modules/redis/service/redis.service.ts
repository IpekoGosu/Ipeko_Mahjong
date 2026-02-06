export abstract class RedisService {
    abstract get(key: string): Promise<string | null>
    /**
     * add data to redis
     * @param key identifier key
     * @param value value string
     * @param ttl time to live (seconds)
     */
    abstract set(key: string, value: string, ttl?: number): Promise<'OK'>
    abstract del(key: string): Promise<number>
    abstract quit(): Promise<void>
}
