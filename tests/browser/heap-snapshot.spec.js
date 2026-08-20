import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const performanceBudgets = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/browser-performance-budgets.json'), 'utf8'),
);

async function collectHeapSnapshot(client, outputPath) {
  const chunks = [];
  client.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
  await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  const snapshot = chunks.join('');
  writeFileSync(outputPath, snapshot);
  return { bytes: Buffer.byteLength(snapshot), chunks: chunks.length };
}

async function forceGcAndReadUsage(client) {
  await client.send('HeapProfiler.collectGarbage');
  return client.send('Runtime.getHeapUsage');
}

test.describe('OneKit V3 browser lifecycle heap snapshots', () => {
  test('keeps repeated mount/update/unmount heap growth within budget', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'HeapProfiler CDP snapshots are Chromium-only; lifecycle cleanup runs in the cross-browser suite.');
    await page.goto('/tests/browser/fixture.html');

    const budget = performanceBudgets.workloads['lifecycle-heap'];
    const client = await page.context().newCDPSession(page);
    const beforeUsage = await forceGcAndReadUsage(client);
    const beforeSnapshot = await collectHeapSnapshot(client, testInfo.outputPath('heap-before.heapsnapshot'));
    const lifecycle = await page.evaluate(({ cycles, updates, nodes }) => (
      window.OneKitBrowserSmoke.runLifecycleHeapProbe(cycles, updates, nodes)
    ), budget);
    const afterUsage = await forceGcAndReadUsage(client);
    const afterSnapshot = await collectHeapSnapshot(client, testInfo.outputPath('heap-after.heapsnapshot'));

    const retainedHeapGrowthBytes = afterUsage.usedSize - beforeUsage.usedSize;
    const snapshotGrowthBytes = afterSnapshot.bytes - beforeSnapshot.bytes;
    const snapshotGrowthRatio = beforeSnapshot.bytes > 0 ? snapshotGrowthBytes / beforeSnapshot.bytes : 0;
    const result = {
      ...lifecycle,
      beforeHeapBytes: beforeUsage.usedSize,
      afterHeapBytes: afterUsage.usedSize,
      retainedHeapGrowthBytes,
      beforeSnapshotBytes: beforeSnapshot.bytes,
      afterSnapshotBytes: afterSnapshot.bytes,
      snapshotGrowthBytes,
      snapshotGrowthRatio,
      snapshotArtifacts: ['heap-before.heapsnapshot', 'heap-after.heapsnapshot'],
    };

    expect(result.createdNodeCount).toBe(budget.cycles * budget.nodes);
    expect(result.residualHosts).toBe(0);
    expect(result.residualRoots).toBe(0);
    expect(result.retainedHeapGrowthBytes).toBeLessThanOrEqual(budget.maxRetainedHeapGrowthBytes);

    if (result.retainedHeapGrowthBytes > budget.maxRetainedHeapGrowthBytes * budget.warningRatio) {
      const warning = { ...result, budgetBytes: budget.maxRetainedHeapGrowthBytes };
      console.warn(`[browser-memory-warning] lifecycle-heap ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser heap budget::lifecycle-heap exceeded warning threshold: ${JSON.stringify(warning)}\n`);
    }

    const report = {
      ...result,
      budgetBytes: budget.maxRetainedHeapGrowthBytes,
      warningThresholdBytes: budget.maxRetainedHeapGrowthBytes * budget.warningRatio,
    };
    console.log(`[browser-memory] lifecycle-heap ${JSON.stringify(report)}`);
    const reportPath = testInfo.outputPath('lifecycle-heap-performance.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await testInfo.attach('lifecycle-heap-performance.json', {
      path: reportPath,
      contentType: 'application/json',
    });
    await testInfo.attach('heap-before.heapsnapshot', {
      path: testInfo.outputPath('heap-before.heapsnapshot'),
      contentType: 'application/json',
    });
    await testInfo.attach('heap-after.heapsnapshot', {
      path: testInfo.outputPath('heap-after.heapsnapshot'),
      contentType: 'application/json',
    });
  });
});
