export interface VNodeProps {
    [key: string]: unknown;
}
export interface VNode {
    tag: string | Function;
    props: VNodeProps;
    children: (VNode | string)[];
    key?: string | number;
}
type RenderNode = Element | Text | DocumentFragment;
export declare function createElement(tag: string | Function, props?: VNodeProps, ...children: unknown[]): VNode;
export declare function render(vnode: VNode | string): RenderNode;
export declare function patch(parent: Element, newVNode: VNode | string, oldVNode?: VNode | string): void;
export {};
