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
      <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" aria-hidden="true" />
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
          onClick={onGoHome}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span>{t.returnHome}</span>
        </button>
      </div>
    </main>
  );
};
