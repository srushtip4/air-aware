import { z } from 'zod';

export const aqiCategoryBandSchema = z.enum([
  'Good',
  'Satisfactory',
  'Moderate',
  'Poor',
  'Very Poor',
  'Severe',
]);

export const aqiTrendSchema = z.enum([
  'improving',
  'worsening',
  'stable',
  'insufficient_data',
]);

export const commuteModeSchema = z.enum([
  'car_petrol',
  'car_diesel',
  'motorcycle',
  'public_transit',
  'carpool',
  'bicycle',
  'walk',
  'work_from_home',
]);

export const cookingFuelSchema = z.enum([
  'lpg',
  'electric_induction',
  'piped_gas',
  'biomass_wood',
  'coal_kerosene',
]);

export const heatingSourceSchema = z.enum([
  'none',
  'electric_heater',
  'heat_pump',
  'gas_heater',
  'wood_biomass',
  'coal_charcoal',
]);

export const homeTypeSchema = z.enum([
  'apartment',
  'independent_house',
  'semi_detached',
  'shared_room',
]);

export const budgetTierSchema = z.enum([
  'zero_cost',
  'low_cost',
  'moderate_investment',
]);

export const householdMemberProfileSchema = z
  .object({
    hasChildren: z.boolean(),
    hasElderly: z.boolean(),
    hasRespiratoryCondition: z.boolean(),
    householdSize: z.number().int().min(1).max(20),
  })
  .strict();

export const userProfileSchema = z
  .object({
    locationQuery: z.string().trim().min(1).max(120),
    household: householdMemberProfileSchema,
    commuteMode: commuteModeSchema,
    commuteDistanceKmOneWay: z.number().finite().min(0).max(300),
    commuteDaysPerWeek: z.number().int().min(0).max(7),
    cookingFuel: cookingFuelSchema,
    heatingSource: heatingSourceSchema,
    homeType: homeTypeSchema,
    budgetTier: budgetTierSchema,
  })
  .strict();

export const geocodeQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120),
    limit: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export const aqiQueryByLocationSchema = z
  .object({
    location: z.string().trim().min(1).max(120),
    demo: z.boolean().optional(),
  })
  .strict();

export const aqiQueryByCoordsSchema = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
    locationName: z.string().trim().min(1).max(120).optional(),
    demo: z.boolean().optional(),
  })
  .strict();

export const aqiQuerySchema = z.union([
  aqiQueryByLocationSchema,
  aqiQueryByCoordsSchema,
]);

export const recommendationsRequestSchema = z
  .object({
    aqi: z.number().finite().min(0).max(1000),
    trend: aqiTrendSchema,
    profile: userProfileSchema,
    communityHouseholds: z.number().int().min(1).max(100_000).optional(),
  })
  .strict();

export const aiAssistantContextSchema = z
  .object({
    aqi: z.number().finite().min(0).max(1000),
    band: aqiCategoryBandSchema,
    trend: aqiTrendSchema,
    locationName: z.string().trim().min(1).max(120),
    source: z.string().trim().min(1).max(120),
    timestamp: z.string().trim().min(1).max(64),
  })
  .strict();

export const aiAssistantRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(600),
    profile: userProfileSchema,
    aqiContext: aiAssistantContextSchema,
  })
  .strict();

export const airRouteQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    lat: z.coerce.number().finite().min(-90).max(90).optional(),
    lon: z.coerce.number().finite().min(-180).max(180).optional(),
    locationName: z.string().trim().min(1).max(120).optional(),
    demo: z
      .union([
        z.boolean(),
        z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1'),
      ])
      .optional(),
  })
  .strict()
  .refine(
    (val) =>
      val.q !== undefined ||
      (val.lat !== undefined && val.lon !== undefined),
    {
      message: 'Either query "q" or both "lat" and "lon" coordinates are required.',
    },
  );

export const assistRequestSchema = z
  .object({
    city: z.string().trim().min(1).max(120),
    aqi: z.number().finite().min(0).max(1000),
    trend: aqiTrendSchema,
    profile: userProfileSchema,
    question: z.string().trim().min(1).max(600).optional(),
    communityHouseholds: z.number().int().min(1).max(100_000).optional(),
  })
  .strict();

export const geminiAssistOutputSchema = z
  .object({
    headline: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(800),
    dailyFocus: z.array(z.string().trim().min(1).max(240)).min(1).max(5),
    impactExplanation: z.string().trim().min(1).max(800),
    safetyReminder: z.string().trim().min(1).max(500),
    followUpSuggestions: z.array(z.string().trim().min(1).max(160)).max(3),
  })
  .strict();

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; errors: ValidationIssue[] };

export function validateInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): ValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
    })),
  };
}
