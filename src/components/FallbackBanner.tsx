import React from 'react';
import { Info, WifiOff } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

interface FallbackBannerProps {
  isCached?: boolean;
  isFallback?: boolean;
  fallbackReason?: string;
  language?: Language;
}

export const FallbackBanner: React.FC<FallbackBannerProps> = ({
  isCached,
  isFallback,
  fallbackReason,
  language = 'en',
}) => {
  const t = translations[language];

  if (!isCached && !isFallback) {
    return null;
  }

  return (
    <aside
      aria-label="Notice"
      className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
        {isFallback ? (
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        ) : (
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
        )}
        <div className="flex-1">
          <p className="font-medium">
            {isFallback ? t.fallbackBanner : t.cachedBanner}
          </p>
          {fallbackReason && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {fallbackReason}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
