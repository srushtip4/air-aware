import type {
  ActionImpactEstimate,
  CommuteMode,
  CommunityProjection,
  ExposureBaseline,
  FactorConfidence,
  FactorKind,
  ImpactActionId,
  ImpactMetricResult,
  ImpactReport,
  RecommendationPlan,
  UserProfile,
} from '../../types';
import { IMPACT_FACTORS, type SourcedFactor } from './factors';

const ACTION_LABELS: Record<ImpactActionId, string> = {
  shift_car_to_transit: 'Shift car commute to public transit',
  shift_car_to_carpool: 'Share commute via carpool',
  shift_car_to_wfh: 'Shift 2 commute days/week to work-from-home',
  shift_car_to_bike_walk: 'Switch short trips to walking or cycling',
  shift_motorcycle_to_transit: 'Shift motorcycle commute to public transit',
  clean_cooking_biomass_to_lpg: 'Switch cooking fuel from biomass/coal to LPG',
  clean_cooking_lpg_to_induction: 'Shift simmer/boil cooking to electric induction',
  stop_open_waste_burning: 'Compost yard/organic waste instead of open burning',
  replace_wood_heating_with_electric: 'Replace wood/coal heating with electric heating',
  diy_box_fan_filter: 'Run DIY MERV-13 box-fan air cleaner',
  timed_ventilation_and_sealing: 'Seal door/window drafts & time ventilation',
  kitchen_exhaust_ventilation: 'Use kitchen exhaust & cover pots while cooking',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const KIND_UNCERTAINTY_RANK: Record<FactorKind, number> = {
  sourced: 0,
  proxy: 1,
  assumption: 2,
};

const CONFIDENCE_RANK: Record<FactorConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function combineFactorKinds(...kinds: readonly FactorKind[]): FactorKind {
  let worst: FactorKind = 'sourced';
  for (const kind of kinds) {
    if (KIND_UNCERTAINTY_RANK[kind] > KIND_UNCERTAINTY_RANK[worst]) {
      worst = kind;
    }
  }
  return worst;
}

function minConfidence(
  ...confidences: readonly FactorConfidence[]
): FactorConfidence {
  let lowest: FactorConfidence = 'high';
  for (const confidence of confidences) {
    if (CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[lowest]) {
      lowest = confidence;
    }
  }
  return lowest;
}

function combineNotes(...notes: readonly (string | undefined)[]): string | undefined {
  const unique = Array.from(
    new Set(notes.filter((n): n is string => Boolean(n && n.trim().length > 0))),
  );
  return unique.length > 0 ? unique.join(' ') : undefined;
}

function unavailableMetric(
  unit: string,
  reason: string,
  assumptions: string[] = [],
  baseline?: ExposureBaseline,
): ImpactMetricResult {
  return {
    value: null,
    unit,
    kind: 'assumption',
    confidence: 'low',
    assumptions,
    isEstimate: true,
    ...(baseline ? { baseline } : {}),
    unavailableReason: reason,
  };
}

function zeroMetric(
  unit: string,
  assumption: string,
  baseline?: ExposureBaseline,
): ImpactMetricResult {
  return {
    value: 0,
    unit,
    kind: 'assumption',
    confidence: 'medium',
    assumptions: [assumption],
    isEstimate: true,
    ...(baseline ? { baseline } : {}),
  };
}

interface VehicleFactorPair {
  co2Factor: SourcedFactor;
  pmFactor: SourcedFactor;
}

function getVehicleFactors(mode: CommuteMode): VehicleFactorPair | null {
  switch (mode) {
    case 'car_petrol':
      return {
        co2Factor: IMPACT_FACTORS.CAR_PETROL_CO2E_KG_PER_KM,
        pmFactor: IMPACT_FACTORS.CAR_PETROL_PM25_G_PER_KM,
      };
    case 'car_diesel':
      return {
        co2Factor: IMPACT_FACTORS.CAR_DIESEL_CO2E_KG_PER_KM,
        pmFactor: IMPACT_FACTORS.CAR_DIESEL_PM25_G_PER_KM,
      };
    case 'motorcycle':
      return {
        co2Factor: IMPACT_FACTORS.MOTORCYCLE_CO2E_KG_PER_KM,
        pmFactor: IMPACT_FACTORS.MOTORCYCLE_PM25_G_PER_KM,
      };
    default:
      return null;
  }
}

export function estimateActionImpact(
  actionId: ImpactActionId,
  profile: UserProfile,
): ActionImpactEstimate {
  const label = ACTION_LABELS[actionId];
  const weeklyCommuteKm =
    profile.commuteDistanceKmOneWay * 2 * profile.commuteDaysPerWeek;

  switch (actionId) {
    case 'shift_car_to_transit':
    case 'shift_motorcycle_to_transit': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (!sourceFactors) {
        const msg = `Current commute mode (${profile.commuteMode}) is not a private fuel vehicle; 0 incremental savings.`;
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: zeroMetric('kg CO2e/week', msg),
          avoidedPmGramsPerWeek: zeroMetric('g PM2.5/week', msg),
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Commute shifts reduce ambient tailpipe emissions rather than filtering indoor household air.',
            [],
            'indoor_pm25',
          ),
        };
      }

      const transitCo2: SourcedFactor = IMPACT_FACTORS.PUBLIC_TRANSIT_CO2E_KG_PER_PKM;
      const transitPm: SourcedFactor = IMPACT_FACTORS.PUBLIC_TRANSIT_PM25_G_PER_PKM;
      const co2DeltaPerKm = Math.max(
        0,
        sourceFactors.co2Factor.value - transitCo2.value,
      );
      const pmDeltaPerKm = Math.max(
        0,
        sourceFactors.pmFactor.value - transitPm.value,
      );
      const baseAssumptions = [
        `Weekly round-trip commute distance: ${round2(weeklyCommuteKm)} km (${profile.commuteDistanceKmOneWay} km one-way × 2 × ${profile.commuteDaysPerWeek} days).`,
        `Assumes shifting 100% of ${profile.commuteMode} trips to urban public transit.`,
      ];

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: {
          value: round2(weeklyCommuteKm * co2DeltaPerKm),
          unit: 'kg CO2e/week',
          kind: combineFactorKinds(sourceFactors.co2Factor.kind, transitCo2.kind),
          confidence: minConfidence(
            sourceFactors.co2Factor.confidence,
            transitCo2.confidence,
          ),
          assumptions: baseAssumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.co2Factor.citation} vs ${transitCo2.citation}`,
          note: combineNotes(sourceFactors.co2Factor.note, transitCo2.note),
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * pmDeltaPerKm),
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(sourceFactors.pmFactor.kind, transitPm.kind),
          confidence: minConfidence(
            sourceFactors.pmFactor.confidence,
            transitPm.confidence,
          ),
          assumptions: baseAssumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.pmFactor.citation}; ${transitPm.citation}`,
          note: combineNotes(sourceFactors.pmFactor.note, transitPm.note),
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Commute shifts reduce ambient tailpipe emissions rather than filtering indoor household air.',
          [],
          'indoor_pm25',
        ),
      };
    }

    case 'shift_car_to_carpool': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (
        !sourceFactors ||
        (profile.commuteMode !== 'car_petrol' && profile.commuteMode !== 'car_diesel')
      ) {
        const msg = `Carpool comparison applies to private car commutes; current mode is ${profile.commuteMode}.`;
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: zeroMetric('kg CO2e/week', msg),
          avoidedPmGramsPerWeek: zeroMetric('g PM2.5/week', msg),
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Carpooling reduces road emissions rather than filtering indoor household air.',
            [],
            'indoor_pm25',
          ),
        };
      }

      const carpoolFactor: SourcedFactor = IMPACT_FACTORS.CARPOOL_AVG_OCCUPANTS;
      const shareSaved = 1 - 1 / carpoolFactor.value;
      const assumptions = [
        `Weekly round-trip commute distance: ${round2(weeklyCommuteKm)} km.`,
        `Assumes ${carpoolFactor.value} occupants per carpool vehicle (${Math.round(shareSaved * 100)}% reduction per commuter).`,
      ];

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.co2Factor.value * shareSaved),
          unit: 'kg CO2e/week',
          kind: combineFactorKinds(sourceFactors.co2Factor.kind, carpoolFactor.kind),
          confidence: minConfidence(
            sourceFactors.co2Factor.confidence,
            carpoolFactor.confidence,
          ),
          assumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.co2Factor.citation}; ${carpoolFactor.citation}`,
          note: combineNotes(sourceFactors.co2Factor.note, carpoolFactor.note),
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.pmFactor.value * shareSaved),
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(sourceFactors.pmFactor.kind, carpoolFactor.kind),
          confidence: minConfidence(
            sourceFactors.pmFactor.confidence,
            carpoolFactor.confidence,
          ),
          assumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.pmFactor.citation}; ${carpoolFactor.citation}`,
          note: combineNotes(sourceFactors.pmFactor.note, carpoolFactor.note),
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Carpooling reduces road emissions rather than filtering indoor household air.',
          [],
          'indoor_pm25',
        ),
      };
    }

    case 'shift_car_to_wfh': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (!sourceFactors || profile.commuteDaysPerWeek === 0) {
        const msg = 'No motorized commute days to shift to remote work.';
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: zeroMetric('kg CO2e/week', msg),
          avoidedPmGramsPerWeek: zeroMetric('g PM2.5/week', msg),
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Avoids road travel emissions; indoor exposure depends on home sealing and filtration.',
            [],
            'indoor_pm25',
          ),
        };
      }

      const wfhDays = Math.min(2, profile.commuteDaysPerWeek);
      const avoidedKm = profile.commuteDistanceKmOneWay * 2 * wfhDays;
      const assumptions = [
        `Assumes shifting ${wfhDays} commute day(s)/week (${round2(avoidedKm)} km/week) to remote work.`,
        'Excludes marginal home electricity difference due to regional grid variation.',
      ];

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: {
          value: round2(avoidedKm * sourceFactors.co2Factor.value),
          unit: 'kg CO2e/week',
          kind: sourceFactors.co2Factor.kind,
          confidence: sourceFactors.co2Factor.confidence,
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.co2Factor.citation,
          note: sourceFactors.co2Factor.note,
        },
        avoidedPmGramsPerWeek: {
          value: round2(avoidedKm * sourceFactors.pmFactor.value),
          unit: 'g PM2.5/week',
          kind: sourceFactors.pmFactor.kind,
          confidence: sourceFactors.pmFactor.confidence,
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.pmFactor.citation,
          note: sourceFactors.pmFactor.note,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Avoids road travel emissions; indoor exposure depends on home sealing and filtration.',
          [],
          'indoor_pm25',
        ),
      };
    }

    case 'shift_car_to_bike_walk': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (!sourceFactors) {
        const msg = 'Current commute mode already has zero tailpipe emissions.';
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: zeroMetric('kg CO2e/week', msg),
          avoidedPmGramsPerWeek: zeroMetric('g PM2.5/week', msg),
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Active transport avoids outdoor tailpipe emissions rather than filtering indoor air.',
            [],
            'indoor_pm25',
          ),
        };
      }

      const assumptions = [
        `Weekly round-trip distance: ${round2(weeklyCommuteKm)} km shifted to zero-tailpipe walking/cycling.`,
      ];

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.co2Factor.value),
          unit: 'kg CO2e/week',
          kind: sourceFactors.co2Factor.kind,
          confidence: sourceFactors.co2Factor.confidence,
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.co2Factor.citation,
          note: sourceFactors.co2Factor.note,
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.pmFactor.value),
          unit: 'g PM2.5/week',
          kind: sourceFactors.pmFactor.kind,
          confidence: sourceFactors.pmFactor.confidence,
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.pmFactor.citation,
          note: sourceFactors.pmFactor.note,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Active transport avoids outdoor tailpipe emissions rather than filtering indoor air.',
          [],
          'indoor_pm25',
        ),
      };
    }

    case 'clean_cooking_biomass_to_lpg': {
      const usesSolidFuel =
        profile.cookingFuel === 'biomass_wood' ||
        profile.cookingFuel === 'coal_kerosene';

      if (!usesSolidFuel) {
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: unavailableMetric(
            'kg CO2e/week',
            'Household already uses cleaner cooking fuel.',
          ),
          avoidedPmGramsPerWeek: zeroMetric(
            'g PM2.5/week',
            `Current cooking fuel (${profile.cookingFuel}) is not solid biomass/coal.`,
          ),
          householdExposureReductionPct: zeroMetric(
            '% indoor PM2.5 reduction',
            `Current cooking fuel (${profile.cookingFuel}) already avoids solid-fuel smoke.`,
            'indoor_pm25',
          ),
        };
      }

      const biomassKg = IMPACT_FACTORS.BIOMASS_COOKING_KG_WOOD_PER_DAY;
      const biomassPm = IMPACT_FACTORS.BIOMASS_COOKING_PM25_G_PER_KG_WOOD;
      const lpgKg = IMPACT_FACTORS.LPG_COOKING_KG_PER_DAY;
      const lpgPm = IMPACT_FACTORS.LPG_COOKING_PM25_G_PER_KG;
      const exposureFactor = IMPACT_FACTORS.BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT;

      const weeklyBiomassPm = biomassKg.value * 7 * biomassPm.value;
      const weeklyLpgPm = lpgKg.value * 7 * lpgPm.value;
      const avoidedPm = round2(Math.max(0, weeklyBiomassPm - weeklyLpgPm));

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Net CO2e depends on local non-renewable biomass fraction (fNRB), which varies by region; no invented global number is used.',
        ),
        avoidedPmGramsPerWeek: {
          value: avoidedPm,
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(
            biomassKg.kind,
            biomassPm.kind,
            lpgKg.kind,
            lpgPm.kind,
          ),
          confidence: minConfidence(
            biomassKg.confidence,
            biomassPm.confidence,
            lpgKg.confidence,
            lpgPm.confidence,
          ),
          assumptions: [
            `Assumes ${biomassKg.value} kg/day fuelwood replaced by ${lpgKg.value} kg/day LPG.`,
          ],
          isEstimate: true,
          sourceCitation: `${biomassPm.citation}; ${lpgPm.citation}; ${biomassKg.citation}; ${lpgKg.citation}`,
        },
        householdExposureReductionPct: {
          value: exposureFactor.value,
          unit: exposureFactor.unit,
          kind: exposureFactor.kind,
          confidence: exposureFactor.confidence,
          baseline: exposureFactor.baseline,
          assumptions: [
            'Applies to whole-home indoor PM2.5 baseline where unvented biomass cooking is a primary indoor particle source.',
          ],
          isEstimate: true,
          sourceCitation: exposureFactor.citation,
          note: exposureFactor.note,
        },
      };
    }

    case 'clean_cooking_lpg_to_induction':
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Net CO2e depends on local electricity grid carbon intensity, which is not provided in profile.',
        ),
        avoidedPmGramsPerWeek: unavailableMetric(
          'g PM2.5/week',
          'No universal outdoor PM2.5 emission delta factor applies across varied cooking oils and grid mixes.',
        ),
        householdExposureReductionPct: unavailableMetric(
          '% cooking PM2.5 reduction',
          'Induction eliminates gas NO2/CO spikes, while cooking oil aerosol PM2.5 still depends on exhaust ventilation.',
          [],
          'cooking_pm25',
        ),
      };

    case 'stop_open_waste_burning': {
      const wasteKg = IMPACT_FACTORS.HOUSEHOLD_YARD_WASTE_KG_PER_WEEK;
      const wastePm = IMPACT_FACTORS.OPEN_WASTE_BURNING_PM25_G_PER_KG;
      const avoidedPm = round2(wasteKg.value * wastePm.value);
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Biogenic vs synthetic plastic composition in open waste varies widely; CO2e is omitted rather than guessed.',
        ),
        avoidedPmGramsPerWeek: {
          value: avoidedPm,
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(wasteKg.kind, wastePm.kind),
          confidence: minConfidence(wasteKg.confidence, wastePm.confidence),
          assumptions: [
            `Assumes ${wasteKg.value} kg/week of dry leaves/yard waste composted instead of open-burned.`,
          ],
          isEstimate: true,
          sourceCitation: `${wastePm.citation}; ${wasteKg.citation}`,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Depends on wind direction and distance from burn site; no fixed household % applies.',
          [],
          'indoor_pm25',
        ),
      };
    }

    case 'replace_wood_heating_with_electric': {
      const usesSolidHeating =
        profile.heatingSource === 'wood_biomass' ||
        profile.heatingSource === 'coal_charcoal';
      if (!usesSolidHeating) {
        const msg = `Current heating source (${profile.heatingSource}) does not burn solid fuel.`;
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: unavailableMetric(
            'kg CO2e/week',
            'Household does not use wood/coal heating.',
          ),
          avoidedPmGramsPerWeek: zeroMetric('g PM2.5/week', msg),
          householdExposureReductionPct: zeroMetric(
            '% indoor PM2.5 reduction',
            msg,
            'indoor_pm25',
          ),
        };
      }

      const woodKg = IMPACT_FACTORS.WOOD_HEATING_KG_PER_DAY;
      const woodPm = IMPACT_FACTORS.WOOD_HEATING_PM25_G_PER_KG;
      const exposureFactor = IMPACT_FACTORS.REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT;

      const avoidedPm = round2(woodKg.value * 7 * woodPm.value);
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Net CO2e depends on local electricity grid carbon intensity and wood sustainability.',
        ),
        avoidedPmGramsPerWeek: {
          value: avoidedPm,
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(woodKg.kind, woodPm.kind),
          confidence: minConfidence(woodKg.confidence, woodPm.confidence),
          assumptions: [
            `Assumes ${woodKg.value} kg/day winter wood heating replaced by electric/heat-pump heating.`,
          ],
          isEstimate: true,
          sourceCitation: `${woodPm.citation}; ${woodKg.citation}`,
        },
        householdExposureReductionPct: {
          value: exposureFactor.value,
          unit: exposureFactor.unit,
          kind: exposureFactor.kind,
          confidence: exposureFactor.confidence,
          baseline: exposureFactor.baseline,
          assumptions: [
            'Assumes indoor wood smoke infiltration was a primary indoor PM2.5 contributor (indoor_pm25 baseline).',
          ],
          isEstimate: true,
          sourceCitation: exposureFactor.citation,
          note: exposureFactor.note,
        },
      };
    }

    case 'diy_box_fan_filter': {
      const boxFanFactor = IMPACT_FACTORS.DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT;
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Air filtration captures indoor particles rather than avoiding combustion CO2e.',
        ),
        avoidedPmGramsPerWeek: unavailableMetric(
          'g PM2.5/week',
          'Filtration captures airborne indoor PM rather than preventing outdoor source emissions.',
        ),
        householdExposureReductionPct: {
          value: boxFanFactor.value,
          unit: boxFanFactor.unit,
          kind: boxFanFactor.kind,
          confidence: boxFanFactor.confidence,
          baseline: boxFanFactor.baseline,
          assumptions: [
            'Assumes continuous operation of a sealed MERV-13 box-fan purifier sized to the main living/sleeping room (indoor_pm25 baseline).',
          ],
          isEstimate: true,
          sourceCitation: boxFanFactor.citation,
          note: boxFanFactor.note,
        },
      };
    }

    case 'timed_ventilation_and_sealing': {
      const sealingFactor =
        IMPACT_FACTORS.TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT;
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Passive draft sealing and timed ventilation do not directly reduce combustion CO2e.',
        ),
        avoidedPmGramsPerWeek: unavailableMetric(
          'g PM2.5/week',
          'Reduces outdoor smog infiltration indoors rather than cutting ambient emissions.',
        ),
        householdExposureReductionPct: {
          value: sealingFactor.value,
          unit: sealingFactor.unit,
          kind: sealingFactor.kind,
          confidence: sealingFactor.confidence,
          baseline: sealingFactor.baseline,
          assumptions: [
            'Assumes sealing major door/window gaps and keeping windows closed during morning/evening inversion peaks (indoor_pm25 baseline).',
          ],
          isEstimate: true,
          sourceCitation: sealingFactor.citation,
          note: sealingFactor.note,
        },
      };
    }

    case 'kitchen_exhaust_ventilation': {
      const kitchenFactor = IMPACT_FACTORS.KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT;
      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: unavailableMetric(
          'kg CO2e/week',
          'Exhaust ventilation removes indoor cooking aerosols rather than reducing fuel CO2e.',
        ),
        avoidedPmGramsPerWeek: unavailableMetric(
          'g PM2.5/week',
          'Vents cooking aerosols out of the kitchen rather than reducing total PM generation.',
        ),
        householdExposureReductionPct: {
          value: kitchenFactor.value,
          unit: kitchenFactor.unit,
          kind: kitchenFactor.kind,
          confidence: kitchenFactor.confidence,
          baseline: kitchenFactor.baseline,
          assumptions: [
            'Applies ONLY to cooking-generated PM2.5 (cooking_pm25 baseline) when covering pots and venting directly outdoors.',
          ],
          isEstimate: true,
          sourceCitation: kitchenFactor.citation,
          note: kitchenFactor.note,
        },
      };
    }
  }
}

function combinePercentageBaseline(
  metrics: readonly ImpactMetricResult[],
  baseline: ExposureBaseline,
  unit: string,
  emptyReason: string,
): ImpactMetricResult {
  const matching = metrics.filter(
    (m) => m.baseline === baseline && m.value !== null && m.value > 0,
  );
  if (matching.length === 0) {
    return unavailableMetric(unit, emptyReason, [], baseline);
  }

  // Multiplicative independent mitigation within the SAME baseline: 1 - prod(1 - r_i),
  // capped at MAX_COMBINED_EXPOSURE_REDUCTION_PCT so stacked interventions stay conservative.
  const remainingFraction = matching.reduce(
    (acc, metric) => acc * (1 - Math.min(metric.value ?? 0, 100) / 100),
    1,
  );
  const rawCombinedPct = (1 - remainingFraction) * 100;
  const maxCap = IMPACT_FACTORS.MAX_COMBINED_EXPOSURE_REDUCTION_PCT;
  const cappedPct = Math.min(round2(rawCombinedPct), maxCap.value);

  return {
    value: cappedPct,
    unit,
    kind: combineFactorKinds(...matching.map((m) => m.kind), maxCap.kind),
    confidence: minConfidence(...matching.map((m) => m.confidence), maxCap.confidence),
    baseline,
    assumptions: [
      `Combined multiplicatively (1 - Π(1 - r_i)) across ${matching.length} action(s) targeting the ${baseline} baseline and capped at ${maxCap.value}%.`,
    ],
    isEstimate: true,
    sourceCitation: maxCap.citation,
    note: maxCap.note,
  };
}

export function sumWeeklyImpact(
  perAction: readonly ActionImpactEstimate[],
): ImpactReport['weeklyTotal'] {
  const co2Metrics = perAction
    .map((a) => a.avoidedCo2eKgPerWeek)
    .filter((m): m is ImpactMetricResult & { value: number } => m.value !== null);
  const pmMetrics = perAction
    .map((a) => a.avoidedPmGramsPerWeek)
    .filter((m): m is ImpactMetricResult & { value: number } => m.value !== null);

  const nonZeroCo2 = co2Metrics.filter((m) => m.value > 0);
  const co2ForMeta = nonZeroCo2.length > 0 ? nonZeroCo2 : co2Metrics;

  const nonZeroPm = pmMetrics.filter((m) => m.value > 0);
  const pmForMeta = nonZeroPm.length > 0 ? nonZeroPm : pmMetrics;

  const avoidedCo2eKg: ImpactMetricResult =
    co2Metrics.length > 0
      ? {
          value: round2(co2Metrics.reduce((acc, m) => acc + m.value, 0)),
          unit: 'kg CO2e/week',
          kind: combineFactorKinds(...co2ForMeta.map((m) => m.kind)),
          confidence: minConfidence(...co2ForMeta.map((m) => m.confidence)),
          assumptions: [
            'Sum of quantified action CO2e reductions (excludes actions without universal CO2e factors).',
          ],
          isEstimate: true,
          note: combineNotes(...co2ForMeta.map((m) => m.note)),
        }
      : unavailableMetric(
          'kg CO2e/week',
          'None of the selected actions have a universal CO2e factor for this profile.',
        );

  const avoidedPmGrams: ImpactMetricResult =
    pmMetrics.length > 0
      ? {
          value: round2(pmMetrics.reduce((acc, m) => acc + m.value, 0)),
          unit: 'g PM2.5/week',
          kind: combineFactorKinds(...pmForMeta.map((m) => m.kind)),
          confidence: minConfidence(...pmForMeta.map((m) => m.confidence)),
          assumptions: [
            'Sum of quantified source PM2.5 emission reductions across selected actions.',
          ],
          isEstimate: true,
          note: combineNotes(...pmForMeta.map((m) => m.note)),
        }
      : unavailableMetric(
          'g PM2.5/week',
          'None of the selected actions have a quantified outdoor PM2.5 source reduction factor.',
        );

  const exposureMetrics = perAction.map((a) => a.householdExposureReductionPct);

  // Only combine actions whose baseline is 'indoor_pm25'; never mix cooking_pm25 into indoor_pm25.
  const combinedExposureReductionPct = combinePercentageBaseline(
    exposureMetrics,
    'indoor_pm25',
    '% indoor PM2.5 reduction',
    'No indoor PM2.5 exposure-reduction actions were included in this set.',
  );

  const cookingExposureReductionPct = combinePercentageBaseline(
    exposureMetrics,
    'cooking_pm25',
    '% cooking PM2.5 reduction',
    'No cooking PM2.5 capture actions were included in this set.',
  );

  return {
    avoidedCo2eKg,
    avoidedPmGrams,
    combinedExposureReductionPct,
    ...(cookingExposureReductionPct.value !== null
      ? { cookingExposureReductionPct }
      : {}),
  };
}

export function projectCommunityImpact(
  weeklyTotal: ImpactReport['weeklyTotal'],
  householdCount: number,
): CommunityProjection {
  if (!Number.isInteger(householdCount) || householdCount < 1) {
    throw new RangeError(
      `householdCount must be a positive integer, received: ${householdCount}`,
    );
  }

  const label = `Community Projection (${householdCount.toLocaleString('en-US')} similar households)`;

  const weeklyAvoidedCo2eKg: ImpactMetricResult =
    weeklyTotal.avoidedCo2eKg.value !== null
      ? {
          value: round2(weeklyTotal.avoidedCo2eKg.value * householdCount),
          unit: 'kg CO2e/week',
          kind: weeklyTotal.avoidedCo2eKg.kind,
          confidence: weeklyTotal.avoidedCo2eKg.confidence,
          assumptions: [
            `Linear projection scaling one household's weekly estimate across ${householdCount} participating households with similar profiles.`,
            ...weeklyTotal.avoidedCo2eKg.assumptions,
          ],
          isEstimate: true,
          note: weeklyTotal.avoidedCo2eKg.note,
        }
      : unavailableMetric(
          'kg CO2e/week',
          weeklyTotal.avoidedCo2eKg.unavailableReason ??
            'No household CO2e estimate available to project.',
        );

  const weeklyAvoidedPmGrams: ImpactMetricResult =
    weeklyTotal.avoidedPmGrams.value !== null
      ? {
          value: round2(weeklyTotal.avoidedPmGrams.value * householdCount),
          unit: 'g PM2.5/week',
          kind: weeklyTotal.avoidedPmGrams.kind,
          confidence: weeklyTotal.avoidedPmGrams.confidence,
          assumptions: [
            `Linear projection scaling one household's weekly estimate across ${householdCount} participating households with similar profiles.`,
            ...weeklyTotal.avoidedPmGrams.assumptions,
          ],
          isEstimate: true,
          note: weeklyTotal.avoidedPmGrams.note,
        }
      : unavailableMetric(
          'g PM2.5/week',
          weeklyTotal.avoidedPmGrams.unavailableReason ??
            'No household PM2.5 estimate available to project.',
        );

  return {
    householdCount,
    isProjection: true,
    label,
    weeklyAvoidedCo2eKg,
    weeklyAvoidedPmGrams,
  };
}

export function calculateImpactReport(
  actionIds: readonly ImpactActionId[],
  profile: UserProfile,
  communityHouseholds = 100,
): ImpactReport {
  const uniqueIds = Array.from(new Set(actionIds));
  const perAction = uniqueIds.map((id) => estimateActionImpact(id, profile));
  const weeklyTotal = sumWeeklyImpact(perAction);
  const communityProjection = projectCommunityImpact(
    weeklyTotal,
    communityHouseholds,
  );

  return {
    perAction,
    weeklyTotal,
    communityProjection,
  };
}

export function calculateImpactForPlan(
  plan: RecommendationPlan,
  profile: UserProfile,
  communityHouseholds = 100,
): ImpactReport {
  const allItems = [
    ...plan.dailyRoutine,
    ...plan.indoorHacks,
    ...plan.sustainableAlternatives,
  ];
  const actionIds = allItems
    .map((item) => item.impactActionId)
    .filter((id): id is ImpactActionId => id !== undefined);

  return calculateImpactReport(actionIds, profile, communityHouseholds);
}

