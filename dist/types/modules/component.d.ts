interface ComponentProps {
    [key: string]: unknown;
}
interface ComponentState {
    [key: string]: unknown;
}
export interface ComponentDefinition {
    name?: string;
    props?: ComponentProps;
    data?: () => ComponentState;
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
    update: () => void;
    [key: string]: unknown;
}
export declare function register(name: string, definition: ComponentDefinition): void;
export declare function create(name: string, props?: ComponentProps, slots?: {
    [key: string]: string;
}): ComponentInstance | null;
export declare function mount(component: ComponentInstance | string, target: string | Element | ShadowRoot): ComponentInstance | null;
export declare function getInstance(element: Element): ComponentInstance | undefined;
export declare function destroy(component: ComponentInstance): void;
export {};
