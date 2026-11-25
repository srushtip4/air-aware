import { describe, expect, it, vi } from 'vitest';
import {
  AirQualityAdapterError,
  DemoAirQualityAdapter,
  INDIAN_AQI_BANDS,
  OpenMeteoAdapter,
  analyzeAqiTrend,
  categorize,
  computeIndianAqiFromPm,
  getBandMetadata,
} from '../../src/lib/aqi';
import type { HourlyAqiPoint } from '../../src/types';

describe('AQI categorization (Indian CPCB NAQI)', () => {
  it('defines all 6 Indian AQI category bands', () => {
    expect(INDIAN_AQI_BANDS).toHaveLength(6);
    expect(INDIAN_AQI_BANDS.map((b) => b.band)).toEqual([
      'Good',
      'Satisfactory',
      'Moderate',
      'Poor',
      'Very Poor',
      'Severe',
    ]);
  });

  it.each([
    [0, 'Good', false],
    [50, 'Good', false],
    [50.4, 'Good', false],
    [50.6, 'Satisfactory', false],
    [51, 'Satisfactory', false],
    [100, 'Satisfactory', false],
    [101, 'Moderate', false],
    [200, 'Moderate', false],
    [201, 'Poor', true],
    [300, 'Poor', true],
    [301, 'Very Poor', true],
    [400, 'Very Poor', true],
    [401, 'Severe', true],
    [500, 'Severe', true],
    [850, 'Severe', true],
  ] as const)(
    'categorizes AQI %s as %s (isUnhealthy=%s)',
    (aqi, expectedBand, expectedUnhealthy) => {
      const result = categorize(aqi);
      expect(result.band).toBe(expectedBand);
      expect(result.isUnhealthy).toBe(expectedUnhealthy);
    },
  );

  it('throws RangeError for negative or non-finite AQI values', () => {
    expect(() => categorize(-1)).toThrow(RangeError);
    expect(() => categorize(Number.NaN)).toThrow(RangeError);
    expect(() => categorize(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('retrieves metadata by band name and throws on unknown band', () => {
    expect(getBandMetadata('Severe').severityRank).toBe(6);
    expect(() => getBandMetadata('Hazardous' as never)).toThrow();
  });

  it('computes Indian CPCB sub-index from PM2.5 and PM10', () => {
    expect(computeIndianAqiFromPm(30, 50)).toBe(50);
    expect(computeIndianAqiFromPm(60, 100)).toBe(100);
    expect(computeIndianAqiFromPm(90, 120)).toBe(200);
    expect(computeIndianAqiFromPm(250, 200)).toBe(400);
    expect(computeIndianAqiFromPm(380, 400)).toBe(500);
    expect(computeIndianAqiFromPm(450, null)).toBeGreaterThan(500);
    expect(computeIndianAqiFromPm(null, null)).toBeNull();
  });

  it('throws RangeError on negative pollutant concentration', () => {
    expect(() => computeIndianAqiFromPm(-5, 20)).not.toThrow(); // ignored negative -> uses PM10
    expect(computeIndianAqiFromPm(-5, 50)).toBe(50);
    expect(computeIndianAqiFromPm(-5, -1)).toBeNull();
  });
});

describe('AQI hourly trend analysis', () => {
  const makeHourly = (values: number[]): HourlyAqiPoint[] =>
    values.map((aqi, i) => ({
      timestamp: new Date(Date.UTC(2026, 10, 24, i, 0, 0)).toISOString(),
      aqi,
    }));

  it('detects improving trend when recent window drops significantly', () => {
    const result = analyzeAqiTrend(makeHourly([360, 355, 350, 310, 295, 280]));
    expect(result.trend).toBe('improving');
    expect(result.delta).toBeLessThan(-10);
    expect(result.percentChange).toBeLessThan(0);
  });

  it('detects worsening trend when recent window rises significantly', () => {
    const result = analyzeAqiTrend(makeHourly([210, 220, 230, 290, 310, 340]));
    expect(result.trend).toBe('worsening');
    expect(result.delta).toBeGreaterThan(10);
    expect(result.percentChange).toBeGreaterThan(0);
  });

  it('detects stable trend within threshold', () => {
    const result = analyzeAqiTrend(makeHourly([180, 182, 181, 184, 183, 182]));
    expect(result.trend).toBe('stable');
  });

  it('returns insufficient_data for fewer than 2 valid points', () => {
    expect(analyzeAqiTrend([]).trend).toBe('insufficient_data');
    expect(
      analyzeAqiTrend([{ timestamp: '2026-11-24T10:00:00Z', aqi: 150 }]).trend,
    ).toBe('insufficient_data');
    expect(
      analyzeAqiTrend([
        { timestamp: 'not-a-date', aqi: 150 },
        { timestamp: '2026-11-24T10:00:00Z', aqi: Number.NaN },
      ]).trend,
    ).toBe('insufficient_data');
  });

  it('sorts out-of-order hourly timestamps before computing trend', () => {
    const points: HourlyAqiPoint[] = [
      { timestamp: '2026-11-24T12:00:00Z', aqi: 300 },
      { timestamp: '2026-11-24T10:00:00Z', aqi: 150 },
    ];
    expect(analyzeAqiTrend(points).trend).toBe('worsening');
  });

  it('validates trend options', () => {
    expect(() => analyzeAqiTrend([], { windowHours: 0 })).toThrow(RangeError);
    expect(() => analyzeAqiTrend([], { thresholdDelta: -1 })).toThrow(RangeError);
  });
});

describe('AirQualityDataAdapter implementations', () => {
  it('OpenMeteoAdapter searches locations and handles empty/error responses', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'Delhi',
              admin1: 'Delhi',
              country: 'India',
              latitude: 28.65,
              longitude: 77.23,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
    expect(await adapter.searchLocations('   ')).toEqual([]);

    const locations = await adapter.searchLocations('Delhi', 3);
    expect(locations).toHaveLength(1);
    expect(locations[0]?.name).toBe('Delhi');
    expect(locations[0]?.source).toBe('Open-Meteo Geocoding API');
  });

  it('OpenMeteoAdapter parses air quality reading and computes trend', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          latitude: 28.61,
          longitude: 77.2,
          current: {
            time: '2026-11-24T12:00',
            pm2_5: 185,
            pm10: 290,
            nitrogen_dioxide: 42,
            ozone: 28,
            us_aqi: 235,
          },
          hourly: {
            time: [
              '2026-11-24T09:00',
              '2026-11-24T10:00',
              '2026-11-24T11:00',
              '2026-11-24T12:00',
            ],
            pm2_5: [100, 120, 160, 185],
            pm10: [180, 210, 250, 290],
            us_aqi: [175, 185, 210, 235],
          },
        }),
        { status: 200 },
      ),
    );

    const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
    const reading = await adapter.getAirQuality(28.61, 77.2, 'New Delhi');

    expect(reading.isDemoData).toBe(false);
    expect(reading.band).toBe('Very Poor');
    expect(reading.trend.trend).toBe('worsening');
    expect(reading.source).toContain('Open-Meteo');
    expect(reading.timestamp).toBe('2026-11-24T12:00:00.000Z');
  });

  it('OpenMeteoAdapter rejects invalid coordinates and surfaces upstream errors', async () => {
    const errorFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Server error', { status: 502 }));
    const adapter = new OpenMeteoAdapter({ fetchFn: errorFetch });

    await expect(adapter.getAirQuality(95, 77)).rejects.toThrow(RangeError);
    await expect(adapter.getAirQuality(28, 200)).rejects.toThrow(RangeError);
    await expect(adapter.getAirQuality(28, 77)).rejects.toThrow(
      AirQualityAdapterError,
    );
    await expect(adapter.searchLocations('Delhi')).rejects.toThrow(
      AirQualityAdapterError,
    );
  });

  it('OpenMeteoAdapter handles abort timeouts and missing current payload', async () => {
    const abortFetch = vi.fn<typeof fetch>().mockImplementation(() => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const timeoutAdapter = new OpenMeteoAdapter({
      fetchFn: abortFetch,
      timeoutMs: 100,
    });
    await expect(timeoutAdapter.getAirQuality(28, 77)).rejects.toThrow(/timed out/);

    const emptyFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const emptyAdapter = new OpenMeteoAdapter({ fetchFn: emptyFetch });
    await expect(emptyAdapter.getAirQuality(28, 77)).rejects.toThrow(
      AirQualityAdapterError,
    );
  });

  it('DemoAirQualityAdapter returns labelled offline demo data with timestamps', async () => {
    const fixedDate = new Date('2026-11-24T12:00:00.000Z');
    const demo = new DemoAirQualityAdapter(() => fixedDate);

    const matches = await demo.searchLocations('kanpur');
    expect(matches[0]?.name).toBe('Kanpur');

    const all = await demo.searchLocations('');
    expect(all.length).toBeGreaterThanOrEqual(2);

    const delhiReading = await demo.getAirQuality(28.61, 77.2);
    expect(delhiReading.isDemoData).toBe(true);
    expect(delhiReading.source).toContain('Demo');
    expect(delhiReading.timestamp).toBe(fixedDate.toISOString());
    expect(delhiReading.band).toBe('Severe');
    expect(delhiReading.trend.trend).toBe('worsening');

    const bengaluruReading = await demo.getAirQuality(12.97, 77.59);
    expect(bengaluruReading.band).toBe('Satisfactory');
  });
});
