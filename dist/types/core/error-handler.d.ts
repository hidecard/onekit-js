export declare function errorHandler(error: Error | string | unknown, context?: string): null;
export declare function safeMethod<T extends (...args: any[]) => any>(method: T): T;
