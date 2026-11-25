import { z } from 'zod';

const positiveIntFromEnv = (defaultValue: number, min: number, max: number) =>
  z.preprocess(
    (val) => (val === undefined || val === '' ? defaultValue : Number(val)),
    z.number().int().min(min).max(max),
  );

const optionalNonEmptyString = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().trim().min(1).max(256).optional(),
);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.preprocess(
    (val) =>
      typeof val === 'string' && val.trim() === '' ? 'http://localhost:3000' : val,
    z.string().url().default('http://localhost:3000'),
  ),
  GEMINI_API_KEY: optionalNonEmptyString,
  GEMINI_MODEL: optionalNonEmptyString,
  AQI_CACHE_TTL_MS: positiveIntFromEnv(600_000, 1_000, 86_400_000),
  AQI_CACHE_STALE_MS: positiveIntFromEnv(3_600_000, 0, 604_800_000),
  OPEN_METEO_TIMEOUT_MS: positiveIntFromEnv(8_000, 500, 60_000),
});

export interface AppEnvConfig {
  nodeEnv: 'development' | 'test' | 'production';
  appUrl: string;
  geminiApiKey?: string;
  geminiModel?: string;
  aqiCacheTtlMs: number;
  aqiCacheStaleMs: number;
  openMeteoTimeoutMs: number;
}

export interface GeminiRuntimeConfig {
  apiKey: string;
  model: string;
}

export class ConfigValidationError extends Error {
  public readonly issues: Array<{ field: string; message: string }>;

  constructor(message: string, issues: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export function loadEnvConfig(
  rawEnv: Record<string, string | undefined> = process.env,
): AppEnvConfig {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'env',
      message: issue.message,
    }));
    throw new ConfigValidationError(
      `Invalid environment configuration: ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`,
      issues,
    );
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    appUrl: parsed.data.APP_URL,
    geminiApiKey: parsed.data.GEMINI_API_KEY,
    geminiModel: parsed.data.GEMINI_MODEL,
    aqiCacheTtlMs: parsed.data.AQI_CACHE_TTL_MS,
    aqiCacheStaleMs: parsed.data.AQI_CACHE_STALE_MS,
    openMeteoTimeoutMs: parsed.data.OPEN_METEO_TIMEOUT_MS,
  };
}

/**
 * Resolves the required Gemini runtime configuration.
 * The model name MUST come from the GEMINI_MODEL environment variable and is never hard-coded.
 */
export function requireGeminiConfig(config: AppEnvConfig): GeminiRuntimeConfig {
  const issues: Array<{ field: string; message: string }> = [];

  if (!config.geminiApiKey) {
    issues.push({
      field: 'GEMINI_API_KEY',
      message: 'GEMINI_API_KEY environment variable is required for AI assistant calls.',
    });
  }

  if (!config.geminiModel) {
    issues.push({
      field: 'GEMINI_MODEL',
      message:
        'GEMINI_MODEL environment variable is required (no default model is hard-coded).',
    });
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(
      issues.map((i) => i.message).join(' '),
      issues,
    );
  }

  return {
    apiKey: config.geminiApiKey as string,
    model: config.geminiModel as string,
  };
}
