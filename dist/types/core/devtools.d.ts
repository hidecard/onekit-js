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
};
export type DevToolsListener = (event: DevToolsEvent) => void;
export interface DevToolsBridge {
    readonly enabled: boolean;
    subscribe(listener: DevToolsListener): () => void;
    dispose(): void;
}
export declare function isDevToolsEnabled(): boolean;
export declare function enableDevTools(): DevToolsBridge;
export declare function onDevToolsEvent(listener: DevToolsListener): () => void;
export declare function getDevToolsTargetId(target: object): number;
export declare function getDevToolsEffectId(effect: Function): number;
export declare function devToolsSnapshot<T>(value: T): T;
export declare function emitDevToolsEvent(event: DevToolsEvent): void;
