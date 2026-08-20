import { DisposableScope } from '../core/scope';
import type { VNode } from './vdom';
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
export type SlotValue = string | VNode | SlotValue[] | (() => SlotValue | SlotValue[]);
export interface ComponentDefinition {
    name?: string;
    props?: ComponentPropsDefinition;
    data?: () => ComponentState;
    /** Composition-style setup for concise state, methods, and lifecycle registration. */
    setup?: (props: ComponentProps) => ComponentState;
    template?: string;
    render?: (this: ComponentInstance) => string | VNode;
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
        [key: string]: SlotValue;
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
export interface StatefulComponentFactory {
    (props?: ComponentProps): ComponentInstance | null;
    __onekitStateful?: true;
    __onekitName?: string;
}
export declare function defineComponent(definition: ComponentDefinition): ComponentDefinition;
/** Resolve a named slot while preserving VNode, text, array, and lazy slot values. */
export declare function resolveSlot(instance: ComponentInstance, name?: string, fallback?: SlotValue): SlotValue;
export declare function register(name: string, definition: ComponentDefinition): void;
/** Replace a registered component during HMR while preserving live state and props. */
export declare function hotUpdateComponent(name: string, definition: ComponentDefinition): number;
/** Normalize explicit and JSX-style named children into predictable slot values. */
export declare function normalizeSlots(props?: ComponentProps, explicit?: {
    [key: string]: SlotValue;
}): {
    [key: string]: SlotValue;
};
export declare function create(name: string, props?: ComponentProps, slots?: {
    [key: string]: SlotValue;
}): ComponentInstance | null;
export declare function activate(component: ComponentInstance): void;
/** Bind a newly-created instance to an existing server-rendered root without replacing it. */
export declare function bindHydratedComponent(component: ComponentInstance, element: Element, slots?: {
    [key: string]: SlotValue;
}): ComponentInstance;
/** Release a hydrated instance while preserving the DOM tree owned by the caller. */
export declare function unbindHydratedComponent(component: ComponentInstance): void;
export declare function updateComponentProps(component: ComponentInstance, nextProps: ComponentProps): Element | null;
export declare function mount(component: ComponentInstance | string, target: string | Element | ShadowRoot): ComponentInstance | null;
export declare const unmount: typeof destroy;
export declare function getInstance(element: Element): ComponentInstance | undefined;
export declare function destroy(component: ComponentInstance): void;
export declare function onMounted(callback: () => void): void;
export declare function onUpdated(callback: () => void): void;
export declare function onDestroyed(callback: () => void): void;
export declare function onPropsChanged(callback: (newProps: ComponentProps, oldProps: ComponentProps) => void): void;
export declare function setupComponent(instance: ComponentInstance, setupFn: (props: ComponentProps) => ComponentState): ComponentState;
