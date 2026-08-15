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
      bodyContent += renderVNode(child);
    }
  });

  return `<!DOCTYPE html>
<html${attrs}>
${headContent}
${bodyContent}
</html>`;
}

function renderVNode(node: VNode | string): string {
  if (typeof node === 'string') {
    return escapeHtml(node);
  }

  const { tag, props, children } = node;

  // Handle special tags
  if (tag === 'html') {
    return renderHtmlTag(node, { head: [], body: [], styles: [], scripts: [], meta: {} });
  }
  if (tag === 'head') {
    return renderHeadTag(node, { head: [], body: [], styles: [], scripts: [], meta: {} });
  }
  if (tag === 'body') {
    return renderBodyTag(node, { head: [], body: [], styles: [], scripts: [], meta: {} });
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

function renderHeadTag(node: VNode, context: SSRContext): string {
  const { children } = node;
  const attrs = renderAttributes(node.props);

  let content = '';

  children.forEach(child => {
    if (typeof child === 'string') {
      content += escapeHtml(child);
    } else {
      content += renderVNode(child);
    }
  });

  // Add context head content
  if (context.head) {
    content += context.head.join('\n');
  }

  // Add meta tags from context
  if (context.meta) {
    Object.entries(context.meta).forEach(([name, content]) => {
      content += `<meta name="${name}" content="${escapeHtml(content)}">\n`;
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
      content += renderVNode(child);
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
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

// Hydration for client-side activation
export function hydrate(rootElement: Element, vnode: VNode): void {
  // Walk the DOM and attach event listeners
  walkAndHydrate(rootElement, vnode);
}

function walkAndHydrate(element: Element, vnode: VNode): void {
  // Attach event listeners from vnode props
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value as EventListener);
    }
  }

  // Store vnode reference for future patches
  (element as any)._vnode = vnode;

  // Walk children
  const childNodes = Array.from(element.childNodes);
  let childIndex = 0;

  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      // Skip text nodes for hydration
      while (childIndex < childNodes.length && childNodes[childIndex].nodeType !== Node.TEXT_NODE) {
        childIndex++;
      }
      if (childIndex < childNodes.length) {
        childIndex++;
      }
    } else {
      // Find corresponding element node
      while (childIndex < childNodes.length && childNodes[childIndex].nodeType !== Node.ELEMENT_NODE) {
        childIndex++;
      }
      if (childIndex < childNodes.length) {
        walkAndHydrate(childNodes[childIndex] as Element, child);
        childIndex++;
      }
    }
  });
}

// Streaming SSR utilities
export class StreamingRenderer {
  private context: SSRContext;
  private chunks: string[] = [];
  private isComplete = false;

  constructor(context: SSRContext = {}) {
    this.context = context;
  }

  async renderToStream(vnode: VNode | string): Promise<ReadableStream<string>> {
    const { readable, writable } = new TransformStream<string, string>();

    this.renderAsync(vnode, writable.getWriter()).catch(error => {
      console.error('SSR streaming error:', error);
      writable.abort(error);
    });

    return readable;
  }

  private async renderAsync(vnode: VNode | string, writer: WritableStreamDefaultWriter<string>): Promise<void> {
    try {
      // Start HTML document
      await writer.write('<!DOCTYPE html>\n');

      if (typeof vnode === 'string') {
        await writer.write(escapeHtml(vnode));
      } else {
        await this.renderVNodeAsync(vnode, writer);
      }

      await writer.close();
      this.isComplete = true;
    } catch (error) {
      await writer.abort(error);
      throw error;
    }
  }

  private async renderVNodeAsync(vnode: VNode, writer: WritableStreamDefaultWriter<string>): Promise<void> {
    const { tag, props, children } = vnode;

    // Handle async components
    if (typeof tag === 'function') {
      const componentResult = await (tag as Function)(props);
      return this.renderVNodeAsync(componentResult, writer);
    }

    const attrs = renderAttributes(props);
    const tagHtml = `<${tag}${attrs}>`;

    await writer.write(tagHtml);

    // Render children
    for (const child of children) {
      if (typeof child === 'string') {
        await writer.write(escapeHtml(child));
      } else {
        await this.renderVNodeAsync(child, writer);
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
