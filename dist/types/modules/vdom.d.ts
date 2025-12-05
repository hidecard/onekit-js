export interface VNodeProps {
    [key: string]: unknown;
}
export interface VNode {
    tag: string;
    props: VNodeProps;
    children: (VNode | string)[];
    key?: string;
}
export declare function createElement(tag: string, props?: VNodeProps, ...children: (VNode | string)[]): VNode;
export declare function render(vnode: VNode | string): Element | Text;
export declare function patch(parent: Element, newVNode: VNode | string, oldVNode?: VNode | string): void;
