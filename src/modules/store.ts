import { reactive, computed } from './reactive';
import { onScopeDispose } from '../core/scope';
import { emitDevToolsEvent, registerDevToolsInspector } from '../core/devtools';

export interface StoreDefinition {
  id: string;
  state: () => Record<string, unknown>;
  getters?: Record<string, (state: Record<string, unknown>) => unknown>;
  actions?: Record<string, (this: Store, ...args: unknown[]) => unknown>;
}

export interface Store {
  $id: string;
  $state: Record<string, unknown>;
  $patch: (partialState: Partial<Record<string, unknown>> | ((state: Record<string, unknown>) => void)) => void;
  $reset: () => void;
  $dispose: () => void;
  $subscribe: (callback: (mutation: { storeId: string; type: string; payload?: unknown }, state: Record<string, unknown>) => void) => () => void;
  [key: string]: unknown;
}

export interface StoreRegistry {
  defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store;
  useStore<T extends Store>(id: string): T;
  getAllStores(): Store[];
  getInspectorSnapshot(): Array<{ id: string; state: Record<string, unknown>; subscriberCount: number }>;
  removeStore(id: string): boolean;
  addPlugin(plugin: StorePlugin): void;
  dispose(): void;
}

export interface StorePlugin {
  (store: Store): void;
}

type StoreSubscriber = (mutation: { storeId: string; type: string; payload?: unknown }, state: Record<string, unknown>) => void;

function createRegistry(): StoreRegistry {
  const stores = new Map<string, Store>();
  const storeSubscriptions = new WeakMap<Store, Set<StoreSubscriber>>();
  const plugins: StorePlugin[] = [];

  const registry: StoreRegistry = {
    defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store {
      let definition: StoreDefinition;

      if (typeof id === 'string') {
        if (!setup) {
          throw new Error('[OneKit Store] defineStore requires setup function when id is a string');
        }
        definition = { ...setup(), id };
      } else {
        definition = id;
      }

      if (stores.has(definition.id)) {
        console.warn(`[OneKit Store] Store "${definition.id}" already exists. Returning existing store.`);
        return stores.get(definition.id)!;
      }

      const state = reactive(definition.state());
      const store: Store = {
        $id: definition.id,
        $state: state,
        $patch: (partialState) => {
          if (typeof partialState === 'function') {
            partialState(state);
          } else {
            Object.assign(state, partialState);
          }

          const subscribers = storeSubscriptions.get(store);
          subscribers?.forEach(callback => {
            callback({ storeId: definition.id, type: 'patch', payload: partialState }, { ...state });
          });
        },
        $reset: () => {
          const newState = definition.state();
          Object.keys(state).forEach(key => {
            if (!(key in newState)) delete state[key];
          });
          Object.assign(state, newState);

          const subscribers = storeSubscriptions.get(store);
          subscribers?.forEach(callback => {
            callback({ storeId: definition.id, type: 'reset' }, { ...state });
          });
        },
        $dispose: () => {
          if (!stores.has(definition.id)) return;
          const subscribers = storeSubscriptions.get(store);
          const listenerCount = subscribers?.size ?? 0;
          subscribers?.clear();
          storeSubscriptions.delete(store);
          stores.delete(definition.id);
          emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'dispose', listenerCount });
        },
        $subscribe: (callback) => {
          let subscribers = storeSubscriptions.get(store);
          if (!subscribers) {
            subscribers = new Set();
            storeSubscriptions.set(store, subscribers);
          }

          subscribers.add(callback);
          emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'subscribe', listenerCount: subscribers.size });

          const unsubscribe = () => {
            if (!subscribers?.delete(callback)) return;
            emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'unsubscribe', listenerCount: subscribers.size });
          };
          onScopeDispose(unsubscribe);
          return unsubscribe;
        },
      };

      if (definition.getters) {
        Object.keys(definition.getters).forEach(getterName => {
          const getterFn = definition.getters![getterName];
          (store as any)[getterName] = computed(() => getterFn(state));
        });
      }

      if (definition.actions) {
        Object.keys(definition.actions).forEach(actionName => {
          const actionFn = definition.actions![actionName];
          (store as any)[actionName] = function(...args: unknown[]) {
            const result = actionFn.apply(store, args);
            const subscribers = storeSubscriptions.get(store);
            subscribers?.forEach(callback => {
              callback({ storeId: definition.id, type: 'action', payload: { action: actionName, args, result } }, { ...state });
            });
            return result;
          };
        });
      }

      stores.set(definition.id, store);
      emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'create', listenerCount: 0 });
      plugins.forEach(plugin => plugin(store));
      return store;
    },
    useStore<T extends Store>(id: string): T {
      const store = stores.get(id);
      if (!store) {
        throw new Error(`[OneKit Store] Store "${id}" not found. Make sure to define it first.`);
      }
      return store as T;
    },
    getAllStores(): Store[] {
      return Array.from(stores.values());
    },
    getInspectorSnapshot() {
      return Array.from(stores.values(), store => ({
        id: store.$id,
        state: store.$state,
        subscriberCount: storeSubscriptions.get(store)?.size ?? 0,
      }));
    },
    removeStore(id: string): boolean {
      const store = stores.get(id);
      if (!store) return false;
      store.$dispose();
      emitDevToolsEvent({ type: 'store:lifecycle', storeId: id, phase: 'remove', listenerCount: 0 });
      return true;
    },
    addPlugin(plugin: StorePlugin): void {
      plugins.push(plugin);
      stores.forEach(store => plugin(store));
    },
    dispose(): void {
      Array.from(stores.values()).forEach(store => store.$dispose());
      plugins.length = 0;
    },
  };

  return registry;
}

const defaultRegistry = createRegistry();

registerDevToolsInspector('stores', () => defaultRegistry.getInspectorSnapshot());

export function createStoreRegistry(): StoreRegistry {
  return createRegistry();
}

export function defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store {
  return defaultRegistry.defineStore(id, setup);
}

export function useStore<T extends Store>(id: string): T {
  return defaultRegistry.useStore<T>(id);
}

export function getAllStores(): Store[] {
  return defaultRegistry.getAllStores();
}

export function removeStore(id: string): boolean {
  return defaultRegistry.removeStore(id);
}

export function addStorePlugin(plugin: StorePlugin): void {
  defaultRegistry.addPlugin(plugin);
}

export function createStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store {
  return defineStore(id, setup);
}
