import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import App from '../../src/App';
import { Navbar } from '../../src/components/Navbar';
import { FallbackBanner } from '../../src/components/FallbackBanner';
import { ProfileView } from '../../src/components/ProfileView';
import { NotFoundView } from '../../src/components/NotFoundView';
import { PlanView } from '../../src/components/PlanView';
import { FactorBadge } from '../../src/components/FactorBadge';
import { HomeView } from '../../src/components/HomeView';
import { AssistantView } from '../../src/components/AssistantView';
import { DEFAULT_USER_PROFILE } from '../../src/lib/storage';
import { generateRecommendations } from '../../src/lib/recommendations';
import type { AirQualityReading } from '../../src/types';

describe('AirAware UI Components & Accessibility (WCAG 2.1 AA)', () => {
  afterEach(() => {
    cleanup();
  });
  it('Navbar renders navigation tabs, skip link, and language toggle without axe violations', async () => {
    const handleTab = vi.fn();
    const handleLang = vi.fn();

    const { container } = render(
      <Navbar
        activeTab="home"
        onTabChange={handleTab}
        language="en"
        onLanguageChange={handleLang}
      />,
    );

    expect(screen.getByText('Live AQI')).toBeDefined();
    expect(screen.getByText('Household Profile')).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('FallbackBanner renders cache and fallback notices correctly', () => {
    const { rerender } = render(<FallbackBanner isCached={true} language="en" />);
    expect(screen.getByText(/showing cached air quality data/i)).toBeDefined();

    rerender(<FallbackBanner isFallback={true} fallbackReason="API timeout" language="en" />);
    expect(screen.getByText(/AI unavailable/i)).toBeDefined();
    expect(screen.getByText('API timeout')).toBeDefined();
  });

  it('ProfileView allows editing and saving household profile', () => {
    const handleSave = vi.fn();
    render(
      <ProfileView
        profile={DEFAULT_USER_PROFILE}
        onSaveProfile={handleSave}
        language="en"
      />,
    );

    const locationInput = screen.getByLabelText(/city \/ location query/i);
    fireEvent.change(locationInput, { target: { value: 'Kanpur' } });

    const submitBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ locationQuery: 'Kanpur' }),
    );
  });

  it('NotFoundView renders error state and return home button', () => {
    const handleHome = vi.fn();
    render(<NotFoundView onGoHome={handleHome} language="en" />);

    expect(screen.getByText(/page not found/i)).toBeDefined();
    const homeBtn = screen.getByRole('button', { name: /return to live aqi/i });
    fireEvent.click(homeBtn);
    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it('FactorBadge renders text and icon for Sourced, Proxy, and Assumption without axe violations', async () => {
    const { container } = render(
      <div>
        <FactorBadge kind="sourced" confidence="high" />
        <FactorBadge kind="proxy" confidence="medium" />
        <FactorBadge kind="assumption" confidence="low" />
      </div>,
    );

    expect(screen.getByText('Sourced')).toBeDefined();
    expect(screen.getByText('Proxy')).toBeDefined();
    expect(screen.getByText('Assumption')).toBeDefined();
    expect(container.querySelectorAll('svg').length).toBe(3);

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('PlanView "How was this calculated?" expands with Proxy/Assumption badges and assumptions', () => {
    const carProfile = {
      ...DEFAULT_USER_PROFILE,
      commuteMode: 'car_petrol' as const,
      commuteDistanceKmOneWay: 10,
      commuteDaysPerWeek: 5,
    };
    const plan = generateRecommendations({
      band: 'Very Poor',
      trend: 'worsening',
      profile: carProfile,
    });

    render(<PlanView plan={plan} profile={carProfile} language="en" />);

    const calcButtons = screen.getAllByRole('button', {
      name: /how was this calculated/i,
    });
    expect(calcButtons.length).toBeGreaterThan(0);

    // Click the transit shift action button (which carries Proxy CO2e + Assumption PM2.5)
    const transitIndex = [
      ...plan.dailyRoutine,
      ...plan.indoorHacks,
      ...plan.sustainableAlternatives,
    ]
      .filter((item) => Boolean(item.impactActionId))
      .findIndex((item) => item.impactActionId === 'shift_car_to_transit');
    expect(transitIndex).toBeGreaterThanOrEqual(0);

    fireEvent.click(calcButtons[transitIndex]!);

    expect(screen.getAllByText('Proxy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assumption').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Assumptions:/i).length).toBeGreaterThan(0);
  });

  describe('Data Trustworthiness Banners & AQI Provenance', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('FallbackBanner renders DEMO DATA, stale cache timestamp, and renders nothing for fresh live data', () => {
      const { container, rerender } = render(
        <FallbackBanner isDemo={false} isStale={false} isCached={false} isFallback={false} language="en" />,
      );
      expect(container.firstChild).toBeNull();

      rerender(<FallbackBanner isDemo={true} isStale={false} language="en" />);
      expect(screen.getByText(/DEMO DATA/i)).toBeDefined();

      rerender(
        <FallbackBanner
          isDemo={false}
          isStale={true}
          lastUpdated="2026-11-25T10:15:00.000Z"
          language="en"
        />,
      );
      expect(screen.getByText(/Cached data, last updated/i)).toBeDefined();
    });

    it('HomeView always displays data source and observation time right next to AQI', () => {
      const liveReading: AirQualityReading = {
        aqi: 265,
        pm25: 112,
        pm10: 185,
        no2: 42,
        o3: 28,
        band: 'Poor',
        source: 'Open-Meteo Air Quality API',
        timestamp: '2026-11-25T09:30:00.000Z',
        isDemoData: false,
        locationName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        hourly: [],
        trend: {
          trend: 'worsening',
          delta: 35,
          percentChange: 15,
          windowHours: 6,
          summary: 'Rising PM2.5',
        },
      };

      render(
        <HomeView
          reading={liveReading}
          isLoading={false}
          error={null}
          isDemoMode={false}
          onToggleDemoMode={vi.fn()}
          onFetchByCity={vi.fn()}
          onFetchByCoords={vi.fn()}
          profile={DEFAULT_USER_PROFILE}
          language="en"
        />,
      );

      const provenance = screen.getByTestId('aqi-provenance');
      expect(provenance.textContent).toContain('Open-Meteo Air Quality API');
      expect(provenance.textContent).toContain('Observed:');
    });

    it('App hides banner for fresh live Open-Meteo data and shows DEMO DATA / stale banners when appropriate', async () => {
      const baseReading: AirQualityReading = {
        aqi: 210,
        pm25: 94,
        pm10: 160,
        no2: 35,
        o3: 22,
        band: 'Poor',
        source: 'Open-Meteo Air Quality API',
        timestamp: new Date().toISOString(),
        isDemoData: false,
        locationName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        hourly: [],
        trend: {
          trend: 'stable',
          delta: 2,
          percentChange: 1,
          windowHours: 6,
          summary: 'Steady',
        },
      };

      let mode: 'live' | 'demo' | 'stale' = 'live';
      const fetchMock = vi.fn(async () => {
        if (mode === 'live') {
          return new Response(
            JSON.stringify({
              reading: { ...baseReading, isDemoData: false },
              cacheStatus: 'miss',
              isStale: false,
              cachedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 600_000).toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (mode === 'demo') {
          return new Response(
            JSON.stringify({
              reading: {
                ...baseReading,
                isDemoData: true,
                source: 'AirAware Demo Dataset (Offline Winter Smog Simulation)',
              },
              cacheStatus: 'miss',
              isStale: false,
              cachedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 600_000).toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            reading: { ...baseReading, isDemoData: false },
            cacheStatus: 'stale_on_error',
            isStale: true,
            cachedAt: '2026-11-25T08:00:00.000Z',
            expiresAt: '2026-11-25T08:10:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<App />);

      // Fresh live data -> provenance shows, NO DEMO DATA or Cached data banner
      await waitFor(() => {
        expect(screen.getByTestId('aqi-provenance')).toBeDefined();
      });
      expect(screen.getByRole('status', { name: /Air quality update/i }).textContent).toContain(
        'Loaded air quality for New Delhi',
      );
      expect(screen.queryByRole('status', { name: /Data status notice/i })).toBeNull();
      expect(screen.queryByText(/DEMO DATA/i)).toBeNull();
      expect(screen.queryByText(/Cached data, last updated/i)).toBeNull();

      // Switch to demo data -> persistent DEMO DATA banner renders
      mode = 'demo';
      fireEvent.click(screen.getByLabelText(/Offline Demo Mode/i));
      await waitFor(() => {
        expect(
          screen.getByRole('status', { name: /Data status notice/i }).textContent,
        ).toContain('DEMO DATA');
      });

      // Switch back off demo mode when upstream falls back to stale cache -> Cached data banner renders
      mode = 'stale';
      fireEvent.click(screen.getByLabelText(/Offline Demo Mode/i));
      await waitFor(() => {
        expect(
          screen.getByRole('status', { name: /Data status notice/i }).textContent,
        ).toContain('Cached data, last updated');
      });
    });
  });

  describe('AssistantView AI Unavailable Notice & Rule-Based Fallback', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('displays explicit AI unavailable notice and deterministic rule-based plan on fallback response', async () => {
      const plan = generateRecommendations({
        band: 'Severe',
        trend: 'worsening',
        profile: DEFAULT_USER_PROFILE,
      });

      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              fallback: true,
              fallbackReason: 'AI assistant is not configured; returning deterministic plan.',
              cached: false,
              cacheStatus: 'miss',
              bandInfo: { band: 'Severe', isUnhealthy: true },
              plan,
              assist: null,
              medicalDisclaimer: plan.medicalDisclaimer,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      );

      render(<AssistantView reading={null} profile={DEFAULT_USER_PROFILE} language="en" />);

      const input = screen.getByLabelText(/Ask AirAware Assistant/i);
      fireEvent.change(input, { target: { value: 'Should I open windows?' } });
      fireEvent.click(screen.getByRole('button', { name: /Ask Assistant/i }));

      await waitFor(() => {
        expect(screen.getByText(/AI unavailable — displaying your rule-based clean-air plan/i)).toBeDefined();
      });

      expect(screen.getByText(/AI unavailable • Rule-based plan/i)).toBeDefined();
      expect(screen.getByText(new RegExp(plan.dailyRoutine[0]!.title, 'i'))).toBeDefined();
    });
  });
});
