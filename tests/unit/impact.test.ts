import { describe, expect, it } from 'vitest';
import {
  IMPACT_FACTORS,
  calculateImpactForPlan,
  calculateImpactReport,
  estimateActionImpact,
  projectCommunityImpact,
  sumWeeklyImpact,
} from '../../src/lib/impact';
import { generateRecommendations } from '../../src/lib/recommendations';
import type { UserProfile } from '../../src/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
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
    ...overrides,
  };
}

describe('Impact calculator & sourced factors', () => {
  it('stores every numeric factor with non-empty unit and source citation', () => {
    for (const [key, factor] of Object.entries(IMPACT_FACTORS)) {
      expect(typeof factor.value, `${key} value`).toBe('number');
      expect(factor.unit.length, `${key} unit`).toBeGreaterThan(0);
      expect(factor.citation.length, `${key} citation`).toBeGreaterThan(0);
    }
  });

  it('computes exact known CO2e and PM2.5 savings for car_petrol -> transit', () => {
    // 10 km one-way * 2 * 5 days = 100 km/week
    // CO2e delta: 0.171 - 0.102 = 0.069 kg/km -> 6.9 kg/week
    // PM2.5 delta: 0.025 - 0.005 = 0.020 g/km -> 2.0 g/week
    const result = estimateActionImpact('shift_car_to_transit', makeProfile());

    expect(result.avoidedCo2eKgPerWeek.value).toBe(6.9);
    expect(result.avoidedCo2eKgPerWeek.unit).toBe('kg CO2e/week');
    expect(result.avoidedCo2eKgPerWeek.isEstimate).toBe(true);
    expect(result.avoidedCo2eKgPerWeek.assumptions.length).toBeGreaterThan(0);

    expect(result.avoidedPmGramsPerWeek.value).toBe(2);
    expect(result.avoidedPmGramsPerWeek.unit).toBe('g PM2.5/week');

    // Outdoor commute shift should not invent an indoor household exposure %
    expect(result.householdExposureReductionPct.value).toBeNull();
    expect(result.householdExposureReductionPct.unavailableReason).toBeTruthy();
  });

  it('computes carpool, WFH, diesel, motorcycle, and bike/walk impacts', () => {
    const carpool = estimateActionImpact('shift_car_to_carpool', makeProfile());
    // 100 km * 0.171 * (1 - 1/2.5 = 0.6) = 10.26 kg CO2e/week
    expect(carpool.avoidedCo2eKgPerWeek.value).toBe(10.26);
    // 100 km * 0.025 * 0.6 = 1.5 g PM2.5/week
    expect(carpool.avoidedPmGramsPerWeek.value).toBe(1.5);

    const wfh = estimateActionImpact(
      'shift_car_to_wfh',
      makeProfile({ commuteMode: 'car_diesel' }),
    );
    // 2 days * 20 km = 40 km * 0.17 = 6.8 kg CO2e; 40 * 0.045 = 1.8 g PM
    expect(wfh.avoidedCo2eKgPerWeek.value).toBe(6.8);
    expect(wfh.avoidedPmGramsPerWeek.value).toBe(1.8);

    const moto = estimateActionImpact(
      'shift_motorcycle_to_transit',
      makeProfile({ commuteMode: 'motorcycle' }),
    );
    // 100 * (0.114 - 0.102) = 1.2 kg CO2e; 100 * (0.030 - 0.005) = 2.5 g PM
    expect(moto.avoidedCo2eKgPerWeek.value).toBe(1.2);
    expect(moto.avoidedPmGramsPerWeek.value).toBe(2.5);

    const bikeWalk = estimateActionImpact('shift_car_to_bike_walk', makeProfile());
    expect(bikeWalk.avoidedCo2eKgPerWeek.value).toBe(17.1);
    expect(bikeWalk.avoidedPmGramsPerWeek.value).toBe(2.5);
  });

  it('handles zero distance, zero commute days, and already clean commutes cleanly', () => {
    const zeroDist = estimateActionImpact(
      'shift_car_to_transit',
      makeProfile({ commuteDistanceKmOneWay: 0 }),
    );
    expect(zeroDist.avoidedCo2eKgPerWeek.value).toBe(0);
    expect(zeroDist.avoidedPmGramsPerWeek.value).toBe(0);

    const zeroDays = estimateActionImpact(
      'shift_car_to_wfh',
      makeProfile({ commuteDaysPerWeek: 0 }),
    );
    expect(zeroDays.avoidedCo2eKgPerWeek.value).toBe(0);

    const alreadyTransit = estimateActionImpact(
      'shift_car_to_transit',
      makeProfile({ commuteMode: 'public_transit' }),
    );
    expect(alreadyTransit.avoidedCo2eKgPerWeek.value).toBe(0);
    expect(alreadyTransit.avoidedPmGramsPerWeek.value).toBe(0);
  });

  it('calculates cooking, heating, waste burning, and indoor filtration impacts without inventing missing factors', () => {
    const biomassCooking = estimateActionImpact(
      'clean_cooking_biomass_to_lpg',
      makeProfile({ cookingFuel: 'biomass_wood' }),
    );
    // 4*7*7.2 - 0.35*7*0.05 = 201.6 - 0.1225 = 201.48 g PM2.5/week
    expect(biomassCooking.avoidedPmGramsPerWeek.value).toBe(201.48);
    expect(biomassCooking.householdExposureReductionPct.value).toBe(65);
    expect(biomassCooking.avoidedCo2eKgPerWeek.value).toBeNull();
    expect(biomassCooking.avoidedCo2eKgPerWeek.unavailableReason).toBeTruthy();

    const induction = estimateActionImpact(
      'clean_cooking_lpg_to_induction',
      makeProfile({ cookingFuel: 'lpg' }),
    );
    expect(induction.avoidedCo2eKgPerWeek.value).toBeNull();
    expect(induction.avoidedCo2eKgPerWeek.unavailableReason).toContain('grid');

    const waste = estimateActionImpact('stop_open_waste_burning', makeProfile());
    expect(waste.avoidedPmGramsPerWeek.value).toBe(21);
    expect(waste.avoidedCo2eKgPerWeek.value).toBeNull();

    const woodHeat = estimateActionImpact(
      'replace_wood_heating_with_electric',
      makeProfile({ heatingSource: 'wood_biomass' }),
    );
    expect(woodHeat.avoidedPmGramsPerWeek.value).toBe(350);
    expect(woodHeat.householdExposureReductionPct.value).toBe(50);

    const boxFan = estimateActionImpact('diy_box_fan_filter', makeProfile());
    expect(boxFan.householdExposureReductionPct.value).toBe(55);
  });

  it('sums weekly totals with multiplicative exposure capping and computes community projection', () => {
    const report = calculateImpactReport(
      [
        'shift_car_to_transit',
        'stop_open_waste_burning',
        'diy_box_fan_filter',
        'timed_ventilation_and_sealing',
        'kitchen_exhaust_ventilation',
      ],
      makeProfile(),
      250,
    );

    expect(report.weeklyTotal.avoidedCo2eKg.value).toBe(6.9);
    expect(report.weeklyTotal.avoidedPmGrams.value).toBe(23); // 2 + 21
    // 1 - (1-0.55)*(1-0.25)*(1-0.50) = 1 - 0.45*0.75*0.5 = 83.125% -> 83.13%
    expect(report.weeklyTotal.combinedExposureReductionPct.value).toBe(83.13);

    expect(report.communityProjection.isProjection).toBe(true);
    expect(report.communityProjection.householdCount).toBe(250);
    expect(report.communityProjection.label).toContain('250');
    expect(report.communityProjection.weeklyAvoidedCo2eKg.value).toBe(1725);
    expect(report.communityProjection.weeklyAvoidedPmGrams.value).toBe(5750);
  });

  it('handles empty action sets and invalid community household counts', () => {
    const emptyTotal = sumWeeklyImpact([]);
    expect(emptyTotal.avoidedCo2eKg.value).toBeNull();
    expect(emptyTotal.avoidedPmGrams.value).toBeNull();
    expect(emptyTotal.combinedExposureReductionPct.value).toBeNull();

    const emptyProjection = projectCommunityImpact(emptyTotal, 50);
    expect(emptyProjection.weeklyAvoidedCo2eKg.value).toBeNull();
    expect(emptyProjection.weeklyAvoidedPmGrams.value).toBeNull();

    expect(() => projectCommunityImpact(emptyTotal, 0)).toThrow(RangeError);
    expect(() => projectCommunityImpact(emptyTotal, 12.5)).toThrow(RangeError);
  });

  it('integrates seamlessly with a RecommendationPlan via calculateImpactForPlan', () => {
    const profile = makeProfile();
    const plan = generateRecommendations({
      band: 'Very Poor',
      trend: 'worsening',
      profile,
    });
    const report = calculateImpactForPlan(plan, profile, 100);
    expect(report.perAction.length).toBeGreaterThan(0);
    expect(report.communityProjection.isProjection).toBe(true);
  });
});
