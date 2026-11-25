import React from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Home,
  Languages,
  Printer,
  ShieldCheck,
  User,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

export type ActiveTab = 'home' | 'profile' | 'plan' | 'impact' | 'assistant' | 'printable';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
}) => {
  const t = translations[language];

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t.navHome, icon: <Home className="w-4 h-4" aria-hidden="true" /> },
    { id: 'profile', label: t.navProfile, icon: <User className="w-4 h-4" aria-hidden="true" /> },
    { id: 'plan', label: t.navPlan, icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" /> },
    { id: 'impact', label: t.navImpact, icon: <BarChart3 className="w-4 h-4" aria-hidden="true" /> },
    { id: 'assistant', label: t.navAssistant, icon: <Bot className="w-4 h-4" aria-hidden="true" /> },
    { id: 'printable', label: t.navPrintable, icon: <Printer className="w-4 h-4" aria-hidden="true" /> },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-bold"
      >
        {t.skipToContent}
      </a>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Activity className="w-6 h-6 animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t.appName}
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  GenAI Smog Assistant
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <Languages className="w-4 h-4 ml-2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <button
                  onClick={() => onLanguageChange('en')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={language === 'en'}
                >
                  English
                </button>
                <button
                  onClick={() => onLanguageChange('hi')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    language === 'hi'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={language === 'hi'}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>

          <nav aria-label="Main Navigation" className="flex overflow-x-auto space-x-2 py-2 border-t border-slate-100 dark:border-slate-800/80 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
};
