import { reactive, effect, effectScope, stop, snapshot } from '../dist/onekit.esm.js';

const rounds = Number(process.env.ONEKIT_MEMORY_ROUNDS ?? 5);
const objects = Number(process.env.ONEKIT_MEMORY_OBJECTS ?? 10_000);
const gc = typeof global.gc === 'function' ? global.gc : () => {};

function heap() {
  gc();
  return process.memoryUsage().heapUsed;
}

function measure(name, workload) {
  gc();
  const before = process.memoryUsage();
  const start = performance.now();
  const retained = workload();
  const elapsedMs = performance.now() - start;
  const during = process.memoryUsage();
  const after = heap();
  const result = {
    name,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    heapBeforeMb: Number((before.heapUsed / 1024 / 1024).toFixed(3)),
    heapPeakMb: Number((during.heapUsed / 1024 / 1024).toFixed(3)),
    heapAfterMb: Number((after / 1024 / 1024).toFixed(3)),
    retainedDeltaKb: Math.round((after - before.heapUsed) / 1024),
  };
  // Keep the workload alive until after-GC measurement, then release it from the report.
  void retained;
  return result;
}

const results = [];
results.push(measure('reactive-objects-with-effects', () => {
  const records = [];
  for (let i = 0; i < objects; i += 1) {
    const state = reactive({ value: i, nested: { label: `item-${i}` } });
    const runner = effect(() => state.value);
    records.push({ state, runner });
  }
  return records;
}));

results.push(measure('scoped-effects-teardown', () => {
  const scope = effectScope(true);
  const states = [];
  scope.run(() => {
    for (let i = 0; i < objects; i += 1) {
      const state = reactive({ value: i });
      effect(() => state.value);
      states.push(state);
    }
  });
  scope.dispose();
  return states;
}));

results.push(measure('snapshot-deep-clone', () => {
  const state = reactive({ items: Array.from({ length: objects }, (_, i) => ({ id: i, value: i * 2 })) });
  const cloned = snapshot(state);
  return cloned.items.length;
}));

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  rounds,
  objects,
  forcedGc: typeof global.gc === 'function',
  results,
  note: 'Retained deltas are measured after forced GC where available. Browser DOM memory, allocator fragmentation, and JIT code memory are not included in heapUsed.',
};
console.table(results.map(({ name, elapsedMs, heapBeforeMb, heapPeakMb, heapAfterMb, retainedDeltaKb }) => ({ name, elapsedMs, heapBeforeMb, heapPeakMb, heapAfterMb, retainedDeltaKb })));
await (await import('node:fs/promises')).writeFile('benchmark-results/memory-v3.json', `${JSON.stringify(report, null, 2)}\n`);
console.log('Wrote benchmark-results/memory-v3.json');
