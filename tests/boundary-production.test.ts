import { createErrorBoundary, createLoadingBoundary } from '../src/index';

describe('boundary production contracts', () => {
  it('renders fallback for synchronous errors and can reset', () => {
    const onError = jest.fn();
    const boundary = createErrorBoundary({
      fallback: (error, reset) => `fallback:${error.message}:${typeof reset}`,
      onError,
    });

    expect(boundary.render(() => 'ok')).toBe('ok');
    expect(boundary.render(() => { throw new Error('boom'); }, 'render')).toBe('fallback:boom:function');
    expect(boundary.state.error?.message).toBe('boom');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'render');

    boundary.reset();
    expect(boundary.state.error).toBeNull();
  });

  it('ignores stale loading results when a newer run completes first', async () => {
    const boundary = createLoadingBoundary<string>();
    let resolveSlow!: (value: string) => void;
    let resolveFast!: (value: string) => void;
    const slow = boundary.run(() => new Promise<string>(done => { resolveSlow = done; }));
    const fast = boundary.run(() => new Promise<string>(done => { resolveFast = done; }));

    resolveFast('fast');
    await expect(fast).resolves.toBe('fast');
    resolveSlow('slow');
    await expect(slow).resolves.toBe('slow');

    expect(boundary.state.pending).toBe(false);
    expect(boundary.render('loading', 'empty')).toBe('fast');
  });

  it('tracks async pending state and resolves the ready value', async () => {
    const boundary = createLoadingBoundary<string>();
    let resolve!: (value: string) => void;
    const promise = new Promise<string>(done => { resolve = done; });

    const pending = boundary.run(() => promise);
    expect(boundary.state.pending).toBe(true);
    expect(boundary.render('loading', 'empty')).toBe('loading');

    resolve('ready');
    await expect(pending).resolves.toBe('ready');
    expect(boundary.state.pending).toBe(false);
    expect(boundary.render('loading', 'empty')).toBe('ready');
  });

  it('does not let reset stale an in-flight error boundary run', async () => {
    const boundary = createErrorBoundary<string>({ fallback: error => `fallback:${error.message}` });
    let reject!: (error: Error) => void;
    const pending = boundary.runAsync(() => new Promise<string>((_, fail) => { reject = fail; }));

    boundary.reset();
    reject(new Error('stale'));
    await expect(pending).rejects.toThrow('stale');
    expect(boundary.state.error).toBeNull();
    expect(boundary.state.pending).toBe(false);
  });
});
