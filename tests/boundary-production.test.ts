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
});
