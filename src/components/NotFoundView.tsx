import React from 'react';
import { Compass, Home } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

interface NotFoundViewProps {
  onGoHome: () => void;
  language: Language;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome, language }) => {
  const t = translations[language];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[70vh] flex items-center justify-center p-6 focus:outline-none">
      <div className="max-w-md w-full bg-white dark:bg-[#111A1E] p-8 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] text-center space-y-6">
        <div className="w-14 h-14 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {t.notFoundHeading}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t.notFoundBody}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span>{t.returnHome}</span>
        </button>
      </div>
    </main>
  );
};
