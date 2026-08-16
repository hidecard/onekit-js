import { ComponentDefinition } from './component';
interface WebComponentOptions {
    extends?: string;
    observedAttributes?: string[];
}
declare const HTMLElementBase: any;
export declare class OneKitWebComponent extends HTMLElementBase {
    private componentInstance;
    constructor(componentDef: ComponentDefinition, _options?: WebComponentOptions);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    static get observedAttributes(): string[];
}
export declare function registerWebComponent(name: string, componentDef: ComponentDefinition, options?: WebComponentOptions): void;
export declare function jsx(tag: string | Function, props: Record<string, unknown> | null, ...children: unknown[]): unknown;
export declare const jsxDEV: typeof jsx;
export declare const Fragment = "fragment";
export {};
