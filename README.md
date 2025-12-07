# OneKit JS – Full Documentation (Beginner → Advanced)

A complete, fully expanded documentation covering all features of **OneKit JS**.

---

# Installation

## NPM Install

```bash
npm install onekit-js
```

## Importing into Your Project

### ECMAScript Modules (Vite, Webpack, CRA, Next.js)

```js
import { ok, reactive } from 'onekit-js';
```

### CDN / UMD

```html
<script src="./node_modules/onekit-js/dist/onekit.js"></script>
<script>
  const { ok, reactive } = OneKit;
</script>
```

---

# Basic Usage

```js
import { ok, reactive, watch } from 'onekit-js';

const state = reactive({ count: 0 });

watch(state, 'count', (next) => ok('#count').text(next));

ok('#inc').click(() => state.count++);
ok('#dec').click(() => state.count--);
```

**HTML:**

```html
<div>Count: <span id="count">0</span></div>
<button id="inc">+</button>
<button id="dec">-</button>
```

---

# Element Selectors (Beginner → Advanced)

OneKit provides a simple universal selector utility: `ok()`.

## Basic Selectors

```js
ok('#id')
ok('.class')
ok('tag')
```

## Select Multiple

```js
ok('.item').each(el => console.log(el));
```

## Chainable Methods

```js
ok('#title')
  .text('Hello')
  .class('active')
  .css({ color: 'red' })
  .click(() => console.log('clicked'));
```

## Supported Methods

* `.text()`
* `.html()`
* `.append()`
* `.prepend()`
* `.remove()`
* `.hide()` / `.show()`
* `.class()` / `.remove_class()`
* `.css()`
* `.val()` (for inputs)
* `.attr()`
* `.on()` / `.click()` / `.hover()`

---

# Reactive State

```js
const state = reactive({ name: 'OneKit', count: 0 });

watch(state, 'name', (next, prev) => {
  console.log(`Name changed: ${prev} → ${next}`);
});
```

Deep nesting works automatically:

```js
const app = reactive({ user: { profile: { age: 20 } } });
watch(app.user.profile, 'age', console.log);
```

---

# DOM Utilities

### Add class

```js
ok('#box').class('active');
```

### Remove class

```js
ok('#box').remove_class('active');
```

### Toggle class

```js
ok('#box').toggle_class('active');
```

### Attributes & CSS

```js
ok('#box').attr('data-x', 1);
ok('#box').css({ width: '100px', background: 'red' });
```

### Form Utilities

```js
ok('#form').form_data();
```

---

# Component System

## Define a Component

```js
register('counter-box', {
  template: `
    <div>
      <h3>{{title}}</h3>
      <p>Count: {{count}}</p>
      <button onclick="this.increase()">+</button>
    </div>
  `,
  props: { title: 'Default Title' },
  data: () => ({ count: 0 }),
  methods: {
    increase() {
      this.count++;
      this.update();
    }
  }
});
```

## Mount Component

```js
mount(create('counter-box', { title: 'My Counter' }), '#app');
```

---

# Virtual DOM

```js
const oldNode = createElement('p', {}, 'Hello');
const newNode = createElement('p', {}, 'Updated');
const el = render(oldNode);
patch(el, newNode, oldNode);
```

Benefits:

* Fast diffing
* Efficient rendering
* Auto cleanup

---

# API Requests

```js
get('/api/users').then(res => console.log(res.data));

post('/api/save', { name: 'John' });

put('/api/update/1', { age: 21 });

delete('/api/user/1');
```

Supports:

* global interceptors
* error catching
* timeouts

---

# Storage

## Local Storage

```js
localStorage.set('user', { name: 'John' });
localStorage.get('user');
localStorage.remove('user');
```

## Session Storage

```js
sessionStorage.set('token', 'abc');
```

---

# Router

```js
router.addRoute({ path: '/home', handler: showHome });
router.addRoute({ path: '/about', handler: showAbout });

router.navigate('/home');
```

Features:

* hash mode
* history mode
* 404 handler

---

# Utilities

### debounce

```js
debounce(() => console.log('done'), 500);
```

### throttle

```js
throttle(() => console.log('scroll'), 200);
```

### deepClone

```js
const clone = deepClone(obj);
```

### generateId

```js
generateId();
```

---

# Animations

```js
ok('#box').fade_in(300);
ok('#box').fade_out(300);
ok('#box').slide_up(400);
ok('#box').slide_down(400);
ok('#box').bounce(800);
```

---

# Template Syntax (okjs)

```js
const view = okjs`
  [div]
    [h1]Title[/h1]
    [button onclick=${() => alert('Hi')}]Click[/button]
  [/div]
`;
```

Supports:

* loops
* conditions
* dynamic props

---

# Accessibility

```js
announce('Item added');
trapFocus(modalElement);
```

Features:

* Screen reader announcements
* Focus trapping
* Auto ARIA labels

---

# Web Components

```js
class MyElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '<p>Hello</p>';
  }
}

customElements.define('my-element', MyElement);
```

---

# Theme System

```js
ok('body').class('theme-dark');
```

Automatically stores theme in localStorage.

---

# Dependency Injection

```js
di.register('logger', () => ({ log: msg => console.log(msg) }));
const logger = di.resolve('logger');
logger.log('Hello');
```

---

# Plugin System

```js
ok.extend('highlight', function(color='yellow'){ this.css({ background: color }); });

ok('.item').highlight('pink');
```

---

# Error Handling

```js
try {
  riskyFunction();
} catch (error) {
  errorHandler(error);
}
```

OneKit provides:

* global error hooks
* error boundaries in components
* safe DOM writes

---

# Forms

```js
const data = ok('#register').form_data();
console.log(data);
```

Automatically extracts:

* inputs
* selects
* checkboxes
* files

---

# Build & Development

### Vite Development

```bash
npm run dev:vite
```

### Normal Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

Supports:

* Tree-shaking
* ES Modules
* TypeScript mappings

---

# License

ISC License