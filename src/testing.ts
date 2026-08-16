/**
 * OneKit testing helpers.
 *
 * These small DOM-first utilities provide a stable foundation for component
 * tests without coupling applications to the internal renderer bookkeeping.
 */
import { render, type VNode } from './modules/vdom';

export type TestNode = VNode | string;

export interface TestingRenderResult {
  container: HTMLElement;
  node: Node | null;
  rerender(next: TestNode): void;
  unmount(): void;
}

const mountedContainers = new Set<HTMLElement>();

export function renderTest(node: TestNode, container: HTMLElement = document.createElement('div')): TestingRenderResult {
  let mounted: Node | null = null;
  container.replaceChildren();
  mountedContainers.add(container);

  const mount = (next: TestNode): void => {
    container.replaceChildren();
    const created = render(next);
    container.appendChild(created);
    mounted = created;
  };

  mount(node);

  return {
    container,
    get node(): Node | null { return mounted; },
    rerender(next: TestNode): void { mount(next); },
    unmount(): void {
      container.replaceChildren();
      mounted = null;
      mountedContainers.delete(container);
    },
  };
}

export function cleanup(): void {
  for (const container of mountedContainers) container.replaceChildren();
  mountedContainers.clear();
}

export function fireEvent<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K,
  init: EventInit & Partial<HTMLElementEventMap[K]> = {},
): boolean {
  return target.dispatchEvent(new Event(type, { bubbles: true, cancelable: true, ...init }));
}

export function flush(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve));
}

export async function waitFor<T>(
  callback: () => T,
  options: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const timeout = options.timeout ?? 1000;
  const interval = options.interval ?? 10;
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started <= timeout) {
    try {
      return callback();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`waitFor timed out after ${timeout}ms`);
}

