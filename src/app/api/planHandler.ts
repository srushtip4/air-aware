import type { Request, Response } from 'express';
import { categorize } from '../../lib/aqi';
import { calculateImpactForPlan } from '../../lib/impact';
import { generateRecommendations } from '../../lib/recommendations';
import type { ServerLogger } from '../../lib/security';
import { recommendationsRequestSchema, validateInput } from '../../lib/validation';

export interface PlanHandlerDeps {
  logger: ServerLogger;
}

export function createPlanHandler(deps: PlanHandlerDeps) {
  return (req: Request, res: Response): void => {
    const startedAt = Date.now();
    const validation = validateInput(recommendationsRequestSchema, req.body);

    if (!validation.ok) {
      deps.logger.log({
        level: 'warn',
        event: 'plan_validation_failed',
        route: '/api/plan',
        method: 'POST',
        statusCode: 400,
        durationMs: Date.now() - startedAt,
        errorCode: 'VALIDATION_ERROR',
      });
      res.status(400).json({
        error: 'Invalid plan request payload.',
        code: 'VALIDATION_ERROR',
        issues: validation.errors,
      });
      return;
    }

    const { aqi, trend, profile, communityHouseholds } = validation.data;
    const bandInfo = categorize(aqi);
    const plan = generateRecommendations({
      band: bandInfo.band,
      trend,
      profile,
    });
    const impact = calculateImpactForPlan(
      plan,
      profile,
      communityHouseholds ?? 100,
    );

    deps.logger.log({
      level: 'info',
      event: 'plan_generated',
      route: '/api/plan',
      method: 'POST',
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });

    res.status(200).json({
      bandInfo,
      plan,
      impact,
    });
  };
}
