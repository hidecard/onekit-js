// Integrated State Manager (Pinia-like)
import { reactive, computed, effect } from './reactive';

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
  $subscribe: (callback: (mutation: { storeId: string; type: string; payload?: unknown }, state: Record<string, unknown>) => void) => () => void;
  [key: string]: unknown;
}

const stores = new Map<string, Store>();
const storeSubscriptions = new WeakMap<Store, Set<(mutation: { storeId: string; type: string; payload?: unknown }, state: Record<string, unknown>) => void>>();

export function defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store {
  let definition: StoreDefinition;

  if (typeof id === 'string') {
    if (!setup) {
      throw new Error('[OneKit Store] defineStore requires setup function when id is a string');
    }
    definition = { ...setup(), id };
  } else {
    definition = id;
  }

  // Check if store already exists
  if (stores.has(definition.id)) {
    console.warn(`[OneKit Store] Store "${definition.id}" already exists. Returning existing store.`);
    return stores.get(definition.id)!;
  }

  // Create reactive state
  const state = reactive(definition.state());

  // Create store instance
  const store: Store = {
    $id: definition.id,
    $state: state,
    $patch: (partialState) => {
      if (typeof partialState === 'function') {
        partialState(state);
      } else {
        Object.assign(state, partialState);
      }

      // Notify subscribers
      const subscribers = storeSubscriptions.get(store);
      if (subscribers) {
        subscribers.forEach(callback => {
          callback({ storeId: definition.id, type: 'patch', payload: partialState }, { ...state });
        });
      }
    },
    $reset: () => {
      const newState = definition.state();
      Object.assign(state, newState);

      // Notify subscribers
      const subscribers = storeSubscriptions.get(store);
      if (subscribers) {
        subscribers.forEach(callback => {
          callback({ storeId: definition.id, type: 'reset' }, { ...state });
        });
      }
    },
    $subscribe: (callback) => {
      let subscribers = storeSubscriptions.get(store);
      if (!subscribers) {
        subscribers = new Set();
        storeSubscriptions.set(store, subscribers);
      }

      subscribers.add(callback);

      // Return unsubscribe function
      return () => {
        subscribers!.delete(callback);
      };
    }
  };

  // Add getters
  if (definition.getters) {
    Object.keys(definition.getters).forEach(getterName => {
      const getterFn = definition.getters![getterName];
      (store as any)[getterName] = computed(() => getterFn(state));
    });
  }

  // Add actions
  if (definition.actions) {
    Object.keys(definition.actions).forEach(actionName => {
      const actionFn = definition.actions![actionName];
      (store as any)[actionName] = function(...args: unknown[]) {
        const result = actionFn.apply(store, args);

        // Notify subscribers
        const subscribers = storeSubscriptions.get(store);
        if (subscribers) {
          subscribers.forEach(callback => {
            callback({ storeId: definition.id, type: 'action', payload: { action: actionName, args, result } }, { ...state });
          });
        }

        return result;
      };
    });
  }

  // Store the instance
  stores.set(definition.id, store);
  applyPlugins(store);

  return store;
}

export function useStore<T extends Store>(id: string): T {
  const store = stores.get(id);
  if (!store) {
    throw new Error(`[OneKit Store] Store "${id}" not found. Make sure to define it first.`);
  }
  return store as T;
}

export function getAllStores(): Store[] {
  return Array.from(stores.values());
}

export function removeStore(id: string): boolean {
  const store = stores.get(id);
  if (store) {
    storeSubscriptions.delete(store);
    return stores.delete(id);
  }
  return false;
}

// Plugin system for stores
export interface StorePlugin {
  (store: Store): void;
}

const plugins: StorePlugin[] = [];

export function addStorePlugin(plugin: StorePlugin): void {
  plugins.push(plugin);

  // Apply plugin to existing stores
  stores.forEach(store => {
    plugin(store);
  });
}

// Apply plugins to newly created stores
function applyPlugins(store: Store): void {
  plugins.forEach(plugin => plugin(store));
}

// Explicit alias for applications that prefer a create-style API.
export function createStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store {
  return defineStore(id, setup);
}
