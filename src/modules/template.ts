// Template Engine Module with Directives
import { reactive, effect, stop } from './reactive';
import { effectScope, onScopeDispose } from '../core/scope';
import { sanitizeHTML, sanitizeURL } from '../core/security';
import { evaluateSafeExpression } from './expression';

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

// Evaluate the deliberately small, side-effect-limited expression grammar.
// No dynamic JavaScript compilation is used here.
function evaluateExpression(expression: string, context: any): any {
  return evaluateSafeExpression(expression, context ?? {});
}

function assignExpression(expression: string, context: any, value: any): boolean {
  const path = expression.trim().split('.');
  if (!path.length || path.some(part => !/^[A-Za-z_$][\w$]*$/.test(part))) return false;

  let target = context;
  for (const key of path.slice(0, -1)) {
    if (target == null || typeof target !== 'object') return false;
    target = target[key];
  }
  if (target == null || typeof target !== 'object') return false;
  target[path[path.length - 1]] = value;
  return true;
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
      // Event expressions must run only when the event fires, not during bind.
      directiveCtx.value = binding.directive === 'on' ? undefined : getter();
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
        stop(effectFn);
        handler.unbind?.(directiveCtx);
      };
      (binding.element as any).__onekitTemplateCleanup = binding.cleanup;
    }
  });

  // Compile text interpolations into fine-grained text-node effects.
  // Each effect updates only its own text node instead of replacing the root DOM.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let currentNode: Node | null = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const source = textNode.nodeValue ?? '';
    if (!/\{\{[^}]+\}\}/.test(source)) return;

    effect(() => {
      const rendered = source.replace(/\{\{([^}]+)\}\}/g, (_match, expression) => {
        const value = evaluateExpression(String(expression).trim(), context);
        return value === undefined || value === null ? '' : String(value);
      });
      textNode.nodeValue = rendered;
    });
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
    const forMatch = ctx.expression.match(/^\s*\(?(\w+)(?:\s*,\s*(\w+))?\)?\s+in\s+(.+)$/);
    if (!forMatch) {
      console.error('Invalid ok-for expression:', ctx.expression);
      return;
    }

    const [, itemName, indexName, collectionExpr] = forMatch;
    const templateElement = ctx.element.cloneNode(true) as Element;
    const parent = ctx.element.parentElement;
    if (!parent) return;
    parent.removeChild(ctx.element);

    type ListBlock = { key: string | number; element: Element; scope: ReturnType<typeof effectScope>; context: Record<string, unknown> };
    let blocks = new Map<string | number, ListBlock>();

    const itemKey = (item: unknown, index: number): string | number => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const key = record.id ?? record.key;
        if (typeof key === 'string' || typeof key === 'number') return key;
      }
      return index;
    };

    const renderList = (items: unknown): void => {
      if (!Array.isArray(items)) {
        console.error('ok-for collection must be an array:', collectionExpr);
        return;
      }

      const nextBlocks = new Map<string | number, ListBlock>();
      const ordered: Element[] = [];
      const seenKeys = new Set<string | number>();
      items.forEach((item, index) => {
        const baseKey = itemKey(item, index);
        let key: string | number = baseKey;
        if (seenKeys.has(baseKey)) {
          key = `${String(baseKey)}::duplicate:${index}`;
          console.warn(`[OneKit] Duplicate ok-for key "${String(baseKey)}"; using a positional fallback for item ${index}.`);
        }
        seenKeys.add(key);
        const previous = blocks.get(key);
        if (previous) {
          previous.context[itemName] = item;
          if (indexName) previous.context[indexName] = index;
          nextBlocks.set(key, previous);
          ordered.push(previous.element);
          return;
        }

        const context = reactive({
          ...ctx.rootContext,
          [itemName]: item,
          ...(indexName ? { [indexName]: index } : {}),
        });
        const scope = effectScope(true);
        const element = scope.run(() => compileTemplate(templateElement.outerHTML, context));
        const block = { key, element, scope, context };
        nextBlocks.set(key, block);
        ordered.push(element);
      });

      blocks.forEach((block, key) => {
        if (!nextBlocks.has(key)) block.scope.dispose();
      });

      ordered.forEach((element, index) => {
        const anchor = parent.childNodes[index] ?? null;
        if (anchor !== element) parent.insertBefore(element, anchor);
      });
      Array.from(parent.childNodes).forEach((node) => {
        if (!ordered.includes(node as Element)) parent.removeChild(node);
      });
      blocks = nextBlocks;
    };

    (ctx.element as any).__onekitForUpdate = renderList;
    (ctx.element as any).__onekitForCollectionExpr = collectionExpr;
    renderList(evaluateExpression(collectionExpr, ctx.rootContext));
    onScopeDispose(() => {
      blocks.forEach(block => block.scope.dispose());
      blocks.clear();
    });
  },
  update(ctx) {
    const element = ctx.element as any;
    const renderList = element.__onekitForUpdate as ((items: unknown) => void) | undefined;
    const collectionExpr = element.__onekitForCollectionExpr as string | undefined;
    renderList?.(collectionExpr ? evaluateExpression(collectionExpr, ctx.rootContext) : ctx.value);
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
    element.className = ctx.value == null ? '' : String(ctx.value);
  } else if (attrName === 'style') {
    if (ctx.value && typeof ctx.value === 'object') {
      Object.assign(element.style, ctx.value);
    } else {
      element.removeAttribute('style');
    }
  } else if (attrName === 'href' || attrName === 'src') {
    const safeURL = ctx.value == null ? '' : sanitizeURL(String(ctx.value));
    if (safeURL) element.setAttribute(attrName, safeURL);
    else element.removeAttribute(attrName);
  } else if (ctx.value == null || ctx.value === false) {
    element.removeAttribute(attrName);
  } else {
    element.setAttribute(attrName, String(ctx.value));
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
      if (!assignExpression(ctx.expression, ctx.rootContext, newValue)) {
        console.error('ok-model expression must be an assignable property path:', ctx.expression);
      }
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

      // Preserve the reactive root Proxy so methods and state remain available.
      const eventContext = new Proxy({ $event: event }, {
        get(target, key: string | symbol) {
          if (key === '$event') return target.$event;
          return ctx.rootContext?.[key as string];
        },
        has(_target, key: string | symbol) {
          return key === '$event' || key in (ctx.rootContext ?? {});
        },
      });
      evaluateExpression(ctx.expression, eventContext);
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
