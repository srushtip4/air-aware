import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { Navbar } from '../../src/components/Navbar';
import { FallbackBanner } from '../../src/components/FallbackBanner';
import { ProfileView } from '../../src/components/ProfileView';
import { NotFoundView } from '../../src/components/NotFoundView';
import { DEFAULT_USER_PROFILE } from '../../src/lib/storage';

describe('AirAware UI Components & Accessibility (WCAG 2.1 AA)', () => {
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
    expect(screen.getByText(/AI assistant is currently offline/i)).toBeDefined();
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
});
