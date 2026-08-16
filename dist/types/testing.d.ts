/**
 * OneKit testing helpers.
 *
 * These small DOM-first utilities provide a stable foundation for component
 * tests without coupling applications to the internal renderer bookkeeping.
 */
import { type VNode } from './modules/vdom';
export type TestNode = VNode | string;
export interface TestingRenderResult {
    container: HTMLElement;
    node: Node | null;
    rerender(next: TestNode): void;
    unmount(): void;
}
export declare function renderTest(node: TestNode, container?: HTMLElement): TestingRenderResult;
export declare function cleanup(): void;
export declare function fireEvent<K extends keyof HTMLElementEventMap>(target: EventTarget, type: K, init?: EventInit & Partial<HTMLElementEventMap[K]>): boolean;
export declare function flush(): Promise<void>;
export declare function waitFor<T>(callback: () => T, options?: {
    timeout?: number;
    interval?: number;
}): Promise<T>;
