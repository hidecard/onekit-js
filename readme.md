

# OneKit 3.1.0 - Lightweight JavaScript Library

OneKit is a modern, lightweight JavaScript library for DOM manipulation, reactive state management, animations, and more. Inspired by jQuery but built with modern JavaScript features and enterprise-grade security.

## Features

- **OKJS Template Syntax**: Custom bracket-based template syntax for components
- **DOM Manipulation**: Chainable API for selecting and manipulating elements
- **Reactive State**: Automatic UI updates when data changes
- **Animations**: Promise-based animations with hardware acceleration
- **Form Handling**: Validation, masking, and serialization
- **Component System**: Build reusable UI components
- **HTTP Requests**: AJAX with caching and WebSocket support
- **Routing**: Single-page application routing
- **Storage**: Reactive local/session storage with security
- **Gestures**: Touch event handling
- **Accessibility**: Screen reader support and focus management
- **Theming**: Dynamic theme switching
- **Utilities**: Debounce, throttle, and more
- **Security**: Built-in XSS protection, input validation, and prototype pollution prevention

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

## Security

OneKit 2.2.0 includes **built-in security features** that protect against common web vulnerabilities:

### Automatic Protection

- ✅ **XSS Prevention**: All HTML insertion methods (`html()`, `append()`, `prepend()`) automatically sanitize content
- ✅ **Input Validation**: Selectors, URLs, and user inputs are validated before processing
- ✅ **Prototype Pollution Prevention**: Storage keys and object properties are protected
- ✅ **URL Sanitization**: Dangerous protocols (`javascript:`, `data:`, `vbscript:`) are blocked
- ✅ **Component Security**: Component templates are sanitized before rendering
- ✅ **Secure Storage**: Storage operations validate keys and sanitize values

### Security Examples

```javascript
// XSS Protection - Automatic
ok('#content').html('<script>alert("XSS")</script>');
// Result: Script tag removed, safe HTML inserted

// Prototype Pollution Prevention
ok.storage.set('__proto__', {}); // Returns false, blocked
ok.storage.set('constructor', {}); // Returns false, blocked

// URL Sanitization
ok.http.get('javascript:alert(1)'); // Blocked, returns error

// Input Validation
ok('<script>alert(1)</script>'); // Invalid selector, returns empty collection
```

### Security API

```javascript
// Manual sanitization
const safe = ok.security.sanitizeHTML(userInput);

// Validate inputs
if (ok.security.validateSelector(selector)) {
  ok(selector).doSomething();
}

// Sanitize URLs
const safeURL = ok.security.sanitizeURL(userInput);

// Safe deep clone
const safeClone = ok.security.deepCloneSafe(obj);
```

### Configuration

Security is **enabled by default**. You can configure it:

```javascript
// Disable security (not recommended)
ok.security.disable();

// Re-enable security
ok.security.enable();

// Configure individual features
ok.security.config.ENABLE_SANITIZATION = true;  // Default: true
ok.security.config.ENABLE_VALIDATION = true;    // Default: true
```

> **Note**: Security features are transparent and don't break existing code. All HTML content is automatically sanitized to prevent XSS attacks.

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
    ok('#list').append(okjs`[li]New Item[/li]`);
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
// Register component with OKJS template
ok.component.register('my-card', {
    props: { title: 'Default' },
    data: { count: 0 },
    template: okjs`
        [div class="card"]
            [h3]{{props.title}}[/h3]
            [p]Count: {{state.count}}[/p]
            [button onclick="this.methods.increment()"]+[/button]
        [/div]
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
    template: okjs`
        [div class="todo-item {{state.done ? 'done' : ''}}"]
            [input type="checkbox" {{props.done ? 'checked' : ''}}
                   onchange="this.methods.toggle()" /]
            [span]{{props.text}}[/span]
            [button onclick="this.methods.remove()"]×[/button]
        [/div]
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
                okjs`[li]${user.name} (${user.email})[/li]`
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

## Cryptography

OneKit includes a comprehensive crypto module for secure cryptographic operations:

```javascript
// Hash data
ok.crypto.hash('Hello World')
    .then(hash => console.log('SHA-256:', hash));

// Encrypt/decrypt data
ok.crypto.encrypt('Secret message', 'my-key')
    .then(encrypted => {
        return ok.crypto.decrypt(encrypted, 'my-key');
    })
    .then(decrypted => console.log(decrypted));

// Generate secure keys
ok.crypto.generateKey('AES-GCM', 256)
    .then(key => console.log('Key generated'));

// Generate random bytes
const randomBytes = ok.crypto.randomBytes(16);

// HMAC for integrity
ok.crypto.hmac('data', 'key')
    .then(hmac => console.log('HMAC:', hmac));

// PBKDF2 key derivation
ok.crypto.pbkdf2('password', 'salt', 100000, 256)
    .then(key => console.log('Derived key'));
```

**Example from crypto-examples.html:**
```javascript
// Hash a password
ok.crypto.hash('mypassword')
    .then(hash => {
        console.log('Password hash:', hash);
    });

// Encrypt sensitive data
const data = { email: 'user@example.com', ssn: '123-45-6789' };
ok.crypto.encrypt(JSON.stringify(data), 'encryption-key')
    .then(encrypted => {
        // Store encrypted data
        ok.storage.set('user-data', encrypted);
    });
```

## Physics-Based Animations

Add realistic physics to your animations:

```javascript
// Enable physics on elements
ok('.ball').physics({
    gravity: 0.5,
    bounce: 0.8,
    friction: 0.1
});

// Create spring connections
ok('.anchor').physics.spring('.connected-element', {
    stiffness: 0.2,
    damping: 0.1
});
```

## Timeline Animations

Create complex sequenced animations:

```javascript
const tl = ok.timeline();

tl.to('.box1', { opacity: 1, x: 100 }, 500)
  .to('.box2', { opacity: 1, y: 100 }, 500, { stagger: 100 })
  .add(() => console.log('Midpoint reached'))
  .from('.box3', { scale: 0 }, 300);

tl.play();
```

## 3D Scene Management

Manipulate 3D transformations:

```javascript
const scene = ok.scene3d('#container');

const cube = scene.add('.cube');
scene.rotateY(cube, 45);
scene.translateZ(cube, 100);
```

## Content Security Policy

Manage CSP headers programmatically:

```javascript
ok.csp.policy({
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline'",
    'style-src': "'self' 'unsafe-inline'"
}).apply();

// Monitor violations
ok.csp.onViolation(violation => {
    console.log('CSP violation:', violation);
});
```

## Command Line Interface

Built-in CLI for development and debugging:

```javascript
// Register custom commands
ok.cli.register('greet', (name) => `Hello, ${name}!`, 'Greet someone');

// Execute commands
const result = ok.cli.execute('greet World');
// Result: "Hello, World!"
```

## Component Stories

Create interactive component documentation:

```javascript
ok.stories.add('Buttons', 'Primary Button', {
    description: 'A primary action button',
    component: '<button class="btn btn-primary">Click me</button>'
});

ok.stories.render(); // Opens storybook interface
```

## WebAssembly Support

Load and instantiate WebAssembly modules:

```javascript
ok.wasm.load('module.wasm')
    .then(instance => {
        // Use WebAssembly functions
        const result = instance.exports.add(1, 2);
        console.log('1 + 2 =', result);
    });
```

## Background Workers

Run tasks in background threads:

```javascript
// Note: Worker module implementation depends on specific requirements
// This is a placeholder for future implementation
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

## Security Features

OneKit 2.2.0 includes comprehensive security features built directly into the library:

### 🔒 Built-in Security

- **XSS Protection**: Automatic HTML sanitization prevents cross-site scripting attacks
- **Input Validation**: Validates selectors, URLs, and user inputs
- **Prototype Pollution Prevention**: Blocks `__proto__`, `constructor`, and `prototype` manipulation
- **URL Sanitization**: Prevents dangerous protocols (`javascript:`, `data:`, `vbscript:`)
- **Secure Storage**: Validates storage keys and sanitizes values
- **Component Security**: Sanitizes component templates before rendering

### Security API

```javascript
// HTML sanitization (automatic in html(), append(), prepend())
ok('#content').html('<script>alert("XSS")</script>'); // Automatically sanitized

// Manual sanitization
const safe = ok.security.sanitizeHTML(userInput);

// Validate selectors
if (ok.security.validateSelector(selector)) {
  ok(selector).doSomething();
}

// Sanitize URLs
const safeURL = ok.security.sanitizeURL(userInput);

// Validate storage keys
if (ok.security.validateStorageKey(key)) {
  ok.storage.set(key, value);
}

// Safe deep clone (prevents prototype pollution)
const safeClone = ok.security.deepCloneSafe(obj);
```

### Security Configuration

```javascript
// Enable/disable security features
ok.security.enable();  // Enable all security (default)
ok.security.disable(); // Disable security (not recommended)

// Configure individual features
ok.security.config.ENABLE_SANITIZATION = true;  // Default: true
ok.security.config.ENABLE_VALIDATION = true;    // Default: true
```

### Security Best Practices

1. **Always use `html()` for trusted content only**
   ```javascript
   // ✅ Good - automatically sanitized
   ok('#el').html(userInput);
   
   // ✅ Better - use text() for untrusted content
   ok('#el').text(userInput);
   ```

2. **Validate user input before processing**
   ```javascript
   // ✅ Good
   if (ok.security.validateSelector(selector)) {
     ok(selector).doSomething();
   }
   ```

3. **Use secure storage methods**
   ```javascript
   // ✅ Good - automatically validated
   ok.storage.set('user', data);
   // ❌ Bad - prototype pollution attempt blocked
   ok.storage.set('__proto__', {}); // Returns false
   ```

### Security Examples

**XSS Protection:**
```javascript
// Dangerous HTML is automatically sanitized
ok('#content').html('<script>alert("XSS")</script><img src=x onerror="alert(1)">');
// Result: Script tags and event handlers removed, safe HTML inserted
```

**Prototype Pollution Prevention:**
```javascript
// Attempts to pollute prototype are blocked
ok.storage.set('__proto__', { isAdmin: true }); // Returns false, blocked
ok.storage.set('constructor', {}); // Returns false, blocked
```

**URL Sanitization:**
```javascript
// Dangerous URLs are blocked
ok.http.get('javascript:alert(1)'); // URL sanitized, request fails safely
ok.http.get('data:text/html,<script>alert(1)</script>'); // Blocked
```


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
Gets or sets the inner HTML of elements. **HTML content is automatically sanitized to prevent XSS attacks.**
```javascript
// Get HTML
const content = ok('#myDiv').html();

// Set HTML (automatically sanitized)
ok('#myDiv').html('<strong>New Content</strong>');

// Dangerous content is sanitized
ok('#myDiv').html('<script>alert("XSS")</script>'); 
// Result: Script tag removed, safe HTML inserted
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
Inserts content at the end of each element. **HTML strings are automatically sanitized.**
```javascript
ok('ul').append('<li>New Item</li>');
// HTML strings are sanitized to prevent XSS
```

#### `.prepend(content)`
Inserts content at the beginning of each element. **HTML strings are automatically sanitized.**
```javascript
ok('ul').prepend('<li>First Item</li>');
// HTML strings are sanitized to prevent XSS
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
Registers a new component. **Component templates are automatically sanitized before rendering.**
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
// Templates are automatically sanitized to prevent XSS
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
Two-way binds an element to a reactive state property. **State keys are validated to prevent prototype pollution.**
```javascript
const state = ok.reactive.reactive({ text: '' });
ok.reactive.bind('#myInput', 'text', 'value');

// Changing the input updates state.text
// Changing state.text updates the input

// Prototype pollution attempts are blocked
ok.reactive.bind('#input', '__proto__', 'value'); // Blocked
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
Makes a GET request. **URLs are automatically sanitized to prevent XSS.**
```javascript
ok.http.get('/api/users')
  .then(users => console.log(users))
  .catch(error => console.error(error));

// Dangerous URLs are blocked
ok.http.get('javascript:alert(1)'); // Blocked, returns error
```

#### `ok.http.post(url, data, options)`
Makes a POST request. **URLs are sanitized and request bodies are protected against prototype pollution.**
```javascript
ok.http.post('/api/users', { name: 'John', email: 'john@example.com' })
  .then(user => console.log('User created:', user));

// Request bodies are sanitized to prevent prototype pollution
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
Adds a route. **Paths and component outputs are automatically sanitized.**
```javascript
ok.router.add('/', 'home-component');
ok.router.add('/about', 'about-component');
ok.router.add('/users/:id', (params) => {
  // Component output is automatically sanitized
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
Programmatically navigates to a new route. **Paths are sanitized to prevent XSS.**
```javascript
ok('button').click(() => {
  ok.router.navigate('/about');
  // Paths are validated and sanitized
});
```

---

<a name="web-storage"></a>
## 10. Web Storage

#### `ok.storage.set(key, value, type)`
Saves a value to storage. Automatically handles JSON serialization. **Storage keys are validated to prevent prototype pollution.**
```javascript
ok.storage.set('user', { id: 1, name: 'John' });

// Prototype pollution attempts are blocked
ok.storage.set('__proto__', {}); // Returns false, blocked
ok.storage.set('constructor', {}); // Returns false, blocked
```

#### `ok.storage.get(key, defaultValue, type)`
Retrieves a value from storage. Automatically handles JSON parsing. **Returns sanitized clones to prevent prototype pollution.**
```javascript
const user = ok.storage.get('user', {});
// Returns a safe clone, preventing prototype pollution
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

#### `ok.security.sanitizeHTML(html)`
Sanitizes HTML to prevent XSS attacks. Used automatically by `html()`, `append()`, and `prepend()`.
```javascript
const safe = ok.security.sanitizeHTML('<script>alert("XSS")</script>');
// Returns: '' (script tag removed)
```

#### `ok.security.validateSelector(selector)`
Validates CSS selectors to prevent injection attacks.
```javascript
if (ok.security.validateSelector(selector)) {
  ok(selector).doSomething();
}
```

#### `ok.security.sanitizeURL(url)`
Sanitizes URLs to prevent XSS via dangerous protocols.
```javascript
const safe = ok.security.sanitizeURL('javascript:alert(1)');
// Returns: '#' (dangerous protocol blocked)
```

#### `ok.security.deepCloneSafe(obj)`
Creates a deep clone with prototype pollution protection.
```javascript
const safe = ok.security.deepCloneSafe(obj);
// Protects against __proto__ manipulation
```

#### `ok.security.validateStorageKey(key)`
Validates storage keys to prevent prototype pollution.
```javascript
if (ok.security.validateStorageKey(key)) {
  ok.storage.set(key, value);
}
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

---

## Changelog

### Version 2.2.0 (Current)

**🔒 Security Enhancements:**
- Added automatic HTML sanitization to prevent XSS attacks
- Implemented input validation for selectors and URLs
- Added prototype pollution prevention in storage and reactive state
- Enhanced URL sanitization to block dangerous protocols
- Improved component template security
- Added secure deep cloning with pollution protection
- Exposed security API via `ok.security`

**✨ Improvements:**
- Better error handling and security warnings
- Enhanced storage operations with validation
- Improved API request security
- Router path sanitization

**📝 Breaking Changes:**
- None! All security features are backward compatible

### Version 2.1.0

- Initial release with core features
- DOM manipulation
- Reactive state management
- Component system
- Router module
- Storage module
- Animation module
- Form handling
- Gesture support
- Accessibility features
- Theme management
- Utility functions

---

## Security Best Practices

1. **Always sanitize user input**
   ```javascript
   // ✅ Good - automatically sanitized
   ok('#content').html(userInput);
   
   // ✅ Better - use text() for untrusted content
   ok('#content').text(userInput);
   ```

2. **Validate before processing**
   ```javascript
   // ✅ Good
   if (ok.security.validateSelector(selector)) {
     ok(selector).doSomething();
   }
   ```

3. **Use secure storage**
   ```javascript
   // ✅ Good - automatically validated
   ok.storage.set('user', data);
   ```

4. **Enable Content Security Policy**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self';">
   ```

For detailed security information, see [SECURITY_CHANGES.md](./SECURITY_CHANGES.md)