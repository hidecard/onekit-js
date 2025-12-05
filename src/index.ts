// OneKit - Modern JavaScript Framework
// Main entry point

// Core modules
export * from './core/index';

// Feature modules
export * from './modules/component';
export * from './modules/reactive';
export { createElement, render } from './modules/vdom';
export { patch as vdomPatch } from './modules/vdom';
export * from './modules/animation';
export { request, get, post, put, del, API } from './modules/api';
export { patch as apiPatch } from './modules/api';
export * from './modules/router';
export * from './modules/storage';
export * from './modules/utils';
export * from './modules/a11y';

// Version info
export const VERSION = '2.2.0';
