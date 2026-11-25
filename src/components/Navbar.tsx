import React from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Home,
  Moon,
  Printer,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import type { ThemeMode } from '../lib/storage';

export type ActiveTab = 'home' | 'profile' | 'plan' | 'impact' | 'assistant' | 'printable';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  theme = 'light',
  onToggleTheme,
}) => {
  const t = translations[language];
  const isDark = theme === 'dark';

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t.navHome, icon: <Home className="w-4 h-4 shrink-0" aria-hidden="true" /> },
    { id: 'profile', label: t.navProfile, icon: <User className="w-4 h-4 shrink-0" aria-hidden="true" /> },
    { id: 'plan', label: t.navPlan, icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" /> },
    { id: 'impact', label: t.navImpact, icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" /> },
    { id: 'assistant', label: t.navAssistant, icon: <Bot className="w-4 h-4 shrink-0" aria-hidden="true" /> },
    { id: 'printable', label: t.navPrintable, icon: <Printer className="w-4 h-4 shrink-0" aria-hidden="true" /> },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-teal-700 focus:text-white focus:font-semibold focus:shadow-lg"
      >
        {t.skipToContent}
      </a>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0D1519]/95 backdrop-blur-md border-b border-[#D5DFDC] dark:border-[#22323A] transition-colors print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-6 gap-y-1 py-2 lg:py-0 lg:h-16">
            {/* Zone 1: Clean Single-Element Brand Wordmark */}
            <div className="flex items-center gap-2.5 shrink-0 order-1">
              <Activity
                className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0"
                aria-hidden="true"
              />
              <span className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight whitespace-nowrap shrink-0">
                {t.appName}
              </span>
            </div>

            {/* Zone 2: Single Responsive Navigation */}
            <nav
              aria-label="Main Navigation"
              className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 overflow-x-auto border-t border-[#E6ECEA] dark:border-[#1B282F] lg:border-t-0 pt-1 lg:pt-0"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 rounded-t-md ${
                      isActive
                        ? 'border-teal-700 dark:border-teal-400 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Theme & Language Controls */}
            <div className="order-2 lg:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? t.switchToLight : t.switchToDark}
                aria-pressed={isDark}
                className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-semibold rounded-lg border border-[#D5DFDC] dark:border-[#263841] bg-[#F4F7F6] dark:bg-[#162228] text-slate-800 dark:text-slate-100 hover:bg-[#E7EEEC] dark:hover:bg-[#1E2E36] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                ) : (
                  <Moon className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
                )}
                <span>{isDark ? t.themeLight : t.themeDark}</span>
              </button>

              <div
                role="group"
                aria-label="Language"
                className="inline-flex items-center bg-[#F4F7F6] dark:bg-[#162228] p-1 rounded-lg border border-[#D5DFDC] dark:border-[#263841]"
              >
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${
                    language === 'en'
                      ? 'bg-white dark:bg-[#22323A] text-teal-800 dark:text-teal-200 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-pressed={language === 'en'}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('hi')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${
                    language === 'hi'
                      ? 'bg-white dark:bg-[#22323A] text-teal-800 dark:text-teal-200 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-pressed={language === 'hi'}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
