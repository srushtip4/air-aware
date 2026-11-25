import type { AqiTrendAnalysis, HourlyAqiPoint } from '../../types';

export interface TrendOptions {
  windowHours?: number;
  thresholdDelta?: number;
}

function average(values: readonly number[]): number {
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/**
 * Analyzes hourly AQI points in chronological order to determine whether air quality
 * is improving, worsening, or stable.
 */
export function analyzeAqiTrend(
  hourly: readonly HourlyAqiPoint[],
  options: TrendOptions = {},
): AqiTrendAnalysis {
  const windowHours = options.windowHours ?? 3;
  const thresholdDelta = options.thresholdDelta ?? 10;

  if (!Number.isInteger(windowHours) || windowHours < 1) {
    throw new RangeError('windowHours must be a positive integer');
  }
  if (!Number.isFinite(thresholdDelta) || thresholdDelta < 0) {
    throw new RangeError('thresholdDelta must be a non-negative finite number');
  }

  const validPoints = hourly
    .filter(
      (point) =>
        Number.isFinite(point.aqi) &&
        point.aqi >= 0 &&
        !Number.isNaN(Date.parse(point.timestamp)),
    )
    .slice()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  if (validPoints.length < 2) {
    return {
      trend: 'insufficient_data',
      delta: 0,
      percentChange: null,
      windowHours,
      summary: 'At least two hourly readings are required to calculate AQI trend.',
    };
  }

  const effectiveWindow = Math.min(windowHours, Math.floor(validPoints.length / 2));
  const recentSlice = validPoints.slice(-effectiveWindow).map((p) => p.aqi);
  const earlierSlice = validPoints
    .slice(-effectiveWindow * 2, -effectiveWindow)
    .map((p) => p.aqi);

  const recentAvg = average(recentSlice);
  const earlierAvg = average(earlierSlice);
  const delta = Math.round((recentAvg - earlierAvg) * 10) / 10;
  const percentChange =
    earlierAvg > 0
      ? Math.round(((recentAvg - earlierAvg) / earlierAvg) * 1000) / 10
      : null;

  if (delta <= -thresholdDelta) {
    return {
      trend: 'improving',
      delta,
      percentChange,
      windowHours: effectiveWindow,
      summary: `AQI dropped by ${Math.abs(delta)} points over the last ${effectiveWindow}h window.`,
    };
  }

  if (delta >= thresholdDelta) {
    return {
      trend: 'worsening',
      delta,
      percentChange,
      windowHours: effectiveWindow,
      summary: `AQI rose by ${delta} points over the last ${effectiveWindow}h window.`,
    };
  }

  return {
    trend: 'stable',
    delta,
    percentChange,
    windowHours: effectiveWindow,
    summary: `AQI remained relatively steady (change: ${delta >= 0 ? '+' : ''}${delta} points).`,
  };
}
