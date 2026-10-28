import React, { useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  FileSpreadsheet,
  Info,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IssueStatusIndicator, PriorityIndicator } from '../components/SemanticIndicators';
import { mapSurveyCategoryToIssueCategory } from '../constants/categories';
import {
  ImportSummary,
  IssuePrefillDraft,
  PageId,
  PriorityLevel,
  SurveyFinding,
  VillageIssue,
} from '../types';
import { ComputedSurveyAnalytics } from '../utils/analyticsEngine';

interface DashboardViewProps {
  analytics: ComputedSurveyAnalytics;
  importSummary: ImportSummary;
  issues: VillageIssue[];
  hasGeneratedAI: boolean;
  onNavigate: (page: PageId) => void;
  onUploadFile: (file: File) => Promise<void>;
  onPrefillIssueFromFinding: (draft: IssuePrefillDraft) => void;
  onSelectIssueForManagement: (issueId: string) => void;
}

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  Critical: '#DC2626',
  High: '#D97706',
  Medium: '#0D9488',
  Low: '#64748B',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  importSummary,
  issues,
  hasGeneratedAI,
  onNavigate,
  onUploadFile,
  onPrefillIssueFromFinding,
  onSelectIssueForManagement,
}) => {
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const inProgressIssues = issues.filter((i) => i.status === 'In Progress').length;
  const acknowledgedIssues = issues.filter((i) => i.status === 'Acknowledged').length;
  const resolvedIssues = issues.filter((i) => i.status === 'Resolved').length;
  const highPriorityOpenIssues = issues.filter(
    (i) => (i.priority === 'Critical' || i.priority === 'High') && i.status !== 'Resolved'
  ).length;
  const resolutionRate =
    issues.length > 0 ? Math.round((resolvedIssues / issues.length) * 100) : 0;

  const categoryChartData = analytics.categorySummaries.map((cat) => ({
    name: cat.shortLabel,
    fullLabel: cat.categoryLabel,
    Concerns: cat.concernCount,
    Satisfactory: cat.satisfactoryCount,
    concernRate: cat.concernRatePercent,
  }));

  const topResponsesChartData = analytics.findings.slice(0, 7).map((f) => ({
    label: f.concernText.length > 34 ? `${f.concernText.slice(0, 34)}…` : f.concernText,
    fullText: f.concernText,
    category: f.categoryLabel,
    count: f.count,
    percentage: f.percentageOfTotal,
  }));

  const priorityPieData = analytics.priorityDistribution.filter((d) => d.count > 0);

  const workflowSteps: Array<{
    step: string;
    title: string;
    page: PageId;
    done: boolean;
  }> = [
    {
      step: '01',
      title: 'Upload Excel',
      page: 'settings',
      done: !importSummary.isDemo,
    },
    {
      step: '02',
      title: 'Analyze Survey',
      page: 'analytics',
      done: analytics.totalResponses > 0,
    },
    {
      step: '03',
      title: 'AI Recommendations',
      page: 'ai-recommendations',
      done: hasGeneratedAI,
    },
    {
      step: '04',
      title: 'Report Issue',
      page: 'report-issue',
      done: issues.some((i) => i.sourceType !== 'Demo Seed Record'),
    },
    {
      step: '05',
      title: 'Update Status',
      page: 'issues-management',
      done: resolvedIssues > 0 || inProgressIssues > 0,
    },
    {
      step: '06',
      title: 'View Report',
      page: 'reports',
      done: true,
    },
  ];

  const handleLogFinding = (f: SurveyFinding) => {
    onPrefillIssueFromFinding({
      title: f.concernText,
      category: mapSurveyCategoryToIssueCategory(f.categoryKey, f.concernText),
      description: `Consolidated from ${f.count} household survey response(s) (${f.percentageOfTotal}% of respondents) under "${f.categoryLabel}". Affected localities: ${f.villagesAffected.join(', ')}. Suggested initial step: ${f.suggestedAction}`,
      village: f.primaryVillage,
      priority: f.priorityLevel,
    });
  };

  return (
    <div className="space-y-6">
      <input
        ref={uploadRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            await onUploadFile(f);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Page Heading & Dataset Context Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Smart Village Issues Identification &amp; Resolution System
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Village Civic Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Synthesizing household survey evidence to help Gram Panchayat committees prioritize practical community interventions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-4 h-4 text-teal-700" />
            <span>Import Survey Excel</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('report-issue')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Report New Issue</span>
          </button>
        </div>
      </div>

      {/* Dataset Status Notice */}
      {importSummary.isDemo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-950 leading-relaxed">
              <span className="font-semibold">Demo Preview Dataset Active:</span> Currently displaying{' '}
              <span className="font-mono tabular-nums font-semibold">
                {importSummary.validResponsesCount}
              </span>{' '}
              sample household survey records across{' '}
              <span className="font-mono tabular-nums font-semibold">
                {analytics.villages.length}
              </span>{' '}
              villages for live presentation preview. Upload your actual 15-column village survey Excel file to analyze real field responses.
            </div>
          </div>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="px-3.5 py-2 rounded-lg bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
          >
            Upload Actual Excel
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-800 leading-relaxed">
              <span className="font-semibold text-teal-900">Imported Survey Workbook Active:</span>{' '}
              <span className="font-mono">{importSummary.fileName}</span> ·{' '}
              <span className="font-mono tabular-nums font-semibold">
                {importSummary.validResponsesCount}
              </span>{' '}
              valid responses across{' '}
              <span className="font-mono tabular-nums font-semibold">
                {analytics.villages.length}
              </span>{' '}
              locality group(s)
              {importSummary.skippedRowsCount > 0 && (
                <span>
                  {' '}
                  · <span className="font-mono tabular-nums">{importSummary.skippedRowsCount}</span> row(s) skipped
                </span>
              )}
              .
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 rounded-lg border border-teal-300 bg-white text-teal-900 text-xs font-semibold hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
          >
            View Import Log
          </button>
        </div>
      )}

      {/* Guided CSP Presentation Workflow Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-700">
            Guided CSP Presentation Workflow
          </span>
          <span className="text-xs text-slate-500">
            Select any stage to demonstrate end-to-end civic decision support
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {workflowSteps.map((ws) => (
            <button
              key={ws.step}
              type="button"
              onClick={() => onNavigate(ws.page)}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 transition-colors text-left group cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-slate-400 group-hover:text-teal-700">
                  Step {ws.step}
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {ws.title}
                </div>
              </div>
              {ws.done ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Core KPI Strip (Single-Elevation Structured Grid) */}
      <div className="space-y-2">
        <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Survey Responses Imported</div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900">
              {analytics.totalResponses}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {analytics.villages.length} villages · {analytics.surveyors.length} surveyors
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Unique Issues Identified</div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900">
              {analytics.uniqueIssuesCount}
            </div>
            <div className="mt-1.5 text-xs text-slate-500">
              Distinct category-concern topics
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">High-Priority Issues</div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-700">
              {analytics.highPriorityFindingsCount}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              Survey findings · {highPriorityOpenIssues} open field cases
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Issues In Progress</div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-teal-700">
              {inProgressIssues}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {acknowledgedIssues} acknowledged in tracker
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-medium text-slate-500">Issues Resolved</div>
            <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700">
              {resolvedIssues}
            </div>
            <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {resolutionRate}% of {issues.length} tracked issues
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 px-1">
          Metric Definition: <span className="font-medium text-slate-700">Survey Responses</span> count valid household interviews;{' '}
          <span className="font-medium text-slate-700">Unique Issues Identified</span> consolidate identical concern statements per survey category rather than counting each household answer as a separate incident;{' '}
          <span className="font-medium text-slate-700">In Progress &amp; Resolved</span> track administratively logged action records.
        </p>
      </div>

      {/* Charts Row: Category Concerns Bar Chart + Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: Reported Concerns by Survey Category */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reported Concerns Across the 7 Survey Categories
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing household concern mentions against satisfactory/adequate responses
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
                <span>Reported Concerns</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                <span>Satisfactory</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 8, right: 12, left: -12, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                  angle={-14}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `${value} households`,
                    String(name),
                  ]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullLabel || ''
                  }
                />
                <Bar dataKey="Concerns" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Satisfactory" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Priority Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rule-based urgency &amp; frequency classification of {analytics.uniqueIssuesCount} unique findings
            </p>
          </div>

          {priorityPieData.length > 0 ? (
            <div className="h-52 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    dataKey="count"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {priorityPieData.map((entry) => (
                      <Cell
                        key={entry.priority}
                        fill={PRIORITY_COLORS[entry.priority]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      `${value} unique findings`,
                      `${String(name)} Priority`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No concern findings identified in dataset.
            </div>
          )}

          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {analytics.priorityDistribution.map((item) => (
              <div
                key={item.priority}
                className="py-1.5 flex items-center justify-between text-xs"
              >
                <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
                  />
                  <span>{item.priority}</span>
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most Common Individual Survey Responses Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Most Frequent Individual Survey Concern Responses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Top verbatim/normalized concern statements recorded across household interviews
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
          >
            <span>Explore Full Survey Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topResponsesChartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topResponsesChartData}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={230}
                  tick={{ fontSize: 11, fill: '#1E293B' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown, _name: unknown, props: { payload?: { percentage?: number; category?: string } }) => [
                    `${value} households (${props.payload?.percentage ?? 0}%)`,
                    props.payload?.category || 'Survey Category',
                  ]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload?.fullText || ''
                  }
                />
                <Bar dataKey="count" fill="#0F172A" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            No concern statements found in current dataset.
          </div>
        )}
      </div>

      {/* Bottom Split: Most Important Findings Table + Recent Tracked Issues */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Most Important Findings Table */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Top Prioritized Survey Findings
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by frequency, village breadth, civic urgency, and local feasibility
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-recommendations')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
            >
              AI Analysis →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Finding &amp; Category</th>
                  <th className="py-3 px-3">Villages</th>
                  <th className="py-3 px-3 text-right">Mentions</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analytics.findings.slice(0, 6).map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 line-clamp-2">
                        {f.concernText}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {f.categoryLabel} · Score <span className="font-mono tabular-nums">{f.compositePriorityScore}/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate" title={f.villagesAffected.join(', ')}>
                      {f.villagesAffected.join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {f.count} <span className="text-slate-400">({f.percentageOfTotal}%)</span>
                    </td>
                    <td className="py-3 px-3">
                      <PriorityIndicator priority={f.priorityLevel} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleLogFinding(f)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap cursor-pointer"
                      >
                        Log Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Issue Reports & Status Updates */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Issue Reports &amp; Status Updates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Prototype administrative issue tracker activity
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('issues-management')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
            >
              Manage All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {issues.slice(0, 5).map((issue) => {
              const latestUpdate = issue.statusHistory[issue.statusHistory.length - 1];
              return (
                <div
                  key={issue.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        {issue.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{issue.village}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{issue.reportedDate}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                      {issue.title}
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <IssueStatusIndicator status={issue.status} />
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <PriorityIndicator priority={issue.priority} />
                    </div>
                    {latestUpdate && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        Latest: {latestUpdate.note}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectIssueForManagement(issue.id)}
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
