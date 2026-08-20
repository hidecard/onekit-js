import { test, expect } from '@playwright/test';

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
