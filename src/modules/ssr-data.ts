import type { DehydratedQueryState, QueryClient } from './query';
import type { RouteDataSnapshot, Router } from './router';

export type RouteDataTransportValue = null | boolean | number | string | RouteDataTransportValue[] | { [key: string]: RouteDataTransportValue };

export interface RouteDataPayload {
  version: 1;
  kind: 'onekit-route-data';
  issuedAt: number;
  expiresAt?: number;
  snapshot: RouteDataSnapshot;
  query?: DehydratedQueryState;
  signature?: string;
}

export interface RouteDataTransportSigner {
  sign(payload: string): Promise<string>;
  verify(payload: string, signature: string): Promise<boolean>;
}

export interface RouteDataTransportOptions {
  /** Maximum UTF-8 encoded payload size. Defaults to 512 KiB. */
  maxBytes?: number;
  /** Maximum nested value depth. Defaults to 20. */
  maxDepth?: number;
  /** Maximum string length. Defaults to 100,000 code units. */
  maxStringLength?: number;
  /** Maximum age accepted by the parser, in milliseconds. */
  maxAge?: number;
  /** Time-to-live emitted into the envelope, in milliseconds. */
  ttl?: number;
  /** Reject a value before serialization, for example to exclude secrets. */
  exclude?: (path: string, value: unknown) => boolean;
  /** Replace a value before serialization; returning undefined omits object properties. */
  redact?: (path: string, value: unknown) => unknown;
  /** Optional application-owned signing adapter. */
  signer?: RouteDataTransportSigner;
  /** Require a valid signature while parsing. */
  requireSignature?: boolean;
  /** Reject a payload intended for another URL. */
  expectedFullPath?: string;
  /** Inject a deterministic clock in tests or controlled runtimes. */
  now?: () => number;
}

export type RouteDataTransportErrorCode =
  | 'invalid-input'
  | 'unsupported-value'
  | 'too-deep'
  | 'too-large'
  | 'expired'
  | 'invalid-envelope'
  | 'route-mismatch'
  | 'signature-required'
  | 'signature-invalid';

export class RouteDataTransportError extends Error {
  readonly code: RouteDataTransportErrorCode;

  constructor(code: RouteDataTransportErrorCode, message: string) {
    super(message);
    this.name = 'RouteDataTransportError';
    this.code = code;
  }
}

const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_MAX_STRING_LENGTH = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function encodeText(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value);
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index)!;
    if (codePoint > 0xffff) index += 1;
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  }
  return Uint8Array.from(bytes);
}

function byteLength(value: string): number {
  return encodeText(value).byteLength;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function sanitize(value: unknown, path: string, options: RouteDataTransportOptions, seen: Set<object>, depth: number): RouteDataTransportValue | undefined {
  if (options.exclude?.(path, value)) return undefined;
  if (options.redact) {
    const replacement = options.redact(path, value);
    if (replacement === undefined) return undefined;
    value = replacement;
  }
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > (options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH)) {
      throw new RouteDataTransportError('too-large', `String at ${path} exceeds the configured length limit`);
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RouteDataTransportError('unsupported-value', `Non-finite number at ${path} is not JSON-safe`);
    return value;
  }
  if (typeof value !== 'object') throw new RouteDataTransportError('unsupported-value', `Value at ${path} is not JSON-safe`);
  if (depth >= (options.maxDepth ?? DEFAULT_MAX_DEPTH)) throw new RouteDataTransportError('too-deep', `Value at ${path} exceeds the nesting limit`);
  if (seen.has(value)) throw new RouteDataTransportError('unsupported-value', `Cyclic value at ${path} is not JSON-safe`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => sanitize(item, `${path}[${index}]`, options, seen, depth + 1) ?? null);
    }
    if (!isRecord(value)) throw new RouteDataTransportError('unsupported-value', `Class instance at ${path} is not JSON-safe`);
    const output: { [key: string]: RouteDataTransportValue } = Object.create(null) as { [key: string]: RouteDataTransportValue };
    for (const [key, item] of Object.entries(value)) {
      const sanitized = sanitize(item, `${path}.${key}`, options, seen, depth + 1);
      if (sanitized !== undefined) output[key] = sanitized;
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function validateSnapshot(value: unknown): value is RouteDataSnapshot {
  if (!isRecord(value) || value.version !== 1 || typeof value.fullPath !== 'string' || !Array.isArray(value.routes)) return false;
  return value.routes.every(route => isRecord(route) && typeof route.path === 'string' && (!('data' in route) || 'data' in route));
}

function validateQueryState(value: unknown): value is DehydratedQueryState {
  if (!isRecord(value) || !Array.isArray(value.queries)) return false;
  return value.queries.every(query => isRecord(query) && typeof query.key === 'string' && isRecord(query.state)
    && typeof query.state.status === 'string' && typeof query.state.updatedAt === 'number');
}

function unsignedBody(payload: RouteDataPayload): Omit<RouteDataPayload, 'signature'> {
  const { signature: _signature, ...body } = payload;
  return body;
}

function assertSize(serialized: string, options: RouteDataTransportOptions): void {
  if (byteLength(serialized) > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
    throw new RouteDataTransportError('too-large', 'SSR route-data payload exceeds the configured byte limit');
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function' ? btoa(binary) : binary;
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  if (typeof atob !== 'function') throw new Error('Base64 decoding is unavailable');
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

/** Create a standards-based HMAC-SHA-256 adapter using Web Crypto. */
export async function createHmacSha256Signer(secret: string | Uint8Array | CryptoKey): Promise<RouteDataTransportSigner> {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.subtle) throw new Error('Web Crypto SubtleCrypto is required for HMAC signing');
  const key = typeof CryptoKey !== 'undefined' && secret instanceof CryptoKey
    ? secret
    : await cryptoObject.subtle.importKey('raw', (typeof secret === 'string' ? encodeText(secret) : secret) as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return {
    async sign(payload: string): Promise<string> {
      const signature = await cryptoObject.subtle.sign('HMAC', key, encodeText(payload) as unknown as BufferSource);
      return bytesToBase64Url(new Uint8Array(signature));
    },
    async verify(payload: string, signature: string): Promise<boolean> {
      try {
        const expected = new Uint8Array(await cryptoObject.subtle.sign('HMAC', key, encodeText(payload) as unknown as BufferSource));
        return constantTimeEqual(expected, base64UrlToBytes(signature));
      } catch {
        return false;
      }
    },
  };
}

/** Serialize a route/query handoff into a bounded, optionally signed envelope. */
export async function createRouteDataPayload(
  snapshot: RouteDataSnapshot,
  options: RouteDataTransportOptions = {},
  query?: DehydratedQueryState,
): Promise<string> {
  const now = options.now?.() ?? Date.now();
  const sanitizedSnapshot = sanitize(snapshot, '$.snapshot', options, new Set(), 0);
  const sanitizedQuery = query === undefined ? undefined : sanitize(query, '$.query', options, new Set(), 0);
  if (!validateSnapshot(sanitizedSnapshot)) throw new RouteDataTransportError('invalid-input', 'Route snapshot is not valid');
  if (sanitizedQuery !== undefined && !validateQueryState(sanitizedQuery)) throw new RouteDataTransportError('invalid-input', 'Query snapshot is not valid');
  const payload: RouteDataPayload = {
    version: 1,
    kind: 'onekit-route-data',
    issuedAt: now,
    ...(options.ttl !== undefined ? { expiresAt: now + Math.max(0, options.ttl) } : {}),
    snapshot: sanitizedSnapshot,
    ...(sanitizedQuery !== undefined ? { query: sanitizedQuery } : {}),
  };
  const body = stableStringify(unsignedBody(payload));
  assertSize(body, options);
  if (options.signer) payload.signature = await options.signer.sign(body);
  const serialized = stableStringify(payload);
  assertSize(serialized, options);
  return serialized;
}

/** Apply a previously validated payload to the existing router/query hydration APIs. */
export function applyRouteDataPayload(payload: RouteDataPayload, router: Pick<Router, 'hydrate'>, queryClient?: Pick<QueryClient, 'hydrate'>): void {
  router.hydrate(payload.snapshot);
  if (payload.query) queryClient?.hydrate(payload.query);
}

/** Parse and validate a route/query handoff. Invalid data is rejected with no usable payload. */
export async function parseRouteDataPayload(
  input: string | unknown,
  options: RouteDataTransportOptions = {},
): Promise<RouteDataPayload | null> {
  if (typeof input !== 'string' || byteLength(input) > (options.maxBytes ?? DEFAULT_MAX_BYTES)) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { return null; }
  try {
    parsed = sanitize(parsed, '$', { ...options, exclude: undefined, redact: undefined }, new Set(), 0);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 1 || parsed.kind !== 'onekit-route-data' || typeof parsed.issuedAt !== 'number') return null;
  if (!validateSnapshot(parsed.snapshot) || (parsed.query !== undefined && !validateQueryState(parsed.query))) return null;
  if (options.expectedFullPath !== undefined && parsed.snapshot.fullPath !== options.expectedFullPath) return null;
  const now = options.now?.() ?? Date.now();
  if (parsed.expiresAt !== undefined && (typeof parsed.expiresAt !== 'number' || now > parsed.expiresAt)) return null;
  if (options.maxAge !== undefined && now - parsed.issuedAt > options.maxAge) return null;
  const body = stableStringify(unsignedBody(parsed as unknown as RouteDataPayload));
  if (options.requireSignature && typeof parsed.signature !== 'string') return null;
  if (parsed.signature !== undefined) {
    if (!options.signer || typeof parsed.signature !== 'string') return null;
    if (!(await options.signer.verify(body, parsed.signature))) return null;
  }
  return parsed as unknown as RouteDataPayload;
}
