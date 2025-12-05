// Accessibility Helpers Module
import { errorHandler } from '../core/error-handler';

interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-readonly'?: boolean;
  'aria-multiselectable'?: boolean;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-level'?: number;
  'aria-posinset'?: number;
  'aria-setsize'?: number;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-pressed'?: boolean | 'mixed';
  'aria-checked'?: boolean | 'mixed';
  'aria-selected'?: boolean | 'mixed';
  'role'?: string;
  tabindex?: number;
}

interface AccessibilityValidationResult {
  errors: string[];
  warnings: string[];
}

export function setAriaAttributes(element: Element, attributes: AriaAttributes): void {
  try {
    for (const [attr, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  } catch (error) {
    errorHandler(error, 'setAriaAttributes');
  }
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  try {
    let announcer = document.getElementById('onekit-a11y-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'onekit-a11y-announcer';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
    }

    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
  } catch (error) {
    errorHandler(error, 'announce');
  }
}

export function trapFocus(container: Element): () => void {
  try {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown as EventListener);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  } catch (error) {
    errorHandler(error, 'trapFocus');
    return () => {};
  }
}

export function makeFocusable(element: Element): void {
  try {
    element.setAttribute('tabindex', '0');
  } catch (error) {
    errorHandler(error, 'makeFocusable');
  }
}

export function makeUnfocusable(element: Element): void {
  try {
    element.setAttribute('tabindex', '-1');
  } catch (error) {
    errorHandler(error, 'makeUnfocusable');
  }
}

export function skipToContent(targetId: string): void {
  try {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  } catch (error) {
    errorHandler(error, 'skipToContent');
  }
}

export function createSkipLink(href: string, text: string = 'Skip to main content'): HTMLAnchorElement {
  try {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    link.className = 'skip-link';
    link.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
      transition: top 0.3s;
    `;

    link.addEventListener('focus', () => {
      link.style.top = '6px';
    });

    link.addEventListener('blur', () => {
      link.style.top = '-40px';
    });

    return link;
  } catch (error) {
    errorHandler(error, 'createSkipLink');
    return document.createElement('a');
  }
}

export function manageTabOrder(container: Element, enabled: boolean = true): void {
  try {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      if (enabled) {
        if (element.hasAttribute('data-original-tabindex')) {
          element.setAttribute('tabindex', element.getAttribute('data-original-tabindex')!);
          element.removeAttribute('data-original-tabindex');
        }
      } else {
        if (!element.hasAttribute('data-original-tabindex')) {
          element.setAttribute('data-original-tabindex', element.getAttribute('tabindex') || '0');
        }
        element.setAttribute('tabindex', '-1');
      }
    });
  } catch (error) {
    errorHandler(error, 'manageTabOrder');
  }
}

export function createLandmarks(): void {
  try {
    // Ensure common landmarks exist
    const landmarks = [
      { id: 'main', role: 'main', selector: 'main, [role="main"]' },
      { id: 'navigation', role: 'navigation', selector: 'nav, [role="navigation"]' },
      { id: 'banner', role: 'banner', selector: 'header, [role="banner"]' },
      { id: 'contentinfo', role: 'contentinfo', selector: 'footer, [role="contentinfo"]' }
    ];

    landmarks.forEach(({ id, role, selector }) => {
      if (!document.getElementById(id)) {
        const element = document.querySelector(selector);
        if (element && !element.hasAttribute('role')) {
          element.id = id;
          element.setAttribute('role', role);
        }
      }
    });
  } catch (error) {
    errorHandler(error, 'createLandmarks');
  }
}

export function validateAccessibility(element: Element): AccessibilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check for alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        errors.push('Image missing alt attribute');
      }
    });

    // Check for labels on form inputs
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.id;
      const label = element.querySelector(`label[for="${id}"]`);
      if (!label && !input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
        warnings.push('Form input may be missing a label');
      }
    });

    // Check for heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level - lastLevel > 1) {
        warnings.push('Heading hierarchy may be broken');
      }
      lastLevel = level;
    });

    // Check for color contrast (basic check)
    const elementsWithColor = element.querySelectorAll('[style*="color"], [style*="background"]');
    if (elementsWithColor.length > 0) {
      warnings.push('Manual color contrast check recommended for styled elements');
    }

  } catch (error) {
    errorHandler(error, 'validateAccessibility');
  }

  return { errors, warnings };
}
