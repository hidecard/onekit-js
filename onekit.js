/**
 * OneKit - A lightweight, modern JavaScript library for DOM manipulation,
 * animations, reactive state, and API integration.
 *
 * Version: 6.0.0
 * Author: OneKit Team
 */

(function(global) {
  'use strict';

  // Core OneKit function
  function ok(selector) {
    return new OneKit(selector);
  }

  // Module registry for tree-shaking support
  const modules = {};
  
  // Register a module
  ok.module = function(name, factory) {
    modules[name] = factory;
  };

  // OneKit class with intuitive compact syntax
  class OneKit {
    constructor(selector) {
      this.elements = [];
      
      if (!selector) {
        return this;
      }

      // Handle DOM elements
      if (selector.nodeType) {
        this.elements.push(selector);
        return this;
      }

      // Handle HTML strings
      if (typeof selector === 'string') {
        if (selector.charAt(0) === '<' && selector.charAt(selector.length - 1) === '>') {
          const div = document.createElement('div');
          div.innerHTML = selector;
          for (let i = 0; i < div.childNodes.length; i++) {
            this.elements.push(div.childNodes[i]);
          }
          return this;
        }

        // Handle CSS selectors
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          this.elements.push(elements[i]);
        }
        return this;
      }

      // Handle arrays or OneKit objects
      if (selector.length !== undefined) {
        for (let i = 0; i < selector.length; i++) {
          this.elements.push(selector[i]);
        }
        return this;
      }

      return this;
    }

    // Get the first element
    first() {
      if (this.elements.length > 0) {
        return new OneKit(this.elements[0]);
      }
      return new OneKit();
    }

    // Get the last element
    last() {
      if (this.elements.length > 0) {
        return new OneKit(this.elements[this.elements.length - 1]);
      }
      return new OneKit();
    }

    // Iterate over elements
    each(callback) {
      for (let i = 0; i < this.elements.length; i++) {
        callback.call(this.elements[i], i, this.elements[i]);
      }
      return this;
    }

    // Find descendant elements
    find(selector) {
      const elements = [];
      this.each(function() {
        const found = this.querySelectorAll(selector);
        for (let i = 0; i < found.length; i++) {
          elements.push(found[i]);
        }
      });
      return new OneKit(elements);
    }

    // Add class to elements
    class(className) {
      return this.each(function() {
        if (this.classList) {
          this.classList.add(className);
        } else {
          this.className += ' ' + className;
        }
      });
    }

    // Remove class from elements
    unclass(className) {
      return this.each(function() {
        if (this.classList) {
          this.classList.remove(className);
        } else {
          this.className = this.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
      });
    }

    // Toggle class on elements
    toggleClass(className) {
      return this.each(function() {
        if (this.classList) {
          this.classList.toggle(className);
        } else {
          const classes = this.className.split(' ');
          const existingIndex = classes.indexOf(className);

          if (existingIndex >= 0) {
            classes.splice(existingIndex, 1);
          } else {
            classes.push(className);
          }
          this.className = classes.join(' ');
        }
      });
    }

    // Get or set HTML content
    html(content) {
      if (content === undefined) {
        return this.elements.length > 0 ? this.elements[0].innerHTML : null;
      }
      return this.each(function() {
        this.innerHTML = content;
      });
    }

    // Get or set text content
    text(content) {
      if (content === undefined) {
        return this.elements.length > 0 ? this.elements[0].textContent : null;
      }
      return this.each(function() {
        this.textContent = content;
      });
    }

    // Get or set attribute
    attr(name, value) {
      if (typeof name === 'object') {
        return this.each(function() {
          for (const key in name) {
            this.setAttribute(key, name[key]);
          }
        });
      }

      if (value === undefined) {
        return this.elements.length > 0 ? this.elements[0].getAttribute(name) : null;
      }
      return this.each(function() {
        this.setAttribute(name, value);
      });
    }

    // Remove attribute
    unattr(name) {
      return this.each(function() {
        this.removeAttribute(name);
      });
    }

    // Get or set CSS properties
    css(prop, value) {
      if (typeof prop === 'object') {
        return this.each(function() {
          for (const key in prop) {
            this.style[key] = prop[key];
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
      return this.each(function() {
        this.style[prop] = value;
      });
    }

    // Show elements
    show() {
      return this.each(function() {
        this.style.display = '';
      });
    }

    // Hide elements
    hide() {
      return this.each(function() {
        this.style.display = 'none';
      });
    }

    // Toggle visibility
    toggle() {
      return this.each(function() {
        this.style.display = this.style.display === 'none' ? '' : 'none';
      });
    }

    // Clone elements
    clone() {
      const elements = [];
      this.each(function() {
        elements.push(this.cloneNode(true));
      });
      return new OneKit(elements);
    }

    // Get parent element
    parent() {
      if (this.elements.length > 0) {
        return new OneKit(this.elements[0].parentNode);
      }
      return new OneKit();
    }

    // Get children elements
    kids(selector) {
      const elements = [];
      this.each(function() {
        const children = selector ?
          this.querySelectorAll(selector) :
          this.children;

        for (let i = 0; i < children.length; i++) {
          elements.push(children[i]);
        }
      });
      return new OneKit(elements);
    }

    // Get sibling elements
    sibs(selector) {
      const elements = [];
      this.each(function() {
        const siblings = this.parentNode.children;
        
        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i] !== this && (!selector || siblings[i].matches(selector))) {
            elements.push(siblings[i]);
          }
        }
      });
      return new OneKit(elements);
    }

    // Append elements
    append(content) {
      return this.each(function() {
        if (typeof content === 'string') {
          this.insertAdjacentHTML('beforeend', content);
        } else if (content.nodeType) {
          this.appendChild(content);
        } else if (content.elements) {
          for (let i = 0; i < content.elements.length; i++) {
            this.appendChild(content.elements[i]);
          }
        }
      });
    }

    // Prepend elements
    prepend(content) {
      return this.each(function() {
        if (typeof content === 'string') {
          this.insertAdjacentHTML('afterbegin', content);
        } else if (content.nodeType) {
          this.insertBefore(content, this.firstChild);
        } else if (content.elements) {
          for (let i = content.elements.length - 1; i >= 0; i--) {
            this.insertBefore(content.elements[i], this.firstChild);
          }
        }
      });
    }

    // Remove elements
    remove() {
      return this.each(function() {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      });
    }

    // Add event listener
    on(event, selector, handler) {
      if (typeof selector === 'function') {
        handler = selector;
        selector = null;
      }

      return this.each(function() {
        if (selector) {
          // Event delegation
          this.addEventListener(event, function(e) {
            if (e.target.matches(selector)) {
              handler.call(e.target, e);
            }
          });
        } else {
          // Direct event binding
          this.addEventListener(event, handler);
        }
      });
    }

    // Remove event listener
    off(event, handler) {
      return this.each(function() {
        this.removeEventListener(event, handler);
      });
    }

    // Click event shortcut
    click(handler) {
      return this.on('click', handler);
    }

    // Hover event shortcut
    hover(enterHandler, leaveHandler) {
      return this.on('mouseenter', enterHandler).on('mouseleave', leaveHandler);
    }

    // Focus event shortcut
    focus(handler) {
      return this.on('focus', handler);
    }

    // Fade in animation
    fade_in(duration, callback) {
      duration = duration || 400;
      return this.each(function() {
        const element = this;
        element.style.opacity = 0;
        element.style.display = '';
        
        const start = performance.now();
        
        function animate(time) {
          const timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;
          
          element.style.opacity = timeFraction;
          
          if (timeFraction < 1) {
            requestAnimationFrame(animate);
          } else if (callback) {
            callback.call(element);
          }
        }
        
        requestAnimationFrame(animate);
      });
    }

    // Fade out animation
    fade_out(duration, callback) {
      duration = duration || 400;
      return this.each(function() {
        const element = this;
        const startOpacity = parseFloat(window.getComputedStyle(element).opacity);
        
        const start = performance.now();
        
        function animate(time) {
          const timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;
          
          element.style.opacity = startOpacity * (1 - timeFraction);
          
          if (timeFraction < 1) {
            requestAnimationFrame(animate);
          } else {
            element.style.display = 'none';
            if (callback) callback.call(element);
          }
        }
        
        requestAnimationFrame(animate);
      });
    }

    // Slide up animation
    slide_up(duration, callback) {
      duration = duration || 400;
      return this.each(function() {
        const element = this;
        const height = element.scrollHeight;
        
        element.style.height = height + 'px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.height = '0px';
        
        setTimeout(() => {
          element.style.display = 'none';
          element.style.height = '';
          element.style.overflow = '';
          element.style.transition = '';
          if (callback) callback.call(element);
        }, duration);
      });
    }

    // Slide down animation
    slide_down(duration, callback) {
      duration = duration || 400;
      return this.each(function() {
        const element = this;
        
        element.style.display = '';
        const height = element.scrollHeight;
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.height = height + 'px';
        
        setTimeout(() => {
          element.style.height = '';
          element.style.overflow = '';
          element.style.transition = '';
          if (callback) callback.call(element);
        }, duration);
      });
    }

    // Custom animation
    animate(props, duration, callback) {
      duration = duration || 400;
      return this.each(function() {
        const element = this;
        const startValues = {};
        const changeValues = {};
        
        // Get initial values
        for (const prop in props) {
          const value = parseFloat(window.getComputedStyle(element)[prop]) || 0;
          startValues[prop] = value;
          changeValues[prop] = parseFloat(props[prop]) - value;
        }
        
        const start = performance.now();
        
        function animate(time) {
          const timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;
          
          for (const prop in props) {
            element.style[prop] = startValues[prop] + changeValues[prop] * timeFraction + 
              (typeof props[prop] === 'string' && props[prop].includes('px') ? 'px' : '');
          }
          
          if (timeFraction < 1) {
            requestAnimationFrame(animate);
          } else if (callback) {
            callback.call(element);
          }
        }
        
        requestAnimationFrame(animate);
      });
    }

    // Serialize form data
    form_data() {
      if (this.elements.length === 0) return {};
      
      const form = this.elements[0];
      if (form.tagName !== 'FORM') return {};
      
      const data = {};
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        if (input.name && !input.disabled) {
          if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) {
              if (data[input.name] === undefined) {
                data[input.name] = input.value;
              } else if (Array.isArray(data[input.name])) {
                data[input.name].push(input.value);
              } else {
                data[input.name] = [data[input.name], input.value];
              }
            }
          } else if (input.type !== 'file') {
            data[input.name] = input.value;
          }
        }
      });
      
      return data;
    }

    // Reset form
    reset() {
      return this.each(function() {
        if (this.tagName === 'FORM') {
          this.reset();
        }
      });
    }

    // Validate form
    validateForm(rules, options = {}) {
      const {
        errorClass = 'error',
        errorElement = 'span',
        errorContainer = null,
        showError = true,
        hideError = true
      } = options;
      
      const formEl = this.elements[0];
      if (!formEl || formEl.tagName !== 'FORM') return false;
      
      const errors = {};
      let isValid = true;
      
      // Clear previous errors
      if (hideError) {
        formEl.querySelectorAll(`.${errorClass}`).forEach(el => {
          el.classList.remove(errorClass);
        });
        
        formEl.querySelectorAll(`${errorElement}.${errorClass}-message`).forEach(el => {
          el.remove();
        });
      }
      
      // Validate each field
      for (const field in rules) {
        const input = formEl.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        const value = input.value.trim();
        const fieldRules = rules[field].split('|');
        let fieldErrors = [];
        
        for (const rule of fieldRules) {
          if (rule === 'required' && !value) {
            fieldErrors.push(`${field} is required`);
            continue;
          }
          
          if (rule === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            fieldErrors.push(`${field} must be a valid email`);
            continue;
          }
          
          if (rule.startsWith('min:')) {
            const min = parseInt(rule.split(':')[1]);
            if (value.length < min) {
              fieldErrors.push(`${field} must be at least ${min} characters`);
              continue;
            }
          }
          
          if (rule.startsWith('max:')) {
            const max = parseInt(rule.split(':')[1]);
            if (value.length > max) {
              fieldErrors.push(`${field} must be at most ${max} characters`);
              continue;
            }
          }
          
          if (rule.startsWith('match:')) {
            const matchField = rule.split(':')[1];
            const matchInput = formEl.querySelector(`[name="${matchField}"]`);
            if (matchInput && value !== matchInput.value.trim()) {
              fieldErrors.push(`${field} must match ${matchField}`);
              continue;
            }
          }
        }
        
        if (fieldErrors.length) {
          errors[field] = fieldErrors;
          isValid = false;
          
          // Show errors
          if (showError) {
            input.classList.add(errorClass);
            
            fieldErrors.forEach(error => {
              const errorEl = document.createElement(errorElement);
              errorEl.className = `${errorClass}-message`;
              errorEl.textContent = error;
              
              if (errorContainer) {
                const container = input.closest(errorContainer);
                if (container) {
                  container.appendChild(errorEl);
                }
              } else {
                input.parentNode.insertBefore(errorEl, input.nextSibling);
              }
            });
          }
        }
      }
      
      // Store errors on the form element
      formEl._validationErrors = errors;
      
      return isValid;
    }

    // Apply input mask
    applyMask(maskName) {
      const mask = ok.form.masks[maskName];
      if (!mask) return this;
      
      return this.each(function() {
        const el = this;
        if (el.tagName !== 'INPUT') return;
        
        // Format on input
        el.addEventListener('input', function() {
          const formattedValue = mask.format(this.value);
          this.value = formattedValue;
        });
        
        // Set placeholder
        if (mask.pattern) {
          el.placeholder = mask.pattern;
        }
      });
    }

    // Enable gestures
    gesture() {
      return this.each(function() {
        ok.gesture.addGestures(this);
      });
    }

    // Check if element is visible
    isVisible() {
      if (this.elements.length === 0) return false;
      const el = this.elements[0];
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    // Check if element is in viewport
    inViewport(threshold = 0) {
      if (this.elements.length === 0) return false;
      const el = this.elements[0];
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      
      const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
      const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);
      
      return vertInView && horInView;
    }

    // Get element dimensions
    getDimensions() {
      if (this.elements.length === 0) return { width: 0, height: 0 };
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

    // Announce to screen readers
    announce(message, priority = 'polite') {
      if (this.elements.length > 0) {
        ok.a11y.announce(message, priority);
      }
      return this;
    }

    // Trap focus
    trapFocus() {
      return this.each(function() {
        ok.a11y.trapFocus(this);
      });
    }

    // Remove focus trap
    removeFocusTrap() {
      return this.each(function() {
        ok.a11y.removeFocusTrap(this);
      });
    }

    // Debug: log element to console
    log() {
      if (this.elements.length > 0) {
        console.log(this.elements[0]);
      }
      return this;
    }

    // Debug: info about element
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

  // ==================== MODULES ====================

  // Component System Module
  ok.module('component', function() {
    const components = {};
    const componentInstances = new Map();
    
    function register(name, definition) {
      components[name] = definition;
    }
    
    function create(name, props = {}) {
      if (!components[name]) {
        console.error(`Component "${name}" not found`);
        return null;
      }
      
      const definition = components[name];
      const instance = {
        name,
        props,
        state: definition.data ? JSON.parse(JSON.stringify(definition.data)) : {},
        element: null,
        mounted: false,
        listeners: []
      };
      
      // Add methods
      if (definition.methods) {
        Object.keys(definition.methods).forEach(method => {
          instance[method] = function(...args) {
            return definition.methods[method].call(instance, ...args);
          };
        });
      }
      
      // Create element
      if (definition.template) {
        const html = definition.template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return instance.state[key] !== undefined ? instance.state[key] : '';
        });
        instance.element = ok(html).first().elements[0];
      } else if (definition.render) {
        const html = definition.render.call(instance);
        instance.element = ok(html).first().elements[0];
      }
      
      // Add lifecycle hooks
      if (definition.created) {
        definition.created.call(instance);
      }
      
      // Store instance
      componentInstances.set(instance.element, instance);
      
      return instance;
    }
    
    function mount(component, target) {
      if (typeof component === 'string') {
        component = create(component);
      }
      
      if (!component || !component.element) {
        console.error('Invalid component');
        return;
      }
      
      const targetElement = ok(target).first().elements[0];
      if (!targetElement) {
        console.error('Invalid target element');
        return;
      }
      
      targetElement.appendChild(component.element);
      component.mounted = true;
      
      // Call mounted hook
      const definition = components[component.name];
      if (definition && definition.mounted) {
        definition.mounted.call(component);
      }
      
      return component;
    }
    
    function getInstance(element) {
      return componentInstances.get(element);
    }
    
    function destroy(component) {
      if (!component || !component.element) return;
      
      // Call beforeDestroy hook
      const definition = components[component.name];
      if (definition && definition.beforeDestroy) {
        definition.beforeDestroy.call(component);
      }
      
      // Remove element
      if (component.element.parentNode) {
        component.element.parentNode.removeChild(component.element);
      }
      
      // Remove event listeners
      component.listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      
      // Remove from instances
      componentInstances.delete(component.element);
      
      component.mounted = false;
    }
    
    ok.component = { register, create, mount, getInstance, destroy };
  });

  // Reactive State Management Module
  ok.module('reactive', function() {
    const state = {};
    const watchers = {};
    
    function reactive(obj) {
      const reactiveObj = {};
      
      for (const key in obj) {
        let value = obj[key];
        
        Object.defineProperty(reactiveObj, key, {
          get() {
            return value;
          },
          set(newValue) {
            if (value !== newValue) {
              const oldValue = value;
              value = newValue;
              
              // Notify watchers
              if (watchers[key]) {
                watchers[key].forEach(watcher => {
                  watcher(newValue, oldValue);
                });
              }
            }
          }
        });
      }
      
      return reactiveObj;
    }
    
    function watch(key, callback) {
      if (!watchers[key]) {
        watchers[key] = [];
      }
      watchers[key].push(callback);
      
      // Return unwatch function
      return function() {
        const index = watchers[key].indexOf(callback);
        if (index > -1) {
          watchers[key].splice(index, 1);
        }
      };
    }
    
    function bind(element, stateKey, attribute = 'value') {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      // Initial sync
      if (state[stateKey] !== undefined) {
        el[attribute] = state[stateKey];
      }
      
      // Update state when element changes
      el.addEventListener('input', function() {
        state[stateKey] = el[attribute];
      });
      
      // Update element when state changes
      watch(stateKey, function(newValue) {
        el[attribute] = newValue;
      });
    }
    
    ok.reactive = { reactive, watch, bind };
  });

  // Virtual DOM Module
  ok.module('vdom', function() {
    function h(tag, props = {}, children = []) {
      return {
        tag,
        props,
        children: Array.isArray(children) ? children : [children]
      };
    }
    
    function createElement(vnode) {
      if (typeof vnode === 'string') {
        return document.createTextNode(vnode);
      }
      
      const element = document.createElement(vnode.tag);
      
      // Set properties
      if (vnode.props) {
        Object.keys(vnode.props).forEach(key => {
          if (key === 'className') {
            element.className = vnode.props[key];
          } else if (key.startsWith('on') && key.length > 2) {
            const event = key.substring(2).toLowerCase();
            element.addEventListener(event, vnode.props[key]);
          } else {
            element.setAttribute(key, vnode.props[key]);
          }
        });
      }
      
      // Add children
      if (vnode.children) {
        vnode.children.forEach(child => {
          element.appendChild(createElement(child));
        });
      }
      
      return element;
    }
    
    ok.vdom = { h, createElement };
  });

  // Animation Module
  ok.module('animation', function() {
    const animations = {
      scaleIn(duration = 300, callback) {
        return this.each(function() {
          const element = this;
          element.style.transform = 'scale(0)';
          element.style.opacity = '0';
          element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
          
          element.offsetHeight; // Force reflow
          
          element.style.transform = 'scale(1)';
          element.style.opacity = '1';
          
          setTimeout(() => {
            element.style.transition = '';
            if (callback) callback.call(element);
          }, duration);
        });
      },
      
      scaleOut(duration = 300, callback) {
        return this.each(function() {
          const element = this;
          element.style.transform = 'scale(1)';
          element.style.opacity = '1';
          element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
          
          element.offsetHeight; // Force reflow
          
          element.style.transform = 'scale(0)';
          element.style.opacity = '0';
          
          setTimeout(() => {
            element.style.transition = '';
            if (callback) callback.call(element);
          }, duration);
        });
      },
      
      rotateIn(duration = 500, callback) {
        return this.each(function() {
          const element = this;
          element.style.transform = 'rotate(-180deg) scale(0)';
          element.style.opacity = '0';
          element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
          
          element.offsetHeight; // Force reflow
          
          element.style.transform = 'rotate(0) scale(1)';
          element.style.opacity = '1';
          
          setTimeout(() => {
            element.style.transition = '';
            if (callback) callback.call(element);
          }, duration);
        });
      },
      
      rotateOut(duration = 500, callback) {
        return this.each(function() {
          const element = this;
          element.style.transform = 'rotate(0) scale(1)';
          element.style.opacity = '1';
          element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
          
          element.offsetHeight; // Force reflow
          
          element.style.transform = 'rotate(180deg) scale(0)';
          element.style.opacity = '0';
          
          setTimeout(() => {
            element.style.transition = '';
            if (callback) callback.call(element);
          }, duration);
        });
      },
      
      bounce(duration = 1000, callback) {
        return this.each(function() {
          const element = this;
          element.style.animation = `bounce ${duration}ms ease-in-out`;
          
          setTimeout(() => {
            element.style.animation = '';
            if (callback) callback.call(element);
          }, duration);
        });
      },
      
      shake(duration = 500, callback) {
        return this.each(function() {
          const element = this;
          element.style.animation = `shake ${duration}ms ease-in-out`;
          
          setTimeout(() => {
            element.style.animation = '';
            if (callback) callback.call(element);
          }, duration);
        });
      }
    };
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); } 40%, 43% { transform: translate3d(0, -30px, 0); } 70% { transform: translate3d(0, -15px, 0); } 90% { transform: translate3d(0, -4px, 0); } }
      @keyframes shake { 0%, 100% { transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); } }
    `;
    document.head.appendChild(style);
    
    // Add animation methods to OneKit prototype
    Object.keys(animations).forEach(name => {
      OneKit.prototype[name] = animations[name];
    });
  });

  // Gesture Module
  ok.module('gesture', function() {
    const touchState = { startX: 0, startY: 0, endX: 0, endY: 0, startTime: 0, endTime: 0, longPressTimer: null, pinchDistance: 0, isPinching: false };
    
    function addGestures(element) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      el.addEventListener('touchstart', function(e) {
        touchState.startX = e.touches[0].clientX;
        touchState.startY = e.touches[0].clientY;
        touchState.startTime = Date.now();
        
        touchState.longPressTimer = setTimeout(() => {
          const event = new CustomEvent('longpress', { detail: { x: touchState.startX, y: touchState.startY }, bubbles: true, cancelable: true });
          el.dispatchEvent(event);
        }, 500);
        
        if (e.touches.length === 2) {
          touchState.isPinching = true;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchState.pinchDistance = Math.sqrt(dx * dx + dy * dy);
          
          const event = new CustomEvent('pinchstart', { detail: { distance: touchState.pinchDistance, centerX: (e.touches[0].clientX + e.touches[1].clientX) / 2, centerY: (e.touches[0].clientY + e.touches[1].clientY) / 2 }, bubbles: true, cancelable: true });
          el.dispatchEvent(event);
        }
      }, { passive: true });
      
      el.addEventListener('touchmove', function(e) {
        if (touchState.longPressTimer) { clearTimeout(touchState.longPressTimer); touchState.longPressTimer = null; }
        
        if (touchState.isPinching && e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const scale = distance / touchState.pinchDistance;
          
          const event = new CustomEvent('pinchmove', { detail: { distance, scale, centerX: (e.touches[0].clientX + e.touches[1].clientX) / 2, centerY: (e.touches[0].clientY + e.touches[1].clientY) / 2 }, bubbles: true, cancelable: true });
          el.dispatchEvent(event);
        }
      }, { passive: true });
      
      el.addEventListener('touchend', function(e) {
        touchState.endX = e.changedTouches[0].clientX;
        touchState.endY = e.changedTouches[0].clientY;
        touchState.endTime = Date.now();
        
        if (touchState.longPressTimer) { clearTimeout(touchState.longPressTimer); touchState.longPressTimer = null; }
        
        if (touchState.isPinching) {
          touchState.isPinching = false;
          const event = new CustomEvent('pinchend', { detail: { distance: touchState.pinchDistance }, bubbles: true, cancelable: true });
          el.dispatchEvent(event);
          return;
        }
        
        const deltaX = touchState.endX - touchState.startX;
        const deltaY = touchState.endY - touchState.startY;
        const deltaTime = touchState.endTime - touchState.startTime;
        
        if (deltaTime < 500) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            const direction = deltaX > 0 ? 'right' : 'left';
            const event = new CustomEvent('swipe', { detail: { direction, startX: touchState.startX, startY: touchState.startY, endX: touchState.endX, endY: touchState.endY, velocity: Math.abs(deltaX) / deltaTime }, bubbles: true, cancelable: true });
            el.dispatchEvent(event);
            el.dispatchEvent(new CustomEvent(`swipe${direction}`, { detail: { startX: touchState.startX, startY: touchState.startY, endX: touchState.endX, endY: touchState.endY, velocity: Math.abs(deltaX) / deltaTime }, bubbles: true, cancelable: true }));
          } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
            const direction = deltaY > 0 ? 'down' : 'up';
            const event = new CustomEvent('swipe', { detail: { direction, startX: touchState.startX, startY: touchState.startY, endX: touchState.endX, endY: touchState.endY, velocity: Math.abs(deltaY) / deltaTime }, bubbles: true, cancelable: true });
            el.dispatchEvent(event);
            el.dispatchEvent(new CustomEvent(`swipe${direction}`, { detail: { startX: touchState.startX, startY: touchState.startY, endX: touchState.endX, endY: touchState.endY, velocity: Math.abs(deltaY) / deltaTime }, bubbles: true, cancelable: true }));
          }
        }
        
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
          const event = new CustomEvent('tap', { detail: { x: touchState.endX, y: touchState.endY }, bubbles: true, cancelable: true });
          el.dispatchEvent(event);
        }
      }, { passive: true });
    }
    
    ok.gesture = { addGestures };
  });

  // API Module
  ok.module('api', function() {
    const cache = {};
    
    function request(url, options = {}) {
      const { method = 'GET', headers = {}, body = null, timeout = 5000, retries = 3, cache: useCache = false, cacheTime = 300000, loader = null } = options;
      
      if (useCache && method === 'GET') {
        const cacheKey = `${method}:${url}`;
        const cached = cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < cacheTime) { return Promise.resolve(cached.data); }
      }
      
      if (loader) { ok(loader).show(); }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const makeRequest = (attempt = 0) => {
        return fetch(url, { method, headers, body, signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          if (loader) { ok(loader).hide(); }
          if (!response.ok) { throw new Error(`Request failed with status ${response.status}`); }
          return response.json();
        })
        .then(data => {
          if (useCache && method === 'GET') {
            const cacheKey = `${method}:${url}`;
            cache[cacheKey] = { data, timestamp: Date.now() };
          }
          return data;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (loader) { ok(loader).hide(); }
          if (attempt < retries && error.name !== 'AbortError') {
            return new Promise(resolve => { setTimeout(() => resolve(makeRequest(attempt + 1)), 1000 * Math.pow(2, attempt)); });
          }
          throw error;
        });
      };
      
      return makeRequest();
    }
    
    function websocket(url, options = {}) {
      const { protocols = [], reconnect = true, reconnectInterval = 3000, maxReconnectAttempts = 5 } = options;
      let ws, reconnectAttempts = 0, messageQueue = [], eventHandlers = {};
      
      function connect() {
        try {
          ws = new WebSocket(url, protocols);
          ws.onopen = function(event) {
            reconnectAttempts = 0;
            while (messageQueue.length) { ws.send(messageQueue.shift()); }
            if (eventHandlers.open) { eventHandlers.open.forEach(h => h(event)); }
          };
          ws.onmessage = function(event) {
            try { const data = JSON.parse(event.data); if (eventHandlers.message) { eventHandlers.message.forEach(h => h(data)); } }
            catch (e) { if (eventHandlers.message) { eventHandlers.message.forEach(h => h(event.data)); } }
          };
          ws.onclose = function(event) {
            if (eventHandlers.close) { eventHandlers.close.forEach(h => h(event)); }
            if (reconnect && event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++; setTimeout(connect, reconnectInterval);
            }
          };
          ws.onerror = function(event) {
            if (eventHandlers.error) { eventHandlers.error.forEach(h => h(event)); }
            if (reconnect && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++; setTimeout(connect, reconnectInterval);
            }
          };
        } catch (e) {
          console.error('WebSocket connection error:', e);
          if (reconnect && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++; setTimeout(connect, reconnectInterval);
          }
        }
      }
      
      connect();
      
      return {
        send(data) {
          const message = typeof data === 'string' ? data : JSON.stringify(data);
          if (ws && ws.readyState === WebSocket.OPEN) { ws.send(message); } else { messageQueue.push(message); }
        },
        close() { reconnect = false; if (ws) { ws.close(); } },
        on(event, handler) {
          if (!eventHandlers[event]) { eventHandlers[event] = []; }
          eventHandlers[event].push(handler);
          return () => { const h = eventHandlers[event]; const i = h.indexOf(handler); if (i > -1) { h.splice(i, 1); } };
        },
        get readyState() { return ws ? ws.readyState : WebSocket.CONNECTING; }
      };
    }
    
    function upload(url, file, options = {}) {
      const { method = 'POST', headers = {}, data = {}, timeout = 0, onProgress = null, loader = null } = options;
      return new Promise((resolve, reject) => {
        if (loader) { ok(loader).show(); }
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(data).forEach(k => formData.append(k, data[k]));
        
        const xhr = new XMLHttpRequest();
        if (timeout > 0) { xhr.timeout = timeout; }
        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              onProgress(percentComplete, e.loaded, e.total);
            }
          };
        }
        xhr.onload = function () {
          if (loader) { ok(loader).hide(); }
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch (e) { resolve(xhr.responseText); }
          } else { reject(new Error(`Upload failed with status ${xhr.status}`)); }
        };
        xhr.onerror = function () {
          if (loader) { ok(loader).hide(); reject(new Error('Upload failed')); };
          xhr.ontimeout = function () {
            if (loader) { ok(loader).hide(); reject(new Error('Upload timed out')); };
        
            xhr.open(method, url, true);
            Object.keys(headers).forEach(k => xhr.setRequestHeader(k, headers[k]));
            xhr.send(formData);
          }
        }
      })
    }
    
    ok.http = { request, get: (url, o) => request(url, { ...o, method: 'GET' }), post: (url, d, o) => request(url, { ...o, method: 'POST', body: JSON.stringify(d) }), put: (url, d, o) => request(url, { ...o, method: 'PUT', body: JSON.stringify(d) }), delete: (url, o) => request(url, { ...o, method: 'DELETE' }), websocket, upload };
  });

  // Utility Module
  ok.module('utils', function() {
    function debounce(func, delay) { let timeout; return function() { const context = this; const args = arguments; clearTimeout(timeout); timeout = setTimeout(() => func.apply(context, args), delay); }; }
    function throttle(func, limit) { let inThrottle; return function() { const context = this; const args = arguments; if (!inThrottle) { func.apply(context, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); } }; }
    function deepClone(obj) { if (obj === null || typeof obj !== 'object') return obj; if (obj instanceof Date) return new Date(obj.getTime()); if (obj instanceof Array) return obj.map(i => deepClone(i)); if (typeof obj === 'object') { const o = {}; Object.keys(obj).forEach(k => o[k] = deepClone(obj[k])); return o; } }
    function deepMerge(target, source) { if (typeof target !== 'object' || typeof source !== 'object') return source; const result = { ...target }; Object.keys(source).forEach(k => { if (typeof source[k] === 'object' && typeof result[k] === 'object') { result[k] = deepMerge(result[k], source[k]); } else { result[k] = source[k]; } }); return result; }
    function url(url, params = {}) { const u = new URL(url, window.location.origin); Object.keys(params).forEach(k => u.searchParams.set(k, params[k])); return u.toString(); }
    function parseQuery(queryString = window.location.search) { const p = {}; const u = new URLSearchParams(queryString); for (const [k, v] of u) { p[k] = v; } return p; }
    function formatDate(date, format = 'YYYY-MM-DD') { const d = new Date(date); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); const h = String(d.getHours()).padStart(2, '0'); const min = String(d.getMinutes()).padStart(2, '0'); const s = String(d.getSeconds()).padStart(2, '0'); return format.replace('YYYY', y).replace('MM', m).replace('DD', day).replace('HH', h).replace('mm', min).replace('ss', s); }
    
    ok.utils = { debounce, throttle, deepClone, deepMerge, url, parseQuery, formatDate };
  });

  // Form Module
  ok.module('form', function() {
    const masks = {
      phone: { pattern: '(___) ___-____', format: v => { const n = v.replace(/\D/g, '').substring(0, 10); let f = ''; for (let i = 0; i < n.length; i++) { if (i === 0) f += '('; if (i === 3) f += ') '; if (i === 6) f += '-'; f += n[i]; } return f; } },
      date: { pattern: '__/__/____', format: v => { const n = v.replace(/\D/g, '').substring(0, 8); let f = ''; for (let i = 0; i < n.length; i++) { if (i === 2 || i === 4) f += '/'; f += n[i]; } return f; } },
      creditCard: { pattern: '____ ____ ____ ____', format: v => { const n = v.replace(/\D/g, '').substring(0, 16); let f = ''; for (let i = 0; i < n.length; i++) { if (i > 0 && i % 4 === 0) f += ' '; f += n[i]; } return f; } }
    };
    ok.form = { masks };
  });

  // Plugin Module
  ok.module('plugin', function() {
    const plugins = {};
    function register(name, plugin, namespace = 'default') {
      if (!plugins[namespace]) { plugins[namespace] = {}; }
      plugins[namespace][name] = plugin;
      if (typeof plugin === 'function') { OneKit.prototype[name] = plugin; }
    }
    ok.plugin = { register };
  });

  // Accessibility Module
  ok.module('a11y', function() {
    function announce(message, priority = 'polite') {
      const a = document.createElement('div'); a.setAttribute('aria-live', priority); a.setAttribute('aria-atomic', 'true'); a.className = 'sr-only'; a.style.position = 'absolute'; a.style.left = '-10000px'; a.style.width = '1px'; a.style.height = '1px'; a.style.overflow = 'hidden';
      document.body.appendChild(a); a.textContent = message;
      setTimeout(() => { document.body.removeChild(a); }, 1000);
    }
    
    function trapFocus(element) {
      const el = ok(element).first().elements[0]; if (!el) return;
      const f = el.querySelectorAll('a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select');
      const first = f[0]; const last = f[f.length - 1];
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
          if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
          else { if (document.activeElement === last) { first.focus(); e.preventDefault(); } }
        }
      });
      if (first) { first.focus(); }
    }
    
    function removeFocusTrap(element) {
      const el = ok(element).first().elements[0]; if (!el) return;
      const newEl = el.cloneNode(true); el.parentNode.replaceChild(newEl, el);
    }
    
    ok.a11y = { announce, trapFocus, removeFocusTrap };
  });

  // Theme Module
  ok.module('theme', function() {
    const defaultTheme = { primary: '#3498db', secondary: '#2ecc71', accent: '#e74c3c', background: '#ffffff', surface: '#f5f5f5', text: '#333333', textSecondary: '#666666', border: '#dddddd', dark: false };
    let currentTheme = { ...defaultTheme };
    
    function applyTheme(theme) {
      currentTheme = { ...defaultTheme, ...theme };
      const root = document.documentElement;
      root.style.setProperty('--ok-primary', currentTheme.primary);
      root.style.setProperty('--ok-secondary', currentTheme.secondary);
      root.style.setProperty('--ok-accent', currentTheme.accent);
      root.style.setProperty('--ok-background', currentTheme.background);
      root.style.setProperty('--ok-surface', currentTheme.surface);
      root.style.setProperty('--ok-text', currentTheme.text);
      root.style.setProperty('--ok-text-secondary', currentTheme.textSecondary);
      root.style.setProperty('--ok-border', currentTheme.border);
      
      if (currentTheme.dark) { document.body.classList.add('ok-dark'); } else { document.body.classList.remove('ok-dark'); }
      localStorage.setItem('ok-theme', JSON.stringify(currentTheme));
      return currentTheme;
    }
    
    function toggleDarkMode() {
      return applyTheme({
        dark: !currentTheme.dark,
        background: currentTheme.dark ? '#ffffff' : '#121212',
        surface: currentTheme.dark ? '#f5f5f5' : '#1e1e1e',
        text: currentTheme.dark ? '#333333' : '#ffffff',
        textSecondary: currentTheme.dark ? '#666666' : '#cccccc',
        border: currentTheme.dark ? '#dddddd' : '#333333'
      });
    }
    
    function loadTheme() {
      try { const saved = localStorage.getItem('ok-theme'); if (saved) { return applyTheme(JSON.parse(saved)); } } catch (e) { console.error('Failed to load theme:', e); }
      return applyTheme({});
    }
    
    ok.theme = { apply: applyTheme, toggleDark: toggleDarkMode, load: loadTheme, current: () => ({ ...currentTheme }) };
  });

  // ==================== INITIALIZATION ====================

  // Initialize modules
  const moduleNames = ['component', 'reactive', 'vdom', 'animation', 'gesture', 'api', 'utils', 'form', 'plugin', 'a11y', 'theme'];
  moduleNames.forEach(name => {
    if (modules[name]) {
      modules[name]();
    }
  });

  // Storage utilities
  ok.store = {
    set(key, value) { if (typeof value === 'object') { value = JSON.stringify(value); } localStorage.setItem(key, value); },
    get(key) { const v = localStorage.getItem(key); try { return JSON.parse(v); } catch (e) { return v; } },
    del(key) { localStorage.removeItem(key); }
  };

  // Utility functions (legacy)
  ok.wait = ok.utils.debounce;
  ok.flow = ok.utils.throttle;

  // Plugin architecture (legacy)
  ok.plug = function(name, fn) { OneKit.prototype[name] = fn; };

  // Export to global
  global.ok = ok;
  global.OneKit = OneKit;

  // Auto-initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    if (ok.theme && ok.theme.load) { ok.theme.load(); }
  });

})(typeof window !== 'undefined' ? window : this);