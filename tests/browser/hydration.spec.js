import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const performanceBudgets = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/browser-performance-budgets.json'), 'utf8'),
);

test.describe('OneKit V3 real-browser hydration contracts', () => {
  test('hydrates server DOM and attaches interactive behavior', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');

    const before = await page.evaluate(() => window.OneKitBrowserSmoke.snapshot());
    expect(before.mismatches).toEqual([]);
    expect(before.text).toBe('0');
    expect(before.title).toBe('Projected');
    expect(before.callbackRef).toEqual(['set']);
    expect(before.objectRef).toBe('title');
    expect(before.rootVNode).toBe(true);

    await page.evaluate(() => window.OneKitBrowserSmoke.click());
    await expect(page.locator('#counter')).toHaveText('1');
  });

  test('preserves and updates controlled input state through hydration', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');
    const input = page.locator('#controlled');

    await expect(input).toHaveValue('server');
    await expect(page.locator('#controlled-output')).toHaveText('server');
    await input.fill('typed by user');
    await expect(input).toHaveValue('typed by user');
    await expect(page.locator('#controlled-output')).toHaveText('typed by user');

    await page.evaluate(() => window.OneKitBrowserSmoke.setControlled('programmatic'));
    await expect(input).toHaveValue('programmatic');
    await expect(page.locator('#controlled-output')).toHaveText('programmatic');
  });

  test('stops controlled-input updates after hydration disposal', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');
    const input = page.locator('#controlled');
    await page.evaluate(() => window.OneKitBrowserSmoke.dispose());

    await input.fill('after dispose');
    await expect(input).toHaveValue('after dispose');
    await expect(page.locator('#controlled-output')).toHaveText('server');
  });

  test('reorders keyed children while preserving DOM node identity', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');

    const initial = await page.evaluate(() => {
      window.OneKitBrowserSmoke.markKeyedNodes();
      return window.OneKitBrowserSmoke.keyedSnapshot();
    });
    await page.evaluate(() => window.OneKitBrowserSmoke.reorder(['c', 'a', 'b']));
    const reordered = await page.evaluate(() => window.OneKitBrowserSmoke.keyedSnapshot());

    expect(reordered.map(item => item.key)).toEqual(['c', 'a', 'b']);
    expect(reordered.map(item => item.nodeId)).toEqual([initial[2].nodeId, initial[0].nodeId, initial[1].nodeId]);
    expect(reordered.map(item => item.text)).toEqual(['C:0', 'A:0', 'B:0']);
  });

  test('preserves keyed child interaction state after reorder', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');
    await page.evaluate(() => window.OneKitBrowserSmoke.clickKey('b'));
    await page.evaluate(() => window.OneKitBrowserSmoke.reorder(['c', 'b', 'a']));

    const snapshot = await page.evaluate(() => window.OneKitBrowserSmoke.keyedSnapshot());
    expect(snapshot.map(item => item.key)).toEqual(['c', 'b', 'a']);
    expect(snapshot.map(item => item.text)).toEqual(['C:0', 'B:1', 'A:0']);
    await page.evaluate(() => window.OneKitBrowserSmoke.clickKey('b'));
    await expect(page.locator('[data-item="b"]')).toHaveText('B:2');
  });

  test('records large keyed-list reorder timing baseline', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runKeyedBenchmark(500, 5));

    const budget = performanceBudgets.workloads['keyed-list'];
    expect(result.nodeCount).toBe(budget.size);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] keyed-list ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::keyed-list exceeded warning threshold: ${JSON.stringify(warning)}\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] keyed-list ${JSON.stringify(report)}`);
    await testInfo.attach('keyed-list-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('records DOM-heavy patch timing baseline', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runDomHeavyBenchmark(300, 4));

    const budget = performanceBudgets.workloads['dom-heavy'];
    expect(result.nodeCount).toBe(budget.size);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] dom-heavy ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::dom-heavy exceeded warning threshold: ${JSON.stringify(warning)}\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] dom-heavy ${JSON.stringify(report)}`);
    await testInfo.attach('dom-heavy-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('records large SSR hydration timing baseline', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runSsrHydrationBenchmark(400, 1));

    const budget = performanceBudgets.workloads['ssr-hydration'];
    expect(result.nodeCount).toBe(budget.size);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.mismatches).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] ssr-hydration ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::ssr-hydration exceeded warning threshold: ${JSON.stringify(warning)}\\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] ssr-hydration ${JSON.stringify(report)}`);
    await testInfo.attach('ssr-hydration-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('records slot-heavy hydration timing baseline and projection shape', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runSlotHeavyBenchmark(120, 1));

    const budget = performanceBudgets.workloads['slot-heavy'];
    expect(result.groupCount).toBe(budget.groups);
    expect(result.slotNodeCount).toBe(budget.groups * 3);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.mismatches).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] slot-heavy ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::slot-heavy exceeded warning threshold: ${JSON.stringify(warning)}\\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] slot-heavy ${JSON.stringify(report)}`);
    await testInfo.attach('slot-heavy-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('records slot-heavy post-hydration content update timing baseline', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runSlotUpdateBenchmark(120, 4));

    const budget = performanceBudgets.workloads['slot-heavy-update'];
    expect(result.groupCount).toBe(budget.groups);
    expect(result.slotNodeCount).toBe(budget.groups * 3);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.updated).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] slot-heavy-update ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::slot-heavy-update exceeded warning threshold: ${JSON.stringify(warning)}\\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] slot-heavy-update ${JSON.stringify(report)}`);
    await testInfo.attach('slot-heavy-update-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('records slot-heavy keyed reorder timing and preserves projected node identity', async ({ page }, testInfo) => {
    await page.goto('/tests/browser/fixture.html');
    const result = await page.evaluate(() => window.OneKitBrowserSmoke.runSlotReorderBenchmark(120, 4));

    const budget = performanceBudgets.workloads['slot-heavy-reorder'];
    expect(result.groupCount).toBe(budget.groups);
    expect(result.rounds).toBe(budget.rounds);
    expect(result.firstKey).toBe('0');
    expect(result.identityPreserved).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    if (result.durationMs > budget.maxDurationMs * budget.warningRatio) {
      const warning = { ...result, budgetMs: budget.maxDurationMs };
      console.warn(`[browser-performance-warning] slot-heavy-reorder ${JSON.stringify(warning)}`);
      process.stdout.write(`::warning title=OneKit browser performance budget::slot-heavy-reorder exceeded warning threshold: ${JSON.stringify(warning)}\\n`);
    }
    expect(result.durationMs).toBeLessThanOrEqual(budget.maxDurationMs);
    const report = { ...result, budgetMs: budget.maxDurationMs, warningThresholdMs: budget.maxDurationMs * budget.warningRatio };
    console.log(`[browser-performance] slot-heavy-reorder ${JSON.stringify(report)}`);
    await testInfo.attach('slot-heavy-reorder-performance.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  });

  test('disposes listeners, refs, and vnode metadata without rewriting the DOM', async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');
    const original = await page.locator('#app').innerHTML();

    await page.evaluate(() => window.OneKitBrowserSmoke.dispose());
    const after = await page.evaluate(() => window.OneKitBrowserSmoke.snapshot());
    await page.locator('#counter').click();

    expect(after.callbackRef).toEqual(['set', 'clear']);
    expect(after.objectRef).toBe(null);
    expect(after.rootVNode).toBe(false);
    expect(await page.locator('#app').innerHTML()).toBe(original);
    await expect(page.locator('#counter')).toHaveText('0');
  });
});
