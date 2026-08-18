import {
  createErrorReport,
  enableDevTools,
  errorHandler,
  isDevToolsEnabled,
  setErrorReporter
} from '../src';

describe('production error observability', () => {
  afterEach(() => {
    if (isDevToolsEnabled()) enableDevTools().dispose();
  });

  it('normalizes unknown values without retaining the original object', () => {
    const report = createErrorReport({ secret: 'do-not-forward' }, 'loader');
    expect(report.context).toBe('loader');
    expect(report.error.name).toBe('Error');
    expect(report.error.message).toBe('[object Object]');
    expect(report.error).not.toHaveProperty('secret');
  });

  it('emits a redacted runtime error event only when DevTools is enabled', () => {
    const bridge = enableDevTools({ historySize: 5 });
    errorHandler(new Error('render failed'), 'render');
    const event = bridge.getHistory().find(item => item.type === 'runtime:error');
    expect(event).toMatchObject({
      type: 'runtime:error',
      context: 'render',
      error: { name: 'Error', message: 'render failed' }
    });
  });

  it('isolates reporter failures and restores the previous reporter', () => {
    const first = jest.fn();
    const restoreFirst = setErrorReporter(first);
    const second = jest.fn(() => { throw new Error('reporter failure'); });
    const restoreSecond = setErrorReporter(second);

    expect(() => errorHandler('safe', 'test')).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    restoreSecond();
    errorHandler('restored', 'test');
    expect(first).toHaveBeenCalledTimes(1);

    restoreFirst();
  });
});
