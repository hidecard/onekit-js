import { cleanup, fireEvent, flush, renderTest, waitFor } from '../src/testing';
import { createElement } from '../src/modules/vdom';

afterEach(() => cleanup());

describe('testing foundation', () => {
  it('renders, rerenders, and unmounts a VNode', () => {
    const result = renderTest(createElement('button', { id: 'save' }, 'Save'));

    expect(result.container.innerHTML).toBe('<button id="save">Save</button>');
    result.rerender(createElement('button', { id: 'cancel' }, 'Cancel'));
    expect(result.container.innerHTML).toBe('<button id="cancel">Cancel</button>');

    result.unmount();
    expect(result.container.innerHTML).toBe('');
  });

  it('dispatches bubbling events and supports async flush/waitFor', async () => {
    const handler = jest.fn();
    const result = renderTest(createElement('button', { onClick: handler }, 'Run'));
    const button = result.container.querySelector('button') as HTMLButtonElement;

    expect(fireEvent(button, 'click')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    let ready = false;
    setTimeout(() => { ready = true; }, 5);
    await flush();
    await expect(waitFor(() => {
      if (!ready) throw new Error('not ready');
      return 'ready';
    }, { timeout: 100 })).resolves.toBe('ready');
  });
});
