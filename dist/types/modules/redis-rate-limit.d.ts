import type { RateLimitStore } from './server';
export interface RedisRateLimitClient {
    /** ioredis-compatible EVAL signature. The application owns the Redis connection. */
    eval(script: string, keyCount: number, ...keysAndArguments: string[]): Promise<unknown>;
}
export interface RedisRateLimitStoreOptions {
    prefix?: string;
    now?: () => number;
}
/**
 * Creates a distributed RateLimitStore backed by an ioredis-compatible EVAL client.
 * The Lua script keeps INCR and key expiry atomic across application instances.
 */
export declare function createRedisRateLimitStore(client: RedisRateLimitClient, options?: RedisRateLimitStoreOptions): RateLimitStore;
