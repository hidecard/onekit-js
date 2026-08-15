// Component System Module
import { sanitizeHTML } from '../core/security';
import { deepCloneSafe } from '../core/security';
import { di } from '../core/di';
import { compileTemplate } from './template';
import { reactive, effect } from './reactive';

interface ComponentProps {
  [key: string]: unknown;
}

interface ComponentState {
  [key: string]: unknown;
}

export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'symbol';

export interface PropDefinition {
  type?: PropType | PropType[];
  required?: boolean;
  default?: unknown | (() => unknown);
  validator?: (value: unknown) => boolean;
}

export interface ComponentPropsDefinition {
  [key: string]: PropDefinition | PropType;
}

export interface ComponentDefinition {
  name?: string;
  props?: ComponentPropsDefinition;
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

// Lifecycle hooks registry for composition API style
const lifecycleHooks = new WeakMap<ComponentInstance, {
  onMounted: (() => void)[];
  onUpdated: (() => void)[];
  onDestroyed: (() => void)[];
  onPropsChanged: ((newProps: ComponentProps, oldProps: ComponentProps) => void)[];
}>();

// Current component instance for composition API
let currentInstance: ComponentInstance | null = null;

// Props validation utilities
function validatePropType(value: unknown, type: PropType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'function':
      return typeof value === 'function';
    case 'symbol':
      return typeof value === 'symbol';
    default:
      return false;
  }
}

function validateProps(props: ComponentProps, propDefs: ComponentPropsDefinition, componentName: string): ComponentProps {
  const validatedProps: ComponentProps = {};
  const missingRequired: string[] = [];
  const typeErrors: string[] = [];

  // Process each prop definition
  for (const propName in propDefs) {
    const def = propDefs[propName];
    const propDef: PropDefinition = typeof def === 'string' ? { type: def } : def;
    const providedValue = props[propName];

    // Check if required prop is missing
    if (propDef.required && (providedValue === undefined || providedValue === null)) {
      missingRequired.push(propName);
      continue;
    }

    // Use default value if prop is not provided
    let finalValue = providedValue;
    if (finalValue === undefined || finalValue === null) {
      if (propDef.default !== undefined) {
        finalValue = typeof propDef.default === 'function' ? propDef.default() : propDef.default;
      }
    }

    // Type validation
    if (finalValue !== undefined && propDef.type) {
      const types = Array.isArray(propDef.type) ? propDef.type : [propDef.type];
      const isValidType = types.some(type => validatePropType(finalValue, type));

      if (!isValidType) {
        typeErrors.push(`${propName}: expected ${types.join(' or ')}, got ${typeof finalValue}`);
      }
    }

    // Custom validator
    if (finalValue !== undefined && propDef.validator && !propDef.validator(finalValue)) {
      typeErrors.push(`${propName}: custom validation failed`);
    }

    validatedProps[propName] = finalValue;
  }

  // Add any extra props that weren't defined (for flexibility)
  for (const propName in props) {
    if (!(propName in propDefs)) {
      validatedProps[propName] = props[propName];
    }
  }

  // Log validation errors in development
  if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
      (typeof window !== 'undefined' && (window as any).__ONEKIT_DEV__)) {

    if (missingRequired.length > 0) {
      console.warn(`[OneKit] Component "${componentName}": Missing required props: ${missingRequired.join(', ')}`);
    }

    if (typeErrors.length > 0) {
      console.warn(`[OneKit] Component "${componentName}": Prop validation errors:`, typeErrors);
    }
  }

  return validatedProps;
}

export function register(name: string, definition: ComponentDefinition): void {
  components[name] = definition;
}

export function create(name: string, props: ComponentProps = {}, slots: { [key: string]: string } = {}): ComponentInstance | null {
  if (!components[name]) {
    console.error(`Component "${name}" not found`);
    return null;
  }

  const definition = components[name];

  // Validate and process props
  const validatedProps = definition.props ? validateProps(props, definition.props, name) : props;

  const instance: ComponentInstance = {
    name,
    props: validatedProps,
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
  if (definition.template) {
    // Use template engine with directives
    const context = { ...instance.state, ...instance.props, $slots: instance.slots };
    instance.element = compileTemplate(definition.template, context);
  } else if (definition.render) {
    const html = definition.render.call(instance);
    const sanitized = sanitizeHTML(html);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;
    instance.element = tempDiv.firstElementChild as Element;
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

  // Call composition API onMounted hooks
  const hooks = lifecycleHooks.get(comp);
  if (hooks?.onMounted) {
    hooks.onMounted.forEach(hook => hook());
  }

  return comp;
}

export function getInstance(element: Element): ComponentInstance | undefined {
  return componentInstances.get(element);
}

export function destroy(component: ComponentInstance): void {
  if (!component || !component.element) return;

  const definition = components[component.name];
  definition?.beforeUnmount?.call(component);

  // Call composition API onDestroyed hooks
  const hooks = lifecycleHooks.get(component);
  if (hooks?.onDestroyed) {
    hooks.onDestroyed.forEach(hook => hook());
  }

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

// Composition API lifecycle hooks
export function onMounted(callback: () => void): void {
  if (!currentInstance) {
    console.warn('[OneKit] onMounted() called outside of component setup');
    return;
  }

  let hooks = lifecycleHooks.get(currentInstance);
  if (!hooks) {
    hooks = {
      onMounted: [],
      onUpdated: [],
      onDestroyed: [],
      onPropsChanged: []
    };
    lifecycleHooks.set(currentInstance, hooks);
  }

  hooks.onMounted.push(callback);
}

export function onUpdated(callback: () => void): void {
  if (!currentInstance) {
    console.warn('[OneKit] onUpdated() called outside of component setup');
    return;
  }

  let hooks = lifecycleHooks.get(currentInstance);
  if (!hooks) {
    hooks = {
      onMounted: [],
      onUpdated: [],
      onDestroyed: [],
      onPropsChanged: []
    };
    lifecycleHooks.set(currentInstance, hooks);
  }

  hooks.onUpdated.push(callback);
}

export function onDestroyed(callback: () => void): void {
  if (!currentInstance) {
    console.warn('[OneKit] onDestroyed() called outside of component setup');
    return;
  }

  let hooks = lifecycleHooks.get(currentInstance);
  if (!hooks) {
    hooks = {
      onMounted: [],
      onUpdated: [],
      onDestroyed: [],
      onPropsChanged: []
    };
    lifecycleHooks.set(currentInstance, hooks);
  }

  hooks.onDestroyed.push(callback);
}

export function onPropsChanged(callback: (newProps: ComponentProps, oldProps: ComponentProps) => void): void {
  if (!currentInstance) {
    console.warn('[OneKit] onPropsChanged() called outside of component setup');
    return;
  }

  let hooks = lifecycleHooks.get(currentInstance);
  if (!hooks) {
    hooks = {
      onMounted: [],
      onUpdated: [],
      onDestroyed: [],
      onPropsChanged: []
    };
    lifecycleHooks.set(currentInstance, hooks);
  }

  hooks.onPropsChanged.push(callback);
}

// Setup function for composition API
export function setupComponent(instance: ComponentInstance, setupFn: (props: ComponentProps) => ComponentState): ComponentState {
  const prevInstance = currentInstance;
  currentInstance = instance;

  try {
    const result = setupFn(instance.props);
    return result;
  } finally {
    currentInstance = prevInstance;
  }
}
