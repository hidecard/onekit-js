import { type VNode } from './modules/vdom';
import { Fragment, h } from './modules/jsx';
export { Fragment };
export type JSXRuntimeProps = Record<string, unknown> & {
    children?: unknown;
};
export declare function jsx(type: string | Function, props: JSXRuntimeProps | null, key?: unknown): VNode;
export declare const jsxs: typeof jsx;
export declare const jsxDEV: typeof jsx;
export { h };
export default jsx;
