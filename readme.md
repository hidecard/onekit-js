

# OneKit 2.1.0 - Lightweight JavaScript Library

OneKit is a modern, lightweight JavaScript library for DOM manipulation, reactive state management, animations, and more. Inspired by jQuery but built with modern JavaScript features.

## Features

- **DOM Manipulation**: Chainable API for selecting and manipulating elements
- **Reactive State**: Automatic UI updates when data changes
- **Animations**: Promise-based animations with hardware acceleration
- **Form Handling**: Validation, masking, and serialization
- **Component System**: Build reusable UI components
- **HTTP Requests**: AJAX with caching and WebSocket support
- **Routing**: Single-page application routing
- **Storage**: Reactive local/session storage
- **Gestures**: Touch event handling
- **Accessibility**: Screen reader support and focus management
- **Theming**: Dynamic theme switching
- **Utilities**: Debounce, throttle, and more

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <script src="onekit.js"></script>
</head>
<body>
    <div id="app">
        <h1>Hello <span id="name">World</span>!</h1>
        <input type="text" id="input-name">
        <button id="greet">Greet</button>
    </div>

    <script>
        // DOM manipulation
        ok('#greet').click(() => {
            const name = ok('#input-name').val();
            ok('#name').text(name || 'World');
        });

        // Reactive state
        const state = ok.reactive.reactive({ message: 'Hello' });
        ok.reactive.watch('message', (newVal) => {
            console.log('Message changed to:', newVal);
        });
        state.message = 'Hi there!';
    </script>
</body>
</html>
```

## Core API

### Selecting Elements

```javascript
// CSS selectors
const buttons = ok('button');
const input = ok('#my-input');
const items = ok('.item');

// DOM elements
const element = ok(document.body);

// HTML strings
const div = ok('<div class="new">Hello</div>');
```

### Method Chaining

```javascript
ok('p')
  .class('highlight')
  .css('color', 'red')
  .fade_in(500);
```

## Reactive State Management

Create reactive objects that automatically update the UI:

```javascript
const state = ok.reactive.reactive({
    count: 0,
    name: 'World'
});

// Watch for changes
ok.reactive.watch('count', (newValue) => {
    ok('#counter').text(newValue);
});

// Update state (triggers watchers)
state.count++;
```

**Example from reactive-state.html:**
```javascript
const counterState = ok.reactive.reactive({
    count: 0,
    name: ''
});

ok('#increment').click(() => counterState.count++);
ok('#decrement').click(() => counterState.count--);

ok.reactive.watch('count', (newValue) => {
    ok('#count-display').text(newValue);
});

// Two-way binding
ok('#name-input').on('input', function() {
    counterState.name = this.value;
});

ok.reactive.watch('name', (newValue) => {
    ok('#name-display').text(newValue || 'World');
    ok('#name-input').attr('value', newValue || '');
});
```

## DOM Manipulation

### Content & Attributes

```javascript
// Get/set text
const text = ok('h1').text();
ok('h1').text('New Title');

// Get/set HTML
ok('#content').html('<strong>Bold text</strong>');

// Attributes
ok('img').attr('src', 'image.jpg');
ok('input').attr({ type: 'text', placeholder: 'Enter name' });
```

### Classes & Styles

```javascript
ok('div').class('active');
ok('div').unclass('hidden');
ok('div').toggleClass('visible');

ok('.box').css('background', 'blue');
ok('.box').css({ color: 'white', padding: '10px' });
```

### Traversal

```javascript
ok('li').first().class('active');
ok('li').last().class('inactive');

ok('#parent').find('.child');
ok('span').parent();
ok('ul').kids('li');
ok('.active').sibs();
```

### Modification

```javascript
ok('ul').append('<li>New item</li>');
ok('ul').prepend('<li>First item</li>');
ok('.temp').remove();
```

**Example from dom-manipulation.html:**
```javascript
ok('#add-item').click(() => {
    ok('#list').append('<li>New Item</li>');
});

ok('#remove-first').click(() => {
    ok('#list li').first().remove();
});

ok('#highlight-odd').click(() => {
    ok('#list li:nth-child(odd)').class('highlight');
});
```

## Event Handling

```javascript
// Basic events
ok('button').click(() => {
    console.log('Button clicked!');
});

// Event delegation
ok('#list').on('click', 'li', function() {
    ok(this).class('selected');
});

// Hover
ok('.item').hover(
    () => ok(this).class('hover'),
    () => ok(this).unclass('hover')
);

// Custom events
ok('#my-element').on('custom-event', () => {
    console.log('Custom event fired!');
});
ok('#my-element').trigger('custom-event');
```

**Example from event-handling.html:**
```javascript
ok('#click-me').click(() => {
    ok('#click-count').text(parseInt(ok('#click-count').text()) + 1);
});

ok('#hover-area').hover(
    () => ok('#hover-status').text('Hovering!'),
    () => ok('#hover-status').text('Not hovering')
);

ok('#list').on('click', 'li', function() {
    ok('#selected-item').text(ok(this).text());
});
```

## Animations

All animations return Promises:

```javascript
ok('.box').fade_in(500).then(() => {
    console.log('Fade in complete!');
});

ok('.panel').slide_down(300);
ok('.card').animate({ width: '200px', height: '200px' }, 1000);

// Hardware-accelerated movement
ok('.sprite').move(100, 50, 500);

// Module animations
ok('.card').scaleIn(300);
ok('.card').bounce(1000);
```

**Example from animations.html:**
```javascript
ok('#fade-in-btn').click(() => {
    ok('#fade-target').fade_in(500);
});

ok('#slide-toggle-btn').click(() => {
    const panel = ok('#slide-panel');
    if (panel.isVisible()) {
        panel.slide_up(300);
    } else {
        panel.slide_down(300);
    }
});

ok('#animate-btn').click(() => {
    ok('#animate-target').animate({
        width: '200px',
        height: '200px',
        backgroundColor: 'red'
    }, 1000);
});
```

## Form Handling

```javascript
// Serialize form
const data = ok('#my-form').form_data();

// Validate form
const isValid = ok('#my-form').validateForm({
    email: 'required|email',
    password: 'required|min:8'
});

// Input masking
ok('input[name="phone"]').applyMask('phone');
```

**Example from form-handling.html:**
```javascript
ok('#contact-form').validateForm({
    name: 'required|min:2',
    email: 'required|email',
    message: 'required|min:10'
}, {
    onSubmit: (data) => {
        console.log('Form submitted:', data);
        // Send to server...
    }
});

ok('input[name="phone"]').applyMask('phone');
ok('input[name="date"]').applyMask('date');
```

## Component System

```javascript
// Register component
ok.component.register('my-card', {
    props: { title: 'Default' },
    data: { count: 0 },
    template: `
        <div class="card">
            <h3>{{props.title}}</h3>
            <p>Count: {{state.count}}</p>
            <button onclick="this.methods.increment()">+</button>
        </div>
    `,
    methods: {
        increment() {
            this.state.count++;
            this.update();
        }
    }
});

// Use component
const card = ok.component.create('my-card', { title: 'My Card' });
ok.component.mount(card, '#app');
```

**Example from component-system.html:**
```javascript
ok.component.register('todo-item', {
    props: { text: '', done: false },
    template: `
        <div class="todo-item {{state.done ? 'done' : ''}}">
            <input type="checkbox" {{props.done ? 'checked' : ''}} 
                   onchange="this.methods.toggle()">
            <span>{{props.text}}</span>
            <button onclick="this.methods.remove()">×</button>
        </div>
    `,
    methods: {
        toggle() {
            this.props.done = !this.props.done;
            this.update();
        },
        remove() {
            this.element.remove();
        }
    }
});
```

## HTTP Requests

```javascript
// GET request
ok.http.get('/api/users')
    .then(users => console.log(users))
    .catch(error => console.error(error));

// POST request
ok.http.post('/api/users', { name: 'John', email: 'john@example.com' });

// WebSocket
const ws = ok.http.websocket('ws://localhost:8080');
ws.on('message', data => console.log('Received:', data));
ws.send({ type: 'hello' });
```

**Example from api-requests.html:**
```javascript
ok('#load-users').click(() => {
    ok.http.get('/api/users')
        .then(users => {
            const html = users.map(user => 
                `<li>${user.name} (${user.email})</li>`
            ).join('');
            ok('#users-list').html(html);
        })
        .catch(error => {
            ok('#error').text('Failed to load users');
        });
});

ok('#create-user-form').on('submit', function(e) {
    e.preventDefault();
    const data = ok(this).form_data();
    
    ok.http.post('/api/users', data)
        .then(user => {
            console.log('User created:', user);
        });
});
```

## Storage

```javascript
// Simple storage
ok.storage.set('user', { name: 'John', id: 1 });
const user = ok.storage.get('user');

// Reactive storage (syncs across tabs)
const settings = ok.storage.reactive('settings', { theme: 'light' });
settings.theme = 'dark'; // Automatically saved

// Collections
const todos = ok.storage.collection('todos');
const newTodo = todos.add({ text: 'Learn OneKit', done: false });
todos.update(newTodo.id, { done: true });
```

**Example from storage.html:**
```javascript
const todos = ok.storage.collection('todos');

ok('#add-todo').click(() => {
    const text = ok('#todo-input').val();
    if (text) {
        todos.add({ text, done: false });
        ok('#todo-input').val('');
        renderTodos();
    }
});

function renderTodos() {
    const html = todos.items.map(todo => `
        <li class="${todo.done ? 'done' : ''}">
            <input type="checkbox" ${todo.done ? 'checked' : ''} 
                   onchange="toggleTodo('${todo.id}')">
            <span>${todo.text}</span>
            <button onclick="deleteTodo('${todo.id}')">×</button>
        </li>
    `).join('');
    ok('#todo-list').html(html);
}
```

## Routing

```javascript
ok.router.add('/', 'home-component');
ok.router.add('/about', 'about-component');
ok.router.add('/users/:id', (params) => {
    return `<h1>User ${params.id}</h1>`;
});

ok.router.init(); // Start routing
```

**Example from router demo:**
```javascript
ok.router.add('/', () => '<h1>Home</h1><p>Welcome to the home page!</p>');
ok.router.add('/about', () => '<h1>About</h1><p>About this app...</p>');
ok.router.add('/contact', () => '<h1>Contact</h1><p>Get in touch...</p>');

ok.router.init();
```

## Gestures

```javascript
ok('.swipeable').gesture()
    .on('swipeleft', () => console.log('Swiped left!'))
    .on('tap', () => console.log('Tapped!'));
```

**Example from gestures.html:**
```javascript
ok('#gesture-area').gesture()
    .on('swipeleft', () => ok('#gesture-status').text('Swiped Left'))
    .on('swiperight', () => ok('#gesture-status').text('Swiped Right'))
    .on('swipeup', () => ok('#gesture-status').text('Swiped Up'))
    .on('swipedown', () => ok('#gesture-status').text('Swiped Down'))
    .on('tap', () => ok('#gesture-status').text('Tapped'))
    .on('longpress', () => ok('#gesture-status').text('Long Pressed'));
```

## Accessibility

```javascript
// Announce to screen readers
ok('.status').announce('Loading complete.', 'assertive');

// Trap focus in modal
ok('.modal').trapFocus();

// Add ARIA attributes
ok('#my-input').a11y.addAriaAttributes({ label: 'Search input' });
```

**Example from accessibility.html:**
```javascript
ok('#announce-btn').click(() => {
    ok('#status').announce('Button was clicked!', 'polite');
});

ok('#modal-btn').click(() => {
    ok('#modal').show().trapFocus();
});

ok('#close-modal').click(() => {
    ok('#modal').hide().removeFocusTrap();
});
```

## Theming

```javascript
ok.theme.apply({
    primary: '#ff6b6b',
    dark: true
});

ok('#theme-toggle').click(() => {
    ok.theme.toggleDark();
});
```

**Example from theme.html:**
```javascript
ok('#light-theme').click(() => {
    ok.theme.apply({
        primary: '#3498db',
        secondary: '#2ecc71',
        dark: false
    });
});

ok('#dark-theme').click(() => {
    ok.theme.apply({
        primary: '#ff6b6b',
        secondary: '#ffd93d',
        dark: true
    });
});
```

## Utilities

```javascript
// Debounce function calls
const search = ok.utils.debounce(function() {
    console.log('Searching...');
}, 300);

// Throttle scroll events
ok(window).on('scroll', ok.utils.throttle(() => {
    console.log('Scrolling...');
}, 100));

// Format dates, numbers, etc.
const formatted = ok.utils.formatCurrency(1234.56, '$');
```

**Example from utilities.html:**
```javascript
const debouncedSearch = ok.utils.debounce(() => {
    const query = ok('#search-input').val();
    ok('#search-results').text(`Searching for: ${query}`);
}, 500);

ok('#search-input').on('input', debouncedSearch);

ok('#format-btn').click(() => {
    const num = parseFloat(ok('#number-input').val());
    ok('#formatted-number').text(ok.utils.formatCurrency(num, '$'));
});
```

## Installation

Download `onekit.js` and include it in your HTML:

```html
<script src="path/to/onekit.js"></script>
```

Or install via npm:

```bash
npm install onekit
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License

---

<a name="core-concepts"></a>
## 1. Core Concepts

### `ok(selector)`

The main entry point to the library. It creates a new OneKit instance containing a collection of DOM elements.

**Syntax:** `ok(selector)`

*   **`selector`** (String|Element|Array|OneKit): A CSS selector string, an HTML string, a DOM element, an array of elements, or another OneKit object.

**Returns:** A new `OneKit` instance.

**Examples:**
```javascript
// By CSS selector
const buttons = ok('button');

// By DOM element
const mainElement = ok(document.body);

// By HTML string
const newDiv = ok('<div class="box">Hello</div>');

// By array of elements
const allInputs = ok(document.querySelectorAll('input'));
```

### Chaining

Most OneKit methods return the `OneKit instance itself, allowing you to chain methods together for concise code.

**Example:**
```javascript
ok('p')
  .class('highlight')
  .css('color', 'red')
  .animate({ fontSize: '20px' }, 500);
```

---

<a name="dom-manipulation"></a>
## 2. DOM Manipulation

### Traversal

#### `.first()`
Gets the first element in the collection as a new OneKit object.
```javascript
ok('li').first().class('active');
```

#### `.last()`
Gets the last element in the collection as a new OneKit object.
```javascript
ok('li').last().class('active');
```

#### `.each(callback)`
Iterates over each element in the collection.
```javascript
ok('div').each(function(index, element) {
  console.log(index, element);
});
```

#### `.find(selector)`
Finds descendant elements matching the selector.
```javascript
ok('#container').find('.item');
```

#### `.parent()`
Gets the direct parent of each element.
```javascript
ok('span').parent().class('has-span');
```

#### `.kids(selector)`
Gets the direct children of each element.
```javascript
ok('ul').kids('li'); // Get direct LI children
```

#### `.sibs(selector)`
Gets the siblings of each element.
```javascript
ok('li.active').sibs().unclass('active');
```

### Content & Attributes

#### `.html(content)`
Gets or sets the inner HTML of elements.
```javascript
// Get HTML
const content = ok('#myDiv').html();

// Set HTML
ok('#myDiv').html('<strong>New Content</strong>');
```

#### `.text(content)`
Gets or sets the text content of elements.
```javascript
// Get text
const text = ok('#myDiv').text();

// Set text
ok('#myDiv').text('Plain text content');
```

#### `.attr(name, value)`
Gets, sets, or removes attributes.
```javascript
// Get attribute
const id = ok('input').attr('id');

// Set attribute
ok('a').attr('href', 'https://example.com');

// Set multiple attributes
ok('img').attr({ src: 'logo.png', alt: 'Logo' });
```

#### `.unattr(name)`
Removes an attribute.
```javascript
ok('button').unattr('disabled');
```

#### `.css(prop, value)`
Gets or sets CSS styles.
```javascript
// Get style
const color = ok('h1').css('color');

// Set style
ok('p').css('font-size', '16px');

// Set multiple styles
ok('.box').css({ color: 'white', background: 'blue' });
```

### Modification

#### `.class(className)`
Adds a CSS class.
```javascript
ok('div').class('new-class');
```

#### `.unclass(className)`
Removes a CSS class.
```javascript
ok('div').unclass('old-class');
```

#### `.toggleClass(className)`
Toggles a CSS class.
```javascript
ok('button').toggleClass('active');
```

#### `.append(content)`
Inserts content at the end of each element.
```javascript
ok('ul').append('<li>New Item</li>');
```

#### `.prepend(content)`
Inserts content at the beginning of each element.
```javascript
ok('ul').prepend('<li>First Item</li>');
```

#### `.remove()`
Removes elements from the DOM.
```javascript
ok('.temporary').remove();
```

#### `.clone()`
Clones elements.
```javascript
const clonedElement = ok('.template').clone();
```

### Visibility

#### `.show()`
Shows elements by resetting the `display` property.
```javascript
ok('.hidden').show();
```

#### `.hide()`
Hides elements by setting `display: none`.
```javascript
ok('.visible').hide();
```

#### `.toggle()`
Toggles the visibility of elements.
```javascript
ok('.toggle-me').toggle();
```

---

<a name="event-handling"></a>
## 3. Event Handling

#### `.on(event, selector, handler)`
Attaches an event listener.
```javascript
// Direct binding
ok('button').on('click', function(e) {
  console.log('Button clicked!');
});

// Event delegation
ok('#parent').on('click', '.child-button', function(e) {
  console.log('A child button was clicked!');
});
```

#### `.off(event, handler)`
Removes an event listener.
```javascript
function myHandler() { /* ... */ }
ok('button').on('click', myHandler);
// ... later
ok('button').off('click', myHandler);
```

#### `.click(handler)`
A shortcut for the `click` event.
```javascript
ok('button').click(function() {
  alert('Clicked!');
});
```

#### `.hover(enterHandler, leaveHandler)`
A shortcut for `mouseenter` and `mouseleave` events.
```javascript
ok('div').hover(
  function() { ok(this).class('hovered'); },
  function() { ok(this).unclass('hovered'); }
);
```

#### `.focus(handler)`
A shortcut for the `focus` event.
```javascript
ok('input').focus(function() {
  ok(this).css('border-color', 'blue');
});
```

---

<a name="animations"></a>
## 4. Animations

All animation methods return a `Promise` that resolves when the animation completes.

#### `.animate(props, duration, callback)`
Animates CSS properties.
```javascript
ok('.box').animate({ width: '200px', height: '200px' }, 1000)
  .then(element => console.log('Animation finished!'));
```

#### `.fade_in(duration, callback)`
Fades elements in.
```javascript
ok('.modal').fade_in(400);
```

#### `.fade_out(duration, callback)`
Fades elements out.
```javascript
ok('.modal').fade_out(400);
```

#### `.slide_up(duration, callback)`
Slides elements up.
```javascript
ok('.panel').slide_up(300);
```

#### `.slide_down(duration, callback)`
Slides elements down.
```javascript
ok('.panel').slide_down(300);
```

#### `.move(x, y, duration)`
Hardware-accelerated movement using `translate3d`.
```javascript
ok('.sprite').move(100, 50, 500);
```

#### Module-based Animations
These are added by the `animation` module.

```javascript
ok('.card').scaleIn(300);
ok('.card').scaleOut(300);
ok('.card').rotateIn(500);
ok('.card').rotateOut(500);
ok('.card').bounce(1000);
ok('.card').shake(500);
```

---

<a name="form-handling"></a>
## 5. Form Handling

#### `.form_data()`
Serializes a form into a JavaScript object.
```javascript
const data = ok('#myForm').form_data();
// Result: { username: 'john', password: '123', remember: 'on' }
```

#### `.reset()`
Resets a form.
```javascript
ok('#myForm').reset();
```

#### `.validateForm(rules, options)`
Validates a form based on defined rules.
```javascript
const isValid = ok('#myForm').validateForm({
  username: 'required|min:4',
  email: 'required|email',
  password: 'required|min:8',
  'confirm-password': 'required|match:password'
});

if (!isValid) {
  console.log('Form has errors!');
}
```

#### `.applyMask(maskName)`
Applies an input mask to an element.
```javascript
// Predefined masks are in ok.form.masks
ok('input[name="phone"]').applyMask('phone');
ok('input[name="date"]').applyMask('date');
```

---

<a name="component-system"></a>
## 6. Component System

#### `ok.component.register(name, definition)`
Registers a new component.
```javascript
ok.component.register('my-card', {
  props: { title: 'Default Title' },
  data: { count: 0 },
  template: `
    <div class="card">
      <h3>{{props.title}}</h3>
      <p>Count: {{state.count}}</p>
      <button onclick="this.methods.increment()">+</button>
      <slot></slot>
    </div>
  `,
  methods: {
    increment() {
      this.state.count++;
      this.update();
    }
  },
  created() {
    console.log('Component created!');
  },
  mounted() {
    console.log('Component mounted to DOM!');
  }
});
```

#### `ok.component.create(name, props, slots)`
Creates a component instance.
```javascript
const cardInstance = ok.component.create('my-card', 
  { title: 'My Special Card' }, 
  { default: '<p>This is slotted content.</p>' }
);
```

#### `ok.component.mount(component, target)`
Mounts a component instance to the DOM.
```javascript
ok.component.mount(cardInstance, '#app-container');
```

---

<a name="reactive-state-management"></a>
## 7. Reactive State Management

#### `ok.reactive.reactive(obj)`
Creates a reactive object.
```javascript
const state = ok.reactive.reactive({ message: 'Hello' });

ok.reactive.watch('message', (newValue, oldValue) => {
  console.log(`Message changed from ${oldValue} to ${newValue}`);
});

state.message = 'Hi'; // Triggers the watcher
```

#### `ok.reactive.watch(key, callback)`
Watches for changes on a reactive property.
```javascript
// See example above
```

#### `ok.reactive.bind(element, stateKey, attribute)`
Two-way binds an element to a reactive state property.
```javascript
const state = ok.reactive.reactive({ text: '' });
ok.reactive.bind('#myInput', 'text', 'value');

// Changing the input updates state.text
// Changing state.text updates the input
```

---

<a name="api--http-requests"></a>
## 8. API & HTTP Requests

All methods return a `Promise`.

#### `ok.http.setDefaults(options)`
Sets default options for all requests.
```javascript
ok.http.setDefaults({ cache: true, timeout: 10000 });
```

#### `ok.http.get(url, options)`
Makes a GET request.
```javascript
ok.http.get('/api/users')
  .then(users => console.log(users))
  .catch(error => console.error(error));
```

#### `ok.http.post(url, data, options)`
Makes a POST request.
```javascript
ok.http.post('/api/users', { name: 'John', email: 'john@example.com' })
  .then(user => console.log('User created:', user));
```

#### `ok.http.put(url, data, options)`
Makes a PUT request.
```javascript
ok.http.put('/api/users/1', { name: 'Jane' });
```

#### `ok.http.delete(url, options)`
Makes a DELETE request.
```javascript
ok.http.delete('/api/users/1');
```

#### `ok.http.upload(url, file, options)`
Uploads a file with progress tracking.
```javascript
const fileInput = ok('#fileInput').elements[0].files[0];
ok.http.upload('/api/upload', fileInput, {
  onProgress: (percent, loaded, total) => {
    console.log(`Upload is ${percent}% complete`);
  }
});
```

#### `ok.http.websocket(url, options)`
Creates a WebSocket connection.
```javascript
const ws = ok.http.websocket('ws://localhost:8080');
ws.on('message', data => console.log('Received:', data));
ws.send({ type: 'greeting', text: 'Hello Server!' });
```

---

<a name="router-spa"></a>
## 9. Router (SPA)

#### `ok.router.add(path, component)`
Adds a route.
```javascript
ok.router.add('/', 'home-component');
ok.router.add('/about', 'about-component');
ok.router.add('/users/:id', (params) => {
  return `<h1>User Profile for ID: ${params.id}</h1>`;
});
```

#### `ok.router.notFound(component)`
Sets a 404 Not Found handler.
```javascript
ok.router.notFound('not-found-component');
```

#### `ok.router.init()`
Initializes the router and starts listening for navigation.
```javascript
// Call this once when your app loads
ok.router.init();
```

#### `ok.router.navigate(path)`
Programmatically navigates to a new route.
```javascript
ok('button').click(() => {
  ok.router.navigate('/about');
});
```

---

<a name="web-storage"></a>
## 10. Web Storage

#### `ok.storage.set(key, value, type)`
Saves a value to storage. Automatically handles JSON serialization.
```javascript
ok.storage.set('user', { id: 1, name: 'John' });
```

#### `ok.storage.get(key, defaultValue, type)`
Retrieves a value from storage. Automatically handles JSON parsing.
```javascript
const user = ok.storage.get('user', {});
```

#### `ok.storage.reactive(key, defaultValue, type)`
Creates a reactive object that syncs with storage across tabs.
```javascript
const settings = ok.storage.reactive('settings', { theme: 'dark' });
settings.theme = 'light'; // Automatically saved to localStorage
```

#### `ok.storage.collection(name, type)`
Creates a reactive, persistent collection of objects (like a simple table).
```javascript
const todos = ok.storage.collection('todos');
const newTodo = todos.add({ text: 'Learn OneKit', done: false });
todos.update(newTodo.id, { done: true });
```

---

<a name="utility-functions"></a>
## 11. Utility Functions

#### `ok.utils.debounce(func, delay)`
Creates a debounced version of a function.
```javascript
const searchInput = ok('#search');
const debouncedSearch = ok.utils.debounce(function() {
  console.log('Searching for:', this.value);
}, 300);

searchInput.on('input', debouncedSearch);
```

#### `ok.utils.throttle(func, limit)`
Creates a throttled version of a function.
```javascript
ok(window).on('scroll', ok.utils.throttle(function() {
  console.log('Scrolling...');
}, 100));
```

#### `ok.utils.deepClone(obj)`
Creates a deep clone of an object or array.
```javascript
const original = { a: 1, b: { c: 2 } };
const clone = ok.utils.deepClone(original);
```

---

<a name="gestures-touch-events"></a>
## 12. Gestures (Touch Events)

#### `.gesture()`
Enables touch gestures on an element.
```javascript
ok('.swipeable').gesture()
  .on('swipeleft', () => console.log('Swiped left!'))
  .on('swiperight', () => console.log('Swiped right!'))
  .on('tap', () => console.log('Tapped!'));
```

---

<a name="accessibility-a11y"></a>
## 13. Accessibility (A11y)

#### `.announce(message, priority)`
Announces a message to screen readers.
```javascript
ok('.status').announce('Loading complete.', 'assertive');
```

#### `.trapFocus()`
Traps focus within an element (e.g., a modal).
```javascript
ok('.modal').trapFocus();
```

---

<a name="theming"></a>
## 14. Theming

#### `ok.theme.apply(theme)`
Applies a theme object.
```javascript
ok.theme.apply({
  primary: '#ff6b6b',
  dark: true
});
```

#### `ok.theme.toggleDark()`
Toggles between light and dark mode.
```javascript
ok('button#theme-toggle').click(() => {
  ok.theme.toggleDark();
});
```

---

<a name="virtual-dom-vdom"></a>
## 15. Virtual DOM (VDOM)

#### `ok.vdom.h(tag, props, children)`
Creates a virtual DOM node.
```javascript
const vnode = ok.vdom.h('div', { class: 'container' }, [
  ok.vdom.h('h1', {}, 'Hello'),
  ok.vdom.h('p', {}, 'World')
]);
```

#### `ok.vdom.createElement(vnode)`
Creates a real DOM element from a virtual node.
```javascript
const element = ok.vdom.createElement(vnode);
document.body.appendChild(element);
```

---

<a name="plugin-system"></a>
## 16. Plugin System

#### `ok.plugin.register(name, plugin, namespace)`
Registers a new plugin.
```javascript
ok.plugin.register('highlight', function(color) {
  return this.each(function() {
    this.style.backgroundColor = color;
  });
});

// Usage:
ok('p').highlight('yellow');
```

---

<a name="legacy-utilities"></a>
## 17. Legacy Utilities

These are aliases for newer module functions.

#### `ok.store`
An alias for basic `localStorage` helpers.
```javascript
ok.store.set('key', 'value');
const val = ok.store.get('key');
ok.store.del('key');
```

#### `ok.wait`
An alias for `ok.utils.debounce`.
#### `ok.flow`
An alias for `ok.utils.throttle`.
#### `ok.plug`
An alias for `ok.plugin.register`.