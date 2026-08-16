import { OneKit } from '../src/core/index';
import {
  announce,
  createLandmarks,
  createSkipLink,
  manageTabOrder,
  setAriaAttributes,
  skipToContent,
  trapFocus,
  validateAccessibility,
} from '../src/modules/a11y';
import { animations } from '../src/modules/animation';
import { createStorage } from '../src/modules/storage';

describe('low-coverage DOM and storage contracts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  it('manages ARIA attributes, announcements, landmarks, and skip links', () => {
    const button = document.createElement('button');
    setAriaAttributes(button, { 'aria-label': 'Open', 'aria-expanded': true, role: 'button' });
    expect(button.getAttribute('aria-label')).toBe('Open');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    setAriaAttributes(button, { 'aria-label': undefined });
    expect(button.hasAttribute('aria-label')).toBe(false);

    document.body.append(button);
    announce('Saved', 'assertive');
    announce('Saved again', 'polite');
    const announcer = document.getElementById('onekit-a11y-announcer');
    expect(announcer?.textContent).toBe('Saved again');
    expect(announcer?.getAttribute('aria-live')).toBe('polite');

    document.body.innerHTML = '<header></header><nav></nav><main></main><footer></footer>';
    createLandmarks();
    expect(document.querySelector('main')?.getAttribute('role')).toBe('main');
    expect(document.querySelector('nav')?.id).toBe('navigation');
    expect(document.querySelector('header')?.id).toBe('banner');
    expect(document.querySelector('footer')?.id).toBe('contentinfo');

    const link = createSkipLink('#content', 'Skip');
    document.body.append(link);
    link.dispatchEvent(new FocusEvent('focus'));
    expect(link.style.top).toBe('6px');
    link.dispatchEvent(new FocusEvent('blur'));
    expect(link.style.top).toBe('-40px');
  });

  it('traps focus, manages tab order, and validates accessibility structure', () => {
    document.body.innerHTML = `
      <section id="dialog">
        <button id="first">First</button>
        <input id="field" />
        <button id="last">Last</button>
      </section>
      <main id="content" tabindex="-1"></main>
    `;
    const dialog = document.getElementById('dialog')!;
    const first = document.getElementById('first') as HTMLButtonElement;
    const last = document.getElementById('last') as HTMLButtonElement;
    const cleanup = trapFocus(dialog);
    expect(document.activeElement).toBe(first);

    last.focus();
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(forward);
    expect(document.activeElement).toBe(first);
    expect(forward.defaultPrevented).toBe(true);

    first.focus();
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    dialog.dispatchEvent(backward);
    expect(document.activeElement).toBe(last);
    expect(backward.defaultPrevented).toBe(true);
    cleanup();

    manageTabOrder(dialog, false);
    expect(first.getAttribute('tabindex')).toBe('-1');
    manageTabOrder(dialog, true);
    expect(first.getAttribute('tabindex')).toBe('0');

    const content = document.getElementById('content')!;
    content.scrollIntoView = jest.fn();
    skipToContent('content');
    expect(document.activeElement).toBe(content);
    expect(content.scrollIntoView).toHaveBeenCalled();

    const missingAlt = document.createElement('img');
    document.body.append(missingAlt);
    const result = validateAccessibility(document.body);
    expect(result.errors).toContain('Image missing alt attribute');
  });

  it('stores values with prefixes, TTL, custom serializers, and cleanup', () => {
    const values = new Map<string, string>();
    const backing = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      removeItem: (key: string) => { values.delete(key); },
      setItem: (key: string, value: string) => { values.set(key, value); },
    } as Storage;
    const storage = createStorage(backing, { prefix: 'test_', serialize: String, deserialize: Number });

    expect(storage.set('count', 3)).toBe(true);
    expect(storage.get('count')).toBe(3);
    expect(storage.has('count')).toBe(true);
    expect(storage.keys()).toEqual(['count']);
    expect(storage.size()).toBe(1);
    expect(storage.remove('count')).toBe(true);
    expect(storage.get('count', 9)).toBe(9);

    storage.set('a', 1);
    storage.set('b', 2);
    values.set('test_broken', '{not-json');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(storage.keys()).toEqual(['a', 'b']);
    errorSpy.mockRestore();
    storage.clear();
    expect(storage.size()).toBe(0);
  });

  it('applies animation helpers and restores transient styles', () => {
    jest.useFakeTimers();
    const element = document.createElement('div');
    document.body.append(element);
    const kit = new OneKit(element);

    animations.scaleIn.call(kit, 10);
    expect(element.style.transform).toBe('scale(1)');
    expect(element.style.opacity).toBe('1');
    jest.advanceTimersByTime(10);
    expect(element.style.transition).toBe('');

    animations.flip.call(kit, 10);
    expect(element.style.transform).toBe('rotateY(360deg)');
    jest.advanceTimersByTime(10);
    expect(element.style.transform).toBe('');
  });
});
