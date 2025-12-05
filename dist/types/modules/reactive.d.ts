interface ReactiveObject {
    [key: string]: unknown;
}
export declare function reactive(obj: ReactiveObject): ReactiveObject;
export declare function watch(key: string | symbol, callback: (newValue: unknown, oldValue: unknown, property: string | symbol) => void): () => void;
export declare function bind(element: string | Element, reactiveObj: ReactiveObject, property: string, attribute?: string): void;
export {};
