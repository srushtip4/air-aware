import type {
  ActionImpactEstimate,
  CommuteMode,
  CommunityProjection,
  ImpactActionId,
  ImpactMetricResult,
  ImpactReport,
  RecommendationPlan,
  UserProfile,
} from '../../types';
import { IMPACT_FACTORS } from './factors';

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

function unavailableMetric(
  unit: string,
  reason: string,
  assumptions: string[] = [],
): ImpactMetricResult {
  return {
    value: null,
    unit,
    assumptions,
    isEstimate: true,
    unavailableReason: reason,
  };
}

function getVehicleFactors(mode: CommuteMode): {
  co2eKgPerKm: number;
  pm25GPerKm: number;
  co2Citation: string;
  pmCitation: string;
} | null {
  switch (mode) {
    case 'car_petrol':
      return {
        co2eKgPerKm: IMPACT_FACTORS.CAR_PETROL_CO2E_KG_PER_KM.value,
        pm25GPerKm: IMPACT_FACTORS.CAR_PETROL_PM25_G_PER_KM.value,
        co2Citation: IMPACT_FACTORS.CAR_PETROL_CO2E_KG_PER_KM.citation,
        pmCitation: IMPACT_FACTORS.CAR_PETROL_PM25_G_PER_KM.citation,
      };
    case 'car_diesel':
      return {
        co2eKgPerKm: IMPACT_FACTORS.CAR_DIESEL_CO2E_KG_PER_KM.value,
        pm25GPerKm: IMPACT_FACTORS.CAR_DIESEL_PM25_G_PER_KM.value,
        co2Citation: IMPACT_FACTORS.CAR_DIESEL_CO2E_KG_PER_KM.citation,
        pmCitation: IMPACT_FACTORS.CAR_DIESEL_PM25_G_PER_KM.citation,
      };
    case 'motorcycle':
      return {
        co2eKgPerKm: IMPACT_FACTORS.MOTORCYCLE_CO2E_KG_PER_KM.value,
        pm25GPerKm: IMPACT_FACTORS.MOTORCYCLE_PM25_G_PER_KM.value,
        co2Citation: IMPACT_FACTORS.MOTORCYCLE_CO2E_KG_PER_KM.citation,
        pmCitation: IMPACT_FACTORS.MOTORCYCLE_PM25_G_PER_KM.citation,
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
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: {
            value: 0,
            unit: 'kg CO2e/week',
            assumptions: [
              `Current commute mode (${profile.commuteMode}) is not a private fuel vehicle; 0 incremental savings.`,
            ],
            isEstimate: true,
          },
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: [
              `Current commute mode (${profile.commuteMode}) is not a private fuel vehicle; 0 incremental savings.`,
            ],
            isEstimate: true,
          },
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Commute shifts reduce ambient tailpipe emissions rather than filtering indoor household air.',
          ),
        };
      }

      const co2DeltaPerKm = Math.max(
        0,
        sourceFactors.co2eKgPerKm - IMPACT_FACTORS.PUBLIC_TRANSIT_CO2E_KG_PER_PKM.value,
      );
      const pmDeltaPerKm = Math.max(
        0,
        sourceFactors.pm25GPerKm - IMPACT_FACTORS.PUBLIC_TRANSIT_PM25_G_PER_PKM.value,
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
          assumptions: baseAssumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.co2Citation} vs ${IMPACT_FACTORS.PUBLIC_TRANSIT_CO2E_KG_PER_PKM.citation}`,
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * pmDeltaPerKm),
          unit: 'g PM2.5/week',
          assumptions: baseAssumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.pmCitation} vs ${IMPACT_FACTORS.PUBLIC_TRANSIT_PM25_G_PER_PKM.citation}`,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Commute shifts reduce ambient tailpipe emissions rather than filtering indoor household air.',
        ),
      };
    }

    case 'shift_car_to_carpool': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (
        !sourceFactors ||
        (profile.commuteMode !== 'car_petrol' && profile.commuteMode !== 'car_diesel')
      ) {
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: {
            value: 0,
            unit: 'kg CO2e/week',
            assumptions: [
              `Carpool comparison applies to private car commutes; current mode is ${profile.commuteMode}.`,
            ],
            isEstimate: true,
          },
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: [
              `Carpool comparison applies to private car commutes; current mode is ${profile.commuteMode}.`,
            ],
            isEstimate: true,
          },
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Carpooling reduces road emissions rather than filtering indoor household air.',
          ),
        };
      }

      const shareSaved = 1 - 1 / IMPACT_FACTORS.CARPOOL_AVG_OCCUPANTS.value;
      const assumptions = [
        `Weekly round-trip commute distance: ${round2(weeklyCommuteKm)} km.`,
        `Assumes ${IMPACT_FACTORS.CARPOOL_AVG_OCCUPANTS.value} occupants per carpool vehicle (${Math.round(shareSaved * 100)}% reduction per commuter).`,
      ];

      return {
        actionId,
        label,
        avoidedCo2eKgPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.co2eKgPerKm * shareSaved),
          unit: 'kg CO2e/week',
          assumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.co2Citation}; ${IMPACT_FACTORS.CARPOOL_AVG_OCCUPANTS.citation}`,
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.pm25GPerKm * shareSaved),
          unit: 'g PM2.5/week',
          assumptions,
          isEstimate: true,
          sourceCitation: `${sourceFactors.pmCitation}; ${IMPACT_FACTORS.CARPOOL_AVG_OCCUPANTS.citation}`,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Carpooling reduces road emissions rather than filtering indoor household air.',
        ),
      };
    }

    case 'shift_car_to_wfh': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (!sourceFactors || profile.commuteDaysPerWeek === 0) {
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: {
            value: 0,
            unit: 'kg CO2e/week',
            assumptions: ['No motorized commute days to shift to remote work.'],
            isEstimate: true,
          },
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: ['No motorized commute days to shift to remote work.'],
            isEstimate: true,
          },
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Avoids road travel emissions; indoor exposure depends on home sealing and filtration.',
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
          value: round2(avoidedKm * sourceFactors.co2eKgPerKm),
          unit: 'kg CO2e/week',
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.co2Citation,
        },
        avoidedPmGramsPerWeek: {
          value: round2(avoidedKm * sourceFactors.pm25GPerKm),
          unit: 'g PM2.5/week',
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.pmCitation,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Avoids road travel emissions; indoor exposure depends on home sealing and filtration.',
        ),
      };
    }

    case 'shift_car_to_bike_walk': {
      const sourceFactors = getVehicleFactors(profile.commuteMode);
      if (!sourceFactors) {
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: {
            value: 0,
            unit: 'kg CO2e/week',
            assumptions: ['Current commute mode already has zero tailpipe emissions.'],
            isEstimate: true,
          },
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: ['Current commute mode already has zero tailpipe emissions.'],
            isEstimate: true,
          },
          householdExposureReductionPct: unavailableMetric(
            '% indoor PM2.5 reduction',
            'Active transport avoids outdoor tailpipe emissions rather than filtering indoor air.',
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
          value: round2(weeklyCommuteKm * sourceFactors.co2eKgPerKm),
          unit: 'kg CO2e/week',
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.co2Citation,
        },
        avoidedPmGramsPerWeek: {
          value: round2(weeklyCommuteKm * sourceFactors.pm25GPerKm),
          unit: 'g PM2.5/week',
          assumptions,
          isEstimate: true,
          sourceCitation: sourceFactors.pmCitation,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Active transport avoids outdoor tailpipe emissions rather than filtering indoor air.',
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
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: [`Current cooking fuel (${profile.cookingFuel}) is not solid biomass/coal.`],
            isEstimate: true,
          },
          householdExposureReductionPct: {
            value: 0,
            unit: '% indoor PM2.5 reduction',
            assumptions: [`Current cooking fuel (${profile.cookingFuel}) already avoids solid-fuel smoke.`],
            isEstimate: true,
          },
        };
      }

      const weeklyBiomassPm =
        IMPACT_FACTORS.BIOMASS_COOKING_KG_WOOD_PER_DAY.value *
        7 *
        IMPACT_FACTORS.BIOMASS_COOKING_PM25_G_PER_KG_WOOD.value;
      const weeklyLpgPm =
        IMPACT_FACTORS.LPG_COOKING_KG_PER_DAY.value *
        7 *
        IMPACT_FACTORS.LPG_COOKING_PM25_G_PER_KG.value;
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
          assumptions: [
            `Assumes ${IMPACT_FACTORS.BIOMASS_COOKING_KG_WOOD_PER_DAY.value} kg/day fuelwood replaced by ${IMPACT_FACTORS.LPG_COOKING_KG_PER_DAY.value} kg/day LPG.`,
          ],
          isEstimate: true,
          sourceCitation: `${IMPACT_FACTORS.BIOMASS_COOKING_PM25_G_PER_KG_WOOD.citation}; ${IMPACT_FACTORS.LPG_COOKING_PM25_G_PER_KG.citation}`,
        },
        householdExposureReductionPct: {
          value: IMPACT_FACTORS.BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT.value,
          unit: IMPACT_FACTORS.BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT.unit,
          assumptions: [
            'Conservative lower-midpoint from WHO IAQ systematic reviews on replacing unvented biomass stoves with LPG.',
          ],
          isEstimate: true,
          sourceCitation: IMPACT_FACTORS.BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT.citation,
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
          '% indoor PM2.5 reduction',
          'Induction eliminates gas NO2/CO spikes, while cooking oil aerosol PM2.5 still depends on exhaust ventilation.',
        ),
      };

    case 'stop_open_waste_burning': {
      const avoidedPm = round2(
        IMPACT_FACTORS.HOUSEHOLD_YARD_WASTE_KG_PER_WEEK.value *
          IMPACT_FACTORS.OPEN_WASTE_BURNING_PM25_G_PER_KG.value,
      );
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
          assumptions: [
            `Assumes ${IMPACT_FACTORS.HOUSEHOLD_YARD_WASTE_KG_PER_WEEK.value} kg/week of dry leaves/yard waste composted instead of open-burned.`,
          ],
          isEstimate: true,
          sourceCitation: IMPACT_FACTORS.OPEN_WASTE_BURNING_PM25_G_PER_KG.citation,
        },
        householdExposureReductionPct: unavailableMetric(
          '% indoor PM2.5 reduction',
          'Depends on wind direction and distance from burn site; no fixed household % applies.',
        ),
      };
    }

    case 'replace_wood_heating_with_electric': {
      const usesSolidHeating =
        profile.heatingSource === 'wood_biomass' ||
        profile.heatingSource === 'coal_charcoal';
      if (!usesSolidHeating) {
        return {
          actionId,
          label,
          avoidedCo2eKgPerWeek: unavailableMetric(
            'kg CO2e/week',
            'Household does not use wood/coal heating.',
          ),
          avoidedPmGramsPerWeek: {
            value: 0,
            unit: 'g PM2.5/week',
            assumptions: [`Current heating source (${profile.heatingSource}) does not burn solid fuel.`],
            isEstimate: true,
          },
          householdExposureReductionPct: {
            value: 0,
            unit: '% indoor PM2.5 reduction',
            assumptions: [`Current heating source (${profile.heatingSource}) does not burn solid fuel.`],
            isEstimate: true,
          },
        };
      }

      const avoidedPm = round2(
        IMPACT_FACTORS.WOOD_HEATING_KG_PER_DAY.value *
          7 *
          IMPACT_FACTORS.WOOD_HEATING_PM25_G_PER_KG.value,
      );
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
          assumptions: [
            `Assumes ${IMPACT_FACTORS.WOOD_HEATING_KG_PER_DAY.value} kg/day winter wood heating replaced by electric/heat-pump heating.`,
          ],
          isEstimate: true,
          sourceCitation: IMPACT_FACTORS.WOOD_HEATING_PM25_G_PER_KG.citation,
        },
        householdExposureReductionPct: {
          value: IMPACT_FACTORS.REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT.value,
          unit: IMPACT_FACTORS.REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT.unit,
          assumptions: [
            'Assumes indoor wood smoke infiltration was a primary indoor PM2.5 contributor.',
          ],
          isEstimate: true,
          sourceCitation:
            IMPACT_FACTORS.REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT.citation,
        },
      };
    }

    case 'diy_box_fan_filter':
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
          value: IMPACT_FACTORS.DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT.value,
          unit: IMPACT_FACTORS.DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT.unit,
          assumptions: [
            'Assumes continuous operation of a sealed MERV-13 box-fan purifier sized to the main living/sleeping room.',
          ],
          isEstimate: true,
          sourceCitation: IMPACT_FACTORS.DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT.citation,
        },
      };

    case 'timed_ventilation_and_sealing':
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
          value: IMPACT_FACTORS.TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT.value,
          unit: IMPACT_FACTORS.TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT.unit,
          assumptions: [
            'Assumes sealing major door/window gaps and keeping windows closed during morning/evening inversion peaks.',
          ],
          isEstimate: true,
          sourceCitation:
            IMPACT_FACTORS.TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT.citation,
        },
      };

    case 'kitchen_exhaust_ventilation':
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
          value: IMPACT_FACTORS.KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT.value,
          unit: IMPACT_FACTORS.KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT.unit,
          assumptions: [
            'Applies to cooking-generated PM2.5 when covering pots and venting directly outdoors.',
          ],
          isEstimate: true,
          sourceCitation: IMPACT_FACTORS.KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT.citation,
        },
      };
  }
}

export function sumWeeklyImpact(
  perAction: readonly ActionImpactEstimate[],
): ImpactReport['weeklyTotal'] {
  const co2Values = perAction
    .map((a) => a.avoidedCo2eKgPerWeek.value)
    .filter((v): v is number => v !== null);
  const pmValues = perAction
    .map((a) => a.avoidedPmGramsPerWeek.value)
    .filter((v): v is number => v !== null);
  const exposureValues = perAction
    .map((a) => a.householdExposureReductionPct.value)
    .filter((v): v is number => v !== null && v > 0);

  const avoidedCo2eKg: ImpactMetricResult =
    co2Values.length > 0
      ? {
          value: round2(co2Values.reduce((acc, v) => acc + v, 0)),
          unit: 'kg CO2e/week',
          assumptions: [
            'Sum of quantified action CO2e reductions (excludes actions without universal sourced CO2e factors).',
          ],
          isEstimate: true,
        }
      : unavailableMetric(
          'kg CO2e/week',
          'None of the selected actions have a universal sourced CO2e factor for this profile.',
        );

  const avoidedPmGrams: ImpactMetricResult =
    pmValues.length > 0
      ? {
          value: round2(pmValues.reduce((acc, v) => acc + v, 0)),
          unit: 'g PM2.5/week',
          assumptions: [
            'Sum of quantified source PM2.5 emission reductions across selected actions.',
          ],
          isEstimate: true,
        }
      : unavailableMetric(
          'g PM2.5/week',
          'None of the selected actions have a quantified outdoor PM2.5 source reduction factor.',
        );

  let combinedExposureReductionPct: ImpactMetricResult;
  if (exposureValues.length > 0) {
    // Multiplicative independent mitigation: 1 - prod(1 - r_i), capped at conservative max
    const remainingFraction = exposureValues.reduce(
      (acc, pct) => acc * (1 - Math.min(pct, 100) / 100),
      1,
    );
    const rawCombinedPct = (1 - remainingFraction) * 100;
    const cappedPct = Math.min(
      round2(rawCombinedPct),
      IMPACT_FACTORS.MAX_COMBINED_EXPOSURE_REDUCTION_PCT.value,
    );
    combinedExposureReductionPct = {
      value: cappedPct,
      unit: '% indoor PM2.5 reduction',
      assumptions: [
        'Combined multiplicatively (1 - Π(1 - r_i)) and capped at 90% to avoid overstating stacked interventions.',
      ],
      isEstimate: true,
      sourceCitation: IMPACT_FACTORS.MAX_COMBINED_EXPOSURE_REDUCTION_PCT.citation,
    };
  } else {
    combinedExposureReductionPct = unavailableMetric(
      '% indoor PM2.5 reduction',
      'No indoor exposure-reduction actions were included in this set.',
    );
  }

  return {
    avoidedCo2eKg,
    avoidedPmGrams,
    combinedExposureReductionPct,
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
          assumptions: [
            `Linear projection scaling one household's weekly estimate across ${householdCount} participating households with similar profiles.`,
            ...weeklyTotal.avoidedCo2eKg.assumptions,
          ],
          isEstimate: true,
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
          assumptions: [
            `Linear projection scaling one household's weekly estimate across ${householdCount} participating households with similar profiles.`,
            ...weeklyTotal.avoidedPmGrams.assumptions,
          ],
          isEstimate: true,
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
