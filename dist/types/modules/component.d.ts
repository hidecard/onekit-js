import { DisposableScope } from '../core/scope';
export interface ComponentProps {
    [key: string]: unknown;
}
export interface ComponentState {
    [key: string]: unknown;
}
export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'symbol';
export interface PropDefinition {
    type?: PropType | PropType[];
    required?: boolean;
    default?: unknown | (() => unknown);
    validator?: (value: unknown) => boolean;
}
export interface ComponentPropsDefinition {
    [key: string]: PropDefinition | PropType;
}
export interface ComponentDefinition {
    name?: string;
    props?: ComponentPropsDefinition;
    data?: () => ComponentState;
    /** Composition-style setup for concise state, methods, and lifecycle registration. */
    setup?: (props: ComponentProps) => ComponentState;
    template?: string;
    render?: (this: ComponentInstance) => string;
    methods?: {
        [key: string]: (...args: unknown[]) => unknown;
    };
    inject?: string[];
    beforeCreate?: (this: ComponentInstance) => void;
    created?: (this: ComponentInstance) => void;
    beforeMount?: (this: ComponentInstance) => void;
    mounted?: (this: ComponentInstance) => void;
    beforeUpdate?: (this: ComponentInstance) => void;
    updated?: (this: ComponentInstance) => void;
    beforeUnmount?: (this: ComponentInstance) => void;
    unmounted?: (this: ComponentInstance) => void;
}
export interface ComponentInstance {
    name: string;
    props: ComponentProps;
    slots: {
        [key: string]: string;
    };
    state: ComponentState;
    element: Element | null;
    mounted: boolean;
    listeners: unknown[];
    scope: DisposableScope;
    componentId: number;
    update: () => void;
    [key: string]: unknown;
}
export declare function defineComponent(definition: ComponentDefinition): ComponentDefinition;
export declare function register(name: string, definition: ComponentDefinition): void;
/** Replace a registered component during HMR while preserving live state and props. */
export declare function hotUpdateComponent(name: string, definition: ComponentDefinition): number;
export declare function create(name: string, props?: ComponentProps, slots?: {
    [key: string]: string;
}): ComponentInstance | null;
export declare function mount(component: ComponentInstance | string, target: string | Element | ShadowRoot): ComponentInstance | null;
export declare const unmount: typeof destroy;
export declare function getInstance(element: Element): ComponentInstance | undefined;
export declare function destroy(component: ComponentInstance): void;
export declare function onMounted(callback: () => void): void;
export declare function onUpdated(callback: () => void): void;
export declare function onDestroyed(callback: () => void): void;
export declare function onPropsChanged(callback: (newProps: ComponentProps, oldProps: ComponentProps) => void): void;
export declare function setupComponent(instance: ComponentInstance, setupFn: (props: ComponentProps) => ComponentState): ComponentState;
