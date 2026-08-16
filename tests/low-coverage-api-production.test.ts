import { API, get, request } from '../src/modules/api';
import { registerWebComponent } from '../src/modules/web-components';

describe('low-coverage API and web-component contracts', () => {
  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('rejects unsafe URLs before opening a request', async () => {
    await expect(request('javascript:alert(1)')).rejects.toThrow('Invalid URL');
  });

  it('parses JSON responses and exposes convenience methods', async () => {
    const open = jest.fn();
    const send = jest.fn(function(this: any) {
      this.status = 200;
      this.statusText = 'OK';
      this.responseText = '{"ok":true}';
      this.responseURL = 'https://example.test/items';
      this.onload?.();
    });
    class MockXHR {
      status = 0;
      statusText = '';
      responseText = '';
      responseURL = '';
      onload?: () => void;
      onerror?: () => void;
      open = open;
      send = send;
      abort = jest.fn();
      addEventListener = jest.fn();
      setRequestHeader = jest.fn();
      getAllResponseHeaders = jest.fn(() => 'Content-Type: application/json\r\nX-Test: yes\r\n');
    }
    const original = globalThis.XMLHttpRequest;
    Object.defineProperty(globalThis, 'XMLHttpRequest', { configurable: true, value: MockXHR });

    await expect(get('https://example.test/items')).resolves.toMatchObject({
      status: 200,
      data: { ok: true },
      headers: { 'content-type': 'application/json', 'x-test': 'yes' },
    });
    expect(open).toHaveBeenCalledWith('GET', 'https://example.test/items');

    const client = new API('https://example.test/');
    await expect(client.get('items')).resolves.toMatchObject({ status: 200 });
    expect(open).toHaveBeenLastCalledWith('GET', 'https://example.test/items');
    Object.defineProperty(globalThis, 'XMLHttpRequest', { configurable: true, value: original });
  });

  it('retries a timed-out request and resolves the later attempt', async () => {
    jest.useFakeTimers();
    let attempts = 0;
    class RetryXHR {
      status = 200;
      statusText = 'OK';
      responseText = '{"attempt":2}';
      responseURL = 'https://example.test/retry';
      onload?: () => void;
      onerror?: () => void;
      open = jest.fn();
      setRequestHeader = jest.fn();
      addEventListener = jest.fn();
      getAllResponseHeaders = jest.fn(() => '');
      abort = jest.fn();
      send = jest.fn(() => {
        attempts += 1;
        if (attempts > 1) this.onload?.();
      });
    }
    const original = globalThis.XMLHttpRequest;
    Object.defineProperty(globalThis, 'XMLHttpRequest', { configurable: true, value: RetryXHR });

    const pending = request('https://example.test/retry', { timeout: 10, retries: 1, retryDelay: 0 });
    jest.advanceTimersByTime(10);
    jest.runOnlyPendingTimers();
    await expect(pending).resolves.toMatchObject({ status: 200, data: { attempt: 2 } });
    expect(attempts).toBe(2);
    Object.defineProperty(globalThis, 'XMLHttpRequest', { configurable: true, value: original });
  });

  it('registers a custom element and forwards observed attributes to props', () => {
    const name = `okjs-card-${Date.now()}`;
    registerWebComponent(name, {
      name,
      props: { label: { type: 'string', default: 'Initial' } },
      render() {
        return `<button>${this.props.label}</button>`;
      },
    });

    const element = document.createElement(name) as HTMLElement;
    document.body.append(element);
    expect(element.shadowRoot).not.toBeNull();
    expect(element.shadowRoot?.querySelector('button')).not.toBeNull();
    element.setAttribute('label', 'Updated');
    expect(element.shadowRoot?.querySelector('button')?.textContent).toBe('Updated');
    element.remove();
  });
});
