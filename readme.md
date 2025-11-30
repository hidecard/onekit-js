

# OneKid Library - Complete Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Element Selection](#element-selection)
3. [Class Manipulation](#class-manipulation)
4. [Content Manipulation](#content-manipulation)
5. [Attribute Manipulation](#attribute-manipulation)
6. [CSS Styling](#css-styling)
7. [Visibility Control](#visibility-control)
8. [DOM Traversal](#dom-traversal)
9. [Event Handling](#event-handling)
10. [Animations](#animations)
11. [Form Handling](#form-handling)
12. [Template Rendering](#template-rendering)
13. [Element Manipulation](#element-manipulation)
14. [Reactive State](#reactive-state)
15. [Storage Utilities](#storage-utilities)
16. [API Integration](#api-integration)
17. [Utility Functions](#utility-functions)
18. [Advanced Examples](#advanced-examples)
19. [Best Practices](#best-practices)

---

## Getting Started {#getting-started}

### Installation
Include OneKit in your HTML file:
```html
<script src="onekit.js"></script>
```

### Basic Usage
OneKit uses the underscore `_` as its main selector function:
```javascript
// Select an element by ID
_('#myElement')

// Select elements by class
_('.myClass')

// Select elements by tag
_('div')

// Chain methods
_('#myElement').cls('active').show().s('color', 'red')
```

---

## Element Selection {#element-selection}

### `_()` - Element Selector
Selects DOM elements using CSS selectors, DOM elements, or HTML strings.

#### Syntax
```javascript
_(selector)
```

#### Parameters
- `selector` (String|Element|NodeList|Array): CSS selector, DOM element, or HTML string

#### Return Value
Returns an EasyJS object containing the matched elements.

#### Examples

```javascript
// Select by ID
const header = _('#header')

// Select by class
const buttons = _('.button')

// Select by tag
const paragraphs = _('p')

// Select with complex CSS
const menuItems = _('#nav ul li.active')

// Select DOM element directly
const element = document.getElementById('content')
const $element = _(element)

// Create elements from HTML
const newDiv = _('<div class="new-element">Content</div>')
_('#container').add(newDiv)

// Select multiple elements
const elements = _(['#el1', '#el2', '#el3'])
```

---

## Class Manipulation {#class-manipulation}

### `.cls()` - Add Class
Adds one or more CSS classes to selected elements.

#### Syntax
```javascript
_(selector).cls(className)
```

#### Parameters
- `className` (String): One or more space-separated class names

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Add single class
_('#element').cls('highlight')

// Add multiple classes
_('.box').cls('highlight border rounded')

// Chain with other methods
_('#button').cls('active').s('background-color', 'blue')

// Add class to multiple elements
_('.item').cls('selected')
```

### `.uncls()` - Remove Class
Removes one or more CSS classes from selected elements.

#### Syntax
```javascript
_(selector).uncls(className)
```

#### Parameters
- `className` (String): One or more space-separated class names

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Remove single class
_('#element').uncls('highlight')

// Remove multiple classes
_('.box').uncls('highlight border rounded')

// Remove all classes
_('#element').uncls()

// Chain with other methods
_('#button').uncls('active').hide()
```

### `.tgl()` - Toggle Class
Toggles the presence of one or more CSS classes on selected elements.

#### Syntax
```javascript
_(selector).tgl(className)
```

#### Parameters
- `className` (String): One or more space-separated class names

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Toggle single class
_('#button').tgl('active')

// Toggle multiple classes
_('.item').tgl('selected expanded')

// Use in event handlers
_('#toggle').click(() => {
  _('.menu').tgl('open')
})

// Check if class exists after toggle
const hasClass = _('#element')[0].classList.contains('active')
```

---

## Content Manipulation {#content-manipulation}

### `.h()` - HTML Content
Gets or sets the HTML content of selected elements.

#### Syntax
```javascript
// Get HTML content
_(selector).h()

// Set HTML content
_(selector).h(content)
```

#### Parameters
- `content` (String|Function): HTML string or function returning HTML

#### Return Value
- When getting: Returns the HTML content of the first element
- When setting: Returns the EasyJS object for chaining

#### Examples
```javascript
// Get HTML content
const content = _('#container').h()
console.log(content)

// Set HTML content
_('#container').h('<div>New content</div>')

// Set HTML with function
_('.item').h((index) => {
  return `<span>Item ${index + 1}</span>`
})

// Append HTML
const current = _('#container').h()
_('#container').h(current + '<div>Additional content</div>')

// Set complex HTML
_('#content').h(`
  <div class="card">
    <h3>Title</h3>
    <p>Description</p>
    <button>Action</button>
  </div>
`)
```

### `.t()` - Text Content
Gets or sets the text content of selected elements, without HTML tags.

#### Syntax
```javascript
// Get text content
_(selector).t()

// Set text content
_(selector).t(content)
```

#### Parameters
- `content` (String|Function): Text string or function returning text

#### Return Value
- When getting: Returns the combined text content of all elements
- When setting: Returns the EasyJS object for chaining

#### Examples
```javascript
// Get text content
const text = _('#container').t()
console.log(text)

// Set text content
_('#container').t('Plain text content')

// Set text with function
_('.item').t((index) => {
  return `Item number ${index + 1}`
})

// Safely set text (escapes HTML)
_('#safe-content').t('<script>alert("XSS")</script>')

// Get text from multiple elements
const allText = _('.description').t()
```

---

## Attribute Manipulation {#attribute-manipulation}

### `.at()` - Attribute
Gets or sets attributes on selected elements.

#### Syntax
```javascript
// Get single attribute
_(selector).at(attributeName)

// Set single attribute
_(selector).at(attributeName, value)

// Set multiple attributes
_(selector).at(attributesObject)
```

#### Parameters
- `attributeName` (String): Name of the attribute
- `value` (String|Function): Value to set or function returning value
- `attributesObject` (Object): Key-value pairs of attributes

#### Return Value
- When getting: Returns the attribute value of the first element
- When setting: Returns the EasyJS object for chaining

#### Examples
```javascript
// Get an attribute
const src = _('img').at('src')
console.log('Image source:', src)

// Set single attribute
_('img').at('alt', 'Description of image')

// Set multiple attributes
_('a').at({
  'href': 'https://example.com',
  'target': '_blank',
  'title': 'Visit Example'
})

// Set attribute with function
_('.item').at('data-index', (index) => index)

// Set boolean attributes
_('input').at('disabled', true)
_('input').at('disabled', false)

// Get custom data attribute
const userId = _('#user').at('data-user-id')
```

### `.unat()` - Remove Attribute
Removes attributes from selected elements.

#### Syntax
```javascript
_(selector).unat(attributeName)
```

#### Parameters
- `attributeName` (String): Name of the attribute to remove

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Remove single attribute
_('img').unat('title')

// Remove multiple attributes
_('input').unat('disabled readonly')

// Use in form validation
_('.error').unat('data-error')

// Remove data attributes
_('#element').unat('data-temp')
```

---

## CSS Styling {#css-styling}

### `.s()` - Style
Gets or sets CSS styles on selected elements.

#### Syntax
```javascript
// Get CSS property
_(selector).s(propertyName)

// Set single CSS property
_(selector).s(propertyName, value)

// Set multiple CSS properties
_(selector).s(propertiesObject)
```

#### Parameters
- `propertyName` (String): Name of the CSS property
- `value` (String|Number|Function): Value to set or function returning value
- `propertiesObject` (Object): Key-value pairs of CSS properties

#### Return Value
- When getting: Returns the computed value of the first element
- When setting: Returns the EasyJS object for chaining

#### Examples
```javascript
// Get CSS property
const color = _('#element').s('color')
console.log('Text color:', color)

// Set single CSS property
_('#element').s('background-color', '#ff0000')

// Set multiple CSS properties
_('#element').s({
  'background-color': '#ff0000',
  'color': '#ffffff',
  'font-size': '16px',
  'padding': '10px'
})

// Set CSS with function
_('.item').s('font-size', (index) => {
  return 12 + (index * 2) + 'px'
})

// Use CSS units
_('#element').s('width', '100px')
_('#element').s('height', '50%')
_('#element').s('margin', '10px 20px')

// Set CSS with camelCase or kebab-case
_('#element').s('backgroundColor', '#ff0000')
_('#element').s('background-color', '#ff0000')

// Get computed styles
const display = _('#element').s('display')
const opacity = _('#element').s('opacity')
```

---

## Visibility Control {#visibility-control}

### `.show()` - Show Element
Makes selected elements visible by setting their display property to default.

#### Syntax
```javascript
_(selector).show()
```

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Show an element
_('#hidden-element').show()

// Show multiple elements
_('.hidden').show()

// Chain with other methods
_('#element').show().cls('visible').s('opacity', '1')

// Use in event handlers
_('#show-button').click(() => {
  _('#content').show()
})

// Show with animation
_('#element').show().fin(300)
```

### `.hide()` - Hide Element
Hides selected elements by setting their display property to 'none'.

#### Syntax
```javascript
_(selector).hide()
```

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Hide an element
_('#element').hide()

// Hide multiple elements
_('.temporary').hide()

// Chain with other methods
_('#element').hide().uncls('visible')

// Use in event handlers
_('#close-button').click(() => {
  _('#modal').hide()
})

// Hide with animation
_('#element').fout(300).hide()
```

### `.togVis()` - Toggle Visibility
Toggles the visibility of selected elements between shown and hidden.

#### Syntax
```javascript
_(selector).togVis()
```

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Toggle visibility
_('#element').togVis()

// Toggle multiple elements
_('.toggleable').togVis()

// Use in event handlers
_('#toggle-button').click(() => {
  _('.menu').togVis()
})

// Toggle based on condition
const isVisible = _('#element').s('display') !== 'none'
if (someCondition) {
  _('#element').togVis()
}

// Toggle with class
_('#element').togVis().tgl('active')
```

---

## DOM Traversal {#dom-traversal}

### `.up()` - Parent Element
Gets the parent of each element in the current selection.

#### Syntax
```javascript
_(selector).up()
```

#### Return Value
Returns an EasyJS object containing the parent elements.

#### Examples
```javascript
// Get parent element
const parent = _('#child').up()
parent.cls('highlight')

// Use with chaining
_('.remove-button').click(function() {
  _(this).up().del()
})

// Chain with other traversal methods
_('#element').up().up().cls('grandparent')

// Get parent and modify it
_('#child').up().s('border', '1px solid red')

// Get parent of multiple elements
_('.item').up().cls('parent-of-item')
```

### `.down()` - Children Elements
Gets the children of each element in the current selection.

#### Syntax
```javascript
_(selector).down()
_(selector).down(filterSelector)
```

#### Parameters
- `filterSelector` (String, optional): CSS selector to filter children

#### Return Value
Returns an EasyJS object containing the child elements.

#### Examples
```javascript
// Get all children
const children = _('#container').down()
children.s('margin', '5px')

// Get filtered children
const listItems = _('#menu').down('li')
listItems.cls('menu-item')

// Get first child
const firstChild = _('#container').down().first()

// Use with each()
_('#container').down().each(function(index) {
  _(this).at('data-index', index)
})

// Get children with specific class
const activeChildren = _('#parent').down('.active')
```

### `.side()` - Siblings Elements
Gets the siblings of each element in the current selection.

#### Syntax
```javascript
_(selector).side()
_(selector).side(filterSelector)
```

#### Parameters
- `filterSelector` (String, optional): CSS selector to filter siblings

#### Return Value
Returns an EasyJS object containing the sibling elements.

#### Examples
```javascript
// Get all siblings
const siblings = _('#active').side()
siblings.uncls('active')

// Get filtered siblings
const otherTabs = _('.tab.active').side('.tab')
otherTabs.s('opacity', '0.7')

// Use in navigation
_('.menu-item').click(function() {
  _(this).side().uncls('active')
  _(this).cls('active')
})

// Get siblings with specific class
const activeSiblings = _('#item').side('.highlight')
```

### `.first()` - First Element
Reduces the selection to the first element.

#### Syntax
```javascript
_(selector).first()
```

#### Return Value
Returns an EasyJS object containing only the first element.

#### Examples
```javascript
// Get first element
const firstBox = _('.box').first()
firstBox.cls('first')

// Use with chaining
_('.item').first().s('font-weight', 'bold')

// Get first element's content
const firstTitle = _('.title').first().t()

// Use in navigation
_('.carousel-item').first().cls('active')
```

### `.last()` - Last Element
Reduces the selection to the last element.

#### Syntax
```javascript
_(selector).last()
```

#### Return Value
Returns an EasyJS object containing only the last element.

#### Examples
```javascript
// Get last element
const lastBox = _('.box').last()
lastBox.cls('last')

// Use with chaining
_('.item').last().s('margin-bottom', '0')

// Get last element's content
const lastMessage = _('.message').last().t()

// Use in forms
_('.error').last().focus()
```

---

## Event Handling {#event-handling}

### `.on()` - Add Event Listener
Attaches event handlers to selected elements.

#### Syntax
```javascript
_(selector).on(event, handler)
_(selector).on(event, childSelector, handler)
```

#### Parameters
- `event` (String): Event name (click, hover, focus, etc.)
- `childSelector` (String, optional): CSS selector for event delegation
- `handler` (Function): Function to execute when event occurs

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Direct event binding
_('#button').on('click', function() {
  console.log('Button clicked')
})

// Event delegation
_('#container').on('click', '.item', function() {
  _(this).tgl('selected')
})

// Multiple events
_('#element').on('mouseenter mouseleave', function(e) {
  if (e.type === 'mouseenter') {
    _(this).cls('hover')
  } else {
    _(this).uncls('hover')
  }
})

// With event data
_('#button').on('click', {name: 'John'}, function(e) {
  console.log('Hello', e.data.name)
})

// Custom events
_('#element').on('customEvent', function() {
  console.log('Custom event triggered')
})
```

### `.off()` - Remove Event Listener
Removes event handlers from selected elements.

#### Syntax
```javascript
_(selector).off(event, handler)
```

#### Parameters
- `event` (String): Event name
- `handler` (Function): Function to remove

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Remove specific handler
const handler = function() { console.log('Clicked') }
_('#button').on('click', handler)
_('#button').off('click', handler)

// Remove all click handlers
_('#button').off('click')

// Remove multiple event handlers
_('#element').off('click mouseover')
```

### `.click()` - Click Event Shortcut
Attaches a click event handler.

#### Syntax
```javascript
_(selector).click(handler)
```

#### Parameters
- `handler` (Function): Function to execute on click

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Simple click handler
_('#button').click(function() {
  console.log('Button clicked')
})

// Toggle on click
_('#toggle').click(function() {
  _('#content').togVis()
})

// Chain with other methods
_('#button').click(function() {
  _(this).cls('clicked')
}).s('cursor', 'pointer')
```

### `.hover()` - Hover Event Shortcut
Attaches mouseenter and mouseleave event handlers.

#### Syntax
```javascript
_(selector).hover(enterHandler, leaveHandler)
```

#### Parameters
- `enterHandler` (Function): Function for mouseenter
- `leaveHandler` (Function): Function for mouseleave

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Hover effects
_('.menu-item').hover(
  function() {
    _(this).cls('hovered')
  },
  function() {
    _(this).uncls('hovered')
  }
)

// Show/hide on hover
_('#trigger').hover(
  function() {
    _('#dropdown').show()
  },
  function() {
    _('#dropdown').hide()
  }
)

// Only enter handler
_('#element').hover(function() {
  console.log('Mouse entered')
})
```

### `.focus()` - Focus Event Shortcut
Attaches a focus event handler.

#### Syntax
```javascript
_(selector).focus(handler)
```

#### Parameters
- `handler` (Function): Function to execute on focus

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Focus handler
_('#input').focus(function() {
  _(this).cls('focused')
})

// Validation on focus
_('#email').focus(function() {
  if (!_(this).at('value')) {
    _(this).cls('error')
  }
})

// Chain with blur
_('#input').focus(function() {
  _('#help').show()
}).blur(function() {
  _('#help').hide()
})
```

---

## Animations {#animations}

### `.fin()` - Fade In
Fades in selected elements over a specified duration.

#### Syntax
```javascript
_(selector).fin(duration, callback)
```

#### Parameters
- `duration` (Number, optional): Animation duration in milliseconds (default: 400)
- `callback` (Function, optional): Function to execute after animation

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Basic fade in
_('#element').fin()

// Custom duration
_('#element').fin(1000)

// With callback
_('#element').fin(500, function() {
  console.log('Fade in complete')
})

// Chain with other methods
_('#element').hide().fin(300).cls('visible')

// Fade in multiple elements
_('.hidden-item').fin(400)

// Sequential animations
_('#first').fin(300, function() {
  _('#second').fin(300)
})
```

### `.fout()` - Fade Out
Fades out selected elements over a specified duration.

#### Syntax
```javascript
_(selector).fout(duration, callback)
```

#### Parameters
- `duration` (Number, optional): Animation duration in milliseconds (default: 400)
- `callback` (Function, optional): Function to execute after animation

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Basic fade out
_('#element').fout()

// Custom duration
_('#element').fout(1000)

// With callback
_('#element').fout(500, function() {
  console.log('Fade out complete')
})

// Chain with other methods
_('#element').fout(300).hide()

// Fade out multiple elements
_('.item').fout(400)

// Sequential animations
_('#first').fout(300, function() {
  _('#second').fout(300)
})
```

### `.sup()` - Slide Up
Slides up (hides vertically) selected elements over a specified duration.

#### Syntax
```javascript
_(selector).sup(duration, callback)
```

#### Parameters
- `duration` (Number, optional): Animation duration in milliseconds (default: 400)
- `callback` (Function, optional): Function to execute after animation

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Basic slide up
_('#element').sup()

// Custom duration
_('#element').sup(1000)

// With callback
_('#element').sup(500, function() {
  console.log('Slide up complete')
})

// Chain with other methods
_('#element').sup(300).hide()

// Slide up multiple elements
_('.panel').sup(400)

// Accordion effect
_('.accordion-header').click(function() {
  const panel = _(this).down('.accordion-panel')
  panel.sup(300)
})
```

### `.sdown()` - Slide Down
Slides down (shows vertically) selected elements over a specified duration.

#### Syntax
```javascript
_(selector).sdown(duration, callback)
```

#### Parameters
- `duration` (Number, optional): Animation duration in milliseconds (default: 400)
- `callback` (Function, optional): Function to execute after animation

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Basic slide down
_('#element').sdown()

// Custom duration
_('#element').sdown(1000)

// With callback
_('#element').sdown(500, function() {
  console.log('Slide down complete')
})

// Chain with other methods
_('#element').hide().sdown(300).show()

// Slide down multiple elements
_('.panel').sdown(400)

// Accordion effect
_('.accordion-header').click(function() {
  const panel = _(this).down('.accordion-panel')
  panel.sdown(300)
})
```

### `.go()` - Custom Animation
Animates CSS properties of selected elements over a specified duration.

#### Syntax
```javascript
_(selector).go(properties, duration, callback)
```

#### Parameters
- `properties` (Object): CSS properties to animate
- `duration` (Number, optional): Animation duration in milliseconds (default: 400)
- `callback` (Function, optional): Function to execute after animation

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Basic animation
_('#element').go({width: '200px'})

// Multiple properties
_('#element').go({
  width: '200px',
  height: '200px',
  opacity: 0.5
})

// Custom duration
_('#element').go({width: '300px'}, 1000)

// With callback
_('#element').go({width: '200px'}, 500, function() {
  console.log('Animation complete')
})

// Chain animations
_('#element')
  .go({width: '200px'}, 300)
  .go({height: '200px'}, 300)
  .go({width: '100px', height: '100px'}, 300)

// Animate multiple elements
_('.box').go({opacity: 0.5}, 400)

// Complex animation
_('#element').go({
  width: '+=50px',
  height: '+=50px',
  backgroundColor: '#ff0000'
}, 600)
```

---

## Form Handling {#form-handling}

### `.val()` - Serialize Form
Converts form data to a JavaScript object.

#### Syntax
```javascript
_(formSelector).val()
```

#### Return Value
Returns an object containing form data.

#### Examples
```javascript
// Serialize entire form
const formData = _('#myForm').val()
console.log(formData)

// Handle form submission
_('#myForm').on('submit', function(e) {
  e.preventDefault()
  const data = _(this).val()
  
  // Send to server
  _.api.post('/submit', data)
    .then(response => console.log('Success:', response))
    .catch(error => console.log('Error:', error))
})

// Get specific field value
const formData = _('#myForm').val()
const email = formData.email

// Handle checkboxes and radio buttons
const data = _('#survey').val()
// Returns: {newsletter: true, gender: 'male', interests: ['music', 'sports']}

// Handle multiple forms
_('.contact-form').each(function() {
  const data = _(this).val()
  console.log('Form data:', data)
})
```

### `.chk()` - Validate Form
Validates form fields based on specified rules.

#### Syntax
```javascript
_(formSelector).chk(rules)
```

#### Parameters
- `rules` (Object): Validation rules for form fields

#### Return Value
Returns `true` if valid, `false` if invalid. Errors stored in `form._validationErrors`.

#### Examples
```javascript
// Basic validation
const isValid = _('#myForm').chk({
  name: 'required',
  email: 'required|email'
})

if (isValid) {
  // Form is valid
  const data = _('#myForm').val()
  console.log('Valid data:', data)
} else {
  // Form has errors
  const errors = _('#myForm')[0]._validationErrors
  console.log('Errors:', errors)
}

// Advanced validation
_('#registrationForm').chk({
  username: 'required|min:3|max:20',
  email: 'required|email',
  password: 'required|min:8',
  confirmPassword: 'required|match:password',
  age: 'required|min:18',
  website: 'url'
})

// Custom validation with error display
_('#myForm').on('submit', function(e) {
  e.preventDefault()
  
  // Clear previous errors
  _('.error').t('')
  
  if (!_(this).chk({
    name: 'required|min:2',
    email: 'required|email'
  })) {
    // Show errors
    const errors = this._validationErrors
    for (const field in errors) {
      _(`#${field}Error`).t(errors[field])
    }
  } else {
    // Submit form
    _(this).val()
    console.log('Form submitted successfully')
  }
})

// Available validation rules:
// required - Field must have a value
// email - Must be valid email format
// min:n - Minimum length of n characters
// max:n - Maximum length of n characters
// url - Must be valid URL format
// number - Must be numeric
// match:field - Must match another field's value
```

### `.reset()` - Reset Form
Resets form fields to their default values.

#### Syntax
```javascript
_(formSelector).reset()
```

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Reset single form
_('#myForm').reset()

// Reset after submission
_('#myForm').on('submit', function(e) {
  e.preventDefault()
  
  if (_(this).chk(rules)) {
    // Submit data
    const data = _(this).val()
    _.api.post('/submit', data)
      .then(() => {
        // Reset form on success
        _(this).reset()
        console.log('Form reset')
      })
  }
})

// Reset button
_('#resetButton').click(() => {
  _('#myForm').reset()
})

// Reset multiple forms
_('.settings-form').reset()
```

---

## Template Rendering {#template-rendering}

### `.tpl()` - Render Template
Renders a template with data, replacing placeholders with actual values.

#### Syntax
```javascript
_(selector).tpl(template, data)
```

#### Parameters
- `template` (String): HTML template with {{placeholder}} syntax
- `data` (Object|Array): Data to populate the template

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Render single item
_('#userCard').tpl(`
  <div class="card">
    <h3>{{name}}</h3>
    <p>{{email}}</p>
  </div>
`, {
  name: 'John Doe',
  email: 'john@example.com'
})

// Render array of items
const users = [
  {name: 'John', email: 'john@example.com'},
  {name: 'Jane', email: 'jane@example.com'},
  {name: 'Bob', email: 'bob@example.com'}
]

_('#userList').tpl(`
  <li>
    <strong>{{name}}</strong> - {{email}}
  </li>
`, users)

// Render with reactive data
const state = _.reactive({items: []})
state.sub('items', function(newItems) {
  _('#itemList').tpl('<div>{{name}}</div>', newItems)
})

// Complex template
_('#productCard').tpl(`
  <div class="product">
    <img src="{{image}}" alt="{{name}}">
    <h3>{{name}}</h3>
    <p class="price">${{price}}</p>
    <p class="description">{{description}}</p>
    <button onclick="addToCart({{id}})">Add to Cart</button>
  </div>
`, product)

// Nested data
_('#comment').tpl(`
  <div class="comment">
    <div class="author">{{user.name}}</div>
    <div class="text">{{content}}</div>
    <div class="date">{{date}}</div>
  </div>
`, comment)

// Conditional rendering (using JavaScript)
const items = data.filter(item => item.active)
_('#activeItems').tpl('<div>{{name}}</div>', items)
```

---

## Element Manipulation {#element-manipulation}

### `.add()` - Append Elements
Adds content to the end of selected elements.

#### Syntax
```javascript
_(selector).add(content)
```

#### Parameters
- `content` (String|Element|EasyJS): Content to append

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Append HTML string
_('#container').add('<div>New content</div>')

// Append element
const newDiv = document.createElement('div')
_('#container').add(newDiv)

// Append EasyJS element
const element = _('<div>Created with EasyJS</div>')
_('#container').add(element)

// Append multiple items
data.items.forEach(item => {
  _('#list').add(`<li>${item.name}</li>`)
})

// Chain with other methods
_('#container').add('<div>New</div>').cls('updated')

// Append form data
_('#log').add(`<div>${new Date()}: Form submitted</div>`)
```

### `.pre()` - Prepend Elements
Adds content to the beginning of selected elements.

#### Syntax
```javascript
_(selector).pre(content)
```

#### Parameters
- `content` (String|Element|EasyJS): Content to prepend

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Prepend HTML string
_('#container').pre('<div>First content</div>')

// Prepend element
const header = document.createElement('header')
_('#container').pre(header)

// Prepend EasyJS element
const element = _('<div>Header</div>')
_('#container').pre(element)

// Add new items to top of list
data.newItems.forEach(item => {
  _('#list').pre(`<li>${item.name}</li>`)
})

// Chain with other methods
_('#container').pre('<div>Header</div>').cls('has-header')

// Prepend timestamp
_('#log').pre(`<div>${new Date()}: Latest event</div>`)
```

### `.del()` - Remove Elements
Removes selected elements from the DOM.

#### Syntax
```javascript
_(selector).del()
```

#### Return Value
Returns the EasyJS object for chaining.

#### Examples
```javascript
// Remove single element
_('#oldElement').del()

// Remove multiple elements
_('.temporary').del()

// Remove on click
_('.delete-button').click(function() {
  _(this).up().del()
})

// Remove after animation
_('#element').fout(300, function() {
  _(this).del()
})

// Conditional removal
if (shouldRemove) {
  _('#element').del()
}

// Remove all children
_('#container').down().del()
```

### `.cln()` - Clone Elements
Creates deep copies of selected elements.

#### Syntax
```javascript
_(selector).cln()
```

#### Return Value
Returns an EasyJS object containing the cloned elements.

#### Examples
```javascript
// Clone element
const original = _('#template')
const clone = original.cln()
clone.at('id', 'copy-' + Date.now())
_('#container').add(clone)

// Clone with modifications
_('.item-template').cln()
  .uncls('item-template')
  .cls('item')
  .down('.title').t('New Item')
  .end()
  .addto('#list')

// Clone multiple elements
const clones = _('.box').cln()
_('#new-container').add(clones)

// Clone and insert after original
_('#element').cln().insertAfter('#element')

// Use in dynamic content creation
function createCard(data) {
  const template = _('#item-template').cln()
  template.unat('id')
  template.down('.title').t(data.title)
  template.down('.description').t(data.description)
  return template
}

// Clone with events (events are not cloned, need to rebind)
const clonedButton = _('#button').cln()
clonedButton.click(function() {
  console.log('Cloned button clicked')
})
```

---

## Reactive State {#reactive-state}

### `_.reactive()` - Create Reactive Object
Creates a reactive object that automatically updates when properties change.

#### Syntax
```javascript
const state = _.reactive(initialObject)
```

#### Parameters
- `initialObject` (Object): Initial state object

#### Return Value
Returns a reactive object with subscription capabilities.

#### Examples
```javascript
// Create reactive state
const state = _.reactive({
  count: 0,
  name: 'John',
  items: []
})

// Subscribe to changes
state.sub('count', function(newValue) {
  _('#counter').t(newValue)
})

state.sub('name', function(newValue) {
  _('#name').t(newValue)
})

// Update state (triggers subscriptions)
state.count = 10
state.name = 'Jane'

// Subscribe to array changes
state.sub('items', function(newItems) {
  _('#itemList').tpl('<li>{{name}}</li>', newItems)
})

// Add item to array
state.items.push({name: 'New Item'})
state.items = [...state.items] // Trigger update

// Complex reactive state
const appState = _.reactive({
  user: null,
  theme: 'light',
  notifications: [],
  loading: false
})

// Multiple subscriptions
appState.sub('theme', function(theme) {
  _('body')
    .uncls('light-theme dark-theme')
    .cls(theme + '-theme')
})

appState.sub('loading', function(isLoading) {
  if (isLoading) {
    _('#loader').show()
  } else {
    _('#loader').hide()
  }
})

// Computed properties
const fullName = _.reactive({first: 'John', last: 'Doe'})
fullName.sub('first', updateFullName)
fullName.sub('last', updateFullName)

function updateFullName() {
  _('#fullName').t(`${fullName.first} ${fullName.last}`)
}
```

### `.sub()` - Subscribe to Changes
Subscribes to changes in reactive object properties.

#### Syntax
```javascript
reactiveObject.sub(propertyName, callback)
```

#### Parameters
- `propertyName` (String): Property to watch
- `callback` (Function): Function to execute when property changes

#### Return Value
Returns an unsubscribe function.

#### Examples
```javascript
// Subscribe with automatic cleanup
const state = _.reactive({count: 0})

const unsubscribe = state.sub('count', function(newValue) {
  console.log('Count changed to:', newValue)
})

// Update state
state.count = 1 // Logs: "Count changed to: 1"

// Unsubscribe
unsubscribe()
state.count = 2 // No longer logs

// Multiple subscriptions
state.sub('count', updateCounter)
state.sub('name', updateName)
state.sub('items', updateItems)

// Subscribe with immediate execution
function subWithImmediate(obj, prop, callback) {
  callback(obj[prop]) // Call immediately
  return obj.sub(prop, callback) // Then subscribe
}

subWithImmediate(state, 'count', function(value) {
  _('#counter').t(value)
})

// Subscribe to nested changes
const user = _.reactive({
  profile: {
    name: 'John',
    email: 'john@example.com'
  }
})

// Need to subscribe to specific path
user.sub('profile', function(newProfile) {
  _('#name').t(newProfile.name)
  _('#email').t(newProfile.email)
})
```

---

## Storage Utilities {#storage-utilities}

### `_.store.set()` - Store Data
Saves data to localStorage with automatic JSON serialization.

#### Syntax
```javascript
_.store.set(key, value)
```

#### Parameters
- `key` (String): Storage key
- `value` (Any): Value to store (objects are automatically JSON serialized)

#### Examples
```javascript
// Store string
_.store.set('username', 'john_doe')

// Store object
_.store.set('user', {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
})

// Store array
_.store.set('recentSearches', [
  'javascript',
  'react',
  'easyjs'
])

// Store number
_.store.set('visitCount', 5)

// Store boolean
_.store.set('isLoggedIn', true)

// Store complex data
_.store.set('appState', {
  user: {id: 1, name: 'John'},
  preferences: {theme: 'dark', language: 'en'},
  lastLogin: new Date().toISOString()
})
```

### `_.store.get()` - Retrieve Data
Retrieves data from localStorage with automatic JSON parsing.

#### Syntax
```javascript
_.store.get(key)
```

#### Parameters
- `key` (String): Storage key

#### Return Value
Returns the stored value or `null` if not found.

#### Examples
```javascript
// Get string
const username = _.store.get('username')
console.log(username) // 'john_doe'

// Get object
const user = _.store.get('user')
console.log(user.name) // 'John Doe'

// Get array
const searches = _.store.get('recentSearches')
console.log(searches[0]) // 'javascript'

// Get with default value
const theme = _.store.get('theme') || 'light'

// Check if exists
const hasData = _.store.get('user') !== null

// Get and use immediately
const user = _.store.get('user')
if (user) {
  _('#welcome').t(`Welcome back, ${user.name}!`)
}

// Get complex data
const appState = _.store.get('appState')
if (appState && appState.user) {
  console.log('User logged in:', appState.user.name)
}
```

### `_.store.del()` - Delete Data
Removes data from localStorage.

#### Syntax
```javascript
_.store.del(key)
```

#### Parameters
- `key` (String): Storage key to delete

#### Examples
```javascript
// Delete single item
_.store.del('username')

// Delete user session
_.store.del('user')
_.store.del('authToken')

// Clear cache
_.store.del('cachedData')

// Delete on logout
function logout() {
  _.store.del('user')
  _.store.del('authToken')
  _.store.del('permissions')
  window.location.href = '/login'
}

// Delete multiple items
['tempData', 'cache', 'lastSearch'].forEach(key => {
  _.store.del(key)
})

// Conditional deletion
const user = _.store.get('user')
if (user && user.id === 1) {
  _.store.del('adminSettings')
}
```

---

## API Integration {#api-integration}

### `_.api.get()` - GET Request
Sends an HTTP GET request to the specified URL.

#### Syntax
```javascript
_.api.get(url, options)
```

#### Parameters
- `url` (String): Request URL
- `options` (Object, optional): Configuration options

#### Return Value
Returns a Promise that resolves with the response data.

#### Examples
```javascript
// Basic GET request
_.api.get('/api/users')
  .then(users => console.log(users))
  .catch(error => console.error(error))

// With options
_.api.get('/api/users', {
  headers: {'Authorization': 'Bearer token123'},
  timeout: 10000,
  loader: '#loader'
})
  .then(data => {
    _('#userList').tpl('<li>{{name}}</li>', data)
  })

// Query parameters
_.api.get('/api/search?q=javascript&limit=10')
  .then(results => {
    _('#results').tpl('<div>{{title}}</div>', results)
  })

// Error handling
_.api.get('/api/data')
  .then(data => {
    console.log('Success:', data)
  })
  .catch(error => {
    _('#error').t(`Error: ${error.message}`)
    _('#error').show()
  })

// Chain with DOM manipulation
_('#loadData').click(() => {
  _.api.get('/api/data')
    .then(data => _('#content').tpl('<div>{{name}}</div>', data))
    .catch(() => _('#content').t('Failed to load data'))
})
```

### `_.api.post()` - POST Request
Sends an HTTP POST request to the specified URL.

#### Syntax
```javascript
_.api.post(url, data, options)
```

#### Parameters
- `url` (String): Request URL
- `data` (Object): Data to send
- `options` (Object, optional): Configuration options

#### Return Value
Returns a Promise that resolves with the response data.

#### Examples
```javascript
// Basic POST request
_.api.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
})
  .then(response => console.log('User created:', response))
  .catch(error => console.error(error))

// Form submission
_('#myForm').on('submit', function(e) {
  e.preventDefault()
  
  const formData = _(this).val()
  
  _.api.post('/api/submit', formData, {
    loader: '#loader',
    headers: {'X-CSRF-Token': 'token123'}
  })
    .then(response => {
      _('#success').t('Form submitted successfully!')
      _(this).reset()
    })
    .catch(error => {
      _('#error').t(`Submission failed: ${error.message}`)
    })
})

// File upload (FormData)
const formData = new FormData()
formData.append('file', fileInput.files[0])

_.api.post('/api/upload', formData, {
  headers: {'Content-Type': 'multipart/form-data'}
})
  .then(response => console.log('Upload complete'))

// JSON with custom headers
_.api.post('/api/data', {key: 'value'}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  }
})
```

### `_.api.put()` - PUT Request
Sends an HTTP PUT request to update data at the specified URL.

#### Syntax
```javascript
_.api.put(url, data, options)
```

#### Parameters
- `url` (String): Request URL
- `data` (Object): Data to update
- `options` (Object, optional): Configuration options

#### Return Value
Returns a Promise that resolves with the response data.

#### Examples
```javascript
// Update user
_.api.put('/api/users/1', {
  name: 'Jane Doe',
  email: 'jane@example.com'
})
  .then(response => console.log('User updated:', response))

// Update settings
_('#saveSettings').click(() => {
  const settings = _('#settingsForm').val()
  
  _.api.put('/api/settings', settings)
    .then(() => {
      _('#message').t('Settings saved!')
      _('#message').show().fout(3000)
    })
    .catch(error => {
      _('#message').t(`Error: ${error.message}`)
    })
})

// Partial update
_.api.put('/api/posts/123', {
  title: 'New Title',
  content: 'Updated content'
})
```

### `_.api.del()` - DELETE Request
Sends an HTTP DELETE request to the specified URL.

#### Syntax
```javascript
_.api.del(url, options)
```

#### Parameters
- `url` (String): Request URL
- `options` (Object, optional): Configuration options

#### Return Value
Returns a Promise that resolves with the response data.

#### Examples
```javascript
// Delete user
_.api.del('/api/users/123')
  .then(() => console.log('User deleted'))

// Delete with confirmation
_('.delete-button').click(function() {
  if (confirm('Are you sure?')) {
    const id = _(this).at('data-id')
    
    _.api.del(`/api/items/${id}`)
      .then(() => {
        _(this).up().del()
      })
      .catch(error => {
        alert('Delete failed: ' + error.message)
      })
  }
})

// Clear data
_('#clearData').click(() => {
  _.api.del('/api/cache')
    .then(() => {
      _('#status').t('Cache cleared')
    })
})
```

### `_.api.req()` - General Request
Sends a custom HTTP request with full configuration.

#### Syntax
```javascript
_.api.req(config)
```

#### Parameters
- `config` (Object): Request configuration

#### Return Value
Returns a Promise that resolves with the response data.

#### Examples
```javascript
// Custom request
_.api.req({
  url: '/api/data',
  method: 'PATCH',
  data: {field: 'value'},
  headers: {'Custom-Header': 'value'},
  timeout: 5000,
  loader: '#loader'
})
  .then(response => console.log(response))

// Multiple requests
Promise.all([
  _.api.get('/api/users'),
  _.api.get('/api/posts'),
  _.api.get('/api/comments')
])
  .then(([users, posts, comments]) => {
    console.log('All data loaded')
  })

// Request with progress
_.api.req({
  url: '/api/upload',
  method: 'POST',
  data: formData,
  onProgress: function(progress) {
    _('#progress').s('width', progress + '%')
  }
})
```

---

## Utility Functions {#utility-functions}

### `_.wait()` - Debounce Function
Creates a debounced function that delays execution until after wait time.

#### Syntax
```javascript
_.wait(func, delay)
```

#### Parameters
- `func` (Function): Function to debounce
- `delay` (Number): Delay in milliseconds

#### Return Value
Returns a debounced function.

#### Examples
```javascript
// Debounced search
_('#search').on('input', _.wait(function() {
  const query = _(this).at('value')
  _.api.get(`/api/search?q=${query}`)
    .then(results => _('#results').tpl('<div>{{name}}</div>', results))
}, 300))

// Debounced resize handler
window.addEventListener('resize', _.wait(function() {
  console.log('Window resized')
}, 250))

// Debounced save
_('#autoSave').on('input', _.wait(function() {
  const content = _(this).val()
  _.api.post('/api/save', {content})
}, 1000))

// Debounced API calls
const debouncedApi = _.wait(_.api.get, 500)
debouncedApi('/api/data')
```

### `_.flow()` - Throttle Function
Creates a throttled function that limits execution to once per time period.

#### Syntax
```javascript
_.flow(func, limit)
```

#### Parameters
- `func` (Function): Function to throttle
- `limit` (Number): Time limit in milliseconds

#### Return Value
Returns a throttled function.

#### Examples
```javascript
// Throttled scroll handler
window.addEventListener('scroll', _.flow(function() {
  const scrollTop = window.pageYOffset
  if (scrollTop > 100) {
    _('#header').cls('scrolled')
  } else {
    _('#header').uncls('scrolled')
  }
}, 100))

// Throttled mouse move
_('#canvas').on('mousemove', _.flow(function(e) {
  const x = e.offsetX
  const y = e.offsetY
  // Update position
}, 16)) // ~60fps

// Throttled button clicks
_('#rapidButton').on('click', _.flow(function() {
  console.log('Button clicked')
}, 1000))

// Throttled API calls
const throttledApi = _.flow(_.api.get, 2000)
throttledApi('/api/updates')
```

---

## Advanced Examples {#advanced-examples}

### Complete Todo Application
```javascript
// State
const state = _.reactive({
  todos: [],
  filter: 'all',
  loading: false
})

// Load todos from API
function loadTodos() {
  state.loading = true
  _.api.get('/api/todos')
    .then(todos => {
      state.todos = todos
      state.loading = false
    })
    .catch(error => {
      console.error('Failed to load todos:', error)
      state.loading = false
    })
}

// Subscribe to state changes
state.sub('todos', function(todos) {
  const filtered = todos.filter(todo => {
    if (state.filter === 'active') return !todo.completed
    if (state.filter === 'completed') return todo.completed
    return true
  })
  
  _('#todoList').tpl(`
    <li class="todo {{completed}}">
      <input type="checkbox" {{checked}} data-id="{{id}}">
      <span>{{text}}</span>
      <button class="delete" data-id="{{id}}">×</button>
    </li>
  `, filtered.map(todo => ({
    ...todo,
    completed: todo.completed ? 'completed' : '',
    checked: todo.completed ? 'checked' : ''
  })))
})

state.sub('loading', function(isLoading) {
  if (isLoading) {
    _('#loader').show()
  } else {
    _('#loader').hide()
  }
})

// Event handlers
_('#addTodo').on('submit', function(e) {
  e.preventDefault()
  const text = _('#todoInput').val().text
  
  if (text.trim()) {
    _.api.post('/api/todos', {text, completed: false})
      .then(todo => {
        state.todos = [...state.todos, todo]
        _('#todoInput').val('')
      })
  }
})

_('#todoList').on('change', 'input[type="checkbox"]', function() {
  const id = parseInt(_(this).at('data-id'))
  const completed = _(this).at('checked')
  
  _.api.put(`/api/todos/${id}`, {completed})
    .then(() => {
      state.todos = state.todos.map(todo =>
        todo.id === id ? {...todo, completed} : todo
      )
    })
})

_('#todoList').on('click', '.delete', function() {
  const id = parseInt(_(this).at('data-id'))
  
  _.api.del(`/api/todos/${id}`)
    .then(() => {
      state.todos = state.todos.filter(todo => todo.id !== id)
    })
})

_('#filters').on('click', 'button', function() {
  state.filter = _(this).at('data-filter')
  _('#filters button').uncls('active')
  _(this).cls('active')
})

// Initialize
loadTodos()
```

### Real-time Chat Application
```javascript
// Chat state
const chatState = _.reactive({
  messages: [],
  users: [],
  currentUser: null,
  isConnected: false
})

// WebSocket connection
const socket = new WebSocket('wss://chat.example.com')

socket.onopen = () => {
  chatState.isConnected = true
  _('#status').t('Connected').cls('connected')
}

socket.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  switch (message.type) {
    case 'message':
      chatState.messages = [...chatState.messages, message.data]
      break
    case 'userList':
      chatState.users = message.data
      break
  }
}

socket.onclose = () => {
  chatState.isConnected = false
  _('#status').t('Disconnected').uncls('connected')
}

// Subscribe to state changes
chatState.sub('messages', function(messages) {
  const container = _('#messages')
  const shouldScroll = container[0].scrollTop + container[0].clientHeight >= container[0].scrollHeight - 50
  
  _('#messages').tpl(`
    <div class="message {{type}}">
      <strong>{{user}}:</strong> {{text}}
      <span class="time">{{time}}</span>
    </div>
  `, messages)
  
  if (shouldScroll) {
    container[0].scrollTop = container[0].scrollHeight
  }
})

chatState.sub('users', function(users) {
  _('#users').tpl('<div class="user">{{name}}</div>', users)
})

chatState.sub('isConnected', function(connected) {
  _('#messageInput').at('disabled', !connected)
  _('#sendButton').at('disabled', !connected)
})

// Send message
_('#messageForm').on('submit', function(e) {
  e.preventDefault()
  
  const input = _('#messageInput')
  const text = input.val().trim()
  
  if (text && chatState.isConnected) {
    socket.send(JSON.stringify({
      type: 'message',
      text: text
    }))
    
    input.val('')
  }
})

// Typing indicator
let typingTimeout
_('#messageInput').on('input', _.wait(function() {
  if (chatState.isConnected) {
    socket.send(JSON.stringify({type: 'typing'}))
  }
}, 500))
```

---

## Best Practices {#best-practices}

### 1. **Cache Selectors**
```javascript
// Good
const $container = _('#container')
const $items = $container.down('.item')

// Avoid
_('#container').cls('active')
_('#container').s('color', 'red')
_('#container').add('<div>New</div>')
```

### 2. **Use Method Chaining**
```javascript
// Good
_('#element')
  .cls('active')
  .s('color', 'red')
  .show()
  .fin(300)

// Avoid
_('#element').cls('active')
_('#element').s('color', 'red')
_('#element').show()
_('#element').fin(300)
```

### 3. **Event Delegation for Dynamic Content**
```javascript
// Good
_('#container').on('click', '.item', function() {
  _(this).tgl('selected')
})

// Avoid
_('.item').each(function() {
  _(this).on('click', function() {
    _(this).tgl('selected')
  })
})
```

### 4. **Use Reactive State for Complex Applications**
```javascript
// Good
const state = _.reactive({count: 0})
state.sub('count', value => _('#counter').t(value))

// Avoid
_('#increment').click(() => {
  const count = parseInt(_('#counter').t()) + 1
  _('#counter').t(count)
})
```

### 5. **Handle Errors Gracefully**
```javascript
// Good
_.api.get('/api/data')
  .then(data => _('#content').tpl(template, data))
  .catch(error => {
    console.error('API Error:', error)
    _('#content').t('Failed to load data')
  })

// Avoid
_.api.get('/api/data')
  .then(data => _('#content').tpl(template, data))
```

### 6. **Use Debounce/Throttle for Performance**
```javascript
// Good
_('#search').on('input', _.wait(handleSearch, 300))
window.addEventListener('scroll', _.flow(handleScroll, 100))

// Avoid
_('#search').on('input', handleSearch)
window.addEventListener('scroll', handleScroll)
```

### 7. **Clean Up Event Listeners**
```javascript
// Good
const unsubscribe = state.sub('data', handler)
// Later when done:
unsubscribe()

// Avoid
state.sub('data', handler) // No way to unsubscribe
```

This comprehensive documentation covers all EasyJS features with practical examples and best practices for building modern web applications.