import React, { useState, useEffect, useTransition } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CloudSun,
  Compass,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import type { AirQualityReading, UserProfile } from '../types';

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

  const getBadgeColor = (band: string) => {
    switch (band) {
      case 'Good':
        return 'bg-emerald-700 text-white shadow-emerald-700/20';
      case 'Satisfactory':
        return 'bg-lime-500 text-slate-950 shadow-lime-500/20';
      case 'Moderate':
        return 'bg-amber-500 text-slate-950 shadow-amber-500/20';
      case 'Poor':
        return 'bg-orange-700 text-white shadow-orange-700/20';
      case 'Very Poor':
        return 'bg-red-600 text-white shadow-red-600/20';
      case 'Severe':
        return 'bg-rose-900 text-white shadow-rose-900/20';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const getBorderColor = (band: string) => {
    switch (band) {
      case 'Good':
        return 'border-emerald-500/30';
      case 'Satisfactory':
        return 'border-lime-500/30';
      case 'Moderate':
        return 'border-amber-500/30';
      case 'Poor':
        return 'border-orange-500/30';
      case 'Very Poor':
        return 'border-red-500/30';
      case 'Severe':
        return 'border-rose-900/40';
      default:
        return 'border-slate-200 dark:border-slate-800';
    }
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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 focus:outline-none"
    >
      <div role="status" aria-live="polite" aria-label="Air quality update" className="sr-only">
        {liveStatusText}
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-8 rounded-3xl text-white shadow-xl shadow-blue-600/10">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white">
            <CloudSun className="w-4 h-4 text-amber-300" aria-hidden="true" />
            Winter Smog &amp; Air Quality Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Navigate Urban Air Pollution Safely
          </h1>
          <p className="text-blue-50 text-sm sm:text-base leading-relaxed">
            Real-time CPCB NAQI tracking, low-emission daily routines, indoor air quality hacks, and measurable health impact tailored to your family.
          </p>
        </div>

        <div className="bg-slate-950/30 backdrop-blur-md p-4 rounded-2xl border border-white/25 flex flex-col gap-3 w-full md:w-auto">
          <label className="text-xs font-medium text-white flex items-center justify-between gap-4">
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
              className="w-4 h-4 text-blue-600 rounded focus:ring-white cursor-pointer"
            />
          </label>
          <span className="text-xs text-blue-100">
            {isDemoMode ? 'Using simulated winter smog dataset' : 'Using live Open-Meteo API'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label="City or location query"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || isPending}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-2xl shadow-md shadow-blue-600/20 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading || isPending ? (
              <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-5 h-5" aria-hidden="true" />
            )}
            <span>{t.searchButton}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quick Cities:</span>
          {['New Delhi', 'Kanpur', 'Bengaluru', 'Mumbai', 'Kolkata'].map((city) => (
            <button
              key={city}
              onClick={() => {
                setQuery(city);
                onFetchByCity(city, isDemoMode);
              }}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium rounded-xl transition"
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && !reading && (
        <div aria-busy="true" aria-label="Loading air quality data" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse h-48" />
          ))}
        </div>
      )}

      {reading && (
        <div className="space-y-6">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border-2 ${getBorderColor(
              reading.band,
            )} relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-cyan-500/0 rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>{reading.locationName}</span>
                  {reading.isDemoData && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-md font-semibold">
                      Demo Data
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {t.aqiScore}
                </h2>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {reading.aqi}
                    </span>
                    <div className="text-xs text-slate-600 dark:text-slate-400">CPCB NAQI Index</div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 ${getBadgeColor(
                      reading.band,
                    )}`}
                  >
                    <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                    <span>{reading.band}</span>
                  </div>
                </div>
                <div
                  data-testid="aqi-provenance"
                  className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>
                    {t.source}:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{reading.source}</strong>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t.pm25}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {reading.pm25 !== null ? `${reading.pm25} µg/m³` : 'N/A'}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t.pm10}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {reading.pm10 !== null ? `${reading.pm10} µg/m³` : 'N/A'}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t.no2}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {reading.no2 !== null ? `${reading.no2} µg/m³` : 'N/A'}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t.o3}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {reading.o3 !== null ? `${reading.o3} µg/m³` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>
                  {t.source}: <strong className="text-slate-700 dark:text-slate-300">{reading.source}</strong>
                </span>
                <span>•</span>
                <span>
                  {t.updatedAt}: {new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2 font-medium">
                {reading.trend.trend === 'improving' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full">
                    <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
                    {t.trendImproving}
                  </span>
                )}
                {reading.trend.trend === 'worsening' && (
                  <span className="inline-flex items-center gap-1.5 text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-3 py-1 rounded-full">
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    {t.trendWorsening}
                  </span>
                )}
                {reading.trend.trend === 'stable' && (
                  <span className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full">
                    <Activity className="w-4 h-4" aria-hidden="true" />
                    {t.trendStable}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
