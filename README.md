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

OneKit provides a flexible client-side router for handling navigation and routing in single-page applications.

## Basic Usage

```js
import { router } from 'onekit-js';

// Add routes with handlers
router.addRoute({ path: '/home', handler: showHome });
router.addRoute({ path: '/about', handler: showAbout });

// Navigate programmatically
router.navigate('/home');

// Get current path
const currentPath = router.getCurrentPath();
```

## Route Definition

```js
interface Route {
  path: string;
  component?: any;  // For component-based routing
  handler?: () => void;  // For function-based routing
}
```

## Advanced Features

### Route Parameters

```js
// Define route with parameters
router.addRoute({ path: '/user/:id', handler: showUser });

// Access parameters in handler
function showUser() {
  const pathParts = router.getCurrentPath().split('/');
  const userId = pathParts[pathParts.length - 1];
  // Load user data for userId
}
```

### Route Guards

```js
// Add route with guard
router.addRoute({
  path: '/admin',
  handler: showAdmin,
  guard: () => checkAdminAccess()
});

function checkAdminAccess() {
  // Return true if user has admin access
  return user.isAdmin;
}
```

### Nested Routes

```js
// Parent route
router.addRoute({ path: '/dashboard', handler: showDashboard });

// Child routes
router.addRoute({ path: '/dashboard/profile', handler: showProfile });
router.addRoute({ path: '/dashboard/settings', handler: showSettings });
```

## Navigation Methods

### Programmatic Navigation

```js
// Navigate to a route
router.navigate('/home');

// Navigate with query parameters
router.navigate('/search?q=javascript');

// Navigate with state
router.navigate('/product/123', { from: 'catalog' });
```

### Link Handling

```js
// Handle navigation links
ok('a[data-route]').on('click', (e) => {
  e.preventDefault();
  const path = e.target.getAttribute('data-route');
  router.navigate(path);
});

// HTML with data-route attributes
<nav>
  <a href="#" data-route="/home">Home</a>
  <a href="#" data-route="/about">About</a>
  <a href="#" data-route="/contact">Contact</a>
</nav>
```

## Route Matching

### Exact Matching

```js
router.addRoute({ path: '/home', handler: showHome }); // Exact match
```

### Wildcard Routes

```js
// Catch-all route for 404 handling
router.addRoute({ path: '*', handler: show404 });
```

## Integration with Components

```js
// Component-based routing
router.addRoute({
  path: '/counter',
  component: 'counter-component'
});

// Mount component when route is activated
function showCounter() {
  mount(create('counter-component'), '#app');
}
```

## Browser History Integration

```js
// Listen for browser back/forward buttons
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  router.navigate(path, { replace: true });
});

// Update browser history
router.navigate('/new-path', { push: true });
```

## Example SPA Implementation

```js
import { router, ok } from 'onekit-js';

// Route handlers
function showHome() {
  ok('#app').html(`
    <h1>Home</h1>
    <p>Welcome to our SPA!</p>
    <nav>
      <a href="#" data-route="/about">About</a>
      <a href="#" data-route="/contact">Contact</a>
    </nav>
  `);
}

function showAbout() {
  ok('#app').html(`
    <h1>About</h1>
    <p>Learn more about us.</p>
    <a href="#" data-route="/home">Back to Home</a>
  `);
}

function show404() {
  ok('#app').html(`
    <h1>404 - Page Not Found</h1>
    <a href="#" data-route="/home">Go Home</a>
  `);
}

// Set up routes
router.addRoute({ path: '/home', handler: showHome });
router.addRoute({ path: '/about', handler: showAbout });
router.addRoute({ path: '*', handler: show404 });

// Handle navigation
ok('body').on('click', '[data-route]', (e) => {
  e.preventDefault();
  router.navigate(e.target.getAttribute('data-route'));
});

// Initialize app
router.navigate('/home');
```

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

# Template Directives

OneKit provides powerful template directives for declarative DOM manipulation and reactive updates.

## ok-if Directive

Conditionally show/hide elements based on reactive state.

```html
<div ok-if="user.loggedIn">
  <p>Welcome, {{user.name}}!</p>
</div>
```

```js
const state = reactive({ user: { loggedIn: false, name: 'John' } });
```

## ok-for Directive

Render lists with automatic DOM updates.

```html
<ul>
  <li ok-for="item in items">{{item.name}}</li>
</ul>
```

```js
const state = reactive({
  items: [
    { name: 'Item 1' },
    { name: 'Item 2' }
  ]
});
```

With index:

```html
<li ok-for="(item, index) in items">{{index + 1}}. {{item.name}}</li>
```

## ok-bind Directive

Bind reactive data to element attributes.

```html
<input ok-bind:value="message" />
<img ok-bind:src="imageUrl" ok-bind:alt="imageAlt" />
<div ok-bind:class="dynamicClass"></div>
<div ok-bind:style="dynamicStyle"></div>
```

```js
const state = reactive({
  message: 'Hello',
  imageUrl: 'image.jpg',
  imageAlt: 'An image',
  dynamicClass: 'active',
  dynamicStyle: { color: 'red' }
});
```

## ok-model Directive

Two-way data binding for form inputs.

```html
<input ok-model="name" type="text" />
<textarea ok-model="bio"></textarea>
<select ok-model="country">
  <option value="us">USA</option>
  <option value="ca">Canada</option>
</select>
<input ok-model="agree" type="checkbox" />
```

```js
const form = reactive({
  name: '',
  bio: '',
  country: 'us',
  agree: false
});
```

## ok-on Directive

Attach event listeners with reactive expressions.

```html
<button ok-on:click="increment()">+</button>
<button ok-on:click.prevent="submitForm()">Submit</button>
<input ok-on:input="updateValue($event.target.value)" />
```

```js
const state = reactive({ count: 0 });

function increment() {
  state.count++;
}

function submitForm() {
  // Handle form submission
}

function updateValue(value) {
  state.inputValue = value;
}
```

Event modifiers:
- `.prevent` - calls `event.preventDefault()`
- `.stop` - calls `event.stopPropagation()`

## ok-show Directive

Show/hide elements with CSS display (similar to ok-if but uses visibility).

```html
<div ok-show="isVisible">
  This content can be shown/hidden
</div>
```

```js
const state = reactive({ isVisible: true });
```

## Reactive Integration

Directives automatically react to state changes:

```html
<div ok-if="showDetails" ok-bind:class="theme">
  <h2 ok-bind="title"></h2>
  <p ok-for="detail in details">{{detail}}</p>
</div>
```

```js
const app = reactive({
  showDetails: true,
  theme: 'dark-theme',
  title: 'Dynamic Title',
  details: ['Detail 1', 'Detail 2']
});

// Changes automatically update the DOM
app.showDetails = false;
app.details.push('Detail 3');
```

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


---

# V3 Maintenance Notes

V3 branch ၏ လက်ရှိ tested quick start ကို [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) နှင့် framework-oriented architecture/API guide ကို [docs/FRAMEWORK_GUIDE.md](docs/FRAMEWORK_GUIDE.md) တွင် ဖတ်ရှုနိုင်သည်။ `examples/counter` သည် `reactive()` နှင့် `effect()` ကို အသုံးပြုသော mini project ဖြစ်ပြီး `examples/todo` သည် store/actions/reactive rendering ကို ပြသသော mini project ဖြစ်သည်။

```bash
npx vite --root examples/counter
npx vite --root examples/todo

# Generate a new TypeScript starter
npx onekit create my-app
cd my-app && npm install && npm run dev

# Build a package from its source entrypoint
onekit build --out-dir dist
```

ဤ V3 maintenance pass တွင် component creation ၏ `finalProps` reference, SSR stream writer typing, store duplicate export, ESM package အောက်က Jest config နှင့် package declaration/export paths များကို ပြင်ဆင်ထားသည်။ Public entrypoint တွင် store နှင့် SSR API များကိုလည်း ထည့်သွင်းထားသည်။
