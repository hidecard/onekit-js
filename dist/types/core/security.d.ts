export interface SecurityConfig {
    ALLOWED_TAGS: string[];
    ALLOWED_ATTRIBUTES: string[];
    enableSanitization: boolean;
    enableValidation: boolean;
}
export declare function sanitizeHTML(html: string): string;
export declare function validateSelector(selector: string): boolean;
export declare function sanitizeURL(url: string): string;
export declare function deepCloneSafe(obj: any): any;
export declare function validateStorageKey(key: string): boolean;
export declare function updateSecurityConfig(config: Partial<SecurityConfig>): void;
export declare function getSecurityConfig(): SecurityConfig;
export declare function generateCSPHeader(directives?: Record<string, string[]>): string;
export declare function validateJSON(jsonString: string): boolean;
export declare function sanitizeInput(input: string): string;
