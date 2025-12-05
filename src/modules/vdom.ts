// Virtual DOM Module
import { sanitizeHTML } from '../core/security';

export interface VNodeProps {
  [key: string]: unknown;
}

export interface VNode {
  tag: string;
  props: VNodeProps;
  children: (VNode | string)[];
  key?: string;
}

interface VElement extends Element {
  _vnode?: VNode;
}

export function createElement(tag: string, props: VNodeProps = {}, ...children: (VNode | string)[]): VNode {
  return {
    tag,
    props: props || {},
    children: children.flat(),
    key: typeof props.key === 'string' ? props.key : undefined
  };
}

export function render(vnode: VNode | string): Element | Text {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }

  const element = document.createElement(vnode.tag);

  // Set properties
  for (const prop in vnode.props) {
    if (prop === 'key') continue;

    const propValue = vnode.props[prop];
    if (prop.startsWith('on') && typeof propValue === 'function') {
      element.addEventListener(prop.slice(2).toLowerCase(), propValue as EventListener);
    } else if (prop === 'className' && typeof propValue === 'string') {
      element.setAttribute('class', propValue);
    } else if (prop === 'style' && typeof propValue === 'object' && propValue !== null) {
      Object.assign((element as HTMLElement).style, propValue);
    } else if (typeof propValue === 'string') {
      element.setAttribute(prop, propValue);
    }
  }

  // Render children
  vnode.children.forEach(child => {
    element.appendChild(render(child));
  });

  // Store vnode reference
  (element as VElement)._vnode = vnode;

  return element;
}

export function patch(parent: Element, newVNode: VNode | string, oldVNode?: VNode | string): void {
  const oldElement = parent.firstChild as VElement;

  if (!oldElement) {
    // No existing element, just render and append
    parent.appendChild(render(newVNode));
    return;
  }

  if (!oldVNode) {
    // No old vnode, replace entire content
    parent.innerHTML = '';
    parent.appendChild(render(newVNode));
    return;
  }

  if (typeof newVNode === 'string' && typeof oldVNode === 'string') {
    // Both are strings, just update text
    if (newVNode !== oldVNode) {
      oldElement.textContent = newVNode;
    }
    return;
  }

  if (typeof newVNode === 'string' || typeof oldVNode === 'string') {
    // One is string, one is vnode, replace
    parent.replaceChild(render(newVNode), oldElement);
    return;
  }

  // Both are vnodes
  if (newVNode.tag !== oldVNode.tag) {
    // Different tags, replace
    parent.replaceChild(render(newVNode), oldElement);
    return;
  }

  // Same tag, update props and children
  updateProps(oldElement, newVNode.props, oldVNode.props);
  updateChildren(oldElement, newVNode.children, oldVNode.children);
}

function updateProps(element: Element, newProps: VNodeProps, oldProps: VNodeProps): void {
  // Remove old props
  for (const prop in oldProps) {
    if (prop === 'key') continue;
    if (!(prop in newProps)) {
      if (prop.startsWith('on')) {
        // Remove event listener (simplified - in real implementation, store handlers)
        const oldValue = oldProps[prop];
        if (typeof oldValue === 'function') {
          element.removeEventListener(prop.slice(2).toLowerCase(), oldValue as EventListener);
        }
      } else {
        element.removeAttribute(prop);
      }
    }
  }

  // Add/update new props
  for (const prop in newProps) {
    if (prop === 'key') continue;
    const newValue = newProps[prop];
    const oldValue = oldProps[prop];
    if (newValue !== oldValue) {
      if (prop.startsWith('on') && typeof newValue === 'function') {
        element.addEventListener(prop.slice(2).toLowerCase(), newValue as EventListener);
      } else if (prop === 'className' && typeof newValue === 'string') {
        element.setAttribute('class', newValue);
      } else if (prop === 'style' && typeof newValue === 'object' && newValue !== null) {
        Object.assign((element as HTMLElement).style, newValue);
      } else if (typeof newValue === 'string') {
        element.setAttribute(prop, newValue);
      }
    }
  }
}

function updateChildren(parent: Element, newChildren: (VNode | string)[], oldChildren: (VNode | string)[]): void {
  const maxLength = Math.max(newChildren.length, oldChildren.length);

  for (let i = 0; i < maxLength; i++) {
    const newChild = newChildren[i];
    const oldChild = oldChildren[i];

    if (!newChild && oldChild) {
      // Remove extra old child
      parent.removeChild(parent.childNodes[i]);
    } else if (newChild && !oldChild) {
      // Add new child
      parent.appendChild(render(newChild));
    } else if (newChild && oldChild) {
      // Update existing child
      patch(parent.childNodes[i] as Element, newChild, oldChild);
    }
  }
}
