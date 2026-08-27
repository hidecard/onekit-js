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
    $subscribe: (callback: (mutation: {
        storeId: string;
        type: string;
        payload?: unknown;
    }, state: Record<string, unknown>) => void) => () => void;
    [key: string]: unknown;
}
export interface StoreRegistry {
    defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store;
    useStore<T extends Store>(id: string): T;
    getAllStores(): Store[];
    getInspectorSnapshot(): Array<{
        id: string;
        state: Record<string, unknown>;
        subscriberCount: number;
    }>;
    removeStore(id: string): boolean;
    addPlugin(plugin: StorePlugin): void;
    dispose(): void;
}
export interface StorePlugin {
    (store: Store): void;
}
export declare function createStoreRegistry(): StoreRegistry;
export declare function defineStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store;
export declare function useStore<T extends Store>(id: string): T;
export declare function getAllStores(): Store[];
export declare function removeStore(id: string): boolean;
export declare function addStorePlugin(plugin: StorePlugin): void;
export declare function createStore(id: string | StoreDefinition, setup?: () => StoreDefinition): Store;
