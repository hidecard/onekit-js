// Core OneKit functionality
import { errorHandler, safeMethod } from './error-handler';
import { sanitizeHTML, validateSelector, sanitizeURL, deepCloneSafe, validateStorageKey } from './security';

export interface OneKitConfig {
  enableSanitization?: boolean;
  enableValidation?: boolean;
}

export class OneKit {
  public elements: Element[] = [];
  static _cache: Map<string, any> = new Map<string, any>();

  constructor(selector?: string | Element | NodeList | OneKit | Element[]) {
    if (!selector) {
      return;
    }

    if (selector instanceof Element) {
      this.elements.push(selector);
      return;
    }

    if (typeof selector === 'string') {
      if (!validateSelector(selector)) {
        console.error('OneKit: Invalid selector - potential security risk');
        return;
      }

      if (selector.charAt(0) === '<' && selector.charAt(selector.length - 1) === '>') {
        const sanitized = sanitizeHTML(selector);
        const div = document.createElement('div');
        div.innerHTML = sanitized;
        for (let i = 0; i < div.childNodes.length; i++) {
          this.elements.push(div.childNodes[i] as Element);
        }
        return;
      }

      const elements = document.querySelectorAll(selector);
      for (let i = 0; i < elements.length; i++) {
        this.elements.push(elements[i]);
      }
      return;
    }

    if (selector instanceof NodeList) {
      for (let i = 0; i < selector.length; i++) {
        this.elements.push(selector[i] as Element);
      }
      return;
    }

    if (selector instanceof OneKit) {
      this.elements = [...selector.elements];
      return;
    }

    if (Array.isArray(selector)) {
      this.elements = [...selector];
      return;
    }
  }

  // Core methods
  first(): OneKit {
    if (this.elements.length > 0) {
      return new OneKit(this.elements[0]);
    }
    return new OneKit();
  }

  last(): OneKit {
    if (this.elements.length > 0) {
      return new OneKit(this.elements[this.elements.length - 1]);
    }
    return new OneKit();
  }

  each(callback: (this: Element, index: number, element: Element) => void): OneKit {
    for (let i = 0; i < this.elements.length; i++) {
      callback.call(this.elements[i], i, this.elements[i]);
    }
    return this;
  }

  find(selector: string): OneKit {
    const elements: Element[] = [];
    this.each(function() {
      const found = this.querySelectorAll(selector);
      for (let i = 0; i < found.length; i++) {
        elements.push(found[i] as Element);
      }
    });
    return new OneKit(elements);
  }

  // DOM manipulation methods
  class(className: string): OneKit {
    return this.each(function() {
      if (this.classList) {
        this.classList.add(className);
      } else {
        this.className += ' ' + className;
      }
    });
  }

  unclass(className: string): OneKit {
    return this.each(function() {
      if (this.classList) {
        this.classList.remove(className);
      } else {
        this.className = this.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
      }
    });
  }

  toggleClass(className: string): OneKit {
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

  html(content?: string): string | null | OneKit {
    if (content === undefined) {
      return this.elements.length > 0 ? this.elements[0].innerHTML : null;
    }
    return this.each(function() {
      this.innerHTML = sanitizeHTML(content);
    });
  }

  text(content?: string): string | null | OneKit {
    if (content === undefined) {
      return this.elements.length > 0 ? this.elements[0].textContent : null;
    }
    return this.each(function() {
      this.textContent = content;
    });
  }

  attr(name: string | Record<string, string>, value?: string): string | OneKit {
    if (typeof name === 'object') {
      return this.each(function() {
        for (const key in name) {
          this.setAttribute(key, name[key]);
        }
      });
    }

    if (value === undefined) {
      return this.elements.length > 0 ? this.elements[0].getAttribute(name) || '' : '';
    }
    return this.each(function() {
      this.setAttribute(name, value);
    });
  }

  unattr(name: string): OneKit {
    return this.each(function() {
      this.removeAttribute(name);
    });
  }

  css(prop: string | object, value?: string | number): string | null | OneKit {
    if (typeof prop === 'object') {
      return this.each(function() {
        const element = this as HTMLElement;
        for (const key in prop) {
          ((element as HTMLElement).style as any)[key] = (prop as any)[key];
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
      const element = this as HTMLElement;
      (element.style as any)[prop] = value;
    });
  }

  show(): OneKit {
    return this.each(function() {
      (this as HTMLElement).style.display = '';
    });
  }

  hide(): OneKit {
    return this.each(function() {
      (this as HTMLElement).style.display = 'none';
    });
  }

  toggle(): OneKit {
    return this.each(function() {
      const element = this as HTMLElement;
      element.style.display = element.style.display === 'none' ? '' : 'none';
    });
  }

  clone(): OneKit {
    const elements: Element[] = [];
    this.each(function() {
      elements.push(this.cloneNode(true) as Element);
    });
    return new OneKit(elements);
  }

  parent(): OneKit {
    if (this.elements.length > 0) {
      return new OneKit(this.elements[0].parentNode as Element);
    }
    return new OneKit();
  }

  kids(selector?: string): OneKit {
    const elements: Element[] = [];
    this.each(function() {
      const children = selector ?
        this.querySelectorAll(selector) :
        this.children;

      for (let i = 0; i < children.length; i++) {
        elements.push(children[i] as Element);
      }
    });
    return new OneKit(elements);
  }

  sibs(selector?: string): OneKit {
    const elements: Element[] = [];
    this.each(function() {
      if (this.parentNode) {
        const siblings = this.parentNode.children;

        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i] !== this && (!selector || (siblings[i] as Element).matches?.(selector))) {
            elements.push(siblings[i] as Element);
          }
        }
      }
    });
    return new OneKit(elements);
  }

  append(content: string | Element | OneKit): OneKit {
    return this.each(function() {
      if (typeof content === 'string') {
        const sanitized = sanitizeHTML(content);
        this.insertAdjacentHTML('beforeend', sanitized);
      } else if (content instanceof Element) {
        this.appendChild(content);
      } else if (content instanceof OneKit) {
        for (let i = 0; i < content.elements.length; i++) {
          this.appendChild(content.elements[i]);
        }
      }
    });
  }

  prepend(content: string | Element | OneKit): OneKit {
    return this.each(function() {
      if (typeof content === 'string') {
        const sanitized = sanitizeHTML(content);
        this.insertAdjacentHTML('afterbegin', sanitized);
      } else if (content instanceof Element) {
        this.insertBefore(content, this.firstChild);
      } else if (content instanceof OneKit) {
        for (let i = content.elements.length - 1; i >= 0; i--) {
          this.insertBefore(content.elements[i], this.firstChild);
        }
      }
    });
  }

  remove(): OneKit {
    return this.each(function() {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    });
  }

  on(event: string, selector?: string | Function, handler?: Function): OneKit {
    if (typeof selector === 'function') {
      handler = selector;
      selector = undefined;
    }

    return this.each(function() {
      if (selector && handler) {
        this.addEventListener(event, function(e: Event) {
          if (e.target && (e.target as Element).matches?.(selector)) {
            handler!.call(e.target, e);
          }
        });
      } else if (handler) {
        this.addEventListener(event, handler as EventListener);
      }
    });
  }

  off(event: string, handler: Function): OneKit {
    return this.each(function() {
      (this as HTMLElement).removeEventListener(event, handler as EventListener);
    });
  }

  click(handler: Function): OneKit {
    return this.on('click', handler);
  }

  hover(enterHandler: Function, leaveHandler: Function): OneKit {
    return this.on('mouseenter', enterHandler).on('mouseleave', leaveHandler);
  }

  focus(handler: Function): OneKit {
    return this.on('focus', handler);
  }

  // Animation methods
  fade_in(duration: number = 400): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this as HTMLElement;
        element.style.opacity = '0';
        element.style.display = '';

        const start = performance.now();

        function animate(time: number) {
          let timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;

          element.style.opacity = timeFraction.toString();

          if (timeFraction < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve(element);
          }
        }

        requestAnimationFrame(animate);
      });
    });
  }

  fade_out(duration: number = 400): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this as HTMLElement;
        const startOpacity = parseFloat(window.getComputedStyle(element).opacity);

        const start = performance.now();

        function animate(time: number) {
          let timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;

          element.style.opacity = (startOpacity * (1 - timeFraction)).toString();

          if (timeFraction < 1) {
            requestAnimationFrame(animate);
          } else {
            element.style.display = 'none';
            resolve(element);
          }
        }

        requestAnimationFrame(animate);
      });
    });
  }

  slide_up(duration: number = 400): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this as HTMLElement;
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
          resolve(element);
        }, duration);
      });
    });
  }

  slide_down(duration: number = 400): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this as HTMLElement;
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
          resolve(element);
        }, duration);
      });
    });
  }

  animate(props: Record<string, string | number>, duration: number = 400): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this as HTMLElement;
        const startValues: { [key: string]: number } = {};
        const changeValues: { [key: string]: number } = {};

        for (const prop in props) {
          const value = parseFloat(window.getComputedStyle(element)[prop as any]!) || 0;
          startValues[prop] = value;
          changeValues[prop] = parseFloat(props[prop] as string) - value;
        }

        const start = performance.now();

        function animateStep(time: number) {
          let timeFraction = (time - start) / duration;
          if (timeFraction > 1) timeFraction = 1;

          for (const prop in props) {
            (element.style as any)[prop] = startValues[prop] + changeValues[prop] * timeFraction +
              (typeof props[prop] === 'string' && (props[prop] as string).includes('px') ? 'px' : '');
          }

          if (timeFraction < 1) {
            requestAnimationFrame(animateStep);
          } else {
            resolve(element);
          }
        }

        requestAnimationFrame(animateStep);
      });
    });
  }

  move(x: number, y: number, duration: number = 300): Promise<Element> {
    return new Promise(resolve => {
      this.each(function() {
        const element = this;
        (element as HTMLElement).style.transition = `transform ${duration}ms ease-out`;
        (element as HTMLElement).style.transform = `translate3d(${x}px, ${y}px, 0)`;

        const handleTransitionEnd = () => {
          element.removeEventListener('transitionend', handleTransitionEnd);
          resolve(element);
        };
        element.addEventListener('transitionend', handleTransitionEnd);
      });
    });
  }

  // Form methods
  form_data(): object {
    if (this.elements.length === 0) return {};
    const form = this.elements[0] as HTMLFormElement;
    if (form.tagName !== 'FORM') return {};

    const data: { [key: string]: any } = {};
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const inputEl = input as HTMLInputElement;
      if (inputEl.name && !inputEl.disabled) {
        if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
          if (inputEl.checked) {
            if (data[inputEl.name] === undefined) {
              data[inputEl.name] = inputEl.value;
            } else if (Array.isArray(data[inputEl.name])) {
              data[inputEl.name].push(inputEl.value);
            } else {
              data[inputEl.name] = [data[inputEl.name], inputEl.value];
            }
          }
        } else if (inputEl.type !== 'file') {
          data[inputEl.name] = inputEl.value;
        }
      }
    });

    return data;
  }

  reset(): OneKit {
    return this.each(function() {
      if (this.tagName === 'FORM') {
        (this as HTMLFormElement).reset();
      }
    });
  }

  // Utility methods
  isVisible(): boolean {
    if (this.elements.length === 0) return false;
    const el = this.elements[0];
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  inViewport(threshold: number = 0): boolean {
    if (this.elements.length === 0) return false;
    const el = this.elements[0];
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
    const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);

    return vertInView && horInView;
  }

  getDimensions(): { width: number; height: number; innerWidth: number; innerHeight: number; top: number; left: number } {
    if (this.elements.length === 0) return { width: 0, height: 0, innerWidth: 0, innerHeight: 0, top: 0, left: 0 };
    const el = this.elements[0] as HTMLElement;
    return {
      width: el.offsetWidth,
      height: el.offsetHeight,
      innerWidth: el.clientWidth,
      innerHeight: el.clientHeight,
      top: el.offsetTop,
      left: el.offsetLeft
    };
  }

  log(): OneKit {
    if (this.elements.length > 0) {
      console.log(this.elements[0]);
    }
    return this;
  }

  info(): OneKit {
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

// Main function
export function ok(selector?: string | Element | NodeList | OneKit | Element[]): OneKit {
  return new OneKit(selector);
}

// Module registry
const modules: { [key: string]: Function } = {};

ok.module = function(name: string, factory: Function) {
  modules[name] = factory;
};

// Static cache
OneKit._cache = new Map<string, any>();

(OneKit as any).clearCache = function() {
  OneKit._cache.clear();
};

// Wrap critical methods with safeMethod
const criticalMethods = [
  'find', 'html', 'text', 'attr', 'css', 'append', 'prepend',
  'remove', 'on', 'off', 'fade_in', 'fade_out', 'slide_up',
  'slide_down', 'animate', 'move'
];

criticalMethods.forEach(methodName => {
  if ((OneKit.prototype as any)[methodName]) {
    const originalMethod = (OneKit.prototype as any)[methodName];
    (OneKit.prototype as any)[methodName] = safeMethod(originalMethod);
  }
});

// Initialize modules
const moduleNames = ['component', 'reactive', 'vdom', 'animation', 'gesture', 'api', 'utils', 'form', 'plugin', 'a11y', 'theme', 'router', 'storage', 'crypto', 'physics', 'timeline', 'scene3d', 'csp', 'cli', 'stories', 'wasm'];
moduleNames.forEach(name => {
  if (modules[name]) {
    modules[name]();
  }
});

// Global error handlers
window.addEventListener('unhandledrejection', function(event) {
  errorHandler(event.reason, 'Unhandled Promise Rejection');
  event.preventDefault();
});

window.addEventListener('error', function(event) {
  errorHandler(event.error, 'JavaScript Error');
});

// Expose to global
if (typeof window !== 'undefined') {
  (window as any).ok = ok;
  (window as any).OneKit = OneKit;
}
// Core OneKit functionality - Refactored into ES modules
