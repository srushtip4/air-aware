import type { AirQualityReading, UserProfile } from '../types';

const PROFILE_STORAGE_KEY = 'airaware_user_profile_v1';
const READING_STORAGE_KEY = 'airaware_last_reading_v1';
const DEMO_MODE_STORAGE_KEY = 'airaware_demo_mode_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
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
};

export function loadStoredProfile(): UserProfile {
  try {
    if (typeof window === 'undefined') {
      return DEFAULT_USER_PROFILE;
    }
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...DEFAULT_USER_PROFILE, ...(parsed as Partial<UserProfile>) };
    }
  } catch {
    // Fallback to default on corruption
  }
  return DEFAULT_USER_PROFILE;
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  } catch {
    // Storage quota exceeded or disabled
  }
}

export function loadStoredReading(): AirQualityReading | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(READING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AirQualityReading;
  } catch {
    return null;
  }
}

export function saveStoredReading(reading: AirQualityReading): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(reading));
    }
  } catch {
    // ignore
  }
}

export function loadStoredDemoMode(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveStoredDemoMode(isDemo: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_MODE_STORAGE_KEY, String(isDemo));
    }
  } catch {
    // ignore
  }
}
