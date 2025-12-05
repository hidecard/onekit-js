// Component System Module
import { sanitizeHTML } from '../core/security';
import { deepCloneSafe } from '../core/security';
import { di } from '../core/di';

interface ComponentProps {
  [key: string]: unknown;
}

interface ComponentState {
  [key: string]: unknown;
}

export interface ComponentDefinition {
  name?: string;
  props?: ComponentProps;
  data?: () => ComponentState;
  template?: string;
  render?: (this: ComponentInstance) => string;
  methods?: { [key: string]: (...args: unknown[]) => unknown };
  inject?: string[];
  beforeCreate?: (this: ComponentInstance) => void;
  created?: (this: ComponentInstance) => void;
  beforeMount?: (this: ComponentInstance) => void;
  mounted?: (this: ComponentInstance) => void;
  beforeUpdate?: (this: ComponentInstance) => void;
  updated?: (this: ComponentInstance) => void;
  beforeUnmount?: (this: ComponentInstance) => void;
  unmounted?: (this: ComponentInstance) => void;
}

export interface ComponentInstance {
  name: string;
  props: ComponentProps;
  slots: { [key: string]: string };
  state: ComponentState;
  element: Element | null;
  mounted: boolean;
  listeners: unknown[];
  update: () => void;
  [key: string]: unknown;
}

const components: { [key: string]: ComponentDefinition } = {};
const componentInstances = new Map<Element, ComponentInstance>();

export function register(name: string, definition: ComponentDefinition): void {
  components[name] = definition;
}

export function create(name: string, props: ComponentProps = {}, slots: { [key: string]: string } = {}): ComponentInstance | null {
  if (!components[name]) {
    console.error(`Component "${name}" not found`);
    return null;
  }

  const definition = components[name];
  const defaultProps = definition.props || {};
  const finalProps = { ...defaultProps, ...props };

  const instance: ComponentInstance = {
    name,
    props: finalProps,
    slots,
    state: definition.data ? deepCloneSafe(definition.data()) : {},
    element: null,
    mounted: false,
    listeners: [],
    update: function() {} // Placeholder, will be overridden
  };

  // Add methods
  if (definition.methods) {
    Object.keys(definition.methods).forEach(method => {
      instance[method] = function(...args: any[]) {
        return definition.methods![method].call(instance, ...args);
      };
    });
  }

  // Unified update method for reactive updates
  instance.update = function() {
    if (this.element) {
      if (definition.beforeUpdate) {
        definition.beforeUpdate.call(this);
      }

      let html = '';
      if (definition.template) {
        html = definition.template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const keys = key.trim().split('.');
          let value: any = this.state;
          if (keys[0] in this.props) {
            value = this.props;
          }
          for (const k of keys) {
            value = value && value[k];
          }
          return value !== undefined ? value : '';
        });
        // Replace slots
        html = html.replace(/<slot><\/slot>/gi, this.slots.default || '');
        html = html.replace(/<slot name="([^"]+)"><\/slot>/gi, (match, slotName) => {
          return this.slots[slotName] || '';
        });
      } else if (definition.render) {
        html = definition.render.call(this);
      }

      if (html) {
        // Sanitize HTML before rendering
        const sanitized = sanitizeHTML(html);
        const newElement = document.createElement('div');
        newElement.innerHTML = sanitized;
        if (this.element.firstChild) {
          this.element.replaceChild(newElement.firstChild!, this.element.firstChild);
        } else {
          this.element.appendChild(newElement.firstChild!);
        }

        // Re-attach event listeners after update
        if (definition.methods && this.element) {
          Object.keys(definition.methods).forEach(method => {
          const events = this.element!.querySelectorAll(`[data-on-${method}]`);
            events.forEach((el: Element) => {
              (el as HTMLElement).addEventListener(method.split('on')[1], (e) => {
                e.preventDefault();
                const methodFn = this[method];
                if (typeof methodFn === 'function') {
                  methodFn(e);
                }
              });
            });
          });
        }
      }

      definition.updated?.call(this);
    }
  };

  // Create element
  let html = '';
  if (definition.template) {
    html = definition.template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value: any = instance.state;
      if (keys[0] in instance.props) {
        value = instance.props;
      }
      for (const k of keys) {
        value = value && value[k];
      }
      return value !== undefined ? value : '';
    });
    // Replace slots
    html = html.replace(/<slot><\/slot>/gi, instance.slots.default || '');
    html = html.replace(/<slot name="([^"]+)"><\/slot>/gi, (match, slotName) => {
      return instance.slots[slotName] || '';
    });
    // Sanitize HTML before creating element
    const sanitized = sanitizeHTML(html);
    instance.element = document.createElement('div');
    instance.element.innerHTML = sanitized;
    instance.element = instance.element.firstElementChild as Element;
  } else if (definition.render) {
    html = definition.render.call(instance);
    // Sanitize HTML before creating element
    const sanitized = sanitizeHTML(html);
    instance.element = document.createElement('div');
    instance.element.innerHTML = sanitized;
    instance.element = instance.element.firstElementChild as Element;
  }

  // Add lifecycle hooks
  definition.beforeCreate?.call(instance);
  definition.created?.call(instance);

  // Store instance
  if (instance.element) {
    componentInstances.set(instance.element, instance);
  }

  return instance;
}

export function mount(component: ComponentInstance | string, target: string | Element | ShadowRoot): ComponentInstance | null {
  let comp: ComponentInstance | null;
  if (typeof component === 'string') {
    comp = create(component);
  } else {
    comp = component;
  }

  if (!comp || !comp.element) {
    console.error('Invalid component');
    return null;
  }

  const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
  if (!targetElement) {
    console.error('Invalid target element');
    return null;
  }

  targetElement.appendChild(comp.element);
  comp.mounted = true;

  const definition = components[comp.name];
  definition?.mounted?.call(comp);

  return comp;
}

export function getInstance(element: Element): ComponentInstance | undefined {
  return componentInstances.get(element);
}

export function destroy(component: ComponentInstance): void {
  if (!component || !component.element) return;

  const definition = components[component.name];
  definition?.beforeUnmount?.call(component);

  if (component.element.parentNode) {
    component.element.parentNode.removeChild(component.element);
  }

  component.listeners.forEach((listener) => {
    if (typeof listener === 'object' && listener !== null && 'element' in listener && 'event' in listener && 'handler' in listener) {
      const { element, event, handler } = listener as { element: Element; event: string; handler: EventListener };
      element.removeEventListener(event, handler);
    }
  });

  componentInstances.delete(component.element);
  component.mounted = false;

  if (definition && definition.unmounted) {
    definition.unmounted.call(component);
  }
}
