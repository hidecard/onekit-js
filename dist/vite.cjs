'use strict';

var node_fs = require('node:fs');
var node_path = require('node:path');
var typescript = require('typescript');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var typescript__namespace = /*#__PURE__*/_interopNamespaceDefault(typescript);

function readBlock(source, tag) {
    const match = source.match(new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? { attrs: match[1] ?? '', content: match[2] ?? '' } : null;
}
function assertNoUnsupportedBlocks(source) {
    const topLevel = source.replace(/<(script|template|style)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, '');
    const unsupported = topLevel.match(/<([a-z][\w-]*)(?:\s[^>]*)?>/gi)?.filter(tag => {
        const name = tag.match(/^<([a-z][\w-]*)/i)?.[1]?.toLowerCase();
        return name && !['script', 'template', 'style'].includes(name);
    });
    if (unsupported?.length)
        throw new Error(`[OneKit] Unsupported .okjs top-level block: ${unsupported[0]}`);
}
function parseOkjs(source, id = 'component.okjs') {
    assertNoUnsupportedBlocks(source);
    const script = readBlock(source, 'script');
    const template = readBlock(source, 'template');
    const style = readBlock(source, 'style');
    if (!template?.content.trim())
        throw new Error(`[OneKit] .okjs component ${id} must contain a <template> block.`);
    const lang = script?.attrs.match(/\blang\s*=\s*["'](ts|js)["']/i)?.[1]?.toLowerCase();
    return {
        script: script?.content.trim() ?? '',
        scriptLang: lang ?? 'ts',
        template: template.content.trim(),
        style: style?.content.trim() ?? '',
        styleScoped: Boolean(style?.attrs.match(/\bscoped(?:\s|=|$)/i)),
    };
}
function scopeTemplate(template, scopeId) {
    return template.replace(/^(\s*<([a-z][\w-]*))([^>]*>)/i, `$1 data-okjs-scope="${scopeId}"$3`);
}
function scopeCss(css, scopeId) {
    return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_match, selector, body) => {
        const trimmed = selector.trim();
        if (!trimmed || trimmed.startsWith('@'))
            return `${selector}{${body}}`;
        const scoped = trimmed.split(',').map(item => `[data-okjs-scope="${scopeId}"] ${item.trim()}`).join(', ');
        return `${scoped}{${body}}`;
    });
}
function styleCode(style, id, scoped) {
    const styleId = `onekit-okjs-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
    if (!style)
        return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\n`;
    const css = scoped ? scopeCss(style, styleId) : style;
    return `\nconst __okjsStyleId = ${JSON.stringify(styleId)};\nconst __okjsStyleText = ${JSON.stringify(css)};\nif (typeof document !== 'undefined' && !document.querySelector('[data-okjs-style="' + __okjsStyleId + '"]')) {\n  const __okjsStyle = document.createElement('style');\n  __okjsStyle.setAttribute('data-okjs-style', __okjsStyleId);\n  __okjsStyle.textContent = __okjsStyleText;\n  document.head.appendChild(__okjsStyle);\n}\n`;
}
function compileOkjs(source, id = 'component.okjs') {
    const block = parseOkjs(source, id);
    const styleId = `onekit-okjs-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
    const template = block.styleScoped ? scopeTemplate(block.template, styleId) : block.template;
    const script = block.script
        ? block.script.replace(/export\s+default\s+/, 'const __okjsUserExport = ')
        : 'const __okjsUserExport = {};';
    const options = `const __okjsOptions = typeof __okjsUserExport === 'object' && __okjsUserExport !== null ? __okjsUserExport : {};`;
    const style = styleCode(block.style, id, block.styleScoped);
    const sourceComment = `\n//# sourceURL=${id}\n`;
    const code = `import { defineComponent as __okjsDefineComponent, hotUpdateComponent as __okjsHotUpdate } from 'onekit-js';\n${script}\n${options}\nconst __okjsTemplate = ${JSON.stringify(template)};${style}\nconst __okjsComponent = __okjsDefineComponent({ ...__okjsOptions, template: __okjsTemplate });\nexport default __okjsComponent;\nif (import.meta.hot) {\n  import.meta.hot.accept((__okjsNext) => {\n    const __okjsNextComponent = __okjsNext?.default;\n    if (__okjsNextComponent?.name) __okjsHotUpdate(__okjsNextComponent.name, __okjsNextComponent);\n  });\n  import.meta.hot.dispose(() => {\n    if (typeof document !== 'undefined') document.querySelector('[data-okjs-style="' + __okjsStyleId + '"]')?.remove();\n  });\n}\n${sourceComment}`;
    return { code, map: null };
}

/**
 * Preserve a route literal so TypeScript can retain its path type in generated
 * route tables while keeping the runtime representation compatible with Route.
 */
/** Convert a file-system-like module key into a router path. */
function fileRouteKind(filePath) {
    const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    if (name === 'middleware' || name === '_middleware')
        return 'middleware';
    if (name === 'layout' || name === '_layout')
        return 'layout';
    return 'route';
}
function routeManifestEntry(filePath, options) {
    const kind = fileRouteKind(filePath);
    const conventionPath = kind === 'route' ? filePath : filePath.replace(/[\\/]([^\\/]+)$/, '');
    const path = filePathToRoutePath(conventionPath, options.root ?? '');
    const relative = path.replace(/^\//, '');
    const segments = relative.split('/').filter(Boolean);
    const dynamicSegments = segments.filter(segment => segment.startsWith(':') || segment === '*' || segment === '*?');
    const entry = {
        path,
        file: filePath,
        kind,
        ...(segments.length > 1 ? { parentPath: `/${segments.slice(0, -1).join('/')}` } : {}),
        ...(dynamicSegments.length ? { dynamic: true } : {}),
        ...(dynamicSegments.some(segment => segment === '*' || segment === '*?') ? { catchAll: true } : {}),
        ...(dynamicSegments.some(segment => segment === '*?') ? { optional: true } : {}),
    };
    return entry;
}
/** Find page files that normalize to the same or an ambiguous URL pattern. */
function findFileRouteConflicts(manifest) {
    const entriesByPattern = new Map();
    const canonicalPath = (path) => path
        .replace(/:[^/]+/g, ':param')
        .replace(/\*\?/g, '*?')
        .replace(/\*/g, '*');
    for (const entry of manifest.routes) {
        const entries = entriesByPattern.get(canonicalPath(entry.path)) ?? [];
        entries.push(entry);
        entriesByPattern.set(canonicalPath(entry.path), entries);
    }
    return [...entriesByPattern.values()]
        .filter(entries => entries.length > 1)
        .map(entries => ({
        path: entries[0].path,
        files: entries.map(entry => entry.file).sort(),
    }))
        .sort((left, right) => left.path.localeCompare(right.path));
}
/** Return explicit directory-scoped layout/middleware metadata without composing it. */
function createFileRouteAssociations(manifest) {
    const containing = (entry, kind) => manifest[kind]
        .filter(candidate => candidate.path === '/' || candidate.path === entry.path || entry.path === '/' || entry.path.startsWith(`${candidate.path}/`))
        .sort((left, right) => left.path.localeCompare(right.path) || left.file.localeCompare(right.file))
        .map(candidate => candidate.file);
    return manifest.routes.map(entry => ({
        path: entry.path,
        layouts: containing(entry, 'layouts'),
        middleware: containing(entry, 'middleware'),
    }));
}
function createFileRouteManifest(filePaths, options = {}) {
    const entries = filePaths
        .filter(filePath => options.includePrivate || !filePath.split(/[\\/]/).some(segment => segment.startsWith('_') && !/^_?(?:layout|middleware)(?:\.[^.]+)?$/.test(segment)))
        .map(filePath => routeManifestEntry(filePath, options))
        .filter(entry => options.includeInfrastructure || entry.kind === 'route')
        .sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind) || left.file.localeCompare(right.file));
    return {
        version: 1,
        root: options.root ?? '',
        routes: entries.filter(entry => entry.kind === 'route'),
        layouts: entries.filter(entry => entry.kind === 'layout'),
        middleware: entries.filter(entry => entry.kind === 'middleware'),
    };
}
function filePathToRoutePath(filePath, root = '') {
    let value = filePath.replace(/\\/g, '/');
    if (root) {
        const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '');
        if (value === normalizedRoot)
            value = '';
        else if (value.startsWith(`${normalizedRoot}/`))
            value = value.slice(normalizedRoot.length + 1);
    }
    value = value.replace(/^\.\//, '').replace(/\.(?:[cm]?[jt]sx?|vue|svelte)$/i, '');
    const segments = value.split('/').filter(Boolean);
    const routeSegments = [];
    for (const segment of segments) {
        if (/^(?:index|page)$/.test(segment))
            continue;
        if (segment === '_layout' || segment === 'layout' || /^\(.+\)$/.test(segment))
            continue;
        if (/^\[\[\.\.\.(.+)\]\]$/.test(segment)) {
            routeSegments.push('*?');
            continue;
        }
        if (/^\[\.\.\.(.+)\]$/.test(segment)) {
            routeSegments.push('*');
            continue;
        }
        const dynamic = segment.match(/^\[(.+)\]$/);
        routeSegments.push(dynamic ? `:${dynamic[1]}` : segment);
    }
    return routeSegments.length ? `/${routeSegments.join('/')}` : '/';
}

const DEFAULT_SECURITY_CONFIG = {
    ALLOWED_TAGS: [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'br', 'strong', 'em', 'b', 'i',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'button',
        'main', 'section', 'article', 'header', 'footer', 'nav', 'aside',
        'form', 'label', 'select', 'option', 'textarea', 'output'
    ],
    ALLOWED_ATTRIBUTES: [
        'id', 'class', 'style', 'href', 'src', 'alt', 'title', 'type',
        'name', 'value', 'placeholder', 'disabled', 'checked', 'selected',
        'width', 'height', 'colspan', 'rowspan', 'role', 'tabindex', 'target', 'rel', 'aria-*', 'inputmode', 'data-*'
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
// Validate URL protocols without requiring a browser global. Relative URLs are allowed.
function isSafeURL(url, base = 'http://onekit.invalid/') {
    if (!securityConfig.enableValidation)
        return true;
    try {
        const parsed = new URL(url, base);
        return ['http:', 'https:'].includes(parsed.protocol);
    }
    catch {
        return false;
    }
}
// Sanitize URL
function sanitizeURL(url) {
    if (!securityConfig.enableValidation)
        return url;
    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://onekit.invalid';
        const parsed = new URL(url, origin);
        if (!isSafeURL(url, `${origin}/`))
            return '';
        return parsed.href;
    }
    catch {
        return '';
    }
}
// Reject CSS values that can execute markup or trigger legacy CSS script bindings.
function sanitizeStyleValue(value) {
    if (!securityConfig.enableValidation)
        return value;
    const unsafe = /(?:javascript|vbscript|data)\s*:|expression\s*\(|url\s*\(\s*["']?\s*(?:javascript|vbscript|data):|-moz-binding|behavior\s*:/i;
    return unsafe.test(value) ? '' : value;
}

// OneKit DevTools foundation: opt-in, browser/SSR-safe event inspection.
let nextTargetId = 1;
let nextEffectId = 1;
const targetIds = new WeakMap();
const effectIds = new WeakMap();
const inspectors = new Map();
const resources = new Map();
const dependencies = new Map();
const scopeIds = new WeakMap();
let nextScopeId = 1;
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
function registerDevToolsResource(resource) {
    return;
}
function disposeDevToolsResource(resourceId) {
    resources.delete(resourceId);
    dependencies.delete(resourceId);
}
function recordDevToolsDependency(effectId, targetId, key) {
    return;
}
function clearDevToolsDependencies(effectId) {
    dependencies.delete(effectId);
}
function emitDevToolsEvent(event) {
    return;
}

let activeScope = null;
const activeScopes = new Set();
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
        emitDevToolsEvent({ scopeId: this.id});
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
        emitDevToolsEvent({ scopeId: this.id});
    }
}
function effectScope(detached = false) { return new ScopeImpl(detached); }
function getCurrentScope() { return activeScope; }
function onScopeDispose(dispose) {
    if (!activeScope)
        return () => undefined;
    return activeScope.add(dispose);
}

// Reactive State Management Module (Vue 3-style)
const watchers = {};
// Dependency tracking
const targetMap = new WeakMap();
const proxyCache = new WeakMap();
let activeEffect = null;
const effectStack = [];
function runCleanups(effectFn) {
    const callbacks = effectFn.cleanups.splice(0);
    callbacks.forEach(callback => {
        try {
            callback();
        }
        catch (error) {
            console.error('OneKit effect cleanup failed:', error);
        }
    });
}
function cleanup(effectFn) {
    clearDevToolsDependencies(getDevToolsEffectId(effectFn));
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
        recordDevToolsDependency(getDevToolsEffectId(activeEffect), getDevToolsTargetId(target));
    }
}
function isArrayIndex(key) {
    return typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key);
}
function trigger(target, key, oldValue, newValue) {
    emitDevToolsEvent({
        targetId: getDevToolsTargetId(target)});
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const effectsToRun = new Set();
    depsMap.get(key)?.forEach(effect => effectsToRun.add(effect));
    // Array index additions change length, while shortening an array invalidates
    // effects that read removed indexes. The implicit length write performed by
    // push/splice is not consistently observable through a Proxy set trap.
    if (Array.isArray(target)) {
        if (isArrayIndex(key) && Number(key) >= target.length - 1) {
            depsMap.get('length')?.forEach(effect => effectsToRun.add(effect));
        }
        if (key === 'length' && typeof newValue === 'number') {
            depsMap.forEach((effects, depKey) => {
                if (isArrayIndex(depKey) && Number(depKey) >= newValue) {
                    effects.forEach(effect => effectsToRun.add(effect));
                }
            });
        }
    }
    if (effectsToRun.size === 0)
        return;
    effectsToRun.forEach(effect => {
        if (effect.options?.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            {
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
function effect(fn, options = {}) {
    const effectFn = (() => {
        if (effectFn.stopped || effectStack.includes(effectFn)) {
            return; // Prevent infinite recursion
        }
        emitDevToolsEvent({ effectId: getDevToolsEffectId(effectFn)});
        runCleanups(effectFn);
        cleanup(effectFn);
        try {
            effectStack.push(effectFn);
            activeEffect = effectFn;
            const registerCleanup = callback => {
                if (!effectFn.stopped)
                    effectFn.cleanups.push(callback);
            };
            return fn(registerCleanup);
        }
        finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1] || null;
        }
    });
    effectFn.deps = [];
    effectFn.cleanups = [];
    effectFn.options = options;
    const effectId = getDevToolsEffectId(effectFn);
    const ownerScope = getCurrentScope();
    registerDevToolsResource({
        ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null});
    emitDevToolsEvent({
        ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null});
    if (!options.lazy) {
        effectFn();
    }
    onScopeDispose(() => {
        emitDevToolsEvent({
            ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null});
        disposeDevToolsResource(effectId);
        stop(effectFn);
    });
    return effectFn;
}
function stop(runner) {
    const effectFn = runner;
    effectFn.stopped = true;
    runCleanups(effectFn);
    emitDevToolsEvent({ effectId: getDevToolsEffectId(effectFn)});
    cleanup(effectFn);
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
    // Compile text interpolations into fine-grained text-node effects.
    // Each effect updates only its own text node instead of replacing the root DOM.
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }
    textNodes.forEach((textNode) => {
        const source = textNode.nodeValue ?? '';
        if (!/\{\{[^}]+\}\}/.test(source))
            return;
        effect(() => {
            const rendered = source.replace(/\{\{([^}]+)\}\}/g, (_match, expression) => {
                const value = evaluateExpression(String(expression).trim(), context);
                return value === undefined || value === null ? '' : String(value);
            });
            textNode.nodeValue = rendered;
        });
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
        const forMatch = ctx.expression.match(/^\s*\(?(\w+)(?:\s*,\s*(\w+))?\)?\s+in\s+(.+)$/);
        if (!forMatch) {
            console.error('Invalid ok-for expression:', ctx.expression);
            return;
        }
        const [, itemName, indexName, collectionExpr] = forMatch;
        const templateElement = ctx.element.cloneNode(true);
        const parent = ctx.element.parentElement;
        if (!parent)
            return;
        parent.removeChild(ctx.element);
        let blocks = new Map();
        const itemKey = (item, index) => {
            if (item && typeof item === 'object') {
                const record = item;
                const key = record.id ?? record.key;
                if (typeof key === 'string' || typeof key === 'number')
                    return key;
            }
            return index;
        };
        const renderList = (items) => {
            if (!Array.isArray(items)) {
                console.error('ok-for collection must be an array:', collectionExpr);
                return;
            }
            const nextBlocks = new Map();
            const ordered = [];
            const seenKeys = new Set();
            items.forEach((item, index) => {
                const baseKey = itemKey(item, index);
                let key = baseKey;
                if (seenKeys.has(baseKey)) {
                    key = `${String(baseKey)}::duplicate:${index}`;
                    console.warn(`[OneKit] Duplicate ok-for key "${String(baseKey)}"; using a positional fallback for item ${index}.`);
                }
                seenKeys.add(key);
                const previous = blocks.get(key);
                if (previous) {
                    previous.context[itemName] = item;
                    if (indexName)
                        previous.context[indexName] = index;
                    nextBlocks.set(key, previous);
                    ordered.push(previous.element);
                    return;
                }
                const context = reactive({
                    ...ctx.rootContext,
                    [itemName]: item,
                    ...(indexName ? { [indexName]: index } : {}),
                });
                const scope = effectScope(true);
                const element = scope.run(() => compileTemplate(templateElement.outerHTML, context));
                const block = { key, element, scope, context };
                nextBlocks.set(key, block);
                ordered.push(element);
            });
            blocks.forEach((block, key) => {
                if (!nextBlocks.has(key))
                    block.scope.dispose();
            });
            ordered.forEach((element, index) => {
                const anchor = parent.childNodes[index] ?? null;
                if (anchor !== element)
                    parent.insertBefore(element, anchor);
            });
            Array.from(parent.childNodes).forEach((node) => {
                if (!ordered.includes(node))
                    parent.removeChild(node);
            });
            blocks = nextBlocks;
        };
        ctx.element.__onekitForUpdate = renderList;
        ctx.element.__onekitForCollectionExpr = collectionExpr;
        renderList(evaluateExpression(collectionExpr, ctx.rootContext));
        onScopeDispose(() => {
            blocks.forEach(block => block.scope.dispose());
            blocks.clear();
        });
    },
    update(ctx) {
        const element = ctx.element;
        const renderList = element.__onekitForUpdate;
        const collectionExpr = element.__onekitForCollectionExpr;
        renderList?.(collectionExpr ? evaluateExpression(collectionExpr, ctx.rootContext) : ctx.value);
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
        element.className = ctx.value == null ? '' : String(ctx.value);
    }
    else if (attrName === 'style') {
        if (ctx.value && typeof ctx.value === 'object') {
            Object.assign(element.style, ctx.value);
        }
        else {
            element.removeAttribute('style');
        }
    }
    else if (attrName === 'href' || attrName === 'src') {
        const safeURL = ctx.value == null ? '' : sanitizeURL(String(ctx.value));
        if (safeURL)
            element.setAttribute(attrName, safeURL);
        else
            element.removeAttribute(attrName);
    }
    else if (ctx.value == null || ctx.value === false) {
        element.removeAttribute(attrName);
    }
    else {
        element.setAttribute(attrName, String(ctx.value));
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
            // Preserve the reactive root Proxy so methods and state remain available.
            const eventContext = new Proxy({ $event: event }, {
                get(target, key) {
                    if (key === '$event')
                        return target.$event;
                    return ctx.rootContext?.[key];
                },
                has(_target, key) {
                    return key === '$event' || key in (ctx.rootContext ?? {});
                },
            });
            evaluateExpression(ctx.expression, eventContext);
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

// Component System Module
const componentInstances = new Map();
registerDevToolsInspector('components', () => Array.from(componentInstances.values()).map((instance) => ({
    id: instance.componentId,
    name: instance.name,
    mounted: instance.mounted,
    props: instance.props,
    state: instance.state,
})));

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
                .map(([k, v]) => {
                const safeValue = sanitizeStyleValue(String(v));
                return safeValue ? `${k}:${safeValue}` : '';
            })
                .filter(Boolean)
                .join(';');
            if (styleStr)
                attrs.push(`style="${escapeHtml(styleStr)}"`);
        }
        else if (/^on/i.test(key)) {
            // Never serialize event-handler props, including attacker-controlled strings.
            continue;
        }
        else if (['href', 'src', 'action', 'formaction', 'poster'].includes(key.toLowerCase()) && !isSafeURL(String(value))) {
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
function createSSRContext() {
    return {
        head: [],
        body: [],
        styles: [],
        scripts: [],
        meta: {}
    };
}

function abortError(signal) {
    if (signal.reason !== undefined)
        return signal.reason;
    if (typeof DOMException === 'function')
        return new DOMException('The prerender operation was aborted', 'AbortError');
    return new Error('The prerender operation was aborted');
}
function normalizePath(path) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
        throw new TypeError(`Prerender paths must be absolute URL paths: ${String(path)}`);
    }
    const pathname = path.split(/[?#]/, 1)[0] || '/';
    if (pathname.split('/').some(segment => segment === '..' || segment === '.')) {
        throw new TypeError(`Prerender paths cannot contain traversal segments: ${path}`);
    }
    return path;
}
function isRenderResult(value) {
    return Boolean(value && typeof value === 'object' && 'html' in value && typeof value.html === 'string' && 'context' in value);
}
function normalizeRenderValue(value) {
    if (typeof value === 'string')
        return renderToString(value);
    if (isRenderResult(value))
        return value;
    return renderToString(value);
}
/**
 * Render a finite, application-selected set of concrete paths in deterministic order.
 * The utility is sequential by design so applications control request/cache isolation.
 */
async function prerenderRoutes(options) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const abort = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted)
        abort();
    else
        externalSignal?.addEventListener('abort', abort, { once: true });
    try {
        const sourcePaths = typeof options.paths === 'function' ? await options.paths() : options.paths;
        const paths = [...new Set(sourcePaths.map(normalizePath))].sort((left, right) => left.localeCompare(right));
        const pages = [];
        for (const path of paths) {
            if (controller.signal.aborted)
                throw abortError(controller.signal);
            const rendered = await options.render({ path, signal: controller.signal, manifest: options.manifest });
            if (controller.signal.aborted)
                throw abortError(controller.signal);
            const result = normalizeRenderValue(rendered);
            const page = { path, html: result.html, context: result.context };
            pages.push(page);
            await options.onPage?.(page);
        }
        return pages;
    }
    finally {
        externalSignal?.removeEventListener('abort', abort);
    }
}

function compileOkjsForVite(source, id) {
    const compiled = compileOkjs(source, id);
    const transpiled = typescript__namespace.transpileModule(compiled.code, {
        compilerOptions: {
            module: typescript__namespace.ModuleKind.ESNext,
            target: typescript__namespace.ScriptTarget.ES2020,
            sourceMap: false,
        },
        fileName: id,
    });
    return { code: transpiled.outputText, map: null };
}
function cleanId(id) { return id.split('?')[0]; }
function detectComponentBoundary(code, markers = true) {
    const header = code.slice(0, 4096).replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
    const hasClientDirective = /^["']use client["'];?/.test(header);
    const hasServerDirective = /^["']use server["'];?/.test(header);
    const hasClientMarker = markers && /import\s+(?:['"]client-only['"]|[^;]*from\s+['"]client-only['"])/.test(header);
    const hasServerMarker = markers && /import\s+(?:['"]server-only['"]|[^;]*from\s+['"]server-only['"])/.test(header);
    const isClient = hasClientDirective || hasClientMarker;
    const isServer = hasServerDirective || hasServerMarker;
    if (isClient && isServer)
        throw new Error('OneKit component boundary violation: a module cannot declare both client and server boundaries');
    return isClient ? 'client' : isServer ? 'server' : 'shared';
}
function discoverFiles(root, include) {
    if (!statSafe(root)?.isDirectory())
        return [];
    const result = [];
    const visit = (directory) => {
        for (const entry of node_fs.readdirSync(directory, { withFileTypes: true })) {
            const file = node_path.resolve(directory, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && include.test(file))
                result.push(file);
        }
    };
    visit(root);
    return result.sort((left, right) => left.localeCompare(right));
}
function statSafe(file) {
    try {
        return node_fs.statSync(file);
    }
    catch {
        return undefined;
    }
}
function projectSourcePath(file, projectRoot) {
    const value = node_path.relative(projectRoot, file).replace(/\\/g, '/');
    return `/${value}`;
}
function manifestRoot(root) {
    const normalized = root.replace(/\\/g, '/').replace(/\/$/, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
function extensionPattern(extensions) {
    const values = (extensions?.length ? extensions : ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte', 'okjs'])
        .map(extension => extension.replace(/^\./, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\.(?:${values.join('|')})$`, 'i');
}
function prerenderOutputFile(outputDir, path) {
    const pathname = path.split(/[?#]/, 1)[0] || '/';
    const segments = pathname.split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'))) {
        throw new TypeError(`Unsafe prerender output path: ${path}`);
    }
    return node_path.resolve(outputDir, ...segments, 'index.html');
}
function generateFileRouteModule(files, options, projectRoot) {
    const sourceFiles = files.map(file => projectSourcePath(file, projectRoot));
    const manifest = createFileRouteManifest(sourceFiles, {
        root: manifestRoot(options.root),
        includeInfrastructure: options.includeInfrastructure,
    });
    const conflicts = findFileRouteConflicts(manifest);
    if (conflicts.length) {
        const details = conflicts.map(conflict => `${conflict.path}: ${conflict.files.join(', ')}`).join('; ');
        throw new Error(`OneKit file-route conflict: multiple route files normalize to the same path (${details})`);
    }
    const associations = createFileRouteAssociations(manifest);
    const routeEntries = manifest.routes.map(entry => ({ entry, index: sourceFiles.indexOf(entry.file) })).filter(item => item.index >= 0);
    const routePaths = routeEntries.map(({ entry }) => entry.path);
    const imports = routeEntries.map(({ entry, index }) => `import * as __route${index} from ${JSON.stringify(entry.file)};`).join('\n');
    const routeBindings = routeEntries.map(({ index }) => `const __route${index}Route = Reflect.get(__route${index}, 'route');\nconst __route${index}Default = Reflect.get(__route${index}, 'default');`).join('\n');
    const routes = routeEntries.map(({ entry, index }) => `{
    ...(typeof __route${index}Route === 'object' && __route${index}Route ? __route${index}Route : {}),
    path: __route${index}Route?.path ?? ${JSON.stringify(entry.path)},
    ...(__route${index}Default !== undefined ? { component: __route${index}Default } : {}),
    ...(__route${index}Route?.component !== undefined ? { component: __route${index}Route.component } : {}),
  }`).join(',\n');
    return `${imports}\n${routeBindings}\nexport const fileRouteManifest = ${JSON.stringify(manifest)};\nexport const fileRouteEntries = fileRouteManifest.routes;\n/** @type {readonly string[]} */\nexport const fileRoutePaths = [${routePaths.map(path => JSON.stringify(path)).join(', ')}];\nexport const fileRouteAssociations = ${JSON.stringify(associations)};\nexport const fileRouteLayouts = fileRouteManifest.layouts;\nexport const fileRouteMiddleware = fileRouteManifest.middleware;\nexport const routes = [${routes}];\nexport default routes;\n`;
}
function generateFileRouteTypes(manifest) {
    const routePathUnion = manifest.routes.length
        ? manifest.routes.map(entry => JSON.stringify(entry.path)).join(' | ')
        : 'never';
    const routeImports = manifest.routes
        .map((entry, index) => `import type * as __route${index} from ${JSON.stringify(entry.file)};`)
        .join('\n');
    const routeModuleMap = manifest.routes.length
        ? `${manifest.routes.map((entry, index) => `Path extends ${JSON.stringify(entry.path)} ? typeof __route${index}`).join(' : ')} : never`
        : 'never';
    return `${routeImports}\nimport type { FileRouteAssociation, FileRouteComponentPropsFor, FileRouteLoaderDataFor, FileRouteManifest, FileRouteManifestEntry, RouteParamsFor } from 'onekit-js';
import type { Route } from 'onekit-js/router';
export type FileRoutePath = ${routePathUnion};
export type FileRouteParams<Path extends FileRoutePath> = RouteParamsFor<Path>;
export type FileRouteModuleFor<Path extends FileRoutePath> = ${routeModuleMap};
export type FileRouteLoaderData<Path extends FileRoutePath> = FileRouteLoaderDataFor<FileRouteModuleFor<Path>>;
export type FileRouteComponentProps<Path extends FileRoutePath> = FileRouteComponentPropsFor<FileRouteModuleFor<Path>>;
export declare const fileRouteManifest: FileRouteManifest;
export declare const fileRouteEntries: readonly FileRouteManifestEntry[];
export declare const fileRoutePaths: readonly FileRoutePath[];
export declare const fileRouteAssociations: readonly FileRouteAssociation[];
export declare const fileRouteLayouts: readonly FileRouteManifestEntry[];
export declare const fileRouteMiddleware: readonly FileRouteManifestEntry[];
export declare const routes: readonly Route[];
export default routes;
`;
}
/**
 * Vite plugin for OKJS/HMR plus opt-in file-route generation and component-boundary checks.
 * The advanced capabilities are explicit so existing users retain the original plugin behavior.
 */
function oneKitVitePlugin(options = {}) {
    const include = options.include ?? /\.(ts|tsx|js|jsx|vue|svelte|okjs|html)$/;
    const exclude = options.exclude ?? /node_modules/;
    let projectRoot = process.cwd();
    const boundaryById = new Map();
    const importsById = new Map();
    const configuredBoundary = options.componentBoundary !== undefined;
    const strictBoundary = typeof options.componentBoundary === 'object' ? options.componentBoundary.strict !== false : true;
    const boundaryMarkers = typeof options.componentBoundary === 'object' ? options.componentBoundary.markers !== false : true;
    const virtualId = options.fileRoutes?.virtualModuleId ?? 'virtual:onekit/routes';
    const typesVirtualId = options.fileRoutes?.typesVirtualModuleId ?? `${virtualId}.d.ts`;
    const resolvedVirtualId = `\0${virtualId}`;
    const resolvedTypesVirtualId = `\0${typesVirtualId}`;
    const isOkjs = (id) => cleanId(id).endsWith('.okjs') && !exclude.test(id);
    const recordBoundary = (code, id) => {
        if (!configuredBoundary || exclude.test(id))
            return;
        boundaryById.set(cleanId(id), detectComponentBoundary(code, boundaryMarkers));
    };
    return {
        name: 'onekit-v3-hmr',
        enforce: 'pre',
        configResolved(config) {
            projectRoot = config.root;
        },
        resolveId(source, importer) {
            if (source === virtualId)
                return resolvedVirtualId;
            if (source === typesVirtualId)
                return resolvedTypesVirtualId;
            if (!isOkjs(source))
                return undefined;
            const cleanSource = cleanId(source);
            if (cleanSource.startsWith('/') && !cleanSource.startsWith('//'))
                return node_path.resolve(projectRoot, `.${cleanSource}`);
            if (cleanSource.startsWith('.') && importer)
                return node_path.resolve(node_path.dirname(cleanId(importer)), cleanSource);
            return undefined;
        },
        load(id) {
            if (id === resolvedTypesVirtualId && options.fileRoutes) {
                const configured = options.fileRoutes;
                const root = configured.root.startsWith('/') ? node_path.resolve(projectRoot, `.${configured.root}`) : node_path.resolve(projectRoot, configured.root);
                const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
                const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
                    root: manifestRoot(configured.root),
                    includeInfrastructure: configured.includeInfrastructure,
                });
                return { code: generateFileRouteTypes(manifest), map: null };
            }
            if (id === resolvedVirtualId && options.fileRoutes) {
                const configured = options.fileRoutes;
                const root = configured.root.startsWith('/') ? node_path.resolve(projectRoot, `.${configured.root}`) : node_path.resolve(projectRoot, configured.root);
                const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
                const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
                    root: manifestRoot(configured.root),
                    includeInfrastructure: configured.includeInfrastructure,
                });
                configured.onManifest?.(manifest);
                return { code: generateFileRouteModule(files, configured, projectRoot), map: null };
            }
            if (!isOkjs(id))
                return undefined;
            return compileOkjsForVite(node_fs.readFileSync(cleanId(id), 'utf8'), id);
        },
        transform(code, id) {
            recordBoundary(code, id);
            if (!isOkjs(id) || code.includes('const __okjsComponent = __okjsDefineComponent'))
                return undefined;
            return compileOkjsForVite(code, id);
        },
        moduleParsed(module) {
            if (!configuredBoundary)
                return;
            const id = cleanId(module.id);
            const imported = new Set();
            for (const child of module.importedModules ?? []) {
                if (child?.id)
                    imported.add(cleanId(child.id));
            }
            importsById.set(id, imported);
        },
        buildEnd() {
            if (!configuredBoundary || !strictBoundary)
                return;
            const reachesServer = (id, visiting) => {
                if (boundaryById.get(id) === 'server')
                    return id;
                if (visiting.has(id))
                    return undefined;
                const next = new Set(visiting).add(id);
                for (const imported of importsById.get(id) ?? []) {
                    const server = reachesServer(imported, next);
                    if (server)
                        return server;
                }
                return undefined;
            };
            for (const [id, boundary] of boundaryById) {
                if (boundary !== 'client')
                    continue;
                for (const imported of importsById.get(id) ?? []) {
                    const server = reachesServer(imported, new Set([id]));
                    if (server) {
                        throw new Error(`OneKit component boundary violation: client module ${id} statically imports server module ${server} (reaches server module through a transitive static path). Move the import behind a server-owned boundary or mark the shared module explicitly.`);
                    }
                }
            }
        },
        async closeBundle() {
            const configured = options.fileRoutes;
            if (!configured?.prerender)
                return;
            const root = configured.root.startsWith('/') ? node_path.resolve(projectRoot, `.${configured.root}`) : node_path.resolve(projectRoot, configured.root);
            const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
            const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
                root: manifestRoot(configured.root),
                includeInfrastructure: configured.includeInfrastructure,
            });
            const outputDir = configured.prerender.outputDir
                ? (configured.prerender.outputDir.startsWith('/')
                    ? node_path.resolve(configured.prerender.outputDir)
                    : node_path.resolve(projectRoot, configured.prerender.outputDir))
                : undefined;
            await prerenderRoutes({
                paths: configured.prerender.paths,
                manifest,
                render: configured.prerender.render,
                onPage: async (page) => {
                    if (outputDir) {
                        const outputFile = prerenderOutputFile(outputDir, page.path);
                        node_fs.mkdirSync(node_path.dirname(outputFile), { recursive: true });
                        node_fs.writeFileSync(outputFile, page.html, 'utf8');
                    }
                    await configured.prerender?.onPage?.(page);
                },
            });
        },
        handleHotUpdate({ file, modules, server }) {
            if (!include.test(file) || exclude.test(file))
                return modules;
            options.onUpdate?.(file);
            server.ws.send({
                type: 'custom',
                event: 'onekit:hmr-update',
                data: {
                    file,
                    timestamp: Date.now(),
                    kind: file.endsWith('.okjs') ? 'okjs-component' : 'module',
                    reload: file.endsWith('.okjs') ? 'template-and-script' : 'module',
                },
            });
            return modules;
        },
    };
}

/** Store a reactive module's state in Vite's hot data object. */
function preserveHMRState(key, initial, hot = getHotModule()) {
    if (!hot)
        return initial;
    const existing = hot.data.state?.[key];
    const state = (existing && typeof existing === 'object' ? existing : initial);
    hot.accept();
    hot.dispose((data) => {
        data.state ??= {};
        data.state[key] = state;
        data.updatedAt = Date.now();
    });
    return state;
}
/** Register a scope/component/store cleanup for Vite module replacement. */
function registerHMRDisposable(resource, hot = getHotModule()) {
    if (!hot)
        return resource;
    const dispose = resource.dispose ?? resource.stop ?? resource.unsubscribe;
    if (dispose)
        hot.dispose(() => dispose.call(resource));
    return resource;
}
function getHotModule() {
    const meta = ({ url: (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('vite.cjs', document.baseURI).href)) });
    return meta.hot;
}

exports.oneKitVitePlugin = oneKitVitePlugin;
exports.preserveHMRState = preserveHMRState;
exports.registerHMRDisposable = registerHMRDisposable;
//# sourceMappingURL=vite.cjs.map
