/* OneKit style: predictable DOM ownership, keyed updates, explicit prop diffing, and small renderer primitives. */

import { isSafeURL, sanitizeStyleValue } from '../core/security';

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

const eventListeners = new WeakMap<Element, Map<string, EventListener>>();

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
    if (oldValue && oldValue !== value) {
      if (typeof oldValue === 'function') oldValue(null);
      else if (typeof oldValue === 'object') (oldValue as { current?: Element | null }).current = null;
    }
    if (typeof value === 'function') value(element);
    else if (value && typeof value === 'object') (value as { current?: Element }).current = element;
    return;
  }
  if (/^on/i.test(prop)) {
    const event = prop.slice(2).toLowerCase();
    const registered = eventListeners.get(element);
    const previousListener = registered?.get(event);
    if (previousListener && previousListener !== value) {
      element.removeEventListener(event, previousListener);
      registered?.delete(event);
    } else if (oldValue && typeof oldValue === 'function' && oldValue !== value) {
      element.removeEventListener(event, oldValue as EventListener);
    }
    if (typeof value === 'function' && value !== oldValue) {
      element.addEventListener(event, value as EventListener);
      const listeners = registered ?? new Map<string, EventListener>();
      listeners.set(event, value as EventListener);
      eventListeners.set(element, listeners);
    }
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
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      const safeValue = sanitizeStyleValue(String(item));
      if (safeValue) style.setProperty(key, safeValue); else style.removeProperty(key);
    });
    return;
  }
  const propertyNames = new Set(['value', 'checked', 'selected', 'selectedIndex', 'disabled', 'readOnly', 'required', 'multiple', 'muted', 'hidden']);
  if (propertyNames.has(prop) && prop in element) {
    try { (element as unknown as Record<string, unknown>)[prop] = value == null ? (typeof value === 'boolean' ? false : '') : value; } catch { /* fall through to attribute */ }
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
  if (['href', 'src', 'action', 'formaction', 'poster'].includes(prop.toLowerCase()) && !isSafeURL(String(value))) {
    element.removeAttribute(prop);
    return;
  }
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
    if (typeof previous !== 'string') cleanupVNode(previous, domNode);
    const created = render(next);
    parent.replaceChild(created, domNode);
    return created;
  }
  if (isFragment(next) || isFragment(previous)) {
    const oldCount = countTopLevelNodes(previous);
    const childNodes = Array.from(parent.childNodes);
    const domIndex = childNodes.findIndex(node => node === domNode);
    const anchor = childNodes[domIndex + oldCount] ?? null;
    let current: Node | null = domNode;
    for (let index = 0; index < oldCount && current; index += 1) {
      const following: Node | null = current.nextSibling;
      parent.removeChild(current);
      current = following;
    }
    const created = render(next);
    parent.insertBefore(created, anchor);
    return created.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent.childNodes[Math.max(0, Array.from(parent.childNodes).indexOf(anchor) - 1)] ?? null : created;
  }
  if (next.tag !== previous.tag || next.key !== previous.key) {
    cleanupVNode(previous, domNode);
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

function countTopLevelNodes(vnode: VNode | string): number {
  if (typeof vnode === 'string' || !isFragment(vnode)) return 1;
  return vnode.children.reduce((count, child) => count + countTopLevelNodes(child), 0);
}

function patchChildren(parent: Node, nextChildren: (VNode | string)[], previousChildren: (VNode | string)[]): void {
  // Fragments can occupy more than one DOM node, so retain the fragment-specific
  // path until the renderer has explicit range ownership. The keyed path below
  // deliberately handles one-node element/text children only.
  if (nextChildren.some(child => typeof child !== 'string' && isFragment(child)) ||
      previousChildren.some(child => typeof child !== 'string' && isFragment(child))) {
    patchChildrenLegacy(parent, nextChildren, previousChildren);
    return;
  }

  type ChildEntry = { vnode: VNode | string; node: Node; used: boolean };
  const domChildren = Array.from(parent.childNodes);
  const entries: ChildEntry[] = previousChildren.map((vnode, index) => ({
    vnode,
    node: domChildren[index],
    used: false,
  })).filter(entry => Boolean(entry.node));
  const keyed = new Map<string | number, ChildEntry[]>();
  const unkeyed = entries.filter(entry => typeof entry.vnode === 'string' || entry.vnode.key === undefined);

  entries.forEach(entry => {
    if (typeof entry.vnode !== 'string' && entry.vnode.key !== undefined) {
      const bucket = keyed.get(entry.vnode.key) ?? [];
      bucket.push(entry);
      keyed.set(entry.vnode.key, bucket);
    }
  });

  let unkeyedIndex = 0;
  let anchor: Node | null = parent.firstChild;
  nextChildren.forEach(nextChild => {
    const nextKey = typeof nextChild === 'string' ? undefined : nextChild.key;
    let entry: ChildEntry | undefined;
    if (nextKey !== undefined) {
      entry = keyed.get(nextKey)?.find(candidate => !candidate.used);
    } else {
      while (unkeyedIndex < unkeyed.length && unkeyed[unkeyedIndex].used) unkeyedIndex += 1;
      entry = unkeyed[unkeyedIndex++];
    }

    if (entry) {
      entry.used = true;
      const updated = patchNode(parent, entry.node, nextChild, entry.vnode);
      if (updated) {
        if (updated !== anchor) parent.insertBefore(updated, anchor);
        anchor = updated.nextSibling;
      }
      return;
    }

    const created = render(nextChild);
    parent.insertBefore(created, anchor);
    anchor = created.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent.firstChild : created.nextSibling;
  });

  entries.forEach(entry => {
    if (!entry.used && entry.node.parentNode === parent) {
      cleanupVNode(entry.vnode, entry.node);
      parent.removeChild(entry.node);
    }
  });
}

function patchChildrenLegacy(parent: Node, nextChildren: (VNode | string)[], previousChildren: (VNode | string)[]): void {
  const used = new Set<Node>();
  nextChildren.forEach((nextChild, index) => {
    const currentNode = parent.childNodes[index] ?? null;
    const previousChild = previousChildren[index];
    if (currentNode && previousChild !== undefined) {
      const updated = patchNode(parent, currentNode, nextChild, previousChild);
      if (updated) used.add(updated);
    } else {
      const created = render(nextChild);
      parent.insertBefore(created, parent.childNodes[index] || null);
      if (created.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) used.add(created);
    }
  });
  Array.from(parent.childNodes).forEach(node => {
    if (!used.has(node)) {
      const oldVNode = (node as VElement)._vnode;
      if (oldVNode) cleanupVNode(oldVNode, node);
      parent.removeChild(node);
    }
  });
}

function cleanupVNode(vnode: VNode | string, domNode: Node): void {
  if (typeof vnode === 'string') return;
  const element = domNode.nodeType === Node.ELEMENT_NODE ? domNode as Element : null;
  if (element) {
    const listeners = eventListeners.get(element);
    listeners?.forEach((listener, event) => element.removeEventListener(event, listener));
    eventListeners.delete(element);
  }
  if (vnode.props.ref) setProp(domNode as Element, 'ref', undefined, vnode.props.ref);
  vnode.children.forEach((child, index) => {
    const childNode = domNode.childNodes[index];
    if (childNode) cleanupVNode(child, childNode);
  });
}

export function patch(parent: Element, newVNode: VNode | string, oldVNode?: VNode | string): void {
  patchNode(parent, parent.firstChild, newVNode, oldVNode);
}
