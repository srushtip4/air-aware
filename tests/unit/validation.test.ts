import { describe, expect, it } from 'vitest';
import {
  aiAssistantRequestSchema,
  aqiQuerySchema,
  geocodeQuerySchema,
  recommendationsRequestSchema,
  userProfileSchema,
  validateInput,
} from '../../src/lib/validation';

const validProfile = {
  locationQuery: 'New Delhi',
  household: {
    hasChildren: true,
    hasElderly: false,
    hasRespiratoryCondition: true,
    householdSize: 4,
  },
  commuteMode: 'car_petrol' as const,
  commuteDistanceKmOneWay: 14,
  commuteDaysPerWeek: 5,
  cookingFuel: 'lpg' as const,
  heatingSource: 'electric_heater' as const,
  homeType: 'apartment' as const,
  budgetTier: 'low_cost' as const,
};

describe('Strict Zod validation schemas', () => {
  it('accepts valid profile and API inputs', () => {
    expect(validateInput(userProfileSchema, validProfile).ok).toBe(true);
    expect(
      validateInput(geocodeQuerySchema, { q: '  Kanpur  ', limit: 5 }).ok,
    ).toBe(true);
    expect(
      validateInput(aqiQuerySchema, { lat: 28.61, lon: 77.2, demo: true }).ok,
    ).toBe(true);
    expect(
      validateInput(aqiQuerySchema, { location: 'Delhi' }).ok,
    ).toBe(true);
    expect(
      validateInput(recommendationsRequestSchema, {
        aqi: 340,
        trend: 'worsening',
        profile: validProfile,
        communityHouseholds: 50,
      }).ok,
    ).toBe(true);
    expect(
      validateInput(aiAssistantRequestSchema, {
        question: 'When is it safest to open windows today?',
        profile: validProfile,
        aqiContext: {
          aqi: 340,
          band: 'Very Poor',
          trend: 'worsening',
          locationName: 'New Delhi',
          source: 'Open-Meteo Air Quality & Geocoding API',
          timestamp: '2026-11-24T12:00:00.000Z',
        },
      }).ok,
    ).toBe(true);
  });

  it('rejects unknown fields on profile and all API schemas', () => {
    const profileWithExtra = { ...validProfile, unknownField: 'hack' };
    const r1 = validateInput(userProfileSchema, profileWithExtra);
    expect(r1.ok).toBe(false);

    const householdExtra = {
      ...validProfile,
      household: { ...validProfile.household, extra: 1 },
    };
    expect(validateInput(userProfileSchema, householdExtra).ok).toBe(false);

    expect(
      validateInput(geocodeQuerySchema, { q: 'Delhi', admin: true }).ok,
    ).toBe(false);
    expect(
      validateInput(aqiQuerySchema, { location: 'Delhi', extra: 1 }).ok,
    ).toBe(false);
    expect(
      validateInput(recommendationsRequestSchema, {
        aqi: 200,
        trend: 'stable',
        profile: validProfile,
        role: 'admin',
      }).ok,
    ).toBe(false);
    expect(
      validateInput(aiAssistantRequestSchema, {
        question: 'Hi',
        profile: validProfile,
        aqiContext: {
          aqi: 100,
          band: 'Satisfactory',
          trend: 'stable',
          locationName: 'Delhi',
          source: 'Open-Meteo',
          timestamp: '2026-11-24T12:00:00Z',
          injected: true,
        },
      }).ok,
    ).toBe(false);
  });

  it('enforces max lengths, empty-string rejection, and numeric bounds', () => {
    expect(
      validateInput(userProfileSchema, {
        ...validProfile,
        locationQuery: '   ',
      }).ok,
    ).toBe(false);

    expect(
      validateInput(userProfileSchema, {
        ...validProfile,
        locationQuery: 'a'.repeat(121),
      }).ok,
    ).toBe(false);

    expect(
      validateInput(userProfileSchema, {
        ...validProfile,
        commuteDistanceKmOneWay: 350,
      }).ok,
    ).toBe(false);

    expect(
      validateInput(userProfileSchema, {
        ...validProfile,
        commuteDaysPerWeek: 8,
      }).ok,
    ).toBe(false);

    expect(
      validateInput(aqiQuerySchema, { lat: 95, lon: 77 }).ok,
    ).toBe(false);

    expect(
      validateInput(aiAssistantRequestSchema, {
        question: 'q'.repeat(601),
        profile: validProfile,
        aqiContext: {
          aqi: 200,
          band: 'Moderate',
          trend: 'stable',
          locationName: 'Delhi',
          source: 'Open-Meteo',
          timestamp: '2026-11-24T12:00:00Z',
        },
      }).ok,
    ).toBe(false);
  });
});
