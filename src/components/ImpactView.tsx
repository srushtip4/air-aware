import React, { useState } from 'react';
import { BarChart3, Globe } from 'lucide-react';
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
        <p className="text-slate-600 dark:text-slate-400">
          No active impact report available. Please check live AQI first.
        </p>
      </main>
    );
  }

  const impactReport = calculateImpactForPlan(plan, profile, households);
  const { weeklyTotal, communityProjection, perAction } = impactReport;

  return (
    <main id="main-content" tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 focus:outline-none">
      <div className="bg-white dark:bg-[#111A1E] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D5DFDC] dark:border-[#22323A] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Quantified Impact Estimates &amp; Community Scaling
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t.weeklyTotalTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Track weekly avoided CO2e, PM2.5 emissions reductions, and cumulative indoor exposure drops.
          </p>
        </div>

        <div className="bg-[#ECF1EF] dark:bg-[#162228] p-4 rounded-xl w-full md:w-80 space-y-2.5 shrink-0">
          <label htmlFor="households-slider" className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t.communityHouseholdsSlider}:{' '}
            <strong className="font-mono tabular-nums text-teal-800 dark:text-teal-300">
              {households.toLocaleString()}
            </strong>
          </label>
          <input
            id="households-slider"
            type="range"
            min={10}
            max={5000}
            step={10}
            value={households}
            onChange={(e) => setHouseholds(parseInt(e.target.value, 10) || 100)}
            className="w-full accent-teal-700 dark:accent-teal-400 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
            <span>10</span>
            <span>2,500</span>
            <span>5,000</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#111A1E] p-6 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t.avoidedCo2e}
            </div>
            <FactorBadge
              kind={weeklyTotal.avoidedCo2eKg.kind}
              confidence={weeklyTotal.avoidedCo2eKg.confidence}
              compact
            />
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-teal-800 dark:text-teal-300">
            {weeklyTotal.avoidedCo2eKg.value !== null
              ? `${weeklyTotal.avoidedCo2eKg.value} kg`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {weeklyTotal.avoidedCo2eKg.unavailableReason || 'Sum of quantified weekly motorized transport CO2e reductions.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111A1E] p-6 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t.avoidedPm}
            </div>
            <FactorBadge
              kind={weeklyTotal.avoidedPmGrams.kind}
              confidence={weeklyTotal.avoidedPmGrams.confidence}
              compact
            />
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-amber-800 dark:text-amber-300">
            {weeklyTotal.avoidedPmGrams.value !== null
              ? `${weeklyTotal.avoidedPmGrams.value} g`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {weeklyTotal.avoidedPmGrams.unavailableReason || 'Total particulate matter source emissions prevented this week.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#111A1E] p-6 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t.exposureReduction}
            </div>
            <FactorBadge
              kind={weeklyTotal.combinedExposureReductionPct.kind}
              confidence={weeklyTotal.combinedExposureReductionPct.confidence}
              compact
            />
          </div>
          <div className="font-mono tabular-nums text-3xl font-bold text-emerald-800 dark:text-emerald-300">
            {weeklyTotal.combinedExposureReductionPct.value !== null
              ? `${weeklyTotal.combinedExposureReductionPct.value}%`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {weeklyTotal.combinedExposureReductionPct.unavailableReason || 'Multiplicative indoor infiltration and filtration reduction (indoor PM2.5 baseline, capped at 90%).'}
          </p>
          {weeklyTotal.cookingExposureReductionPct &&
            weeklyTotal.cookingExposureReductionPct.value !== null && (
              <p className="text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-[#D5DFDC] dark:border-[#22323A]">
                Cooking PM2.5 baseline:{' '}
                <strong className="font-mono tabular-nums">
                  {weeklyTotal.cookingExposureReductionPct.value}%
                </strong>{' '}
                capture via exhaust ventilation.
              </p>
            )}
        </div>
      </div>

      {/* Deep Atmospheric Charcoal-Teal Community Projection Band */}
      <div
        role="region"
        aria-label={communityProjection.label}
        aria-live="polite"
        className="bg-[#0F2426] dark:bg-[#102A2D] border border-teal-900/50 dark:border-teal-800/60 text-white rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-teal-300 shrink-0">
            <Globe className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{communityProjection.label}</h2>
            <p className="text-xs text-slate-300">
              Scaling household savings across{' '}
              <span className="font-mono tabular-nums font-semibold">{households.toLocaleString()}</span>{' '}
              participating community members.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-white/15">
          <div className="bg-white/5 p-5 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-200 font-medium">Community Weekly CO2e Saved</div>
              <FactorBadge
                kind={communityProjection.weeklyAvoidedCo2eKg.kind}
                confidence={communityProjection.weeklyAvoidedCo2eKg.confidence}
                compact
              />
            </div>
            <div className="font-mono tabular-nums text-2xl font-bold text-teal-300">
              {communityProjection.weeklyAvoidedCo2eKg.value !== null
                ? `${communityProjection.weeklyAvoidedCo2eKg.value.toLocaleString()} kg CO2e`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-white/5 p-5 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-200 font-medium">Community Weekly PM2.5 Prevented</div>
              <FactorBadge
                kind={communityProjection.weeklyAvoidedPmGrams.kind}
                confidence={communityProjection.weeklyAvoidedPmGrams.confidence}
                compact
              />
            </div>
            <div className="font-mono tabular-nums text-2xl font-bold text-amber-300">
              {communityProjection.weeklyAvoidedPmGrams.value !== null
                ? `${communityProjection.weeklyAvoidedPmGrams.value.toLocaleString()} g PM2.5`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111A1E] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D5DFDC] dark:border-[#22323A] space-y-5">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          {t.dataTableTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#D5DFDC] dark:border-[#22323A] text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Action Item</th>
                <th className="py-3 px-4 text-right">Avoided CO2e (Weekly)</th>
                <th className="py-3 px-4 text-right">Avoided PM2.5 (Weekly)</th>
                <th className="py-3 px-4 text-right">Exposure Reduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5DFDC] dark:divide-[#22323A] text-slate-700 dark:text-slate-300">
              {perAction.map((act) => (
                <tr key={act.actionId} className="hover:bg-[#ECF1EF]/70 dark:hover:bg-[#162228]">
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">{act.label}</td>
                  <td className="py-3.5 px-4 text-right space-y-1">
                    <div className="font-mono tabular-nums">
                      {act.avoidedCo2eKgPerWeek.value !== null
                        ? `${act.avoidedCo2eKgPerWeek.value} ${act.avoidedCo2eKgPerWeek.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.avoidedCo2eKgPerWeek.value !== null && (
                      <div className="flex justify-end">
                        <FactorBadge
                          kind={act.avoidedCo2eKgPerWeek.kind}
                          confidence={act.avoidedCo2eKgPerWeek.confidence}
                          compact
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-y-1">
                    <div className="font-mono tabular-nums">
                      {act.avoidedPmGramsPerWeek.value !== null
                        ? `${act.avoidedPmGramsPerWeek.value} ${act.avoidedPmGramsPerWeek.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.avoidedPmGramsPerWeek.value !== null && (
                      <div className="flex justify-end">
                        <FactorBadge
                          kind={act.avoidedPmGramsPerWeek.kind}
                          confidence={act.avoidedPmGramsPerWeek.confidence}
                          compact
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-y-1">
                    <div className="font-mono tabular-nums">
                      {act.householdExposureReductionPct.value !== null
                        ? `${act.householdExposureReductionPct.value} ${act.householdExposureReductionPct.unit}`
                        : 'Unavailable'}
                    </div>
                    {act.householdExposureReductionPct.value !== null && (
                      <div className="flex justify-end">
                        <FactorBadge
                          kind={act.householdExposureReductionPct.kind}
                          confidence={act.householdExposureReductionPct.confidence}
                          compact
                        />
                      </div>
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
