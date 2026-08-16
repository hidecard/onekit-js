import { derive, state, watchEffect } from '../src/index';

describe('V3 ergonomic API', () => {
  it('supports primitive state with an explicit reactive value ref', () => {
    const count = state(1);
    const seen: number[] = [];

    const stop = watchEffect(() => {
      seen.push(count.value);
    });

    count.value = 2;
    stop();
    count.value = 3;

    expect(seen).toEqual([1, 2]);
  });

  it('returns reactive proxies for object and array state', () => {
    const model = state({ items: ['a'] });
    const seen: number[] = [];

    watchEffect(() => {
      seen.push(model.items.length);
    });

    model.items.push('b');

    expect(model.items.length).toBe(2);
    expect(seen).toEqual([1, 2]);
  });

  it('creates cached derived values', () => {
    const model = state({ first: 'One', last: 'Kit' });
    let evaluations = 0;
    const fullName = derive(() => {
      evaluations += 1;
      return `${model.first} ${model.last}`;
    });

    expect(fullName.value).toBe('One Kit');
    expect(fullName.value).toBe('One Kit');
    expect(evaluations).toBe(1);

    model.last = 'JS';
    expect(fullName.value).toBe('One JS');
    expect(evaluations).toBe(2);
  });
});
