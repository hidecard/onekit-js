// OKJS - OneKit JavaScript Template Syntax Module
import { createElement, VNode } from './vdom';
import { ComponentDefinition, ComponentInstance, create } from './component';

export interface OKJSElement {
  tag: string | Function;
  props: Record<string, unknown>;
  children: (OKJSElement | string | number | boolean | null | undefined)[];
}

// OKJS template parser - custom syntax: [tag attr="value"]content[/tag]
export function okjs(template: TemplateStringsArray, ...values: unknown[]): OKJSElement | VNode {
  const parsed = parseOKJSTemplate(template.raw[0]);
  return createVNodeFromOKJS(parsed);
}

// Parse OKJS template string into AST-like structure
function parseOKJSTemplate(template: string): OKJSElement {
  // Simple parser for [tag attr="value"]content[/tag] syntax
  const regex = /\[(\w+)(?:\s+([^\/\]]*?))?\](.*?)\[\/(\w+)\]/gs;
  const selfClosingRegex = /\[(\w+)(?:\s+([^\/\]]*?))?\s*\/\]/g;

  let result: OKJSElement = { tag: 'div', props: {}, children: [] };
  let lastIndex = 0;

  // Handle self-closing tags
  template = template.replace(selfClosingRegex, (match, tag, attrs) => {
    const props = parseAttributes(attrs || '');
    const element: OKJSElement = { tag, props, children: [] };
    result.children.push(element);
    return '';
  });

  // Handle regular tags
  let match;
  while ((match = regex.exec(template)) !== null) {
    const [, openTag, attrs, content, closeTag] = match;

    if (openTag !== closeTag) {
      throw new Error(`OKJS: Mismatched tags: ${openTag} and ${closeTag}`);
    }

    const props = parseAttributes(attrs || '');
    const children = parseContent(content);

    const element: OKJSElement = { tag: openTag, props, children };
    result.children.push(element);
  }

  // If no tags found, treat as text content
  if (result.children.length === 0) {
    result.children = [template];
  }

  return result;
}

// Parse attributes string into props object
function parseAttributes(attrsStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const [, key, value] = match;
    props[key] = value;
  }

  return props;
}

// Parse content string into children array
function parseContent(content: string): (OKJSElement | string)[] {
  const children: (OKJSElement | string)[] = [];
  const parts = content.split(/(\[.*?\])/);

  for (const part of parts) {
    if (part.trim()) {
      if (part.startsWith('[') && part.endsWith(']')) {
        // Nested element
        const nested = parseOKJSTemplate(part);
        children.push(nested);
      } else {
        // Text content
        children.push(part.trim());
      }
    }
  }

  return children;
}

// Create VNode from OKJS element
function createVNodeFromOKJS(element: OKJSElement): VNode {
  if (typeof element.tag === 'function') {
    // Component
    const componentProps = { ...element.props, children: element.children };
    const instance = create(element.tag.name, componentProps);
    return instance as any;
  }

  // Regular element
  const validChildren = element.children.filter(child => child !== null && child !== undefined && child !== false);
  return createElement(
    element.tag as string,
    element.props,
    ...validChildren.map(child =>
      typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean' ? String(child) : createVNodeFromOKJS(child)
    )
  );
}

// Fragment support
export const Fragment = 'fragment';

// Helper for creating components with OKJS
export function component(definition: ComponentDefinition): Function {
  return function(props: Record<string, unknown> = {}): ComponentInstance | null {
    return create(definition.name || 'anonymous', props);
  };
}

// Export OKJS as default template function
export { okjs as jsx, okjs as jsxDEV, okjs as h };
