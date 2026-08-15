interface ReactiveObject {
    [key: string]: unknown;
}
interface ComputedRef<T = unknown> {
    readonly value: T;
    readonly __isComputed: true;
}
interface EffectFn {
    (): void;
    deps: Set<EffectFn>[];
    options?: EffectOptions;
    stopped?: boolean;
}
interface EffectOptions {
    lazy?: boolean;
    scheduler?: (fn: EffectFn) => void;
}
export declare function reactive<T extends object>(obj: T): T;
export declare function computed<T>(getter: () => T): ComputedRef<T>;
export declare function effect(fn: () => void, options?: EffectOptions): () => void;
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
