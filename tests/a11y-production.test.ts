import { makeFocusable, trapFocus } from '../src/modules/a11y';

describe('A11y production contract', () => {
  it('restores the previously focused element when a focus trap is released', () => {
    const previous = document.createElement('button');
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    container.append(first, second);
    document.body.append(previous, container);
    previous.focus();

    const release = trapFocus(container);
    expect(document.activeElement).toBe(first);
    release();
    expect(document.activeElement).toBe(previous);
  });

  it('does not throw for a container without focusable elements', () => {
    const container = document.createElement('div');
    document.body.append(container);
    expect(() => trapFocus(container)).not.toThrow();
  });

  it('supports explicit focusability for custom controls', () => {
    const element = document.createElement('div');
    makeFocusable(element);
    expect(element.getAttribute('tabindex')).toBe('0');
  });
});

afterEach(() => {
  document.body.innerHTML = '';
});
