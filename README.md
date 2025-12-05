# OneKit JS

Simple DOM utilities and reactive state helpers for modern JavaScript apps.

## Installation

```bash
npm install onekit-js
```

## Usage in frameworks (React / Vue / Svelte / Vite, etc.)

In any bundler-based project (Vite, webpack, Create React App, Next.js, etc.) you can import OneKit with a **bare module specifier**, just like React:

```js
import { ok, reactive, watch, announce } from 'onekit-js';

// Create reactive state
const state = reactive({ count: 0 });

// React to changes
watch(state, 'count', (next, prev) => {
  console.log('count changed', prev, '→', next);
});

// Wire up DOM events (this works in any app shell)
ok('#inc').click(() => state.count++);
ok('#dec').click(() => state.count--);

ok('#greet').click(() => {
  const name = document.querySelector('#input-name')?.value || 'World';
  ok('#name').text(name);
  announce(`Greeted ${name}`);
});
```

This usage works in:

- React apps (CRA, Next.js, Remix, etc.)
- Vue / Nuxt
- Svelte / SvelteKit
- Vite "vanilla" or any other bundler that understands `node_modules`.

You typically put the above code in your main entry file (for example `src/main.js`, `src/index.tsx`, or inside a component `useEffect` in React if you want to run it after mount).

### React (Vite or CRA)

```jsx
import { useEffect } from 'react';
import { ok, reactive, watch, announce } from 'onekit-js';

export function App() {
  useEffect(() => {
    const state = reactive({ count: 0 });

    watch(state, 'count', (next) => {
      ok('#count').text(String(next));
    });

    ok('#inc').click(() => state.count++);
    ok('#dec').click(() => state.count--);

    ok('#greet').click(() => {
      const name = document.querySelector('#input-name')?.value || 'World';
      ok('#name').text(name);
      announce(`Greeted ${name}`);
    });
  }, []);

  return (
    <div>
      <h1>Hello <span id="name">World</span>!</h1>
      <input id="input-name" />
      <button id="greet">Greet</button>
      <div>
        Count: <span id="count">0</span>
        <button id="inc">+</button>
        <button id="dec">-</button>
      </div>
    </div>
  );
}
```

### Vue 3 (script setup)

```vue
<script setup>
import { onMounted } from 'vue';
import { ok, reactive, watch, announce } from 'onekit-js';

onMounted(() => {
  const state = reactive({ count: 0 });

  watch(state, 'count', (next) => {
    ok('#count').text(String(next));
  });

  ok('#inc').click(() => state.count++);
  ok('#dec').click(() => state.count--);

  ok('#greet').click(() => {
    const name = document.querySelector('#input-name')?.value || 'World';
    ok('#name').text(name);
    announce(`Greeted ${name}`);
  });
});
</script>

<template>
  <div>
    <h1>Hello <span id="name">World</span>!</h1>
    <input id="input-name" />
    <button id="greet">Greet</button>
    <div>
      Count: <span id="count">0</span>
      <button id="inc">+</button>
      <button id="dec">-</button>
    </div>
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { ok, reactive, watch, announce } from 'onekit-js';

  onMount(() => {
    const state = reactive({ count: 0 });

    watch(state, 'count', (next) => {
      ok('#count').text(String(next));
    });

    ok('#inc').click(() => state.count++);
    ok('#dec').click(() => state.count--);

    ok('#greet').click(() => {
      const name = document.querySelector('#input-name')?.value || 'World';
      ok('#name').text(name);
      announce(`Greeted ${name}`);
    });
  });
</script>

<h1>Hello <span id="name">World</span>!</h1>
<input id="input-name" />
<button id="greet">Greet</button>
<div>
  Count: <span id="count">0</span>
  <button id="inc">+</button>
  <button id="dec">-</button>
</div>
```

### Vite vanilla

In a Vite "vanilla" project (`npm create vite@latest my-app -- --template vanilla`):

```js
// src/main.js
import { ok, reactive, watch, announce } from 'onekit-js';

const state = reactive({ count: 0 });

watch(state, 'count', (next) => {
  ok('#count').text(String(next));
});

ok('#inc').click(() => state.count++);
ok('#dec').click(() => state.count--);

ok('#greet').click(() => {
  const name = document.querySelector('#input-name')?.value || 'World';
  ok('#name').text(name);
  announce(`Greeted ${name}`);
});
```

## Usage in plain HTML (no framework)

If you are not using a bundler and just have an `index.html`, import the ESM build with a **relative path**:

```html
<script type="module">
  import { ok, reactive, watch, announce } from './node_modules/onekit-js/dist/onekit.esm.js';

  const state = reactive({ count: 0 });
  watch(state, 'count', (next) => ok('#count').text(String(next)));

  ok('#inc').click(() => state.count++);
  ok('#dec').click(() => state.count--);
</script>
```

Or use the UMD build as a global if you prefer classic `<script>` tags:

```html
<script src="./node_modules/onekit-js/dist/onekit.js"></script>
<script>
  const { ok, reactive, watch, announce } = OneKit;
  // use ok(), reactive(), watch(), announce() as shown above
</script>
```

## TypeScript

Type definitions are included and exposed via the package `types` field, so imports like

```ts
import { ok, reactive } from 'onekit-js';
```

work out of the box in TypeScript projects.

## Advanced Features

### Component System

OneKit provides a simple component system for building reusable UI elements.

```js
import { register, create, mount } from 'onekit-js';

// Register a component
register('my-component', {
  name: 'my-component',
  template: '<div>Hello {{name}}! Count: {{count}}</div>',
  props: { name: 'World' },
  data: () => ({ count: 0 }),
  methods: {
    increment() {
      this.count++;
      this.update();
    }
  },
  mounted() {
    console.log('Component mounted');
  }
});

// Create and mount
const comp = create('my-component', { name: 'OneKit' });
mount(comp, '#app');

// Access component methods
comp.increment();
```

### Virtual DOM

Use the Virtual DOM for efficient rendering and updates.

```js
import { createElement, render, patch } from 'onekit-js';

// Create virtual nodes
const vnode1 = createElement('div', { className: 'container' }, 'Hello VDOM');
const vnode2 = createElement('div', { className: 'container' }, 'Hello Updated VDOM');

// Render to DOM
const element = render(vnode1);
document.body.appendChild(element);

// Patch for updates
patch(element, vnode2, vnode1);
```

### Reactive State

Create reactive objects that automatically trigger updates when changed.

```js
import { reactive, watch, bind } from 'onekit-js';

// Create reactive state
const state = reactive({ count: 0, name: 'OneKit' });

// Watch for changes
watch(state, 'count', (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`);
});

// Bind to DOM elements
bind('#count-input', state, 'count');
bind('#name-input', state, 'name', 'value');

// Update state (triggers watchers)
state.count = 5;
state.name = 'Updated';
```

### API Requests

Make HTTP requests with built-in error handling and retries.

```js
import { get, post, put, del, patch, API } from 'onekit-js';

// Simple requests
get('/api/users').then(response => {
  console.log('Users:', response.data);
});

post('/api/users', { name: 'John' }).then(response => {
  console.log('Created user:', response.data);
});

// Using API class for RESTful endpoints
const api = new API('/api/v1', {
  headers: { 'Authorization': 'Bearer token' }
});

api.get('/users').then(response => console.log(response.data));
api.post('/users', { name: 'Jane' }).then(response => console.log(response.data));

// With options
get('/api/data', {
  timeout: 5000,
  retries: 3,
  onProgress: (progress) => console.log(`Progress: ${progress}`)
});
```

### Storage

Persistent client-side storage with TTL support.

```js
import { localStorage, sessionStorage, createStorage } from 'onekit-js';

// Basic usage
localStorage.set('user', { name: 'John', id: 1 });
const user = localStorage.get('user');
localStorage.remove('user');

// Check existence and get all keys
if (localStorage.has('user')) {
  console.log('User exists');
}
const keys = localStorage.keys();

// Custom storage with TTL
const cache = createStorage(sessionStorage, {
  prefix: 'myapp_',
  ttl: 10 * 60 * 1000 // 10 minutes
});

cache.set('temp-data', { value: 'expires soon' });
```

### Router

Simple client-side routing.

```js
import { router } from 'onekit-js';

// Add routes
router.addRoute({
  path: '/home',
  handler: () => {
    console.log('Home route activated');
    // Update UI or load component
  }
});

router.addRoute({
  path: '/about',
  handler: () => console.log('About page')
});

// Navigate programmatically
router.navigate('/home');

// Get current path
const currentPath = router.getCurrentPath();
```

### Utilities

Common utility functions for development.

```js
import { debounce, throttle, deepClone, generateId } from 'onekit-js';

// Debounce function calls
const debouncedSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 300);

// Throttle function calls
const throttledScroll = throttle(() => {
  console.log('Scroll event');
}, 100);

// Deep clone objects
const original = { a: 1, b: { c: 2 } };
const cloned = deepClone(original);
cloned.b.c = 3; // Doesn't affect original

// Generate unique IDs
const id = generateId(); // e.g., "a1b2c3d4"
```

### Animations

Built-in animation methods for DOM elements.

```js
import { ok } from 'onekit-js';

// Fade animations
ok('#element').fade_in(500);
ok('#element').fade_out(300);

// Slide animations
ok('#element').slide_down(400);
ok('#element').slide_up(400);
ok('#element').slideInLeft(500);
ok('#element').slideInRight(500);

// Scale and rotate
ok('#element').scaleIn(300);
ok('#element').rotateIn(500);

// Special effects
ok('#element').bounce(1000);
ok('#element').shake(500);
ok('#element').flip(600);
ok('#element').pulse(1000, 3); // Pulse 3 times

// Custom animations
ok('#element').animate({ opacity: 0, transform: 'translateX(100px)' }, 500);
ok('#element').move(200, 100, 300); // Move to x=200, y=100
```

### OKJS Template Syntax

Custom template syntax for creating components and elements.

```js
import { okjs, component } from 'onekit-js';

// Basic template
const template = okjs`
  [div class="container"]
    [h1]Hello OKJS[/h1]
    [p class="text"]This is a custom template syntax[/p]
    [button onclick=${() => console.log('Clicked')}]Click me[/button]
  [/div]
`;

// Self-closing tags
const inputTemplate = okjs`
  [input type="text" placeholder="Enter text" /]
`;

// Component creation
const MyComponent = component({
  name: 'my-comp',
  template: '[div]Component content[/div]',
  data: () => ({ value: 'test' })
});

// Use component
const comp = MyComponent({ prop: 'value' });
```

### Accessibility (A11Y)

Built-in accessibility helpers for creating inclusive web applications.

```js
import { setAriaAttributes, announce, trapFocus, createSkipLink, validateAccessibility } from 'onekit-js';

// Set ARIA attributes
setAriaAttributes(element, {
  'aria-label': 'Close dialog',
  'aria-expanded': false,
  role: 'button'
});

// Announce dynamic content to screen readers
announce('Item added to cart', 'polite');
announce('Error: Invalid input', 'assertive');

// Trap focus in modals
const cleanup = trapFocus(modalElement);
// Later: cleanup(); // Remove focus trap

// Create skip links for keyboard navigation
const skipLink = createSkipLink('#main-content', 'Skip to main content');
document.body.insertBefore(skipLink, document.body.firstChild);

// Validate accessibility
const result = validateAccessibility(document.body);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);

// Manage tab order
manageTabOrder(container, false); // Disable tab order
manageTabOrder(container, true);  // Re-enable tab order

// Create semantic landmarks
createLandmarks();
```

### Web Components

Create and manage custom web components with OneKit.

```js
import { ok } from 'onekit-js';

// Define a custom element
class MyElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '<div>Custom Element Content</div>';
    ok(this).click(() => console.log('Clicked!'));
  }
}

customElements.define('my-element', MyElement);

// Use the custom element
document.body.innerHTML += '<my-element></my-element>';
```

### Theme System

Apply and manage themes for consistent styling.

```js
import { ok } from 'onekit-js';

// Apply theme classes
ok('body').class('theme-dark');
ok('.button').class('primary-theme');

// Theme-aware components
const themedButton = ok('<button>').class('btn themed-btn');
themedButton.text('Themed Button');
```

### Dependency Injection (DI)

Manage dependencies and services with the DI container.

```js
import { di } from 'onekit-js';

// Register services
di.register('logger', () => ({
  log: (message) => console.log('[LOG]', message)
}));

di.register('api', (logger) => ({
  fetch: (url) => {
    logger.log(`Fetching ${url}`);
    return fetch(url);
  }
}), ['logger']);

// Resolve dependencies
const logger = di.resolve('logger');
const api = di.resolve('api');

api.fetch('/api/data');
```

### Plugin System

Extend OneKit functionality with plugins.

```js
import { ok } from 'onekit-js';

// Create a plugin
const myPlugin = {
  name: 'my-plugin',
  install: function(OneKit) {
    // Add new methods to OneKit
    OneKit.prototype.highlight = function(color = 'yellow') {
      return this.each(function() {
        (this as HTMLElement).style.backgroundColor = color;
      });
    };
  }
};

// Register plugin
ok.module('my-plugin', () => myPlugin);

// Use plugin
ok('.important').highlight('lightblue');
```

### Security Features

Built-in security utilities for safe DOM manipulation and data handling.

```js
import { ok } from 'onekit-js';

// Safe HTML insertion (automatically sanitized)
ok('#content').html('<script>alert("XSS")</script><p>Safe content</p>');

// Safe URL validation
const safeUrl = 'https://example.com'; // Would be validated internally

// Safe storage operations (prevents prototype pollution)
localStorage.set('__proto__.malicious', 'blocked'); // Automatically prevented

// Deep clone for secure object copying
const original = { a: 1, b: { c: 2 } };
const cloned = deepCloneSafe(original);
```

### Error Handling

Built-in error handling and recovery mechanisms.

```js
import { errorHandler, safeMethod } from 'onekit-js';

// Custom error handler
const customHandler = (error, context) => {
  console.error(`Error in ${context}:`, error);
  // Send to error reporting service
  reportError(error, context);
};

// Set custom error handler
errorHandler.setHandler(customHandler);

// Safe method wrapper for critical operations
const safeOperation = safeMethod((data) => {
  // Potentially unsafe operation
  return JSON.parse(data);
});

// Use safe method
try {
  const result = safeOperation('{"valid": "json"}');
} catch (error) {
  console.log('Handled safely:', error.message);
}
```

### Form Handling

Utilities for working with HTML forms.

```js
import { ok } from 'onekit-js';

// Get form data as object
const formData = ok('#my-form').form_data();
console.log(formData); // { name: 'John', email: 'john@example.com' }

// Reset form
ok('#my-form').reset();

// Form validation helpers
ok('#email-input').on('blur', function() {
  const email = (this as HTMLInputElement).value;
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  ok(this).attr('aria-invalid', !isValid);
  if (!isValid) {
    announce('Please enter a valid email address', 'assertive');
  }
});

// Dynamic form fields
ok('#add-field').click(() => {
  const newField = ok('<input type="text" name="dynamic[]" />');
  ok('#dynamic-fields').append(newField);
});
```

### Web Components Integration

Advanced web components with OneKit integration.

```js
import { registerWebComponent, jsx } from 'onekit-js';

// Define component
const MyComponent = {
  name: 'my-component',
  template: '<div>Hello {{name}}!</div>',
  props: { name: 'World' },
  data: () => ({ count: 0 }),
  methods: {
    increment() {
      this.count++;
      this.update();
    }
  }
};

// Register as web component
registerWebComponent('my-component', MyComponent, {
  observedAttributes: ['name']
});

// Use in HTML
document.body.innerHTML += '<my-component name="OneKit"></my-component>';

// Or with JSX-like syntax
const element = jsx('my-component', { name: 'Test' });
```

### Advanced Dependency Injection

Service management and dependency resolution.

```js
import { di } from 'onekit-js';

// Register services with dependencies
di.register('config', () => ({
  apiUrl: 'https://api.example.com',
  timeout: 5000
}));

di.register('httpClient', (config) => ({
  get: (url) => fetch(`${config.apiUrl}${url}`, {
    timeout: config.timeout
  })
}), ['config']);

di.register('userService', (httpClient) => ({
  getUsers: () => httpClient.get('/users'),
  getUser: (id) => httpClient.get(`/users/${id}`)
}), ['httpClient']);

// Resolve services
const userService = di.resolve('userService');
userService.getUsers().then(users => console.log(users));

// Check service availability
if (di.has('userService')) {
  console.log('User service is available');
}
```

### Development and Build

Development workflow and build configuration.

#### Development Server

```bash
# Start development server with Vite
npm run dev:vite

# Or use Rollup watch mode
npm run dev
```

#### Building for Production

```bash
# Build all bundles
npm run build
```

#### Testing

```bash
# Run test suite
npm test

# Type checking
npm run type-check
```

#### Module Exports

OneKit provides multiple build formats for different use cases:

- **ESM**: `dist/onekit.esm.js` - Modern ES modules
- **CommonJS**: `dist/onekit.cjs.js` - Node.js compatibility
- **UMD**: `dist/onekit.js` - Browser globals
- **Core modules**: Individual module exports for tree-shaking

```js
// Import specific modules for smaller bundles
import { reactive, watch } from 'onekit-js/reactive';
import { createElement, render } from 'onekit-js/vdom';
```

### Browser Support

OneKit supports all modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

For older browsers, consider using the UMD build with appropriate polyfills.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### License

ISC License - see LICENSE file for details.

## Changelog

### [3.0.0] - 2024-12-XX

#### Added
- **Modular Architecture**: Complete rewrite as ES modules with tree-shaking support
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Multiple Build Formats**: UMD, ESM, and CommonJS builds with minification
- **Automated Testing**: Jest test suite with comprehensive coverage
- **Performance Benchmarks**: Built-in performance monitoring tools
- **Migration Guide**: Detailed guide for upgrading from v2.2.0
- **Enhanced Security**: Automatic XSS protection and input validation
- **Source Maps**: Included in all builds for better debugging
- **Tree Shaking**: Import only needed modules for smaller bundles

#### Changed
- **Breaking**: Transformed from single IIFE file to ES modules
- **API Changes**:
  - `ok.store` → `ok.storage` (renamed for clarity)
  - `ok.wait` → `ok.utils.debounce` (moved to utils module)
  - `ok.flow` → `ok.utils.throttle` (moved to utils module)
  - `ok.plug` → `ok.plugin.register` (moved to plugin module)
- **Component System**: Updated to use `state` instead of `data` for consistency
- **Reactive State**: Enhanced with better type safety
- **Build System**: Migrated from manual builds to Rollup with TypeScript

#### Security
- **Automatic XSS Protection**: All HTML insertion methods sanitize content
- **Input Validation**: Selectors, URLs, and user inputs are validated
- **Prototype Pollution Prevention**: Storage and reactive state protected
- **URL Sanitization**: Dangerous protocols blocked automatically

#### Performance
- **Bundle Size**: Tree shaking reduces bundle size by up to 60%
- **Runtime Performance**: Optimized DOM operations and animations
- **Memory Usage**: Better cleanup and reduced memory leaks
- **Build Speed**: Faster compilation with TypeScript and Rollup

### [2.2.0] - 2024-XX-XX

#### Security
- Added automatic HTML sanitization to prevent XSS attacks
- Implemented input validation for selectors and URLs
- Added prototype pollution prevention in storage and reactive state
- Enhanced URL sanitization to block dangerous protocols
- Improved component template security
- Added secure deep cloning with pollution protection

For the complete changelog, see [CHANGELOG.md](CHANGELOG.md).
