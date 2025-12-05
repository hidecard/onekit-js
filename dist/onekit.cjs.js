'use strict';

// Error handling system
function errorHandler(error, context = 'Unknown') {
    console.error(`OneKit Error [${context}]:`, error);
    // Dispatch a custom error event
    const event = new CustomEvent('onekit-error', {
        detail: { error, context },
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);
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

const DEFAULT_SECURITY_CONFIG = {
    ALLOWED_TAGS: [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'br', 'strong', 'em', 'b', 'i',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'button',
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
                const isAllowed = securityConfig.ALLOWED_ATTRIBUTES.some(allowed => {
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
                this.addEventListener(event, function (e) {
                    if (e.target && e.target.matches?.(selector)) {
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
// Global error handlers
window.addEventListener('unhandledrejection', function (event) {
    errorHandler(event.reason, 'Unhandled Promise Rejection');
    event.preventDefault();
});
window.addEventListener('error', function (event) {
    errorHandler(event.error, 'JavaScript Error');
});
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

// Component System Module
const components = {};
const componentInstances = new Map();
function register(name, definition) {
    components[name] = definition;
}
function create(name, props = {}, slots = {}) {
    if (!components[name]) {
        console.error(`Component "${name}" not found`);
        return null;
    }
    const definition = components[name];
    const defaultProps = definition.props || {};
    const finalProps = { ...defaultProps, ...props };
    const instance = {
        name,
        props: finalProps,
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
            definition.updated?.call(this);
        }
    };
    // Create element
    let html = '';
    if (definition.template) {
        html = definition.template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const keys = key.trim().split('.');
            let value = instance.state;
            if (keys[0] in instance.props) {
                value = instance.props;
            }
            for (const k of keys) {
                value = value && value[k];
            }
            return value !== undefined ? value : '';
        });
        // Replace slots
        html = html.replace(/<slot><\/slot>/gi, instance.slots.default || '');
        html = html.replace(/<slot name="([^"]+)"><\/slot>/gi, (match, slotName) => {
            return instance.slots[slotName] || '';
        });
        // Sanitize HTML before creating element
        const sanitized = sanitizeHTML(html);
        instance.element = document.createElement('div');
        instance.element.innerHTML = sanitized;
        instance.element = instance.element.firstElementChild;
    }
    else if (definition.render) {
        html = definition.render.call(instance);
        // Sanitize HTML before creating element
        const sanitized = sanitizeHTML(html);
        instance.element = document.createElement('div');
        instance.element.innerHTML = sanitized;
        instance.element = instance.element.firstElementChild;
    }
    // Add lifecycle hooks
    definition.beforeCreate?.call(instance);
    definition.created?.call(instance);
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
    const definition = components[comp.name];
    definition?.mounted?.call(comp);
    return comp;
}
function getInstance(element) {
    return componentInstances.get(element);
}
function destroy(component) {
    if (!component || !component.element)
        return;
    const definition = components[component.name];
    definition?.beforeUnmount?.call(component);
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
}

// Reactive State Management Module
const watchers = {};
function reactive(obj) {
    return new Proxy(obj, {
        get(target, property) {
            return target[property];
        },
        set(target, property, value) {
            const prop = property;
            const oldValue = target[prop];
            if (oldValue !== value) {
                target[prop] = value;
                if (watchers[prop]) {
                    watchers[prop].forEach(watcher => {
                        watcher.callback(value, oldValue, watcher.property);
                    });
                }
            }
            return true;
        }
    });
}
function watch(key, callback) {
    const keyStr = key;
    if (!watchers[keyStr]) {
        watchers[keyStr] = [];
    }
    const watcher = { callback, property: key };
    watchers[keyStr].push(watcher);
    return function () {
        const index = watchers[keyStr].indexOf(watcher);
        if (index > -1) {
            watchers[keyStr].splice(index, 1);
        }
    };
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

function createElement(tag, props = {}, ...children) {
    return {
        tag,
        props: props || {},
        children: children.flat(),
        key: typeof props.key === 'string' ? props.key : undefined
    };
}
function render(vnode) {
    if (typeof vnode === 'string') {
        return document.createTextNode(vnode);
    }
    const element = document.createElement(vnode.tag);
    // Set properties
    for (const prop in vnode.props) {
        if (prop === 'key')
            continue;
        const propValue = vnode.props[prop];
        if (prop.startsWith('on') && typeof propValue === 'function') {
            element.addEventListener(prop.slice(2).toLowerCase(), propValue);
        }
        else if (prop === 'className' && typeof propValue === 'string') {
            element.setAttribute('class', propValue);
        }
        else if (prop === 'style' && typeof propValue === 'object' && propValue !== null) {
            Object.assign(element.style, propValue);
        }
        else if (typeof propValue === 'string') {
            element.setAttribute(prop, propValue);
        }
    }
    // Render children
    vnode.children.forEach(child => {
        element.appendChild(render(child));
    });
    // Store vnode reference
    element._vnode = vnode;
    return element;
}
function patch$1(parent, newVNode, oldVNode) {
    const oldElement = parent.firstChild;
    if (!oldElement) {
        // No existing element, just render and append
        parent.appendChild(render(newVNode));
        return;
    }
    if (!oldVNode) {
        // No old vnode, replace entire content
        parent.innerHTML = '';
        parent.appendChild(render(newVNode));
        return;
    }
    if (typeof newVNode === 'string' && typeof oldVNode === 'string') {
        // Both are strings, just update text
        if (newVNode !== oldVNode) {
            oldElement.textContent = newVNode;
        }
        return;
    }
    if (typeof newVNode === 'string' || typeof oldVNode === 'string') {
        // One is string, one is vnode, replace
        parent.replaceChild(render(newVNode), oldElement);
        return;
    }
    // Both are vnodes
    if (newVNode.tag !== oldVNode.tag) {
        // Different tags, replace
        parent.replaceChild(render(newVNode), oldElement);
        return;
    }
    // Same tag, update props and children
    updateProps(oldElement, newVNode.props, oldVNode.props);
    updateChildren(oldElement, newVNode.children, oldVNode.children);
}
function updateProps(element, newProps, oldProps) {
    // Remove old props
    for (const prop in oldProps) {
        if (prop === 'key')
            continue;
        if (!(prop in newProps)) {
            if (prop.startsWith('on')) {
                // Remove event listener (simplified - in real implementation, store handlers)
                const oldValue = oldProps[prop];
                if (typeof oldValue === 'function') {
                    element.removeEventListener(prop.slice(2).toLowerCase(), oldValue);
                }
            }
            else {
                element.removeAttribute(prop);
            }
        }
    }
    // Add/update new props
    for (const prop in newProps) {
        if (prop === 'key')
            continue;
        const newValue = newProps[prop];
        const oldValue = oldProps[prop];
        if (newValue !== oldValue) {
            if (prop.startsWith('on') && typeof newValue === 'function') {
                element.addEventListener(prop.slice(2).toLowerCase(), newValue);
            }
            else if (prop === 'className' && typeof newValue === 'string') {
                element.setAttribute('class', newValue);
            }
            else if (prop === 'style' && typeof newValue === 'object' && newValue !== null) {
                Object.assign(element.style, newValue);
            }
            else if (typeof newValue === 'string') {
                element.setAttribute(prop, newValue);
            }
        }
    }
}
function updateChildren(parent, newChildren, oldChildren) {
    const maxLength = Math.max(newChildren.length, oldChildren.length);
    for (let i = 0; i < maxLength; i++) {
        const newChild = newChildren[i];
        const oldChild = oldChildren[i];
        if (!newChild && oldChild) {
            // Remove extra old child
            parent.removeChild(parent.childNodes[i]);
        }
        else if (newChild && !oldChild) {
            // Add new child
            parent.appendChild(render(newChild));
        }
        else if (newChild && oldChild) {
            // Update existing child
            patch$1(parent.childNodes[i], newChild, oldChild);
        }
    }
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
// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); } 40%, 43% { transform: translate3d(0, -30px, 0); } 70% { transform: translate3d(0, -15px, 0); } 90% { transform: translate3d(0, -4px, 0); } }
  @keyframes shake { 0%, 100% { transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); } }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);
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

/**
 * Router module for OneKit
 * Handles client-side routing functionality
 */
class Router {
    routes = [];
    addRoute(route) {
        this.routes.push(route);
    }
    navigate(path) {
        // Basic navigation logic
        const route = this.routes.find(r => r.path === path);
        if (route?.handler) {
            route.handler();
        }
    }
    getCurrentPath() {
        return window.location.pathname;
    }
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
// Pre-configured storage instances
const localStorage = new Storage(window.localStorage, { prefix: 'onekit_' });
const sessionStorage = new Storage(window.sessionStorage, { prefix: 'onekit_' });
// Utility functions
function createStorage(storage, options) {
    return new Storage(storage, options);
}
// Cache with TTL
const cache = new Storage(window.sessionStorage, {
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

// OneKit - Modern JavaScript Framework
// Main entry point with tree-shaking friendly exports
// Core systems
// Version info
const VERSION = '3.0.0-alpha';

exports.API = API;
exports.DependencyInjector = DependencyInjector;
exports.OneKit = OneKit;
exports.Router = Router;
exports.VERSION = VERSION;
exports.animations = animations;
exports.announce = announce;
exports.apiPatch = patch;
exports.bind = bind;
exports.cache = cache;
exports.create = create;
exports.createElement = createElement;
exports.createLandmarks = createLandmarks;
exports.createSkipLink = createSkipLink;
exports.createStorage = createStorage;
exports.debounce = debounce;
exports.deepClone = deepClone;
exports.del = del;
exports.destroy = destroy;
exports.di = di;
exports.generateId = generateId;
exports.get = get;
exports.getInstance = getInstance;
exports.localStorage = localStorage;
exports.makeFocusable = makeFocusable;
exports.makeUnfocusable = makeUnfocusable;
exports.manageTabOrder = manageTabOrder;
exports.mount = mount;
exports.ok = ok;
exports.pluginManager = pluginManager;
exports.post = post;
exports.put = put;
exports.reactive = reactive;
exports.register = register;
exports.render = render;
exports.request = request;
exports.router = router;
exports.sessionStorage = sessionStorage;
exports.setAriaAttributes = setAriaAttributes;
exports.skipToContent = skipToContent;
exports.throttle = throttle;
exports.trapFocus = trapFocus;
exports.validateAccessibility = validateAccessibility;
exports.vdomPatch = patch$1;
exports.watch = watch;
//# sourceMappingURL=onekit.cjs.js.map
