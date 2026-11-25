import React, { useState } from 'react';
import {
  BarChart3,
  Globe,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { calculateImpactForPlan } from '../lib/impact';
import { FactorBadge } from './FactorBadge';
import type { RecommendationPlan, UserProfile } from '../types';

interface ImpactViewProps {
  plan: RecommendationPlan | null;
  profile: UserProfile;
  language: Language;
}

export const ImpactView: React.FC<ImpactViewProps> = ({
  plan,
  profile,
  language,
}) => {
  const t = translations[language];
  const [households, setHouseholds] = useState<number>(100);

  if (!plan) {
    return (
      <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto px-4 py-16 text-center focus:outline-none">
        <p className="text-slate-600 dark:text-slate-400">No active impact report available. Please check live AQI first.</p>
      </main>
    );
  }

  const impactReport = calculateImpactForPlan(plan, profile, households);
  const { weeklyTotal, communityProjection, perAction } = impactReport;

  return (
    <main id="main-content" tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 focus:outline-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 mb-2">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Quantified Impact Estimates &amp; Community Scaling
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t.weeklyTotalTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track weekly avoided CO2e, PM2.5 emissions reductions, and cumulative indoor exposure drops.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-80 space-y-3">
          <label htmlFor="households-slider" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.communityHouseholdsSlider}: <strong className="text-blue-700 dark:text-blue-400">{households.toLocaleString()}</strong>
          </label>
          <input
            id="households-slider"
            type="range"
            min={10}
            max={5000}
            step={10}
            value={households}
            onChange={(e) => setHouseholds(parseInt(e.target.value, 10) || 100)}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <span>10</span>
            <span>2,500</span>
            <span>5,000</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.avoidedCo2e}</div>
            <FactorBadge
              kind={weeklyTotal.avoidedCo2eKg.kind}
              confidence={weeklyTotal.avoidedCo2eKg.confidence}
              compact
            />
          </div>
          <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
            {weeklyTotal.avoidedCo2eKg.value !== null
              ? `${weeklyTotal.avoidedCo2eKg.value} kg`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {weeklyTotal.avoidedCo2eKg.unavailableReason || 'Sum of quantified weekly motorized transport CO2e reductions.'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.avoidedPm}</div>
            <FactorBadge
              kind={weeklyTotal.avoidedPmGrams.kind}
              confidence={weeklyTotal.avoidedPmGrams.confidence}
              compact
            />
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
            {weeklyTotal.avoidedPmGrams.value !== null
              ? `${weeklyTotal.avoidedPmGrams.value} g`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {weeklyTotal.avoidedPmGrams.unavailableReason || 'Total particulate matter source emissions prevented this week.'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.exposureReduction}</div>
            <FactorBadge
              kind={weeklyTotal.combinedExposureReductionPct.kind}
              confidence={weeklyTotal.combinedExposureReductionPct.confidence}
              compact
            />
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
            {weeklyTotal.combinedExposureReductionPct.value !== null
              ? `${weeklyTotal.combinedExposureReductionPct.value}%`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {weeklyTotal.combinedExposureReductionPct.unavailableReason || 'Multiplicative indoor infiltration and filtration reduction (indoor PM2.5 baseline, capped at 90%).'}
          </p>
          {weeklyTotal.cookingExposureReductionPct &&
            weeklyTotal.cookingExposureReductionPct.value !== null && (
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                Cooking PM2.5 baseline: <strong>{weeklyTotal.cookingExposureReductionPct.value}%</strong> capture via exhaust ventilation.
              </p>
            )}
        </div>
      </div>

      <div
        role="region"
        aria-label={communityProjection.label}
        aria-live="polite"
        className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-8 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-blue-400">
            <Globe className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{communityProjection.label}</h2>
            <p className="text-xs text-slate-300">
              Scaling household savings across {households.toLocaleString()} participating community members.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-300">Community Weekly CO2e Saved</div>
              <FactorBadge
                kind={communityProjection.weeklyAvoidedCo2eKg.kind}
                confidence={communityProjection.weeklyAvoidedCo2eKg.confidence}
                compact
              />
            </div>
            <div className="text-2xl font-black text-blue-400">
              {communityProjection.weeklyAvoidedCo2eKg.value !== null
                ? `${communityProjection.weeklyAvoidedCo2eKg.value.toLocaleString()} kg CO2e`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-300">Community Weekly PM2.5 Prevented</div>
              <FactorBadge
                kind={communityProjection.weeklyAvoidedPmGrams.kind}
                confidence={communityProjection.weeklyAvoidedPmGrams.confidence}
                compact
              />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {communityProjection.weeklyAvoidedPmGrams.value !== null
                ? `${communityProjection.weeklyAvoidedPmGrams.value.toLocaleString()} g PM2.5`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" aria-hidden="true" />
          {t.dataTableTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Action Item</th>
                <th className="py-3 px-4">Avoided CO2e (Weekly)</th>
                <th className="py-3 px-4">Avoided PM2.5 (Weekly)</th>
                <th className="py-3 px-4">Exposure Reduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {perAction.map((act) => (
                <tr key={act.actionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{act.label}</td>
                  <td className="py-3 px-4 space-y-1">
                    <div>
                      {act.avoidedCo2eKgPerWeek.value !== null
                        ? `${act.avoidedCo2eKgPerWeek.value} ${act.avoidedCo2eKgPerWeek.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.avoidedCo2eKgPerWeek.value !== null && (
                      <FactorBadge
                        kind={act.avoidedCo2eKgPerWeek.kind}
                        confidence={act.avoidedCo2eKgPerWeek.confidence}
                        compact
                      />
                    )}
                  </td>
                  <td className="py-3 px-4 space-y-1">
                    <div>
                      {act.avoidedPmGramsPerWeek.value !== null
                        ? `${act.avoidedPmGramsPerWeek.value} ${act.avoidedPmGramsPerWeek.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.avoidedPmGramsPerWeek.value !== null && (
                      <FactorBadge
                        kind={act.avoidedPmGramsPerWeek.kind}
                        confidence={act.avoidedPmGramsPerWeek.confidence}
                        compact
                      />
                    )}
                  </td>
                  <td className="py-3 px-4 space-y-1">
                    <div>
                      {act.householdExposureReductionPct.value !== null
                        ? `${act.householdExposureReductionPct.value} ${act.householdExposureReductionPct.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.householdExposureReductionPct.value !== null && (
                      <FactorBadge
                        kind={act.householdExposureReductionPct.kind}
                        confidence={act.householdExposureReductionPct.confidence}
                        compact
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};
