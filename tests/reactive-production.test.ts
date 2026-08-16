import { batch, computed, effect, reactive, stop, watch } from '../src/index';

describe('M1 reactive production contract', () => {
  it('preserves nested proxy identity', () => {
    const state = reactive({ nested: { value: 1 } });
    expect(state.nested).toBe(state.nested);
  });

  it('cleans up conditional dependencies between effect runs', () => {
    const state = reactive({ enabled: true, first: 1, second: 2 });
    const seen: number[] = [];
    effect(() => {
      seen.push(state.enabled ? state.first : state.second);
    });

    state.first = 3;
    state.enabled = false;
    state.first = 4;
    state.second = 5;

    expect(seen).toEqual([1, 3, 2, 5]);
  });

  it('stops effects and removes their dependencies', () => {
    const state = reactive({ count: 0 });
    const seen: number[] = [];
    const runner = effect(() => seen.push(state.count));

    stop(runner);
    state.count = 1;

    expect(seen).toEqual([0]);
  });

  it('supports computed chains and batched updates', () => {
    const state = reactive({ count: 1 });
    const doubled = computed(() => state.count * 2);
    const quadrupled = computed(() => doubled.value * 2);
    const seen: number[] = [];
    effect(() => seen.push(quadrupled.value));

    batch(() => {
      state.count = 2;
      state.count = 3;
    });

    expect(quadrupled.value).toBe(12);
    expect(seen).toEqual([4, 12]);
  });

  it('reacts to array length changes and removed indexes', () => {
    const state = reactive({ items: [1, 2] });
    const seen: string[] = [];
    effect(() => {
      seen.push(`${state.items.length}:${state.items[1] ?? 'missing'}`);
    });

    state.items.push(3);
    state.items.length = 1;

    expect(seen).toEqual(['2:2', '3:2', '1:missing']);
  });

  it('deep-watches array additions and nested mutations', () => {
    const state = reactive({ items: [{ label: 'A' }] });
    const changes: string[] = [];
    const stopWatch = watch(state.items, () => changes.push(state.items.map(item => item.label).join(',')));

    state.items.push({ label: 'B' });
    state.items[1].label = 'C';
    stopWatch();
    state.items.push({ label: 'D' });

    expect(changes).toEqual(['A,B', 'A,C']);
  });

  it('watches nested object changes by default', () => {
    const state = reactive({ profile: { name: 'A' } });
    const changes: string[] = [];
    const stopWatch = watch(state.profile, () => changes.push(state.profile.name));

    state.profile.name = 'B';
    stopWatch();
    state.profile.name = 'C';

    expect(changes).toEqual(['B']);
  });
});
