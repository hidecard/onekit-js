import { createRedisRateLimitStore } from '../src';

describe('Redis rate-limit store', () => {
  it('uses one atomic EVAL call and maps count and TTL', async () => {
    const evalMock = jest.fn(async () => [3, 4_500]);
    const store = createRedisRateLimitStore({ eval: evalMock }, {
      prefix: 'test:limit:',
      now: () => 1_000,
    });

    await expect(store.increment('client-a', 60_000)).resolves.toEqual({
      count: 3,
      resetAt: 5_500,
    });
    expect(evalMock).toHaveBeenCalledTimes(1);
    expect(evalMock.mock.calls[0][1]).toBe(1);
    expect(evalMock.mock.calls[0][2]).toBe('test:limit:client-a');
    expect(evalMock.mock.calls[0][3]).toBe('60000');
  });

  it('normalizes invalid or expired TTL values to a safe reset window', async () => {
    const store = createRedisRateLimitStore({ eval: async () => [1, -1] }, { now: () => 10_000 });
    await expect(store.increment('client-b', 1)).resolves.toEqual({ count: 1, resetAt: 10_001 });
  });

  it('rejects malformed Redis script results', async () => {
    const store = createRedisRateLimitStore({ eval: async () => ['bad'] });
    await expect(store.increment('client-c', 1)).rejects.toThrow('invalid result');
  });
});
