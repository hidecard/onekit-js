(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OneKit = {}));
})(this, (function (exports) { 'use strict';

    // Error handling system
    function errorHandler(error, context = 'Unknown') {
        console.error(`OneKit Error [${context}]:`, error);
        // Dispatch a custom error event only when a DOM is available.
        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
            const event = new CustomEvent('onekit-error', {
                detail: { error, context },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }
        return null;
    }
    // Safe method wrapper
    function safeMethod(method) {
        return function (...args) {
            try {
                return method.apply(this, args);
            }
            catch (error) {
                errorHandler(error, method.name);
                return this; // Return this for method chaining
            }
        };
    }
    function toError(error) {
        return error instanceof Error ? error : new Error(String(error));
    }
    function createErrorBoundary(options) {
        const state = { error: null, pending: false };
        const reset = () => {
            state.error = null;
        };
        const report = (error, context) => {
            const normalized = toError(error);
            state.error = normalized;
            options.onError?.(normalized, context);
            errorHandler(normalized, context);
            return normalized;
        };
        const run = (work, context = 'boundary') => {
            try {
                state.error = null;
                return work();
            }
            catch (error) {
                throw report(error, context);
            }
        };
        const runAsync = async (work, context = 'boundary') => {
            state.pending = true;
            state.error = null;
            try {
                return await work();
            }
            catch (error) {
                throw report(error, context);
            }
            finally {
                state.pending = false;
            }
        };
        const render = (work, context = 'render') => {
            try {
                return run(work, context);
            }
            catch (error) {
                return options.fallback(toError(error), reset);
            }
        };
        const renderAsync = async (work, context = 'render') => {
            try {
                return await runAsync(work, context);
            }
            catch (error) {
                return options.fallback(toError(error), reset);
            }
        };
        return { state, run, runAsync, render, renderAsync, reset };
    }
    function createLoadingBoundary() {
        const state = { error: null, pending: false };
        let value;
        const run = async (work) => {
            state.pending = true;
            state.error = null;
            try {
                value = await work();
                return value;
            }
            catch (error) {
                state.error = toError(error);
                throw state.error;
            }
            finally {
                state.pending = false;
            }
        };
        const render = (loading, ready) => state.pending ? loading : (value ?? ready);
        return { state, run, render };
    }

    // OneKit DevTools foundation: opt-in, browser/SSR-safe event inspection.
    const DEFAULT_HISTORY_SIZE = 100;
    const DEFAULT_GLOBAL_NAME = '__ONEKIT_DEVTOOLS__';
    let enabled = false;
    let historySize = DEFAULT_HISTORY_SIZE;
    let nextTargetId = 1;
    let nextEffectId = 1;
    let installedGlobalName = null;
    const targetIds = new WeakMap();
    const effectIds = new WeakMap();
    const listeners = new Set();
    const history = [];
    const inspectors = new Map();
    const scopeIds = new WeakMap();
    let nextScopeId = 1;
    function isDevToolsEnabled() {
        return enabled;
    }
    function enableDevTools(options = {}) {
        enabled = true;
        historySize = Math.max(1, Math.floor(options.historySize ?? DEFAULT_HISTORY_SIZE));
        while (history.length > historySize)
            history.shift();
        const bridge = {
            get enabled() { return enabled; },
            subscribe(listener) {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            getHistory() {
                return history.map(event => devToolsSnapshot(event));
            },
            clearHistory() {
                history.length = 0;
            },
            getMetadata() {
                return {
                    enabled,
                    historySize,
                    eventCount: history.length,
                    listenerCount: listeners.size
                };
            },
            getInspectors() {
                const result = {};
                inspectors.forEach((provider, name) => {
                    try {
                        result[name] = devToolsSnapshot(provider());
                    }
                    catch {
                        result[name] = { error: 'inspector failed' };
                    }
                });
                return result;
            },
            dispose() {
                enabled = false;
                listeners.clear();
                history.length = 0;
                if (installedGlobalName && typeof window !== 'undefined') {
                    delete window[installedGlobalName];
                }
                installedGlobalName = null;
            }
        };
        if (options.installGlobal && typeof window !== 'undefined') {
            const globalName = options.globalName ?? DEFAULT_GLOBAL_NAME;
            window[globalName] = bridge;
            installedGlobalName = globalName;
        }
        return bridge;
    }
    function onDevToolsEvent(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
    function getDevToolsTargetId(target) {
        const existing = targetIds.get(target);
        if (existing)
            return existing;
        const id = nextTargetId++;
        targetIds.set(target, id);
        return id;
    }
    function getDevToolsScopeId(scope) {
        const existing = scopeIds.get(scope);
        if (existing)
            return existing;
        const id = nextScopeId++;
        scopeIds.set(scope, id);
        return id;
    }
    function registerDevToolsInspector(name, provider) {
        inspectors.set(name, provider);
        return () => inspectors.delete(name);
    }
    function getDevToolsEffectId(effect) {
        const existing = effectIds.get(effect);
        if (existing)
            return existing;
        const id = nextEffectId++;
        effectIds.set(effect, id);
        return id;
    }
    function devToolsSnapshot(value, seen = new WeakMap()) {
        if (value === null || typeof value !== 'object')
            return value;
        const existing = seen.get(value);
        if (existing)
            return existing;
        if (Array.isArray(value)) {
            const result = [];
            seen.set(value, result);
            value.forEach(item => result.push(devToolsSnapshot(item, seen)));
            return result;
        }
        const result = {};
        seen.set(value, result);
        Object.keys(value).forEach(key => {
            result[key] = devToolsSnapshot(value[key], seen);
        });
        return result;
    }
    function emitDevToolsEvent(event) {
        if (!enabled)
            return;
        history.push(devToolsSnapshot(event));
        while (history.length > historySize)
            history.shift();
        listeners.forEach(listener => {
            try {
                listener(event);
            }
            catch {
                // DevTools must never break application execution.
            }
        });
    }

    let activeScope = null;
    const activeScopes = new Set();
    let leakTimer;
    class ScopeImpl {
        parent;
        createdAt = Date.now();
        id = getDevToolsScopeId(this);
        cleanups = new Set();
        children = new Set();
        disposedState = false;
        constructor(detached = false) {
            this.parent = detached ? null : activeScope;
            if (this.parent instanceof ScopeImpl)
                this.parent.children.add(this);
            activeScopes.add(this);
            emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: this.id, phase: 'create' });
        }
        get disposed() { return this.disposedState; }
        run(fn) {
            if (this.disposedState)
                throw new Error('[OneKit] Cannot run a disposed scope');
            const previous = activeScope;
            activeScope = this;
            try {
                return fn();
            }
            finally {
                activeScope = previous;
            }
        }
        add(dispose) {
            if (this.disposedState) {
                dispose();
                return () => undefined;
            }
            let active = true;
            const wrapped = () => {
                if (!active)
                    return;
                active = false;
                this.cleanups.delete(wrapped);
                dispose();
            };
            this.cleanups.add(wrapped);
            return wrapped;
        }
        diagnostics() {
            return {
                id: this.id,
                disposed: this.disposedState,
                createdAt: this.createdAt,
                ageMs: Math.max(0, Date.now() - this.createdAt),
                cleanupCount: this.cleanups.size,
                childCount: this.children.size,
            };
        }
        dispose() {
            if (this.disposedState)
                return;
            this.disposedState = true;
            for (const child of Array.from(this.children))
                child.dispose();
            this.children.clear();
            for (const cleanup of Array.from(this.cleanups).reverse()) {
                try {
                    cleanup();
                }
                catch (error) {
                    console.warn('[OneKit] Scope cleanup failed', error);
                }
            }
            this.cleanups.clear();
            activeScopes.delete(this);
            if (this.parent instanceof ScopeImpl)
                this.parent.children.delete(this);
            emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: this.id, phase: 'dispose' });
        }
    }
    function effectScope(detached = false) { return new ScopeImpl(detached); }
    function getCurrentScope() { return activeScope; }
    function onScopeDispose(dispose) {
        if (!activeScope)
            return () => undefined;
        return activeScope.add(dispose);
    }
    function withScope(fn, detached = false) {
        const scope = effectScope(detached);
        return { value: scope.run(fn), scope };
    }
    function registerDisposable(resource) {
        const dispose = resource.dispose ?? resource.stop ?? resource.unsubscribe;
        if (dispose)
            onScopeDispose(() => dispose.call(resource));
        return resource;
    }
    function getActiveScopeDiagnostics() {
        return Array.from(activeScopes, (scope) => scope.diagnostics());
    }
    function enableScopeLeakWarnings(options = {}) {
        disableScopeLeakWarnings();
        const thresholdMs = Math.max(1_000, options.thresholdMs ?? 60_000);
        const intervalMs = Math.max(1_000, options.intervalMs ?? 30_000);
        const warn = () => {
            for (const scope of activeScopes) {
                const diagnostics = scope.diagnostics();
                if (diagnostics.ageMs < thresholdMs || diagnostics.cleanupCount === 0)
                    continue;
                const message = `[OneKit] Scope ${diagnostics.id} has been active for ${diagnostics.ageMs}ms with ${diagnostics.cleanupCount} pending cleanup(s)`;
                if (options.onWarning)
                    options.onWarning(diagnostics);
                else
                    console.warn(message, diagnostics);
                emitDevToolsEvent({ type: 'scope:lifecycle', scopeId: diagnostics.id, phase: 'create' });
            }
        };
        leakTimer = setInterval(warn, intervalMs);
        return disableScopeLeakWarnings;
    }
    function disableScopeLeakWarnings() {
        if (leakTimer !== undefined)
            clearInterval(leakTimer);
        leakTimer = undefined;
    }

    const DEFAULT_SECURITY_CONFIG = {
        ALLOWED_TAGS: [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'a', 'img', 'br', 'strong', 'em', 'b', 'i',
            'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'button',
            'main', 'section', 'article', 'header', 'footer', 'nav', 'aside',
            'form', 'label', 'select', 'option', 'textarea'
        ],
        ALLOWED_ATTRIBUTES: [
            'id', 'class', 'style', 'href', 'src', 'alt', 'title', 'type',
            'name', 'value', 'placeholder', 'disabled', 'checked', 'selected',
            'width', 'height', 'colspan', 'rowspan', 'data-*'
        ],
        enableSanitization: true,
        enableValidation: true
    };
    let securityConfig = { ...DEFAULT_SECURITY_CONFIG };
    // Sanitize HTML content with enhanced security
    function sanitizeHTML(html) {
        if (!securityConfig.enableSanitization)
            return html;
        const div = document.createElement('div');
        div.innerHTML = html;
        const sanitizeNode = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                const tagName = element.tagName.toLowerCase();
                if (!securityConfig.ALLOWED_TAGS.includes(tagName)) {
                    element.remove();
                    return;
                }
                // Remove disallowed attributes and dangerous ones
                const attributes = Array.from(element.attributes);
                for (const attr of attributes) {
                    const attrName = attr.name.toLowerCase();
                    const attrValue = attr.value;
                    // Check for dangerous attribute patterns
                    const dangerousAttrPatterns = [
                        /^on\w+$/i, // Event handlers
                        /^javascript:/i,
                        /^vbscript:/i,
                        /^data:/i,
                        /expression\s*\(/i,
                        /eval\s*\(/i,
                        /Function\s*\(/i
                    ];
                    const isDangerous = dangerousAttrPatterns.some(pattern => pattern.test(attrName) || pattern.test(attrValue));
                    const isDirective = attrName.startsWith('ok-') && /^ok-[a-z][a-z0-9]*(?:\.[a-z0-9_-]+)*$/i.test(attrName);
                    const isAllowed = isDirective || securityConfig.ALLOWED_ATTRIBUTES.some(allowed => {
                        if (allowed.endsWith('*')) {
                            return attrName.startsWith(allowed.slice(0, -1));
                        }
                        return attrName === allowed;
                    });
                    if (!isAllowed || isDangerous) {
                        element.removeAttribute(attr.name);
                    }
                }
                // Sanitize children
                const children = Array.from(element.childNodes);
                for (const child of children) {
                    sanitizeNode(child);
                }
            }
            else if (node.nodeType === Node.TEXT_NODE) {
                // Ensure text nodes don't contain dangerous content
                const textContent = node.textContent || '';
                const dangerousTextPatterns = [
                    /javascript:/i,
                    /vbscript:/i,
                    /data:/i,
                    /on\w+\s*=/i
                ];
                if (dangerousTextPatterns.some(pattern => pattern.test(textContent))) {
                    node.textContent = textContent.replace(/javascript:|vbscript:|data:|on\w+=/gi, '');
                }
            }
        };
        sanitizeNode(div);
        return div.innerHTML;
    }
    // Validate CSS selector for security
    function validateSelector(selector) {
        if (!securityConfig.enableValidation)
            return true;
        // Basic validation - prevent script injection
        const dangerousPatterns = [
            /javascript:/i,
            /vbscript:/i,
            /data:/i,
            /expression\s*\(/i,
            /on\w+\s*=/i
        ];
        return !dangerousPatterns.some(pattern => pattern.test(selector));
    }
    // Sanitize URL
    function sanitizeURL(url) {
        if (!securityConfig.enableValidation)
            return url;
        try {
            const parsed = new URL(url, window.location.origin);
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return '';
            }
            return parsed.href;
        }
        catch {
            return '';
        }
    }
    // Deep clone with security checks
    function deepCloneSafe(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj);
        if (obj instanceof RegExp)
            return new RegExp(obj);
        if (typeof obj === 'function')
            return obj; // Functions are allowed but not cloned
        if (Array.isArray(obj)) {
            return obj.map(item => deepCloneSafe(item));
        }
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepCloneSafe(obj[key]);
            }
        }
        return cloned;
    }
    // Validate storage key
    function validateStorageKey(key) {
        if (!securityConfig.enableValidation)
            return true;
        // Prevent prototype pollution and other attacks
        const dangerousKeys = [
            '__proto__',
            'constructor',
            'prototype',
            'toString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf'
        ];
        return !dangerousKeys.includes(key) && typeof key === 'string' && key.length > 0;
    }

    // Core OneKit functionality
    class OneKit {
        elements = [];
        static _cache = new Map();
        constructor(selector) {
            if (!selector) {
                return;
            }
            if (selector instanceof Element) {
                this.elements.push(selector);
                return;
            }
            if (typeof selector === 'string') {
                if (!validateSelector(selector)) {
                    console.error('OneKit: Invalid selector - potential security risk');
                    return;
                }
                if (selector.charAt(0) === '<' && selector.charAt(selector.length - 1) === '>') {
                    const sanitized = sanitizeHTML(selector);
                    const div = document.createElement('div');
                    div.innerHTML = sanitized;
                    for (let i = 0; i < div.childNodes.length; i++) {
                        this.elements.push(div.childNodes[i]);
                    }
                    return;
                }
                const elements = document.querySelectorAll(selector);
                for (let i = 0; i < elements.length; i++) {
                    this.elements.push(elements[i]);
                }
                return;
            }
            if (selector instanceof NodeList) {
                for (let i = 0; i < selector.length; i++) {
                    this.elements.push(selector[i]);
                }
                return;
            }
            if (selector instanceof OneKit) {
                this.elements = [...selector.elements];
                return;
            }
            if (Array.isArray(selector)) {
                this.elements = [...selector];
                return;
            }
        }
        // Core methods
        first() {
            if (this.elements.length > 0) {
                return new OneKit(this.elements[0]);
            }
            return new OneKit();
        }
        last() {
            if (this.elements.length > 0) {
                return new OneKit(this.elements[this.elements.length - 1]);
            }
            return new OneKit();
        }
        each(callback) {
            for (let i = 0; i < this.elements.length; i++) {
                callback.call(this.elements[i], i, this.elements[i]);
            }
            return this;
        }
        find(selector) {
            const elements = [];
            this.each(function () {
                const found = this.querySelectorAll(selector);
                for (let i = 0; i < found.length; i++) {
                    elements.push(found[i]);
                }
            });
            return new OneKit(elements);
        }
        // DOM manipulation methods
        class(className) {
            return this.each(function () {
                if (this.classList) {
                    this.classList.add(className);
                }
                else {
                    this.className += ' ' + className;
                }
            });
        }
        unclass(className) {
            return this.each(function () {
                if (this.classList) {
                    this.classList.remove(className);
                }
                else {
                    this.className = this.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
                }
            });
        }
        toggleClass(className) {
            return this.each(function () {
                if (this.classList) {
                    this.classList.toggle(className);
                }
                else {
                    const classes = this.className.split(' ');
                    const existingIndex = classes.indexOf(className);
                    if (existingIndex >= 0) {
                        classes.splice(existingIndex, 1);
                    }
                    else {
                        classes.push(className);
                    }
                    this.className = classes.join(' ');
                }
            });
        }
        html(content) {
            if (content === undefined) {
                return this.elements.length > 0 ? this.elements[0].innerHTML : null;
            }
            return this.each(function () {
                this.innerHTML = sanitizeHTML(content);
            });
        }
        text(content) {
            if (content === undefined) {
                return this.elements.length > 0 ? this.elements[0].textContent : null;
            }
            return this.each(function () {
                this.textContent = content;
            });
        }
        attr(name, value) {
            if (typeof name === 'object') {
                return this.each(function () {
                    for (const key in name) {
                        this.setAttribute(key, name[key]);
                    }
                });
            }
            if (value === undefined) {
                return this.elements.length > 0 ? this.elements[0].getAttribute(name) || '' : '';
            }
            return this.each(function () {
                this.setAttribute(name, value);
            });
        }
        unattr(name) {
            return this.each(function () {
                this.removeAttribute(name);
            });
        }
        css(prop, value) {
            if (typeof prop === 'object') {
                return this.each(function () {
                    const element = this;
                    for (const key in prop) {
                        element.style[key] = prop[key];
                    }
                });
            }
            if (value === undefined) {
                if (this.elements.length > 0) {
                    const styles = window.getComputedStyle(this.elements[0]);
                    return styles.getPropertyValue(prop);
                }
                return null;
            }
            return this.each(function () {
                const element = this;
                element.style[prop] = value;
            });
        }
        show() {
            return this.each(function () {
                this.style.display = '';
            });
        }
        hide() {
            return this.each(function () {
                this.style.display = 'none';
            });
        }
        toggle() {
            return this.each(function () {
                const element = this;
                element.style.display = element.style.display === 'none' ? '' : 'none';
            });
        }
        clone() {
            const elements = [];
            this.each(function () {
                elements.push(this.cloneNode(true));
            });
            return new OneKit(elements);
        }
        parent() {
            if (this.elements.length > 0) {
                return new OneKit(this.elements[0].parentNode);
            }
            return new OneKit();
        }
        kids(selector) {
            const elements = [];
            this.each(function () {
                const children = selector ?
                    this.querySelectorAll(selector) :
                    this.children;
                for (let i = 0; i < children.length; i++) {
                    elements.push(children[i]);
                }
            });
            return new OneKit(elements);
        }
        sibs(selector) {
            const elements = [];
            this.each(function () {
                if (this.parentNode) {
                    const siblings = this.parentNode.children;
                    for (let i = 0; i < siblings.length; i++) {
                        if (siblings[i] !== this && (!selector || siblings[i].matches?.(selector))) {
                            elements.push(siblings[i]);
                        }
                    }
                }
            });
            return new OneKit(elements);
        }
        append(content) {
            return this.each(function () {
                if (typeof content === 'string') {
                    const sanitized = sanitizeHTML(content);
                    this.insertAdjacentHTML('beforeend', sanitized);
                }
                else if (content instanceof Element) {
                    this.appendChild(content);
                }
                else if (content instanceof OneKit) {
                    for (let i = 0; i < content.elements.length; i++) {
                        this.appendChild(content.elements[i]);
                    }
                }
            });
        }
        prepend(content) {
            return this.each(function () {
                if (typeof content === 'string') {
                    const sanitized = sanitizeHTML(content);
                    this.insertAdjacentHTML('afterbegin', sanitized);
                }
                else if (content instanceof Element) {
                    this.insertBefore(content, this.firstChild);
                }
                else if (content instanceof OneKit) {
                    for (let i = content.elements.length - 1; i >= 0; i--) {
                        this.insertBefore(content.elements[i], this.firstChild);
                    }
                }
            });
        }
        remove() {
            return this.each(function () {
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            });
        }
        on(event, selector, handler) {
            if (typeof selector === 'function') {
                handler = selector;
                selector = undefined;
            }
            return this.each(function () {
                if (selector && handler) {
                    const delegatedSelector = selector;
                    this.addEventListener(event, function (e) {
                        if (e.target && e.target.matches?.(delegatedSelector)) {
                            handler.call(e.target, e);
                        }
                    });
                }
                else if (handler) {
                    this.addEventListener(event, handler);
                }
            });
        }
        off(event, handler) {
            return this.each(function () {
                this.removeEventListener(event, handler);
            });
        }
        click(handler) {
            return this.on('click', handler);
        }
        hover(enterHandler, leaveHandler) {
            return this.on('mouseenter', enterHandler).on('mouseleave', leaveHandler);
        }
        focus(handler) {
            return this.on('focus', handler);
        }
        // Animation methods
        fade_in(duration = 400) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    element.style.opacity = '0';
                    element.style.display = '';
                    const start = performance.now();
                    function animate(time) {
                        let timeFraction = (time - start) / duration;
                        if (timeFraction > 1)
                            timeFraction = 1;
                        element.style.opacity = timeFraction.toString();
                        if (timeFraction < 1) {
                            requestAnimationFrame(animate);
                        }
                        else {
                            resolve(element);
                        }
                    }
                    requestAnimationFrame(animate);
                });
            });
        }
        fade_out(duration = 400) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    const startOpacity = parseFloat(window.getComputedStyle(element).opacity);
                    const start = performance.now();
                    function animate(time) {
                        let timeFraction = (time - start) / duration;
                        if (timeFraction > 1)
                            timeFraction = 1;
                        element.style.opacity = (startOpacity * (1 - timeFraction)).toString();
                        if (timeFraction < 1) {
                            requestAnimationFrame(animate);
                        }
                        else {
                            element.style.display = 'none';
                            resolve(element);
                        }
                    }
                    requestAnimationFrame(animate);
                });
            });
        }
        slide_up(duration = 400) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    const height = element.scrollHeight;
                    element.style.height = height + 'px';
                    element.style.overflow = 'hidden';
                    element.style.transition = `height ${duration}ms`;
                    element.offsetHeight; // Force reflow
                    element.style.height = '0px';
                    setTimeout(() => {
                        element.style.display = 'none';
                        element.style.height = '';
                        element.style.overflow = '';
                        element.style.transition = '';
                        resolve(element);
                    }, duration);
                });
            });
        }
        slide_down(duration = 400) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    element.style.display = '';
                    const height = element.scrollHeight;
                    element.style.height = '0px';
                    element.style.overflow = 'hidden';
                    element.style.transition = `height ${duration}ms`;
                    element.offsetHeight; // Force reflow
                    element.style.height = height + 'px';
                    setTimeout(() => {
                        element.style.height = '';
                        element.style.overflow = '';
                        element.style.transition = '';
                        resolve(element);
                    }, duration);
                });
            });
        }
        animate(props, duration = 400) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    const startValues = {};
                    const changeValues = {};
                    for (const prop in props) {
                        const value = parseFloat(window.getComputedStyle(element)[prop]) || 0;
                        startValues[prop] = value;
                        changeValues[prop] = parseFloat(props[prop]) - value;
                    }
                    const start = performance.now();
                    function animateStep(time) {
                        let timeFraction = (time - start) / duration;
                        if (timeFraction > 1)
                            timeFraction = 1;
                        for (const prop in props) {
                            element.style[prop] = startValues[prop] + changeValues[prop] * timeFraction +
                                (typeof props[prop] === 'string' && props[prop].includes('px') ? 'px' : '');
                        }
                        if (timeFraction < 1) {
                            requestAnimationFrame(animateStep);
                        }
                        else {
                            resolve(element);
                        }
                    }
                    requestAnimationFrame(animateStep);
                });
            });
        }
        move(x, y, duration = 300) {
            return new Promise(resolve => {
                this.each(function () {
                    const element = this;
                    element.style.transition = `transform ${duration}ms ease-out`;
                    element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                    const handleTransitionEnd = () => {
                        element.removeEventListener('transitionend', handleTransitionEnd);
                        resolve(element);
                    };
                    element.addEventListener('transitionend', handleTransitionEnd);
                });
            });
        }
        // Form methods
        form_data() {
            if (this.elements.length === 0)
                return {};
            const form = this.elements[0];
            if (form.tagName !== 'FORM')
                return {};
            const data = {};
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const inputEl = input;
                if (inputEl.name && !inputEl.disabled) {
                    if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
                        if (inputEl.checked) {
                            if (data[inputEl.name] === undefined) {
                                data[inputEl.name] = inputEl.value;
                            }
                            else if (Array.isArray(data[inputEl.name])) {
                                data[inputEl.name].push(inputEl.value);
                            }
                            else {
                                data[inputEl.name] = [data[inputEl.name], inputEl.value];
                            }
                        }
                    }
                    else if (inputEl.type !== 'file') {
                        data[inputEl.name] = inputEl.value;
                    }
                }
            });
            return data;
        }
        reset() {
            return this.each(function () {
                if (this.tagName === 'FORM') {
                    this.reset();
                }
            });
        }
        // Utility methods
        isVisible() {
            if (this.elements.length === 0)
                return false;
            const el = this.elements[0];
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }
        inViewport(threshold = 0) {
            if (this.elements.length === 0)
                return false;
            const el = this.elements[0];
            const rect = el.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const windowWidth = window.innerWidth || document.documentElement.clientWidth;
            const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
            const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);
            return vertInView && horInView;
        }
        getDimensions() {
            if (this.elements.length === 0)
                return { width: 0, height: 0, innerWidth: 0, innerHeight: 0, top: 0, left: 0 };
            const el = this.elements[0];
            return {
                width: el.offsetWidth,
                height: el.offsetHeight,
                innerWidth: el.clientWidth,
                innerHeight: el.clientHeight,
                top: el.offsetTop,
                left: el.offsetLeft
            };
        }
        log() {
            if (this.elements.length > 0) {
                console.log(this.elements[0]);
            }
            return this;
        }
        info() {
            if (this.elements.length > 0) {
                console.log({
                    element: this.elements[0],
                    tagName: this.elements[0].tagName,
                    id: this.elements[0].id,
                    className: this.elements[0].className,
                    children: this.elements[0].children.length
                });
            }
            return this;
        }
    }
    // Main function
    function ok(selector) {
        return new OneKit(selector);
    }
    // Module registry
    const modules = {};
    ok.module = function (name, factory) {
        modules[name] = factory;
    };
    // Static cache
    OneKit._cache = new Map();
    OneKit.clearCache = function () {
        OneKit._cache.clear();
    };
    // Wrap critical methods with safeMethod
    const criticalMethods = [
        'find', 'html', 'text', 'attr', 'css', 'append', 'prepend',
        'remove', 'on', 'off', 'fade_in', 'fade_out', 'slide_up',
        'slide_down', 'animate', 'move'
    ];
    criticalMethods.forEach(methodName => {
        if (OneKit.prototype[methodName]) {
            const originalMethod = OneKit.prototype[methodName];
            OneKit.prototype[methodName] = safeMethod(originalMethod);
        }
    });
    // Initialize modules
    const moduleNames = ['component', 'reactive', 'vdom', 'animation', 'gesture', 'api', 'utils', 'form', 'plugin', 'a11y', 'theme', 'router', 'storage', 'crypto', 'physics', 'timeline', 'scene3d', 'csp', 'cli', 'stories', 'wasm'];
    moduleNames.forEach(name => {
        if (modules[name]) {
            modules[name]();
        }
    });
    // Global error handlers are installed only in browser environments.
    if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', function (event) {
            errorHandler(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });
        window.addEventListener('error', function (event) {
            errorHandler(event.error, 'JavaScript Error');
        });
    }
    // Expose to global
    if (typeof window !== 'undefined') {
        window.ok = ok;
        window.OneKit = OneKit;
    }
    // Core OneKit functionality - Refactored into ES modules

    class DependencyInjector {
        services = new Map();
        instances = new Map();
        register(name, factory, dependencies = [], singleton = true) {
            this.services.set(name, { factory, dependencies, singleton });
        }
        resolve(name) {
            const service = this.services.get(name);
            if (!service) {
                throw new Error(`Service "${name}" not registered`);
            }
            if (service.singleton && this.instances.has(name)) {
                return this.instances.get(name).instance;
            }
            const deps = service.dependencies?.map(dep => this.resolve(dep)) || [];
            const instance = service.factory(...deps);
            if (service.singleton) {
                this.instances.set(name, { instance, singleton: true });
            }
            return instance;
        }
        has(name) {
            return this.services.has(name);
        }
        clear() {
            this.services.clear();
            this.instances.clear();
        }
    }
    const di = new DependencyInjector();

    class OneKitPluginManager {
        plugins = new Map();
        installed = new Set();
        register(plugin, options) {
            if (this.plugins.has(plugin.name)) {
                console.warn(`Plugin "${plugin.name}" is already registered. Overwriting...`);
            }
            this.plugins.set(plugin.name, plugin);
            // Auto-install if not already installed
            if (!this.installed.has(plugin.name)) {
                try {
                    plugin.install({}, options);
                    this.installed.add(plugin.name);
                }
                catch (error) {
                    console.error(`Failed to install plugin "${plugin.name}":`, error);
                }
            }
        }
        unregister(name) {
            const plugin = this.plugins.get(name);
            if (plugin && plugin.uninstall) {
                try {
                    plugin.uninstall({});
                    this.installed.delete(name);
                }
                catch (error) {
                    console.error(`Failed to uninstall plugin "${name}":`, error);
                }
            }
            this.plugins.delete(name);
        }
        get(name) {
            return this.plugins.get(name);
        }
        list() {
            return Array.from(this.plugins.values());
        }
        clear() {
            for (const [name, plugin] of this.plugins) {
                if (plugin.uninstall && this.installed.has(name)) {
                    try {
                        plugin.uninstall({});
                    }
                    catch (error) {
                        console.error(`Failed to uninstall plugin "${name}":`, error);
                    }
                }
            }
            this.plugins.clear();
            this.installed.clear();
        }
    }
    const pluginManager = new OneKitPluginManager();

    // Reactive State Management Module (Vue 3-style)
    // Global state
    const state = {};
    const watchers = {};
    // Dependency tracking
    const targetMap = new WeakMap();
    const proxyCache = new WeakMap();
    let activeEffect = null;
    const effectStack = [];
    // Batch updates
    let isBatching = false;
    const updateQueue = new Set();
    let isFlushing = false;
    function queueJob(job) {
        if (!updateQueue.has(job)) {
            updateQueue.add(job);
            if (!isFlushing) {
                isFlushing = true;
                queueMicrotask(flushJobs);
            }
        }
    }
    function flushJobs() {
        updateQueue.forEach(job => job());
        updateQueue.clear();
        isFlushing = false;
    }
    function cleanup(effectFn) {
        effectFn.deps.forEach(dep => dep.delete(effectFn));
        effectFn.deps.length = 0;
    }
    function track(target, key) {
        if (!activeEffect || activeEffect.stopped)
            return;
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            depsMap = new Map();
            targetMap.set(target, depsMap);
        }
        let dep = depsMap.get(key);
        if (!dep) {
            dep = new Set();
            depsMap.set(key, dep);
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
        }
    }
    function trigger(target, key, oldValue, newValue) {
        emitDevToolsEvent({
            type: 'reactive:trigger',
            targetId: getDevToolsTargetId(target),
            key: String(key),
            oldValue,
            newValue
        });
        const depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        const dep = depsMap.get(key);
        if (!dep)
            return;
        const effectsToRun = new Set(dep);
        effectsToRun.forEach(effect => {
            if (effect.options?.scheduler) {
                effect.options.scheduler(effect);
            }
            else {
                if (isBatching) {
                    queueJob(effect);
                }
                else {
                    effect();
                }
            }
        });
    }
    function reactive(obj) {
        const cached = proxyCache.get(obj);
        if (cached)
            return cached;
        const proxy = new Proxy(obj, {
            get(target, key, receiver) {
                const result = Reflect.get(target, key, receiver);
                track(target, key);
                if (typeof result === 'object' && result !== null) {
                    return reactive(result);
                }
                return result;
            },
            set(target, key, value, receiver) {
                const oldValue = Reflect.get(target, key, receiver);
                const result = Reflect.set(target, key, value, receiver);
                if (oldValue !== value) {
                    trigger(target, key, oldValue, value);
                    // Also trigger watchers for backward compatibility
                    if (watchers[key]) {
                        watchers[key].forEach(watcher => {
                            watcher.callback(value, oldValue, watcher.property);
                        });
                    }
                }
                return result;
            }
        });
        proxyCache.set(obj, proxy);
        return proxy;
    }
    function computed(getter) {
        let value;
        let dirty = true;
        const effectFn = effect(() => {
            value = getter();
        }, {
            lazy: true,
            scheduler: () => {
                dirty = true;
                trigger(computedRef, 'value');
            }
        });
        const computedRef = {
            get value() {
                if (dirty) {
                    effectFn();
                    dirty = false;
                }
                track(computedRef, 'value');
                return value;
            },
            __isComputed: true
        };
        return computedRef;
    }
    function effect(fn, options = {}) {
        const effectFn = (() => {
            if (effectFn.stopped || effectStack.includes(effectFn)) {
                return; // Prevent infinite recursion
            }
            emitDevToolsEvent({ type: 'reactive:effect', effectId: getDevToolsEffectId(effectFn), phase: 'run' });
            cleanup(effectFn);
            try {
                effectStack.push(effectFn);
                activeEffect = effectFn;
                return fn();
            }
            finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1] || null;
            }
        });
        effectFn.deps = [];
        effectFn.options = options;
        if (!options.lazy) {
            effectFn();
        }
        onScopeDispose(() => stop(effectFn));
        return effectFn;
    }
    function stop(runner) {
        const effectFn = runner;
        effectFn.stopped = true;
        emitDevToolsEvent({ type: 'reactive:effect', effectId: getDevToolsEffectId(effectFn), phase: 'stop' });
        cleanup(effectFn);
    }
    // Alias for effect
    const autorun = effect;
    function watch(source, callback, options = {}) {
        let getter;
        let oldValue;
        if (typeof source === 'string' || typeof source === 'symbol') {
            const key = source;
            getter = () => state[key];
            // Backward compatibility
            if (!watchers[key]) {
                watchers[key] = [];
            }
            const watcher = { callback: callback, property: key };
            watchers[key].push(watcher);
            return () => {
                const index = watchers[key].indexOf(watcher);
                if (index > -1) {
                    watchers[key].splice(index, 1);
                }
            };
        }
        else if (typeof source === 'function') {
            getter = source;
        }
        else if (typeof source === 'object' && source !== null) {
            getter = () => traverse(source, options.deep ?? true);
        }
        else {
            throw new Error('Invalid watch source');
        }
        const job = () => {
            const newValue = runner();
            callback(newValue, oldValue);
            oldValue = newValue;
        };
        const runner = effect(getter, {
            lazy: true,
            scheduler: job
        });
        if (options.immediate) {
            job();
        }
        else {
            oldValue = runner();
        }
        return () => {
            stop(runner);
        };
    }
    function traverse(value, deep = false) {
        if (!deep || typeof value !== 'object' || value === null) {
            return value;
        }
        for (const key in value) {
            traverse(value[key], deep);
        }
        return value;
    }
    function batch(fn) {
        isBatching = true;
        try {
            return fn();
        }
        finally {
            isBatching = false;
            flushJobs();
        }
    }
    function nextTick(callback) {
        return Promise.resolve().then(() => callback?.());
    }
    function snapshot(obj) {
        return deepCloneSafe(obj);
    }
    function bind(element, reactiveObj, property, attribute = 'value') {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el)
            return;
        // Validate property to prevent prototype pollution
        if (!validateStorageKey(property)) {
            console.error('OneKit Security: Invalid property key (prototype pollution attempt blocked)');
            return;
        }
        // Set initial value
        const initialValue = reactiveObj[property];
        if (initialValue !== undefined) {
            el[attribute] = initialValue;
        }
        el.addEventListener('input', function () {
            // Sanitize input value
            let value = this[attribute];
            if (typeof value === 'string') {
                // For text inputs, sanitize but preserve content
                value = value.replace(/\0/g, ''); // Remove null bytes
            }
            reactiveObj[property] = value;
        });
        watch(property, function (newValue) {
            // Sanitize output value for HTML attributes
            if (typeof newValue === 'string' && attribute === 'innerHTML') {
                el[attribute] = newValue; // Note: sanitization should be handled by caller
            }
            else {
                el[attribute] = newValue;
            }
        });
    }

    const blockedIdentifiers = new Set(['globalThis', 'window', 'document', 'Function', 'eval', 'constructor', '__proto__', 'prototype', 'import', 'new']);
    function tokenize(input) {
        const tokens = [];
        let index = 0;
        while (index < input.length) {
            const rest = input.slice(index);
            const whitespace = rest.match(/^\s+/);
            if (whitespace) {
                index += whitespace[0].length;
                continue;
            }
            const string = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
            if (string) {
                tokens.push({ type: 'string', value: string[0] });
                index += string[0].length;
                continue;
            }
            const number = rest.match(/^\d+(?:\.\d+)?/);
            if (number) {
                tokens.push({ type: 'number', value: number[0] });
                index += number[0].length;
                continue;
            }
            const identifier = rest.match(/^[A-Za-z_$][\w$]*/);
            if (identifier) {
                if (blockedIdentifiers.has(identifier[0]))
                    throw new Error(`Blocked identifier: ${identifier[0]}`);
                tokens.push({ type: 'identifier', value: identifier[0] });
                index += identifier[0].length;
                continue;
            }
            const operator = rest.match(/^(===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%><!?:.,()[\]])/);
            if (operator) {
                const value = operator[0];
                tokens.push({ type: value.match(/^[()[\].,?:]$/) ? 'punctuation' : 'operator', value });
                index += value.length;
                continue;
            }
            throw new Error(`Unsupported token near: ${rest.slice(0, 12)}`);
        }
        tokens.push({ type: 'eof', value: '' });
        return tokens;
    }
    class Parser {
        tokens;
        context;
        index = 0;
        constructor(tokens, context) {
            this.tokens = tokens;
            this.context = context;
        }
        parse() {
            const result = this.parseConditional();
            if (this.peek().type !== 'eof')
                throw new Error(`Unexpected token: ${this.peek().value}`);
            return result;
        }
        peek() { return this.tokens[this.index]; }
        take(value) {
            const token = this.peek();
            if (value && token.value !== value)
                throw new Error(`Expected ${value}, received ${token.value}`);
            this.index += 1;
            return token;
        }
        parseConditional() {
            const condition = this.parseOr();
            if (this.peek().value !== '?')
                return condition;
            this.take('?');
            const whenTrue = this.parseConditional();
            this.take(':');
            const whenFalse = this.parseConditional();
            return condition ? whenTrue : whenFalse;
        }
        parseOr() {
            let value = this.parseAnd();
            while (this.peek().value === '||') {
                this.take();
                const right = this.parseAnd();
                value = value || right;
            }
            return value;
        }
        parseAnd() {
            let value = this.parseEquality();
            while (this.peek().value === '&&') {
                this.take();
                const right = this.parseEquality();
                value = value && right;
            }
            return value;
        }
        parseEquality() {
            let value = this.parseComparison();
            while (['===', '!==', '==', '!='].includes(this.peek().value)) {
                const operator = this.take().value;
                const right = this.parseComparison();
                value = operator === '===' ? value === right : operator === '!==' ? value !== right : operator === '==' ? value == right : value != right;
            }
            return value;
        }
        parseComparison() {
            let value = this.parseTerm();
            while (['>', '<', '>=', '<='].includes(this.peek().value)) {
                const operator = this.take().value;
                const right = this.parseTerm();
                if (operator === '>')
                    value = value > right;
                if (operator === '<')
                    value = value < right;
                if (operator === '>=')
                    value = value >= right;
                if (operator === '<=')
                    value = value <= right;
            }
            return value;
        }
        parseTerm() {
            let value = this.parseFactor();
            while (['+', '-'].includes(this.peek().value)) {
                const operator = this.take().value;
                const right = this.parseFactor();
                value = operator === '+' ? value + right : value - right;
            }
            return value;
        }
        parseFactor() {
            let value = this.parseUnary();
            while (['*', '/', '%'].includes(this.peek().value)) {
                const operator = this.take().value;
                const right = this.parseUnary();
                if (operator === '*')
                    value = value * right;
                if (operator === '/')
                    value = value / right;
                if (operator === '%')
                    value = value % right;
            }
            return value;
        }
        parseUnary() {
            if (this.peek().value === '!') {
                this.take();
                return !this.parseUnary();
            }
            if (this.peek().value === '-') {
                this.take();
                return -this.parseUnary();
            }
            if (this.peek().value === '+') {
                this.take();
                return +this.parseUnary();
            }
            return this.parsePostfix().value;
        }
        parsePostfix() {
            let reference = this.parsePrimary();
            while (this.peek().value === '.' || this.peek().value === '[' || this.peek().value === '(') {
                if (this.peek().value === '.') {
                    this.take('.');
                    const key = this.take().value;
                    if (blockedIdentifiers.has(key))
                        throw new Error(`Blocked property: ${key}`);
                    const owner = reference.value;
                    reference = { value: owner == null ? undefined : owner[key], owner };
                }
                else if (this.peek().value === '[') {
                    this.take('[');
                    const key = this.parseConditional();
                    this.take(']');
                    const owner = reference.value;
                    reference = { value: owner == null ? undefined : owner[key], owner };
                }
                else {
                    this.take('(');
                    const args = [];
                    if (this.peek().value !== ')') {
                        do {
                            args.push(this.parseConditional());
                        } while (this.peek().value === ',' && (this.take(), true));
                    }
                    this.take(')');
                    if (typeof reference.value !== 'function')
                        throw new Error('Expression value is not callable');
                    reference = { value: reference.value.apply(reference.owner ?? this.context, args), owner: this.context };
                }
            }
            return reference;
        }
        parsePrimary() {
            const token = this.take();
            if (token.type === 'number')
                return { value: Number(token.value), owner: this.context };
            if (token.type === 'string')
                return { value: JSON.parse(token.value[0] === '"' ? token.value : `"${token.value.slice(1, -1).replace(/"/g, '\\"')}"`), owner: this.context };
            if (token.value === '(') {
                const value = this.parseConditional();
                this.take(')');
                return { value, owner: this.context };
            }
            if (token.type === 'identifier') {
                if (token.value === 'true')
                    return { value: true, owner: this.context };
                if (token.value === 'false')
                    return { value: false, owner: this.context };
                if (token.value === 'null')
                    return { value: null, owner: this.context };
                return { value: this.context[token.value], owner: this.context };
            }
            throw new Error(`Unexpected token: ${token.value}`);
        }
    }
    function evaluateSafeExpression(expression, context) {
        if (!expression.trim() || /[;{}]|=>|`/.test(expression))
            return undefined;
        try {
            return new Parser(tokenize(expression), context ?? {}).parse();
        }
        catch {
            return undefined;
        }
    }

    // Template Engine Module with Directives
    const directives = {};
    // Register a directive
    function registerDirective(name, handler) {
        directives[name] = handler;
    }
    // Parse directive from attribute name
    function parseDirective(attrName) {
        const directiveRegex = /^ok-([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.*))?$/;
        const match = attrName.match(directiveRegex);
        if (!match)
            return null;
        const name = match[1];
        const modifiers = match[2] ? match[2].split('.') : [];
        return { name, modifiers, rawName: attrName };
    }
    // Evaluate the deliberately small, side-effect-limited expression grammar.
    // No dynamic JavaScript compilation is used here.
    function evaluateExpression(expression, context) {
        return evaluateSafeExpression(expression, context ?? {});
    }
    function assignExpression(expression, context, value) {
        const path = expression.trim().split('.');
        if (!path.length || path.some(part => !/^[A-Za-z_$][\w$]*$/.test(part)))
            return false;
        let target = context;
        for (const key of path.slice(0, -1)) {
            if (target == null || typeof target !== 'object')
                return false;
            target = target[key];
        }
        if (target == null || typeof target !== 'object')
            return false;
        target[path[path.length - 1]] = value;
        return true;
    }
    // Compile template with directives
    function compileTemplate(template, context) {
        // Create a temporary container
        const container = document.createElement('div');
        container.innerHTML = sanitizeHTML(template);
        // Process all elements for directives
        const elements = container.querySelectorAll('*');
        const directiveBindings = [];
        elements.forEach(element => {
            const attributes = Array.from(element.attributes);
            attributes.forEach(attr => {
                const directive = parseDirective(attr.name);
                if (!directive)
                    return;
                const { name, modifiers, rawName } = directive;
                const expression = attr.value;
                // Remove the directive attribute
                element.removeAttribute(rawName);
                // Store binding for later processing
                directiveBindings.push({
                    element,
                    directive: name,
                    expression,
                    modifiers
                });
            });
        });
        // Process directive bindings
        directiveBindings.forEach(binding => {
            const handler = directives[binding.directive];
            if (!handler) {
                console.warn(`Unknown directive: o-${binding.directive}`);
                return;
            }
            const directiveCtx = {
                element: binding.element,
                expression: binding.expression,
                modifiers: binding.modifiers,
                rootContext: context
            };
            // Create reactive binding
            const getter = () => evaluateExpression(binding.expression, context);
            if (handler.bind) {
                // Event expressions must run only when the event fires, not during bind.
                directiveCtx.value = binding.directive === 'on' ? undefined : getter();
                handler.bind(directiveCtx);
            }
            if (handler.update) {
                // Create effect for reactive updates
                const effectFn = effect(() => {
                    const newValue = getter();
                    directiveCtx.oldValue = directiveCtx.value;
                    directiveCtx.value = newValue;
                    handler.update(directiveCtx);
                });
                binding.cleanup = () => {
                    stop(effectFn);
                    handler.unbind?.(directiveCtx);
                };
                binding.element.__onekitTemplateCleanup = binding.cleanup;
            }
        });
        // Return the first child (the actual template content)
        return container.firstElementChild || container;
    }
    // Built-in directives
    // ok-if directive
    registerDirective('if', {
        bind(ctx) {
            ctx.element.style.display = ctx.value ? '' : 'none';
        },
        update(ctx) {
            ctx.element.style.display = ctx.value ? '' : 'none';
        }
    });
    // v-show directive
    registerDirective('show', {
        bind(ctx) {
            ctx.element.style.display = ctx.value ? '' : 'none';
        },
        update(ctx) {
            ctx.element.style.display = ctx.value ? '' : 'none';
        }
    });
    // ok-for directive
    registerDirective('for', {
        bind(ctx) {
            // ok-for="item in items" or ok-for="(item, index) in items"
            const forMatch = ctx.expression.match(/^\s*\(?(\w+)(?:\s*,\s*(\w+))?\)?\s+in\s+(.+)$/);
            if (!forMatch) {
                console.error('Invalid ok-for expression:', ctx.expression);
                return;
            }
            const [, itemName, indexName, collectionExpr] = forMatch;
            const collection = evaluateExpression(collectionExpr, ctx.rootContext);
            if (!Array.isArray(collection)) {
                console.error('ok-for collection must be an array:', collectionExpr);
                return;
            }
            // Store original element
            const originalElement = ctx.element;
            const parent = originalElement.parentElement;
            if (!parent)
                return;
            // Remove original element
            parent.removeChild(originalElement);
            // Determine insertion behavior from modifiers: numeric index, 'start' or 'prepend'
            const insertModifier = (ctx.modifiers || []).find((m) => /^\d+$/.test(m) || m === 'start' || m === 'prepend');
            // Build clones first so we can insert them in a fragment to preserve order
            const clones = [];
            collection.forEach((item, index) => {
                const clone = originalElement.cloneNode(true);
                // Create item context
                const itemContext = { [itemName]: item };
                if (indexName) {
                    itemContext[indexName] = index;
                }
                // Compile clone with merged root context and item context
                const compiledClone = compileTemplate(clone.outerHTML, { ...ctx.rootContext, ...itemContext });
                clones.push(compiledClone);
            });
            if (insertModifier) {
                // Numeric index
                let insertIndex;
                if (/^\d+$/.test(insertModifier)) {
                    insertIndex = parseInt(insertModifier, 10);
                }
                else if (insertModifier === 'start' || insertModifier === 'prepend') {
                    insertIndex = 0;
                }
                const fragment = document.createDocumentFragment();
                clones.forEach(c => fragment.appendChild(c));
                if (typeof insertIndex === 'number') {
                    const refChild = parent.children[insertIndex] || null;
                    parent.insertBefore(fragment, refChild);
                }
                else {
                    // Fallback to append
                    parent.appendChild(fragment);
                }
            }
            else {
                // Default: append in order
                clones.forEach(c => parent.appendChild(c));
            }
        }
    });
    // v-bind directive
    registerDirective('bind', {
        bind(ctx) {
            updateBind(ctx);
        },
        update(ctx) {
            updateBind(ctx);
        }
    });
    function updateBind(ctx) {
        const element = ctx.element;
        const attrName = ctx.modifiers[0] || 'value'; // Default to 'value' if no modifier
        if (attrName === 'class') {
            element.className = ctx.value;
        }
        else if (attrName === 'style') {
            Object.assign(element.style, ctx.value);
        }
        else {
            element.setAttribute(attrName, ctx.value);
        }
    }
    // o-model directive
    registerDirective('model', {
        bind(ctx) {
            const element = ctx.element;
            const eventType = getEventType(element);
            // Set initial value
            setElementValue(element, ctx.value);
            // Listen for changes
            const handler = () => {
                const newValue = getElementValue(element);
                if (!assignExpression(ctx.expression, ctx.rootContext, newValue)) {
                    console.error('ok-model expression must be an assignable property path:', ctx.expression);
                }
            };
            element.addEventListener(eventType, handler);
            // Store cleanup
            element._vmodelCleanup = handler;
        },
        update(ctx) {
            const element = ctx.element;
            setElementValue(element, ctx.value);
        },
        unbind(ctx) {
            const element = ctx.element;
            const handler = element._vmodelCleanup;
            if (handler) {
                const eventType = getEventType(element);
                element.removeEventListener(eventType, handler);
            }
        }
    });
    function getEventType(element) {
        const tagName = element.tagName.toLowerCase();
        const type = element.type;
        if (tagName === 'select')
            return 'change';
        if (type === 'checkbox' || type === 'radio')
            return 'change';
        return 'input';
    }
    function getElementValue(element) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'select') {
            const select = element;
            if (select.multiple) {
                return Array.from(select.selectedOptions).map(option => option.value);
            }
            return select.value;
        }
        const inputElement = element;
        const type = inputElement.type;
        if (type === 'checkbox') {
            return inputElement.checked;
        }
        if (type === 'radio') {
            return inputElement.checked ? inputElement.value : undefined;
        }
        if (type === 'number') {
            return parseFloat(inputElement.value) || 0;
        }
        return inputElement.value;
    }
    function setElementValue(element, value) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'select') {
            const select = element;
            if (select.multiple && Array.isArray(value)) {
                Array.from(select.options).forEach(option => {
                    option.selected = value.includes(option.value);
                });
            }
            else {
                select.value = value;
            }
            return;
        }
        const inputElement = element;
        const type = inputElement.type;
        if (type === 'checkbox') {
            inputElement.checked = Boolean(value);
            return;
        }
        if (type === 'radio') {
            inputElement.checked = inputElement.value === value;
            return;
        }
        inputElement.value = value;
    }
    // v-on directive
    registerDirective('on', {
        bind(ctx) {
            const element = ctx.element;
            const eventType = ctx.modifiers[0] || 'click'; // Default to click
            const handler = (event) => {
                // Prevent default if .prevent modifier
                if (ctx.modifiers.includes('prevent')) {
                    event.preventDefault();
                }
                // Stop propagation if .stop modifier
                if (ctx.modifiers.includes('stop')) {
                    event.stopPropagation();
                }
                // Evaluate against the root context and expose the DOM event explicitly.
                evaluateExpression(ctx.expression, { ...ctx.rootContext, $event: event });
            };
            element.addEventListener(eventType, handler);
            // Store cleanup
            element._vonCleanup = { eventType, handler };
        },
        unbind(ctx) {
            const element = ctx.element;
            const cleanup = element._vonCleanup;
            if (cleanup) {
                element.removeEventListener(cleanup.eventType, cleanup.handler);
            }
        }
    });
    // Initialize built-in directives
    function initTemplateEngine() {
        // Directives are already registered above
    }

    // Component System Module
    const components = {};
    const componentInstances = new Map();
    registerDevToolsInspector('components', () => Array.from(componentInstances.values()).map((instance) => ({
        id: instance.componentId,
        name: instance.name,
        mounted: instance.mounted,
        props: instance.props,
        state: instance.state,
    })));
    // Lifecycle hooks registry for composition API style
    const lifecycleHooks = new WeakMap();
    // Current component instance for composition API
    let currentInstance = null;
    // Props validation utilities
    function validatePropType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            case 'function':
                return typeof value === 'function';
            case 'symbol':
                return typeof value === 'symbol';
            default:
                return false;
        }
    }
    function validateProps(props, propDefs, componentName) {
        const validatedProps = {};
        const missingRequired = [];
        const typeErrors = [];
        // Process each prop definition
        for (const propName in propDefs) {
            const def = propDefs[propName];
            const propDef = typeof def === 'string' ? { type: def } : def;
            const providedValue = props[propName];
            // Check if required prop is missing
            if (propDef.required && (providedValue === undefined || providedValue === null)) {
                missingRequired.push(propName);
                continue;
            }
            // Use default value if prop is not provided
            let finalValue = providedValue;
            if (finalValue === undefined || finalValue === null) {
                if (propDef.default !== undefined) {
                    finalValue = typeof propDef.default === 'function' ? propDef.default() : propDef.default;
                }
            }
            // Type validation
            if (finalValue !== undefined && propDef.type) {
                const types = Array.isArray(propDef.type) ? propDef.type : [propDef.type];
                const isValidType = types.some(type => validatePropType(finalValue, type));
                if (!isValidType) {
                    typeErrors.push(`${propName}: expected ${types.join(' or ')}, got ${typeof finalValue}`);
                }
            }
            // Custom validator
            if (finalValue !== undefined && propDef.validator && !propDef.validator(finalValue)) {
                typeErrors.push(`${propName}: custom validation failed`);
            }
            validatedProps[propName] = finalValue;
        }
        // Add any extra props that weren't defined (for flexibility)
        for (const propName in props) {
            if (!(propName in propDefs)) {
                validatedProps[propName] = props[propName];
            }
        }
        // Log validation errors in development
        if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
            (typeof window !== 'undefined' && window.__ONEKIT_DEV__)) {
            if (missingRequired.length > 0) {
                console.warn(`[OneKit] Component "${componentName}": Missing required props: ${missingRequired.join(', ')}`);
            }
            if (typeErrors.length > 0) {
                console.warn(`[OneKit] Component "${componentName}": Prop validation errors:`, typeErrors);
            }
        }
        return validatedProps;
    }
    function defineComponent(definition) {
        return definition;
    }
    function register(name, definition) {
        components[name] = definition;
    }
    function create(name, props = {}, slots = {}) {
        if (!components[name]) {
            console.error(`Component "${name}" not found`);
            return null;
        }
        const definition = components[name];
        // Validate and process props
        const validatedProps = definition.props ? validateProps(props, definition.props, name) : props;
        const instance = {
            name,
            props: validatedProps,
            scope: effectScope(true),
            componentId: getDevToolsTargetId({}),
            slots,
            state: definition.data ? deepCloneSafe(definition.data()) : {},
            element: null,
            mounted: false,
            listeners: [],
            update: function () { } // Placeholder, will be overridden
        };
        // Add methods
        if (definition.methods) {
            Object.keys(definition.methods).forEach(method => {
                instance[method] = function (...args) {
                    return definition.methods[method].call(instance, ...args);
                };
            });
        }
        // Unified update method for reactive updates
        instance.update = function () {
            if (this.element) {
                if (definition.beforeUpdate) {
                    definition.beforeUpdate.call(this);
                }
                let html = '';
                if (definition.template) {
                    html = definition.template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                        const keys = key.trim().split('.');
                        let value = this.state;
                        if (keys[0] in this.props) {
                            value = this.props;
                        }
                        for (const k of keys) {
                            value = value && value[k];
                        }
                        return value !== undefined ? value : '';
                    });
                    // Replace slots
                    html = html.replace(/<slot><\/slot>/gi, this.slots.default || '');
                    html = html.replace(/<slot name="([^"]+)"><\/slot>/gi, (match, slotName) => {
                        return this.slots[slotName] || '';
                    });
                }
                else if (definition.render) {
                    html = definition.render.call(this);
                }
                if (html) {
                    // Sanitize HTML before rendering
                    const sanitized = sanitizeHTML(html);
                    const newElement = document.createElement('div');
                    newElement.innerHTML = sanitized;
                    if (this.element.firstChild) {
                        this.element.replaceChild(newElement.firstChild, this.element.firstChild);
                    }
                    else {
                        this.element.appendChild(newElement.firstChild);
                    }
                    // Re-attach event listeners after update
                    if (definition.methods && this.element) {
                        Object.keys(definition.methods).forEach(method => {
                            const events = this.element.querySelectorAll(`[data-on-${method}]`);
                            events.forEach((el) => {
                                el.addEventListener(method.split('on')[1], (e) => {
                                    e.preventDefault();
                                    const methodFn = this[method];
                                    if (typeof methodFn === 'function') {
                                        methodFn(e);
                                    }
                                });
                            });
                        });
                    }
                }
                emitDevToolsEvent({ type: 'component:lifecycle', componentId: this.componentId, name: this.name, phase: 'update' });
                definition.updated?.call(this);
            }
        };
        // Create element
        if (definition.template) {
            // Use template engine with directives
            const context = { ...instance.state, ...instance.props, $slots: instance.slots };
            instance.element = compileTemplate(definition.template, context);
        }
        else if (definition.render) {
            const html = definition.render.call(instance);
            const sanitized = sanitizeHTML(html);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sanitized;
            instance.element = tempDiv.firstElementChild;
        }
        // Add lifecycle hooks
        definition.beforeCreate?.call(instance);
        definition.created?.call(instance);
        emitDevToolsEvent({ type: 'component:lifecycle', componentId: instance.componentId, name: instance.name, phase: 'create' });
        // Store instance
        if (instance.element) {
            componentInstances.set(instance.element, instance);
        }
        return instance;
    }
    function mount(component, target) {
        let comp;
        if (typeof component === 'string') {
            comp = create(component);
        }
        else {
            comp = component;
        }
        if (!comp || !comp.element) {
            console.error('Invalid component');
            return null;
        }
        const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
        if (!targetElement) {
            console.error('Invalid target element');
            return null;
        }
        targetElement.appendChild(comp.element);
        comp.mounted = true;
        emitDevToolsEvent({ type: 'component:lifecycle', componentId: comp.componentId, name: comp.name, phase: 'mount' });
        const definition = components[comp.name];
        comp.scope.run(() => {
            definition?.mounted?.call(comp);
            // Call composition API onMounted hooks
            const hooks = lifecycleHooks.get(comp);
            if (hooks?.onMounted) {
                hooks.onMounted.forEach(hook => hook());
            }
        });
        return comp;
    }
    const unmount = destroy;
    function getInstance(element) {
        return componentInstances.get(element);
    }
    function destroy(component) {
        if (!component || !component.element)
            return;
        const definition = components[component.name];
        definition?.beforeUnmount?.call(component);
        // Call composition API onDestroyed hooks
        const hooks = lifecycleHooks.get(component);
        if (hooks?.onDestroyed) {
            hooks.onDestroyed.forEach(hook => hook());
        }
        if (component.element.parentNode) {
            component.element.parentNode.removeChild(component.element);
        }
        component.listeners.forEach((listener) => {
            if (typeof listener === 'object' && listener !== null && 'element' in listener && 'event' in listener && 'handler' in listener) {
                const { element, event, handler } = listener;
                element.removeEventListener(event, handler);
            }
        });
        componentInstances.delete(component.element);
        component.mounted = false;
        if (definition && definition.unmounted) {
            definition.unmounted.call(component);
        }
        component.scope.dispose();
        emitDevToolsEvent({ type: 'component:lifecycle', componentId: component.componentId, name: component.name, phase: 'unmount' });
    }
    // Composition API lifecycle hooks
    function onMounted(callback) {
        if (!currentInstance) {
            console.warn('[OneKit] onMounted() called outside of component setup');
            return;
        }
        let hooks = lifecycleHooks.get(currentInstance);
        if (!hooks) {
            hooks = {
                onMounted: [],
                onUpdated: [],
                onDestroyed: [],
                onPropsChanged: []
            };
            lifecycleHooks.set(currentInstance, hooks);
        }
        hooks.onMounted.push(callback);
    }
    function onUpdated(callback) {
        if (!currentInstance) {
            console.warn('[OneKit] onUpdated() called outside of component setup');
            return;
        }
        let hooks = lifecycleHooks.get(currentInstance);
        if (!hooks) {
            hooks = {
                onMounted: [],
                onUpdated: [],
                onDestroyed: [],
                onPropsChanged: []
            };
            lifecycleHooks.set(currentInstance, hooks);
        }
        hooks.onUpdated.push(callback);
    }
    function onDestroyed(callback) {
        if (!currentInstance) {
            console.warn('[OneKit] onDestroyed() called outside of component setup');
            return;
        }
        let hooks = lifecycleHooks.get(currentInstance);
        if (!hooks) {
            hooks = {
                onMounted: [],
                onUpdated: [],
                onDestroyed: [],
                onPropsChanged: []
            };
            lifecycleHooks.set(currentInstance, hooks);
        }
        hooks.onDestroyed.push(callback);
    }
    function onPropsChanged(callback) {
        if (!currentInstance) {
            console.warn('[OneKit] onPropsChanged() called outside of component setup');
            return;
        }
        let hooks = lifecycleHooks.get(currentInstance);
        if (!hooks) {
            hooks = {
                onMounted: [],
                onUpdated: [],
                onDestroyed: [],
                onPropsChanged: []
            };
            lifecycleHooks.set(currentInstance, hooks);
        }
        hooks.onPropsChanged.push(callback);
    }
    // Setup function for composition API
    function setupComponent(instance, setupFn) {
        const prevInstance = currentInstance;
        currentInstance = instance;
        try {
            return instance.scope.run(() => setupFn(instance.props));
        }
        finally {
            currentInstance = prevInstance;
        }
    }

    /* OneKit style: predictable DOM ownership, keyed updates, explicit prop diffing, and small renderer primitives. */
    function createElement(tag, props = {}, ...children) {
        const normalized = children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false).map(child => typeof child === 'object' ? child : String(child));
        return {
            tag,
            props: props || {},
            children: normalized,
            key: props?.key
        };
    }
    function isFragment(vnode) { return vnode.tag === 'fragment'; }
    function setProp(element, prop, value, oldValue) {
        if (prop === 'key' || prop === 'children')
            return;
        if (prop === 'ref') {
            if (typeof value === 'function')
                value(element);
            else if (value && typeof value === 'object')
                value.current = element;
            return;
        }
        if (prop.startsWith('on')) {
            const event = prop.slice(2).toLowerCase();
            if (oldValue && oldValue !== value)
                element.removeEventListener(event, oldValue);
            if (typeof value === 'function' && value !== oldValue)
                element.addEventListener(event, value);
            return;
        }
        if (prop === 'className') {
            if (value == null || value === false)
                element.removeAttribute('class');
            else
                element.setAttribute('class', String(value));
            return;
        }
        if (prop === 'style' && value && typeof value === 'object') {
            const style = element.style;
            const previous = (oldValue && typeof oldValue === 'object') ? oldValue : {};
            Object.keys(previous).forEach(key => { if (!(key in value))
                style.removeProperty(key); });
            Object.entries(value).forEach(([key, item]) => style.setProperty(key, String(item)));
            return;
        }
        if (value == null || value === false) {
            element.removeAttribute(prop);
            const booleanProps = new Set(['checked', 'disabled', 'hidden', 'multiple', 'muted', 'required', 'readOnly', 'selected']);
            if (booleanProps.has(prop) && prop in element) {
                try {
                    element[prop] = false;
                }
                catch { /* read-only DOM property */ }
            }
            return;
        }
        if (value === true) {
            element.setAttribute(prop, '');
            return;
        }
        if (prop in element && typeof value !== 'string') {
            try {
                element[prop] = value;
                return;
            }
            catch { /* fall through to attribute */ }
        }
        element.setAttribute(prop, String(value));
    }
    function updateProps(element, next, previous) {
        const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
        keys.forEach(prop => setProp(element, prop, next[prop], previous[prop]));
    }
    function render(vnode) {
        if (typeof vnode === 'string')
            return document.createTextNode(vnode);
        if (isFragment(vnode)) {
            const fragment = document.createDocumentFragment();
            vnode.children.forEach(child => fragment.appendChild(render(child)));
            return fragment;
        }
        if (typeof vnode.tag === 'function')
            return render(vnode.tag(vnode.props));
        const element = document.createElement(vnode.tag);
        updateProps(element, vnode.props, {});
        vnode.children.forEach(child => element.appendChild(render(child)));
        element._vnode = vnode;
        return element;
    }
    function patchNode(parent, domNode, next, previous) {
        if (previous === undefined || domNode === null) {
            const created = render(next);
            parent.appendChild(created);
            return created.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent.lastChild : created;
        }
        if (typeof next === 'string' && typeof previous === 'string') {
            if (next !== previous && domNode.nodeValue !== next)
                domNode.nodeValue = next;
            return domNode;
        }
        if (typeof next === 'string' || typeof previous === 'string' || typeof next.tag === 'function' || typeof previous.tag === 'function') {
            const created = render(next);
            parent.replaceChild(created, domNode);
            return created;
        }
        if (next.tag !== previous.tag || next.key !== previous.key || isFragment(next) || isFragment(previous)) {
            const created = render(next);
            parent.replaceChild(created, domNode);
            return created;
        }
        const element = domNode;
        updateProps(element, next.props, previous.props);
        patchChildren(element, next.children, previous.children);
        element._vnode = next;
        return element;
    }
    function patchChildren(parent, nextChildren, previousChildren) {
        const keyed = new Map();
        Array.from(parent.childNodes).forEach((node, index) => {
            const old = previousChildren[index];
            if (typeof old !== 'string' && old?.key !== undefined)
                keyed.set(old.key, { vnode: old, node });
        });
        const used = new Set();
        nextChildren.forEach((nextChild, index) => {
            const nextKey = typeof nextChild === 'string' ? undefined : nextChild.key;
            const keyedMatch = nextKey !== undefined ? keyed.get(nextKey) : undefined;
            const currentNode = keyedMatch?.node ?? parent.childNodes[index] ?? null;
            const previousChild = keyedMatch?.vnode ?? previousChildren[index];
            if (currentNode && previousChild !== undefined) {
                const updated = patchNode(parent, currentNode, nextChild, previousChild);
                if (updated) {
                    used.add(updated);
                    const anchor = parent.childNodes[index];
                    if (anchor !== updated)
                        parent.insertBefore(updated, anchor || null);
                }
            }
            else {
                const created = render(nextChild);
                parent.insertBefore(created, parent.childNodes[index] || null);
                if (created.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)
                    used.add(created);
            }
        });
        Array.from(parent.childNodes).forEach(node => { if (!used.has(node))
            parent.removeChild(node); });
    }
    function patch$1(parent, newVNode, oldVNode) {
        patchNode(parent, parent.firstChild, newVNode, oldVNode);
    }

    // Animation methods
    const animations = {
        scaleIn(duration = 300) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'scale(0)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'scale(1)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        scaleOut(duration = 300) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'scale(1)';
                element.style.opacity = '1';
                element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
                element.offsetHeight;
                element.style.transform = 'scale(0)';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        rotateIn(duration = 500) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'rotate(-180deg) scale(0)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'rotate(0) scale(1)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        rotateOut(duration = 500) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'rotate(0) scale(1)';
                element.style.opacity = '1';
                element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
                element.offsetHeight;
                element.style.transform = 'rotate(180deg) scale(0)';
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        bounce(duration = 1000) {
            return this.each(function () {
                const element = this;
                element.style.animation = `bounce ${duration}ms ease-in-out`;
                setTimeout(() => {
                    element.style.animation = '';
                }, duration);
            });
        },
        shake(duration = 500) {
            return this.each(function () {
                const element = this;
                element.style.animation = `shake ${duration}ms ease-in-out`;
                setTimeout(() => {
                    element.style.animation = '';
                }, duration);
            });
        },
        slideInLeft(duration = 400) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'translateX(-100%)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'translateX(0)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        slideInRight(duration = 400) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'translateX(100%)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'translateX(0)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        slideInUp(duration = 400) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'translateY(100%)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        slideInDown(duration = 400) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'translateY(-100%)';
                element.style.opacity = '0';
                element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
                element.offsetHeight;
                element.style.transform = 'translateY(0)';
                element.style.opacity = '1';
                setTimeout(() => {
                    element.style.transition = '';
                }, duration);
            });
        },
        flip(duration = 600) {
            return this.each(function () {
                const element = this;
                element.style.transform = 'rotateY(0)';
                element.style.transition = `transform ${duration}ms ease-in-out`;
                element.offsetHeight;
                element.style.transform = 'rotateY(360deg)';
                setTimeout(() => {
                    element.style.transition = '';
                    element.style.transform = '';
                }, duration);
            });
        },
        pulse(duration = 1000, iterations = 1) {
            return this.each(function () {
                const element = this;
                element.style.animation = `pulse ${duration}ms ease-in-out ${iterations}`;
                setTimeout(() => {
                    element.style.animation = '';
                }, duration * iterations);
            });
        },
        glow(duration = 1000, color = '#ffff00') {
            return this.each(function () {
                const element = this;
                element.style.boxShadow = `0 0 5px ${color}`;
                element.style.transition = `box-shadow ${duration}ms ease-in-out`;
                element.offsetHeight;
                element.style.boxShadow = `0 0 20px ${color}, 0 0 30px ${color}`;
                setTimeout(() => {
                    element.style.boxShadow = `0 0 5px ${color}`;
                    setTimeout(() => {
                        element.style.transition = '';
                        element.style.boxShadow = '';
                    }, duration);
                }, duration);
            });
        }
    };
    // Add CSS animations only when a document is available.
    if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = `
    @keyframes bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); } 40%, 43% { transform: translate3d(0, -30px, 0); } 70% { transform: translate3d(0, -15px, 0); } 90% { transform: translate3d(0, -4px, 0); } }
    @keyframes shake { 0%, 100% { transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
  `;
        document.head.appendChild(style);
    }
    // Add animations to OneKit prototype
    Object.keys(animations).forEach(name => {
        OneKit.prototype[name] = animations[name];
    });

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    function request(url, options = {}) {
        return new Promise((resolve, reject) => {
            // Sanitize URL to prevent XSS
            const sanitizedUrl = sanitizeURL(url);
            if (!sanitizedUrl) {
                reject(new Error('Invalid URL'));
                return;
            }
            const config = {
                method: 'GET',
                headers: { ...defaultHeaders },
                timeout: 30000,
                retries: 0,
                retryDelay: 1000,
                ...options
            };
            const makeRequest = (attempt = 0) => {
                const xhr = new XMLHttpRequest();
                // Set up timeout
                const timeoutId = setTimeout(() => {
                    xhr.abort();
                    reject(new Error('Request timeout'));
                }, config.timeout);
                xhr.open(config.method, sanitizedUrl);
                // Set headers
                for (const header in config.headers) {
                    xhr.setRequestHeader(header, config.headers[header]);
                }
                // Progress tracking
                if (config.onProgress) {
                    xhr.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            config.onProgress(e.loaded / e.total);
                        }
                    });
                }
                xhr.onload = function () {
                    clearTimeout(timeoutId);
                    const response = {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        headers: parseHeaders(xhr.getAllResponseHeaders()),
                        data: null,
                        url: xhr.responseURL
                    };
                    try {
                        // Try to parse JSON response
                        if (xhr.responseText) {
                            response.data = JSON.parse(xhr.responseText);
                        }
                    }
                    catch (e) {
                        // If not JSON, return as text
                        response.data = xhr.responseText;
                    }
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    }
                    else {
                        const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
                        error.response = response;
                        if (attempt < (config.retries || 0)) {
                            setTimeout(() => makeRequest(attempt + 1), config.retryDelay);
                        }
                        else {
                            reject(error);
                        }
                    }
                };
                xhr.onerror = function () {
                    clearTimeout(timeoutId);
                    if (attempt < (config.retries || 0)) {
                        setTimeout(() => makeRequest(attempt + 1), config.retryDelay);
                    }
                    else {
                        reject(new Error('Network error'));
                    }
                };
                // Send request
                if (config.body && typeof config.body === 'object') {
                    xhr.send(JSON.stringify(config.body));
                }
                else {
                    xhr.send(config.body);
                }
            };
            makeRequest();
        });
    }
    function get(url, options = {}) {
        return request(url, { ...options, method: 'GET' });
    }
    function post(url, data, options = {}) {
        return request(url, { ...options, method: 'POST', body: data });
    }
    function put(url, data, options = {}) {
        return request(url, { ...options, method: 'PUT', body: data });
    }
    function del(url, options = {}) {
        return request(url, { ...options, method: 'DELETE' });
    }
    function patch(url, data, options = {}) {
        return request(url, { ...options, method: 'PATCH', body: data });
    }
    function parseHeaders(headerString) {
        const headers = {};
        const lines = headerString.split('\n');
        for (const line of lines) {
            const index = line.indexOf(':');
            if (index > 0) {
                const name = line.slice(0, index).trim().toLowerCase();
                const value = line.slice(index + 1).trim();
                headers[name] = value;
            }
        }
        return headers;
    }
    // RESTful API helper
    class API {
        baseURL;
        defaultOptions;
        constructor(baseURL, defaultOptions = {}) {
            this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
            this.defaultOptions = defaultOptions;
        }
        buildURL(endpoint) {
            return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        }
        get(endpoint, options = {}) {
            return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'GET' });
        }
        post(endpoint, data, options = {}) {
            return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'POST', body: data });
        }
        put(endpoint, data, options = {}) {
            return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'PUT', body: data });
        }
        delete(endpoint, options = {}) {
            return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'DELETE' });
        }
        patch(endpoint, data, options = {}) {
            return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'PATCH', body: data });
        }
    }

    /* OneKit style: explicit, browser-first navigation with small composable contracts and no hidden global state in application routers. */
    function normalizePath(path) {
        const withoutHash = path.split('#')[0];
        const withoutQuery = withoutHash.split('?')[0] || '/';
        const normalized = withoutQuery.replace(/\\+/g, '/').replace(/\/+/g, '/');
        if (normalized.length > 1 && normalized.endsWith('/'))
            return normalized.slice(0, -1);
        return normalized.startsWith('/') ? normalized : `/${normalized}`;
    }
    function parseLocation(input) {
        const raw = input || '/';
        const hashIndex = raw.indexOf('#');
        const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
        const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';
        const queryIndex = beforeHash.indexOf('?');
        const path = normalizePath(queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash);
        const query = {};
        if (queryIndex >= 0) {
            const params = new URLSearchParams(beforeHash.slice(queryIndex + 1));
            params.forEach((value, key) => {
                const previous = query[key];
                query[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
            });
        }
        const queryString = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => Array.isArray(value) ? value.forEach(item => queryString.append(key, item)) : queryString.set(key, value));
        const fullPath = `${path}${queryString.toString() ? `?${queryString}` : ''}${hash}`;
        return { path, fullPath, params: {}, query, hash };
    }
    function compilePath(pattern) {
        const keys = [];
        const path = normalizePath(pattern);
        const source = path.split('/').map(segment => {
            if (segment.startsWith(':')) {
                keys.push(segment.slice(1).replace(/\\?$/, ''));
                return segment.endsWith('?') ? '([^/]*)?' : '([^/]+)';
            }
            if (segment === '*') {
                keys.push('wildcard');
                return '(.*)';
            }
            return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('/');
        return { regex: new RegExp(`^${source || '/'}/?$`), keys };
    }
    function matchRoute(route, location) {
        const { regex, keys } = compilePath(route.path);
        const match = location.path.match(regex);
        if (!match)
            return null;
        return keys.reduce((params, key, index) => {
            params[key] = decodeURIComponent(match[index + 1] || '');
            return params;
        }, {});
    }
    class Router {
        routes = [];
        listeners = new Set();
        current = null;
        started = false;
        options;
        popstateHandler = () => { void this.resolve(this.readBrowserPath(), false); };
        constructor(routes = [], options = {}) {
            this.routes = [...routes];
            this.options = options;
        }
        addRoute(route) {
            this.routes.push(route);
            return this;
        }
        removeRoute(path) {
            const index = this.routes.findIndex(route => route.path === path);
            if (index < 0)
                return false;
            this.routes.splice(index, 1);
            return true;
        }
        get routesList() { return this.routes; }
        getCurrentPath() {
            return this.current?.path ?? (this.readBrowserPath().split(/[?#]/)[0] || '/');
        }
        getCurrentLocation() { return this.current; }
        subscribe(listener) {
            this.listeners.add(listener);
            const unsubscribe = () => this.listeners.delete(listener);
            onScopeDispose(unsubscribe);
            return unsubscribe;
        }
        start() {
            if (this.started)
                return Promise.resolve(this.current ? this.match(this.current) : null);
            this.started = true;
            if (typeof window !== 'undefined' && this.options.mode !== 'memory')
                window.addEventListener('popstate', this.popstateHandler);
            return this.resolve(this.options.initialPath ?? this.readBrowserPath(), false);
        }
        stop() {
            if (typeof window !== 'undefined')
                window.removeEventListener('popstate', this.popstateHandler);
            this.started = false;
        }
        navigate(path) {
            return this.resolve(path, true);
        }
        back() { if (typeof window !== 'undefined' && this.options.mode !== 'memory')
            window.history.back(); }
        forward() { if (typeof window !== 'undefined' && this.options.mode !== 'memory')
            window.history.forward(); }
        async resolve(input, push = false) {
            const to = parseLocation(this.applyBase(input));
            const matched = this.match(to);
            const from = this.current;
            const context = { to, from };
            emitDevToolsEvent({ type: 'router:navigation', phase: 'start', to: to.fullPath, from: from?.fullPath ?? null });
            const guardResult = await this.runGuard(this.options.beforeEach, context);
            if (guardResult === false) {
                emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null });
                return null;
            }
            if (typeof guardResult === 'string' && guardResult !== to.fullPath) {
                emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null });
                return this.resolve(guardResult, true);
            }
            const route = matched?.route ?? this.options.notFound;
            if (!route) {
                this.current = to;
                this.notify(to, from);
                return null;
            }
            const routeGuard = await this.runGuard(route.beforeEnter, context);
            if (routeGuard === false) {
                emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
                return null;
            }
            if (typeof routeGuard === 'string' && routeGuard !== to.fullPath) {
                emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
                return this.resolve(routeGuard, true);
            }
            const result = matched ?? { route, location: to };
            if (route.loader) {
                try {
                    result.data = await route.loader(context);
                }
                catch (error) {
                    emitDevToolsEvent({ type: 'router:navigation', phase: 'error', to: to.fullPath, from: from?.fullPath ?? null, route: route.path, error });
                    throw error;
                }
            }
            if (push)
                this.commit(to);
            this.current = to;
            if (route.handler)
                await route.handler({ ...context, to });
            this.notify(to, from);
            this.options.afterEach?.({ ...context, matched: result });
            emitDevToolsEvent({ type: 'router:navigation', phase: 'success', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
            return result;
        }
        match(location) {
            const search = (routes) => {
                for (const route of routes) {
                    const params = matchRoute(route, location);
                    if (!params)
                        continue;
                    const childMatch = route.children ? search(route.children) : null;
                    return childMatch ?? { route, location: { ...location, params } };
                }
                return null;
            };
            return search(this.routes);
        }
        async runGuard(guard, context) {
            return guard ? guard(context) : undefined;
        }
        notify(to, from) {
            this.listeners.forEach(listener => listener(to, from));
        }
        applyBase(path) {
            const base = this.options.base ?? '';
            if (!base || path.startsWith(base))
                return path;
            return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
        }
        readBrowserPath() {
            if (typeof window === 'undefined')
                return this.options.initialPath ?? '/';
            if (this.options.mode === 'hash')
                return window.location.hash.slice(1) || '/';
            return `${window.location.pathname}${window.location.search}${window.location.hash}`;
        }
        commit(location) {
            if (typeof window === 'undefined' || this.options.mode === 'memory')
                return;
            if (this.options.mode === 'hash')
                window.history.pushState({}, '', `#${location.fullPath}`);
            else
                window.history.pushState({}, '', location.fullPath);
        }
    }
    function createRouter(routes = [], options = {}) {
        return new Router(routes, options);
    }
    const router = new Router();

    // Storage Utilities Module
    class Storage {
        storage;
        options;
        constructor(storage, options = {}) {
            this.storage = storage;
            this.options = {
                prefix: options.prefix || '',
                serialize: options.serialize || JSON.stringify,
                deserialize: options.deserialize || JSON.parse,
                ttl: options.ttl || 0
            };
        }
        getKey(key) {
            return this.options.prefix + key;
        }
        isExpired(timestamp) {
            return this.options.ttl > 0 && Date.now() - timestamp > this.options.ttl;
        }
        set(key, value) {
            try {
                // Validate key to prevent prototype pollution
                if (!validateStorageKey(key)) {
                    console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
                    return false;
                }
                const data = {
                    value: this.options.serialize(value),
                    timestamp: Date.now()
                };
                this.storage.setItem(this.getKey(key), JSON.stringify(data));
                return true;
            }
            catch (error) {
                errorHandler(error, 'Storage.set');
                return false;
            }
        }
        get(key, defaultValue) {
            try {
                // Validate key to prevent prototype pollution
                if (!validateStorageKey(key)) {
                    console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
                    return defaultValue;
                }
                const item = this.storage.getItem(this.getKey(key));
                if (!item) {
                    return defaultValue;
                }
                const data = JSON.parse(item);
                // Check TTL
                if (this.isExpired(data.timestamp)) {
                    this.remove(key);
                    return defaultValue;
                }
                return this.options.deserialize(data.value);
            }
            catch (error) {
                errorHandler(error, 'Storage.get');
                return defaultValue;
            }
        }
        remove(key) {
            try {
                // Validate key to prevent prototype pollution
                if (!validateStorageKey(key)) {
                    console.error('OneKit Security: Invalid storage key (prototype pollution attempt blocked)');
                    return false;
                }
                this.storage.removeItem(this.getKey(key));
                return true;
            }
            catch (error) {
                errorHandler(error, 'Storage.remove');
                return false;
            }
        }
        clear() {
            try {
                // Only clear items with our prefix
                const keysToRemove = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.options.prefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => this.storage.removeItem(key));
                return true;
            }
            catch (error) {
                errorHandler(error, 'Storage.clear');
                return false;
            }
        }
        has(key) {
            try {
                // Validate key to prevent prototype pollution
                if (!validateStorageKey(key)) {
                    return false;
                }
                const item = this.storage.getItem(this.getKey(key));
                if (!item) {
                    return false;
                }
                const data = JSON.parse(item);
                return !this.isExpired(data.timestamp);
            }
            catch (error) {
                return false;
            }
        }
        keys() {
            try {
                const keys = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && key.startsWith(this.options.prefix)) {
                        const cleanKey = key.slice(this.options.prefix.length);
                        // Check if not expired
                        const item = this.storage.getItem(key);
                        if (item) {
                            const data = JSON.parse(item);
                            if (!this.isExpired(data.timestamp)) {
                                keys.push(cleanKey);
                            }
                        }
                    }
                }
                return keys;
            }
            catch (error) {
                errorHandler(error, 'Storage.keys');
                return [];
            }
        }
        size() {
            return this.keys().length;
        }
    }
    // Pre-configured storage instances. Node/SSR imports use an isolated in-memory fallback.
    function createMemoryStorage() {
        const values = new Map();
        return {
            get length() { return values.size; },
            clear: () => values.clear(),
            getItem: key => values.get(key) ?? null,
            key: index => Array.from(values.keys())[index] ?? null,
            removeItem: key => { values.delete(key); },
            setItem: (key, value) => { values.set(key, String(value)); }
        };
    }
    const browserLocal = typeof window !== 'undefined' ? window.localStorage : createMemoryStorage();
    const browserSession = typeof window !== 'undefined' ? window.sessionStorage : createMemoryStorage();
    const localStorage = new Storage(browserLocal, { prefix: 'onekit_' });
    const sessionStorage = new Storage(browserSession, { prefix: 'onekit_' });
    // Utility functions
    function createStorage(storage, options) {
        return new Storage(storage, options);
    }
    // Cache with TTL
    const cache = new Storage(browserSession, {
        prefix: 'onekit_cache_',
        ttl: 5 * 60 * 1000 // 5 minutes
    });

    /**
     * Utility functions for OneKit
     */
    /**
     * Debounce function calls
     */
    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    /**
     * Throttle function calls
     */
    function throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    /**
     * Deep clone an object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (Array.isArray(obj))
            return obj.map(item => deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    /**
     * Generate a unique ID
     */
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Accessibility Helpers Module
    function setAriaAttributes(element, attributes) {
        try {
            for (const [attr, value] of Object.entries(attributes)) {
                if (value === null || value === undefined) {
                    element.removeAttribute(attr);
                }
                else {
                    element.setAttribute(attr, String(value));
                }
            }
        }
        catch (error) {
            errorHandler(error, 'setAriaAttributes');
        }
    }
    function announce(message, priority = 'polite') {
        try {
            let announcer = document.getElementById('onekit-a11y-announcer');
            if (!announcer) {
                announcer = document.createElement('div');
                announcer.id = 'onekit-a11y-announcer';
                announcer.setAttribute('aria-live', priority);
                announcer.setAttribute('aria-atomic', 'true');
                announcer.style.position = 'absolute';
                announcer.style.left = '-10000px';
                announcer.style.width = '1px';
                announcer.style.height = '1px';
                announcer.style.overflow = 'hidden';
                document.body.appendChild(announcer);
            }
            announcer.setAttribute('aria-live', priority);
            announcer.textContent = message;
        }
        catch (error) {
            errorHandler(error, 'announce');
        }
    }
    function trapFocus(container) {
        try {
            const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            function handleKeyDown(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    }
                    else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            }
            container.addEventListener('keydown', handleKeyDown);
            // Focus first element
            if (firstElement) {
                firstElement.focus();
            }
            // Return cleanup function
            return () => {
                container.removeEventListener('keydown', handleKeyDown);
            };
        }
        catch (error) {
            errorHandler(error, 'trapFocus');
            return () => { };
        }
    }
    function makeFocusable(element) {
        try {
            element.setAttribute('tabindex', '0');
        }
        catch (error) {
            errorHandler(error, 'makeFocusable');
        }
    }
    function makeUnfocusable(element) {
        try {
            element.setAttribute('tabindex', '-1');
        }
        catch (error) {
            errorHandler(error, 'makeUnfocusable');
        }
    }
    function skipToContent(targetId) {
        try {
            const target = document.getElementById(targetId);
            if (target) {
                target.focus();
                target.scrollIntoView();
            }
        }
        catch (error) {
            errorHandler(error, 'skipToContent');
        }
    }
    function createSkipLink(href, text = 'Skip to main content') {
        try {
            const link = document.createElement('a');
            link.href = href;
            link.textContent = text;
            link.className = 'skip-link';
            link.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
      transition: top 0.3s;
    `;
            link.addEventListener('focus', () => {
                link.style.top = '6px';
            });
            link.addEventListener('blur', () => {
                link.style.top = '-40px';
            });
            return link;
        }
        catch (error) {
            errorHandler(error, 'createSkipLink');
            return document.createElement('a');
        }
    }
    function manageTabOrder(container, enabled = true) {
        try {
            const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            focusableElements.forEach(element => {
                if (enabled) {
                    if (element.hasAttribute('data-original-tabindex')) {
                        element.setAttribute('tabindex', element.getAttribute('data-original-tabindex'));
                        element.removeAttribute('data-original-tabindex');
                    }
                }
                else {
                    if (!element.hasAttribute('data-original-tabindex')) {
                        element.setAttribute('data-original-tabindex', element.getAttribute('tabindex') || '0');
                    }
                    element.setAttribute('tabindex', '-1');
                }
            });
        }
        catch (error) {
            errorHandler(error, 'manageTabOrder');
        }
    }
    function createLandmarks() {
        try {
            // Ensure common landmarks exist
            const landmarks = [
                { id: 'main', role: 'main', selector: 'main, [role="main"]' },
                { id: 'navigation', role: 'navigation', selector: 'nav, [role="navigation"]' },
                { id: 'banner', role: 'banner', selector: 'header, [role="banner"]' },
                { id: 'contentinfo', role: 'contentinfo', selector: 'footer, [role="contentinfo"]' }
            ];
            landmarks.forEach(({ id, role, selector }) => {
                if (!document.getElementById(id)) {
                    const element = document.querySelector(selector);
                    if (element && !element.hasAttribute('role')) {
                        element.id = id;
                        element.setAttribute('role', role);
                    }
                }
            });
        }
        catch (error) {
            errorHandler(error, 'createLandmarks');
        }
    }
    function validateAccessibility(element) {
        const errors = [];
        const warnings = [];
        try {
            // Check for alt text on images
            const images = element.querySelectorAll('img');
            images.forEach(img => {
                if (!img.hasAttribute('alt')) {
                    errors.push('Image missing alt attribute');
                }
            });
            // Check for labels on form inputs
            const inputs = element.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const id = input.id;
                const label = element.querySelector(`label[for="${id}"]`);
                if (!label && !input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
                    warnings.push('Form input may be missing a label');
                }
            });
            // Check for heading hierarchy
            const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let lastLevel = 0;
            headings.forEach(heading => {
                const level = parseInt(heading.tagName.charAt(1));
                if (level - lastLevel > 1) {
                    warnings.push('Heading hierarchy may be broken');
                }
                lastLevel = level;
            });
            // Check for color contrast (basic check)
            const elementsWithColor = element.querySelectorAll('[style*="color"], [style*="background"]');
            if (elementsWithColor.length > 0) {
                warnings.push('Manual color contrast check recommended for styled elements');
            }
        }
        catch (error) {
            errorHandler(error, 'validateAccessibility');
        }
        return { errors, warnings };
    }

    // Integrated State Manager (Pinia-like)
    const stores = new Map();
    const storeSubscriptions = new WeakMap();
    registerDevToolsInspector('stores', () => Array.from(stores.values()).map((store) => ({
        id: store.$id,
        state: store.$state,
        subscriberCount: storeSubscriptions.get(store)?.size ?? 0,
    })));
    function defineStore(id, setup) {
        let definition;
        if (typeof id === 'string') {
            if (!setup) {
                throw new Error('[OneKit Store] defineStore requires setup function when id is a string');
            }
            definition = { ...setup(), id };
        }
        else {
            definition = id;
        }
        // Check if store already exists
        if (stores.has(definition.id)) {
            console.warn(`[OneKit Store] Store "${definition.id}" already exists. Returning existing store.`);
            return stores.get(definition.id);
        }
        // Create reactive state
        const state = reactive(definition.state());
        // Create store instance
        const store = {
            $id: definition.id,
            $state: state,
            $patch: (partialState) => {
                if (typeof partialState === 'function') {
                    partialState(state);
                }
                else {
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
                emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'subscribe', listenerCount: subscribers.size });
                // Return unsubscribe function and bind it to the current disposable scope.
                const unsubscribe = () => {
                    subscribers.delete(callback);
                    emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'unsubscribe', listenerCount: subscribers.size });
                };
                onScopeDispose(unsubscribe);
                return unsubscribe;
            }
        };
        // Add getters
        if (definition.getters) {
            Object.keys(definition.getters).forEach(getterName => {
                const getterFn = definition.getters[getterName];
                store[getterName] = computed(() => getterFn(state));
            });
        }
        // Add actions
        if (definition.actions) {
            Object.keys(definition.actions).forEach(actionName => {
                const actionFn = definition.actions[actionName];
                store[actionName] = function (...args) {
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
        emitDevToolsEvent({ type: 'store:lifecycle', storeId: definition.id, phase: 'create', listenerCount: 0 });
        applyPlugins(store);
        return store;
    }
    function useStore(id) {
        const store = stores.get(id);
        if (!store) {
            throw new Error(`[OneKit Store] Store "${id}" not found. Make sure to define it first.`);
        }
        return store;
    }
    function getAllStores() {
        return Array.from(stores.values());
    }
    function removeStore(id) {
        const store = stores.get(id);
        if (store) {
            storeSubscriptions.delete(store);
            emitDevToolsEvent({ type: 'store:lifecycle', storeId: id, phase: 'remove', listenerCount: 0 });
            return stores.delete(id);
        }
        return false;
    }
    const plugins = [];
    function addStorePlugin(plugin) {
        plugins.push(plugin);
        // Apply plugin to existing stores
        stores.forEach(store => {
            plugin(store);
        });
    }
    // Apply plugins to newly created stores
    function applyPlugins(store) {
        plugins.forEach(plugin => plugin(store));
    }
    // Explicit alias for applications that prefer a create-style API.
    function createStore(id, setup) {
        return defineStore(id, setup);
    }

    // Server-side rendering function
    function renderToString(vnode, context = {}) {
        const ctx = { ...context };
        function renderVNode(node) {
            if (typeof node === 'string') {
                return escapeHtml(node);
            }
            const { tag, props, children } = node;
            // Handle special tags
            if (tag === 'html') {
                return renderHtmlTag(node, ctx);
            }
            if (tag === 'head') {
                return renderHeadTag(node, ctx);
            }
            if (tag === 'body') {
                return renderBodyTag(node, ctx);
            }
            // Handle component rendering (simplified for SSR)
            if (typeof tag === 'function') {
                // For functional components, call them to get vnode
                const componentResult = tag(props);
                return renderVNode(componentResult);
            }
            // Regular HTML element
            const attrs = renderAttributes(props);
            const childrenHtml = children.map(renderVNode).join('');
            if (isSelfClosingTag(tag)) {
                return `<${tag}${attrs}>`;
            }
            return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
        }
        const html = renderVNode(vnode);
        return {
            html,
            context: ctx
        };
    }
    // Render HTML document structure
    function renderHtmlTag(node, context) {
        const { children } = node;
        const attrs = renderAttributes(node.props);
        let headContent = '';
        let bodyContent = '';
        children.forEach(child => {
            if (typeof child === 'string') {
                bodyContent += escapeHtml(child);
            }
            else if (child.tag === 'head') {
                headContent = renderHeadTag(child, context);
            }
            else if (child.tag === 'body') {
                bodyContent = renderBodyTag(child, context);
            }
            else {
                bodyContent += renderVNode(child, context);
            }
        });
        return `<!DOCTYPE html>
<html${attrs}>
${headContent}
${bodyContent}
</html>`;
    }
    function renderVNode(node, context = createSSRContext()) {
        if (typeof node === 'string') {
            return escapeHtml(node);
        }
        const { tag, props, children } = node;
        // Handle special tags
        if (tag === 'html') {
            return renderHtmlTag(node, context);
        }
        if (tag === 'head') {
            return renderHeadTag(node, context);
        }
        if (tag === 'body') {
            return renderBodyTag(node, context);
        }
        // Handle component rendering (simplified for SSR)
        if (typeof tag === 'function') {
            // For functional components, call them to get vnode
            const componentResult = tag(props);
            return renderVNode(componentResult, context);
        }
        // Regular HTML element
        const attrs = renderAttributes(props);
        const childrenHtml = children.map(child => renderVNode(child, context)).join('');
        if (isSelfClosingTag(tag)) {
            return `<${tag}${attrs}>`;
        }
        return `<${tag}${attrs}>${childrenHtml}</${tag}>`;
    }
    function renderHeadTag(node, context) {
        const { children } = node;
        const attrs = renderAttributes(node.props);
        let content = '';
        children.forEach(child => {
            if (typeof child === 'string') {
                content += escapeHtml(child);
            }
            else {
                content += renderVNode(child, context);
            }
        });
        // Add context head content
        if (context.head) {
            content += context.head.join('\n');
        }
        // Add meta tags from context
        if (context.meta) {
            Object.entries(context.meta).forEach(([name, value]) => {
                content += `<meta name="${escapeHtml(name)}" content="${escapeHtml(value)}">\n`;
            });
        }
        return `<head${attrs}>${content}</head>`;
    }
    function renderBodyTag(node, context) {
        const { children } = node;
        const attrs = renderAttributes(node.props);
        let content = '';
        children.forEach(child => {
            if (typeof child === 'string') {
                content += escapeHtml(child);
            }
            else {
                content += renderVNode(child, context);
            }
        });
        // Add context body content
        if (context.body) {
            content += context.body.join('\n');
        }
        return `<body${attrs}>${content}</body>`;
    }
    function renderAttributes(props) {
        const attrs = [];
        for (const [key, value] of Object.entries(props)) {
            if (key === 'key' || key === 'children')
                continue;
            if (key === 'className') {
                attrs.push(`class="${escapeHtml(String(value))}"`);
            }
            else if (key === 'style' && typeof value === 'object') {
                const styleStr = Object.entries(value)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';');
                attrs.push(`style="${escapeHtml(styleStr)}"`);
            }
            else if (key.startsWith('on') && typeof value === 'function') {
                // Skip event handlers for SSR
                continue;
            }
            else if (typeof value === 'boolean') {
                if (value)
                    attrs.push(key);
            }
            else if (value !== null && value !== undefined) {
                attrs.push(`${key}="${escapeHtml(String(value))}"`);
            }
        }
        return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    }
    function isSelfClosingTag(tag) {
        const selfClosingTags = new Set([
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        ]);
        return selfClosingTags.has(tag);
    }
    function escapeHtml(text) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
    }
    // Hydration attaches client behavior without rewriting server-rendered DOM.
    // It reports parity problems so applications can fail loudly in development.
    function hydrate(rootElement, vnode) {
        const mismatches = [];
        const cleanups = [];
        walkAndHydrate(rootElement, vnode, 'root', mismatches, cleanups);
        return {
            mismatches,
            dispose: () => {
                while (cleanups.length > 0)
                    cleanups.pop()?.();
            },
        };
    }
    function walkAndHydrate(element, vnode, path, mismatches, cleanups) {
        if (typeof vnode.tag === 'function') {
            const resolved = vnode.tag(vnode.props);
            walkAndHydrate(element, resolved, path, mismatches, cleanups);
            return;
        }
        if (vnode.tag !== 'fragment' && element.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
            mismatches.push({
                path,
                kind: 'tag',
                expected: vnode.tag,
                actual: element.tagName.toLowerCase(),
            });
        }
        for (const [key, value] of Object.entries(vnode.props)) {
            if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                const listener = value;
                element.addEventListener(eventName, listener);
                cleanups.push(() => element.removeEventListener(eventName, listener));
            }
        }
        element._vnode = vnode;
        const childNodes = Array.from(element.childNodes).filter(node => !(node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === ''));
        vnode.children.forEach((child, index) => {
            const domChild = childNodes[index];
            const childPath = `${path}.${index}`;
            if (!domChild) {
                mismatches.push({
                    path: childPath,
                    kind: 'missing',
                    expected: typeof child === 'string' ? child : String(child.tag),
                    actual: 'missing',
                });
                return;
            }
            if (typeof child === 'string') {
                if (domChild.nodeType !== Node.TEXT_NODE || domChild.textContent !== child) {
                    mismatches.push({
                        path: childPath,
                        kind: 'text',
                        expected: child,
                        actual: domChild.textContent || '',
                    });
                }
                return;
            }
            if (domChild.nodeType !== Node.ELEMENT_NODE) {
                mismatches.push({
                    path: childPath,
                    kind: 'tag',
                    expected: String(child.tag),
                    actual: '#text',
                });
                return;
            }
            walkAndHydrate(domChild, child, childPath, mismatches, cleanups);
        });
        if (childNodes.length > vnode.children.length) {
            for (let index = vnode.children.length; index < childNodes.length; index += 1) {
                mismatches.push({
                    path: `${path}.${index}`,
                    kind: 'unexpected',
                    expected: 'none',
                    actual: childNodes[index].textContent || childNodes[index].nodeName.toLowerCase(),
                });
            }
        }
    }
    // Streaming SSR utilities
    class StreamingRenderer {
        context;
        chunks = [];
        isComplete = false;
        constructor(context = {}) {
            this.context = context;
        }
        async renderToStream(vnode) {
            const { readable, writable } = new TransformStream();
            this.renderAsync(vnode, writable.getWriter()).catch(error => {
                console.error('SSR streaming error:', error);
                writable.abort(error);
            });
            return readable;
        }
        async renderAsync(vnode, writer) {
            try {
                // Start HTML document
                await writer.write('<!DOCTYPE html>\n');
                if (typeof vnode === 'string') {
                    await writer.write(escapeHtml(vnode));
                }
                else {
                    await this.renderVNodeAsync(vnode, writer);
                }
                await writer.close();
                this.isComplete = true;
            }
            catch (error) {
                await writer.abort(error);
                throw error;
            }
        }
        async renderVNodeAsync(vnode, writer) {
            const { tag, props, children } = vnode;
            // Handle async components
            if (typeof tag === 'function') {
                const componentResult = await tag(props);
                return this.renderVNodeAsync(componentResult, writer);
            }
            const attrs = renderAttributes(props);
            const tagHtml = `<${tag}${attrs}>`;
            await writer.write(tagHtml);
            // Render children
            for (const child of children) {
                if (typeof child === 'string') {
                    await writer.write(escapeHtml(child));
                }
                else {
                    await this.renderVNodeAsync(child, writer);
                }
            }
            if (!isSelfClosingTag(tag)) {
                await writer.write(`</${tag}>`);
            }
        }
        getContext() {
            return { ...this.context };
        }
    }
    // SSR utilities and helpers
    function createSSRContext() {
        return {
            head: [],
            body: [],
            styles: [],
            scripts: [],
            meta: {}
        };
    }
    function addToHead(context, content) {
        if (!context.head)
            context.head = [];
        context.head.push(content);
    }
    function addToBody(context, content) {
        if (!context.body)
            context.body = [];
        context.body.push(content);
    }
    function addStyle(context, css) {
        if (!context.styles)
            context.styles = [];
        context.styles.push(css);
    }
    function addScript(context, src, content) {
        if (!context.scripts)
            context.scripts = [];
        if (src) {
            context.scripts.push(`<script src="${escapeHtml(src)}"></script>`);
        }
        else if (content) {
            context.scripts.push(`<script>${content}</script>`);
        }
    }
    function setMeta(context, name, content) {
        if (!context.meta)
            context.meta = {};
        context.meta[name] = content;
    }
    // Preload utilities for performance
    function preloadModule(href) {
        return `<link rel="modulepreload" href="${escapeHtml(href)}">`;
    }
    function preloadStyle(href) {
        return `<link rel="preload" href="${escapeHtml(href)}" as="style">`;
    }
    function preloadScript(href) {
        return `<link rel="preload" href="${escapeHtml(href)}" as="script">`;
    }
    // SEO utilities
    function renderTitle(title) {
        return `<title>${escapeHtml(title)}</title>`;
    }
    function renderMeta(name, content) {
        return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
    }
    function renderOpenGraph(property, content) {
        return `<meta property="og:${escapeHtml(property)}" content="${escapeHtml(content)}">`;
    }
    // Development helpers
    function isServer() {
        return typeof window === 'undefined';
    }
    function isClient() {
        return typeof window !== 'undefined';
    }
    // Cache for rendered components
    const ssrCache = new Map();
    function withCache(key, renderFn, ttl = 300000 // 5 minutes
    ) {
        const cached = ssrCache.get(key);
        if (cached && Date.now() - cached._timestamp < ttl) {
            return cached.html;
        }
        const result = renderFn();
        const renderResult = renderToString(result);
        renderResult._timestamp = Date.now();
        ssrCache.set(key, renderResult);
        return result;
    }

    // Web Components Integration Module
    const HTMLElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement : class {
    };
    class OneKitWebComponent extends HTMLElementBase {
        componentInstance = null;
        componentDef;
        constructor(componentDef, options = {}) {
            super();
            this.componentDef = componentDef;
            // Create shadow DOM
            const shadow = this.attachShadow({ mode: 'open' });
            // Register component if it has a name
            if (componentDef.name) {
                register(componentDef.name, componentDef);
            }
            // Create component instance
            this.componentInstance = create(componentDef.name || 'anonymous');
            // Mount component to shadow DOM
            if (this.componentInstance) {
                mount(this.componentInstance, shadow);
            }
        }
        connectedCallback() {
            // Component is already mounted in constructor
        }
        disconnectedCallback() {
            if (this.componentInstance) {
                destroy(this.componentInstance);
            }
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (this.componentInstance && this.componentInstance.props) {
                // Update component props when attributes change
                this.componentInstance.props[name] = newValue;
                // Trigger update if component has update method
                if (this.componentInstance.update) {
                    this.componentInstance.update();
                }
            }
        }
        // Get observed attributes from component props
        static get observedAttributes() {
            return [];
        }
    }
    function registerWebComponent(name, componentDef, options = {}) {
        // Create custom element class
        class CustomWebComponent extends OneKitWebComponent {
            constructor() {
                super(componentDef, options);
            }
            static get observedAttributes() {
                // Observe attributes based on component props
                if (componentDef.props) {
                    return Object.keys(componentDef.props);
                }
                return options.observedAttributes || [];
            }
        }
        // Register custom element
        if (typeof customElements !== 'undefined' && !customElements.get(name)) {
            customElements.define(name, CustomWebComponent, {
                extends: options.extends
            });
        }
    }

    // OKJS - OneKit JavaScript Template Syntax Module
    // OKJS template parser - custom syntax: [tag attr="value"]content[/tag]
    function okjs(template, ...values) {
        const parsed = parseOKJSTemplate(template.raw[0]);
        return createVNodeFromOKJS(parsed);
    }
    // Parse OKJS template string into AST-like structure
    function parseOKJSTemplate(template) {
        // Simple parser for [tag attr="value"]content[/tag] syntax
        const regex = /\[(\w+)(?:\s+([^\/\]]*?))?\](.*?)\[\/(\w+)\]/gs;
        const selfClosingRegex = /\[(\w+)(?:\s+([^\/\]]*?))?\s*\/\]/g;
        let result = { tag: 'div', props: {}, children: [] };
        // Handle self-closing tags
        template = template.replace(selfClosingRegex, (match, tag, attrs) => {
            const props = parseAttributes(attrs || '');
            const element = { tag, props, children: [] };
            result.children.push(element);
            return '';
        });
        // Handle regular tags
        let match;
        while ((match = regex.exec(template)) !== null) {
            const [, openTag, attrs, content, closeTag] = match;
            if (openTag !== closeTag) {
                throw new Error(`OKJS: Mismatched tags: ${openTag} and ${closeTag}`);
            }
            const props = parseAttributes(attrs || '');
            const children = parseContent(content);
            const element = { tag: openTag, props, children };
            result.children.push(element);
        }
        // If no tags found, treat as text content
        if (result.children.length === 0) {
            result.children = [template];
        }
        return result;
    }
    // Parse attributes string into props object
    function parseAttributes(attrsStr) {
        const props = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let match;
        while ((match = attrRegex.exec(attrsStr)) !== null) {
            const [, key, value] = match;
            props[key] = value;
        }
        return props;
    }
    // Parse content string into children array
    function parseContent(content) {
        const children = [];
        const parts = content.split(/(\[.*?\])/);
        for (const part of parts) {
            if (part.trim()) {
                if (part.startsWith('[') && part.endsWith(']')) {
                    // Nested element
                    const nested = parseOKJSTemplate(part);
                    children.push(nested);
                }
                else {
                    // Text content
                    children.push(part.trim());
                }
            }
        }
        return children;
    }
    // Create VNode from OKJS element
    function createVNodeFromOKJS(element) {
        if (typeof element.tag === 'function') {
            // Component
            const componentProps = { ...element.props, children: element.children };
            const instance = create(element.tag.name, componentProps);
            return instance;
        }
        // Regular element
        const validChildren = element.children.filter(child => child !== null && child !== undefined && child !== false);
        return createElement(element.tag, element.props, ...validChildren.map(child => typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean' ? String(child) : createVNodeFromOKJS(child)));
    }
    // Fragment support
    const Fragment = 'fragment';
    // Helper for creating components with OKJS
    function component(definition) {
        return function (props = {}) {
            return create(definition.name || 'anonymous', props);
        };
    }
    // JSX/hyperscript helper: support both tagged OKJS templates and h(tag, props, children).
    function h(tagOrTemplate, propsOrValue, ...children) {
        if (Array.isArray(tagOrTemplate) && 'raw' in tagOrTemplate) {
            return okjs(tagOrTemplate, propsOrValue, ...children);
        }
        return createElement(tagOrTemplate, (propsOrValue && typeof propsOrValue === 'object' && !Array.isArray(propsOrValue) ? propsOrValue : {}), ...(propsOrValue && typeof propsOrValue !== 'object' ? [propsOrValue] : []), ...children);
    }
    const jsx = h;
    const jsxDEV = h;

    // OneKit - Modern JavaScript Framework
    // Main entry point with tree-shaking friendly exports
    // Core systems
    // Version info
    const VERSION = '3.1.13';

    exports.API = API;
    exports.DependencyInjector = DependencyInjector;
    exports.Fragment = Fragment;
    exports.OneKit = OneKit;
    exports.OneKitWebComponent = OneKitWebComponent;
    exports.Router = Router;
    exports.StreamingRenderer = StreamingRenderer;
    exports.VERSION = VERSION;
    exports.addScript = addScript;
    exports.addStorePlugin = addStorePlugin;
    exports.addStyle = addStyle;
    exports.addToBody = addToBody;
    exports.addToHead = addToHead;
    exports.animations = animations;
    exports.announce = announce;
    exports.apiPatch = patch;
    exports.autorun = autorun;
    exports.batch = batch;
    exports.bind = bind;
    exports.cache = cache;
    exports.compileTemplate = compileTemplate;
    exports.component = component;
    exports.computed = computed;
    exports.create = create;
    exports.createElement = createElement;
    exports.createErrorBoundary = createErrorBoundary;
    exports.createLandmarks = createLandmarks;
    exports.createLoadingBoundary = createLoadingBoundary;
    exports.createRouter = createRouter;
    exports.createSSRContext = createSSRContext;
    exports.createSkipLink = createSkipLink;
    exports.createStorage = createStorage;
    exports.createStore = createStore;
    exports.debounce = debounce;
    exports.deepClone = deepClone;
    exports.defineComponent = defineComponent;
    exports.defineStore = defineStore;
    exports.del = del;
    exports.destroy = destroy;
    exports.devToolsSnapshot = devToolsSnapshot;
    exports.di = di;
    exports.disableScopeLeakWarnings = disableScopeLeakWarnings;
    exports.effect = effect;
    exports.effectScope = effectScope;
    exports.emitDevToolsEvent = emitDevToolsEvent;
    exports.enableDevTools = enableDevTools;
    exports.enableScopeLeakWarnings = enableScopeLeakWarnings;
    exports.errorHandler = errorHandler;
    exports.generateId = generateId;
    exports.get = get;
    exports.getActiveScopeDiagnostics = getActiveScopeDiagnostics;
    exports.getAllStores = getAllStores;
    exports.getCurrentScope = getCurrentScope;
    exports.getDevToolsEffectId = getDevToolsEffectId;
    exports.getDevToolsScopeId = getDevToolsScopeId;
    exports.getDevToolsTargetId = getDevToolsTargetId;
    exports.getInstance = getInstance;
    exports.h = h;
    exports.hydrate = hydrate;
    exports.initTemplateEngine = initTemplateEngine;
    exports.isClient = isClient;
    exports.isDevToolsEnabled = isDevToolsEnabled;
    exports.isServer = isServer;
    exports.jsx = jsx;
    exports.jsxDEV = jsxDEV;
    exports.localStorage = localStorage;
    exports.makeFocusable = makeFocusable;
    exports.makeUnfocusable = makeUnfocusable;
    exports.manageTabOrder = manageTabOrder;
    exports.mount = mount;
    exports.nextTick = nextTick;
    exports.ok = ok;
    exports.okjs = okjs;
    exports.onDestroyed = onDestroyed;
    exports.onDevToolsEvent = onDevToolsEvent;
    exports.onMounted = onMounted;
    exports.onPropsChanged = onPropsChanged;
    exports.onScopeDispose = onScopeDispose;
    exports.onUpdated = onUpdated;
    exports.patch = patch$1;
    exports.pluginManager = pluginManager;
    exports.post = post;
    exports.preloadModule = preloadModule;
    exports.preloadScript = preloadScript;
    exports.preloadStyle = preloadStyle;
    exports.put = put;
    exports.reactive = reactive;
    exports.register = register;
    exports.registerDevToolsInspector = registerDevToolsInspector;
    exports.registerDirective = registerDirective;
    exports.registerDisposable = registerDisposable;
    exports.registerWebComponent = registerWebComponent;
    exports.removeStore = removeStore;
    exports.render = render;
    exports.renderMeta = renderMeta;
    exports.renderOpenGraph = renderOpenGraph;
    exports.renderTitle = renderTitle;
    exports.renderToString = renderToString;
    exports.request = request;
    exports.router = router;
    exports.safeMethod = safeMethod;
    exports.sessionStorage = sessionStorage;
    exports.setAriaAttributes = setAriaAttributes;
    exports.setMeta = setMeta;
    exports.setupComponent = setupComponent;
    exports.skipToContent = skipToContent;
    exports.snapshot = snapshot;
    exports.stop = stop;
    exports.throttle = throttle;
    exports.trapFocus = trapFocus;
    exports.unmount = unmount;
    exports.useStore = useStore;
    exports.validateAccessibility = validateAccessibility;
    exports.vdomPatch = patch$1;
    exports.watch = watch;
    exports.withCache = withCache;
    exports.withScope = withScope;

}));
//# sourceMappingURL=onekit.js.map
