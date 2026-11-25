import { test, expect } from '@playwright/test';

test.describe('AirAware E2E Smoke Tests', () => {
  test('loads health endpoint and home view', async ({ page }) => {
    const healthRes = await page.request.get('http://127.0.0.1:3000/api/health');
    expect(healthRes.status()).toBe(200);

    await page.goto('http://127.0.0.1:3000');
    await expect(page.locator('header')).toContainText('AirAware');
    await expect(page.locator('main')).toBeVisible();
  });
});
