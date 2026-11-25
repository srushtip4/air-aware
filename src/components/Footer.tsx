import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { MEDICAL_DISCLAIMER } from '../lib/recommendations';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = translations[language];

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-slate-100">{t.appName}</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">
                Zero Cost • Privacy First
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xl">
              {t.tagline}. Powered by Open-Meteo Air Quality &amp; Geocoding APIs and Google Gemini.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>CPCB NAQI Standard &amp; Transparent Impact Factors</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Disclaimer: </strong>
            {MEDICAL_DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 pt-4">
          <p>© {new Date().getFullYear()} AirAware. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built for families navigating winter smog and urban air pollution.</p>
        </div>
      </div>
    </footer>
  );
};
