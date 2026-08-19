import type { RateLimitState, RateLimitStore } from './server';

export interface RedisRateLimitClient {
  /** ioredis-compatible EVAL signature. The application owns the Redis connection. */
  eval(script: string, keyCount: number, ...keysAndArguments: string[]): Promise<unknown>;
}

export interface RedisRateLimitStoreOptions {
  prefix?: string;
  now?: () => number;
}

const incrementScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`;

function parseResult(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error('Redis rate-limit EVAL returned an invalid result');
  }
  const count = Number(value[0]);
  const ttl = Number(value[1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error('Redis rate-limit EVAL returned non-numeric values');
  }
  return [count, Math.max(1, ttl)];
}

/**
 * Creates a distributed RateLimitStore backed by an ioredis-compatible EVAL client.
 * The Lua script keeps INCR and key expiry atomic across application instances.
 */
export function createRedisRateLimitStore(
  client: RedisRateLimitClient,
  options: RedisRateLimitStoreOptions = {},
): RateLimitStore {
  const prefix = options.prefix ?? 'onekit:ratelimit:';
  const now = options.now ?? Date.now;
  return {
    async increment(key: string, windowMs: number): Promise<RateLimitState> {
      const ttlMs = Math.max(1, Math.floor(windowMs));
      const result = await client.eval(incrementScript, 1, `${prefix}${key}`, String(ttlMs));
      const [count, ttl] = parseResult(result);
      return { count, resetAt: now() + ttl };
    },
  };
}
