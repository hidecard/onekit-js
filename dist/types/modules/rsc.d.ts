export declare const ONEKIT_RSC_PROTOCOL_VERSION: 1;
export interface RSCClientReference {
    readonly $$typeof: 'onekit.client.reference';
    readonly moduleId: string;
    readonly exportName: string;
}
export type RSCSerializable = string | number | boolean | null | RSCClientReference | readonly RSCSerializable[] | {
    readonly [key: string]: RSCSerializable;
};
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
export declare function createRSCClientReference(moduleId: string, exportName?: string): RSCClientReference;
export declare function createRSCFlightRecord(id: string, value: RSCSerializable, type?: RSCFlightRecord['type']): RSCFlightRecord;
/** Serialize bounded, JSON-compatible Flight-like records as newline-delimited transport chunks. */
export declare function encodeRSCFlight(records: readonly RSCFlightRecord[], options?: RSCFlightOptions): string;
/** Parse and validate Flight-like chunks. Invalid or unsafe payloads fail closed with `null`. */
export declare function decodeRSCFlight(payload: string, options?: RSCFlightOptions): readonly RSCFlightRecord[] | null;
export type RSCClientReferenceResolver = (reference: RSCClientReference) => unknown | Promise<unknown>;
/** Resolve client references explicitly; this does not import, execute, or render components automatically. */
export declare function resolveRSCFlight(records: readonly RSCFlightRecord[], resolver: RSCClientReferenceResolver): Promise<readonly {
    id: string;
    type: RSCFlightRecord['type'];
    value: unknown;
}[]>;
export interface RSCFlightStreamOptions extends RSCFlightOptions {
    signal?: AbortSignal;
}
/** Produce protocol chunks progressively without making the browser bundle depend on a server transport. */
export declare function createRSCFlightStream(records: readonly RSCFlightRecord[], options?: RSCFlightStreamOptions): ReadableStream<string>;
