export const ONEKIT_RSC_PROTOCOL_VERSION = 1 as const;

export interface RSCClientReference {
  readonly $$typeof: 'onekit.client.reference';
  readonly moduleId: string;
  readonly exportName: string;
}

export type RSCSerializable = string | number | boolean | null | RSCClientReference | readonly RSCSerializable[] | { readonly [key: string]: RSCSerializable };

export interface RSCFlightRecord {
  readonly id: string;
  readonly type: 'model' | 'client-reference';
  readonly value: RSCSerializable;
}

export interface RSCFlightOptions {
  maxBytes?: number;
  maxDepth?: number;
  maxRecords?: number;
}

const DEFAULT_MAX_BYTES = 256 * 1024;
const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_RECORDS = 1_024;
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainRecord(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isClientReference(value: unknown): value is RSCClientReference {
  if (!value || typeof value !== 'object' || !isPlainRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.$$typeof === 'onekit.client.reference'
    && typeof candidate.moduleId === 'string'
    && candidate.moduleId.length > 0
    && typeof candidate.exportName === 'string'
    && candidate.exportName.length > 0;
}

function sanitize(value: unknown, depth: number, options: Required<RSCFlightOptions>, seen: Set<object>): RSCSerializable {
  if (depth > options.maxDepth) throw new RangeError('RSC model exceeds the maximum nesting depth');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    if (typeof value === 'string' && value.length > options.maxBytes) throw new RangeError('RSC string exceeds the maximum length');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('RSC model contains a non-finite number');
    return value;
  }
  if (isClientReference(value)) return { ...value };
  if (typeof value !== 'object' || !isPlainRecord(value) && !Array.isArray(value)) {
    throw new TypeError('RSC model contains a non-serializable value');
  }
  if (seen.has(value)) throw new TypeError('RSC model contains a cyclic reference');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1, options, seen));
    const output: Record<string, RSCSerializable> = Object.create(null) as Record<string, RSCSerializable>;
    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) throw new TypeError(`RSC model contains a blocked key: ${key}`);
      output[key] = sanitize(item, depth + 1, options, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function optionsWithDefaults(options: RSCFlightOptions = {}): Required<RSCFlightOptions> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new RangeError('RSC maxBytes must be a positive integer');
  if (!Number.isInteger(maxDepth) || maxDepth < 0) throw new RangeError('RSC maxDepth must be a non-negative integer');
  if (!Number.isInteger(maxRecords) || maxRecords < 1) throw new RangeError('RSC maxRecords must be a positive integer');
  return { maxBytes, maxDepth, maxRecords };
}

export function createRSCClientReference(moduleId: string, exportName = 'default'): RSCClientReference {
  if (!moduleId || !exportName) throw new TypeError('RSC client references require moduleId and exportName');
  return { $$typeof: 'onekit.client.reference', moduleId, exportName };
}

export function createRSCFlightRecord(
  id: string,
  value: RSCSerializable,
  type: RSCFlightRecord['type'] = 'model',
): RSCFlightRecord {
  if (!id) throw new TypeError('RSC flight records require a non-empty id');
  return { id, type, value };
}

/** Serialize bounded, JSON-compatible Flight-like records as newline-delimited transport chunks. */
export function encodeRSCFlight(records: readonly RSCFlightRecord[], options: RSCFlightOptions = {}): string {
  const resolved = optionsWithDefaults(options);
  if (records.length > resolved.maxRecords) throw new RangeError('RSC flight payload exceeds the maximum record count');
  const chunks: string[] = [];
  for (const record of records) {
    const safeRecord = {
      id: record.id,
      type: record.type,
      value: sanitize(record.value, 0, resolved, new Set()),
    };
    const chunk = JSON.stringify({ kind: 'onekit-flight', version: ONEKIT_RSC_PROTOCOL_VERSION, record: safeRecord });
    chunks.push(`${chunk}\n`);
  }
  const payload = chunks.join('');
  if (payload.length > resolved.maxBytes) throw new RangeError('RSC flight payload exceeds the maximum byte length');
  return payload;
}

/** Parse and validate Flight-like chunks. Invalid or unsafe payloads fail closed with `null`. */
export function decodeRSCFlight(payload: string, options: RSCFlightOptions = {}): readonly RSCFlightRecord[] | null {
  try {
    const resolved = optionsWithDefaults(options);
    if (typeof payload !== 'string' || payload.length > resolved.maxBytes) return null;
    const records: RSCFlightRecord[] = [];
    for (const line of payload.split('\n')) {
      if (!line.trim()) continue;
      if (records.length >= resolved.maxRecords) return null;
      const parsed: unknown = JSON.parse(line);
      if (!parsed || typeof parsed !== 'object' || !isPlainRecord(parsed)) return null;
      const envelope = parsed as Record<string, unknown>;
      if (envelope.kind !== 'onekit-flight' || envelope.version !== ONEKIT_RSC_PROTOCOL_VERSION) return null;
      const record = envelope.record;
      if (!record || typeof record !== 'object' || !isPlainRecord(record)) return null;
      const candidate = record as Record<string, unknown>;
      if (typeof candidate.id !== 'string' || (candidate.type !== 'model' && candidate.type !== 'client-reference')) return null;
      const value = sanitize(candidate.value, 0, resolved, new Set());
      records.push({ id: candidate.id, type: candidate.type, value });
    }
    return records;
  } catch {
    return null;
  }
}

export type RSCClientReferenceResolver = (reference: RSCClientReference) => unknown | Promise<unknown>;

async function resolveValue(value: RSCSerializable, resolver: RSCClientReferenceResolver): Promise<unknown> {
  if (isClientReference(value)) return resolver(value);
  if (Array.isArray(value)) return Promise.all(value.map(item => resolveValue(item, resolver)));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, item] of Object.entries(value)) output[key] = await resolveValue(item, resolver);
    return output;
  }
  return value;
}

/** Resolve client references explicitly; this does not import, execute, or render components automatically. */
export async function resolveRSCFlight(
  records: readonly RSCFlightRecord[],
  resolver: RSCClientReferenceResolver,
): Promise<readonly { id: string; type: RSCFlightRecord['type']; value: unknown }[]> {
  return Promise.all(records.map(async record => ({
    id: record.id,
    type: record.type,
    value: await resolveValue(record.value, resolver),
  })));
}

export interface RSCFlightStreamOptions extends RSCFlightOptions {
  signal?: AbortSignal;
}

/** Produce protocol chunks progressively without making the browser bundle depend on a server transport. */
export function createRSCFlightStream(records: readonly RSCFlightRecord[], options: RSCFlightStreamOptions = {}): ReadableStream<string> {
  const payload = encodeRSCFlight(records, options);
  const chunks = payload.split(/(?<=\n)/);
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for (const chunk of chunks) {
          if (options.signal?.aborted) throw options.signal.reason ?? new DOMException('The RSC stream was aborted', 'AbortError');
          controller.enqueue(chunk);
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
