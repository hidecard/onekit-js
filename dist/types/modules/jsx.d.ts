import { VNode } from './vdom';
import { ComponentDefinition } from './component';
export interface OKJSElement {
    tag: string | Function;
    props: Record<string, unknown>;
    children: (OKJSElement | string | number | boolean | null | undefined)[];
}
export declare function okjs(template: TemplateStringsArray, ...values: unknown[]): OKJSElement | VNode;
export declare const Fragment = "fragment";
export declare function component(definition: ComponentDefinition): Function;
export { okjs as jsx, okjs as jsxDEV, okjs as h };
