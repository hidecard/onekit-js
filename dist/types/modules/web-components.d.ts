import { ComponentDefinition } from './component';
interface WebComponentOptions {
    extends?: string;
    observedAttributes?: string[];
}
export declare class OneKitWebComponent extends HTMLElement {
    private componentInstance;
    private componentDef;
    constructor(componentDef: ComponentDefinition, options?: WebComponentOptions);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    static get observedAttributes(): string[];
}
export declare function registerWebComponent(name: string, componentDef: ComponentDefinition, options?: WebComponentOptions): void;
export declare function jsx(tag: string | Function, props: Record<string, unknown> | null, ...children: unknown[]): unknown;
export declare const jsxDEV: typeof jsx;
export declare const Fragment = "fragment";
export {};
