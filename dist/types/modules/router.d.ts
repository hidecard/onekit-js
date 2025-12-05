/**
 * Router module for OneKit
 * Handles client-side routing functionality
 */
export interface Route {
    path: string;
    component?: any;
    handler?: () => void;
}
export declare class Router {
    private routes;
    addRoute(route: Route): void;
    navigate(path: string): void;
    getCurrentPath(): string;
}
export declare const router: Router;
