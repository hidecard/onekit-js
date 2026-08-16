// OneKit V3 ergonomic API: a small beginner-facing layer over the production reactive and component primitives.
import { reactive, computed, effect, stop, EffectOptions } from './reactive';
import {
  ComponentDefinition,
  ComponentInstance,
  ComponentProps,
  defineComponent,
  register,
  create,
  mount as mountComponent,
  destroy,
} from './component';

export interface StateRef<T> {
  value: T;
  readonly __isStateRef: true;
}

/**
 * Create reactive state. Objects and arrays are returned as reactive proxies;
 * primitive values use a small `.value` ref, matching the explicit V3 contract.
 */
export function state<T extends object>(initial: T): T;
export function state<T>(initial: T): StateRef<T>;
export function state<T>(initial: T): T | StateRef<T> {
  if (typeof initial === 'object' && initial !== null) {
    return reactive(initial as T & object);
  }

  const holder = reactive({ value: initial }) as StateRef<T>;
  Object.defineProperty(holder, '__isStateRef', { value: true, enumerable: false });
  return holder;
}

/** Create a cached, dependency-tracked derived value. */
export function derive<T>(getter: () => T) {
  return computed(getter);
}

/** Create a reactive side effect with a familiar beginner-facing name. */
export function watchEffect(fn: () => void, options?: EffectOptions): () => void {
  const runner = effect(fn, options);
  return () => stop(runner);
}

export interface AppInstance {
  readonly definition: ComponentDefinition;
  readonly component: ComponentDefinition;
  mount(target: string | Element | ShadowRoot, props?: ComponentProps): ComponentInstance | null;
  unmount(): void;
}

let appId = 0;

/**
 * Mount a component definition directly without manually registering a name.
 * The old register/create/mount APIs remain available for advanced use cases.
 */
export function createApp(definition: ComponentDefinition): AppInstance {
  const component = defineComponent(definition);
  const name = component.name || `OneKitApp${++appId}`;
  const namedDefinition = component.name ? component : { ...component, name };
  let instance: ComponentInstance | null = null;

  return {
    definition: namedDefinition,
    component: namedDefinition,
    mount(target, props = {}) {
      register(name, namedDefinition);
      instance = create(name, props);
      return instance ? mountComponent(instance, target) : null;
    },
    unmount() {
      if (instance) {
        destroy(instance);
        instance = null;
      }
    },
  };
}
