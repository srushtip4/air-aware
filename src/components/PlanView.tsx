import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Leaf,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { estimateActionImpact } from '../lib/impact';
import type {
  RecommendationItem,
  RecommendationPlan,
  SafetyPrecaution,
  UserProfile,
} from '../types';

interface PlanViewProps {
  plan: RecommendationPlan | null;
  profile: UserProfile;
  language: Language;
}

export const PlanView: React.FC<PlanViewProps> = ({ plan, profile, language }) => {
  const t = translations[language];
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  if (!plan) {
    return (
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">No active clean-air plan generated yet. Please check live AQI first.</p>
      </main>
    );
  }

  const toggleAccordion = (id: string) => {
    setExpandedActionId(expandedActionId === id ? null : id);
  };

  const renderRecommendationCard = (item: RecommendationItem) => {
    const isExpanded = expandedActionId === item.id;
    const impactEstimate = item.impactActionId
      ? estimateActionImpact(item.impactActionId, profile)
      : null;

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                item.priority === 'critical'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : item.priority === 'high'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              {item.priority}
            </span>
            {item.costTier && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                {item.costTier.replace('_', ' ')}
              </span>
            )}
            {item.timeSlot && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="capitalize">{item.timeSlot.replace('_', ' ')}</span>
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {item.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {item.summary}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 italic">
            Rationale: {item.rationale}
          </span>

          {item.impactActionId && (
            <button
              onClick={() => toggleAccordion(item.id)}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <span>{t.howCalculated}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {isExpanded && impactEstimate && (
          <div
            tabIndex={0}
            className="mt-4 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs text-slate-700 dark:text-slate-300"
          >
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              {t.assumptions}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 mb-0.5">CO2e Reduction</div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {impactEstimate.avoidedCo2eKgPerWeek.value !== null
                    ? `${impactEstimate.avoidedCo2eKgPerWeek.value} ${impactEstimate.avoidedCo2eKgPerWeek.unit}`
                    : impactEstimate.avoidedCo2eKgPerWeek.unavailableReason}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 mb-0.5">PM2.5 Reduction</div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {impactEstimate.avoidedPmGramsPerWeek.value !== null
                    ? `${impactEstimate.avoidedPmGramsPerWeek.value} ${impactEstimate.avoidedPmGramsPerWeek.unit}`
                    : impactEstimate.avoidedPmGramsPerWeek.unavailableReason}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 mb-0.5">Exposure Drop</div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {impactEstimate.householdExposureReductionPct.value !== null
                    ? `${impactEstimate.householdExposureReductionPct.value} ${impactEstimate.householdExposureReductionPct.unit}`
                    : impactEstimate.householdExposureReductionPct.unavailableReason}
                </div>
              </div>
            </div>

            {impactEstimate.avoidedCo2eKgPerWeek.sourceCitation && (
              <p className="text-slate-500">
                <strong>Citation:</strong> {impactEstimate.avoidedCo2eKgPerWeek.sourceCitation}
              </p>
            )}
            {impactEstimate.avoidedCo2eKgPerWeek.assumptions.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                {impactEstimate.avoidedCo2eKgPerWeek.assumptions.map((asm, idx) => (
                  <li key={idx}>{asm}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPrecautionBadge = (p: SafetyPrecaution) => {
    const isEmergency = p.severity === 'emergency';
    const isWarning = p.severity === 'warning';

    return (
      <div
        key={p.id}
        className={`p-5 rounded-2xl border flex items-start gap-3 ${
          isEmergency
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
            : isWarning
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            isEmergency ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-blue-600'
          }`}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm">{p.title}</h4>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/60 dark:bg-slate-900/60">
              {p.severity}
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">{p.guidance}</p>
        </div>
      </div>
    );
  };

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mb-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Deterministic Clean-Air Action Plan
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {plan.band} Air Quality Guidance
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tailored routines, indoor filtration hacks, and sustainable emission cuts for your household profile.
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-right">
          <div className="text-xs text-slate-500">Generated At</div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {new Date(plan.generatedAt).toLocaleDateString()} {new Date(plan.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {plan.safetyPrecautions.length > 0 && (
        <section aria-labelledby="safety-heading" className="space-y-4">
          <h2 id="safety-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" aria-hidden="true" />
            {t.safetyPrecautionsTitle}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {plan.safetyPrecautions.map(renderPrecautionBadge)}
          </div>
        </section>
      )}

      <section aria-labelledby="routine-heading" className="space-y-6">
        <h2 id="routine-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />
          {t.dailyRoutineTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plan.dailyRoutine.map(renderRecommendationCard)}
        </div>
      </section>

      <section aria-labelledby="hacks-heading" className="space-y-6">
        <h2 id="hacks-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-600" aria-hidden="true" />
          {t.indoorHacksTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plan.indoorHacks.map(renderRecommendationCard)}
        </div>
      </section>

      <section aria-labelledby="alternatives-heading" className="space-y-6">
        <h2 id="alternatives-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          {t.sustainableAlternativesTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plan.sustainableAlternatives.map(renderRecommendationCard)}
        </div>
      </section>
    </main>
  );
};
