import {
  getSuggestedActionForConcern,
  SURVEY_CATEGORIES,
} from '../constants/categories';
import {
  AIAnalysisResult,
  CategoryAnalyticsSummary,
  DevelopmentPlanItem,
  PriorityLevel,
  ResponseClassification,
  SurveyCategoryKey,
  SurveyFinding,
  SurveyRecord,
} from '../types';

const POSITIVE_EXACT_SET = new Set([
  'good',
  'very good',
  'excellent',
  'satisfactory',
  'satisfied',
  'available',
  'adequate',
  'sufficient',
  'yes',
  'ok',
  'okay',
  'fine',
  'normal',
  'well maintained',
  'working',
  'working well',
  'regular',
  'proper',
  'none',
  'no issue',
  'no issues',
  'no problem',
  'no problems',
  'nil',
  'nothing',
  'all good',
  'accessible',
  'fast',
  'strong signal',
  'good network',
  'good connectivity',
]);

const NEGATION_MARKERS = [
  'not ',
  'no ',
  'never',
  'poor',
  'bad',
  'worst',
  'lack',
  'absent',
  'unavailable',
  'insufficient',
  'inadequate',
  'irregular',
  'weak',
  'slow',
  'damaged',
  'broken',
  'far',
  'distant',
  'shortage',
  'scarcity',
  'problem',
  'issue',
  'need',
  'require',
  'urgent',
  'without',
  'low',
  'less',
  'unemployed',
  'limited',
  'delayed',
  'only primary',
  'only 1',
  'km away',
];

export function classifySurveyAnswer(
  categoryKey: SurveyCategoryKey,
  rawValue: string
): ResponseClassification {
  const cleaned = rawValue.trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') {
    return 'unanswered';
  }

  const lower = cleaned.toLowerCase().replace(/[.!?]+$/g, '').trim();
  if (lower === 'na' || lower === 'n/a' || lower === 'not applicable' || lower === 'not answered') {
    return 'unanswered';
  }

  // For "Village Development Priority", substantive answers express a priority need unless explicitly "none/nil"
  if (categoryKey === SurveyCategoryKey.DevelopmentPriority) {
    if (
      lower === 'none' ||
      lower === 'nil' ||
      lower === 'nothing' ||
      lower === 'no issue' ||
      lower === 'no issues' ||
      lower === 'all good' ||
      lower === 'satisfied'
    ) {
      return 'satisfactory';
    }
    return 'concern';
  }

  // Check if any negation/problem marker appears first so "Not good" or "Not available" is never treated as positive
  if (NEGATION_MARKERS.some((marker) => lower.includes(marker))) {
    return 'concern';
  }

  if (POSITIVE_EXACT_SET.has(lower)) {
    return 'satisfactory';
  }

  // Phrases like "Good hospital available" or "Adequate school facility" without negation
  if (
    /^(good|very good|satisfactory|adequate|available|regular|sufficient|proper|accessible)\b/.test(lower) &&
    !lower.includes('but') &&
    !lower.includes('except') &&
    !lower.includes('however')
  ) {
    return 'satisfactory';
  }

  return 'concern';
}

function normalizeAnswerGroupKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!;:,]+$/g, '');
}

function computeKeywordUrgencyBoost(text: string, baseWeight: number): number {
  const lower = text.toLowerCase();
  let boost = 0;
  if (
    lower.includes('emergency') ||
    lower.includes('ambulance') ||
    lower.includes('drinking water') ||
    lower.includes('hospital') ||
    lower.includes('doctor') ||
    lower.includes('sewage') ||
    lower.includes('flood')
  ) {
    boost += 8;
  } else if (
    lower.includes('road') ||
    lower.includes('drainage') ||
    lower.includes('bus') ||
    lower.includes('high school') ||
    lower.includes('unemploy') ||
    lower.includes('atm')
  ) {
    boost += 4;
  }
  return Math.min(100, baseWeight + boost);
}

export function scoreToPriorityLevel(score: number): PriorityLevel {
  if (score >= 75) return 'Critical';
  if (score >= 62) return 'High';
  if (score >= 48) return 'Medium';
  return 'Low';
}

export interface ComputedSurveyAnalytics {
  totalResponses: number;
  villages: string[];
  surveyors: string[];
  rollNumbers: string[];
  dateSpanLabel: string;
  uniqueIssuesCount: number;
  highPriorityFindingsCount: number;
  categorySummaries: CategoryAnalyticsSummary[];
  findings: SurveyFinding[];
  priorityDistribution: Array<{
    priority: PriorityLevel;
    count: number;
    percentage: number;
  }>;
}

export function computeSurveyAnalytics(records: SurveyRecord[]): ComputedSurveyAnalytics {
  const totalResponses = records.length;
  const villagesSet = new Set<string>();
  const surveyorsSet = new Set<string>();
  const rollSet = new Set<string>();
  const validDates: string[] = [];

  for (const r of records) {
    if (r.village) villagesSet.add(r.village);
    if (r.surveyor) surveyorsSet.add(r.surveyor);
    if (r.rollNo && r.rollNo !== 'Unspecified') rollSet.add(r.rollNo);
    if (/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      validDates.push(r.date);
    }
  }

  validDates.sort();
  const dateSpanLabel =
    validDates.length > 0
      ? validDates[0] === validDates[validDates.length - 1]
        ? validDates[0]
        : `${validDates[0]} to ${validDates[validDates.length - 1]}`
      : 'Dates not specified';

  const totalVillagesCount = Math.max(1, villagesSet.size);
  const categorySummaries: CategoryAnalyticsSummary[] = [];
  const rawFindingsList: Array<{
    categoryKey: SurveyCategoryKey;
    categoryLabel: string;
    urgencyWeight: number;
    feasibilityWeight: number;
    displayAnswer: string;
    normalizedKey: string;
    count: number;
    answeredInCategory: number;
    villagesMap: Map<string, number>;
  }> = [];

  for (const meta of SURVEY_CATEGORIES) {
    let answeredCount = 0;
    let unansweredCount = 0;
    let concernCount = 0;
    let satisfactoryCount = 0;

    const answerBuckets = new Map<
      string,
      {
        display: string;
        classification: ResponseClassification;
        count: number;
        villagesMap: Map<string, number>;
      }
    >();

    for (const row of records) {
      const rawVal = row[meta.key] || '';
      const classification = classifySurveyAnswer(meta.key, rawVal);

      if (classification === 'unanswered') {
        unansweredCount += 1;
        continue;
      }

      answeredCount += 1;
      if (classification === 'concern') {
        concernCount += 1;
      } else {
        satisfactoryCount += 1;
      }

      const normKey = normalizeAnswerGroupKey(rawVal);
      const existing = answerBuckets.get(normKey);
      if (existing) {
        existing.count += 1;
        existing.villagesMap.set(row.village, (existing.villagesMap.get(row.village) || 0) + 1);
      } else {
        const vMap = new Map<string, number>();
        vMap.set(row.village, 1);
        answerBuckets.set(normKey, {
          display: rawVal.trim(),
          classification,
          count: 1,
          villagesMap: vMap,
        });
      }
    }

    const answerBreakdown = Array.from(answerBuckets.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        answer: item.display,
        classification: item.classification,
        count: item.count,
        percentage: answeredCount > 0 ? Number(((item.count / answeredCount) * 100).toFixed(1)) : 0,
      }));

    let uniqueConcernsCount = 0;
    for (const [normKey, bucket] of answerBuckets.entries()) {
      if (bucket.classification === 'concern') {
        uniqueConcernsCount += 1;
        rawFindingsList.push({
          categoryKey: meta.key,
          categoryLabel: meta.label,
          urgencyWeight: meta.urgencyWeight,
          feasibilityWeight: meta.feasibilityWeight,
          displayAnswer: bucket.display,
          normalizedKey: normKey,
          count: bucket.count,
          answeredInCategory: answeredCount,
          villagesMap: bucket.villagesMap,
        });
      }
    }

    categorySummaries.push({
      categoryKey: meta.key,
      categoryLabel: meta.label,
      shortLabel: meta.shortLabel,
      totalResponses,
      answeredCount,
      unansweredCount,
      concernCount,
      satisfactoryCount,
      concernRatePercent: answeredCount > 0 ? Number(((concernCount / answeredCount) * 100).toFixed(1)) : 0,
      uniqueConcernsCount,
      answerBreakdown,
    });
  }

  // Max frequency across individual concerns to normalize frequency score smoothly while anchoring to overall respondent share
  const maxConcernMentions = Math.max(1, ...rawFindingsList.map((f) => f.count));

  const findings: SurveyFinding[] = rawFindingsList
    .map((item, idx) => {
      const percentageOfTotal =
        totalResponses > 0 ? Number(((item.count / totalResponses) * 100).toFixed(1)) : 0;
      const percentageOfCategory =
        item.answeredInCategory > 0
          ? Number(((item.count / item.answeredInCategory) * 100).toFixed(1))
          : 0;

      // Sort affected villages by mention count descending
      const sortedVillages = Array.from(item.villagesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([v]) => v);

      // Transparent rule-based priority scoring (0 to 100):
      // 40% Frequency (blend of relative max frequency and absolute share)
      const relativeFreq = (item.count / maxConcernMentions) * 70 + Math.min(30, percentageOfTotal * 1.2);
      const frequencyScore = Math.min(100, Math.round(relativeFreq));

      // 20% Village Breadth
      const villageBreadthScore = Math.min(
        100,
        Math.round((sortedVillages.length / totalVillagesCount) * 100)
      );

      // 25% Civic Urgency
      const urgencyScore = computeKeywordUrgencyBoost(item.displayAnswer, item.urgencyWeight);

      // 15% Panchayat Action Feasibility
      const feasibilityScore = item.feasibilityWeight;

      const compositePriorityScore = Math.round(
        0.4 * frequencyScore +
          0.2 * villageBreadthScore +
          0.25 * urgencyScore +
          0.15 * feasibilityScore
      );

      const priorityLevel = scoreToPriorityLevel(compositePriorityScore);
      const actionTemplate = getSuggestedActionForConcern(item.categoryKey, item.displayAnswer);

      return {
        id: `FND-${idx + 1}`,
        categoryKey: item.categoryKey,
        categoryLabel: item.categoryLabel,
        concernText: item.displayAnswer,
        normalizedKey: item.normalizedKey,
        count: item.count,
        percentageOfTotal,
        percentageOfCategory,
        villagesAffected: sortedVillages,
        primaryVillage: sortedVillages[0] || 'Unspecified Locality',
        frequencyScore,
        villageBreadthScore,
        urgencyScore,
        feasibilityScore,
        compositePriorityScore,
        priorityLevel,
        suggestedAction: actionTemplate.action,
        suggestedStakeholder: actionTemplate.stakeholder,
      };
    })
    .sort((a, b) => {
      if (b.compositePriorityScore !== a.compositePriorityScore) {
        return b.compositePriorityScore - a.compositePriorityScore;
      }
      return b.count - a.count;
    });

  const priorityCounts: Record<PriorityLevel, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  for (const f of findings) {
    priorityCounts[f.priorityLevel] += 1;
  }

  const totalUniqueFindings = findings.length;
  const priorityDistribution: Array<{
    priority: PriorityLevel;
    count: number;
    percentage: number;
  }> = (['Critical', 'High', 'Medium', 'Low'] as PriorityLevel[]).map((priority) => ({
    priority,
    count: priorityCounts[priority],
    percentage:
      totalUniqueFindings > 0
        ? Number(((priorityCounts[priority] / totalUniqueFindings) * 100).toFixed(1))
        : 0,
  }));

  return {
    totalResponses,
    villages: Array.from(villagesSet).sort(),
    surveyors: Array.from(surveyorsSet).sort(),
    rollNumbers: Array.from(rollSet).sort(),
    dateSpanLabel,
    uniqueIssuesCount: totalUniqueFindings,
    highPriorityFindingsCount: priorityCounts.Critical + priorityCounts.High,
    categorySummaries,
    findings,
    priorityDistribution,
  };
}

/**
 * Deterministic local analysis built strictly from actual imported response frequencies
 * when live Gemini API is unavailable or unconfigured.
 */
export function buildLocalFallbackAIAnalysis(
  analytics: ComputedSurveyAnalytics,
  isDemo: boolean,
  fallbackReason?: string
): AIAnalysisResult {
  const sortedCategories = [...analytics.categorySummaries].sort(
    (a, b) => b.concernCount - a.concernCount
  );
  const topCat1 = sortedCategories[0];
  const topCat2 = sortedCategories[1];
  const topFindings = analytics.findings.slice(0, 6);

  const executiveSummary =
    analytics.totalResponses === 0
      ? 'No survey responses are currently loaded for analysis.'
      : `Across ${analytics.totalResponses} household survey responses covering ${analytics.villages.length} locality/village group(s) (${analytics.villages.slice(0, 4).join(', ')}${analytics.villages.length > 4 ? ', etc.' : ''}), ${analytics.uniqueIssuesCount} distinct community concerns were consolidated. The highest volume of reported concerns appears in ${topCat1?.categoryLabel || 'primary services'} (${topCat1?.concernCount || 0} mentions, ${topCat1?.concernRatePercent || 0}% of answered households)${topCat2 ? ` followed by ${topCat2.categoryLabel} (${topCat2.concernCount} mentions, ${topCat2.concernRatePercent}%)` : ''}.`;

  const crossCategoryPatterns: AIAnalysisResult['crossCategoryPatterns'] = [];

  const transportCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Transportation
  );
  const healthCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Healthcare
  );
  const eduCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Education
  );
  const empCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Employment
  );
  const netCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Internet
  );
  const bankCat = analytics.categorySummaries.find(
    (c) => c.categoryKey === SurveyCategoryKey.Banking
  );

  if (transportCat && healthCat && transportCat.concernRatePercent >= 35 && healthCat.concernRatePercent >= 35) {
    crossCategoryPatterns.push({
      patternTitle: 'Mobility & Primary Healthcare Access Overlap',
      evidenceExplanation: `${healthCat.concernRatePercent}% of respondents reported healthcare gaps alongside ${transportCat.concernRatePercent}% reporting transportation constraints, indicating that irregular road/bus connectivity compounds delays in reaching Mandal clinics or hospitals.`,
      linkedCategories: ['Healthcare Facilities', 'Transportation Facilities'],
    });
  }

  if (eduCat && empCat && (eduCat.concernCount > 0 || empCat.concernCount > 0)) {
    crossCategoryPatterns.push({
      patternTitle: 'Youth Education-to-Livelihood Transition Gap',
      evidenceExplanation: `Survey responses record ${eduCat.concernCount} education facility concerns and ${empCat.concernCount} employment opportunity concerns across surveyed households, pointing to demand for local skill training and commuter support to higher institutions.`,
      linkedCategories: ['Education Facilities', 'Employment Opportunities'],
    });
  }

  if (netCat && bankCat && (netCat.concernCount > 0 || bankCat.concernCount > 0)) {
    crossCategoryPatterns.push({
      patternTitle: 'Last-Mile Digital & Financial Inclusion Dependency',
      evidenceExplanation: `${netCat.concernCount} households cited internet/mobile network limitations while ${bankCat.concernCount} cited banking/ATM access gaps; weak mobile signal directly affects UPI, DBT verification, and Banking Correspondent micro-ATM reliability.`,
      linkedCategories: ['Internet and Mobile Network', 'Banking and ATM Facilities'],
    });
  }

  if (crossCategoryPatterns.length === 0 && topCat1) {
    crossCategoryPatterns.push({
      patternTitle: `Concentrated Priority in ${topCat1.categoryLabel}`,
      evidenceExplanation: `Household responses show primary concentration in ${topCat1.categoryLabel} (${topCat1.concernCount} of ${topCat1.answeredCount} answered rows), warranting targeted Gram Sabha verification.`,
      linkedCategories: [topCat1.categoryLabel],
    });
  }

  const prioritizedInterventions = topFindings.map((f, index) => {
    const template = getSuggestedActionForConcern(f.categoryKey, f.concernText);
    return {
      issueTitle: f.concernText,
      category: f.categoryLabel,
      urgencyRank: index + 1,
      evidenceCitation: `Reported by ${f.count} household(s) (${f.percentageOfTotal}% of survey sample) across ${f.villagesAffected.join(', ')}; Rule-Based Priority Score: ${f.compositePriorityScore}/100 (${f.priorityLevel}).`,
      practicalSolution: template.action,
      whyUseful: `${template.outcome} Addresses a top-ranked recurring concern directly evidenced in household interviews without requiring prohibitive capital expenditure initially.`,
      suggestedStakeholder: `${template.stakeholder} (Suggested coordination body — subject to official review)`,
      estimatedTimeframe: template.timeline,
    };
  });

  return {
    source: 'local-fallback',
    generatedAt: new Date().toISOString(),
    fallbackReason,
    datasetSignature: `${isDemo ? 'demo' : 'custom'}-${analytics.totalResponses}-${analytics.uniqueIssuesCount}`,
    executiveSummary,
    crossCategoryPatterns,
    prioritizedInterventions,
    actionRoadmap: {
      shortTerm: [
        'Present top survey findings and ward-wise counts at the upcoming Gram Sabha meeting for field verification.',
        'Organize zero/low-cost coordination drives: mobile PHC medical camp schedule, sanitation desilting, and Banking Correspondent fixed-day desk.',
        'Submit formal commuter count representations to the local RTC depot and telecom service providers for signal/bus halt improvements.',
      ],
      mediumTerm: [
        'Prepare engineering cost estimates under 15th Finance Commission / MGNREGS convergence for priority drainage, water pipeline, and approach road repairs.',
        'Establish a Panchayat Secretariat Digital & Skill Facilitation corner utilizing BharatNet connectivity for students and job-seekers.',
        'Track acknowledged village issues monthly with citizen verification updates.',
      ],
      longTerm: [
        'Propose structural capital works (all-weather CC/BT road stretches, permanent sub-centre upgrade, overhead water storage) in the annual Gram Panchayat Development Plan (GPDP).',
        'Conduct follow-up household re-survey after 6–12 months to measure service delivery improvements.',
      ],
    },
    dataLimitations: [
      `Sample Coverage: Findings reflect ${analytics.totalResponses} surveyed household(s) across ${analytics.villages.length} locality group(s) and may not capture every hamlet unless full census sampling was performed.`,
      'Self-Reported Perceptions: Responses represent household perceptions recorded during interviews and require technical inspection by Panchayat engineering/health staff before budget sanction.',
      'Consolidated Grouping: Similar free-text responses are grouped by normalized phrasing; reviewing raw category tables is recommended before finalizing engineering tenders.',
      isDemo
        ? 'Demo Dataset Active: Currently analyzing the built-in CSP preview dataset. Upload your actual village Excel workbook to generate findings for your surveyed village.'
        : 'Privacy Redaction Active: Personal phone numbers and respondent names were excluded from automated analysis.',
    ],
  };
}

export function generateDraftDevelopmentPlanFromFindings(
  findings: SurveyFinding[]
): DevelopmentPlanItem[] {
  return findings.slice(0, 6).map((f, idx) => {
    const template = getSuggestedActionForConcern(f.categoryKey, f.concernText);
    return {
      id: `PLAN-DRAFT-${Date.now()}-${idx + 1}`,
      identifiedIssue: `${f.concernText} (${f.categoryLabel})`,
      category: f.categoryLabel,
      targetVillages: f.villagesAffected.slice(0, 3).join(', '),
      proposedSolution: template.action,
      priority: f.priorityLevel,
      suggestedDepartment: template.stakeholder,
      estimatedCostRange: template.costRange,
      suggestedTimeline: template.timeline,
      progressStatus: idx < 2 ? 'Draft Prioritized' : 'Proposed',
      expectedOutcome: template.outcome,
      evidenceNote: `Based on ${f.count} household survey responses (${f.percentageOfTotal}% of sample)`,
      isAutoGeneratedDraft: true,
    };
  });
}
