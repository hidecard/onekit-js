/**
 * OneKit - A lightweight, modern JavaScript library for DOM manipulation,
 * animations, reactive state, and API integration.
 *
 * Version: 5.0.0
 * Author: OneKit Team
 */

(function(global) {
  'use strict';

  // Core OneKit function - ultra-short selector
  function _(selector) {
    return new OneKit(selector);
  }

  // OneKit class with unified compact syntax
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

      // Handle arrays or EasyJS objects
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
        return new EasyJS(this.elements[0]);
      }
      return new EasyJS();
    }

    // Get the last element
    last() {
      if (this.elements.length > 0) {
        return new EasyJS(this.elements[this.elements.length - 1]);
      }
      return new EasyJS();
    }

    // Iterate over elements
    each(callback) {
      for (let i = 0; i < this.elements.length; i++) {
        callback.call(this.elements[i], i, this.elements[i]);
      }
      return this;
    }

    // Add class to elements
    cls(className) {
      return this.each(function() {
        if (this.classList) {
          this.classList.add(className);
        } else {
          this.className += ' ' + className;
        }
      });
    }

    // Remove class from elements
    uncls(className) {
      return this.each(function() {
        if (this.classList) {
          this.classList.remove(className);
        } else {
          this.className = this.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
      });
    }

    // Toggle class on elements
    tgl(className) {
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
    h(content) {
      if (content === undefined) {
        return this.elements.length > 0 ? this.elements[0].innerHTML : null;
      }
      return this.each(function() {
        this.innerHTML = content;
      });
    }

    // Get or set text content
    t(content) {
      if (content === undefined) {
        return this.elements.length > 0 ? this.elements[0].textContent : null;
      }
      return this.each(function() {
        this.textContent = content;
      });
    }

    // Get or set attribute
    at(name, value) {
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
    unat(name) {
      return this.each(function() {
        this.removeAttribute(name);
      });
    }

    // Get or set CSS properties
    s(prop, value) {
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
    togVis() {
      return this.each(function() {
        this.style.display = this.style.display === 'none' ? '' : 'none';
      });
    }

    // Clone elements
    cln() {
      const elements = [];
      this.each(function() {
        elements.push(this.cloneNode(true));
      });
      return new OneKit(elements);
    }

    // Get parent element
    up() {
      if (this.elements.length > 0) {
        return new EasyJS(this.elements[0].parentNode);
      }
      return new EasyJS();
    }

    // Get children elements
    down(selector) {
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
    side(selector) {
      const elements = [];
      this.each(function() {
        const siblings = this.parentNode.children;
        
        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i] !== this && (!selector || siblings[i].matches(selector))) {
            elements.push(siblings[i]);
          }
        }
      });
      return new EasyJS(elements);
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
    fin(duration, callback) {
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
    fout(duration, callback) {
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
    sup(duration, callback) {
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
    sdown(duration, callback) {
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
    go(props, duration, callback) {
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
    val() {
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
    chk(rules) {
      if (this.elements.length === 0 || this.elements[0].tagName !== 'FORM') return false;
      
      const form = this.elements[0];
      const errors = {};
      let isValid = true;
      
      for (const field in rules) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        const value = input.value.trim();
        const fieldRules = rules[field].split('|');
        
        for (const rule of fieldRules) {
          if (rule === 'required' && !value) {
            errors[field] = `${field} is required`;
            isValid = false;
            break;
          }
          
          if (rule === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[field] = `${field} must be a valid email`;
            isValid = false;
            break;
          }
          
          if (rule.startsWith('min:')) {
            const min = parseInt(rule.split(':')[1]);
            if (value.length < min) {
              errors[field] = `${field} must be at least ${min} characters`;
              isValid = false;
              break;
            }
          }
          
          if (rule.startsWith('max:')) {
            const max = parseInt(rule.split(':')[1]);
            if (value.length > max) {
              errors[field] = `${field} must be at most ${max} characters`;
              isValid = false;
              break;
            }
          }
        }
      }
      
      // Store errors on the form element
      form._validationErrors = errors;
      
      return isValid;
    }

    // Render template with data
    tpl(template, data) {
      if (this.elements.length === 0) return this;
      
      const element = this.elements[0];
      let html = '';
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          html += template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return item[key] !== undefined ? item[key] : '';
          });
        });
      } else {
        html = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] !== undefined ? data[key] : '';
        });
      }
      
      element.innerHTML = html;
      return this;
    }

    // Append elements
    add(content) {
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
    pre(content) {
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
    del() {
      return this.each(function() {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
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

  // Static methods
  _.reactive = function(obj) {
    const handlers = {};
    const reactiveObj = {};

    for (const key in obj) {
      let value = obj[key];
      
      Object.defineProperty(reactiveObj, key, {
        get() {
          return value;
        },
        set(newValue) {
          if (value !== newValue) {
            value = newValue;
            
            // Call all handlers for this property
            if (handlers[key]) {
              handlers[key].forEach(handler => handler(newValue));
            }
          }
        }
      });
    }

    // Method to subscribe to changes
    reactiveObj.sub = function(key, handler) {
      if (!handlers[key]) {
        handlers[key] = [];
      }
      handlers[key].push(handler);
      
      // Return unsubscribe function
      return function() {
        const index = handlers[key].indexOf(handler);
        if (index > -1) {
          handlers[key].splice(index, 1);
        }
      };
    };

    return reactiveObj;
  };

  // Storage utilities
  _.store = {
    set(key, value) {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      localStorage.setItem(key, value);
    },
    
    get(key) {
      const value = localStorage.getItem(key);
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
    
    del(key) {
      localStorage.removeItem(key);
    }
  };

  // API utilities
  _.api = {
    req(config) {
      return new Promise((resolve, reject) => {
        const {
          url,
          method = 'GET',
          data = null,
          headers = {},
          timeout = 5000,
          loader = null
        } = config;

        // Show loader if specified
        if (loader) {
          _(loader).show();
        }

        const xhr = new XMLHttpRequest();
        xhr.timeout = timeout;

        xhr.open(method, url, true);

        // Set headers
        for (const key in headers) {
          xhr.setRequestHeader(key, headers[key]);
        }

        // Set default content type for POST/PUT
        if ((method === 'POST' || method === 'PUT') && !headers['Content-Type']) {
          xhr.setRequestHeader('Content-Type', 'application/json');
        }

        xhr.onload = function() {
          if (loader) {
            _(loader).hide();
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            let response;
            try {
              response = JSON.parse(xhr.responseText);
            } catch (e) {
              response = xhr.responseText;
            }
            resolve(response);
          } else {
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = function() {
          if (loader) {
            _(loader).hide();
          }
          reject(new Error('Network error'));
        };

        xhr.ontimeout = function() {
          if (loader) {
            _(loader).hide();
          }
          reject(new Error('Request timed out'));
        };

        // Send request
        if (data) {
          if (typeof data === 'object') {
            data = JSON.stringify(data);
          }
          xhr.send(data);
        } else {
          xhr.send();
        }
      });
    },

    get(url, options = {}) {
      return this.req({ ...options, url, method: 'GET' });
    },

    post(url, data, options = {}) {
      return this.req({ ...options, url, method: 'POST', data });
    },

    put(url, data, options = {}) {
      return this.req({ ...options, url, method: 'PUT', data });
    },

    del(url, options = {}) {
      return this.req({ ...options, url, method: 'DELETE' });
    }
  };

  // Utility functions
  _.wait = function(func, delay) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  };

  _.flow = function(func, limit) {
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
  };

  // Plugin architecture
  _.plug = function(name, fn) {
    OneKit.prototype[name] = fn;
  };

  // Export to global
  global._ = _;
  global.OneKit = OneKit;

  // Auto-bind reactive elements
  document.addEventListener('DOMContentLoaded', function() {
    // Find all elements with data-bind attribute
    const boundElements = document.querySelectorAll('[data-bind]');
    
    boundElements.forEach(element => {
      const binding = element.getAttribute('data-bind');
      const [stateName, property] = binding.split('.');
      
      // This is a simplified implementation
      // In a real app, you'd need a way to access the reactive state
      // This could be a global state registry or context system
    });
  });

})(typeof window !== 'undefined' ? window : this);