// Server-Side Rendering (SSR) Support Module
import { VNode } from './vdom';
import { isSafeURL, sanitizeStyleValue } from '../core/security';
import { bindHydratedComponent, create as createComponent, unbindHydratedComponent } from './component';

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

type AsyncVNode = VNode | string | PromiseLike<VNode | string> | StreamingBoundary;

export interface StreamingBoundaryOptions {
  id?: string;
}

/** A progressive SSR boundary that sends fallback markup first and resolved markup later. */
export interface StreamingBoundary {
  readonly __onekitStreamingBoundary: true;
  readonly id: string;
  readonly fallback: VNode | string;
  readonly content: AsyncVNode;
}

let streamingBoundaryId = 0;

export function createStreamingBoundary(
  content: AsyncVNode,
  fallback: VNode | string,
  options: StreamingBoundaryOptions = {},
): StreamingBoundary {
  const id = options.id ?? `okjs-boundary-${++streamingBoundaryId}`;
  return { __onekitStreamingBoundary: true, id, fallback, content };
}

function isStreamingBoundary(value: unknown): value is StreamingBoundary {
  return Boolean(value && typeof value === 'object' && (value as StreamingBoundary).__onekitStreamingBoundary === true);
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
        .map(([k, v]) => {
          const safeValue = sanitizeStyleValue(String(v));
          return safeValue ? `${k}:${safeValue}` : '';
        })
        .filter(Boolean)
        .join(';');
      if (styleStr) attrs.push(`style="${escapeHtml(styleStr)}"`);
    } else if (/^on/i.test(key)) {
      // Never serialize event-handler props, including attacker-controlled strings.
      continue;
    } else if (['href', 'src', 'action', 'formaction', 'poster'].includes(key.toLowerCase()) && !isSafeURL(String(value))) {
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
  kind: 'tag' | 'text' | 'missing' | 'unexpected' | 'attribute';
  expected: string;
  actual: string;
}

export interface HydrationOptions {
  /** Receive each mismatch as soon as the hydration walk completes. */
  onMismatch?: (mismatch: HydrationMismatch) => void;
  /** Throw after collecting mismatches instead of continuing silently. */
  throwOnMismatch?: boolean;
}

export class HydrationMismatchError extends Error {
  readonly mismatches: readonly HydrationMismatch[];

  constructor(mismatches: readonly HydrationMismatch[]) {
    super(`Hydration mismatch detected (${mismatches.length} issue${mismatches.length === 1 ? '' : 's'}).`);
    this.name = 'HydrationMismatchError';
    this.mismatches = mismatches;
  }
}

export interface HydrationResult {
  mismatches: HydrationMismatch[];
  hasMismatch: boolean;
  firstMismatch?: HydrationMismatch;
  dispose: () => void;
}

const hydrationBooleanProps = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'inert',
  'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule',
  'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed',
  'selected',
]);

function hydrationAttributeName(key: string): string {
  if (key === 'className') return 'class';
  if (key === 'htmlFor') return 'for';
  return key.toLowerCase();
}

function hydrationStyleValue(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value ?? '');
  return Object.entries(value as Record<string, unknown>)
    .map(([name, styleValue]) => `${name}:${String(styleValue)}`)
    .join(';');
}

function hydrationExpectedAttribute(key: string, value: unknown): string | null {
  if (value == null || value === false) return null;
  if (value === true && hydrationBooleanProps.has(hydrationAttributeName(key))) return '';
  if (key === 'style' && typeof value === 'object') return hydrationStyleValue(value);
  return String(value);
}

// Hydration attaches client behavior without rewriting server-rendered DOM.
// It reports parity problems so applications can fail loudly in development.
export function hydrate(rootElement: Element, vnode: VNode, options: HydrationOptions = {}): HydrationResult {
  const mismatches: HydrationMismatch[] = [];
  const cleanups: Array<() => void> = [];
  walkAndHydrate(rootElement, vnode, 'root', mismatches, cleanups);

  for (const mismatch of mismatches) options.onMismatch?.(mismatch);
  if (options.throwOnMismatch && mismatches.length > 0) {
    while (cleanups.length > 0) cleanups.pop()?.();
    throw new HydrationMismatchError(mismatches);
  }

  return {
    mismatches,
    hasMismatch: mismatches.length > 0,
    firstMismatch: mismatches[0],
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
    const statefulFactory = vnode.tag as Function & { __onekitStateful?: boolean; __onekitName?: string };
    if (statefulFactory.__onekitStateful === true && statefulFactory.__onekitName) {
      const instance = createComponent(statefulFactory.__onekitName, vnode.props);
      if (instance) {
        bindHydratedComponent(instance, element);
        const metadata = element as Element & { _componentVNode?: VNode; _componentInstance?: typeof instance; _vnode?: VNode };
        metadata._componentVNode = vnode;
        metadata._componentInstance = instance;
        metadata._vnode = vnode;
        cleanups.push(() => {
          delete metadata._componentVNode;
          delete metadata._componentInstance;
          delete metadata._vnode;
          unbindHydratedComponent(instance);
        });
      }
      // The instance owns the component root. Its rendered children are already
      // represented by the server DOM, so continue walking the declared VNode
      // only when the factory could not be resolved.
      if (instance) return;
    }

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
    if (key === 'key' || key === 'children' || key === 'ref' || /^on/i.test(key)) continue;
    const attributeName = hydrationAttributeName(key);
    const expected = hydrationExpectedAttribute(key, value);
    const actual = element.getAttribute(attributeName);
    if (expected !== actual) {
      mismatches.push({
        path: `${path}[${attributeName}]`,
        kind: 'attribute',
        expected: expected ?? 'missing',
        actual: actual ?? 'missing',
      });
    }
  }

  const hydrationRef = vnode.props.ref;
  if (typeof hydrationRef === 'function') {
    hydrationRef(element);
    cleanups.push(() => hydrationRef(null));
  } else if (hydrationRef && typeof hydrationRef === 'object') {
    (hydrationRef as { current?: Element | null }).current = element;
    cleanups.push(() => { (hydrationRef as { current?: Element | null }).current = null; });
  }

  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      const listener = value as EventListener;
      element.addEventListener(eventName, listener);
      cleanups.push(() => element.removeEventListener(eventName, listener));
    }
  }

  const vnodeMetadata = element as Element & { _vnode?: VNode };
  vnodeMetadata._vnode = vnode;
  cleanups.push(() => {
    if (vnodeMetadata._vnode === vnode) delete vnodeMetadata._vnode;
  });

  const childNodes = Array.from(element.childNodes);
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
function escapeStreamingScriptData(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function createStreamingPayloadChunk(type: string, id: string, payload: string): string {
  return `<script type="${type}" data-onekit-payload="${escapeHtml(id)}">${escapeStreamingScriptData(payload)}</script>`;
}

function createSSRAbortError(): Error {
  const error = new Error('SSR stream aborted');
  error.name = 'AbortError';
  return error;
}

export type StreamingBoundaryTask = () => Promise<void>;

/** Allows an adapter to control when deferred boundary payloads are rendered. */
export type StreamingBoundaryScheduler = (
  task: StreamingBoundaryTask,
  boundary: StreamingBoundary,
) => Promise<void> | void;

function createBoundedBoundaryScheduler(
  scheduler: StreamingBoundaryScheduler | undefined,
  maxConcurrentBoundaries: number | undefined,
): StreamingBoundaryScheduler | undefined {
  const limit = maxConcurrentBoundaries ?? Infinity;
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) {
    throw new RangeError('maxConcurrentBoundaries must be a positive integer');
  }
  if (!scheduler && limit === Infinity) return undefined;
  const queue: Array<{ task: StreamingBoundaryTask; boundary: StreamingBoundary; resolve: () => void; reject: (error: unknown) => void }> = [];
  let active = 0;
  const runNext = (): void => {
    while (active < limit && queue.length) {
      const item = queue.shift()!;
      active += 1;
      Promise.resolve()
        .then(() => (scheduler ? scheduler(item.task, item.boundary) : item.task()))
        .then(item.resolve, item.reject)
        .finally(() => {
          active -= 1;
          runNext();
        });
    }
  };
  return (task, boundary) => new Promise<void>((resolve, reject) => {
    queue.push({ task, boundary, resolve, reject });
    runNext();
  });
}

export interface StreamingPayloadOptions {
  /** Secure, application-owned route-data envelope emitted as inert JSON script data. */
  routeDataPayload?: string;
  /** Experimental bounded Flight-like records emitted as inert newline-delimited script data. */
  rscPayload?: string;
  routeDataId?: string;
  rscPayloadId?: string;
}

export interface StreamingRenderOptions extends StreamingPayloadOptions {
  signal?: AbortSignal;
  /** Receive the original rendering error before the stream is aborted. */
  onError?: (error: unknown) => void;
  /** Schedule deferred boundary work; defaults to immediate FIFO scheduling. */
  scheduleBoundary?: StreamingBoundaryScheduler;
  /** Maximum number of deferred boundary tasks allowed to run concurrently. */
  maxConcurrentBoundaries?: number;
}

export class StreamingRenderer {
  private context: SSRContext;

  constructor(context: SSRContext = {}) {
    this.context = context;
  }

  async renderToStream(vnode: AsyncVNode, options: StreamingRenderOptions = {}): Promise<ReadableStream<string>> {
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();
    const scheduleBoundary = createBoundedBoundaryScheduler(options.scheduleBoundary, options.maxConcurrentBoundaries);
    let terminated = false;
    let errorReported = false;
    const reportError = (error: unknown): void => {
      if (errorReported) return;
      errorReported = true;
      options.onError?.(error);
    };
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

    this.renderAsync(vnode, writer, options.signal, abortStream, () => { terminated = true; }, reportError, scheduleBoundary, options)
      .catch(error => {
        reportError(error);
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
    reportError: (error: unknown) => void,
    scheduleBoundary?: StreamingBoundaryScheduler,
    payloadOptions: StreamingPayloadOptions = {},
  ): Promise<void> {
    try {
      if (signal?.aborted) throw createSSRAbortError();
      await writer.write('<!DOCTYPE html>\n');
      if (typeof vnode === 'string') {
        await writer.write(escapeHtml(vnode));
      } else {
        const pendingBoundaries: Array<Promise<void>> = [];
        await this.renderVNodeAsync(vnode, writer, signal, pendingBoundaries, scheduleBoundary);
        await Promise.all(pendingBoundaries);
      }
      if (payloadOptions.routeDataPayload !== undefined) {
        await writer.write(createStreamingPayloadChunk('application/json', payloadOptions.routeDataId ?? 'onekit-route-data', payloadOptions.routeDataPayload));
      }
      if (payloadOptions.rscPayload !== undefined) {
        await writer.write(createStreamingPayloadChunk('application/x-onekit-flight', payloadOptions.rscPayloadId ?? 'onekit-rsc-flight', payloadOptions.rscPayload));
      }
      await writer.close();
      markComplete();
    } catch (error) {
      reportError(error);
      await abortStream(error);
      throw error;
    }
  }

  private async renderVNodeAsync(
    vnode: AsyncVNode,
    writer: WritableStreamDefaultWriter<string>,
    signal?: AbortSignal,
    pendingBoundaries: Array<Promise<void>> = [],
    scheduleBoundary: StreamingBoundaryScheduler = (task) => task(),
  ): Promise<void> {
    if (signal?.aborted) throw createSSRAbortError();
    if (isStreamingBoundary(vnode)) {
      await writer.write(`<div data-okjs-boundary="${escapeHtml(vnode.id)}">${await this.renderVNodeToStringAsync(vnode.fallback, signal)}</div>`);
      const task: StreamingBoundaryTask = async () => {
        if (signal?.aborted) throw createSSRAbortError();
        const content = await this.renderVNodeToStringAsync(vnode.content, signal);
        await writer.write(`<template data-okjs-boundary-content="${escapeHtml(vnode.id)}">${content}</template>`);
      };
      pendingBoundaries.push(Promise.resolve(scheduleBoundary(task, vnode)));
      return;
    }
    const resolved = await vnode;
    if (typeof resolved === 'string') {
      await writer.write(escapeHtml(resolved));
      return;
    }
    const { tag, props, children } = resolved;

    // Handle async components
    if (typeof tag === 'function') {
      const componentResult = await (tag as Function)(props);
      return this.renderVNodeAsync(componentResult, writer, signal, pendingBoundaries, scheduleBoundary);
    }

    const attrs = renderAttributes(props);
    const tagHtml = `<${tag}${attrs}>`;

    await writer.write(tagHtml);

    // Render children
    for (const child of children) {
      if (typeof child === 'string') {
        await writer.write(escapeHtml(child));
      } else {
        await this.renderVNodeAsync(child, writer, signal, pendingBoundaries, scheduleBoundary);
      }
    }

    if (!isSelfClosingTag(tag)) {
      await writer.write(`</${tag}>`);
    }
  }

  private async renderVNodeToStringAsync(vnode: AsyncVNode, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw createSSRAbortError();
    if (isStreamingBoundary(vnode)) {
      return this.renderVNodeToStringAsync(vnode.fallback, signal);
    }
    const resolved = await vnode;
    if (typeof resolved === 'string') return escapeHtml(resolved);
    const { tag, props, children } = resolved;
    if (typeof tag === 'function') {
      return this.renderVNodeToStringAsync(await (tag as Function)(props), signal);
    }
    const attrs = renderAttributes(props);
    const childrenHtml = (await Promise.all(children.map(child => this.renderVNodeToStringAsync(child, signal)))).join('');
    if (isSelfClosingTag(tag)) return `<${tag}${attrs}>`;
    return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
  }

  getContext(): SSRContext {
    return { ...this.context };
  }
}

// SSR utilities and helpers
/** Apply a resolved boundary payload emitted by `StreamingRenderer` to a hydrated shell. */
export function resumeStreamingBoundary(root: ParentNode, boundaryId: string, html: string): boolean {
  const placeholders = Array.from(root.querySelectorAll('[data-okjs-boundary]'));
  const placeholder = placeholders.find(item => item.getAttribute('data-okjs-boundary') === boundaryId);
  if (!placeholder) return false;
  const ownerDocument = placeholder.ownerDocument;
  const content = ownerDocument.createElement('template');
  content.innerHTML = html;
  placeholder.replaceWith(content.content.cloneNode(true));
  return true;
}

/** Parse one streamed boundary chunk and continue the matching client shell. */
export interface StreamingPayloadSnapshot {
  routeDataPayload: string | null;
  rscPayload: string | null;
}

/** Extract inert payload script data from a streamed document without executing it. */
export function readStreamingPayloads(root: ParentNode, options: Pick<StreamingPayloadOptions, 'routeDataId' | 'rscPayloadId'> = {}): StreamingPayloadSnapshot {
  const scripts = Array.from(root.querySelectorAll('script[data-onekit-payload]'));
  const routeDataId = options.routeDataId ?? 'onekit-route-data';
  const rscPayloadId = options.rscPayloadId ?? 'onekit-rsc-flight';
  const find = (id: string): string | null => scripts.find(script => script.getAttribute('data-onekit-payload') === id)?.textContent ?? null;
  return { routeDataPayload: find(routeDataId), rscPayload: find(rscPayloadId) };
}

export function resumeStreamingBoundaryChunk(root: ParentNode, chunk: string): boolean {
  const ownerDocument = typeof Document !== 'undefined' && root instanceof Document
    ? root
    : (root as Element).ownerDocument;
  if (!ownerDocument) return false;
  const parser = ownerDocument.createElement('template');
  parser.innerHTML = chunk;
  const payload = parser.content.querySelector('template[data-okjs-boundary-content]');
  if (!payload) return false;
  const boundaryId = payload.getAttribute('data-okjs-boundary-content');
  if (!boundaryId) return false;
  return resumeStreamingBoundary(root, boundaryId, payload.innerHTML);
}

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
