// Server-Side Rendering (SSR) Support Module
import { VNode, render as clientRender } from './vdom';

export interface SSRContext {
  head?: string[];
  body?: string[];
  styles?: string[];
  scripts?: string[];
  meta?: Record<string, string>;
}

export interface RenderResult {
  html: string;
  context: SSRContext;
}

type AsyncVNode = VNode | string | PromiseLike<VNode | string>;

// Server-side rendering function
export function renderToString(vnode: VNode | string, context: SSRContext = {}): RenderResult {
  const ctx = { ...context };

  function renderVNode(node: VNode | string): string {
    if (typeof node === 'string') {
      return escapeHtml(node);
    }

    const { tag, props, children } = node;

    // Handle special tags
    if (tag === 'html') {
      return renderHtmlTag(node, ctx);
    }
    if (tag === 'head') {
      return renderHeadTag(node, ctx);
    }
    if (tag === 'body') {
      return renderBodyTag(node, ctx);
    }

    // Handle component rendering (simplified for SSR)
    if (typeof tag === 'function') {
      // For functional components, call them to get vnode
      const componentResult = (tag as Function)(props);
      return renderVNode(componentResult);
    }

    // Regular HTML element
    const attrs = renderAttributes(props);
    const childrenHtml = children.map(renderVNode).join('');

    if (isSelfClosingTag(tag)) {
      return `<${tag}${attrs}>`;
    }

    return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
  }

  const html = renderVNode(vnode);

  return {
    html,
    context: ctx
  };
}

// Render HTML document structure
function renderHtmlTag(node: VNode, context: SSRContext): string {
  const { children } = node;
  const attrs = renderAttributes(node.props);

  let headContent = '';
  let bodyContent = '';

  children.forEach(child => {
    if (typeof child === 'string') {
      bodyContent += escapeHtml(child);
    } else if (child.tag === 'head') {
      headContent = renderHeadTag(child, context);
    } else if (child.tag === 'body') {
      bodyContent = renderBodyTag(child, context);
    } else {
      bodyContent += renderVNode(child, context);
    }
  });

  return `<!DOCTYPE html>
<html${attrs}>
${headContent}
${bodyContent}
</html>`;
}

function renderVNode(node: VNode | string, context: SSRContext = createSSRContext()): string {
  if (typeof node === 'string') {
    return escapeHtml(node);
  }

  const { tag, props, children } = node;

  // Handle special tags
  if (tag === 'html') {
    return renderHtmlTag(node, context);
  }
  if (tag === 'head') {
    return renderHeadTag(node, context);
  }
  if (tag === 'body') {
    return renderBodyTag(node, context);
  }

  // Handle component rendering (simplified for SSR)
  if (typeof tag === 'function') {
    // For functional components, call them to get vnode
    const componentResult = (tag as Function)(props);
    return renderVNode(componentResult, context);
  }

  // Regular HTML element
  const attrs = renderAttributes(props);
  const childrenHtml = children.map(child => renderVNode(child, context)).join('');

  if (isSelfClosingTag(tag)) {
    return `<${tag}${attrs}>`;
  }

  return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
}

function renderHeadTag(node: VNode, context: SSRContext): string {
  const { children } = node;
  const attrs = renderAttributes(node.props);

  let content = '';

  children.forEach(child => {
    if (typeof child === 'string') {
      content += escapeHtml(child);
    } else {
      content += renderVNode(child, context);
    }
  });

  // Add context head content
  if (context.head) {
    content += context.head.join('\n');
  }

  // Add meta tags from context
  if (context.meta) {
    Object.entries(context.meta).forEach(([name, value]) => {
      content += `<meta name="${escapeHtml(name)}" content="${escapeHtml(value)}">\n`;
    });
  }

  return `<head${attrs}>${content}</head>`;
}

function renderBodyTag(node: VNode, context: SSRContext): string {
  const { children } = node;
  const attrs = renderAttributes(node.props);

  let content = '';

  children.forEach(child => {
    if (typeof child === 'string') {
      content += escapeHtml(child);
    } else {
      content += renderVNode(child, context);
    }
  });

  // Add context body content
  if (context.body) {
    content += context.body.join('\n');
  }

  return `<body${attrs}>${content}</body>`;
}

function renderAttributes(props: Record<string, unknown>): string {
  const attrs: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === 'key' || key === 'children') continue;

    if (key === 'className') {
      attrs.push(`class="${escapeHtml(String(value))}"`);
    } else if (key === 'style' && typeof value === 'object') {
      const styleStr = Object.entries(value as Record<string, string>)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      attrs.push(`style="${escapeHtml(styleStr)}"`);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Skip event handlers for SSR
      continue;
    } else if (typeof value === 'boolean') {
      if (value) attrs.push(key);
    } else if (value !== null && value !== undefined) {
      attrs.push(`${key}="${escapeHtml(String(value))}"`);
    }
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

function isSelfClosingTag(tag: string): boolean {
  const selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  return selfClosingTags.has(tag);
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

export interface HydrationMismatch {
  path: string;
  kind: 'tag' | 'text' | 'missing' | 'unexpected';
  expected: string;
  actual: string;
}

export interface HydrationResult {
  mismatches: HydrationMismatch[];
  dispose: () => void;
}

// Hydration attaches client behavior without rewriting server-rendered DOM.
// It reports parity problems so applications can fail loudly in development.
export function hydrate(rootElement: Element, vnode: VNode): HydrationResult {
  const mismatches: HydrationMismatch[] = [];
  const cleanups: Array<() => void> = [];
  walkAndHydrate(rootElement, vnode, 'root', mismatches, cleanups);

  return {
    mismatches,
    dispose: () => {
      while (cleanups.length > 0) cleanups.pop()?.();
    },
  };
}

function walkAndHydrate(
  element: Element,
  vnode: VNode,
  path: string,
  mismatches: HydrationMismatch[],
  cleanups: Array<() => void>,
): void {
  if (typeof vnode.tag === 'function') {
    const resolved = (vnode.tag as Function)(vnode.props) as VNode;
    walkAndHydrate(element, resolved, path, mismatches, cleanups);
    return;
  }

  if (vnode.tag !== 'fragment' && element.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
    mismatches.push({
      path,
      kind: 'tag',
      expected: vnode.tag,
      actual: element.tagName.toLowerCase(),
    });
  }

  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      const listener = value as EventListener;
      element.addEventListener(eventName, listener);
      cleanups.push(() => element.removeEventListener(eventName, listener));
    }
  }

  (element as Element & { _vnode?: VNode })._vnode = vnode;

  const childNodes = Array.from(element.childNodes).filter(node =>
    !(node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === ''),
  );
  vnode.children.forEach((child, index) => {
    const domChild = childNodes[index];
    const childPath = `${path}.${index}`;

    if (!domChild) {
      mismatches.push({
        path: childPath,
        kind: 'missing',
        expected: typeof child === 'string' ? child : String(child.tag),
        actual: 'missing',
      });
      return;
    }

    if (typeof child === 'string') {
      if (domChild.nodeType !== Node.TEXT_NODE || domChild.textContent !== child) {
        mismatches.push({
          path: childPath,
          kind: 'text',
          expected: child,
          actual: domChild.textContent || '',
        });
      }
      return;
    }

    if (domChild.nodeType !== Node.ELEMENT_NODE) {
      mismatches.push({
        path: childPath,
        kind: 'tag',
        expected: String(child.tag),
        actual: '#text',
      });
      return;
    }

    walkAndHydrate(domChild as Element, child, childPath, mismatches, cleanups);
  });

  if (childNodes.length > vnode.children.length) {
    for (let index = vnode.children.length; index < childNodes.length; index += 1) {
      mismatches.push({
        path: `${path}.${index}`,
        kind: 'unexpected',
        expected: 'none',
        actual: childNodes[index].textContent || childNodes[index].nodeName.toLowerCase(),
      });
    }
  }
}

// Streaming SSR utilities
function createSSRAbortError(): Error {
  const error = new Error('SSR stream aborted');
  error.name = 'AbortError';
  return error;
}

export class StreamingRenderer {
  private context: SSRContext;
  private chunks: string[] = [];
  private isComplete = false;

  constructor(context: SSRContext = {}) {
    this.context = context;
  }

  async renderToStream(vnode: AsyncVNode, options: { signal?: AbortSignal } = {}): Promise<ReadableStream<string>> {
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();
    let terminated = false;
    const abortStream = async (error: unknown): Promise<void> => {
      if (terminated) return;
      terminated = true;
      try {
        await writer.abort(error);
      } catch {
        // A consumer may cancel the readable side first; preserve the original error.
      }
    };
    const onAbort = () => { void abortStream(createSSRAbortError()); };

    if (options.signal) {
      if (options.signal.aborted) onAbort();
      else options.signal.addEventListener('abort', onAbort, { once: true });
    }

    this.renderAsync(vnode, writer, options.signal, abortStream, () => { terminated = true; })
      .catch(error => {
        if (!(error instanceof Error && error.name === 'AbortError')) console.error('SSR streaming error:', error);
        return abortStream(error);
      })
      .finally(() => options.signal?.removeEventListener('abort', onAbort));

    return readable;
  }

  private async renderAsync(
    vnode: AsyncVNode,
    writer: WritableStreamDefaultWriter<string>,
    signal: AbortSignal | undefined,
    abortStream: (error: unknown) => Promise<void>,
    markComplete: () => void,
  ): Promise<void> {
    try {
      if (signal?.aborted) throw createSSRAbortError();
      await writer.write('<!DOCTYPE html>\n');
      if (typeof vnode === 'string') {
        await writer.write(escapeHtml(vnode));
      } else {
        await this.renderVNodeAsync(vnode, writer, signal);
      }
      await writer.close();
      markComplete();
      this.isComplete = true;
    } catch (error) {
      await abortStream(error);
      throw error;
    }
  }

  private async renderVNodeAsync(vnode: AsyncVNode, writer: WritableStreamDefaultWriter<string>, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw createSSRAbortError();
    const resolved = await vnode;
    if (typeof resolved === 'string') {
      await writer.write(escapeHtml(resolved));
      return;
    }
    const { tag, props, children } = resolved;

    // Handle async components
    if (typeof tag === 'function') {
      const componentResult = await (tag as Function)(props);
      return this.renderVNodeAsync(componentResult, writer, signal);
    }

    const attrs = renderAttributes(props);
    const tagHtml = `<${tag}${attrs}>`;

    await writer.write(tagHtml);

    // Render children
    for (const child of children) {
      if (typeof child === 'string') {
        await writer.write(escapeHtml(child));
      } else {
        await this.renderVNodeAsync(child, writer, signal);
      }
    }

    if (!isSelfClosingTag(tag)) {
      await writer.write(`</${tag}>`);
    }
  }

  getContext(): SSRContext {
    return { ...this.context };
  }
}

// SSR utilities and helpers
export function createSSRContext(): SSRContext {
  return {
    head: [],
    body: [],
    styles: [],
    scripts: [],
    meta: {}
  };
}

export function addToHead(context: SSRContext, content: string): void {
  if (!context.head) context.head = [];
  context.head.push(content);
}

export function addToBody(context: SSRContext, content: string): void {
  if (!context.body) context.body = [];
  context.body.push(content);
}

export function addStyle(context: SSRContext, css: string): void {
  if (!context.styles) context.styles = [];
  context.styles.push(css);
}

export function addScript(context: SSRContext, src?: string, content?: string): void {
  if (!context.scripts) context.scripts = [];
  if (src) {
    context.scripts.push(`<script src="${escapeHtml(src)}"></script>`);
  } else if (content) {
    context.scripts.push(`<script>${content}</script>`);
  }
}

export function setMeta(context: SSRContext, name: string, content: string): void {
  if (!context.meta) context.meta = {};
  context.meta[name] = content;
}

// Preload utilities for performance
export function preloadModule(href: string): string {
  return `<link rel="modulepreload" href="${escapeHtml(href)}">`;
}

export function preloadStyle(href: string): string {
  return `<link rel="preload" href="${escapeHtml(href)}" as="style">`;
}

export function preloadScript(href: string): string {
  return `<link rel="preload" href="${escapeHtml(href)}" as="script">`;
}

// SEO utilities
export function renderTitle(title: string): string {
  return `<title>${escapeHtml(title)}</title>`;
}

export function renderMeta(name: string, content: string): string {
  return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

export function renderOpenGraph(property: string, content: string): string {
  return `<meta property="og:${escapeHtml(property)}" content="${escapeHtml(content)}">`;
}

// Development helpers
export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

// Cache for rendered components
const ssrCache = new Map<string, RenderResult>();

export function withCache<T extends VNode | string>(
  key: string,
  renderFn: () => T,
  ttl: number = 300000 // 5 minutes
): T {
  const cached = ssrCache.get(key);
  if (cached && Date.now() - (cached as any)._timestamp < ttl) {
    return cached.html as unknown as T;
  }

  const result = renderFn();
  const renderResult = renderToString(result);
  (renderResult as any)._timestamp = Date.now();
  ssrCache.set(key, renderResult);

  return result;
}
