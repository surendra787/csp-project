import React from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  IssueStatusIndicator,
  PlanStatusIndicator,
  PriorityIndicator,
} from '../components/SemanticIndicators';
import {
  AIAnalysisResult,
  DevelopmentPlanItem,
  ImportSummary,
  SurveyRecord,
  VillageIssue,
} from '../types';
import { ComputedSurveyAnalytics } from '../utils/analyticsEngine';
import {
  exportConsolidatedReportCsv,
  exportSanitizedSurveyData,
} from '../utils/excelParser';

interface ReportsViewProps {
  records: SurveyRecord[];
  analytics: ComputedSurveyAnalytics;
  importSummary: ImportSummary;
  issues: VillageIssue[];
  aiAnalysis: AIAnalysisResult;
  planItems: DevelopmentPlanItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  records,
  analytics,
  importSummary,
  issues,
  aiAnalysis,
  planItems,
}) => {
  const handlePrintPdf = () => {
    window.print();
  };

  const issueStatusCounts = {
    Reported: issues.filter((i) => i.status === 'Reported').length,
    Acknowledged: issues.filter((i) => i.status === 'Acknowledged').length,
    'In Progress': issues.filter((i) => i.status === 'In Progress').length,
    Resolved: issues.filter((i) => i.status === 'Resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Screen Toolbar (Hidden when printing PDF) */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 no-print">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Exportable CSP Documentation &amp; Faculty Presentation Dossier
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Consolidated Village Assessment Report
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Complete statistical summary of survey findings, priority rankings, AI recommendations, issue resolution tracking, and draft development proposals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              exportConsolidatedReportCsv({
                summary: importSummary,
                categories: analytics.categorySummaries,
                findings: analytics.findings,
                issues,
                planItems,
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Export Report (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => exportSanitizedSurveyData(records, 'xlsx', true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
            <span>Survey Data (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportSanitizedSurveyData(records, 'csv', true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Survey Data (.csv)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8">
        {/* Report Title Block */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-700">
              Gram Samasya AI · Community Service Project (CSP) Assessment Report
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Smart Village Issues Identification &amp; Resolution Dossier
            </h2>
            <p className="text-xs text-slate-500">
              Dataset Source: <span className="font-semibold text-slate-700">{importSummary.isDemo ? 'Demo Preview Dataset (Sample)' : importSummary.fileName}</span> · Date Span: {analytics.dateSpanLabel}
            </p>
          </div>
          <div className="text-xs text-slate-500 sm:text-right font-mono tabular-nums space-y-0.5 shrink-0">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div>Sample Size: N = {analytics.totalResponses}</div>
            <div>Villages: {analytics.villages.length}</div>
          </div>
        </div>

        {/* Section 1: Survey Overview */}
        <section className="space-y-3 print-break-inside-avoid">
          <h3 className="text-sm font-bold text-slate-900">
            01. Household Survey Overview &amp; Coverage
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <div className="text-slate-500">Imported Households</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                {analytics.totalResponses}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Villages / Localities</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                {analytics.villages.length}
              </div>
              <div className="text-[11px] text-slate-500 truncate" title={analytics.villages.join(', ')}>
                {analytics.villages.join(', ')}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Unique Issues Consolidated</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                {analytics.uniqueIssuesCount}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Surveyors Involved</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-slate-900">
                {analytics.surveyors.length}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>
              Privacy Compliance: Personal respondent phone numbers (Phno) and identifiable contact details are omitted from all public report views and exports.
            </span>
          </p>
        </section>

        {/* Section 2: Category-Wise Statistics */}
        <section className="space-y-3 print-break-inside-avoid">
          <h3 className="text-sm font-bold text-slate-900">
            02. Category-Wise Survey Statistics (All 7 Survey Categories)
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Survey Category</th>
                  <th className="py-2.5 px-3 text-right">Answered Rows</th>
                  <th className="py-2.5 px-3 text-right">Concern Mentions</th>
                  <th className="py-2.5 px-3 text-right">Satisfactory</th>
                  <th className="py-2.5 px-3 text-right">Concern Rate</th>
                  <th className="py-2.5 px-3 text-right">Unique Concerns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.categorySummaries.map((cat) => (
                  <tr key={cat.categoryKey}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{cat.categoryLabel}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {cat.answeredCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-teal-800 font-semibold">
                      {cat.concernCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {cat.satisfactoryCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {cat.concernRatePercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {cat.uniqueConcernsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Most Common Concerns & Priority-Wise Distribution */}
        <section className="space-y-3 print-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              03. Most Common Concerns &amp; Priority Distribution
            </h3>
            <div className="text-xs text-slate-600 font-mono tabular-nums">
              {analytics.priorityDistribution.map((d) => `${d.priority}: ${d.count}`).join(' · ')}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Reported Concern</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Villages Affected</th>
                  <th className="py-2.5 px-3 text-right">Frequency</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.findings.slice(0, 10).map((f, idx) => (
                  <tr key={f.id}>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.concernText}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.categoryLabel}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.villagesAffected.join(', ')}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {f.count} ({f.percentageOfTotal}%)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {f.compositePriorityScore}/100
                    </td>
                    <td className="py-2.5 px-3">
                      <PriorityIndicator priority={f.priorityLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: AI & Evidence-Based Recommendations */}
        <section className="space-y-3 print-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              04. Strategic Recommendations ({aiAnalysis.source === 'gemini' ? 'Gemini AI + Rule Engine' : 'Rule-Based Frequency Engine'})
            </h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            {aiAnalysis.executiveSummary}
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {aiAnalysis.prioritizedInterventions.slice(0, 5).map((rec) => (
              <div key={rec.urgencyRank} className="p-3.5 text-xs space-y-1">
                <div className="font-semibold text-slate-900">
                  #{rec.urgencyRank} {rec.issueTitle}{' '}
                  <span className="font-normal text-slate-500">· {rec.category} · {rec.estimatedTimeframe}</span>
                </div>
                <p className="text-slate-700">{rec.practicalSolution}</p>
                <div className="text-[11px] text-slate-500">
                  Suggested Coordination: {rec.suggestedStakeholder}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Current Issue-Resolution Status */}
        <section className="space-y-3 print-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              05. Current Issue-Resolution Tracker Summary
            </h3>
            <div className="text-xs font-mono tabular-nums text-slate-600">
              Reported: {issueStatusCounts.Reported} · Acknowledged: {issueStatusCounts.Acknowledged} · In Progress: {issueStatusCounts['In Progress']} · Resolved: {issueStatusCounts.Resolved}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Issue Title</th>
                  <th className="py-2.5 px-3">Village</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{issue.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{issue.title}</td>
                    <td className="py-2.5 px-3 text-slate-600">{issue.village}</td>
                    <td className="py-2.5 px-3">
                      <PriorityIndicator priority={issue.priority} />
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{issue.reportedDate}</td>
                    <td className="py-2.5 px-3">
                      <IssueStatusIndicator status={issue.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6: Draft Village Development Action Plan */}
        <section className="space-y-3 print-break-inside-avoid">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              06. Draft Village Development Action Plan (Proposals Requiring Verification)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Note: Cost ranges are illustrative estimates for academic CSP planning and subject to official Panchayat engineering sanction.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Identified Issue</th>
                  <th className="py-2.5 px-3">Proposed Solution</th>
                  <th className="py-2.5 px-3">Suggested Department</th>
                  <th className="py-2.5 px-3">Illustrative Cost</th>
                  <th className="py-2.5 px-3">Timeline</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {planItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div>{item.identifiedIssue}</div>
                      <div className="text-[11px] text-slate-500">{item.targetVillages}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs">{item.proposedSolution}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.suggestedDepartment}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {item.estimatedCostRange}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.suggestedTimeline}</td>
                    <td className="py-2.5 px-3">
                      <PlanStatusIndicator status={item.progressStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
