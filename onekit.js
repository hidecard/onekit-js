/**
 * OneKit - A lightweight, modern JavaScript library for DOM manipulation,
 * animations, reactive state, and API integration.
 *
 * Version: 2.1.0
 * Author: OneKit Team
 */

(function(global) {
  'use strict';

  // Global error handler
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
    return function(...args) {
      try {
        return method.apply(this, args);
      } catch (error) {
        errorHandler(error, method.name);
        return this; // Return this for method chaining
      }
    };
  }

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

        // Handle CSS selectors with caching
        const cacheKey = `selector:${selector}`;
        let elements = OneKit._cache && OneKit._cache.get(cacheKey);
        
        if (!elements) {
          elements = document.querySelectorAll(selector);
          if (OneKit._cache) {
            OneKit._cache.set(cacheKey, elements);
          }
        }
        
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

    // Static cache for performance
    static _cache = new Map();
    
    // Method to clear the cache
    static clearCache() {
      OneKit._cache.clear();
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

    // Fade in animation (Promise-based)
    fade_in(duration, callback) {
      duration = duration || 400;
      return new Promise(resolve => {
        this.each(function() {
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
            } else {
              if (callback) callback.call(element);
              resolve(element);
            }
          }
          
          requestAnimationFrame(animate);
        });
      });
    }

    // Fade out animation (Promise-based)
    fade_out(duration, callback) {
      duration = duration || 400;
      return new Promise(resolve => {
        this.each(function() {
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
              resolve(element);
            }
          }
          
          requestAnimationFrame(animate);
        });
      });
    }

    // Slide up animation (Promise-based)
    slide_up(duration, callback) {
      duration = duration || 400;
      return new Promise(resolve => {
        this.each(function() {
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
            if (callback) callback.call(element);
            resolve(element);
          }, duration);
        });
      });
    }

    // Slide down animation (Promise-based)
    slide_down(duration, callback) {
      duration = duration || 400;
      return new Promise(resolve => {
        this.each(function() {
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
            if (callback) callback.call(element);
            resolve(element);
          }, duration);
        });
      });
    }

    // Custom animation (Promise-based)
    animate(props, duration, callback) {
      duration = duration || 400;
      return new Promise(resolve => {
        this.each(function() {
          const element = this;
          const startValues = {};
          const changeValues = {};
          
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
            } else {
              if (callback) callback.call(element);
              resolve(element);
            }
          }
          
          requestAnimationFrame(animate);
        });
      });
    }

    // Hardware-accelerated movement (Promise-based)
    move(x, y, duration = 300) {
      return new Promise(resolve => {
        this.each(function() {
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
        hideError = true,
        onSubmit = null
      } = options;
      
      const formEl = this.elements[0];
      if (!formEl || formEl.tagName !== 'FORM') return false;
      
      const errors = {};
      let isValid = true;
      
      if (hideError) {
        formEl.querySelectorAll(`.${errorClass}`).forEach(el => {
          el.classList.remove(errorClass);
        });
        formEl.querySelectorAll(`${errorElement}.${errorClass}-message`).forEach(el => {
          el.remove();
        });
      }
      
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
          
          // Add pattern validation
          if (rule.startsWith('pattern:')) {
            const pattern = new RegExp(rule.split(':')[1]);
            if (value && !pattern.test(value)) {
              fieldErrors.push(`${field} format is invalid`);
              continue;
            }
          }
          
          // Add custom validation
          if (rule.startsWith('custom:')) {
            const customFunc = window[rule.split(':')[1]];
            if (typeof customFunc === 'function' && !customFunc(value)) {
              fieldErrors.push(`${field} is invalid`);
              continue;
            }
          }
        }
        
        if (fieldErrors.length) {
          errors[field] = fieldErrors;
          isValid = false;
          
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
      
      formEl._validationErrors = errors;
      
      // Add submit handler if provided
      if (onSubmit && isValid) {
        formEl.addEventListener('submit', function(e) {
          e.preventDefault();
          onSubmit(ok(formEl).form_data());
        });
      }
      
      return isValid;
    }

    // Apply input mask
    applyMask(maskName) {
      const mask = ok.form.masks[maskName];
      if (!mask) return this;
      
      return this.each(function() {
        const el = this;
        if (el.tagName !== 'INPUT') return;
        
        el.addEventListener('input', function() {
          const formattedValue = mask.format(this.value);
          // Only update if the value has actually changed to prevent cursor jumping
          if (this.value !== formattedValue) {
            this.value = formattedValue;
          }
        });
        
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

    // Sanitize HTML string before insertion
    clean(dirtyHtml) {
      const div = document.createElement('div');
      div.innerHTML = dirtyHtml;
      
      // Remove script tags
      const scripts = div.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      
      // Remove elements with on* attributes
      const allElements = div.querySelectorAll('*');
      allElements.forEach(el => {
        const attributes = el.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attrName = attributes[i].name;
          if (attrName.startsWith('on')) {
            el.removeAttribute(attrName);
          }
        }
      });
      
      return div.innerHTML;
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

    // Batch DOM operations for better performance
    batch(callback) {
      // Use document fragment for better performance
      const fragment = document.createDocumentFragment();
      const originalElements = this.elements;
      
      // Temporarily replace elements with the fragment
      this.elements = [fragment];
      
      // Execute the callback
      const result = callback.call(this);
      
      // Restore original elements
      this.elements = originalElements;
      
      // Append the fragment to all elements
      this.each(function() {
        this.appendChild(fragment.cloneNode(true));
      });
      
      return result;
    }

    // Throttle DOM updates
    throttleUpdate(callback, delay = 16) { // 60fps
      let timeoutId;
      let lastRun = 0;
      
      return function() {
        const context = this;
        const args = arguments;
        const now = Date.now();
        
        if (now - lastRun >= delay) {
          callback.apply(context, args);
          lastRun = now;
        } else {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            callback.apply(context, args);
            lastRun = Date.now();
          }, delay - (now - lastRun));
        }
      };
    }
    
    // Debounce DOM updates
    debounceUpdate(callback, delay = 100) {
      let timeoutId;
      
      return function() {
        const context = this;
        const args = arguments;
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callback.apply(context, args);
        }, delay);
      };
    }
    
    // Use requestAnimationFrame for animations
    animateFrame(callback) {
      return new Promise(resolve => {
        const frame = () => {
          const result = callback.call(this);
          if (result !== false) {
            requestAnimationFrame(frame);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    }
    
    // Observe element visibility changes
    observeVisibility(callback, options = {}) {
      if (this.elements.length === 0) return null;
      
      const defaultOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          callback.call(this, entry);
        });
      }, finalOptions);
      
      this.each(function() {
        observer.observe(this);
      });
      
      return observer;
    }
    
    // Observe element mutations
    observeMutations(callback, options = {}) {
      if (this.elements.length === 0) return null;
      
      const defaultOptions = {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          callback.call(this, mutation);
        });
      });
      
      this.each(function() {
        observer.observe(this, finalOptions);
      });
      
      return observer;
    }
    
    // Lazy load images
    lazyLoad(options = {}) {
      const defaultOptions = {
        rootMargin: '0px',
        threshold: 0.1,
        load: function(img) {
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
          }
        }
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      return this.observeVisibility((entry) => {
        if (entry.isIntersecting) {
          finalOptions.load.call(this, entry.target);
        }
      }, {
        rootMargin: finalOptions.rootMargin,
        threshold: finalOptions.threshold
      });
    }
    
    // Implement infinite scrolling
    infiniteScroll(callback, options = {}) {
      const defaultOptions = {
        rootMargin: '100px',
        threshold: 0.1
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      return this.observeVisibility((entry) => {
        if (entry.isIntersecting) {
          callback.call(this);
        }
      }, {
        rootMargin: finalOptions.rootMargin,
        threshold: finalOptions.threshold
      });
    }
  }

  // Wrap critical methods with the safeMethod wrapper
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

  // ==================== MODULES ====================

  // Component System Module
  ok.module('component', function() {
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

      // Unified update method for reactive updates
      instance.update = function() {
        if (this.element) {
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
          } else if (definition.render) {
            html = definition.render.call(this);
          }
          
          if (html) {
            const newElement = ok(html).first().elements[0];
            this.element.innerHTML = newElement.innerHTML;
            
            // Re-attach event listeners after update
            if (definition.methods) {
              Object.keys(definition.methods).forEach(method => {
                const events = this.element.querySelectorAll(`[data-on-${method}]`);
                events.forEach(el => {
                  el.addEventListener(method.split('on')[1], (e) => {
                    e.preventDefault();
                    this[method](e);
                  });
                });
              });
            }
          }
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
        instance.element = ok(html).first().elements[0];
      } else if (definition.render) {
        html = definition.render.call(instance);
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
      
      const definition = components[component.name];
      if (definition && definition.beforeDestroy) {
        definition.beforeDestroy.call(component);
      }
      
      if (component.element.parentNode) {
        component.element.parentNode.removeChild(component.element);
      }
      
      component.listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      
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
      
      if (state[stateKey] !== undefined) {
        el[attribute] = state[stateKey];
      }
      
      el.addEventListener('input', function() {
        state[stateKey] = el[attribute];
      });
      
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
      scaleIn(duration = 300) {
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
          const element = this;
          element.style.animation = `bounce ${duration}ms ease-in-out`;
          
          setTimeout(() => {
            element.style.animation = '';
          }, duration);
        });
      },
      
      shake(duration = 500) {
        return this.each(function() {
          const element = this;
          element.style.animation = `shake ${duration}ms ease-in-out`;
          
          setTimeout(() => {
            element.style.animation = '';
          }, duration);
        });
      },
      
      // New animations
      slideInLeft(duration = 400) {
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
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
        return this.each(function() {
          const element = this;
          element.style.animation = `pulse ${duration}ms ease-in-out ${iterations}`;
          
          setTimeout(() => {
            element.style.animation = '';
          }, duration * iterations);
        });
      },
      
      glow(duration = 1000, color = '#ffff00') {
        return this.each(function() {
          const element = this;
          element.style.boxShadow = `0 0 5px ${color}`;
          element.style.transition = `box-shadow ${duration}ms ease-in-out`;
          
          element.offsetHeight;
          
          element.style.boxShadow = `0 0 20px ${color}, 0 0 30px ${color}`;
          
          setTimeout(() => {
            element.style.boxShadow = '0 0 5px ' + color;
            setTimeout(() => {
              element.style.transition = '';
              element.style.boxShadow = '';
            }, duration);
          }, duration);
        });
      }
    };
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce { 0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); } 40%, 43% { transform: translate3d(0, -30px, 0); } 70% { transform: translate3d(0, -15px, 0); } 90% { transform: translate3d(0, -4px, 0); } }
      @keyframes shake { 0%, 100% { transform: translate3d(0, 0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); } 20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); } }
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
    
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

  // API Module (Enhanced)
  ok.module('api', function() {
    const cache = {};
    const defaultOptions = {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      cache: false,
      cacheTime: 300000
    };
    
    function setDefaults(options) {
      Object.assign(defaultOptions, options);
      return this;
    }
    
    function request(url, options = {}) {
      const { 
        method = 'GET', 
        headers = {}, 
        body = null, 
        timeout = defaultOptions.timeout, 
        retries = defaultOptions.retries, 
        retryDelay = defaultOptions.retryDelay,
        cache: useCache = defaultOptions.cache, 
        cacheTime = defaultOptions.cacheTime, 
        loader = null,
        onProgress = null,
        onSuccess = null,
        onError = null
      } = options;
      
      if (useCache && method === 'GET') {
        const cacheKey = `${method}:${url}`;
        const cached = cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < cacheTime) { 
          if (onSuccess) onSuccess(cached.data);
          return Promise.resolve(cached.data); 
        }
      }
      
      if (loader) { ok(loader).show(); }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (onError) onError(new Error('Request timed out'));
      }, timeout);
      
      let processedBody = body;
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        processedBody = JSON.stringify(body);
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }
      
      const makeRequest = (attempt = 0) => {
        return fetch(url, { method, headers, body: processedBody, signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          if (loader) { ok(loader).hide(); }
          
          if (!response.ok) { 
            const error = new Error(`Request failed with status ${response.status}`);
            error.response = response;
            throw error; 
          }
          
          return response.json();
        })
        .then(data => {
          if (useCache && method === 'GET') {
            const cacheKey = `${method}:${url}`;
            cache[cacheKey] = { data, timestamp: Date.now() };
          }
          
          if (onSuccess) onSuccess(data);
          return data;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          if (loader) { ok(loader).hide(); }
          
          if (attempt < retries && error.name !== 'AbortError') {
            const delay = retryDelay * Math.pow(2, attempt);
            return new Promise(resolve => { 
              setTimeout(() => resolve(makeRequest(attempt + 1)), delay); 
            });
          }
          
          if (onError) onError(error);
          throw error;
        });
      };
      
      return makeRequest();
    }
    
    const http = {
      get(url, options = {}) { return request(url, { ...options, method: 'GET' }); },
      post(url, data, options = {}) { return request(url, { ...options, method: 'POST', body: data }); },
      put(url, data, options = {}) { return request(url, { ...options, method: 'PUT', body: data }); },
      patch(url, data, options = {}) { return request(url, { ...options, method: 'PATCH', body: data }); },
      delete(url, options = {}) { return request(url, { ...options, method: 'DELETE' }); },
      upload(url, file, options = {}) {
        const { method = 'POST', headers = {}, data = {}, timeout = defaultOptions.timeout, onProgress = null, loader = null } = options;
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
          xhr.onerror = function () { if (loader) { ok(loader).hide(); reject(new Error('Upload failed')); } };
          xhr.ontimeout = function () { if (loader) { ok(loader).hide(); reject(new Error('Upload timed out')); } };
          
          xhr.open(method, url, true);
          Object.keys(headers).forEach(k => xhr.setRequestHeader(k, headers[k]));
          xhr.send(formData);
        });
      },
      websocket(url, options = {}) {
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
      },
      setDefaults
    };
    
    ok.http = http;
  });

  // Utility Module
  ok.module('utils', function() {
    function debounce(func, delay) { 
      let timeout; 
      return function() { 
        const context = this; 
        const args = arguments; 
        clearTimeout(timeout); 
        timeout = setTimeout(() => func.apply(context, args), delay); 
      }; 
    }
    
    function throttle(func, limit) { 
      let inThrottle; 
      return function() { 
        const context = this; 
        const args = arguments; 
        if (!inThrottle) { 
          func.apply(context, args); 
          inThrottle = true; 
          setTimeout(() => inThrottle = false, limit); 
        } 
      }; 
    }
    
    function deepClone(obj) { 
      if (obj === null || typeof obj !== 'object') return obj; 
      if (obj instanceof Date) return new Date(obj.getTime()); 
      if (obj instanceof Array) return obj.map(i => deepClone(i)); 
      if (typeof obj === 'object') { 
        const o = {}; 
        Object.keys(obj).forEach(k => o[k] = deepClone(obj[k])); 
        return o; 
      } 
    }
    
    function deepMerge(target, source) { 
      if (typeof target !== 'object' || typeof source !== 'object') return source; 
      const result = { ...target }; 
      Object.keys(source).forEach(k => { 
        if (typeof source[k] === 'object' && typeof result[k] === 'object') { 
          result[k] = deepMerge(result[k], source[k]); 
        } else { 
          result[k] = source[k]; 
        } 
      }); 
      return result; 
    }
    
    function url(url, params = {}) { 
      const u = new URL(url, window.location.origin); 
      Object.keys(params).forEach(k => u.searchParams.set(k, params[k])); 
      return u.toString(); 
    }
    
    function parseQuery(queryString = window.location.search) { 
      const p = {}; 
      const u = new URLSearchParams(queryString); 
      for (const [k, v] of u) { 
        p[k] = v; 
      } 
      return p; 
    }
    
    function formatDate(date, format = 'YYYY-MM-DD') { 
      const d = new Date(date); 
      const y = d.getFullYear(); 
      const m = String(d.getMonth() + 1).padStart(2, '0'); 
      const day = String(d.getDate()).padStart(2, '0'); 
      const h = String(d.getHours()).padStart(2, '0'); 
      const min = String(d.getMinutes()).padStart(2, '0'); 
      const s = String(d.getSeconds()).padStart(2, '0'); 
      return format.replace('YYYY', y).replace('MM', m).replace('DD', day).replace('HH', h).replace('mm', min).replace('ss', s); 
    }
    
    function formatNumber(num, decimals = 0, dec_point = '.', thousands_sep = ',') {
      const parts = parseFloat(num).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands_sep);
      return parts.join(dec_point);
    }

    function formatCurrency(num, currency = '$', decimals = 2) {
      return currency + formatNumber(num, decimals);
    }

    function truncate(str, length, ending = '...') {
      if (str.length > length) {
        return str.substring(0, length - ending.length) + ending;
      }
      return str;
    }

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function camelCase(str) {
      return str.replace(/-([a-z])/g, function(g) { return g[1].toUpperCase(); });
    }

    function kebabCase(str) {
      return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    function slugify(str) {
      return str
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }

    function randomString(length = 10) {
      const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    function isEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isUrl(url) {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    }

    function isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function cookie(name, value, days = null, path = '/') {
      if (value !== undefined) {
        let expires = '';
        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=' + path;
        return this;
      } else {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
      }
    }

    function removeCookie(name, path = '/') {
      document.cookie = name + '=; Path=' + path + '; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      return this;
    }
    
    ok.utils = { 
      debounce, 
      throttle, 
      deepClone, 
      deepMerge, 
      url, 
      parseQuery, 
      formatDate,
      formatNumber,
      formatCurrency,
      truncate,
      capitalize,
      camelCase,
      kebabCase,
      slugify,
      randomString,
      isEmail,
      isUrl,
      isMobile,
      cookie,
      removeCookie
    };
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
      const a = document.createElement('div');
      a.setAttribute('aria-live', priority);
      a.setAttribute('aria-atomic', 'true');
      a.className = 'sr-only';
      a.style.position = 'absolute';
      a.style.left = '-10000px';
      a.style.width = '1px';
      a.style.height = '1px';
      a.style.overflow = 'hidden';
      document.body.appendChild(a);
      a.textContent = message;
      setTimeout(() => {
        document.body.removeChild(a);
      }, 1000);
    }
    
    function trapFocus(element) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      const focusableElements = el.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
              lastFocusableElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableElement) {
              firstFocusableElement.focus();
              e.preventDefault();
            }
          }
        }
      });
      
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
      
      // Store the previous active element
      el._previousActiveElement = document.activeElement;
      
      return {
        release: () => removeFocusTrap(el)
      };
    }
    
    function removeFocusTrap(element) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      // Restore focus to the previous active element
      if (el._previousActiveElement && typeof el._previousActiveElement.focus === 'function') {
        el._previousActiveElement.focus();
      }
      
      // Clone the element to remove all event listeners
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
    }

    function addAriaAttributes(element, attributes) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      Object.keys(attributes).forEach(key => {
        el.setAttribute(`aria-${key}`, attributes[key]);
      });
      
      return this;
    }

    function addRole(element, role) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      el.setAttribute('role', role);
      return this;
    }

    function addLabel(element, label) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      if (el.tagName === 'INPUT') {
        el.setAttribute('aria-label', label);
      } else {
        const id = el.id || 'element-' + Math.random().toString(36).substr(2, 9);
        el.id = id;
        
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label;
        
        el.parentNode.insertBefore(labelEl, el);
      }
      
      return this;
    }

    function addDescription(element, description) {
      const el = ok(element).first().elements[0];
      if (!el) return;
      
      const id = el.id || 'element-' + Math.random().toString(36).substr(2, 9);
      el.id = id;
      
      const descId = 'desc-' + id;
      const descEl = document.createElement('div');
      descEl.id = descId;
      descEl.className = 'sr-only';
      descEl.textContent = description;
      
      el.parentNode.insertBefore(descEl, el.nextSibling);
      el.setAttribute('aria-describedby', descId);
      
      return this;
    }

    function checkContrast(element1, element2) {
      const el1 = ok(element1).first().elements[0];
      const el2 = ok(element2).first().elements[0];
      
      if (!el1 || !el2) return null;
      
      const style1 = window.getComputedStyle(el1);
      const style2 = window.getComputedStyle(el2);
      
      const color1 = style1.color || style1.backgroundColor;
      const color2 = style2.color || style2.backgroundColor;
      
      function getLuminance(color) {
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0;
        
        const [r, g, b] = rgb.map(val => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      
      const lum1 = getLuminance(color1);
      const lum2 = getLuminance(color2);
      
      const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      
      return {
        ratio: ratio.toFixed(2),
        aaLarge: ratio >= 3,
        aa: ratio >= 4.5,
        aaaLarge: ratio >= 4.5,
        aaa: ratio >= 7
      };
    }
    
    ok.a11y = { 
      announce, 
      trapFocus, 
      removeFocusTrap,
      addAriaAttributes,
      addRole,
      addLabel,
      addDescription,
      checkContrast
    };
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

  // Router Module
  ok.module('router', function() {
    const routes = {};
    let currentRoute = null;
    let notFoundRoute = null;
    let base = '/';
    
    function add(path, component, options = {}) {
      routes[path] = { component, options, params: extractParamNames(path) };
      return this;
    }
    
    function notFound(component) {
      notFoundRoute = component;
      return this;
    }
    
    function setBase(path) {
      base = path;
      return this;
    }
    
    function extractParamNames(path) {
      const paramNames = [];
      const segments = path.split('/');
      segments.forEach(segment => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.substring(1));
        }
      });
      return paramNames;
    }
    
    function matchRoute(path) {
      if (base !== '/' && path.startsWith(base)) {
        path = path.substring(base.length);
      }
      
      if (routes[path]) {
        return { route: routes[path], params: {} };
      }
      
      for (const routePath in routes) {
        const routeSegments = routePath.split('/');
        const pathSegments = path.split('/');
        
        if (routeSegments.length !== pathSegments.length) continue;
        
        const params = {};
        let isMatch = true;
        
        for (let i = 0; i < routeSegments.length; i++) {
          const routeSegment = routeSegments[i];
          const pathSegment = pathSegments[i];
          
          if (routeSegment.startsWith(':')) {
            params[routeSegment.substring(1)] = pathSegment;
          } else if (routeSegment !== pathSegment) {
            isMatch = false;
            break;
          }
        }
        
        if (isMatch) {
          return { route: routes[routePath], params };
        }
      }
      
      return null;
    }
    
    function navigate(path, state = {}, replace = false) {
      const match = matchRoute(path);
      
      if (match) {
        const { route, params } = match;
        
        if (replace) {
          history.replaceState(state, '', base + path);
        } else {
          history.pushState(state, '', base + path);
        }
        
        if (typeof route.component === 'string') {
          const component = ok.component.create(route.component, { ...params, ...state });
          ok.component.mount(component, '#app');
        } else if (typeof route.component === 'function') {
          const result = route.component(params, state);
          if (typeof result === 'string') {
            ok('#app').html(result);
          } else {
            ok.component.mount(result, '#app');
          }
        }
        
        currentRoute = { path, params, state };
        
        const event = new CustomEvent('routechange', { detail: { path, params, state }, bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        
        return true;
      } else if (notFoundRoute) {
        if (typeof notFoundRoute === 'string') {
          const component = ok.component.create(notFoundRoute, { path });
          ok.component.mount(component, '#app');
        } else if (typeof notFoundRoute === 'function') {
          const result = notFoundRoute(path);
          if (typeof result === 'string') {
            ok('#app').html(result);
          } else {
            ok.component.mount(result, '#app');
          }
        }
        
        currentRoute = { path: '404', params: { requestedPath: path }, state };
        return false;
      }
      
      return false;
    }

    function replace(path, state = {}) {
      return navigate(path, state, true);
    }
    
    function handlePopState(e) {
      const path = window.location.pathname;
      const state = e.state || {};
      navigate(path, state);
    }
    
    function init() {
      window.addEventListener('popstate', handlePopState);
      
      document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (!target) return;
        
        const href = target.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) {
          return;
        }
        
        if (href.startsWith(base) || (base === '/' && href.startsWith('/'))) {
          e.preventDefault();
          navigate(href);
        }
      });
      
      const initialPath = window.location.pathname;
      navigate(initialPath);
      
      return this;
    }
    
    function current() {
      return currentRoute;
    }
    
    ok.router = { add, notFound, setBase, navigate, replace, init, current };
  });

  // Storage Module
  ok.module('storage', function() {
    function getStorage(type = 'local') {
      return type === 'session' ? sessionStorage : localStorage;
    }
    
    function encrypt(data, key) {
      if (!key) return data;
      // Simple XOR encryption for demonstration
      // In a real implementation, use a proper encryption library
      const result = [];
      for (let i = 0; i < data.length; i++) {
        result.push(String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
      }
      return btoa(result.join(''));
    }

    function decrypt(data, key) {
      if (!key) return data;
      // Simple XOR decryption for demonstration
      // In a real implementation, use a proper encryption library
      const decoded = atob(data);
      const result = [];
      for (let i = 0; i < decoded.length; i++) {
        result.push(String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
      }
      return result.join('');
    }
    
    function safeSet(key, value, type = 'local', encryptKey = null) {
      try {
        const storage = getStorage(type);
        const serialized = JSON.stringify(value);
        const encrypted = encryptKey ? encrypt(serialized, encryptKey) : serialized;
        storage.setItem(key, encrypted);
        return true;
      } catch (e) {
        console.error('Storage quota exceeded or other error:', e);
        return false;
      }
    }
    
    function get(key, defaultValue = null, type = 'local', encryptKey = null) {
      try {
        const storage = getStorage(type);
        const item = storage.getItem(key);
        if (item === null) return defaultValue;
        const decrypted = encryptKey ? decrypt(item, encryptKey) : item;
        return JSON.parse(decrypted);
      } catch (e) {
        console.error('Error parsing stored value:', e);
        return defaultValue;
      }
    }
    
    function remove(key, type = 'local') {
      try {
        const storage = getStorage(type);
        storage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Error removing item from storage:', e);
        return false;
      }
    }
    
    function clear(type = 'local') {
      try {
        const storage = getStorage(type);
        storage.clear();
        return true;
      } catch (e) {
        console.error('Error clearing storage:', e);
        return false;
      }
    }
    
    function keys(type = 'local') {
      try {
        const storage = getStorage(type);
        const result = [];
        for (let i = 0; i < storage.length; i++) {
          result.push(storage.key(i));
        }
        return result;
      } catch (e) {
        console.error('Error getting storage keys:', e);
        return [];
      }
    }
    
    function reactive(key, defaultValue = null, type = 'local') {
      let value = get(key, defaultValue, type);
      const reactiveObj = ok.reactive.reactive({ value });
      
      ok.reactive.watch('value', (newValue) => {
        safeSet(key, newValue, type);
      });
      
      window.addEventListener('storage', function(e) {
        if (e.key === key && e.newValue !== null) {
          try {
            const newValue = JSON.parse(e.newValue);
            reactiveObj.value = newValue;
          } catch (err) {
            console.error('Error parsing storage event value:', err);
          }
        } else if (e.key === key && e.newValue === null) {
          reactiveObj.value = defaultValue;
        }
      });
      
      return reactiveObj.value;
    }
    
    function collection(name, type = 'local') {
      const storageKey = `collection:${name}`;
      let items = get(storageKey, [], type);
      
      const reactiveCollection = ok.reactive.reactive({
        items,
        add(item) {
          if (!item.id) {
            item.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
          }
          this.items.push(item);
          return item;
        },
        update(id, updates) {
          const index = this.items.findIndex(item => item.id === id);
          if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updates };
            return this.items[index];
          }
          return null;
        },
        remove(id) {
          const index = this.items.findIndex(item => item.id === id);
          if (index !== -1) {
            const removed = this.items[index];
            this.items.splice(index, 1);
            return removed;
          }
          return null;
        },
        find(id) {
          return this.items.find(item => item.id === id);
        },
        filter(predicate) {
          return this.items.filter(predicate);
        },
        clear() {
          this.items = [];
        }
      });
      
      ok.reactive.watch('items', (newItems) => {
        safeSet(storageKey, newItems, type);
      });
      
      window.addEventListener('storage', function(e) {
        if (e.key === storageKey && e.newValue !== null) {
          try {
            const newItems = JSON.parse(e.newValue);
            reactiveCollection.items = newItems;
          } catch (err) {
            console.error('Error parsing storage collection event value:', err);
          }
        }
      });
      
      return reactiveCollection;
    }
    
    ok.storage = { set: safeSet, get, remove, clear, keys, reactive, collection, encrypt, decrypt };
  });

  // ==================== INITIALIZATION ====================

  const moduleNames = ['component', 'reactive', 'vdom', 'animation', 'gesture', 'api', 'utils', 'form', 'plugin', 'a11y', 'theme', 'router', 'storage'];
  moduleNames.forEach(name => {
    if (modules[name]) {
      modules[name]();
    }
  });

  ok.store = {
    set(key, value) { if (typeof value === 'object') { value = JSON.stringify(value); } localStorage.setItem(key, value); },
    get(key) { const v = localStorage.getItem(key); try { return JSON.parse(v); } catch (e) { return v; } },
    del(key) { localStorage.removeItem(key); }
  };

  ok.wait = ok.utils.debounce;
  ok.flow = ok.utils.throttle;
  ok.plug = function(name, fn) { OneKit.prototype[name] = fn; };

  global.ok = ok;
  global.OneKit = OneKit;

  // Add global error handlers
  window.addEventListener('unhandledrejection', function(event) {
    errorHandler(event.reason, 'Unhandled Promise Rejection');
    event.preventDefault();
  });

  window.addEventListener('error', function(event) {
    errorHandler(event.error, 'JavaScript Error');
  });

  document.addEventListener('DOMContentLoaded', function() {
    if (ok.theme && ok.theme.load) { ok.theme.load(); }
    if (ok.router && typeof ok.router.init === 'function') { ok.router.init(); }
  });

})(typeof window !== 'undefined' ? window : this);