

# OneKit - Modern JavaScript Library

OneKit is a lightweight, powerful JavaScript library that provides everything you need for modern web development: DOM manipulation, animations, reactive state management, routing, API integration, and more.

## Features

- 🚀 **DOM Manipulation** - jQuery-like API for element selection and manipulation
- 🎨 **Animations** - Smooth CSS animations and transitions
- ⚛️ **Reactive State** - Automatic UI updates with reactive data binding
- 🛣️ **Router** - Client-side routing with history API support
- 🌐 **HTTP Client** - AJAX requests, WebSocket, and file uploads
- 📱 **Gestures** - Touch and gesture support for mobile devices
- 🎭 **Components** - Reusable component system
- 🎨 **Themes** - Built-in theming and dark mode support
- ♿ **Accessibility** - Screen reader support and focus management
- 💾 **Storage** - Local/session storage utilities
- 🔧 **Utilities** - Debounce, throttle, date formatting, and more

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <title>My OneKit App</title>
</head>
<body>
    <div id="app">
        <h1>Hello OneKit!</h1>
        <button class="btn">Click me</button>
    </div>

    <script src="onekit.js"></script>
    <script>
        // DOM manipulation
        ok('.btn').click(() => {
            ok('#app').append('<p>Button clicked!</p>');
        });

        // Animations
        ok('.btn').fade_in();
    </script>
</body>
</html>
```

## Installation

Download `onekit.js` and include it in your HTML:

```html
<script src="onekit.js"></script>
```

Or install via npm:

```bash
npm install onekit
```

## Router Example

Check out `router-example.html` for a complete demonstration of OneKit's routing capabilities with HTML content.

```javascript
// Set up routes
ok.router
    .add('/', HomePage)
    .add('/about', AboutPage)
    .add('/user/:id', UserPage)
    .notFound(NotFoundPage)
    .init();
```

## Core API

### Selection & Manipulation

```javascript
// Select elements
ok('.my-class').css('color', 'blue');

// Chain methods
ok('.button')
    .class('active')
    .text('Click me!')
    .on('click', () => console.log('Clicked'));
```

### Reactive State

```javascript
// Create reactive state
const state = ok.reactive.reactive({
    count: 0,
    name: 'OneKit'
});

// Watch for changes
ok.reactive.watch('count', (newVal, oldVal) => {
    console.log(`Count: ${oldVal} → ${newVal}`);
});
```

### HTTP Requests

```javascript
// GET request
ok.http.get('/api/users')
    .then(users => console.log(users));

// POST request
ok.http.post('/api/users', { name: 'John' })
    .then(user => console.log('Created:', user));
```

### Animations

```javascript
// Built-in animations
ok('.element').fade_in(500);
ok('.element').slide_down(300);
ok('.element').bounce(1000);

// Custom animations
ok('.element').animate({
    opacity: 0.5,
    transform: 'scale(1.2)'
}, 400);
```

### Components

```javascript
// Register a component
ok.component.register('counter', {
    data: { count: 0 },
    template: '<div>Count: {{count}} <button onclick="this.increment()">+</button></div>',
    methods: {
        increment() {
            this.state.count++;
            this.update();
        }
    }
});

// Mount component
const counter = ok.component.create('counter');
ok.component.mount(counter, '#app');
```

## DOM Manipulation

### Content

```javascript
// Get or set HTML content
ok('.element').html('<span>New content</span>');
const html = ok('.element').html();

// Get or set text content
ok('.element').text('New text');
const text = ok('.element').text();
```

### Attributes

```javascript
// Set single attribute
ok('.element').attr('title', 'Tooltip');

// Set multiple attributes
ok('.element').attr({
  'title': 'Tooltip',
  'data-id': '123'
});

// Get attribute
const title = ok('.element').attr('title');

// Remove attribute
ok('.element').unattr('title');
```

### CSS

```javascript
// Set single CSS property
ok('.element').css('color', 'red');

// Set multiple CSS properties
ok('.element').css({
  'color': 'red',
  'font-size': '16px'
});

// Get CSS property
const color = ok('.element').css('color');
```

### Classes

```javascript
// Add class
ok('.element').class('active');

// Remove class
ok('.element').unclass('active');

// Toggle class
ok('.element').toggleClass('active');
```

### Visibility

```javascript
// Show elements
ok('.element').show();

// Hide elements
ok('.element').hide();

// Toggle visibility
ok('.element').toggle();
```

### DOM Structure

```javascript
// Append content
ok('.container').append('<div>New element</div>');
ok('.container').append(otherElement);

// Prepend content
ok('.container').prepend('<div>First element</div>');

// Clone elements
ok('.element').clone();

// Remove elements
ok('.element').remove();
```

## Event Handling

### Basic Events

```javascript
// Add event listener
ok('.button').on('click', function(e) {
  console.log('Button clicked');
});

// Remove event listener
ok('.button').off('click', handler);

// Event shortcuts
ok('.button').click(function() {
  console.log('Clicked');
});

ok('.element').hover(
  function() { console.log('Mouse entered'); },
  function() { console.log('Mouse left'); }
);

ok('.input').focus(function() {
  console.log('Input focused');
});
```

### Event Delegation

```javascript
// Use event delegation for dynamic content
ok('.container').on('click', '.button', function(e) {
  console.log('Dynamic button clicked');
});
```

## Animations

### Basic Animations

```javascript
// Fade in
ok('.element').fade_in(400, function() {
  console.log('Fade in complete');
});

// Fade out
ok('.element').fade_out(400);

// Slide up
ok('.element').slide_up(400);

// Slide down
ok('.element').slide_down(400);

// Custom animation
ok('.element').animate({
  'left': '100px',
  'opacity': 0.5
}, 500);
```

### Advanced Animations

```javascript
// Scale in
ok('.element').scaleIn(300);

// Scale out
ok('.element').scaleOut(300);

// Rotate in
ok('.element').rotateIn(500);

// Rotate out
ok('.element').rotateOut(500);

// Bounce
ok('.element').bounce(1000);

// Shake
ok('.element').shake(500);
```

## Form Handling

### Form Data

```javascript
// Serialize form data
const formData = ok('#myForm').form_data();
console.log(formData);

// Reset form
ok('#myForm').reset();
```

### Form Validation

```javascript
// Validate form with rules
const isValid = ok('#myForm').validateForm({
  'name': 'required',
  'email': 'required|email',
  'password': 'required|min:8',
  'confirm': 'required|match:password'
}, {
  errorClass: 'error',
  errorElement: 'span',
  errorContainer: '.field-wrapper'
});

if (isValid) {
  // Form is valid, submit it
}
```

### Input Masks

```javascript
// Apply phone mask
ok('input[type="tel"]').applyMask('phone');

// Apply date mask
ok('input[type="date"]').applyMask('date');

// Apply credit card mask
ok('input[name="card"]').applyMask('creditCard');
```

## Component System

### Registering Components

```javascript
// Register a component
ok.component.register('my-component', {
  data: {
    count: 0
  },
  template: '<div class="counter">Count: {{count}}</div>',
  methods: {
    increment() {
      this.state.count++;
      this.update();
    }
  },
  created() {
    console.log('Component created');
  },
  mounted() {
    console.log('Component mounted');
  },
  beforeDestroy() {
    console.log('Component about to be destroyed');
  }
});
```

### Creating and Mounting Components

```javascript
// Create a component instance
const myComponent = ok.component.create('my-component', {
  // Props
});

// Mount component to DOM
ok.component.mount(myComponent, '#container');

// Get component instance from element
const element = document.querySelector('.counter');
const instance = ok.component.getInstance(element);

// Destroy component
ok.component.destroy(myComponent);
```

## Reactive State Management

### Creating Reactive Objects

```javascript
// Create reactive state
const state = ok.reactive.reactive({
  count: 0,
  name: 'OneKit'
});

// Watch for changes
const unwatch = ok.reactive.watch('count', function(newValue, oldValue) {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});

// Stop watching
unwatch();
```

### Binding Elements to State

```javascript
// Bind element to state
ok.reactive.bind('#counter', 'count');

// When state.count changes, the input value will update
// When the input value changes, state.count will update
```

## API & HTTP Requests

### Basic Requests

```javascript
// GET request
ok.http.get('/api/data')
  .then(data => console.log(data))
  .catch(error => console.error(error));

// POST request
ok.http.post('/api/save', { name: 'OneKit' })
  .then(response => console.log(response));

// PUT request
ok.http.put('/api/update/1', { name: 'Updated' });

// DELETE request
ok.http.delete('/api/delete/1');
```

### Advanced Request Options

```javascript
// Request with options
ok.http.request('/api/data', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token'
  },
  timeout: 5000,
  retries: 3,
  cache: true,
  cacheTime: 300000,
  loader: '#loading-indicator'
});
```

### WebSocket

```javascript
// Create WebSocket connection
const ws = ok.http.websocket('wss://example.com/socket', {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
});

// Listen for messages
ws.on('message', function(data) {
  console.log('Received:', data);
});

// Send data
ws.send({ type: 'message', content: 'Hello' });

// Close connection
ws.close();
```

### File Upload

```javascript
// Upload file with progress tracking
ok.http.upload('/api/upload', file, {
  method: 'POST',
  data: { userId: 123 },
  timeout: 30000,
  onProgress: function(percentComplete, loaded, total) {
    console.log(`Upload ${percentComplete}% complete`);
  },
  loader: '#upload-progress'
})
.then(response => console.log('Upload complete'))
.catch(error => console.error('Upload failed'));
```

## Gesture Support

### Adding Gesture Support

```javascript
// Enable gestures on an element
ok('.carousel').gesture();

// Listen for gesture events
ok('.carousel').on('swipe', function(e) {
  console.log('Swiped', e.detail.direction);
});

ok('.carousel').on('swipeleft', function(e) {
  // Go to next slide
});

ok('.carousel').on('swiperight', function(e) {
  // Go to previous slide
});

ok('.element').on('tap', function(e) {
  console.log('Tapped at', e.detail.x, e.detail.y);
});

ok('.element').on('longpress', function(e) {
  console.log('Long press at', e.detail.x, e.detail.y);
});

ok('.element').on('pinchstart', function(e) {
  console.log('Pinch started with distance', e.detail.distance);
});

ok('.element').on('pinchmove', function(e) {
  console.log('Pinch scale', e.detail.scale);
});

ok('.element').on('pinchend', function(e) {
  console.log('Pinch ended');
});
```

## Utilities

### Debounce and Throttle

```javascript
// Debounce function
const debouncedFn = ok.utils.debounce(function() {
  console.log('Debounced function called');
}, 300);

// Throttle function
const throttledFn = ok.utils.throttle(function() {
  console.log('Throttled function called');
}, 1000);
```

### Object Utilities

```javascript
// Deep clone object
const cloned = ok.utils.deepClone(originalObject);

// Deep merge objects
const merged = ok.utils.deepMerge(object1, object2);
```

### URL Utilities

```javascript
// Build URL with parameters
const url = ok.utils.url('/api/data', { page: 1, limit: 10 });
// Result: "/api/data?page=1&limit=10"

// Parse query string
const params = ok.utils.parseQuery('?page=1&limit=10');
// Result: { page: "1", limit: "10" }
```

### Date Formatting

```javascript
// Format date
const formatted = ok.utils.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
// Result: "2023-06-15 14:30:45"
```

## Accessibility

### Screen Reader Announcements

```javascript
// Announce message to screen readers
ok('.button').announce('Button clicked');

// Announce with polite priority (default)
ok.a11y.announce('Content loaded', 'polite');

// Announce with assertive priority
ok.a11y.announce('Error occurred', 'assertive');
```

### Focus Management

```javascript
// Trap focus within modal
ok('.modal').trapFocus();

// Remove focus trap
ok('.modal').removeFocusTrap();
```

## Theme System

### Applying Themes

```javascript
// Apply custom theme
ok.theme.apply({
  primary: '#3498db',
  secondary: '#2ecc71',
  accent: '#e74c3c',
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#333333',
  textSecondary: '#666666',
  border: '#dddddd',
  dark: false
});

// Toggle dark mode
ok.theme.toggleDark();

// Get current theme
const currentTheme = ok.theme.current();

// Load saved theme
ok.theme.load();
```

## Storage

### Local Storage

```javascript
// Store data
ok.store.set('key', 'value');
ok.store.set('user', { name: 'John', age: 30 });

// Retrieve data
const value = ok.store.get('key');
const user = ok.store.get('user');

// Delete data
ok.store.del('key');
```

## Plugin Development

### Creating Plugins

```javascript
// Register a plugin
ok.plugin.register('myPlugin', function(options = {}) {
  // Plugin logic
  return this.each(function() {
    // 'this' refers to the current element
    console.log('Plugin applied to', this);
  });
});

// Use the plugin
ok('.element').myPlugin({ option: 'value' });
```

### Legacy Plugin Method

```javascript
// Add method to OneKit prototype
ok.plug('legacyMethod', function() {
  return this.each(function() {
    console.log('Legacy method called on', this);
  });
});

// Use the legacy method
ok('.element').legacyMethod();
```

## Debugging

### Logging Elements

```javascript
// Log element to console
ok('.element').log();

// Log element information
ok('.element').info();
```

## Browser Support

OneKit 2.0.2 supports all modern browsers, including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

OneKit is released under the MIT License.