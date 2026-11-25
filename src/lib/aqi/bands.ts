import type { AqiCategoryBand, AqiCategoryInfo } from '../../types';

export const INDIAN_AQI_BANDS: readonly AqiCategoryInfo[] = [
  {
    band: 'Good',
    minAqi: 0,
    maxAqi: 50,
    severityRank: 1,
    colorToken: 'emerald',
    healthSummary: 'Minimal impact; air quality is clean for all groups.',
    isUnhealthy: false,
  },
  {
    band: 'Satisfactory',
    minAqi: 51,
    maxAqi: 100,
    severityRank: 2,
    colorToken: 'lime',
    healthSummary: 'Minor breathing discomfort possible for unusually sensitive people.',
    isUnhealthy: false,
  },
  {
    band: 'Moderate',
    minAqi: 101,
    maxAqi: 200,
    severityRank: 3,
    colorToken: 'amber',
    healthSummary:
      'Breathing discomfort likely for people with lung/heart disease, children, and older adults.',
    isUnhealthy: false,
  },
  {
    band: 'Poor',
    minAqi: 201,
    maxAqi: 300,
    severityRank: 4,
    colorToken: 'orange',
    healthSummary:
      'Breathing discomfort to most people on prolonged exposure; higher risk for vulnerable groups.',
    isUnhealthy: true,
  },
  {
    band: 'Very Poor',
    minAqi: 301,
    maxAqi: 400,
    severityRank: 5,
    colorToken: 'red',
    healthSummary:
      'Respiratory illness likely on prolonged exposure; severe risk for children, elderly, and lung/heart patients.',
    isUnhealthy: true,
  },
  {
    band: 'Severe',
    minAqi: 401,
    maxAqi: null,
    severityRank: 6,
    colorToken: 'rose-dark',
    healthSummary:
      'Health emergency: affects healthy people and seriously impacts those with existing diseases.',
    isUnhealthy: true,
  },
] as const;

export function categorize(aqi: number): AqiCategoryInfo {
  if (!Number.isFinite(aqi) || aqi < 0) {
    throw new RangeError(`AQI must be a finite non-negative number, received: ${aqi}`);
  }

  const normalized = Math.round(aqi);

  if (normalized <= 50) {
    return INDIAN_AQI_BANDS[0] as AqiCategoryInfo;
  }
  if (normalized <= 100) {
    return INDIAN_AQI_BANDS[1] as AqiCategoryInfo;
  }
  if (normalized <= 200) {
    return INDIAN_AQI_BANDS[2] as AqiCategoryInfo;
  }
  if (normalized <= 300) {
    return INDIAN_AQI_BANDS[3] as AqiCategoryInfo;
  }
  if (normalized <= 400) {
    return INDIAN_AQI_BANDS[4] as AqiCategoryInfo;
  }
  return INDIAN_AQI_BANDS[5] as AqiCategoryInfo;
}

export function getBandMetadata(band: AqiCategoryBand): AqiCategoryInfo {
  const found = INDIAN_AQI_BANDS.find((entry) => entry.band === band);
  if (!found) {
    throw new Error(`Unknown AQI category band: ${band}`);
  }
  return found;
}

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 430, cHigh: 510, iLow: 401, iHigh: 500 },
];

function computeSubIndex(
  concentration: number,
  breakpoints: readonly Breakpoint[],
): number {
  if (!Number.isFinite(concentration) || concentration < 0) {
    throw new RangeError(`Pollutant concentration must be non-negative: ${concentration}`);
  }

  for (const bp of breakpoints) {
    if (concentration <= bp.cHigh) {
      const ratio = (concentration - bp.cLow) / (bp.cHigh - bp.cLow);
      return Math.round(bp.iLow + ratio * (bp.iHigh - bp.iLow));
    }
  }

  const last = breakpoints[breakpoints.length - 1] as Breakpoint;
  const slope = (last.iHigh - last.iLow) / (last.cHigh - last.cLow);
  return Math.round(last.iHigh + (concentration - last.cHigh) * slope);
}

/**
 * Computes an Indian CPCB NAQI score from PM2.5 and/or PM10 concentrations (ug/m3).
 */
export function computeIndianAqiFromPm(
  pm25: number | null | undefined,
  pm10: number | null | undefined,
): number | null {
  const indices: number[] = [];

  if (pm25 !== null && pm25 !== undefined && Number.isFinite(pm25) && pm25 >= 0) {
    indices.push(computeSubIndex(pm25, PM25_BREAKPOINTS));
  }
  if (pm10 !== null && pm10 !== undefined && Number.isFinite(pm10) && pm10 >= 0) {
    indices.push(computeSubIndex(pm10, PM10_BREAKPOINTS));
  }

  if (indices.length === 0) {
    return null;
  }

  return Math.max(...indices);
}
