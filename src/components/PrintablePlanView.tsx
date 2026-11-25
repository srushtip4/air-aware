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
    <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 focus:outline-none">
      <div className="flex items-center justify-between print:hidden bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.printableTitle}</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">Optimized for printing and family posting.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Printer className="w-5 h-5" aria-hidden="true" />
          <span>{t.printButton}</span>
        </button>
      </div>

      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-200 space-y-8 print:shadow-none print:border-none print:p-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-extrabold text-2xl mb-1">
              <ShieldCheck className="w-7 h-7" aria-hidden="true" />
              <span>{t.appName} Family Clean-Air Plan</span>
            </div>
            <p className="text-sm text-slate-600">{t.tagline}</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div><strong>Location:</strong> {reading?.locationName ?? profile.locationQuery}</div>
            <div><strong>AQI Band:</strong> {plan.band} ({reading?.aqi ?? 'N/A'})</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
              1. Daily Routine &amp; Timing Schedule
            </h2>
            <ul className="space-y-2">
              {plan.dailyRoutine.map((item) => (
                <li key={item.id} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-700 mt-0.5">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
              2. Indoor Air Quality Hacks
            </h2>
            <ul className="space-y-2">
              {plan.indoorHacks.map((item) => (
                <li key={item.id} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-700 mt-0.5">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
              3. Health Safety Precautions
            </h2>
            <ul className="space-y-2">
              {plan.safetyPrecautions.map((p) => (
                <li key={p.id} className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
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
          <p className="mt-1">AirAware • Zero Cost Winter Smog Assistant</p>
        </div>
      </div>
    </main>
  );
};
