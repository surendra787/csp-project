import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AppShell } from './components/AppShell';
import {
  DEMO_DEVELOPMENT_PLAN,
  DEMO_IMPORT_SUMMARY,
  DEMO_INITIAL_ISSUES,
  DEMO_SURVEY_RECORDS,
} from './data/demoData';
import {
  AIAnalysisResult,
  DevelopmentPlanItem,
  ImportSummary,
  IssuePrefillDraft,
  IssueStatus,
  PageId,
  SurveyRecord,
  VillageIssue,
} from './types';
import {
  buildLocalFallbackAIAnalysis,
  computeSurveyAnalytics,
  generateDraftDevelopmentPlanFromFindings,
} from './utils/analyticsEngine';
import { parseSurveyWorkbook } from './utils/excelParser';
import { AIRecommendationsView } from './views/AIRecommendationsView';
import { DashboardView } from './views/DashboardView';
import { DataImportView } from './views/DataImportView';
import { DevelopmentPlanView } from './views/DevelopmentPlanView';
import { IssuesManagementView } from './views/IssuesManagementView';
import { ReportIssueView } from './views/ReportIssueView';
import { ReportsView } from './views/ReportsView';
import { SurveyAnalyticsView } from './views/SurveyAnalyticsView';

const STORAGE_KEYS = {
  SURVEY_RECORDS: 'gram_samasya_survey_records_v1',
  IMPORT_SUMMARY: 'gram_samasya_import_summary_v1',
  ISSUES: 'gram_samasya_issues_v1',
  DEV_PLAN: 'gram_samasya_dev_plan_v1',
  AI_CACHE: 'gram_samasya_ai_analysis_v1',
};

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function formatAuditTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  const [surveyRecords, setSurveyRecords] = useState<SurveyRecord[]>(() =>
    readLocalJson<SurveyRecord[]>(STORAGE_KEYS.SURVEY_RECORDS, DEMO_SURVEY_RECORDS)
  );

  const [importSummary, setImportSummary] = useState<ImportSummary>(() =>
    readLocalJson<ImportSummary>(STORAGE_KEYS.IMPORT_SUMMARY, DEMO_IMPORT_SUMMARY)
  );

  const [issues, setIssues] = useState<VillageIssue[]>(() =>
    readLocalJson<VillageIssue[]>(STORAGE_KEYS.ISSUES, DEMO_INITIAL_ISSUES)
  );

  const [planItems, setPlanItems] = useState<DevelopmentPlanItem[]>(() =>
    readLocalJson<DevelopmentPlanItem[]>(STORAGE_KEYS.DEV_PLAN, DEMO_DEVELOPMENT_PLAN)
  );

  const [cachedAIAnalysis, setCachedAIAnalysis] = useState<AIAnalysisResult | null>(() =>
    readLocalJson<AIAnalysisResult | null>(STORAGE_KEYS.AI_CACHE, null)
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [issuePrefillDraft, setIssuePrefillDraft] = useState<IssuePrefillDraft | null>(null);
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);

  // Persist changes locally
  useEffect(() => {
    writeLocalJson(STORAGE_KEYS.SURVEY_RECORDS, surveyRecords);
  }, [surveyRecords]);

  useEffect(() => {
    writeLocalJson(STORAGE_KEYS.IMPORT_SUMMARY, importSummary);
  }, [importSummary]);

  useEffect(() => {
    writeLocalJson(STORAGE_KEYS.ISSUES, issues);
  }, [issues]);

  useEffect(() => {
    writeLocalJson(STORAGE_KEYS.DEV_PLAN, planItems);
  }, [planItems]);

  useEffect(() => {
    if (cachedAIAnalysis) {
      writeLocalJson(STORAGE_KEYS.AI_CACHE, cachedAIAnalysis);
    }
  }, [cachedAIAnalysis]);

  // Automatically compute all metrics, frequencies, and rule-based priority scores from current dataset
  const analytics = useMemo(
    () => computeSurveyAnalytics(surveyRecords),
    [surveyRecords]
  );

  const currentDatasetSignature = `${importSummary.isDemo ? 'demo' : 'custom'}-${analytics.totalResponses}-${analytics.uniqueIssuesCount}`;

  // Ensure AI Recommendations & Reports always match the currently imported dataset
  const activeAIAnalysis = useMemo<AIAnalysisResult>(() => {
    if (cachedAIAnalysis && cachedAIAnalysis.datasetSignature === currentDatasetSignature) {
      return cachedAIAnalysis;
    }
    return buildLocalFallbackAIAnalysis(analytics, importSummary.isDemo);
  }, [cachedAIAnalysis, currentDatasetSignature, analytics, importSummary.isDemo]);

  const handleUploadSurveyFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setGlobalNotice(null);

    try {
      const { records, summary } = await parseSurveyWorkbook(file);
      setSurveyRecords(records);
      setImportSummary(summary);
      setCachedAIAnalysis(null);

      // Update auto-generated draft development plan items from the new survey findings while preserving manual items
      const newAnalytics = computeSurveyAnalytics(records);
      const freshDrafts = generateDraftDevelopmentPlanFromFindings(newAnalytics.findings);
      setPlanItems((prev) => {
        const manualItems = prev.filter((item) => !item.isAutoGeneratedDraft);
        return [...manualItems, ...freshDrafts];
      });

      setGlobalNotice({
        type: 'success',
        message: `Imported ${summary.validResponsesCount} survey response(s) from “${summary.fileName}” (${summary.skippedRowsCount} skipped, ${summary.redactedPhoneCount} phone number(s) privacy-redacted).`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to parse spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.';
      setUploadError(msg);
      setGlobalNotice({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRestoreDemoDataset = useCallback(() => {
    setSurveyRecords(DEMO_SURVEY_RECORDS);
    setImportSummary(DEMO_IMPORT_SUMMARY);
    setCachedAIAnalysis(null);
    setUploadError(null);
    setGlobalNotice({
      type: 'success',
      message: 'Switched back to the built-in CSP Demo Preview Dataset.',
    });
  }, []);

  const handleResetAllPrototypeData = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
    setSurveyRecords(DEMO_SURVEY_RECORDS);
    setImportSummary(DEMO_IMPORT_SUMMARY);
    setIssues(DEMO_INITIAL_ISSUES);
    setPlanItems(DEMO_DEVELOPMENT_PLAN);
    setCachedAIAnalysis(null);
    setUploadError(null);
    setGlobalNotice(null);
  }, []);

  const handleCreateIssue = useCallback(
    (
      newIssueInput: Omit<VillageIssue, 'id' | 'statusHistory'> & {
        initialNote?: string;
      }
    ): VillageIssue => {
      const maxNumericId = issues.reduce((acc, item) => {
        const match = item.id.match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : 100;
        return Math.max(acc, num);
      }, 100);

      const nextId = `GSA-${maxNumericId + 1}`;
      const created: VillageIssue = {
        id: nextId,
        title: newIssueInput.title,
        category: newIssueInput.category,
        description: newIssueInput.description,
        village: newIssueInput.village,
        landmark: newIssueInput.landmark,
        priority: newIssueInput.priority,
        photoDataUrl: newIssueInput.photoDataUrl,
        photoName: newIssueInput.photoName,
        reportedDate: newIssueInput.reportedDate,
        status: newIssueInput.status,
        suggestedAction: newIssueInput.suggestedAction,
        sourceType: newIssueInput.sourceType,
        statusHistory: [
          {
            id: `H-${nextId}-1`,
            fromStatus: null,
            toStatus: newIssueInput.status,
            changedAt: formatAuditTimestamp(),
            note:
              newIssueInput.initialNote ||
              'Prototype issue record created.',
          },
        ],
      };

      setIssues((prev) => [created, ...prev]);
      return created;
    },
    [issues]
  );

  const handleUpdateIssueStatus = useCallback(
    (issueId: string, nextStatus: IssueStatus, note: string) => {
      setIssues((prev) =>
        prev.map((issue) => {
          if (issue.id !== issueId || issue.status === nextStatus) {
            return issue;
          }
          return {
            ...issue,
            status: nextStatus,
            statusHistory: [
              ...issue.statusHistory,
              {
                id: `H-${issue.id}-${issue.statusHistory.length + 1}`,
                fromStatus: issue.status,
                toStatus: nextStatus,
                changedAt: formatAuditTimestamp(),
                note,
              },
            ],
          };
        })
      );
    },
    []
  );

  const handleAddIssueToDevelopmentPlan = useCallback((issue: VillageIssue) => {
    const newItem: DevelopmentPlanItem = {
      id: `PLAN-${Date.now()}`,
      identifiedIssue: `${issue.title} (${issue.id})`,
      category: issue.category,
      targetVillages: issue.village,
      proposedSolution: issue.suggestedAction,
      priority: issue.priority,
      suggestedDepartment: 'Gram Panchayat Standing Committee & Sectoral Liaison',
      estimatedCostRange: '₹40,000 – ₹1,50,000 (Illustrative)',
      suggestedTimeline: 'Short-to-Medium Term (1–4 Months)',
      progressStatus: 'Proposed',
      expectedOutcome: `Resolution of reported ${issue.category.toLowerCase()} concern in ${issue.village}.`,
      evidenceNote: `Promoted from Tracked Issue ${issue.id}`,
      isAutoGeneratedDraft: false,
    };
    setPlanItems((prev) => [newItem, ...prev]);
  }, []);

  const handleGenerateDraftPlanFromSurvey = useCallback(() => {
    const drafts = generateDraftDevelopmentPlanFromFindings(analytics.findings);
    setPlanItems((prev) => {
      const manual = prev.filter((item) => !item.isAutoGeneratedDraft);
      return [...manual, ...drafts];
    });
    setGlobalNotice({
      type: 'success',
      message: `Generated ${drafts.length} draft village development proposals from top survey findings.`,
    });
  }, [analytics.findings]);

  const issuesOpenCount = useMemo(
    () => issues.filter((i) => i.status !== 'Resolved').length,
    [issues]
  );

  return (
    <AppShell
      activePage={activePage}
      onNavigate={(page) => {
        setActivePage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      importSummary={importSummary}
      onQuickUploadFile={handleUploadSurveyFile}
      isUploading={isUploading}
      issuesOpenCount={issuesOpenCount}
    >
      {/* Global Import / Action Notification Banner */}
      {globalNotice && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 flex items-start justify-between gap-3 text-xs no-print ${
            globalNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
              : 'border-red-200 bg-red-50/80 text-red-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {globalNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{globalNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalNotice(null)}
            className="p-1 rounded hover:bg-black/5 text-current shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activePage === 'dashboard' && (
        <DashboardView
          analytics={analytics}
          importSummary={importSummary}
          issues={issues}
          hasGeneratedAI={cachedAIAnalysis !== null}
          onNavigate={setActivePage}
          onUploadFile={handleUploadSurveyFile}
          onPrefillIssueFromFinding={(draft) => {
            setIssuePrefillDraft(draft);
            setActivePage('report-issue');
          }}
          onSelectIssueForManagement={(issueId) => {
            setFocusedIssueId(issueId);
            setActivePage('issues-management');
          }}
        />
      )}

      {activePage === 'analytics' && (
        <SurveyAnalyticsView
          records={surveyRecords}
          importSummary={importSummary}
        />
      )}

      {activePage === 'report-issue' && (
        <ReportIssueView
          knownVillages={analytics.villages}
          prefillDraft={issuePrefillDraft}
          onClearPrefill={() => setIssuePrefillDraft(null)}
          onCreateIssue={handleCreateIssue}
          recentIssues={issues}
          onNavigate={setActivePage}
          onOpenIssueDetail={(issueId) => {
            setFocusedIssueId(issueId);
            setActivePage('issues-management');
          }}
        />
      )}

      {activePage === 'issues-management' && (
        <IssuesManagementView
          issues={issues}
          focusedIssueId={focusedIssueId}
          onClearFocusedIssue={() => setFocusedIssueId(null)}
          onUpdateIssueStatus={handleUpdateIssueStatus}
          onAddIssueToDevelopmentPlan={handleAddIssueToDevelopmentPlan}
          onNavigate={setActivePage}
        />
      )}

      {activePage === 'ai-recommendations' && (
        <AIRecommendationsView
          analytics={analytics}
          importSummary={importSummary}
          aiAnalysis={activeAIAnalysis}
          onSaveAIAnalysis={(res) => setCachedAIAnalysis(res)}
          onGenerateDraftPlanFromSurvey={handleGenerateDraftPlanFromSurvey}
          onNavigate={setActivePage}
        />
      )}

      {activePage === 'development-plan' && (
        <DevelopmentPlanView
          planItems={planItems}
          onAddPlanItem={(item) =>
            setPlanItems((prev) => [
              { ...item, id: `PLAN-${Date.now()}` },
              ...prev,
            ])
          }
          onUpdatePlanItem={(updated) =>
            setPlanItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            )
          }
          onDeletePlanItem={(id) =>
            setPlanItems((prev) => prev.filter((item) => item.id !== id))
          }
          onRegenerateDraftFromSurvey={handleGenerateDraftPlanFromSurvey}
        />
      )}

      {activePage === 'reports' && (
        <ReportsView
          records={surveyRecords}
          analytics={analytics}
          importSummary={importSummary}
          issues={issues}
          aiAnalysis={activeAIAnalysis}
          planItems={planItems}
        />
      )}

      {activePage === 'settings' && (
        <DataImportView
          importSummary={importSummary}
          onUploadFile={handleUploadSurveyFile}
          isUploading={isUploading}
          uploadError={uploadError}
          onRestoreDemoDataset={handleRestoreDemoDataset}
          onResetAllPrototypeData={handleResetAllPrototypeData}
          onNavigate={setActivePage}
        />
      )}
    </AppShell>
  );
}
