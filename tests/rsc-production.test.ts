import { ReadableStream } from 'node:stream/web';
import {
  createRSCClientReference,
  createRSCFlightRecord,
  createRSCFlightStream,
  decodeRSCFlight,
  encodeRSCFlight,
  resolveRSCFlight,
} from '../src/modules/rsc';

(globalThis as typeof globalThis & { ReadableStream?: typeof ReadableStream }).ReadableStream = ReadableStream;

describe('experimental RSC-style protocol contract', () => {
  it('encodes and decodes bounded models with client references', () => {
    const reference = createRSCClientReference('components/Button', 'Button');
    const payload = encodeRSCFlight([
      createRSCFlightRecord('root', { title: 'Hello', component: reference }),
    ]);
    const decoded = decodeRSCFlight(payload);

    expect(decoded).toEqual([{
      id: 'root',
      type: 'model',
      value: { title: 'Hello', component: reference },
    }]);
  });

  it('resolves references explicitly without automatically rendering them', async () => {
    const reference = createRSCClientReference('components/Button');
    const records = decodeRSCFlight(encodeRSCFlight([
      createRSCFlightRecord('root', { component: reference, nested: [reference] }),
    ]));
    const resolver = jest.fn(async (value: typeof reference) => `${value.moduleId}:${value.exportName}`);

    const resolved = await resolveRSCFlight(records!, resolver);
    expect(resolved[0].value).toEqual({
      component: 'components/Button:default',
      nested: ['components/Button:default'],
    });
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it('streams newline-delimited records and rejects malformed or mismatched envelopes', async () => {
    const stream = createRSCFlightStream([
      createRSCFlightRecord('a', { ok: true }),
      createRSCFlightRecord('b', null, 'client-reference'),
    ]);
    const reader = stream.getReader();
    let payload = '';
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      payload += result.value;
    }

    expect(decodeRSCFlight(payload)).toHaveLength(2);
    expect(decodeRSCFlight('{"kind":"onekit-flight","version":999}')).toBeNull();
    expect(decodeRSCFlight('{not-json}')).toBeNull();
  });

  it('fails closed for unsafe models, oversized payloads, and blocked object keys', () => {
    expect(() => encodeRSCFlight([
      createRSCFlightRecord('cycle', (() => {
        const value: Record<string, unknown> = {};
        value.self = value;
        return value;
      })() as never),
    ])).toThrow('cyclic');
    expect(() => encodeRSCFlight([
      createRSCFlightRecord('large', 'x'.repeat(20)),
    ], { maxBytes: 10 })).toThrow('maximum');
    expect(() => encodeRSCFlight([
      createRSCFlightRecord('unsafe', JSON.parse('{"__proto__":{"polluted":true}}')),
    ])).toThrow('blocked');
    expect(decodeRSCFlight('{"kind":"onekit-flight","version":1,"record":{"id":"x","type":"model","value":{"__proto__":true}}}')).toBeNull();
  });

  it('rejects an aborted stream before emitting later records', async () => {
    const controller = new AbortController();
    const stream = createRSCFlightStream([
      createRSCFlightRecord('a', 'first'),
      createRSCFlightRecord('b', 'second'),
    ], { signal: controller.signal });
    const reader = stream.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    controller.abort();
    await expect(reader.read()).rejects.toMatchObject({ name: 'AbortError' });
  });
});
