/* OneKit style: predictable DOM ownership, keyed updates, explicit prop diffing, and small renderer primitives. */

export interface VNodeProps {
  [key: string]: unknown;
}

export interface VNode {
  tag: string | Function;
  props: VNodeProps;
  children: (VNode | string)[];
  key?: string | number;
}

interface VElement extends Element { _vnode?: VNode; }

type RenderNode = Element | Text | DocumentFragment;

export function createElement(tag: string | Function, props: VNodeProps = {}, ...children: unknown[]): VNode {
  const normalized = children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false).map(child => typeof child === 'object' ? child as VNode : String(child));
  return {
    tag,
    props: props || {},
    children: normalized,
    key: props?.key as string | number | undefined
  };
}

function isFragment(vnode: VNode): boolean { return vnode.tag === 'fragment'; }

function setProp(element: Element, prop: string, value: unknown, oldValue?: unknown): void {
  if (prop === 'key' || prop === 'children') return;
  if (prop === 'ref') {
    if (typeof value === 'function') value(element);
    else if (value && typeof value === 'object') (value as { current?: Element }).current = element;
    return;
  }
  if (prop.startsWith('on')) {
    const event = prop.slice(2).toLowerCase();
    if (oldValue && oldValue !== value) element.removeEventListener(event, oldValue as EventListener);
    if (typeof value === 'function' && value !== oldValue) element.addEventListener(event, value as EventListener);
    return;
  }
  if (prop === 'className') {
    if (value == null || value === false) element.removeAttribute('class'); else element.setAttribute('class', String(value));
    return;
  }
  if (prop === 'style' && value && typeof value === 'object') {
    const style = (element as HTMLElement).style;
    const previous = (oldValue && typeof oldValue === 'object') ? oldValue as Record<string, unknown> : {};
    Object.keys(previous).forEach(key => { if (!(key in (value as object))) style.removeProperty(key); });
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => style.setProperty(key, String(item)));
    return;
  }
  if (value == null || value === false) {
    element.removeAttribute(prop);
    const booleanProps = new Set(['checked', 'disabled', 'hidden', 'multiple', 'muted', 'required', 'readOnly', 'selected']);
    if (booleanProps.has(prop) && prop in element) {
      try { (element as unknown as Record<string, unknown>)[prop] = false; } catch { /* read-only DOM property */ }
    }
    return;
  }
  if (value === true) { element.setAttribute(prop, ''); return; }
  if (prop in element && typeof value !== 'string') {
    try { (element as unknown as Record<string, unknown>)[prop] = value; return; } catch { /* fall through to attribute */ }
  }
  element.setAttribute(prop, String(value));
}

function updateProps(element: Element, next: VNodeProps, previous: VNodeProps): void {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  keys.forEach(prop => setProp(element, prop, next[prop], previous[prop]));
}

export function render(vnode: VNode | string): RenderNode {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  if (isFragment(vnode)) {
    const fragment = document.createDocumentFragment();
    vnode.children.forEach(child => fragment.appendChild(render(child)));
    return fragment;
  }
  if (typeof vnode.tag === 'function') return render((vnode.tag as Function)(vnode.props) as VNode);
  const element = document.createElement(vnode.tag);
  updateProps(element, vnode.props, {});
  vnode.children.forEach(child => element.appendChild(render(child)));
  (element as VElement)._vnode = vnode;
  return element;
}

function patchNode(parent: Node, domNode: Node | null, next: VNode | string, previous?: VNode | string): Node | null {
  if (previous === undefined || domNode === null) {
    const created = render(next);
    parent.appendChild(created);
    return created.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent.lastChild : created;
  }
  if (typeof next === 'string' && typeof previous === 'string') {
    if (next !== previous && domNode.nodeValue !== next) domNode.nodeValue = next;
    return domNode;
  }
  if (typeof next === 'string' || typeof previous === 'string' || typeof next.tag === 'function' || typeof previous.tag === 'function') {
    const created = render(next);
    parent.replaceChild(created, domNode);
    return created;
  }
  if (next.tag !== previous.tag || next.key !== previous.key || isFragment(next) || isFragment(previous)) {
    const created = render(next);
    parent.replaceChild(created, domNode);
    return created;
  }
  const element = domNode as Element;
  updateProps(element, next.props, previous.props);
  patchChildren(element, next.children, previous.children);
  (element as VElement)._vnode = next;
  return element;
}

function patchChildren(parent: Node, nextChildren: (VNode | string)[], previousChildren: (VNode | string)[]): void {
  const keyed = new Map<string | number, { vnode: VNode; node: Node }>();
  Array.from(parent.childNodes).forEach((node, index) => {
    const old = previousChildren[index];
    if (typeof old !== 'string' && old?.key !== undefined) keyed.set(old.key, { vnode: old, node });
  });
  const used = new Set<Node>();
  nextChildren.forEach((nextChild, index) => {
    const nextKey = typeof nextChild === 'string' ? undefined : nextChild.key;
    const keyedMatch = nextKey !== undefined ? keyed.get(nextKey) : undefined;
    const currentNode = keyedMatch?.node ?? parent.childNodes[index] ?? null;
    const previousChild = keyedMatch?.vnode ?? previousChildren[index];
    if (currentNode && previousChild !== undefined) {
      const updated = patchNode(parent, currentNode, nextChild, previousChild);
      if (updated) {
        used.add(updated);
        const anchor = parent.childNodes[index];
        if (anchor !== updated) parent.insertBefore(updated, anchor || null);
      }
    } else {
      const created = render(nextChild);
      parent.insertBefore(created, parent.childNodes[index] || null);
      if (created.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) used.add(created);
    }
  });
  Array.from(parent.childNodes).forEach(node => { if (!used.has(node)) parent.removeChild(node); });
}

export function patch(parent: Element, newVNode: VNode | string, oldVNode?: VNode | string): void {
  patchNode(parent, parent.firstChild, newVNode, oldVNode);
}
