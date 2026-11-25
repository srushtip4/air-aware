import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import { categorize } from '../lib/aqi';
import { generateRecommendations } from '../lib/recommendations';
import { FallbackBanner } from './FallbackBanner';
import type {
  AirQualityReading,
  GeminiStructuredExplanation,
  RecommendationPlan,
  UserProfile,
} from '../types';

interface AssistantViewProps {
  reading: AirQualityReading | null;
  profile: UserProfile;
  language: Language;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string | GeminiStructuredExplanation;
  timestamp: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

function buildRuleBasedExplanation(
  plan: RecommendationPlan,
  reason: string,
): GeminiStructuredExplanation {
  const focusPoints = [
    ...plan.dailyRoutine.slice(0, 2).map((r) => `${r.title}: ${r.summary}`),
    ...plan.indoorHacks.slice(0, 1).map((r) => `${r.title}: ${r.summary}`),
    ...plan.sustainableAlternatives.slice(0, 1).map((r) => `${r.title}: ${r.summary}`),
  ];

  const primarySafety = plan.safetyPrecautions[0]
    ? `${plan.safetyPrecautions[0].title} — ${plan.safetyPrecautions[0].guidance} ${plan.medicalDisclaimer}`
    : plan.medicalDisclaimer;

  return {
    headline: `AI unavailable — Rule-Based Clean-Air Plan (${plan.band})`,
    summary: reason,
    dailyFocus:
      focusPoints.length > 0
        ? focusPoints
        : ['Keep windows sealed during smog peaks and review the Clean-Air Plan tab.'],
    impactExplanation:
      'Open the Clean-Air Plan and Impact & Community tabs for quantified weekly CO2e, PM2.5, and indoor exposure estimates.',
    safetyReminder: primarySafety,
    followUpSuggestions: [],
  };
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  reading,
  profile,
  language,
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: {
        headline: 'Welcome to AirAware AI Assistant',
        summary:
          'I am ready to help you navigate local winter smog, determine the safest ventilation windows, and review your family clean-air plan.',
        dailyFocus: [
          'Ask about safe morning/evening window timing.',
          'Review indoor filtration and DIY box-fan setup.',
          'Explore commuting options on high pollution days.',
        ],
        impactExplanation:
          'All suggestions adhere strictly to CPCB NAQI bands and your household profile.',
        safetyReminder: 'Always consult a medical professional for pediatric or asthma symptoms.',
        followUpSuggestions: [
          'When is the best time to ventilate today?',
          'How do I reduce indoor PM2.5 while cooking?',
        ],
      },
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const handleSendMessage = async (e: React.FormEvent, customQuestion?: string) => {
    e.preventDefault();
    const questionText = (customQuestion ?? inputQuery).trim();
    if (!questionText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: questionText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setError(null);
    setLiveAnnouncement('Requesting guidance from AirAware assistant.');

    try {
      const response = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: reading?.locationName ?? profile.locationQuery,
          aqi: reading?.aqi ?? 250,
          trend: reading?.trend.trend ?? 'stable',
          profile,
          question: questionText,
        }),
      });

      if (!response.ok) {
        const localBand = reading?.band ?? categorize(250).band;
        const localPlan = generateRecommendations({
          band: localBand,
          trend: reading?.trend.trend ?? 'stable',
          profile,
        });
        const reason =
          response.status === 429
            ? 'AI rate limit reached; displaying your rule-based clean-air plan instead.'
            : 'Assistant service returned an error; displaying your rule-based clean-air plan.';

        setFallbackNotice(reason);
        setError(reason);
        setLiveAnnouncement(`AI unavailable. ${reason}`);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: buildRuleBasedExplanation(localPlan, reason),
            timestamp: new Date().toISOString(),
            isFallback: true,
            fallbackReason: reason,
          },
        ]);
        return;
      }

      const data = (await response.json()) as {
        fallback: boolean;
        fallbackReason?: string;
        assist: GeminiStructuredExplanation | null;
        plan: RecommendationPlan;
      };

      const reason =
        data.fallbackReason ??
        'AI assistant is currently unavailable; displaying your deterministic rule-based clean-air plan.';

      const assistContent =
        data.assist ?? buildRuleBasedExplanation(data.plan, reason);

      if (data.fallback) {
        setFallbackNotice(reason);
        setLiveAnnouncement(`AI unavailable. ${reason}`);
      } else {
        setFallbackNotice(null);
        setLiveAnnouncement(`Assistant responded: ${assistContent.headline}`);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: assistContent,
        timestamp: new Date().toISOString(),
        isFallback: data.fallback,
        fallbackReason: data.fallback ? reason : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const localBand = reading?.band ?? categorize(250).band;
      const localPlan = generateRecommendations({
        band: localBand,
        trend: reading?.trend.trend ?? 'stable',
        profile,
      });
      const reason =
        err instanceof Error
          ? `${err.message}. Showing your rule-based clean-air plan.`
          : 'Failed to reach AI assistant. Showing your rule-based clean-air plan.';
      setError(reason);
      setFallbackNotice(reason);
      setLiveAnnouncement(`AI unavailable. ${reason}`);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: buildRuleBasedExplanation(localPlan, reason),
          timestamp: new Date().toISOString(),
          isFallback: true,
          fallbackReason: reason,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 focus:outline-none"
    >
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {t.assistantTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.assistantSubtitle}
            </p>
          </div>
        </div>
      </div>

      {fallbackNotice && (
        <div className="rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-900/60">
          <FallbackBanner
            isFallback={true}
            fallbackReason={fallbackNotice}
            language={language}
          />
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 min-h-[500px] flex flex-col justify-between">
        <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {isUser ? (
                    <User className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Bot className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>

                <div
                  className={`max-w-xl p-5 rounded-2xl space-y-3 ${
                    isUser
                      ? 'bg-blue-700 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  {isUser ? (
                    <p className="text-sm font-medium">{String(msg.content)}</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {msg.isFallback && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
                          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>AI unavailable • Rule-based plan</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                        <h2 className="font-bold text-base">
                          {(msg.content as GeminiStructuredExplanation).headline}
                        </h2>
                      </div>
                      <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                        {(msg.content as GeminiStructuredExplanation).summary}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Key Focus Areas:
                        </h3>
                        <ul className="list-disc list-inside space-y-1">
                          {(msg.content as GeminiStructuredExplanation).dailyFocus.map((pt, idx) => (
                            <li key={idx} className="text-xs">{pt}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                        <strong>Impact &amp; Safety: </strong>
                        {(msg.content as GeminiStructuredExplanation).impactExplanation}
                        <div className="mt-1 text-slate-600 dark:text-slate-400 italic">
                          {(msg.content as GeminiStructuredExplanation).safetyReminder}
                        </div>
                      </div>

                      {(msg.content as GeminiStructuredExplanation).followUpSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {(msg.content as GeminiStructuredExplanation).followUpSuggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => handleSendMessage(e, sug)}
                              className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[10px] text-right ${
                      isUser ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center animate-spin">
                <RefreshCw className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium">Assistant is thinking...</span>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-xl text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSendMessage(e)} className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={t.assistantPlaceholder}
            aria-label="Ask AirAware Assistant"
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{t.sendButton}</span>
          </button>
        </form>
      </div>
    </main>
  );
};
