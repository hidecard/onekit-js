interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: {
        [key: string]: string;
    };
    body?: any;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    onProgress?: (progress: number) => void;
}
interface ResponseData {
    status: number;
    statusText: string;
    headers: {
        [key: string]: string;
    };
    data: any;
    url: string;
}
export declare function request(url: string, options?: RequestOptions): Promise<ResponseData>;
export declare function get(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ResponseData>;
export declare function post(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ResponseData>;
export declare function put(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ResponseData>;
export declare function del(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ResponseData>;
export declare function patch(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ResponseData>;
export declare class API {
    private baseURL;
    private defaultOptions;
    constructor(baseURL: string, defaultOptions?: RequestOptions);
    private buildURL;
    get(endpoint: string, options?: RequestOptions): Promise<ResponseData>;
    post(endpoint: string, data?: any, options?: RequestOptions): Promise<ResponseData>;
    put(endpoint: string, data?: any, options?: RequestOptions): Promise<ResponseData>;
    delete(endpoint: string, options?: RequestOptions): Promise<ResponseData>;
    patch(endpoint: string, data?: any, options?: RequestOptions): Promise<ResponseData>;
}
export {};
