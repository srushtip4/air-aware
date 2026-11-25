#!/usr/bin/env node
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const serverEntry = path.join(rootDir, 'dist-server', 'server.mjs');
const TEST_PORT = Number(process.env.VERIFY_HTTP_PORT || 3199);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function waitForHealth(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) {
        return;
      }
      lastErr = new Error(`Unexpected /api/health status: ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    `Server failed health check within ${timeoutMs}ms: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

function assertSecurityHeaders(res, label) {
  assert.equal(
    res.headers.get('x-content-type-options'),
    'nosniff',
    `${label}: missing X-Content-Type-Options: nosniff`,
  );
  assert.equal(
    res.headers.get('x-frame-options'),
    'SAMEORIGIN',
    `${label}: missing X-Frame-Options: SAMEORIGIN`,
  );
  assert.equal(
    res.headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
    `${label}: missing Referrer-Policy`,
  );
  const permissions = res.headers.get('permissions-policy') ?? '';
  assert.ok(
    permissions.includes('geolocation=(self)'),
    `${label}: missing Permissions-Policy`,
  );
  const csp = res.headers.get('content-security-policy') ?? '';
  assert.ok(
    csp.includes("default-src 'self'") && csp.includes("object-src 'none'"),
    `${label}: invalid Content-Security-Policy`,
  );
  assert.equal(
    res.headers.get('x-powered-by'),
    null,
    `${label}: X-Powered-By header must be disabled`,
  );
}

async function runVerification() {
  const logs = [];
  const child = spawn(process.execPath, [serverEntry], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(TEST_PORT),
      GEMINI_API_KEY: '',
      GEMINI_MODEL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr?.on('data', (chunk) => logs.push(String(chunk)));

  try {
    await waitForHealth();

    // 1. Built frontend HTML + security headers
    const homeRes = await fetch(`${BASE_URL}/`);
    assert.equal(homeRes.status, 200, 'GET / should return HTTP 200');
    assertSecurityHeaders(homeRes, 'GET /');
    const html = await homeRes.text();
    assert.ok(html.includes('AirAware'), 'GET / should serve built AirAware HTML');

    // 2. Demo mode /api/air + security headers
    const airRes = await fetch(`${BASE_URL}/api/air?q=New%20Delhi&demo=true`);
    assert.equal(airRes.status, 200, 'GET /api/air demo mode should return HTTP 200');
    assertSecurityHeaders(airRes, 'GET /api/air');
    const airData = await airRes.json();
    assert.equal(airData.reading?.isDemoData, true, 'Demo mode reading must set isDemoData=true');
    assert.equal(typeof airData.reading?.aqi, 'number', 'Demo mode reading must include numeric AQI');
    assert.equal(airData.isStale, false, 'Fresh demo reading should have isStale=false');

    // 3. Validation failure (400) on unknown query param and invalid POST body
    const badAirRes = await fetch(`${BASE_URL}/api/air?unexpectedField=1`);
    assert.equal(badAirRes.status, 400, 'Unknown query param on /api/air should return 400');
    const badAirJson = await badAirRes.json();
    assert.equal(badAirJson.code, 'VALIDATION_ERROR');

    const badPlanRes = await fetch(`${BASE_URL}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });
    assert.equal(badPlanRes.status, 400, 'Invalid POST /api/plan payload should return 400');
    const badPlanJson = await badPlanRes.json();
    assert.equal(badPlanJson.code, 'VALIDATION_ERROR');

    // 4. Rate-limit check (429) on /api/assist (10 req/min limit per IP)
    const validAssistBody = JSON.stringify({
      city: 'New Delhi',
      aqi: 360,
      trend: 'worsening',
      question: 'When should I ventilate?',
      profile: {
        locationQuery: 'New Delhi',
        household: {
          hasChildren: true,
          hasElderly: false,
          hasRespiratoryCondition: true,
          householdSize: 4,
        },
        commuteMode: 'car_petrol',
        commuteDistanceKmOneWay: 12,
        commuteDaysPerWeek: 5,
        cookingFuel: 'lpg',
        heatingSource: 'electric_heater',
        homeType: 'apartment',
        budgetTier: 'low_cost',
      },
    });

    let saw429 = false;
    for (let i = 1; i <= 12; i += 1) {
      const assistRes = await fetch(`${BASE_URL}/api/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: validAssistBody,
      });

      if (i <= 10) {
        assert.equal(
          assistRes.status,
          200,
          `Request #${i} to POST /api/assist should succeed with fallback=true`,
        );
        const body = await assistRes.json();
        assert.equal(body.fallback, true, 'Unconfigured Gemini must return fallback=true');
      } else if (assistRes.status === 429) {
        saw429 = true;
        assert.ok(assistRes.headers.get('retry-after'), '429 response must include Retry-After');
        assert.equal(
          assistRes.headers.get('x-ratelimit-remaining'),
          '0',
          '429 response must include X-RateLimit-Remaining: 0',
        );
        const errJson = await assistRes.json();
        assert.equal(errJson.code, 'RATE_LIMITED');
        break;
      }
    }

    assert.ok(saw429, 'POST /api/assist did not trigger HTTP 429 rate limiting');

    console.log(
      'HTTP verification passed: built SPA (200), /api/air demo (200), validation (400), rate limit (429), security headers.',
    );
  } catch (err) {
    console.error('HTTP verification failed:', err);
    if (logs.length > 0) {
      console.error('Captured server logs:\n', logs.join(''));
    }
    process.exitCode = 1;
  } finally {
    if (!child.killed) {
      child.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 1_500);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
}

void runVerification();
