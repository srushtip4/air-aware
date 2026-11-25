import fs from 'node:fs';
import path from 'node:path';
import { chromium, defineConfig } from '@playwright/test';

const E2E_PORT = 3100;

function resolveChromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const defaultPath = chromium.executablePath();
  if (fs.existsSync(defaultPath)) {
    return undefined;
  }
  const msPlaywrightDir = process.env.PLAYWRIGHT_BROWSERS_PATH || '/ms-playwright';
  if (fs.existsSync(msPlaywrightDir)) {
    const entries = fs
      .readdirSync(msPlaywrightDir)
      .filter((name) => name.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse();
    for (const entry of entries) {
      const candidate = path.join(
        msPlaywrightDir,
        entry,
        'chrome-headless-shell-linux64',
        'chrome-headless-shell',
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

const fallbackExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: 'on-first-retry',
    ...(fallbackExecutable ? { launchOptions: { executablePath: fallbackExecutable } } : {}),
  },
  webServer: {
    command: `npm run build && PORT=${E2E_PORT} NODE_ENV=production GEMINI_API_KEY= GEMINI_MODEL= node dist-server/server.mjs`,
    url: `http://127.0.0.1:${E2E_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
