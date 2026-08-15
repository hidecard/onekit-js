import { performance } from 'node:perf_hooks';
import { platform, arch, cpus } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  batch,
  effect,
  effectScope,
  reactive,
  snapshot,
  stop,
} from '../dist/onekit.esm.js';

const iterations = Number(process.env.ONEKIT_BENCH_ITERATIONS ?? 10_000);
const samples = Number(process.env.ONEKIT_BENCH_SAMPLES ?? 5);

function measure(name, fn) {
  const durations = [];
  const heapDeltas = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const beforeHeap = process.memoryUsage().heapUsed;
    const start = performance.now();
    fn();
    durations.push(performance.now() - start);
    heapDeltas.push(Math.max(0, process.memoryUsage().heapUsed - beforeHeap));
  }
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    name,
    iterations,
    samples,
    meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    opsPerSecond: Math.round((iterations * samples) / (durations.reduce((sum, value) => sum + value, 0) / 1000)),
    meanHeapDeltaKb: Math.round((heapDeltas.reduce((sum, value) => sum + value, 0) / heapDeltas.length) / 1024),
  };
}

const results = [
  measure('reactive-effect-updates', () => {
    const state = reactive({ value: 0 });
    let seen = 0;
    const runner = effect(() => { seen = state.value; });
    for (let i = 0; i < iterations; i += 1) state.value = i;
    stop(runner);
    if (seen !== iterations - 1) throw new Error('reactive update benchmark failed');
  }),
  measure('batched-reactive-updates', () => {
    const state = reactive({ value: 0 });
    let runs = 0;
    const runner = effect(() => { state.value; runs += 1; });
    batch(() => {
      for (let i = 0; i < iterations; i += 1) state.value = i;
    });
    stop(runner);
    if (runs !== 2) throw new Error(`batch benchmark expected 2 effect runs, received ${runs}`);
  }),
  measure('snapshot-deep-clone', () => {
    const state = reactive({ nested: { values: Array.from({ length: 32 }, (_, i) => i) } });
    const cloned = snapshot(state);
    if (cloned.nested.values.length !== 32) throw new Error('snapshot benchmark failed');
  }),
  measure('scope-effect-teardown', () => {
    const scope = effectScope(true);
    const state = reactive({ value: 0 });
    scope.run(() => effect(() => state.value));
    scope.dispose();
  }),
];

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  iterations,
  samples,
  environment: {
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model ?? 'unknown',
    cpuCount: cpus().length,
  },
  results,
  note: 'Compare runs on the same machine and Node version. Framework adapters are intentionally optional; install them in a separate benchmark project for cross-framework comparisons.',
};

await mkdir('benchmark-results', { recursive: true });
await writeFile('benchmark-results/v3.json', `${JSON.stringify(report, null, 2)}\n`);
console.table(results.map(({ name, meanMs, p95Ms, opsPerSecond, meanHeapDeltaKb }) => ({ name, meanMs: meanMs.toFixed(3), p95Ms: p95Ms.toFixed(3), opsPerSecond, meanHeapDeltaKb })));
console.log('Wrote benchmark-results/v3.json');
