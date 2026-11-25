import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FallbackBanner } from './components/FallbackBanner';
import { Navbar, type ActiveTab } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { PlanView } from './components/PlanView';
import { ImpactView } from './components/ImpactView';
import { AssistantView } from './components/AssistantView';
import { PrintablePlanView } from './components/PrintablePlanView';
import {
  loadStoredDemoMode,
  loadStoredProfile,
  loadStoredReading,
  saveStoredDemoMode,
  saveStoredProfile,
  saveStoredReading,
} from './lib/storage';
import { generateRecommendations } from './lib/recommendations';
import type { Language } from './i18n/translations';
import type { AirQualityReading, RecommendationPlan, UserProfile } from './types';

interface AirCacheMeta {
  isStale: boolean;
  cachedAt: string | null;
  expiresAt: string | null;
}

const DEFAULT_CLIENT_STALE_MS = 10 * 60_000;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [profile, setProfile] = useState<UserProfile>(loadStoredProfile);
  const [reading, setReading] = useState<AirQualityReading | null>(loadStoredReading);
  const [airMeta, setAirMeta] = useState<AirCacheMeta>(() => {
    const stored = loadStoredReading();
    if (!stored || stored.isDemoData) {
      return { isStale: false, cachedAt: null, expiresAt: null };
    }
    const tsMs = Date.parse(stored.timestamp);
    const isOlderThanTtl =
      Number.isFinite(tsMs) && Date.now() - tsMs > DEFAULT_CLIENT_STALE_MS;
    return {
      isStale: isOlderThanTtl,
      cachedAt: stored.timestamp,
      expiresAt: Number.isFinite(tsMs)
        ? new Date(tsMs + DEFAULT_CLIENT_STALE_MS).toISOString()
        : null,
    };
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(loadStoredDemoMode);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<RecommendationPlan | null>(() => {
    if (reading) {
      return generateRecommendations({
        band: reading.band,
        trend: reading.trend.trend,
        profile,
      });
    }
    return null;
  });

  const applyReadingResponse = (data: {
    reading: AirQualityReading;
    cacheStatus?: string;
    isStale?: boolean;
    cachedAt?: string;
    expiresAt?: string;
  }) => {
    setReading(data.reading);
    saveStoredReading(data.reading);
    setAirMeta({
      isStale: Boolean(data.isStale || data.cacheStatus === 'stale_on_error'),
      cachedAt: data.cachedAt ?? data.reading.timestamp,
      expiresAt: data.expiresAt ?? null,
    });

    const generatedPlan = generateRecommendations({
      band: data.reading.band,
      trend: data.reading.trend.trend,
      profile,
    });
    setPlan(generatedPlan);
  };

  const fetchAirQuality = async (cityNameOrQuery: string, demo: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = `/api/air?q=${encodeURIComponent(cityNameOrQuery)}&demo=${demo}`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error('Failed to fetch air quality data');
      }
      const data = (await res.json()) as {
        reading: AirQualityReading;
        cacheStatus?: string;
        isStale?: boolean;
        cachedAt?: string;
        expiresAt?: string;
      };
      applyReadingResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAirQualityByCoords = async (lat: number, lon: number, locationName: string, demo: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = `/api/air?lat=${lat}&lon=${lon}&locationName=${encodeURIComponent(locationName)}&demo=${demo}`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error('Failed to fetch air quality data');
      }
      const data = (await res.json()) as {
        reading: AirQualityReading;
        cacheStatus?: string;
        isStale?: boolean;
        cachedAt?: string;
        expiresAt?: string;
      };
      applyReadingResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveStoredProfile(newProfile);
    if (reading) {
      const updatedPlan = generateRecommendations({
        band: reading.band,
        trend: reading.trend.trend,
        profile: newProfile,
      });
      setPlan(updatedPlan);
    }
  };

  const handleToggleDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    saveStoredDemoMode(demo);
  };

  const isExpiredOnClient =
    airMeta.expiresAt !== null && Date.now() > Date.parse(airMeta.expiresAt);
  const isDemoReading = Boolean(reading?.isDemoData);
  const isStaleReading = Boolean(
    reading && !reading.isDemoData && (airMeta.isStale || isExpiredOnClient),
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          language={language}
          onLanguageChange={setLanguage}
        />

        <FallbackBanner
          isDemo={isDemoReading}
          isStale={isStaleReading}
          lastUpdated={airMeta.cachedAt ?? reading?.timestamp ?? null}
          isFallback={false}
          language={language}
        />

        <div className="flex-1">
          {activeTab === 'home' && (
            <HomeView
              reading={reading}
              isLoading={isLoading}
              error={error}
              isDemoMode={isDemoMode}
              onToggleDemoMode={handleToggleDemoMode}
              onFetchByCity={(city, demo) => fetchAirQuality(city, demo)}
              onFetchByCoords={(lat, lon, name, demo) => fetchAirQualityByCoords(lat, lon, name, demo)}
              profile={profile}
              language={language}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={profile}
              onSaveProfile={handleSaveProfile}
              language={language}
            />
          )}

          {activeTab === 'plan' && (
            <PlanView
              plan={plan}
              profile={profile}
              language={language}
            />
          )}

          {activeTab === 'impact' && (
            <ImpactView
              plan={plan}
              profile={profile}
              language={language}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView
              reading={reading}
              profile={profile}
              language={language}
            />
          )}

          {activeTab === 'printable' && (
            <PrintablePlanView
              plan={plan}
              reading={reading}
              profile={profile}
              language={language}
            />
          )}
        </div>

        <Footer language={language} />
      </div>
    </ErrorBoundary>
  );
}
