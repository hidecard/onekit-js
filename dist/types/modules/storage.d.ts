interface StorageOptions {
    prefix?: string;
    serialize?: (value: any) => string;
    deserialize?: (value: string) => any;
    ttl?: number;
}
declare class Storage {
    private storage;
    private options;
    constructor(storage: globalThis.Storage, options?: StorageOptions);
    private getKey;
    private isExpired;
    set<T>(key: string, value: T): boolean;
    get(key: string, defaultValue?: any): any;
    remove(key: string): boolean;
    clear(): boolean;
    has(key: string): boolean;
    keys(): string[];
    size(): number;
}
export declare const localStorage: Storage;
export declare const sessionStorage: Storage;
export declare function createStorage(storage: globalThis.Storage, options?: StorageOptions): Storage;
export declare const cache: Storage;
export {};
