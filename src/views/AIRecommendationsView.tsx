import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Info,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { PriorityIndicator } from '../components/SemanticIndicators';
import {
  AIAnalysisResult,
  ImportSummary,
  PageId,
} from '../types';
import {
  buildLocalFallbackAIAnalysis,
  ComputedSurveyAnalytics,
} from '../utils/analyticsEngine';

interface AIRecommendationsViewProps {
  analytics: ComputedSurveyAnalytics;
  importSummary: ImportSummary;
  aiAnalysis: AIAnalysisResult;
  onSaveAIAnalysis: (result: AIAnalysisResult) => void;
  onGenerateDraftPlanFromSurvey: () => void;
  onNavigate: (page: PageId) => void;
}

export const AIRecommendationsView: React.FC<AIRecommendationsViewProps> = ({
  analytics,
  importSummary,
  aiAnalysis,
  onSaveAIAnalysis,
  onGenerateDraftPlanFromSurvey,
  onNavigate,
}) => {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'fallback';
    message: string;
  } | null>(null);

  const handleRunAIAnalysis = async () => {
    setIsLoadingAI(true);
    setStatusBanner(null);

    try {
      // Strictly anonymized aggregate payload — ZERO phone numbers, ZERO respondent names
      const payload = {
        totalResponses: analytics.totalResponses,
        villagesCount: analytics.villages.length,
        villagesList: analytics.villages,
        dateRange: analytics.dateSpanLabel,
        isDemoDataset: importSummary.isDemo,
        categoryBreakdown: analytics.categorySummaries.map((c) => ({
          category: c.categoryLabel,
          totalAnswered: c.answeredCount,
          concernCount: c.concernCount,
          satisfactoryCount: c.satisfactoryCount,
          concernRate: c.concernRatePercent,
        })),
        topFindings: analytics.findings.slice(0, 12).map((f) => ({
          category: f.categoryLabel,
          concern: f.concernText,
          count: f.count,
          percentage: f.percentageOfTotal,
          villagesAffected: f.villagesAffected,
          priorityScore: f.compositePriorityScore,
          priorityLevel: f.priorityLevel,
        })),
      };

      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.available && data.analysis) {
        const result: AIAnalysisResult = {
          source: 'gemini',
          generatedAt: data.generatedAt || new Date().toISOString(),
          datasetSignature: `${importSummary.isDemo ? 'demo' : 'custom'}-${analytics.totalResponses}-${analytics.uniqueIssuesCount}`,
          executiveSummary: data.analysis.executiveSummary,
          crossCategoryPatterns: data.analysis.crossCategoryPatterns || [],
          prioritizedInterventions: data.analysis.prioritizedInterventions || [],
          actionRoadmap: data.analysis.actionRoadmap || {
            shortTerm: [],
            mediumTerm: [],
            longTerm: [],
          },
          dataLimitations: data.analysis.dataLimitations || [],
        };
        onSaveAIAnalysis(result);
        setStatusBanner({
          type: 'success',
          message:
            'AI recommendations generated from anonymized category-level survey aggregates.',
        });
      } else {
        const reason =
          data?.reason ||
          'Live AI endpoint unavailable. Generated deterministic recommendations from actual response frequencies.';
        const localResult = buildLocalFallbackAIAnalysis(
          analytics,
          importSummary.isDemo,
          reason
        );
        onSaveAIAnalysis(localResult);
        setStatusBanner({
          type: 'fallback',
          message: `Using local evidence-based fallback engine: ${reason}`,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Network error connecting to recommendation service.';
      const localResult = buildLocalFallbackAIAnalysis(
        analytics,
        importSummary.isDemo,
        msg
      );
      onSaveAIAnalysis(localResult);
      setStatusBanner({
        type: 'fallback',
        message: `Live AI service unreachable (${msg}). Displaying deterministic rule-based recommendations computed from your survey counts.`,
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Trigger */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Evidence-Grounded Civic Decision Support · {importSummary.isDemo ? 'Demo Preview Data' : importSummary.fileName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            AI Recommendations &amp; Priority Scoring
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Synthesizes anonymized household survey frequencies into practical interventions, stakeholder coordination suggestions, and phased village action plans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isLoadingAI || analytics.totalResponses === 0}
            onClick={handleRunAIAnalysis}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
            <span>{isLoadingAI ? 'Analyzing Survey Aggregates…' : 'Generate AI Recommendations'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onGenerateDraftPlanFromSurvey();
              onNavigate('development-plan');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-teal-700" />
            <span>Build Draft Development Plan</span>
          </button>
        </div>
      </div>

      {/* Privacy & Prototype Assessment Disclaimer */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900">Prototype Assessment &amp; Data Privacy:</span> Recommendations and priority scores are decision-support proposals based on survey frequencies—not official government assessments. Only anonymized category counts are analyzed; respondent phone numbers and names are never transmitted.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
          Engine: {aiAnalysis.source === 'gemini' ? 'Live AI + Rule Scoring' : 'Local Frequency Engine'}
        </div>
      </div>

      {/* Status / Fallback Banner */}
      {(statusBanner || aiAnalysis.fallbackReason) && (
        <div
          className={`rounded-xl border px-4 py-3.5 flex items-start gap-3 text-xs ${
            statusBanner?.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
              : 'border-amber-200 bg-amber-50/70 text-amber-950'
          }`}
        >
          {statusBanner?.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">
            {statusBanner
              ? statusBanner.message
              : `Fallback Analysis Active: ${aiAnalysis.fallbackReason}`}
          </div>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            01. Executive Summary of Survey Concerns
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Generated: {new Date(aiAnalysis.generatedAt).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">
          {aiAnalysis.executiveSummary}
        </p>
      </div>

      {/* Transparent Rule-Based Priority Scoring Criteria & Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              02. Transparent Rule-Based Priority Scoring Matrix
            </h2>
            <span className="text-xs text-slate-500">
              Deterministic composite formula (0–100 scale)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="font-mono font-bold text-teal-800">40% Weight · Frequency</div>
              <p className="text-slate-600 mt-1">
                Household mention count relative to sample size and top reported concern.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="font-mono font-bold text-teal-800">20% Weight · Village Breadth</div>
              <p className="text-slate-600 mt-1">
                Share of surveyed villages/localities reporting the same underlying problem.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="font-mono font-bold text-teal-800">25% Weight · Civic Urgency</div>
              <p className="text-slate-600 mt-1">
                Essential health, potable water, sanitation, and commuter safety impact weight.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="font-mono font-bold text-teal-800">15% Weight · Local Feasibility</div>
              <p className="text-slate-600 mt-1">
                Practicality of Gram Panchayat / Mandal convergence action in short-to-medium term.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Survey Concern &amp; Category</th>
                <th className="py-3 px-3 text-right">Mentions</th>
                <th className="py-3 px-3 text-right">Freq (40%)</th>
                <th className="py-3 px-3 text-right">Breadth (20%)</th>
                <th className="py-3 px-3 text-right">Urgency (25%)</th>
                <th className="py-3 px-3 text-right">Feasib. (15%)</th>
                <th className="py-3 px-3 text-right">Composite</th>
                <th className="py-3 px-4">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.findings.slice(0, 8).map((f, idx) => (
                <tr key={f.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-900">{f.concernText}</div>
                    <div className="text-[11px] text-slate-500">
                      {f.categoryLabel} · {f.villagesAffected.join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    {f.count} ({f.percentageOfTotal}%)
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {f.frequencyScore}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {f.villageBreadthScore}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {f.urgencyScore}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {f.feasibilityScore}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {f.compositePriorityScore}/100
                  </td>
                  <td className="py-3 px-4">
                    <PriorityIndicator priority={f.priorityLevel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Category Patterns */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            03. Cross-Category Patterns Supported by Survey Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Interconnected infrastructure and service bottlenecks observed in respondent frequencies
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiAnalysis.crossCategoryPatterns.map((pat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-teal-700 font-semibold">
                  Pattern 0{idx + 1}
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {pat.patternTitle}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {pat.evidenceExplanation}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                Linked: {pat.linkedCategories.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Interventions & Suggested Stakeholders */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            04. Practical &amp; Affordable Intervention Recommendations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordered by priority; suggested stakeholders indicate relevant committees for coordination (not official commitment)
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {aiAnalysis.prioritizedInterventions.map((rec) => (
            <div key={rec.urgencyRank} className="p-6 space-y-3 hover:bg-slate-50/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-teal-700">
                    Priority #{rec.urgencyRank}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-medium text-slate-600">{rec.category}</span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Target Horizon: {rec.estimatedTimeframe}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{rec.issueTitle}</h3>

              <div className="text-xs text-slate-600 font-mono bg-slate-50 px-3 py-2 rounded border border-slate-200/80">
                Survey Evidence: {rec.evidenceCitation}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs leading-relaxed">
                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Practical Intervention
                  </div>
                  <p className="text-slate-700">{rec.practicalSolution}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Why This Helps Villagers
                  </div>
                  <p className="text-slate-700">{rec.whyUseful}</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">
                    Suggested Coordination Stakeholder
                  </div>
                  <p className="text-slate-700">{rec.suggestedStakeholder}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Short, Medium, and Long-Term Action Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold text-teal-700">
            0 – 3 Months
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Short-Term Actions (Immediate / Low-Cost)
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            {aiAnalysis.actionRoadmap.shortTerm.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold text-amber-700">
            3 – 12 Months
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Medium-Term Actions (Mandal Convergence)
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            {aiAnalysis.actionRoadmap.mediumTerm.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold text-slate-700">
            1 – 3 Years
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Long-Term Actions (GPDP Capital Works)
          </h3>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
            {aiAnalysis.actionRoadmap.longTerm.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Survey Data Limitations */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">
            05. Methodological Caveats &amp; Survey Data Limitations
          </h2>
        </div>
        <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-5">
          {aiAnalysis.dataLimitations.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
