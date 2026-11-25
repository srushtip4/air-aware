import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Leaf,
  Wrench,
} from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { estimateActionImpact } from '../lib/impact';
import { FactorBadge } from './FactorBadge';
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

const getPriorityColor = (priority: RecommendationItem['priority']): string => {
  switch (priority) {
    case 'critical':
      return 'text-red-800 dark:text-red-300';
    case 'high':
      return 'text-amber-800 dark:text-amber-300';
    default:
      return 'text-teal-800 dark:text-teal-300';
  }
};

export const PlanView: React.FC<PlanViewProps> = ({ plan, profile, language }) => {
  const t = translations[language];
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  if (!plan) {
    return (
      <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto px-4 py-16 text-center focus:outline-none">
        <p className="text-slate-600 dark:text-slate-400">
          No active clean-air plan generated yet. Please check live AQI first.
        </p>
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

    const allMetrics = impactEstimate
      ? [
          impactEstimate.avoidedCo2eKgPerWeek,
          impactEstimate.avoidedPmGramsPerWeek,
          impactEstimate.householdExposureReductionPct,
        ]
      : [];

    const uniqueCitations = Array.from(
      new Set(
        allMetrics
          .filter((m) => m.value !== null && m.sourceCitation)
          .map((m) => m.sourceCitation as string),
      ),
    );
    const uniqueNotes = Array.from(
      new Set(
        allMetrics
          .filter((m) => m.value !== null && m.note)
          .map((m) => m.note as string),
      ),
    );
    const uniqueAssumptions = Array.from(
      new Set(allMetrics.flatMap((m) => m.assumptions)),
    );

    return (
      <article
        key={item.id}
        className="bg-white dark:bg-[#111A1E] border border-[#D5DFDC] dark:border-[#22323A] rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className={`font-bold uppercase tracking-wider ${getPriorityColor(item.priority)}`}>
            {item.priority}
          </span>
          {item.costTier && (
            <>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">·</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                {item.costTier.replace('_', ' ')}
              </span>
            </>
          )}
          {item.timeSlot && (
            <>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 capitalize">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.timeSlot.replace('_', ' ')}</span>
              </span>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {item.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {item.summary}
          </p>
        </div>

        <div className="pt-3 border-t border-[#D5DFDC] dark:border-[#22323A] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Rationale: {item.rationale}
          </span>

          {item.impactActionId && (
            <button
              type="button"
              onClick={() => toggleAccordion(item.id)}
              aria-expanded={isExpanded}
              aria-controls={`calc-panel-${item.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 rounded"
            >
              <span>{t.howCalculated}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {isExpanded && impactEstimate && (
          <div
            id={`calc-panel-${item.id}`}
            tabIndex={0}
            className="mt-3 bg-[#ECF1EF] dark:bg-[#162228] p-5 rounded-xl space-y-4 text-xs text-slate-700 dark:text-slate-300"
          >
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              {t.assumptions}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-[#D5DFDC] dark:border-[#22323A]">
              <div className="space-y-1.5">
                <div className="text-slate-600 dark:text-slate-400 font-medium">CO2e Reduction</div>
                <div className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100">
                  {impactEstimate.avoidedCo2eKgPerWeek.value !== null
                    ? `${impactEstimate.avoidedCo2eKgPerWeek.value} ${impactEstimate.avoidedCo2eKgPerWeek.unit}`
                    : impactEstimate.avoidedCo2eKgPerWeek.unavailableReason}
                </div>
                <FactorBadge
                  kind={impactEstimate.avoidedCo2eKgPerWeek.kind}
                  confidence={impactEstimate.avoidedCo2eKgPerWeek.confidence}
                  compact
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-600 dark:text-slate-400 font-medium">PM2.5 Reduction</div>
                <div className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100">
                  {impactEstimate.avoidedPmGramsPerWeek.value !== null
                    ? `${impactEstimate.avoidedPmGramsPerWeek.value} ${impactEstimate.avoidedPmGramsPerWeek.unit}`
                    : impactEstimate.avoidedPmGramsPerWeek.unavailableReason}
                </div>
                <FactorBadge
                  kind={impactEstimate.avoidedPmGramsPerWeek.kind}
                  confidence={impactEstimate.avoidedPmGramsPerWeek.confidence}
                  compact
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-600 dark:text-slate-400 font-medium">Exposure Drop</div>
                <div className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100">
                  {impactEstimate.householdExposureReductionPct.value !== null
                    ? `${impactEstimate.householdExposureReductionPct.value} ${impactEstimate.householdExposureReductionPct.unit}`
                    : impactEstimate.householdExposureReductionPct.unavailableReason}
                </div>
                <FactorBadge
                  kind={impactEstimate.householdExposureReductionPct.kind}
                  confidence={impactEstimate.householdExposureReductionPct.confidence}
                  compact
                />
                {impactEstimate.householdExposureReductionPct.baseline && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Baseline:{' '}
                    {impactEstimate.householdExposureReductionPct.baseline === 'cooking_pm25'
                      ? 'Cooking PM2.5'
                      : 'Indoor PM2.5'}
                  </div>
                )}
              </div>
            </div>

            {uniqueCitations.length > 0 && (
              <div className="text-slate-700 dark:text-slate-300 space-y-1">
                <strong>Citations:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {uniqueCitations.map((cit, idx) => (
                    <li key={idx}>{cit}</li>
                  ))}
                </ul>
              </div>
            )}
            {uniqueNotes.length > 0 && (
              <div className="text-slate-700 dark:text-slate-300 space-y-1">
                <strong>Methodology &amp; Stand-in Notes:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {uniqueNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
            {uniqueAssumptions.length > 0 && (
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <strong>Assumptions:</strong>
                <ul className="list-disc list-inside space-y-1">
                  {uniqueAssumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderPrecautionBadge = (p: SafetyPrecaution) => {
    const isEmergency = p.severity === 'emergency';
    const isWarning = p.severity === 'warning';

    return (
      <div
        key={p.id}
        className={`p-4 sm:p-5 rounded-xl border flex items-start gap-3 ${
          isEmergency
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100'
            : isWarning
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
              : 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/70 text-teal-950 dark:text-teal-100'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            isEmergency
              ? 'text-rose-700 dark:text-rose-300'
              : isWarning
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-teal-700 dark:text-teal-300'
          }`}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-sm">{p.title}</h3>
            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/80 dark:bg-[#111A1E]">
              {p.severity}
            </span>
          </div>
          <p className="text-xs leading-relaxed">{p.guidance}</p>
        </div>
      </div>
    );
  };

  return (
    <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 focus:outline-none">
      <div className="bg-white dark:bg-[#111A1E] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D5DFDC] dark:border-[#22323A] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Deterministic Clean-Air Action Plan
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {plan.band} Air Quality Guidance
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tailored routines, indoor filtration hacks, and sustainable emission cuts for your household profile.
          </p>
        </div>
        <div className="bg-[#ECF1EF] dark:bg-[#162228] px-4 py-3 rounded-xl md:text-right shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">Generated At</div>
          <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
            {new Date(plan.generatedAt).toLocaleDateString()}{' '}
            {new Date(plan.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {plan.safetyPrecautions.length > 0 && (
        <section aria-labelledby="safety-heading" className="space-y-4">
          <h2 id="safety-heading" className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-400" aria-hidden="true" />
            {t.safetyPrecautionsTitle}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {plan.safetyPrecautions.map(renderPrecautionBadge)}
          </div>
        </section>
      )}

      <section aria-labelledby="routine-heading" className="space-y-4">
        <h2 id="routine-heading" className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          {t.dailyRoutineTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plan.dailyRoutine.map(renderRecommendationCard)}
        </div>
      </section>

      <section aria-labelledby="hacks-heading" className="space-y-4">
        <h2 id="hacks-heading" className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          {t.indoorHacksTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plan.indoorHacks.map(renderRecommendationCard)}
        </div>
      </section>

      <section aria-labelledby="alternatives-heading" className="space-y-4">
        <h2 id="alternatives-heading" className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          {t.sustainableAlternativesTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plan.sustainableAlternatives.map(renderRecommendationCard)}
        </div>
      </section>
    </main>
  );
};
