import type {
  AirQualityDataAdapter,
  AirQualityReading,
  GeocodedLocation,
  HourlyAqiPoint,
} from '../../types';
import {
  CircuitBreaker,
  UpstreamTimeoutError,
  withRetryAndTimeout,
} from '../resilience';
import { categorize, computeIndianAqiFromPm } from './bands';
import { analyzeAqiTrend } from './trend';

export interface OpenMeteoAdapterOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  circuitBreaker?: CircuitBreaker;
  now?: () => Date;
}

interface OpenMeteoAirQualityResponse {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
    us_aqi?: number | null;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name?: string;
    admin1?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

export class AirQualityAdapterError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'AirQualityAdapterError';
    this.statusCode = statusCode;
  }
}

export class OpenMeteoAdapter implements AirQualityDataAdapter {
  public readonly sourceName = 'Open-Meteo Air Quality & Geocoding API';
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly sleepFn?: (ms: number) => Promise<void>;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly now: () => Date;

  constructor(options: OpenMeteoAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.baseDelayMs = options.baseDelayMs ?? 150;
    this.sleepFn = options.sleepFn;
    this.circuitBreaker =
      options.circuitBreaker ??
      new CircuitBreaker({
        name: 'open-meteo',
        failureThreshold: 5,
        cooldownMs: 30_000,
      });
    this.now = options.now ?? (() => new Date());
  }

  public async searchLocations(
    query: string,
    limit = 5,
  ): Promise<GeocodedLocation[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', String(Math.min(Math.max(1, limit), 10)));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const data = await this.fetchJsonWithResilience<OpenMeteoGeocodingResponse>(
      url.toString(),
      'Open-Meteo Geocoding API',
    );
    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results
      .filter(
        (item) =>
          typeof item.name === 'string' &&
          typeof item.latitude === 'number' &&
          typeof item.longitude === 'number',
      )
      .map((item) => ({
        name: item.name as string,
        region: item.admin1,
        country: item.country ?? 'Unknown',
        latitude: item.latitude as number,
        longitude: item.longitude as number,
        source: 'Open-Meteo Geocoding API',
      }));
  }

  public async getAirQuality(
    latitude: number,
    longitude: number,
    locationName = 'Selected Location',
  ): Promise<AirQualityReading> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new RangeError(`Invalid latitude: ${latitude}`);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new RangeError(`Invalid longitude: ${longitude}`);
    }

    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set(
      'current',
      'pm2_5,pm10,nitrogen_dioxide,ozone,us_aqi',
    );
    url.searchParams.set('hourly', 'pm2_5,pm10,us_aqi');
    url.searchParams.set('past_hours', '12');
    url.searchParams.set('forecast_hours', '1');
    url.searchParams.set('timezone', 'UTC');

    const payload = await this.fetchJsonWithResilience<OpenMeteoAirQualityResponse>(
      url.toString(),
      'Open-Meteo Air Quality API',
    );
    const current = payload.current;
    if (!current) {
      throw new AirQualityAdapterError(
        'Open-Meteo response missing current air quality block',
      );
    }

    const pm25 = typeof current.pm2_5 === 'number' ? current.pm2_5 : null;
    const pm10 = typeof current.pm10 === 'number' ? current.pm10 : null;
    const no2 =
      typeof current.nitrogen_dioxide === 'number'
        ? current.nitrogen_dioxide
        : null;
    const o3 = typeof current.ozone === 'number' ? current.ozone : null;

    const computedIndianAqi = computeIndianAqiFromPm(pm25, pm10);
    const fallbackUsAqi =
      typeof current.us_aqi === 'number' && Number.isFinite(current.us_aqi)
        ? Math.round(current.us_aqi)
        : null;
    const aqi = computedIndianAqi ?? fallbackUsAqi;

    if (aqi === null) {
      throw new AirQualityAdapterError(
        'Open-Meteo response did not contain usable PM2.5, PM10, or AQI measurements',
      );
    }

    const hourly = this.parseHourly(payload.hourly);
    const trend = analyzeAqiTrend(hourly);
    const band = categorize(aqi).band;
    const timestamp = current.time
      ? new Date(current.time.endsWith('Z') ? current.time : `${current.time}Z`).toISOString()
      : this.now().toISOString();

    return {
      aqi,
      pm25,
      pm10,
      no2,
      o3,
      band,
      source: this.sourceName,
      timestamp,
      isDemoData: false,
      locationName,
      latitude: payload.latitude ?? latitude,
      longitude: payload.longitude ?? longitude,
      hourly,
      trend,
    };
  }

  private parseHourly(
    hourly: OpenMeteoAirQualityResponse['hourly'],
  ): HourlyAqiPoint[] {
    if (!hourly || !Array.isArray(hourly.time)) {
      return [];
    }

    const points: HourlyAqiPoint[] = [];
    for (let i = 0; i < hourly.time.length; i += 1) {
      const rawTime = hourly.time[i];
      if (!rawTime) {
        continue;
      }
      const pm25 = hourly.pm2_5?.[i] ?? null;
      const pm10 = hourly.pm10?.[i] ?? null;
      const usAqi = hourly.us_aqi?.[i] ?? null;
      const pointAqi =
        computeIndianAqiFromPm(pm25, pm10) ??
        (typeof usAqi === 'number' && Number.isFinite(usAqi)
          ? Math.round(usAqi)
          : null);

      if (pointAqi === null) {
        continue;
      }

      const isoTime = rawTime.endsWith('Z') ? rawTime : `${rawTime}Z`;
      points.push({
        timestamp: new Date(isoTime).toISOString(),
        aqi: pointAqi,
        pm25,
        pm10,
      });
    }

    return points;
  }

  private async fetchJsonWithResilience<TPayload>(
    url: string,
    serviceLabel: string,
  ): Promise<TPayload> {
    return this.circuitBreaker.execute(() =>
      withRetryAndTimeout(
        async (signal) => {
          let response: Response;
          try {
            response = await this.fetchFn(url, {
              signal,
              headers: {
                Accept: 'application/json',
              },
            });
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              throw new AirQualityAdapterError(
                `Request to Open-Meteo timed out after ${this.timeoutMs}ms`,
                504,
              );
            }
            throw new AirQualityAdapterError(
              `Network error reaching Open-Meteo: ${err instanceof Error ? err.message : String(err)}`,
            );
          }

          if (!response.ok) {
            throw new AirQualityAdapterError(
              `${serviceLabel} failed with status ${response.status}`,
              response.status,
            );
          }

          return (await response.json()) as TPayload;
        },
        {
          timeoutMs: this.timeoutMs,
          maxRetries: this.maxRetries,
          baseDelayMs: this.baseDelayMs,
          sleepFn: this.sleepFn,
        },
      ).catch((err) => {
        if (err instanceof UpstreamTimeoutError) {
          throw new AirQualityAdapterError(
            `Request to Open-Meteo timed out after ${this.timeoutMs}ms`,
            504,
          );
        }
        throw err;
      }),
    );
  }
}

export interface DemoPreset {
  location: GeocodedLocation;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  hourlyAqiSequence: number[];
}

const DEMO_PRESETS: readonly DemoPreset[] = [
  {
    location: {
      name: 'New Delhi',
      region: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.209,
      source: 'AirAware Offline Demo Dataset',
    },
    pm25: 278,
    pm10: 410,
    no2: 68,
    o3: 32,
    hourlyAqiSequence: [365, 378, 392, 405, 418, 424],
  },
  {
    location: {
      name: 'Kanpur',
      region: 'Uttar Pradesh',
      country: 'India',
      latitude: 26.4499,
      longitude: 80.3319,
      source: 'AirAware Offline Demo Dataset',
    },
    pm25: 172,
    pm10: 275,
    no2: 51,
    o3: 41,
    hourlyAqiSequence: [358, 352, 344, 336, 330, 326],
  },
  {
    location: {
      name: 'Bengaluru',
      region: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      source: 'AirAware Offline Demo Dataset',
    },
    pm25: 44,
    pm10: 82,
    no2: 29,
    o3: 48,
    hourlyAqiSequence: [86, 84, 82, 81, 79, 78],
  },
];

/**
 * Labelled deterministic offline demo-data adapter for testing, offline use, and demos.
 */
export class DemoAirQualityAdapter implements AirQualityDataAdapter {
  public readonly sourceName = 'AirAware Offline Demo Dataset (Simulated Winter Smog)';
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  public async searchLocations(query: string, limit = 5): Promise<GeocodedLocation[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return DEMO_PRESETS.slice(0, limit).map((p) => p.location);
    }

    const matches = DEMO_PRESETS.filter(
      (p) =>
        p.location.name.toLowerCase().includes(normalized) ||
        (p.location.region?.toLowerCase().includes(normalized) ?? false) ||
        p.location.country.toLowerCase().includes(normalized),
    ).map((p) => p.location);

    return (matches.length > 0 ? matches : [DEMO_PRESETS[0]!.location]).slice(0, limit);
  }

  public async getAirQuality(
    latitude: number,
    longitude: number,
    locationName?: string,
  ): Promise<AirQualityReading> {
    const nearest = this.findNearestPreset(latitude, longitude);
    const referenceTime = this.now();
    const hourly: HourlyAqiPoint[] = nearest.hourlyAqiSequence.map((val, idx, arr) => {
      const hoursAgo = arr.length - 1 - idx;
      const pointTime = new Date(referenceTime.getTime() - hoursAgo * 3_600_000);
      return {
        timestamp: pointTime.toISOString(),
        aqi: val,
      };
    });

    const aqi =
      computeIndianAqiFromPm(nearest.pm25, nearest.pm10) ??
      nearest.hourlyAqiSequence[nearest.hourlyAqiSequence.length - 1] ??
      100;

    return {
      aqi,
      pm25: nearest.pm25,
      pm10: nearest.pm10,
      no2: nearest.no2,
      o3: nearest.o3,
      band: categorize(aqi).band,
      source: this.sourceName,
      timestamp: referenceTime.toISOString(),
      isDemoData: true,
      locationName: locationName ?? `${nearest.location.name} (Demo)`,
      latitude: nearest.location.latitude,
      longitude: nearest.location.longitude,
      hourly,
      trend: analyzeAqiTrend(hourly),
    };
  }

  private findNearestPreset(latitude: number, longitude: number): DemoPreset {
    let best = DEMO_PRESETS[0]!;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const preset of DEMO_PRESETS) {
      const dLat = preset.location.latitude - latitude;
      const dLon = preset.location.longitude - longitude;
      const distSq = dLat * dLat + dLon * dLon;
      if (distSq < bestDistance) {
        bestDistance = distSq;
        best = preset;
      }
    }

    return best;
  }
}
