import {
  assertClient,
  assertServer,
  clientOnly,
  getRuntimeEnvironment,
  isClientRuntime,
  isServerRuntime,
  serverOnly,
} from '../src/index';

describe('environment boundary production contracts', () => {
  it('detects the browser and executes client-only callbacks', () => {
    expect(getRuntimeEnvironment()).toBe('client');
    expect(isClientRuntime()).toBe(true);
    expect(isServerRuntime()).toBe(false);
    expect(clientOnly(() => 'browser')).toBe('browser');
    expect(serverOnly(() => 'server')).toBeUndefined();
    expect(() => assertClient()).not.toThrow();
    expect(() => assertServer()).toThrow('only available during server rendering');
  });

  it('supports custom assertion messages', () => {
    expect(() => assertServer('server-only')).toThrow('server-only');
    expect(() => assertClient('client-only')).not.toThrow();
  });
});
