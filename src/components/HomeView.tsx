import React, { useState, useEffect, useTransition } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import type { AirQualityReading, HourlyAqiPoint, UserProfile } from '../types';

interface HomeViewProps {
  reading: AirQualityReading | null;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  onToggleDemoMode: (demo: boolean) => void;
  onFetchByCity: (city: string, demo: boolean) => void;
  onFetchByCoords: (lat: number, lon: number, locationName: string, demo: boolean) => void;
  profile: UserProfile;
  language: Language;
}

const getBadgeStyles = (band: string): string => {
  switch (band) {
    case 'Good':
      return 'bg-emerald-700 text-white';
    case 'Satisfactory':
      return 'bg-lime-500 text-slate-950';
    case 'Moderate':
      return 'bg-amber-500 text-slate-950';
    case 'Poor':
      return 'bg-orange-700 text-white';
    case 'Very Poor':
      return 'bg-red-700 text-white';
    case 'Severe':
      return 'bg-rose-900 text-white';
    default:
      return 'bg-slate-700 text-white';
  }
};

const getBarColor = (aqi: number): string => {
  if (aqi <= 50) return '#047857';
  if (aqi <= 100) return '#65A30D';
  if (aqi <= 200) return '#D97706';
  if (aqi <= 300) return '#C2410C';
  if (aqi <= 400) return '#B91C1C';
  return '#881337';
};

const formatHourLabel = (timestamp: string): string => {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const HourlyTrajectoryChart: React.FC<{ points: HourlyAqiPoint[] }> = ({ points }) => {
  const windowPoints = points.slice(0, 24);
  if (windowPoints.length < 2) {
    return null;
  }

  const aqiValues = windowPoints.map((p) => p.aqi);
  const minAqi = Math.min(...aqiValues);
  const maxAqi = Math.max(...aqiValues);
  const scaleMax = Math.max(maxAqi, 100);
  const chartWidth = 640;
  const chartHeight = 132;
  const barSlot = chartWidth / windowPoints.length;
  const barWidth = Math.max(8, barSlot * 0.66);

  const firstLabel = formatHourLabel(windowPoints[0]?.timestamp ?? '');
  const midLabel = formatHourLabel(
    windowPoints[Math.floor(windowPoints.length / 2)]?.timestamp ?? '',
  );
  const lastLabel = formatHourLabel(
    windowPoints[windowPoints.length - 1]?.timestamp ?? '',
  );

  return (
    <div className="pt-5 border-t border-[#D5DFDC] dark:border-[#22323A] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Hourly AQI Trajectory ({windowPoints.length}h window)
        </span>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
          <span>
            Low <strong className="text-slate-900 dark:text-slate-100">{minAqi}</strong>
          </span>
          <span>
            Peak <strong className="text-slate-900 dark:text-slate-100">{maxAqi}</strong>
          </span>
        </div>
      </div>

      <div className="bg-[#ECF1EF] dark:bg-[#162228] rounded-xl p-3">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`Hourly AQI trajectory over ${windowPoints.length} hours ranging from ${minAqi} to ${maxAqi}`}
          className="w-full h-28 overflow-visible"
        >
          <line
            x1={0}
            y1={chartHeight - 1}
            x2={chartWidth}
            y2={chartHeight - 1}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
            strokeWidth={1}
          />
          {windowPoints.map((pt, idx) => {
            const normalized = Math.max(0.08, pt.aqi / scaleMax);
            const h = Math.round(normalized * (chartHeight - 14));
            const x = idx * barSlot + (barSlot - barWidth) / 2;
            const y = chartHeight - 2 - h;
            return (
              <rect
                key={`${pt.timestamp}-${idx}`}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                fill={getBarColor(pt.aqi)}
              >
                <title>{`${formatHourLabel(pt.timestamp) || `Hour ${idx + 1}`}: AQI ${pt.aqi}`}</title>
              </rect>
            );
          })}
        </svg>

        <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-1.5 px-1">
          <span>{firstLabel || 'Start'}</span>
          <span>{midLabel}</span>
          <span>{lastLabel || 'Latest'}</span>
        </div>
      </div>
    </div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({
  reading,
  isLoading,
  error,
  isDemoMode,
  onToggleDemoMode,
  onFetchByCity,
  onFetchByCoords: _onFetchByCoords,
  profile,
  language,
}) => {
  const t = translations[language];
  const [query, setQuery] = useState(profile.locationQuery || 'New Delhi');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (profile.locationQuery && !reading && !isLoading) {
      onFetchByCity(profile.locationQuery, isDemoMode);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    startTransition(() => {
      onFetchByCity(query.trim(), isDemoMode);
    });
  };

  const liveStatusText = reading
    ? `Loaded air quality for ${reading.locationName}: AQI ${reading.aqi} (${reading.band}), source ${reading.source}.`
    : isLoading
      ? 'Loading air quality data...'
      : '';

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 focus:outline-none"
    >
      <div role="status" aria-live="polite" aria-label="Air quality update" className="sr-only">
        {liveStatusText}
      </div>

      {/* Atmospheric telemetry header */}
      <section className="bg-white dark:bg-[#111A1E] border border-[#D5DFDC] dark:border-[#22323A] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Winter Smog &amp; Air Quality Intelligence
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Navigate Urban Air Pollution Safely
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Real-time CPCB NAQI tracking, low-emission daily routines, indoor air quality hacks, and measurable health impact tailored to your family.
            </p>
          </div>

          <div className="bg-[#ECF1EF] dark:bg-[#162228] px-4 py-3.5 rounded-xl flex flex-col gap-1.5 w-full lg:w-72 shrink-0">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between gap-4 cursor-pointer">
              <span>Offline Demo Mode</span>
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => {
                  const val = e.target.checked;
                  onToggleDemoMode(val);
                  if (reading) {
                    onFetchByCity(query, val);
                  }
                }}
                className="w-4 h-4 accent-teal-700 dark:accent-teal-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
              />
            </label>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {isDemoMode ? 'Using simulated winter smog dataset' : 'Using live Open-Meteo API'}
            </span>
          </div>
        </div>

        {/* Unified location search */}
        <div className="mt-6 pt-6 border-t border-[#D5DFDC] dark:border-[#22323A] space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600 dark:text-slate-400">
                <Search className="w-4 h-4" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label="City or location query"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7F6] dark:bg-[#162228] border border-[#D5DFDC] dark:border-[#22323A] rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111A1E]"
            >
              {isLoading || isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{t.searchButton}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Quick Cities:</span>
            {['New Delhi', 'Kanpur', 'Bengaluru', 'Mumbai', 'Kolkata'].map((city) => {
              const isSelected = query.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setQuery(city);
                    onFetchByCity(city, isDemoMode);
                  }}
                  className={`py-1 font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded ${
                    isSelected
                      ? 'text-teal-800 dark:text-teal-300 underline underline-offset-4 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-300'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 p-4 rounded-xl flex items-center gap-3 text-red-900 dark:text-red-200"
        >
          <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-300 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && !reading && (
        <div aria-busy="true" aria-label="Loading air quality data" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#111A1E] p-6 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] animate-pulse h-44"
            />
          ))}
        </div>
      )}

      {reading && (
        <section className="bg-white dark:bg-[#111A1E] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D5DFDC] dark:border-[#22323A] space-y-6">
          {/* Primary AQI Reading + Provenance */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#D5DFDC] dark:border-[#22323A]">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-medium">
                <MapPin className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>{reading.locationName}</span>
                {reading.isDemoData && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-semibold">
                    Demo Data
                  </span>
                )}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t.aqiScore}
              </h2>
            </div>

            <div className="flex flex-col md:items-end gap-2">
              <div className="flex items-center gap-4">
                <div className="md:text-right">
                  <span className="font-mono tabular-nums text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {reading.aqi}
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-400">CPCB NAQI Index</div>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap ${getBadgeStyles(
                    reading.band,
                  )}`}
                >
                  <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                  <span>{reading.band}</span>
                </div>
              </div>

              <div
                data-testid="aqi-provenance"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400"
              >
                <Compass className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <span>
                  {t.source}:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{reading.source}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {t.observedAt}:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {new Date(reading.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 4-column pollutant telemetry grid (single-elevation hairline cells) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t.pm25, value: reading.pm25 },
              { label: t.pm10, value: reading.pm10 },
              { label: t.no2, value: reading.no2 },
              { label: t.o3, value: reading.o3 },
            ].map((pollutant) => (
              <div
                key={pollutant.label}
                className="bg-[#ECF1EF] dark:bg-[#162228] px-4 py-3.5 rounded-xl"
              >
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {pollutant.label}
                </div>
                <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-slate-100">
                  {pollutant.value !== null ? `${pollutant.value} µg/m³` : 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {/* Hourly AQI Trajectory SVG Chart (rendered when hourly points are present) */}
          <HourlyTrajectoryChart points={reading.hourly} />

          {/* Trend & Update Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-[#D5DFDC] dark:border-[#22323A] text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <Compass className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>
                {t.source}: <strong className="text-slate-800 dark:text-slate-200">{reading.source}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {t.updatedAt}:{' '}
                {new Date(reading.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 font-semibold">
              {reading.trend.trend === 'improving' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/70 px-3 py-1 rounded-lg">
                  <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
                  {t.trendImproving}
                </span>
              )}
              {reading.trend.trend === 'worsening' && (
                <span className="inline-flex items-center gap-1.5 text-red-900 dark:text-red-200 bg-red-100 dark:bg-red-950/70 px-3 py-1 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  {t.trendWorsening}
                </span>
              )}
              {reading.trend.trend === 'stable' && (
                <span className="inline-flex items-center gap-1.5 text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 px-3 py-1 rounded-lg">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                  {t.trendStable}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};
