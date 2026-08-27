import type { DehydratedQueryState, QueryClient } from './query';
import type { RouteDataSnapshot, Router } from './router';
export type RouteDataTransportValue = null | boolean | number | string | RouteDataTransportValue[] | {
    [key: string]: RouteDataTransportValue;
};
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
export type RouteDataTransportErrorCode = 'invalid-input' | 'unsupported-value' | 'too-deep' | 'too-large' | 'expired' | 'invalid-envelope' | 'route-mismatch' | 'signature-required' | 'signature-invalid';
export declare class RouteDataTransportError extends Error {
    readonly code: RouteDataTransportErrorCode;
    constructor(code: RouteDataTransportErrorCode, message: string);
}
/** Create a standards-based HMAC-SHA-256 adapter using Web Crypto. */
export declare function createHmacSha256Signer(secret: string | Uint8Array | CryptoKey): Promise<RouteDataTransportSigner>;
/** Serialize a route/query handoff into a bounded, optionally signed envelope. */
export declare function createRouteDataPayload(snapshot: RouteDataSnapshot, options?: RouteDataTransportOptions, query?: DehydratedQueryState): Promise<string>;
/** Apply a previously validated payload to the existing router/query hydration APIs. */
export declare function applyRouteDataPayload(payload: RouteDataPayload, router: Pick<Router, 'hydrate'>, queryClient?: Pick<QueryClient, 'hydrate'>): void;
/** Parse and validate a route/query handoff. Invalid data is rejected with no usable payload. */
export declare function parseRouteDataPayload(input: string | unknown, options?: RouteDataTransportOptions): Promise<RouteDataPayload | null>;
