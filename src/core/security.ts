// Security utilities for OneKit
export interface SecurityConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTRIBUTES: string[];
  enableSanitization: boolean;
  enableValidation: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'br', 'strong', 'em', 'b', 'i',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'button',
    'form', 'label', 'select', 'option', 'textarea'
  ],
  ALLOWED_ATTRIBUTES: [
    'id', 'class', 'style', 'href', 'src', 'alt', 'title', 'type',
    'name', 'value', 'placeholder', 'disabled', 'checked', 'selected',
    'width', 'height', 'colspan', 'rowspan', 'data-*'
  ],
  enableSanitization: true,
  enableValidation: true
};

let securityConfig = { ...DEFAULT_SECURITY_CONFIG };

// Sanitize HTML content with enhanced security
export function sanitizeHTML(html: string): string {
  if (!securityConfig.enableSanitization) return html;

  const div = document.createElement('div');
  div.innerHTML = html;

  const sanitizeNode = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!securityConfig.ALLOWED_TAGS.includes(tagName)) {
        element.remove();
        return;
      }

      // Remove disallowed attributes and dangerous ones
      const attributes = Array.from(element.attributes);
      for (const attr of attributes) {
        const attrName = attr.name.toLowerCase();
        const attrValue = attr.value;

        // Check for dangerous attribute patterns
        const dangerousAttrPatterns = [
          /^on\w+$/i, // Event handlers
          /^javascript:/i,
          /^vbscript:/i,
          /^data:/i,
          /expression\s*\(/i,
          /eval\s*\(/i,
          /Function\s*\(/i
        ];

        const isDangerous = dangerousAttrPatterns.some(pattern => pattern.test(attrName) || pattern.test(attrValue));

        const isAllowed = securityConfig.ALLOWED_ATTRIBUTES.some(allowed => {
          if (allowed.endsWith('*')) {
            return attrName.startsWith(allowed.slice(0, -1));
          }
          return attrName === allowed;
        });

        if (!isAllowed || isDangerous) {
          element.removeAttribute(attr.name);
        }
      }

      // Sanitize children
      const children = Array.from(element.childNodes);
      for (const child of children) {
        sanitizeNode(child);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      // Ensure text nodes don't contain dangerous content
      const textContent = node.textContent || '';
      const dangerousTextPatterns = [
        /javascript:/i,
        /vbscript:/i,
        /data:/i,
        /on\w+\s*=/i
      ];

      if (dangerousTextPatterns.some(pattern => pattern.test(textContent))) {
        node.textContent = textContent.replace(/javascript:|vbscript:|data:|on\w+=/gi, '');
      }
    }
  };

  sanitizeNode(div);
  return div.innerHTML;
}

// Validate CSS selector for security
export function validateSelector(selector: string): boolean {
  if (!securityConfig.enableValidation) return true;

  // Basic validation - prevent script injection
  const dangerousPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /expression\s*\(/i,
    /on\w+\s*=/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(selector));
}

// Sanitize URL
export function sanitizeURL(url: string): string {
  if (!securityConfig.enableValidation) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

// Deep clone with security checks
export function deepCloneSafe(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (typeof obj === 'function') return obj; // Functions are allowed but not cloned

  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneSafe(item));
  }

  const cloned: { [key: string]: any } = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepCloneSafe(obj[key]);
    }
  }
  return cloned;
}

// Validate storage key
export function validateStorageKey(key: string): boolean {
  if (!securityConfig.enableValidation) return true;

  // Prevent prototype pollution and other attacks
  const dangerousKeys = [
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf'
  ];

  return !dangerousKeys.includes(key) && typeof key === 'string' && key.length > 0;
}

// Update security configuration
export function updateSecurityConfig(config: Partial<SecurityConfig>): void {
  securityConfig = { ...securityConfig, ...config };
}

// Get current security configuration
export function getSecurityConfig(): SecurityConfig {
  return { ...securityConfig };
}

// Generate Content Security Policy header
export function generateCSPHeader(directives?: Record<string, string[]>): string {
  const defaultDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  };

  const finalDirectives = { ...defaultDirectives, ...directives };
  return Object.entries(finalDirectives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// Validate JSON input for security
export function validateJSON(jsonString: string): boolean {
  if (!securityConfig.enableValidation) return true;

  try {
    const parsed = JSON.parse(jsonString);
    // Check for prototype pollution attempts
    const checkObject = (obj: any): boolean => {
      if (obj === null || typeof obj !== 'object') return true;
      if (Array.isArray(obj)) return obj.every(checkObject);
      return Object.keys(obj).every(key => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) return false;
        return checkObject(obj[key]);
      });
    };
    return checkObject(parsed);
  } catch {
    return false;
  }
}

// Sanitize user input for database/storage
export function sanitizeInput(input: string): string {
  if (!securityConfig.enableSanitization) return input;

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\0/g, ''); // Remove null bytes
}
