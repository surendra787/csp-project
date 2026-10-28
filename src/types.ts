export type PageId =
  | 'dashboard'
  | 'analytics'
  | 'report-issue'
  | 'issues-management'
  | 'ai-recommendations'
  | 'development-plan'
  | 'reports'
  | 'settings';

export enum SurveyCategoryKey {
  Healthcare = 'healthcareFacilities',
  Education = 'educationFacilities',
  Employment = 'employmentOpportunities',
  Transportation = 'transportationFacilities',
  Internet = 'internetAndMobileNetwork',
  Banking = 'bankingAndAtmFacilities',
  DevelopmentPriority = 'villageDevelopmentPriority',
}

export interface SurveyCategoryMeta {
  key: SurveyCategoryKey;
  label: string;
  shortLabel: string;
  expectedHeader: string;
  urgencyWeight: number; // 0 to 100 scale weight for rule-based scoring
  feasibilityWeight: number; // 0 to 100 scale weight for Panchayat-level feasibility
  defaultStakeholder: string;
}

/**
 * Sanitized household survey record.
 * Note: Respondent phone numbers ("Phno") are intentionally excluded and redacted
 * during spreadsheet ingestion so personal phone numbers never enter application state,
 * tables, exports, or AI prompts.
 */
export interface SurveyRecord {
  id: string;
  rowNumber: number;
  surveyor: string;
  rollNo: string;
  respondent: string;
  phoneRedacted: boolean;
  date: string; // Normalized YYYY-MM-DD or 'Not Recorded'
  gender: 'Male' | 'Female' | 'Other' | 'Unspecified';
  age: number | null;
  address: string; // Full cleaned address
  village: string; // Extracted normalized village name from Address
  healthcareFacilities: string;
  educationFacilities: string;
  employmentOpportunities: string;
  transportationFacilities: string;
  internetAndMobileNetwork: string;
  bankingAndAtmFacilities: string;
  villageDevelopmentPriority: string;
}

export interface SkippedRowDetail {
  rowNumber: number;
  reason: string;
}

export interface ColumnMappingResult {
  canonicalField: string;
  expectedHeader: string;
  matchedHeader: string | null;
  status: 'matched' | 'redacted' | 'missing';
}

export interface ImportSummary {
  fileName: string;
  sheetName: string;
  importedAt: string;
  isDemo: boolean;
  totalRowsScanned: number;
  validResponsesCount: number;
  skippedRowsCount: number;
  duplicateRowsCount: number;
  redactedPhoneCount: number;
  skippedDetails: SkippedRowDetail[];
  columnMappings: ColumnMappingResult[];
}

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type IssueStatus = 'Reported' | 'Acknowledged' | 'In Progress' | 'Resolved';

export type IssueCategory =
  | 'Healthcare'
  | 'Education'
  | 'Employment'
  | 'Roads and Transportation'
  | 'Water Supply'
  | 'Sanitation and Drainage'
  | 'Electricity and Streetlights'
  | 'Internet Connectivity'
  | 'Banking Access'
  | 'Agriculture'
  | 'Other Village Development';

export interface IssueStatusHistoryEntry {
  id: string;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus;
  changedAt: string;
  note: string;
}

export interface VillageIssue {
  id: string; // e.g., GSA-101
  title: string;
  category: IssueCategory;
  description: string;
  village: string;
  landmark?: string;
  priority: PriorityLevel;
  photoDataUrl?: string;
  photoName?: string;
  reportedDate: string;
  status: IssueStatus;
  suggestedAction: string;
  sourceType: 'Prototype Field Submission' | 'Derived from Survey' | 'Demo Seed Record';
  statusHistory: IssueStatusHistoryEntry[];
}

export type ResponseClassification = 'concern' | 'satisfactory' | 'unanswered';

export interface SurveyFinding {
  id: string;
  categoryKey: SurveyCategoryKey;
  categoryLabel: string;
  concernText: string;
  normalizedKey: string;
  count: number;
  percentageOfTotal: number;
  percentageOfCategory: number;
  villagesAffected: string[];
  primaryVillage: string;
  // Rule-based transparent scoring breakdown (0-100)
  frequencyScore: number;
  villageBreadthScore: number;
  urgencyScore: number;
  feasibilityScore: number;
  compositePriorityScore: number;
  priorityLevel: PriorityLevel;
  suggestedAction: string;
  suggestedStakeholder: string;
}

export interface CategoryAnalyticsSummary {
  categoryKey: SurveyCategoryKey;
  categoryLabel: string;
  shortLabel: string;
  totalResponses: number;
  answeredCount: number;
  unansweredCount: number;
  concernCount: number;
  satisfactoryCount: number;
  concernRatePercent: number;
  uniqueConcernsCount: number;
  answerBreakdown: Array<{
    answer: string;
    classification: ResponseClassification;
    count: number;
    percentage: number;
  }>;
}

export interface AIAnalysisResult {
  source: 'gemini' | 'local-fallback';
  generatedAt: string;
  fallbackReason?: string;
  datasetSignature: string;
  executiveSummary: string;
  crossCategoryPatterns: Array<{
    patternTitle: string;
    evidenceExplanation: string;
    linkedCategories: string[];
  }>;
  prioritizedInterventions: Array<{
    issueTitle: string;
    category: string;
    urgencyRank: number;
    evidenceCitation: string;
    practicalSolution: string;
    whyUseful: string;
    suggestedStakeholder: string;
    estimatedTimeframe: string;
  }>;
  actionRoadmap: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  dataLimitations: string[];
}

export type PlanProgressStatus =
  | 'Proposed'
  | 'Under Review'
  | 'Draft Prioritized'
  | 'In Implementation'
  | 'Completed';

export interface DevelopmentPlanItem {
  id: string;
  identifiedIssue: string;
  category: string;
  targetVillages: string;
  proposedSolution: string;
  priority: PriorityLevel;
  suggestedDepartment: string;
  estimatedCostRange: string; // Explicitly illustrative
  suggestedTimeline: string;
  progressStatus: PlanProgressStatus;
  expectedOutcome: string;
  evidenceNote?: string;
  isAutoGeneratedDraft: boolean;
}

export interface IssuePrefillDraft {
  title: string;
  category: IssueCategory;
  description: string;
  village: string;
  priority: PriorityLevel;
}
