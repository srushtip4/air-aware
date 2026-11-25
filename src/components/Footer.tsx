import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { MEDICAL_DISCLAIMER } from '../lib/recommendations';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = translations[language];

  return (
    <footer className="bg-[#ECF1EF] dark:bg-[#0D1519] text-slate-700 dark:text-slate-300 py-10 border-t border-[#D5DFDC] dark:border-[#22323A] mt-16 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-6 border-b border-[#D5DFDC] dark:border-[#22323A]">
          <div className="space-y-1">
            <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {t.appName}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              {t.tagline}. Data sourced from Open-Meteo Air Quality &amp; Geocoding APIs and optional Google Gemini explanations.
            </p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
            CPCB NAQI Standard · Zero Cost · Device-Local Profiles
          </p>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong className="text-slate-900 dark:text-slate-100">Disclaimer: </strong>
            {MEDICAL_DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2">
          <p>© {new Date().getFullYear()} AirAware</p>
          <p className="mt-1 sm:mt-0">Built for families navigating winter smog and urban air pollution.</p>
        </div>
      </div>
    </footer>
  );
};
