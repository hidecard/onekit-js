import { createQueryClient } from '../src/modules/query';

describe('query production contracts', () => {
  it('deduplicates concurrent loads and notifies subscribers', async () => {
    const client = createQueryClient();
    const states: string[] = [];
    const unsubscribe = client.subscribe('todos', state => states.push(state.status));
    let loads = 0;
    const loader = jest.fn(async () => {
      loads += 1;
      return ['todo'];
    });

    await Promise.all([client.fetch('todos', loader), client.fetch('todos', loader)]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(client.getState<string[]>('todos').data).toEqual(['todo']);
    expect(states).toEqual(['pending', 'success']);
    unsubscribe();
  });

  it('supports stale-time, invalidation, setData, and removal', async () => {
    const client = createQueryClient();
    const loader = jest.fn(async () => 'fresh');

    await client.fetch('item', loader, { staleTime: 1000 });
    await client.fetch('item', loader, { staleTime: 1000 });
    expect(loader).toHaveBeenCalledTimes(1);

    client.invalidate('item');
    await client.fetch('item', loader, { staleTime: 1000 });
    expect(loader).toHaveBeenCalledTimes(2);

    client.setData('item', 'manual');
    expect(client.getState<string>('item').data).toBe('manual');
    client.remove('item');
    expect(client.getState<string>('item').status).toBe('idle');
  });
});
