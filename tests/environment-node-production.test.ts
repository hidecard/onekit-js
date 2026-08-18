/** @jest-environment node */

import {
  assertClient,
  assertServer,
  clientOnly,
  getRuntimeEnvironment,
  isClientRuntime,
  isServerRuntime,
  serverOnly,
} from '../src/modules/environment';

describe('server environment boundary production contracts', () => {
  it('detects the server and does not evaluate browser-only callbacks', () => {
    expect(getRuntimeEnvironment()).toBe('server');
    expect(isServerRuntime()).toBe(true);
    expect(isClientRuntime()).toBe(false);
    expect(serverOnly(() => 'server')).toBe('server');
    expect(clientOnly(() => 'browser')).toBeUndefined();
    expect(() => assertServer()).not.toThrow();
    expect(() => assertClient()).toThrow('only available in a browser');
  });
});
