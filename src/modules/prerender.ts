import { renderToString, type RenderResult, type SSRContext } from './ssr';
import type { VNode } from './vdom';
import type { FileRouteManifest } from './file-routes';

export type PrerenderValue = VNode | string | RenderResult;
export type PrerenderPaths = readonly string[] | (() => readonly string[] | Promise<readonly string[]>);

export interface PrerenderRenderContext {
  path: string;
  signal: AbortSignal;
  manifest?: FileRouteManifest;
}

export interface PrerenderedPage {
  path: string;
  html: string;
  context: SSRContext;
}

export interface PrerenderOptions {
  /** Concrete URL paths selected by the application or build integration. */
  paths: PrerenderPaths;
  /** Application-owned route-to-view renderer. */
  render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
  /** Optional route manifest passed through to the renderer. */
  manifest?: FileRouteManifest;
  /** Optional callback for writing, uploading, or indexing each completed page. */
  onPage?: (page: PrerenderedPage) => void | Promise<void>;
  /** Abort the current and all remaining pages. */
  signal?: AbortSignal;
}

function abortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  if (typeof DOMException === 'function') return new DOMException('The prerender operation was aborted', 'AbortError');
  return new Error('The prerender operation was aborted');
}

function normalizePath(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
    throw new TypeError(`Prerender paths must be absolute URL paths: ${String(path)}`);
  }
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  if (pathname.split('/').some(segment => segment === '..' || segment === '.')) {
    throw new TypeError(`Prerender paths cannot contain traversal segments: ${path}`);
  }
  return path;
}

function isRenderResult(value: PrerenderValue): value is RenderResult {
  return Boolean(value && typeof value === 'object' && 'html' in value && typeof value.html === 'string' && 'context' in value);
}

function normalizeRenderValue(value: PrerenderValue): RenderResult {
  if (typeof value === 'string') return renderToString(value);
  if (isRenderResult(value)) return value;
  return renderToString(value as VNode);
}

/**
 * Render a finite, application-selected set of concrete paths in deterministic order.
 * The utility is sequential by design so applications control request/cache isolation.
 */
export async function prerenderRoutes(options: PrerenderOptions): Promise<readonly PrerenderedPage[]> {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abort = (): void => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener('abort', abort, { once: true });

  try {
    const sourcePaths = typeof options.paths === 'function' ? await options.paths() : options.paths;
    const paths = [...new Set(sourcePaths.map(normalizePath))].sort((left, right) => left.localeCompare(right));
    const pages: PrerenderedPage[] = [];
    for (const path of paths) {
      if (controller.signal.aborted) throw abortError(controller.signal);
      const rendered = await options.render({ path, signal: controller.signal, manifest: options.manifest });
      if (controller.signal.aborted) throw abortError(controller.signal);
      const result = normalizeRenderValue(rendered);
      const page = { path, html: result.html, context: result.context };
      pages.push(page);
      await options.onPage?.(page);
    }
    return pages;
  } finally {
    externalSignal?.removeEventListener('abort', abort);
  }
}
