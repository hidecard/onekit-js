# Migration Guide: OneKit 2.2.0 to 3.0.0

This guide helps you migrate from OneKit 2.2.0 (single-file version) to OneKit 3.0.0 (modular ES modules).

## Overview of Changes

OneKit 3.0.0 is a complete rewrite that transforms the library from a single IIFE file into a modern, tree-shakable ES module framework with:

- **Modular Architecture**: Import only what you need
- **TypeScript Support**: Full type definitions included
- **Enhanced Security**: Built-in XSS protection and input validation
- **Better Performance**: Tree-shakable builds and optimized bundles
- **Modern Build System**: Rollup-based with multiple output formats

## Installation

### Old Way (2.2.0)
```html
<script src="onekit.js"></script>
```

### New Way (3.0.0)
```bash
npm install onekit
```

Then import what you need:

```javascript
// Import everything (like old version)
import ok from 'onekit';

// Or import specific modules for better tree-shaking
import { ok } from 'onekit/core';
import { reactive } from 'onekit/modules/reactive';
import { component } from 'onekit/modules/component';
```

## Breaking Changes

### 1. Module Imports Required

**Before:**
```html
<script src="onekit.js"></script>
<script>
  // ok was available globally
  ok('button').click(() => console.log('clicked'));
</script>
```

**After:**
```javascript
// For modern bundlers
import { ok } from 'onekit';

// For direct browser usage
import { ok } from './node_modules/onekit/dist/onekit.esm.js';

// Or use the UMD build
<script src="./node_modules/onekit/dist/onekit.js"></script>
```

### 2. Method Name Changes

Some method names have been updated for consistency:

| Old Method | New Method | Notes |
|------------|------------|-------|
| `ok.wait()` | `ok.utils.debounce()` | Moved to utils module |
| `ok.flow()` | `ok.utils.throttle()` | Moved to utils module |
| `ok.plug()` | `ok.plugin.register()` | Moved to plugin module |
| `ok.store` | `ok.storage` | Renamed for clarity |

### 3. Security Features Now Automatic

**Before:** You had to manually sanitize HTML
```javascript
// Manual sanitization required
const safeHTML = sanitize(userInput);
ok('#content').html(safeHTML);
```

**After:** HTML sanitization is automatic
```javascript
// Automatic sanitization - no manual step needed
ok('#content').html(userInput); // Automatically sanitized
```

### 4. Reactive State Changes

**Before:**
```javascript
const state = ok.store({ count: 0 });
ok.watch('count', callback);
```

**After:**
```javascript
const state = ok.reactive({ count: 0 });
ok.watch('count', callback);
```

### 5. Component System Updates

**Before:**
```javascript
ok.component('my-comp', {
  template: '<div>{{data.message}}</div>',
  data: { message: 'Hello' }
});
```

**After:**
```javascript
ok.component.register('my-comp', {
  template: '<div>{{state.message}}</div>',
  data: () => ({ message: 'Hello' })
});
```

## Code Migration Examples

### Basic DOM Manipulation

**No changes required:**
```javascript
// This still works exactly the same
ok('button').click(() => {
  ok('#result').text('Button clicked!');
});
```

### Reactive State

**Before (2.2.0):**
```javascript
const state = ok.store({ count: 0 });
ok.watch('count', (newVal) => {
  ok('#counter').text(newVal);
});
```

**After (3.0.0):**
```javascript
const state = ok.reactive({ count: 0 });
ok.watch('count', (newVal) => {
  ok('#counter').text(newVal);
});
```

### Components

**Before (2.2.0):**
```javascript
ok.component('counter', {
  template: '<div><button onclick="this.inc()">+</button> {{data.count}}</div>',
  data: { count: 0 },
  methods: {
    inc() { this.data.count++; this.update(); }
  }
});
```

**After (3.0.0):**
```javascript
ok.component.register('counter', {
  template: '<div><button onclick="this.methods.inc()">+</button> {{state.count}}</div>',
  data: () => ({ count: 0 }),
  methods: {
    inc() { this.state.count++; this.update(); }
  }
});
```

### HTTP Requests

**Before (2.2.0):**
```javascript
ok.get('/api/users').then(users => {
  // handle users
});
```

**After (3.0.0):**
```javascript
ok.http.get('/api/users').then(users => {
  // handle users
});
```

### Storage

**Before (2.2.0):**
```javascript
ok.store.set('user', { name: 'John' });
const user = ok.store.get('user');
```

**After (3.0.0):**
```javascript
ok.storage.set('user', { name: 'John' });
const user = ok.storage.get('user');
```

### Animations

**Before (2.2.0):**
```javascript
ok('.box').animate({ opacity: 0 }, 500);
```

**After (3.0.0):**
```javascript
// Same API, now returns Promise
ok('.box').animate({ opacity: 0 }, 500).then(() => {
  console.log('Animation complete');
});
```

## Build System Changes

### Old Build (2.2.0)
- Single `onekit.js` file
- No build customization
- Manual minification

### New Build (3.0.0)
```javascript
// package.json scripts
{
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "jest"
  }
}

// Multiple output formats
dist/
  onekit.js          // UMD
  onekit.min.js      // Minified UMD
  onekit.esm.js      // ES Modules
  onekit.esm.min.js  // Minified ES Modules
  onekit.cjs.js      // CommonJS
```

## Tree Shaking

Import only what you need for smaller bundles:

```javascript
// Import everything (not tree-shakeable)
import ok from 'onekit';

// Import specific modules (tree-shakeable)
import { ok } from 'onekit/core';
import { reactive, watch } from 'onekit/modules/reactive';
import { component } from 'onekit/modules/component';

// Use named imports
const state = reactive({ count: 0 });
watch('count', callback);
```

## TypeScript Support

OneKit 3.0.0 includes full TypeScript definitions:

```typescript
import { ok, OneKit } from 'onekit';

const buttons: OneKit = ok('button');
buttons.click((event: Event) => {
  console.log('Button clicked', event);
});
```

## Security Enhancements

### Automatic XSS Protection

**Before:** Manual sanitization required
```javascript
const safe = sanitizeHTML(userInput);
ok('#content').html(safe);
```

**After:** Automatic sanitization
```javascript
ok('#content').html(userInput); // Automatically safe
```

### Input Validation

**Before:** No built-in validation
```javascript
ok(userSelector).doSomething(); // Potentially unsafe
```

**After:** Automatic validation
```javascript
ok(userSelector).doSomething(); // Automatically validated
// Invalid selectors are rejected
```

### Storage Security

**Before:** No prototype pollution protection
```javascript
ok.store.set(key, value); // Could be unsafe
```

**After:** Automatic protection
```javascript
ok.storage.set(key, value); // Automatically validated
// Prototype pollution attempts blocked
```

## Testing

OneKit 3.0.0 includes Jest configuration for testing:

```bash
npm test
```

Write tests using the same API:

```javascript
import { ok } from '../src/index';

describe('DOM Manipulation', () => {
  test('should set text content', () => {
    document.body.innerHTML = '<div id="test"></div>';
    ok('#test').text('Hello World');
    expect(ok('#test').text()).toBe('Hello World');
  });
});
```

## Performance Improvements

- **Tree Shaking**: Import only needed modules
- **Optimized Builds**: Multiple output formats for different use cases
- **Hardware Acceleration**: Improved animation performance
- **Memory Management**: Better cleanup and garbage collection

## Browser Support

Same browser support as 2.2.0:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Global `ok` not available**
   ```javascript
   // Solution: Import explicitly
   import { ok } from 'onekit';
   ```

2. **Tree shaking not working**
   ```javascript
   // Solution: Use named imports
   import { ok } from 'onekit/core';
   import { reactive } from 'onekit/modules/reactive';
   ```

3. **TypeScript errors**
   ```javascript
   // Solution: Install types
   npm install @types/onekit
   ```

4. **Security warnings**
   ```
   // This is normal - OneKit validates inputs automatically
   // No action needed unless you disable security features
   ```

### Getting Help

- Check the [README.md](README.md) for API documentation
- Review the [examples/](examples/) directory
- File issues on [GitHub](https://github.com/hidecard/onekit-js/issues)

## Migration Checklist

- [ ] Update package.json to use OneKit 3.0.0
- [ ] Replace global script tag with ES module imports
- [ ] Update method calls (`ok.store` → `ok.storage`, etc.)
- [ ] Remove manual HTML sanitization code
- [ ] Update component definitions
- [ ] Test all functionality
- [ ] Update build scripts if needed

## Benefits of Upgrading

1. **Smaller Bundles**: Tree shaking reduces bundle size
2. **Better Security**: Automatic XSS protection
3. **TypeScript Support**: Full type definitions
4. **Modern Architecture**: ES modules and modern JavaScript
5. **Better Performance**: Optimized builds and animations
6. **Future-Proof**: Regular updates and new features

---

*For detailed API documentation, see [README.md](README.md)*
