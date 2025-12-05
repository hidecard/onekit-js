// Web Components Integration Module
import { ComponentDefinition, ComponentInstance, create, mount, destroy, register } from './component';

interface WebComponentOptions {
  extends?: string;
  observedAttributes?: string[];
}

export class OneKitWebComponent extends HTMLElement {
  private componentInstance: ComponentInstance | null = null;
  private componentDef: ComponentDefinition;

  constructor(componentDef: ComponentDefinition, options: WebComponentOptions = {}) {
    super();
    this.componentDef = componentDef;

    // Create shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });

    // Register component if it has a name
    if (componentDef.name) {
      register(componentDef.name, componentDef);
    }

    // Create component instance
    this.componentInstance = create(componentDef.name || 'anonymous');

    // Mount component to shadow DOM
    if (this.componentInstance) {
      mount(this.componentInstance, shadow);
    }
  }

  connectedCallback(): void {
    // Component is already mounted in constructor
  }

  disconnectedCallback(): void {
    if (this.componentInstance) {
      destroy(this.componentInstance);
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (this.componentInstance && this.componentInstance.props) {
      // Update component props when attributes change
      this.componentInstance.props[name] = newValue;
      // Trigger update if component has update method
      if (this.componentInstance.update) {
        this.componentInstance.update();
      }
    }
  }

  // Get observed attributes from component props
  static get observedAttributes(): string[] {
    return [];
  }
}

export function registerWebComponent(name: string, componentDef: ComponentDefinition, options: WebComponentOptions = {}): void {
  // Create custom element class
  class CustomWebComponent extends OneKitWebComponent {
    constructor() {
      super(componentDef, options);
    }

    static get observedAttributes(): string[] {
      // Observe attributes based on component props
      if (componentDef.props) {
        return Object.keys(componentDef.props);
      }
      return options.observedAttributes || [];
    }
  }

  // Register custom element
  if (!customElements.get(name)) {
    customElements.define(name, CustomWebComponent, {
      extends: options.extends
    });
  }
}

// JSX-like syntax helper (simplified)
export function jsx(tag: string | Function, props: Record<string, unknown> | null, ...children: unknown[]): unknown {
  if (typeof tag === 'function') {
    // Component function
    return tag({ ...props, children });
  }

  // Regular element
  return {
    tag,
    props: props || {},
    children
  };
}

// Export JSX pragma for TypeScript
export const jsxDEV = jsx;
export const Fragment = 'fragment';
