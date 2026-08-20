import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value.startsWith('--')) args.set(value.slice(2), process.argv[index + 1] ?? true);
}

const inputDir = resolve(String(args.get('input') ?? 'test-results'));
const historyDir = resolve(String(args.get('history') ?? 'benchmark-results/browser-history'));
const budgetPath = resolve(String(args.get('budgets') ?? 'scripts/browser-performance-budgets.json'));
const browser = String(args.get('browser') ?? process.env.BROWSER ?? 'chromium');
const configuredBudgets = JSON.parse(await readFile(budgetPath, 'utf8'));
const maxRegressionRatio = Number(args.get('max-regression-ratio') ?? configuredBudgets.history?.maxRegressionRatio ?? 0.25);
const maxRecords = Number(configuredBudgets.history?.maxRecords ?? 1000);
const historyPath = join(historyDir, 'browser-history.json');
const comparisonPath = join(historyDir, 'browser-history-comparison.json');

async function filesUnder(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await filesUnder(path));
      else if (entry.isFile() && entry.name.endsWith('-performance.json')) files.push(path);
    }
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function metricFor(workload, result) {
  if (typeof result.durationMs === 'number') return { name: 'durationMs', value: result.durationMs, unit: 'ms' };
  if (typeof result.retainedHeapGrowthBytes === 'number') {
    return { name: 'retainedHeapGrowthBytes', value: result.retainedHeapGrowthBytes, unit: 'bytes' };
  }
  return null;
}

const files = await filesUnder(inputDir);
if (files.length === 0) throw new Error(`No browser performance reports found under ${inputDir}`);

let history = { schemaVersion: 1, records: [] };
try {
  history = JSON.parse(await readFile(historyPath, 'utf8'));
  if (!Array.isArray(history.records)) history.records = [];
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const run = {
  commit: process.env.GITHUB_SHA ?? 'local',
  runId: process.env.GITHUB_RUN_ID ?? 'local',
  ref: process.env.GITHUB_REF_NAME ?? 'local',
  browser,
  recordedAt: new Date().toISOString(),
};
const records = [];
for (const file of files) {
  const result = JSON.parse(await readFile(file, 'utf8'));
  const workload = basename(file, '-performance.json');
  const metric = metricFor(workload, result);
  if (!metric) continue;
  records.push({ ...run, workload, ...metric, source: relative(process.cwd(), file), result });
}
if (records.length === 0) throw new Error(`No supported timing or heap metrics found under ${inputDir}`);

const comparisons = records.map((record) => {
  const previous = [...history.records].reverse().find((item) => item.workload === record.workload && item.browser === record.browser && item.name === record.name);
  const ratio = previous && previous.value > 0 ? (record.value - previous.value) / previous.value : null;
  const regressed = ratio !== null && ratio > maxRegressionRatio;
  return {
    workload: record.workload,
    browser: record.browser,
    metric: record.name,
    current: record.value,
    previous: previous?.value ?? null,
    changeRatio: ratio,
    maxRegressionRatio,
    regressed,
  };
});

await mkdir(historyDir, { recursive: true });
const nextRecords = [...history.records, ...records].slice(-maxRecords);
await writeFile(historyPath, `${JSON.stringify({ schemaVersion: 1, records: nextRecords }, null, 2)}\n`);
await writeFile(comparisonPath, `${JSON.stringify({ ...run, maxRegressionRatio, comparisons }, null, 2)}\n`);

for (const comparison of comparisons) {
  if (!comparison.regressed) continue;
  const message = `${comparison.workload}/${comparison.metric} increased ${(comparison.changeRatio * 100).toFixed(1)}% (${comparison.previous} -> ${comparison.current})`;
  console.warn(`[browser-performance-history-warning] ${message}`);
  process.stdout.write(`::warning title=OneKit browser trend regression::${message}\n`);
}
console.log(`[browser-performance-history] ${JSON.stringify({ ...run, records: records.length, comparisons })}`);
