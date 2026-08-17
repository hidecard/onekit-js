export interface HeadMetadata {
  title?: string;
  description?: string;
  keywords?: string | readonly string[];
  robots?: string;
  canonical?: string;
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
}

export interface HeadManager {
  get(): HeadMetadata;
  set(metadata: HeadMetadata): void;
  update(metadata: HeadMetadata): void;
  render(): string;
  mount(target?: Document): void;
  clear(): void;
  dispose(): void;
}

const MANAGED_ATTRIBUTE = 'data-onekit-head';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeKeywords(keywords: HeadMetadata['keywords']): string | undefined {
  if (keywords === undefined) return undefined;
  return typeof keywords === 'string' ? keywords : keywords.join(', ');
}

function renderMeta(attribute: 'name' | 'property', key: string, value: string): string {
  return `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}">`;
}

function renderLink(rel: string, href: string): string {
  return `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}">`;
}

/** Render metadata into deterministic, escaped HTML suitable for an SSR head slot. */
export function renderHead(metadata: HeadMetadata): string {
  const tags: string[] = [];
  if (metadata.title) tags.push(`<title>${escapeHtml(metadata.title)}</title>`);
  if (metadata.description) tags.push(renderMeta('name', 'description', metadata.description));
  const keywords = normalizeKeywords(metadata.keywords);
  if (keywords) tags.push(renderMeta('name', 'keywords', keywords));
  if (metadata.robots) tags.push(renderMeta('name', 'robots', metadata.robots));
  if (metadata.canonical) tags.push(renderLink('canonical', metadata.canonical));
  Object.entries(metadata.openGraph ?? {}).forEach(([key, value]) => tags.push(renderMeta('property', `og:${key}`, value)));
  Object.entries(metadata.twitter ?? {}).forEach(([key, value]) => tags.push(renderMeta('name', `twitter:${key}`, value)));
  return tags.join('');
}

function removeManagedNodes(target: Document): void {
  target.head.querySelectorAll(`[${MANAGED_ATTRIBUTE}]`).forEach(node => node.remove());
}

/** Apply metadata to a browser document, replacing only nodes owned by this manager. */
export function applyHead(metadata: HeadMetadata, target: Document = document): void {
  removeManagedNodes(target);
  const template = target.createElement('template');
  template.innerHTML = renderHead(metadata);
  Array.from(template.content.childNodes).forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    (node as Element).setAttribute(MANAGED_ATTRIBUTE, 'true');
    target.head.appendChild(node);
  });
}

export function createHeadManager(initial: HeadMetadata = {}): HeadManager {
  let metadata: HeadMetadata = { ...initial };
  let mountedDocument: Document | undefined;

  const manager: HeadManager = {
    get: () => ({
      ...metadata,
      openGraph: metadata.openGraph ? { ...metadata.openGraph } : undefined,
      twitter: metadata.twitter ? { ...metadata.twitter } : undefined,
    }),
    set(next) {
      metadata = {
        ...next,
        openGraph: next.openGraph ? { ...next.openGraph } : undefined,
        twitter: next.twitter ? { ...next.twitter } : undefined,
      };
      if (mountedDocument) applyHead(metadata, mountedDocument);
    },
    update(next) {
      manager.set({
        ...metadata,
        ...next,
        openGraph: { ...metadata.openGraph, ...next.openGraph },
        twitter: { ...metadata.twitter, ...next.twitter },
      });
    },
    render: () => renderHead(metadata),
    mount(target = document) {
      mountedDocument = target;
      applyHead(metadata, target);
    },
    clear() {
      metadata = {};
      if (mountedDocument) removeManagedNodes(mountedDocument);
    },
    dispose() {
      if (mountedDocument) removeManagedNodes(mountedDocument);
      mountedDocument = undefined;
      metadata = {};
    },
  };

  return manager;
}
