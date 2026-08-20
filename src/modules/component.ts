// Component System Module
import { sanitizeHTML } from '../core/security';
import { deepCloneSafe } from '../core/security';
import { compileTemplate } from './template';
import { reactive } from './reactive';
import { DisposableScope, effectScope } from '../core/scope';
import { emitDevToolsEvent, getDevToolsTargetId, registerDevToolsInspector } from '../core/devtools';
import { createErrorBoundary } from '../core/error-handler';
import type { VNode } from './vdom';
import { render as renderVNode } from './vdom';

export interface ComponentProps {
  [key: string]: unknown;
}

export interface ComponentState {
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

export type SlotValue = string | VNode | SlotValue[] | (() => SlotValue | SlotValue[]);

export interface ComponentDefinition {
  name?: string;
  props?: ComponentPropsDefinition;
  data?: () => ComponentState;
  /** Composition-style setup for concise state, methods, and lifecycle registration. */
  setup?: (props: ComponentProps) => ComponentState;
  template?: string;
  render?: (this: ComponentInstance) => string | VNode;
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
  slots: { [key: string]: SlotValue };
  state: ComponentState;
  element: Element | null;
  mounted: boolean;
  listeners: unknown[];
  scope: DisposableScope;
  componentId: number;
  update: () => void;
  [key: string]: unknown;
}

export interface StatefulComponentFactory {
  (props?: ComponentProps): ComponentInstance | null;
  __onekitStateful?: true;
  __onekitName?: string;
}

const components: { [key: string]: ComponentDefinition } = {};
const componentInstances = new Map<Element, ComponentInstance>();

registerDevToolsInspector('components', () => Array.from(componentInstances.values()).map((instance) => ({
  id: instance.componentId,
  name: instance.name,
  mounted: instance.mounted,
  props: instance.props,
  state: instance.state,
})));

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

export function defineComponent(definition: ComponentDefinition): ComponentDefinition {
  return definition;
}

/** Resolve a named slot while preserving VNode, text, array, and lazy slot values. */
export function resolveSlot(instance: ComponentInstance, name = 'default', fallback: SlotValue = []): SlotValue {
  const value = instance.slots[name];
  if (value === undefined) return fallback;
  return typeof value === 'function' ? value() : value;
}

export function register(name: string, definition: ComponentDefinition): void {
  components[name] = definition;
}

/** Replace a registered component during HMR while preserving live state and props. */
export function hotUpdateComponent(name: string, definition: ComponentDefinition): number {
  const active = Array.from(componentInstances.values()).filter(instance => instance.name === name);
  const snapshots = active.map(instance => ({
    instance,
    state: deepCloneSafe(instance.state),
    props: deepCloneSafe(instance.props),
    slots: { ...instance.slots },
    parent: instance.element?.parentNode,
    nextSibling: instance.element?.nextSibling,
    mounted: instance.mounted,
  }));
  register(name, definition);
  snapshots.forEach(snapshot => {
    const { instance, parent, nextSibling, mounted } = snapshot;
    destroy(instance);
    const replacement = create(name, snapshot.props, snapshot.slots);
    if (!replacement) return;
    Object.assign(replacement.state, snapshot.state);
    replacement.update();
    if (parent && replacement.element && mounted) {
      mount(replacement, parent as Element | ShadowRoot);
      if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(replacement.element, nextSibling);
    }
  });
  return snapshots.length;
}

export function create(name: string, props: ComponentProps = {}, slots: { [key: string]: SlotValue } = {}): ComponentInstance | null {
  if (!components[name]) {
    console.error(`Component "${name}" not found`);
    return null;
  }

  const definition = components[name];
  const providedChildren = props.children;
  const normalizedSlots = Object.keys(slots).length > 0 ? slots : (providedChildren === undefined ? {} : { default: providedChildren as SlotValue });

  // Validate and process props
  const validatedProps = definition.props ? validateProps(props, definition.props, name) : props;

  const instance: ComponentInstance = {
    name,
    props: reactive(validatedProps),
    scope: effectScope(true),
    componentId: getDevToolsTargetId({}),
    slots: normalizedSlots,
    state: reactive(definition.data ? deepCloneSafe(definition.data()) : {}),
    element: null,
    mounted: false,
    listeners: [],
    update: function() {} // Placeholder, will be overridden
  };

  // Composition-style setup returns the public state/method surface used by the template.
  if (definition.setup) {
    const setupState = setupComponent(instance, definition.setup);
    if (setupState && typeof setupState === 'object') {
      Object.assign(instance.state, setupState);
    }
  }

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

      let nextElement: Element | null = null;
      if (definition.template) {
        nextElement = renderTemplate();
      } else if (definition.render) {
        const rendered = definition.render.call(this);
        if (typeof rendered === 'string') {
          const html = sanitizeHTML(rendered);
          const newElement = document.createElement('div');
          newElement.innerHTML = html;
          nextElement = newElement.firstElementChild;
        } else {
          const renderedNode = renderVNode(rendered);
          nextElement = renderedNode.nodeType === Node.ELEMENT_NODE ? renderedNode as Element : null;
        }
      }

      if (nextElement) {
        const previousElement = this.element;
        if (previousElement && previousElement.tagName === nextElement.tagName) {
          Array.from(previousElement.attributes).forEach(attribute => {
            if (!nextElement.hasAttribute(attribute.name)) previousElement.removeAttribute(attribute.name);
          });
          Array.from(nextElement.attributes).forEach(attribute => {
            previousElement.setAttribute(attribute.name, attribute.value);
          });
          previousElement.replaceChildren(...Array.from(nextElement.childNodes));
        } else if (previousElement) {
          const parent = previousElement.parentNode;
          if (parent) {
            parent.replaceChild(nextElement, previousElement);
            componentInstances.delete(previousElement);
            componentInstances.set(nextElement, this);
            this.element = nextElement;
          } else {
            previousElement.replaceChildren(...Array.from(nextElement.childNodes));
          }
        }
      }

        // Legacy data-on-* method bindings remain supported for render() components.
        if (!definition.template && definition.methods && this.element) {
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

        emitDevToolsEvent({ type: 'component:lifecycle', componentId: this.componentId, name: this.name, phase: 'update' });
      definition.updated?.call(this);
    }
  };

  // Keep template effects/listeners in a replaceable child scope. Recompiling this
  // scope on update preserves ok-on/ok-model/ok-for behavior after root replacement.
  let templateScope: DisposableScope | null = null;
  let templateContext: Record<string, unknown> | null = null;

  const renderTemplate = (): Element => {
    templateScope?.dispose();
    templateScope = effectScope(true);
    const context = templateContext ?? new Proxy({}, {
      get(_target, key: string | symbol) {
        if (key in instance.state) return instance.state[key as string];
        if (key in instance.props) return instance.props[key as string];
        if (key in instance && typeof key === 'string') return instance[key];
        if (key === '$slots') return instance.slots;
        return undefined;
      },
      has(_target, key: string | symbol) {
        return key in instance.state || key in instance.props || key in instance || key === '$slots';
      },
      set(_target, key: string | symbol, value: unknown) {
        if (typeof key !== 'string') return false;
        if (key in instance.state) {
          instance.state[key] = value;
          return true;
        }
        if (key in instance.props) {
          instance.props[key] = value;
          return true;
        }
        return false;
      },
    });
    templateContext = context;
    return templateScope.run(() => compileTemplate(definition.template!, context));
  };

  instance.scope.add(() => templateScope?.dispose());

  // Create element inside the component scope so template effects and directive
  // listeners are disposed automatically when the component is destroyed.
  const renderBoundary = createErrorBoundary<Element>({
    fallback: (_error) => {
      const fallback = document.createElement('div');
      fallback.setAttribute('data-onekit-error-boundary', instance.name);
      fallback.textContent = 'OneKit component failed to render';
      return fallback;
    },
  });

  instance.scope.run(() => renderBoundary.render(() => {
    if (definition.template) {
      instance.element = renderTemplate();
    } else if (definition.render) {
      const rendered = definition.render.call(instance);
      if (typeof rendered === 'string') {
        const html = sanitizeHTML(rendered);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        instance.element = tempDiv.firstElementChild as Element;
      } else {
        const renderedNode = renderVNode(rendered);
        instance.element = renderedNode.nodeType === Node.ELEMENT_NODE ? renderedNode as Element : null;
      }
    }
    return instance.element ?? document.createElement('div');
  }));

  // Add lifecycle hooks
  definition.beforeCreate?.call(instance);
  definition.created?.call(instance);

  emitDevToolsEvent({ type: 'component:lifecycle', componentId: instance.componentId, name: instance.name, phase: 'create' });

  // Store instance
  if (instance.element) {
    componentInstances.set(instance.element, instance);
  }

  return instance;
}

export function activate(component: ComponentInstance): void {
  if (component.mounted) return;
  component.mounted = true;
  emitDevToolsEvent({ type: 'component:lifecycle', componentId: component.componentId, name: component.name, phase: 'mount' });
  const definition = components[component.name];
  component.scope.run(() => {
    definition?.mounted?.call(component);
    const hooks = lifecycleHooks.get(component);
    hooks?.onMounted.forEach(hook => hook());
  });
}

export function updateComponentProps(component: ComponentInstance, nextProps: ComponentProps): Element | null {
  const definition = components[component.name];
  const previousProps = { ...component.props };
  const validatedProps = definition?.props ? validateProps(nextProps, definition.props, component.name) : nextProps;
  Object.keys(component.props).forEach(key => {
    if (!(key in validatedProps)) delete component.props[key];
  });
  Object.assign(component.props, validatedProps);
  lifecycleHooks.get(component)?.onPropsChanged.forEach(hook => hook(component.props, previousProps));
  component.update();
  return component.element;
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
  activate(comp);

  return comp;
}

export const unmount = destroy;

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

  component.scope.dispose();
  emitDevToolsEvent({ type: 'component:lifecycle', componentId: component.componentId, name: component.name, phase: 'unmount' });
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
    return instance.scope.run(() => setupFn(instance.props));
  } finally {
    currentInstance = prevInstance;
  }
}
