import React from 'react';
import { Printer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import type { AirQualityReading, RecommendationPlan, UserProfile } from '../types';

interface PrintablePlanViewProps {
  plan: RecommendationPlan | null;
  reading: AirQualityReading | null;
  profile: UserProfile;
  language: Language;
}

export const PrintablePlanView: React.FC<PrintablePlanViewProps> = ({
  plan,
  reading,
  profile,
  language,
}) => {
  const t = translations[language];

  if (!plan) {
    return (
      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-16 text-center focus:outline-none">
        <p className="text-slate-600 dark:text-slate-400">No plan available to print.</p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 focus:outline-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden bg-white dark:bg-[#111A1E] p-5 sm:p-6 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] shadow-sm">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            {t.printableTitle}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Optimized for printing and family posting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>{t.printButton}</span>
        </button>
      </div>

      {/* Physical white paper preview even in dark mode for accurate print fidelity */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-[#D5DFDC] dark:border-[#22323A] space-y-8 print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-teal-800 font-display font-bold text-2xl mb-1">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
              <span>{t.appName} Family Clean-Air Plan</span>
            </div>
            <p className="text-sm text-slate-600">{t.tagline}</p>
          </div>
          <div className="sm:text-right text-xs text-slate-700 space-y-0.5 font-mono tabular-nums">
            <div><strong>Location:</strong> {reading?.locationName ?? profile.locationQuery}</div>
            <div><strong>AQI Band:</strong> {plan.band} ({reading?.aqi ?? 'N/A'})</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-200 pb-1">
              1. Daily Routine &amp; Timing Schedule
            </h2>
            <ul className="space-y-2">
              {plan.dailyRoutine.map((item) => (
                <li key={item.id} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-700 mt-0.5">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-200 pb-1">
              2. Indoor Air Quality Hacks
            </h2>
            <ul className="space-y-2">
              {plan.indoorHacks.map((item) => (
                <li key={item.id} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-700 mt-0.5">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-200 pb-1">
              3. Health Safety Precautions
            </h2>
            <ul className="space-y-2">
              {plan.safetyPrecautions.map((p) => (
                <li key={p.id} className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950 shrink-0">
                    {p.severity}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-amber-950">{p.title}</h3>
                    <p className="text-xs text-amber-900 mt-0.5">{p.guidance}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 text-xs text-slate-600 text-center">
          <p>{plan.medicalDisclaimer}</p>
          <p className="mt-1">AirAware · Zero Cost Winter Smog Assistant</p>
        </div>
      </div>
    </main>
  );
};
