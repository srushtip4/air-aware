import { describe, expect, it, vi } from 'vitest';
import {
  askAirAwareAssistant,
  buildAssistantPrompt,
} from '../../src/lib/ai';
import { DemoAirQualityAdapter } from '../../src/lib/aqi';
import {
  ConfigValidationError,
  loadEnvConfig,
  requireGeminiConfig,
} from '../../src/lib/config';
import { calculateImpactForPlan } from '../../src/lib/impact';
import { generateRecommendations } from '../../src/lib/recommendations';
import type { UserProfile } from '../../src/types';

const sampleProfile: UserProfile = {
  locationQuery: 'New Delhi',
  household: {
    hasChildren: true,
    hasElderly: false,
    hasRespiratoryCondition: false,
    householdSize: 4,
  },
  commuteMode: 'car_petrol',
  commuteDistanceKmOneWay: 10,
  commuteDaysPerWeek: 5,
  cookingFuel: 'lpg',
  heatingSource: 'electric_heater',
  homeType: 'apartment',
  budgetTier: 'low_cost',
};

describe('Startup env config validation', () => {
  it('parses defaults and valid environment overrides', () => {
    const cfg = loadEnvConfig({
      NODE_ENV: 'test',
      APP_URL: 'https://airaware.example',
      GEMINI_API_KEY: 'test-key-value',
      GEMINI_MODEL: 'gemini-4-hydrogen',
      AQI_CACHE_TTL_MS: '300000',
      AQI_CACHE_STALE_MS: '900000',
      OPEN_METEO_TIMEOUT_MS: '5000',
    });

    expect(cfg.nodeEnv).toBe('test');
    expect(cfg.appUrl).toBe('https://airaware.example');
    expect(cfg.geminiModel).toBe('gemini-4-hydrogen');
    expect(cfg.aqiCacheTtlMs).toBe(300_000);
    expect(cfg.aqiCacheStaleMs).toBe(900_000);
    expect(cfg.openMeteoTimeoutMs).toBe(5_000);
  });

  it('throws ConfigValidationError on invalid env values', () => {
    expect(() =>
      loadEnvConfig({
        APP_URL: 'not-a-url',
        AQI_CACHE_TTL_MS: '50',
      }),
    ).toThrow(ConfigValidationError);
  });

  it('requires GEMINI_MODEL and GEMINI_API_KEY from env without hard-coding a model', () => {
    const missingBoth = loadEnvConfig({});
    expect(() => requireGeminiConfig(missingBoth)).toThrow(ConfigValidationError);

    const missingModel = loadEnvConfig({ GEMINI_API_KEY: 'abc' });
    expect(() => requireGeminiConfig(missingModel)).toThrow(/GEMINI_MODEL/);

    const valid = loadEnvConfig({
      GEMINI_API_KEY: 'abc',
      GEMINI_MODEL: 'custom-runtime-model',
    });
    expect(requireGeminiConfig(valid)).toEqual({
      apiKey: 'abc',
      model: 'custom-runtime-model',
    });
  });
});

describe('AI Assistant prompt builder & runtime model wiring', () => {
  it('builds grounded prompt and calls injected client with GEMINI_MODEL from env', async () => {
    const demo = new DemoAirQualityAdapter(
      () => new Date('2026-11-24T12:00:00.000Z'),
    );
    const reading = await demo.getAirQuality(28.61, 77.2);
    const plan = generateRecommendations({
      band: reading.band,
      trend: reading.trend.trend,
      profile: sampleProfile,
    });
    const impact = calculateImpactForPlan(plan, sampleProfile, 50);

    const prompt = buildAssistantPrompt({
      question: 'Should my kids play outside at 5 PM?',
      profile: sampleProfile,
      reading,
      plan,
      impact,
    });

    expect(prompt.systemInstruction).toContain('not medical advice');
    expect(prompt.userPrompt).toContain(reading.source);
    expect(prompt.userPrompt).toContain(reading.timestamp);

    const generateText = vi.fn(async () => 'Keep kids indoors at 5 PM.');
    const envCfg = loadEnvConfig({
      GEMINI_API_KEY: 'key-123',
      GEMINI_MODEL: 'env-configured-model',
    });

    const response = await askAirAwareAssistant(
      {
        question: 'Should my kids play outside at 5 PM?',
        profile: sampleProfile,
        reading,
        plan,
        impact,
      },
      envCfg,
      { generateText },
    );

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'env-configured-model' }),
    );
    expect(response.modelUsed).toBe('env-configured-model');
    expect(response.sourceAttribution).toBe(reading.source);
    expect(response.disclaimer).toContain('Not medical advice');

    const emptyClient = { generateText: vi.fn(async () => '   ') };
    await expect(
      askAirAwareAssistant(
        {
          question: 'Test?',
          profile: sampleProfile,
          reading,
          plan,
          impact,
        },
        envCfg,
        emptyClient,
      ),
    ).rejects.toThrow(/empty response/);
  });
});
