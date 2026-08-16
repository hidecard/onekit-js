interface ReactiveObject {
    [key: string]: unknown;
}
export interface ComputedRef<T = unknown> {
    readonly value: T;
    readonly __isComputed: true;
}
type EffectCleanup = () => void;
type RegisterCleanup = (cleanup: EffectCleanup) => void;
interface EffectFn {
    (): void;
    deps: Set<EffectFn>[];
    cleanups: EffectCleanup[];
    options?: EffectOptions;
    stopped?: boolean;
}
export interface EffectOptions {
    lazy?: boolean;
    scheduler?: (fn: EffectFn) => void;
}
export declare function reactive<T extends object>(obj: T): T;
export declare function computed<T>(getter: () => T): ComputedRef<T>;
export declare function effect(fn: (onCleanup?: RegisterCleanup) => void, options?: EffectOptions): () => void;
export declare function stop(runner: () => void): void;
export declare const autorun: typeof effect;
export declare function watch(source: string | symbol | object | (() => unknown), callback: (newValue: unknown, oldValue: unknown, property?: string | symbol) => void, options?: {
    deep?: boolean;
    immediate?: boolean;
}): () => void;
export declare function batch<T>(fn: () => T): T;
export declare function nextTick<T = void>(callback?: () => T): Promise<T | void>;
export declare function snapshot<T extends object>(obj: T): T;
export declare function bind(element: string | Element, reactiveObj: ReactiveObject, property: string, attribute?: string): void;
export {};
