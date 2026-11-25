import { describe, expect, it } from 'vitest';
import {
  MEDICAL_DISCLAIMER,
  generateRecommendations,
} from '../../src/lib/recommendations';
import type { AqiCategoryBand, AqiTrend, UserProfile } from '../../src/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    locationQuery: 'New Delhi',
    household: {
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      householdSize: 3,
    },
    commuteMode: 'car_petrol',
    commuteDistanceKmOneWay: 12,
    commuteDaysPerWeek: 5,
    cookingFuel: 'lpg',
    heatingSource: 'electric_heater',
    homeType: 'apartment',
    budgetTier: 'low_cost',
    ...overrides,
  };
}

describe('Deterministic Recommendations Engine', () => {
  const fixedNow = new Date('2026-11-24T10:00:00.000Z');

  it('always structures output into 3 groups plus medical disclaimer', () => {
    const plan = generateRecommendations({
      band: 'Poor',
      trend: 'worsening',
      profile: makeProfile(),
      now: fixedNow,
    });

    expect(plan.dailyRoutine.length).toBeGreaterThan(0);
    expect(plan.indoorHacks.length).toBeGreaterThan(0);
    expect(plan.sustainableAlternatives.length).toBeGreaterThan(0);
    expect(plan.medicalDisclaimer).toBe(MEDICAL_DISCLAIMER);
    expect(plan.medicalDisclaimer.toLowerCase()).toContain('not medical advice');
    expect(plan.generatedAt).toBe(fixedNow.toISOString());
  });

  it.each<[AqiCategoryBand, AqiTrend]>([
    ['Good', 'stable'],
    ['Satisfactory', 'improving'],
    ['Moderate', 'worsening'],
    ['Poor', 'stable'],
    ['Very Poor', 'improving'],
    ['Severe', 'worsening'],
  ])('handles AQI band %s with trend %s deterministically', (band, trend) => {
    const plan = generateRecommendations({
      band,
      trend,
      profile: makeProfile(),
      now: fixedNow,
    });

    expect(plan.band).toBe(band);
    expect(plan.trend).toBe(trend);
    expect(plan.dailyRoutine.some((item) => item.timeSlot === 'early_morning')).toBe(
      true,
    );
    expect(plan.dailyRoutine.some((item) => item.timeSlot === 'midday')).toBe(true);
    expect(plan.dailyRoutine.some((item) => item.timeSlot === 'evening')).toBe(true);
  });

  it('adds night sleeping-zone item and emergency precautions in Severe / Very Poor bands', () => {
    const severePlan = generateRecommendations({
      band: 'Severe',
      trend: 'worsening',
      profile: makeProfile(),
    });

    expect(severePlan.dailyRoutine.some((i) => i.timeSlot === 'night')).toBe(true);
    expect(
      severePlan.safetyPrecautions.some((p) => p.severity === 'emergency'),
    ).toBe(true);
  });

  it('triggers vulnerable member precautions for children, elderly, and respiratory conditions', () => {
    const vulnerablePlan = generateRecommendations({
      band: 'Moderate',
      trend: 'stable',
      profile: makeProfile({
        household: {
          hasChildren: true,
          hasElderly: true,
          hasRespiratoryCondition: true,
          householdSize: 5,
        },
      }),
    });

    const ids = vulnerablePlan.safetyPrecautions.map((p) => p.id);
    expect(ids).toContain('safety-moderate-vulnerable');
    expect(ids).toContain('safety-children');
    expect(ids).toContain('safety-elderly');
    expect(ids).toContain('safety-respiratory');

    const healthyGoodPlan = generateRecommendations({
      band: 'Good',
      trend: 'improving',
      profile: makeProfile(),
    });
    expect(healthyGoodPlan.safetyPrecautions).toHaveLength(0);
  });

  it('protects exposed active/motorcycle commutes on Poor or worse days', () => {
    const bikePoor = generateRecommendations({
      band: 'Poor',
      trend: 'stable',
      profile: makeProfile({
        commuteMode: 'bicycle',
        commuteDistanceKmOneWay: 4,
      }),
    });
    expect(
      bikePoor.dailyRoutine.some((r) => r.id === 'routine-commute-protection'),
    ).toBe(true);
  });

  it('gates indoorHacks cost tiers strictly by budgetTier', () => {
    const zeroCost = generateRecommendations({
      band: 'Very Poor',
      trend: 'stable',
      profile: makeProfile({ budgetTier: 'zero_cost' }),
    });
    expect(zeroCost.indoorHacks.every((h) => h.costTier === 'free')).toBe(true);

    const lowCost = generateRecommendations({
      band: 'Very Poor',
      trend: 'stable',
      profile: makeProfile({ budgetTier: 'low_cost' }),
    });
    expect(lowCost.indoorHacks.some((h) => h.costTier === 'low_cost')).toBe(true);
    expect(lowCost.indoorHacks.some((h) => h.costTier === 'investment')).toBe(false);

    const investment = generateRecommendations({
      band: 'Very Poor',
      trend: 'stable',
      profile: makeProfile({ budgetTier: 'moderate_investment' }),
    });
    expect(investment.indoorHacks.some((h) => h.costTier === 'investment')).toBe(true);
  });

  it('tailors gap-sealing hack to shared_room and independent_house home types', () => {
    const shared = generateRecommendations({
      band: 'Poor',
      trend: 'stable',
      profile: makeProfile({ homeType: 'shared_room' }),
    });
    expect(
      shared.indoorHacks.find((h) => h.id === 'hack-free-gap-sealing')?.title,
    ).toContain('single-room');

    const house = generateRecommendations({
      band: 'Poor',
      trend: 'stable',
      profile: makeProfile({ homeType: 'independent_house' }),
    });
    expect(
      house.indoorHacks.find((h) => h.id === 'hack-free-gap-sealing')?.summary,
    ).toContain('Ground-level');
  });

  it('branches sustainableAlternatives by commute distance, cooking fuel, and heating source', () => {
    const shortCarUnhealthy = generateRecommendations({
      band: 'Poor',
      trend: 'stable',
      profile: makeProfile({
        commuteMode: 'car_diesel',
        commuteDistanceKmOneWay: 3,
      }),
    });
    expect(
      shortCarUnhealthy.sustainableAlternatives.find(
        (a) => a.id === 'alt-commute-short-active',
      )?.impactActionId,
    ).toBe('shift_car_to_transit');

    const shortCarClean = generateRecommendations({
      band: 'Good',
      trend: 'stable',
      profile: makeProfile({
        commuteMode: 'car_petrol',
        commuteDistanceKmOneWay: 3,
      }),
    });
    expect(
      shortCarClean.sustainableAlternatives.find(
        (a) => a.id === 'alt-commute-short-active',
      )?.impactActionId,
    ).toBe('shift_car_to_bike_walk');

    const biomassAndWood = generateRecommendations({
      band: 'Severe',
      trend: 'worsening',
      profile: makeProfile({
        commuteMode: 'walk',
        commuteDistanceKmOneWay: 2,
        cookingFuel: 'biomass_wood',
        heatingSource: 'wood_biomass',
      }),
    });
    const altIds = biomassAndWood.sustainableAlternatives.map((a) => a.id);
    expect(altIds).toContain('alt-commute-keep-low-emission');
    expect(altIds).toContain('alt-cooking-clean-transition');
    expect(altIds).toContain('alt-heating-no-solid-burn');
    expect(altIds).toContain('alt-community-no-waste-burning');
    expect(altIds).toContain('alt-community-action-circle');
  });
});
