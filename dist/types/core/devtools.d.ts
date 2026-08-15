export type DevToolsEvent = {
    type: 'reactive:trigger';
    targetId: number;
    key: string;
    oldValue: unknown;
    newValue: unknown;
} | {
    type: 'reactive:effect';
    effectId: number;
    phase: 'run' | 'stop';
} | {
    type: 'router:navigation';
    phase: 'start' | 'success' | 'cancel' | 'error';
    to: string;
    from: string | null;
    route?: string;
    error?: unknown;
} | {
    type: 'component:lifecycle';
    componentId: number;
    name: string;
    phase: 'create' | 'mount' | 'update' | 'unmount';
} | {
    type: 'store:lifecycle';
    storeId: string;
    phase: 'create' | 'subscribe' | 'unsubscribe' | 'remove';
    listenerCount?: number;
} | {
    type: 'scope:lifecycle';
    scopeId: number;
    phase: 'create' | 'dispose';
};
export type DevToolsListener = (event: DevToolsEvent) => void;
export interface DevToolsOptions {
    historySize?: number;
    installGlobal?: boolean;
    globalName?: string;
}
export interface DevToolsMetadata {
    enabled: boolean;
    historySize: number;
    eventCount: number;
    listenerCount: number;
}
export interface DevToolsBridge {
    readonly enabled: boolean;
    subscribe(listener: DevToolsListener): () => void;
    getHistory(): readonly DevToolsEvent[];
    clearHistory(): void;
    getMetadata(): DevToolsMetadata;
    getInspectors(): Record<string, unknown>;
    dispose(): void;
}
export declare function isDevToolsEnabled(): boolean;
export declare function enableDevTools(options?: DevToolsOptions): DevToolsBridge;
export declare function onDevToolsEvent(listener: DevToolsListener): () => void;
export declare function getDevToolsTargetId(target: object): number;
export declare function getDevToolsScopeId(scope: object): number;
export declare function registerDevToolsInspector(name: string, provider: () => unknown): () => void;
export declare function getDevToolsEffectId(effect: Function): number;
export declare function devToolsSnapshot<T>(value: T, seen?: WeakMap<object, unknown>): T;
export declare function emitDevToolsEvent(event: DevToolsEvent): void;
