import React from 'react';
import { AlertTriangle, Clock, Info, WifiOff } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';

interface FallbackBannerProps {
  isDemo?: boolean;
  isStale?: boolean;
  lastUpdated?: string | null;
  isCached?: boolean;
  isFallback?: boolean;
  fallbackReason?: string;
  language?: Language;
}

function formatBannerTime(timestamp?: string | null): string {
  if (!timestamp) {
    return 'unknown time';
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const FallbackBanner: React.FC<FallbackBannerProps> = ({
  isDemo = false,
  isStale = false,
  lastUpdated = null,
  isCached = false,
  isFallback = false,
  fallbackReason,
  language = 'en',
}) => {
  const t = translations[language];

  if (!isDemo && !isStale && !isCached && !isFallback) {
    return null;
  }

  let message: string = t.cachedBanner;
  let Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> = Info;

  if (isFallback) {
    message = t.fallbackBanner;
    Icon = WifiOff;
  } else if (isDemo) {
    message = t.demoDataBanner;
    Icon = AlertTriangle;
  } else if (isStale) {
    message = `${t.staleCachedPrefix} ${formatBannerTime(lastUpdated)}`;
    Icon = Clock;
  }

  return (
    <aside
      aria-label="Data status notice"
      role="status"
      className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
        <Icon className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden={true} />
        <div className="flex-1">
          <p className="font-semibold">{message}</p>
          {fallbackReason && (
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              {fallbackReason}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
