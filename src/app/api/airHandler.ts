import type { Request, Response } from 'express';
import type {
  AirQualityDataAdapter,
  AirQualityReading,
  GeocodedLocation,
} from '../../types';
import type { CacheStatus, TtlCache } from '../../lib/cache';
import type { ServerLogger } from '../../lib/security';
import { airRouteQuerySchema, validateInput } from '../../lib/validation';

export interface AirHandlerDeps {
  liveAdapter: AirQualityDataAdapter;
  demoAdapter: AirQualityDataAdapter;
  geocodeCache: TtlCache<GeocodedLocation[]>;
  aqiCache: TtlCache<AirQualityReading>;
  logger: ServerLogger;
}

export function createAirHandler(deps: AirHandlerDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const startedAt = Date.now();
    const validation = validateInput(airRouteQuerySchema, req.query);

    if (!validation.ok) {
      deps.logger.log({
        level: 'warn',
        event: 'air_validation_failed',
        route: '/api/air',
        method: 'GET',
        statusCode: 400,
        durationMs: Date.now() - startedAt,
        errorCode: 'VALIDATION_ERROR',
      });
      res.status(400).json({
        error: 'Invalid air quality query parameters.',
        code: 'VALIDATION_ERROR',
        issues: validation.errors,
      });
      return;
    }

    const query = validation.data;
    const useDemo = query.demo === true;
    const adapter = useDemo ? deps.demoAdapter : deps.liveAdapter;
    const modePrefix = useDemo ? 'demo' : 'live';

    try {
      let locations: GeocodedLocation[] = [];
      let targetLat = query.lat;
      let targetLon = query.lon;
      let locationName = query.locationName;

      if (query.q !== undefined) {
        const geoKey = `${modePrefix}:geo:${query.q.toLowerCase()}`;
        const geoCached = await deps.geocodeCache.getOrFetch(geoKey, () =>
          adapter.searchLocations(query.q as string, 5),
        );
        locations = geoCached.value;

        const top = locations[0];
        if (!top) {
          deps.logger.log({
            level: 'info',
            event: 'air_location_not_found',
            route: '/api/air',
            method: 'GET',
            statusCode: 404,
            durationMs: Date.now() - startedAt,
            cacheStatus: geoCached.status,
          });
          res.status(404).json({
            error: 'No matching city or location was found.',
            code: 'LOCATION_NOT_FOUND',
          });
          return;
        }

        targetLat = top.latitude;
        targetLon = top.longitude;
        locationName = top.region
          ? `${top.name}, ${top.region}, ${top.country}`
          : `${top.name}, ${top.country}`;
      }

      if (targetLat === undefined || targetLon === undefined) {
        res.status(400).json({
          error: 'Coordinates or city query required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const aqiKey = `${modePrefix}:aqi:${targetLat.toFixed(2)}:${targetLon.toFixed(2)}`;
      const aqiCached = await deps.aqiCache.getOrFetch(aqiKey, () =>
        adapter.getAirQuality(targetLat, targetLon, locationName),
      );

      const cacheStatus: CacheStatus = aqiCached.status;
      const isStale = cacheStatus === 'stale_on_error';

      deps.logger.log({
        level: 'info',
        event: 'air_fetch_success',
        route: '/api/air',
        method: 'GET',
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        cacheStatus,
      });

      res.status(200).json({
        reading: aqiCached.value,
        locations,
        cacheStatus,
        isStale,
        cachedAt: new Date(aqiCached.cachedAt).toISOString(),
        expiresAt: new Date(aqiCached.expiresAt).toISOString(),
      });
    } catch (err) {
      deps.logger.log({
        level: 'error',
        event: 'air_upstream_failed',
        route: '/api/air',
        method: 'GET',
        statusCode: 503,
        durationMs: Date.now() - startedAt,
        errorCode: 'UPSTREAM_UNAVAILABLE',
        detail: err instanceof Error ? err.message : 'Upstream adapter failure',
      });

      res.status(503).json({
        error:
          'Air quality data service is temporarily unavailable. You can retry or enable demo mode.',
        code: 'UPSTREAM_UNAVAILABLE',
      });
    }
  };
}
