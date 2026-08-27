import { ReadableStream, TransformStream } from 'node:stream/web';
import { TextEncoder } from 'node:util';
import {
  assertEdgeRuntime,
  createEdgeHandler,
  createEdgeRequestContext,
  detectEdgeRuntime,
  EdgeRuntimeError,
} from '../src/index';
import type { ServerApp } from '../src/modules/server';

const edgeRuntime = {
  fetch: (() => Promise.resolve({})) as unknown as typeof fetch,
  Request: class EdgeRequest {},
  Response: class EdgeResponse {},
  Headers: class EdgeHeaders {},
  ReadableStream,
  TransformStream,
  AbortController,
  TextEncoder,
  crypto: globalThis.crypto,
} as unknown as typeof globalThis;

function request(url: string): Request {
  return { url, method: 'GET', signal: new AbortController().signal } as Request;
}

function appReturning(response: Response): ServerApp {
  return { handle: jest.fn(async () => response) } as unknown as ServerApp;
}

describe('edge deployment adapter contract', () => {
  it('detects required Fetch, stream, abort, encoding, and crypto capabilities', () => {
    const capabilities = detectEdgeRuntime(edgeRuntime);
    expect(capabilities).toMatchObject({
      fetch: true,
      request: true,
      response: true,
      headers: true,
      webStreams: true,
      abortController: true,
      textEncoder: true,
    });
  });

  it('fails fast when an adapter requires unavailable capabilities', () => {
    expect(() => assertEdgeRuntime({ runtime: {} as typeof globalThis })).toThrow(EdgeRuntimeError);
    expect(() => assertEdgeRuntime({ runtime: {} as typeof globalThis, requireStreaming: true })).toThrow('Web Streams');
  });

  it('handles Fetch requests directly without changing the response object', async () => {
    const response = { status: 200, headers: new Map(), body: null } as unknown as Response;
    const app = appReturning(response);
    const handler = createEdgeHandler(app, { runtime: edgeRuntime });
    const incoming = request('https://example.test/health');

    const result = await handler.fetch(incoming);
    expect(result).toBe(response);
    expect(app.handle).toHaveBeenCalledWith(incoming);
  });

  it('returns a streaming response body unchanged', async () => {
    const body = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('first');
        controller.enqueue('second');
        controller.close();
      },
    });
    const response = { status: 200, headers: new Map(), body } as unknown as Response;
    const handler = createEdgeHandler(appReturning(response), { runtime: edgeRuntime });

    const result = await handler.fetch(request('https://example.test/stream'));
    expect(result.body).toBe(body);
  });

  it('registers waitUntil tasks when the platform execution context provides it', async () => {
    const waits: Promise<unknown>[] = [];
    const context = createEdgeRequestContext({
      env: { APP_ENV: 'test' },
      executionContext: { waitUntil: promise => waits.push(promise) },
    });
    const task = Promise.resolve('done');
    context.waitUntil(task);

    expect(context.env).toEqual({ APP_ENV: 'test' });
    expect(waits).toEqual([task]);
    await expect(waits[0]).resolves.toBe('done');
  });
});
