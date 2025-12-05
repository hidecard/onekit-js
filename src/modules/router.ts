/**
 * Router module for OneKit
 * Handles client-side routing functionality
 */

export interface Route {
  path: string;
  component?: any;
  handler?: () => void;
}

export class Router {
  private routes: Route[] = [];

  addRoute(route: Route): void {
    this.routes.push(route);
  }

  navigate(path: string): void {
    // Basic navigation logic
    const route = this.routes.find(r => r.path === path);
    if (route?.handler) {
      route.handler();
    }
  }

  getCurrentPath(): string {
    return window.location.pathname;
  }
}

export const router = new Router();
