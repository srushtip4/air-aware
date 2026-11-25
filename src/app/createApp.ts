import compression from 'compression';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type {
  AirQualityDataAdapter,
  AirQualityReading,
  GeminiStructuredExplanation,
  GeocodedLocation,
} from '../types';
import type { StructuredGeminiClient } from '../lib/ai';
import { DemoAirQualityAdapter, OpenMeteoAdapter } from '../lib/aqi';
import { TtlCache } from '../lib/cache';
import type { AppEnvConfig } from '../lib/config';
import { loadEnvConfig } from '../lib/config';
import { CircuitBreaker } from '../lib/resilience';
import type { ServerLogger } from '../lib/security';
import {
  PerInstanceIpRateLimiter,
  createRateLimitMiddleware,
  createServerLogger,
  securityHeadersMiddleware,
} from '../lib/security';
import { createAirHandler } from './api/airHandler';
import { createAssistHandler } from './api/assistHandler';
import { createPlanHandler } from './api/planHandler';

export interface CreateAppOptions {
  envConfig?: AppEnvConfig;
  liveAdapter?: AirQualityDataAdapter;
  demoAdapter?: AirQualityDataAdapter;
  geocodeCache?: TtlCache<GeocodedLocation[]>;
  aqiCache?: TtlCache<AirQualityReading>;
  assistCache?: TtlCache<GeminiStructuredExplanation>;
  geminiClient?: StructuredGeminiClient;
  geminiCircuitBreaker?: CircuitBreaker;
  generalRateLimiter?: PerInstanceIpRateLimiter;
  assistRateLimiter?: PerInstanceIpRateLimiter;
  logger?: ServerLogger;
  geminiTimeoutMs?: number;
  geminiMaxRetries?: number;
  geminiBaseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export function createAirAwareApp(options: CreateAppOptions = {}) {
  const envConfig = options.envConfig ?? loadEnvConfig();
  const logger = options.logger ?? createServerLogger();

  const liveAdapter =
    options.liveAdapter ??
    new OpenMeteoAdapter({
      timeoutMs: envConfig.openMeteoTimeoutMs,
    });
  const demoAdapter = options.demoAdapter ?? new DemoAirQualityAdapter();

  const geocodeCache =
    options.geocodeCache ??
    new TtlCache<GeocodedLocation[]>({
      ttlMs: envConfig.aqiCacheTtlMs * 6,
      staleWhileErrorMs: envConfig.aqiCacheStaleMs,
    });

  const aqiCache =
    options.aqiCache ??
    new TtlCache<AirQualityReading>({
      ttlMs: envConfig.aqiCacheTtlMs,
      staleWhileErrorMs: envConfig.aqiCacheStaleMs,
    });

  const assistCache =
    options.assistCache ??
    new TtlCache<GeminiStructuredExplanation>({
      ttlMs: envConfig.aqiCacheTtlMs,
      staleWhileErrorMs: envConfig.aqiCacheStaleMs,
    });

  const geminiCircuitBreaker =
    options.geminiCircuitBreaker ??
    new CircuitBreaker({
      name: 'gemini-assist',
      failureThreshold: 3,
      cooldownMs: 30_000,
    });

  const generalRateLimiter =
    options.generalRateLimiter ??
    new PerInstanceIpRateLimiter({
      windowMs: 60_000,
      maxRequests: 60,
    });

  const assistRateLimiter =
    options.assistRateLimiter ??
    new PerInstanceIpRateLimiter({
      windowMs: 60_000,
      maxRequests: 10,
    });

  const app = express();
  app.disable('x-powered-by');
  // Trust the single immediate reverse proxy hop (Cloud Run / Nginx / Render) so req.ip
  // uses X-Forwarded-For without trusting arbitrary client-spoofed proxy chains.
  app.set('trust proxy', 1);
  app.use(compression());
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '32kb' }));

  // Handle malformed JSON cleanly without leaking stack traces
  app.use(
    (err: unknown, req: Request, res: Response, next: NextFunction): void => {
      if (
        err instanceof SyntaxError &&
        'status' in err &&
        (err as { status?: unknown }).status === 400
      ) {
        logger.log({
          level: 'warn',
          event: 'malformed_json',
          route: req.path,
          method: req.method,
          statusCode: 400,
          errorCode: 'INVALID_JSON',
        });
        res.status(400).json({
          error: 'Malformed JSON request body.',
          code: 'INVALID_JSON',
        });
        return;
      }
      next(err);
    },
  );

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'AirAware',
    });
  });

  app.get(
    '/api/air',
    createRateLimitMiddleware(generalRateLimiter),
    createAirHandler({
      liveAdapter,
      demoAdapter,
      geocodeCache,
      aqiCache,
      logger,
    }),
  );

  app.post(
    '/api/plan',
    createRateLimitMiddleware(generalRateLimiter),
    createPlanHandler({ logger }),
  );

  app.post(
    '/api/assist',
    createRateLimitMiddleware(assistRateLimiter),
    createAssistHandler({
      envConfig,
      cache: assistCache,
      circuitBreaker: geminiCircuitBreaker,
      logger,
      client: options.geminiClient,
      timeoutMs: options.geminiTimeoutMs,
      maxRetries: options.geminiMaxRetries,
      baseDelayMs: options.geminiBaseDelayMs,
      sleepFn: options.sleepFn,
    }),
  );

  app.use('/api', (req: Request, res: Response) => {
    logger.log({
      level: 'warn',
      event: 'api_route_not_found',
      route: req.path,
      method: req.method,
      statusCode: 404,
      errorCode: 'NOT_FOUND',
    });
    res.status(404).json({
      error: 'API endpoint not found.',
      code: 'NOT_FOUND',
    });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    logger.log({
      level: 'error',
      event: 'unhandled_server_error',
      route: req.path,
      method: req.method,
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'An unexpected error occurred.',
      code: 'INTERNAL_ERROR',
    });
  });

  return app;
}
