import { nextTick } from '../src/index';
import {
  deepCloneSafe,
  sanitizeHTML,
  sanitizeInput,
  sanitizeURL,
  validateJSON,
} from '../src/core/security';

describe('V3 quality gates', () => {
  it('rejects unsafe URLs and strips executable input patterns', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
    expect(sanitizeURL('https://example.com/docs')).toBe('https://example.com/docs');
    expect(sanitizeInput('<script>alert(1)</script>javascript:evil()')).toBe('evil()');
  });

  it('sanitizes unsafe HTML while retaining safe content', () => {
    const output = sanitizeHTML('<section><p>Hello</p><script>alert(1)</script><img src="x" onerror="boom"></section>');
    expect(output).toContain('<section>');
    expect(output).toContain('<p>Hello</p>');
    expect(output).not.toContain('<script');
    expect(output).not.toContain('onerror');
  });

  it('rejects prototype-pollution JSON keys', () => {
    expect(validateJSON('{"safe":true}')).toBe(true);
    expect(validateJSON('{"__proto__":{"polluted":true}}')).toBe(false);
    expect(validateJSON('{not-json}')).toBe(false);
  });

  it('deep-clones supported built-in values without sharing objects', () => {
    const source = {
      nested: { value: 1 },
      date: new Date('2024-01-01T00:00:00.000Z'),
      pattern: /v3/gi,
    };
    const clone = deepCloneSafe(source);

    expect(clone).not.toBe(source);
    expect(clone.nested).not.toBe(source.nested);
    expect(clone.nested).toEqual({ value: 1 });
    expect(clone.date).toEqual(source.date);
    expect(clone.pattern).toEqual(source.pattern);
  });

  it('runs nextTick work after the current synchronous turn', async () => {
    const order: string[] = [];
    order.push('before');
    const pending = nextTick(() => order.push('tick'));
    order.push('after');
    await pending;
    expect(order).toEqual(['before', 'after', 'tick']);
  });
});
