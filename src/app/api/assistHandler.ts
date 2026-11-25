import type { Request, Response } from 'express';
import type { GeminiStructuredExplanation } from '../../types';
import { runStructuredAssist } from '../../lib/ai';
import type { StructuredGeminiClient } from '../../lib/ai';
import type { TtlCache } from '../../lib/cache';
import type { AppEnvConfig } from '../../lib/config';
import type { CircuitBreaker } from '../../lib/resilience';
import type { ServerLogger } from '../../lib/security';
import { assistRequestSchema, validateInput } from '../../lib/validation';

export interface AssistHandlerDeps {
  envConfig: AppEnvConfig;
  cache: TtlCache<GeminiStructuredExplanation>;
  circuitBreaker: CircuitBreaker;
  logger: ServerLogger;
  client?: StructuredGeminiClient;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export function createAssistHandler(deps: AssistHandlerDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const startedAt = Date.now();
    const validation = validateInput(assistRequestSchema, req.body);

    if (!validation.ok) {
      deps.logger.log({
        level: 'warn',
        event: 'assist_validation_failed',
        route: '/api/assist',
        method: 'POST',
        statusCode: 400,
        durationMs: Date.now() - startedAt,
        errorCode: 'VALIDATION_ERROR',
      });
      res.status(400).json({
        error: 'Invalid assistant request payload.',
        code: 'VALIDATION_ERROR',
        issues: validation.errors,
      });
      return;
    }

    const result = await runStructuredAssist(validation.data, {
      envConfig: deps.envConfig,
      cache: deps.cache,
      circuitBreaker: deps.circuitBreaker,
      client: deps.client,
      timeoutMs: deps.timeoutMs ?? 8_000,
      maxRetries: deps.maxRetries ?? 1,
      baseDelayMs: deps.baseDelayMs ?? 150,
      sleepFn: deps.sleepFn,
    });

    deps.logger.log({
      level: result.fallback ? 'warn' : 'info',
      event: result.fallback ? 'assist_fallback_served' : 'assist_served',
      route: '/api/assist',
      method: 'POST',
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      cacheStatus: result.cacheStatus,
      fallback: result.fallback,
    });

    res.status(200).json({
      fallback: result.fallback,
      ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
      cached: result.cached,
      cacheStatus: result.cacheStatus,
      bandInfo: result.bandInfo,
      plan: result.plan,
      impact: result.impact,
      assist: result.assist,
      medicalDisclaimer: result.medicalDisclaimer,
    });
  };
}
