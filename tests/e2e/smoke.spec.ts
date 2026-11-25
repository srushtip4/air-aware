import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function expectNoAxeViolations(page: Page, contextLabel: string) {
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    const axeGlobal = (window as unknown as {
      axe: {
        run: (
          doc: Document,
          options: { runOnly: { type: string; values: string[] } },
        ) => Promise<{
          violations: Array<{
            id: string;
            impact?: string;
            description: string;
            nodes: Array<{ target: string[]; failureSummary?: string }>;
          }>;
        }>;
      };
    }).axe;
    return axeGlobal.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });
  });

  expect(
    results.violations,
    `Axe violations on ${contextLabel}: ${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
}

test.describe('AirAware End-to-End Journey & WCAG 2.1 AA Checks', () => {
  test.beforeEach(async ({ page }) => {
    // Seed offline demo mode enabled or intercept initial default live call if offline,
    // while still hitting real backend /api/air for demo search.
    await page.route('**/api/air?*demo=false*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reading: {
            aqi: 312,
            pm25: 134,
            pm10: 218,
            no2: 46,
            o3: 31,
            band: 'Very Poor',
            source: 'Open-Meteo Air Quality API',
            timestamp: new Date().toISOString(),
            isDemoData: false,
            locationName: 'New Delhi, India',
            latitude: 28.6139,
            longitude: 77.209,
            hourly: [],
            trend: {
              trend: 'worsening',
              delta: 28,
              percentChange: 10,
              windowHours: 6,
              summary: 'PM2.5 rising steadily.',
            },
          },
          locations: [],
          cacheStatus: 'miss',
          isStale: false,
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        }),
      });
    });
  });

  test('completes main journey (search city -> fill profile -> view plan -> view impact -> assistant fallback -> printable) with axe checks and keyboard flow', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('header')).toContainText('AirAware');

    // Keyboard flow: Tab to skip link and activate to focus main#main-content
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    // Check aria-live polite region announced loaded AQI
    const liveStatus = page.getByRole('status', { name: /Air quality update/i });
    await expect(liveStatus).toContainText(/Loaded air quality for New Delhi/i);
    await expect(page.getByTestId('aqi-provenance')).toContainText('Open-Meteo Air Quality API');
    await expectNoAxeViolations(page, 'Live AQI (Live View)');

    // Enable Offline Demo Mode and search another city via real /api/air?demo=true
    const demoCheckbox = page.getByLabel(/Offline Demo Mode/i);
    await demoCheckbox.check();
    const searchInput = page.getByLabel(/City or location query/i);
    await searchInput.fill('Kanpur');
    await page.getByRole('button', { name: /^Search$/i }).click();

    await expect(
      page.getByRole('status', { name: /Data status notice/i }),
    ).toContainText(/DEMO DATA/i);
    await expect(liveStatus).toContainText(/Kanpur/i);
    await expectNoAxeViolations(page, 'Live AQI (Demo Mode)');

    // Navigate to Household Profile using keyboard
    const profileTab = page.getByRole('button', { name: /Household Profile/i });
    await profileTab.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Household & Lifestyle Profile/i })).toBeVisible();

    await page.getByLabel(/City \/ Location Query/i).fill('Kanpur');
    await page.getByLabel(/Primary Commute Mode/i).selectOption('car_petrol');
    await page.getByLabel(/One-way Commute Distance/i).fill('15');
    await page.getByRole('button', { name: /Save Profile & Update Plan/i }).click();

    const profileSavedStatus = page
      .locator('[role="status"][aria-live="polite"]')
      .filter({ hasText: /Profile saved successfully/i });
    await expect(profileSavedStatus).toBeVisible();
    await expectNoAxeViolations(page, 'Household Profile');

    // View Clean-Air Plan and expand "How was this calculated?"
    await page.getByRole('button', { name: /Clean-Air Plan/i }).click();
    await expect(page.getByRole('heading', { name: /Air Quality Guidance/i })).toBeVisible();
    const howButtons = page.getByRole('button', { name: /How was this calculated\?/i });
    await expect(howButtons.first()).toBeVisible();
    await howButtons.first().click();
    await expect(page.getByText(/Assumptions & Source Citation/i)).toBeVisible();
    await expectNoAxeViolations(page, 'Clean-Air Plan');

    // View Impact & Community, adjust slider, verify aria-live community region + table
    await page.getByRole('button', { name: /Impact & Community/i }).click();
    await expect(page.getByRole('heading', { name: /Weekly Household Impact Summary/i })).toBeVisible();
    const slider = page.getByLabel(/Number of Participating Households/i);
    await slider.fill('500');
    await expect(page.getByText(/500 participating community members/i)).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expectNoAxeViolations(page, 'Impact & Community');

    // View AI Assistant, send question when Gemini is unconfigured, verify explicit "AI unavailable" notice + rule-based plan
    await page.getByRole('button', { name: /AI Assistant/i }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /AirAware AI Assistant/i }),
    ).toBeVisible();
    await page.getByLabel(/Ask AirAware Assistant/i).fill('Is it safe to open windows now?');
    await page.getByRole('button', { name: /Ask Assistant/i }).click();

    await expect(page.getByText(/AI unavailable/i).first()).toBeVisible();
    await expect(page.getByText(/AI unavailable • Rule-based plan/i)).toBeVisible();
    await expectNoAxeViolations(page, 'AI Assistant (Fallback)');

    // View Printable Plan
    await page.getByRole('button', { name: /Printable Plan/i }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Family Clean-Air Plan/i }),
    ).toBeVisible();
    await expectNoAxeViolations(page, 'Printable Plan');

    // Toggle Dark Mode and verify theme persistence + WCAG 2.1 AA compliance in Dark Mode across key views
    const darkToggle = page.getByRole('button', { name: /Switch to dark mode/i });
    await darkToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: /Switch to light mode/i })).toHaveAttribute('aria-pressed', 'true');
    await expectNoAxeViolations(page, 'Printable Plan (Dark Mode)');

    await page.getByRole('button', { name: /Live AQI/i }).click();
    await expect(page.getByRole('img', { name: /Hourly AQI trajectory/i })).toBeVisible();
    await expectNoAxeViolations(page, 'Live AQI (Dark Mode)');

    await page.getByRole('button', { name: /Impact & Community/i }).click();
    await expectNoAxeViolations(page, 'Impact & Community (Dark Mode)');

    await page.getByRole('button', { name: /Clean-Air Plan/i }).click();
    await expectNoAxeViolations(page, 'Clean-Air Plan (Dark Mode)');

    await page.getByRole('button', { name: /Household Profile/i }).click();
    await expectNoAxeViolations(page, 'Household Profile (Dark Mode)');

    await page.getByRole('button', { name: /AI Assistant/i }).click();
    await expectNoAxeViolations(page, 'AI Assistant (Dark Mode)');
  });
});
