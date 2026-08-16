import { EffectOptions } from './reactive';
import { ComponentDefinition, ComponentInstance, ComponentProps } from './component';
export interface StateRef<T> {
    value: T;
    readonly __isStateRef: true;
}
/**
 * Create reactive state. Objects and arrays are returned as reactive proxies;
 * primitive values use a small `.value` ref, matching the explicit V3 contract.
 */
export declare function state<T extends object>(initial: T): T;
export declare function state<T>(initial: T): StateRef<T>;
/** Create a cached, dependency-tracked derived value. */
export declare function derive<T>(getter: () => T): import("./reactive").ComputedRef<T>;
/** Create a reactive side effect with a familiar beginner-facing name. */
export declare function watchEffect(fn: () => void, options?: EffectOptions): () => void;
export interface AppInstance {
    readonly definition: ComponentDefinition;
    readonly component: ComponentDefinition;
    mount(target: string | Element | ShadowRoot, props?: ComponentProps): ComponentInstance | null;
    unmount(): void;
}
/**
 * Mount a component definition directly without manually registering a name.
 * The old register/create/mount APIs remain available for advanced use cases.
 */
export declare function createApp(definition: ComponentDefinition): AppInstance;
