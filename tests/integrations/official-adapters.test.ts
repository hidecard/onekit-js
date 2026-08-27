import {
  createRedisISRLock,
  createRedisISRStorage,
} from '../../packages/redis/src/index';
import {
  createDenoKVISRLock,
  createDenoKVISRStorage,
} from '../../packages/deno-kv/src/index';
import {
  createVercelGlobalConfigReader,
} from '../../packages/vercel-global-config/src/index';

type RedisValue = string;

class FakeRedis {
  readonly values = new Map<string, RedisValue>();
  async get(key: string): Promise<string | undefined> { return this.values.get(key); }
  async set(key: string, value: string, options?: { NX?: boolean; PX?: number }): Promise<unknown> {
    if (options?.NX && this.values.has(key)) return null;
    this.values.set(key, value);
    return 'OK';
  }
  async del(...keys: string[]): Promise<number> {
    return keys.reduce((count, key) => count + (this.values.delete(key) ? 1 : 0), 0);
  }
  async *scanIterator(options?: { MATCH?: string }): AsyncIterable<string> {
    const prefix = options?.MATCH?.replace(/\*$/, '') ?? '';
    for (const key of this.values.keys()) if (key.startsWith(prefix)) yield key;
  }
  async eval(_script: string, options: { keys: string[]; arguments: string[] }): Promise<number> {
    const key = options.keys[0];
    if (this.values.get(key) === options.arguments[0]) {
      this.values.delete(key);
      return 1;
    }
    return 0;
  }
}

type DenoKey = readonly (string | number | bigint | boolean)[];

class FakeDenoKV {
  readonly values = new Map<string, { key: DenoKey; value: unknown; versionstamp: string }>();
  private version = 0;
  private id(key: DenoKey): string { return JSON.stringify(key); }
  async get<T>(key: DenoKey): Promise<{ key: DenoKey; value: T | null; versionstamp: string | null }> {
    const entry = this.values.get(this.id(key));
    return { key, value: (entry?.value as T | undefined) ?? null, versionstamp: entry?.versionstamp ?? null };
  }
  async set(key: DenoKey, value: unknown): Promise<{ versionstamp: string }> {
    const versionstamp = String(++this.version);
    this.values.set(this.id(key), { key, value, versionstamp });
    return { versionstamp };
  }
  async delete(key: DenoKey): Promise<void> { this.values.delete(this.id(key)); }
  async *list<T>(selector: { prefix: DenoKey }): AsyncIterable<{ key: DenoKey; value: T; versionstamp: string }> {
    for (const entry of this.values.values()) {
      if (selector.prefix.every((part, index) => entry.key[index] === part)) {
        yield entry as { key: DenoKey; value: T; versionstamp: string };
      }
    }
  }
  atomic() {
    const checks: Array<{ key: DenoKey; versionstamp: string | null }> = [];
    const operations: Array<{ type: 'set' | 'delete'; key: DenoKey; value?: unknown }> = [];
    const owner = this;
    return {
      check(...entries: Array<{ key: DenoKey; versionstamp: string | null }>) { checks.push(...entries); return this; },
      set(key: DenoKey, value: unknown) { operations.push({ type: 'set', key, value }); return this; },
      delete(key: DenoKey) { operations.push({ type: 'delete', key }); return this; },
      async commit() {
        for (const check of checks) {
          const current = owner.values.get(owner.id(check.key));
          if ((current?.versionstamp ?? null) !== check.versionstamp) return { ok: false, versionstamp: null };
        }
        let versionstamp: string | null = null;
        for (const operation of operations) {
          if (operation.type === 'delete') await owner.delete(operation.key);
          else versionstamp = (await owner.set(operation.key, operation.value)).versionstamp;
        }
        return { ok: true, versionstamp };
      },
    };
  }
}

describe('official integration adapters', () => {
  test('Redis storage namespacing and lease acquisition/release', async () => {
    const redis = new FakeRedis();
    const storage = createRedisISRStorage(redis, { keyPrefix: 'test:isr:' });
    await storage.put('test:isr:/home', '{"path":"/home"}');
    expect(await storage.get('test:isr:/home')).toBe('{"path":"/home"}');
    expect(await storage.list?.('test:isr:')).toEqual(['test:isr:/home']);

    const lock = createRedisISRLock(redis, { keyPrefix: 'test:lock:', defaultLeaseMs: 1000 });
    const first = await lock.acquire('/home');
    expect(first).not.toBeNull();
    expect(await lock.acquire('/home')).toBeNull();
    await first!.release();
    expect(await lock.acquire('/home')).not.toBeNull();
  });

  test('Deno KV storage enumerates values and atomic lease excludes concurrent owners', async () => {
    const kv = new FakeDenoKV();
    const storage = createDenoKVISRStorage(kv, { keyPrefix: 'test:isr:' });
    await storage.put('test:isr:/about', 'serialized');
    expect(await storage.get('test:isr:/about')).toBe('serialized');
    expect(await storage.list?.('test:isr:')).toEqual(['test:isr:/about']);

    const lock = createDenoKVISRLock(kv, { keyPrefix: 'test:lock:', defaultLeaseMs: 1000 });
    const first = await lock.acquire('/about');
    expect(first).not.toBeNull();
    expect(await lock.acquire('/about')).toBeNull();
    await first!.release();
    expect(await lock.acquire('/about')).not.toBeNull();
  });

  test('Vercel Global Config reader injects the official SDK client without platform imports', async () => {
    const client = {
      get: jest.fn(async <T>(key: string) => ({ feature: 'enabled' }[key] as T | undefined)),
      getAll: jest.fn(async () => ({ feature: 'enabled' })),
      has: jest.fn(async () => true),
      digest: jest.fn(async () => 'digest-1'),
    };
    const createClient = jest.fn(() => client);
    const reader = createVercelGlobalConfigReader({ createClient, connectionString: 'https://global-config.vercel.com/id?token=test' });
    expect(createClient).toHaveBeenCalledWith('https://global-config.vercel.com/id?token=test');
    expect(await reader.get('feature')).toBe('enabled');
    expect(await reader.getAll()).toEqual({ feature: 'enabled' });
    expect(await reader.has?.('feature')).toBe(true);
    expect(await reader.digest?.()).toBe('digest-1');
  });
});
