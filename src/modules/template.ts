// Template Engine Module with Directives
import { reactive, effect, computed } from './reactive';
import { sanitizeHTML } from '../core/security';

export interface DirectiveContext {
  element: Element;
  expression: string;
  modifiers: string[];
  value?: any;
  oldValue?: any;
  rootContext?: any;
}

export interface DirectiveHandler {
  bind?: (ctx: DirectiveContext) => void;
  update?: (ctx: DirectiveContext) => void;
  unbind?: (ctx: DirectiveContext) => void;
}

const directives: { [key: string]: DirectiveHandler } = {};

// Register a directive
export function registerDirective(name: string, handler: DirectiveHandler): void {
  directives[name] = handler;
}

// Parse directive from attribute name
function parseDirective(attrName: string): { name: string; modifiers: string[]; rawName: string } | null {
  const directiveRegex = /^ok-([a-zA-Z_][a-zA-Z0-9_]*)(?:\.(.*))?$/;
  const match = attrName.match(directiveRegex);
  if (!match) return null;

  const name = match[1];
  const modifiers = match[2] ? match[2].split('.') : [];

  return { name, modifiers, rawName: attrName };
}

// Evaluate expression in context
function evaluateExpression(expression: string, context: any): any {
  try {
    // Simple expression evaluation - in production, use a proper expression parser
    const func = new Function('context', `with(context) { return ${expression}; }`);
    return func(context);
  } catch (e) {
    console.error('Template expression error:', expression, e);
    return undefined;
  }
}

// Compile template with directives
export function compileTemplate(template: string, context: any): Element {
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = sanitizeHTML(template);

  // Process all elements for directives
  const elements = container.querySelectorAll('*');
  const directiveBindings: Array<{ element: Element; directive: string; expression: string; modifiers: string[]; cleanup?: () => void }> = [];

  elements.forEach(element => {
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const directive = parseDirective(attr.name);
      if (!directive) return;

      const { name, modifiers, rawName } = directive;
      const expression = attr.value;

      // Remove the directive attribute
      element.removeAttribute(rawName);

      // Store binding for later processing
      directiveBindings.push({
        element,
        directive: name,
        expression,
        modifiers
      });
    });
  });

  // Process directive bindings
  directiveBindings.forEach(binding => {
    const handler = directives[binding.directive];
    if (!handler) {
      console.warn(`Unknown directive: o-${binding.directive}`);
      return;
    }

    const directiveCtx: DirectiveContext = {
      element: binding.element,
      expression: binding.expression,
      modifiers: binding.modifiers
      ,rootContext: context
    };

    // Create reactive binding
    const getter = () => evaluateExpression(binding.expression, context);

    if (handler.bind) {
      directiveCtx.value = getter();
      handler.bind(directiveCtx);
    }

    if (handler.update) {
      // Create effect for reactive updates
      const effectFn = effect(() => {
        const newValue = getter();
        directiveCtx.oldValue = directiveCtx.value;
        directiveCtx.value = newValue;
        handler.update!(directiveCtx);
      });

      binding.cleanup = () => {
        // Cleanup effect
      };
    }
  });

  // Return the first child (the actual template content)
  return container.firstElementChild as Element || container;
}

// Built-in directives

// ok-if directive
registerDirective('if', {
  bind(ctx) {
    (ctx.element as HTMLElement).style.display = ctx.value ? '' : 'none';
  },
  update(ctx) {
    (ctx.element as HTMLElement).style.display = ctx.value ? '' : 'none';
  }
});

// v-show directive
registerDirective('show', {
  bind(ctx) {
    (ctx.element as HTMLElement).style.display = ctx.value ? '' : 'none';
  },
  update(ctx) {
    (ctx.element as HTMLElement).style.display = ctx.value ? '' : 'none';
  }
});

// ok-for directive
registerDirective('for', {
  bind(ctx) {
    // ok-for="item in items" or ok-for="(item, index) in items"
    const forMatch = ctx.expression.match(/^\s*\(?(\w+)(?:\s*,\s*(\w+))?\)?\s+in\s+(.+)$/);
    if (!forMatch) {
      console.error('Invalid ok-for expression:', ctx.expression);
      return;
    }

    const [, itemName, indexName, collectionExpr] = forMatch;
    const collection = evaluateExpression(collectionExpr, ctx.rootContext);

    if (!Array.isArray(collection)) {
      console.error('ok-for collection must be an array:', collectionExpr);
      return;
    }

    // Store original element
    const originalElement = ctx.element;
    const parent = originalElement.parentElement;
    if (!parent) return;

    // Remove original element
    parent.removeChild(originalElement);

    // Determine insertion behavior from modifiers: numeric index, 'start' or 'prepend'
    const insertModifier = (ctx.modifiers || []).find((m: string) => /^\d+$/.test(m) || m === 'start' || m === 'prepend');

    // Build clones first so we can insert them in a fragment to preserve order
    const clones: Element[] = [];
    collection.forEach((item: any, index: number) => {
      const clone = originalElement.cloneNode(true) as Element;

      // Create item context
      const itemContext: any = { [itemName]: item };
      if (indexName) {
        itemContext[indexName] = index;
      }

      // Compile clone with merged root context and item context
      const compiledClone = compileTemplate(clone.outerHTML, { ...ctx.rootContext, ...itemContext });
      clones.push(compiledClone);
    });

    if (insertModifier) {
      // Numeric index
      let insertIndex: number | undefined;
      if (/^\d+$/.test(insertModifier)) {
        insertIndex = parseInt(insertModifier, 10);
      } else if (insertModifier === 'start' || insertModifier === 'prepend') {
        insertIndex = 0;
      }

      const fragment = document.createDocumentFragment();
      clones.forEach(c => fragment.appendChild(c));

      if (typeof insertIndex === 'number') {
        const refChild = parent.children[insertIndex] || null;
        parent.insertBefore(fragment, refChild);
      } else {
        // Fallback to append
        parent.appendChild(fragment);
      }
    } else {
      // Default: append in order
      clones.forEach(c => parent.appendChild(c));
    }
  }
});

// v-bind directive
registerDirective('bind', {
  bind(ctx) {
    updateBind(ctx);
  },
  update(ctx) {
    updateBind(ctx);
  }
});

function updateBind(ctx: DirectiveContext) {
  const element = ctx.element as HTMLElement;
  const attrName = ctx.modifiers[0] || 'value'; // Default to 'value' if no modifier

  if (attrName === 'class') {
    element.className = ctx.value;
  } else if (attrName === 'style') {
    Object.assign(element.style, ctx.value);
  } else {
    element.setAttribute(attrName, ctx.value);
  }
}

// o-model directive
registerDirective('model', {
  bind(ctx) {
    const element = ctx.element as HTMLInputElement;
    const eventType = getEventType(element);

    // Set initial value
    setElementValue(element, ctx.value);

    // Listen for changes
    const handler = () => {
      const newValue = getElementValue(element);
      // Update reactive value
      const keys = ctx.expression.split('.');
      let target = ctx.value;
      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = newValue;
    };

    element.addEventListener(eventType, handler);

    // Store cleanup
    (element as any)._vmodelCleanup = handler;
  },
  update(ctx) {
    const element = ctx.element as HTMLInputElement;
    setElementValue(element, ctx.value);
  },
  unbind(ctx) {
    const element = ctx.element as HTMLInputElement;
    const handler = (element as any)._vmodelCleanup;
    if (handler) {
      const eventType = getEventType(element);
      element.removeEventListener(eventType, handler);
    }
  }
});

function getEventType(element: HTMLInputElement): string {
  const tagName = element.tagName.toLowerCase();
  const type = element.type;

  if (tagName === 'select') return 'change';
  if (type === 'checkbox' || type === 'radio') return 'change';
  return 'input';
}

function getElementValue(element: HTMLElement): any {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'select') {
    const select = element as HTMLSelectElement;
    if (select.multiple) {
      return Array.from(select.selectedOptions).map(option => option.value);
    }
    return select.value;
  }

  const inputElement = element as HTMLInputElement;
  const type = inputElement.type;

  if (type === 'checkbox') {
    return inputElement.checked;
  }

  if (type === 'radio') {
    return inputElement.checked ? inputElement.value : undefined;
  }

  if (type === 'number') {
    return parseFloat(inputElement.value) || 0;
  }

  return inputElement.value;
}

function setElementValue(element: HTMLElement, value: any): void {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'select') {
    const select = element as HTMLSelectElement;
    if (select.multiple && Array.isArray(value)) {
      Array.from(select.options).forEach(option => {
        option.selected = value.includes(option.value);
      });
    } else {
      select.value = value;
    }
    return;
  }

  const inputElement = element as HTMLInputElement;
  const type = inputElement.type;

  if (type === 'checkbox') {
    inputElement.checked = Boolean(value);
    return;
  }

  if (type === 'radio') {
    inputElement.checked = inputElement.value === value;
    return;
  }

  inputElement.value = value;
}

// v-on directive
registerDirective('on', {
  bind(ctx) {
    const element = ctx.element;
    const eventType = ctx.modifiers[0] || 'click'; // Default to click

    const handler = (event: Event) => {
      // Prevent default if .prevent modifier
      if (ctx.modifiers.includes('prevent')) {
        event.preventDefault();
      }

      // Stop propagation if .stop modifier
      if (ctx.modifiers.includes('stop')) {
        event.stopPropagation();
      }

      // Evaluate expression
      evaluateExpression(ctx.expression, ctx.value);
    };

    element.addEventListener(eventType, handler);

    // Store cleanup
    (element as any)._vonCleanup = { eventType, handler };
  },
  unbind(ctx) {
    const element = ctx.element;
    const cleanup = (element as any)._vonCleanup;
    if (cleanup) {
      element.removeEventListener(cleanup.eventType, cleanup.handler);
    }
  }
});

// Initialize built-in directives
export function initTemplateEngine(): void {
  // Directives are already registered above
}
