import * as XLSX from 'xlsx';
import {
  CategoryAnalyticsSummary,
  ColumnMappingResult,
  DevelopmentPlanItem,
  ImportSummary,
  SkippedRowDetail,
  SurveyFinding,
  SurveyRecord,
  VillageIssue,
} from '../types';

interface CanonicalColumnSpec {
  field: string;
  expectedHeader: string;
  isRedacted?: boolean;
  aliases: string[];
}

const CANONICAL_COLUMNS: CanonicalColumnSpec[] = [
  {
    field: 'surveyor',
    expectedHeader: 'Surveyor',
    aliases: ['surveyor', 'surveyorname', 'studentname', 'enumerator', 'collectedby', 'investigator'],
  },
  {
    field: 'rollNo',
    expectedHeader: 'Roll no',
    aliases: ['rollno', 'rollnumber', 'roll', 'regdno', 'regno', 'studentid', 'idnumber', 'htno', 'hallticketno'],
  },
  {
    field: 'respondent',
    expectedHeader: 'Respondent',
    aliases: ['respondent', 'respondentname', 'villagername', 'headname', 'householdhead', 'name', 'citizenname'],
  },
  {
    field: 'phno',
    expectedHeader: 'Phno',
    isRedacted: true,
    aliases: ['phno', 'phoneno', 'phone', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'cell'],
  },
  {
    field: 'date',
    expectedHeader: 'Date',
    aliases: ['date', 'surveydate', 'timestamp', 'dateofsurvey', 'recordeddate'],
  },
  {
    field: 'gender',
    expectedHeader: 'Gender',
    aliases: ['gender', 'sex'],
  },
  {
    field: 'age',
    expectedHeader: 'Age',
    aliases: ['age', 'ageinyears', 'respondentage', 'years'],
  },
  {
    field: 'address',
    expectedHeader: 'Address',
    aliases: ['address', 'village', 'villagename', 'locality', 'habitation', 'ward', 'location', 'doornoandaddress'],
  },
  {
    field: 'healthcareFacilities',
    expectedHeader: 'Healthcare Facilities',
    aliases: ['healthcarefacilities', 'healthcare', 'healthfacilities', 'health', 'medicalfacilities', 'hospitalfacilities'],
  },
  {
    field: 'educationFacilities',
    expectedHeader: 'Education Facilities',
    aliases: ['educationfacilities', 'education', 'schoolfacilities', 'educationalfacilities', 'schools'],
  },
  {
    field: 'employmentOpportunities',
    expectedHeader: 'Employment Opportunities',
    aliases: ['employmentopportunities', 'employment', 'livelihood', 'jobopportunities', 'jobs', 'workopportunities'],
  },
  {
    field: 'transportationFacilities',
    expectedHeader: 'Transportation Facilities',
    aliases: ['transportationfacilities', 'transportation', 'transportfacilities', 'transport', 'roadsandtransport', 'busfacilities'],
  },
  {
    field: 'internetAndMobileNetwork',
    expectedHeader: 'Internet and Mobile Network',
    aliases: [
      'internetandmobilenetwork',
      'internetmobilenetwork',
      'internetconnectivity',
      'internet',
      'mobilenetwork',
      'networkfacilities',
      'telecom',
    ],
  },
  {
    field: 'bankingAndAtmFacilities',
    expectedHeader: 'Banking and ATM Facilities',
    aliases: [
      'bankingandatmfacilities',
      'bankingatmfacilities',
      'bankingfacilities',
      'bankingandatm',
      'bankandatm',
      'banking',
      'atmfacilities',
    ],
  },
  {
    field: 'villageDevelopmentPriority',
    expectedHeader: 'Village Development Priority',
    aliases: [
      'villagedevelopmentpriority',
      'developmentpriority',
      'priority',
      'toppriority',
      'mainissue',
      'majorproblem',
      'urgentneed',
      'villagepriority',
    ],
  },
];

function normalizeHeaderToken(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function cleanText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Extracts a clean village name from free-text household Address values
 * without assuming all respondents come from the same village.
 */
export function extractVillageFromAddress(rawAddress: string): string {
  const cleaned = cleanText(rawAddress);
  if (!cleaned) return 'Unspecified Locality';

  // Split by comma or semicolon if multi-part address (e.g., "D.No 4-12, Main Street, Venkatapuram")
  const parts = cleaned
    .split(/[,;/]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Filter out pure door-number/ward/pin tokens to find the village/locality segment
  const nonDoorParts = parts.filter((part) => {
    const lower = part.toLowerCase();
    if (/^(d\.?\s*no|h\.?\s*no|door|plot|flat|ward\s*\d+|street|st\.?|near|opp\.?)\b/i.test(lower) && parts.length > 1) {
      return false;
    }
    if (/^\d{6}$/.test(part)) return false; // PIN code
    if (/^[\d\-\/]+$/.test(part)) return false;
    return true;
  });

  let candidate = nonDoorParts.length > 0 ? nonDoorParts[nonDoorParts.length - 1] : parts[parts.length - 1];

  // Strip trailing mandal/district/pin suffixes if attached
  candidate = candidate
    .replace(/\b\d{6}\b/g, '')
    .replace(/\b(village|gramam|gp|gram panchayat)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!candidate || candidate.length < 2) {
    return toTitleCase(cleaned);
  }

  return toTitleCase(candidate);
}

function normalizeGender(raw: unknown): 'Male' | 'Female' | 'Other' | 'Unspecified' {
  const val = cleanText(raw).toLowerCase();
  if (!val || val === '-' || val === 'na' || val === 'n/a') return 'Unspecified';
  if (val === 'm' || val === 'male' || val.startsWith('male') || val === 'man' || val === 'boy') return 'Male';
  if (val === 'f' || val === 'female' || val.startsWith('fem') || val === 'woman' || val === 'girl') return 'Female';
  return 'Other';
}

function normalizeAge(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const rounded = Math.round(raw);
    return rounded >= 1 && rounded <= 120 ? rounded : null;
  }
  const match = String(raw).match(/\d+/);
  if (!match) return null;
  const parsed = parseInt(match[0], 10);
  return parsed >= 1 && parsed <= 120 ? parsed : null;
}

function normalizeDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return 'Not Recorded';

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof raw === 'number' && raw > 25000 && raw < 65000) {
    const parsedDate = XLSX.SSF.parse_date_code(raw);
    if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
      return `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
    }
  }

  const text = cleanText(raw);
  if (!text || text === '-' || text.toLowerCase() === 'na' || text.toLowerCase() === 'n/a') {
    return 'Not Recorded';
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY common in India
  const dmyMatch = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const first = parseInt(dmyMatch[1], 10);
    const second = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    // In India DD/MM/YYYY is standard; if second <= 12, treat first as day, unless first > 12 (definitely day) or second > 12 (MM/DD/YYYY)
    let day = first;
    let month = second;
    if (month > 12 && day <= 12) {
      day = second;
      month = first;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Handle YYYY-MM-DD
  const ymdMatch = text.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsedTimestamp = Date.parse(text);
  if (!Number.isNaN(parsedTimestamp)) {
    const dt = new Date(parsedTimestamp);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  return text;
}

export async function parseSurveyWorkbook(file: File): Promise<{
  records: SurveyRecord[];
  summary: ImportSummary;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded file contains no readable worksheets.');
  }

  // Pick the first worksheet that has non-empty data
  let selectedSheetName = workbook.SheetNames[0];
  let matrix: unknown[][] = [];

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    if (rows.length > 1) {
      selectedSheetName = name;
      matrix = rows;
      break;
    }
  }

  if (matrix.length === 0) {
    throw new Error('The selected worksheet is empty. Please upload an Excel or CSV file with survey headers and rows.');
  }

  // Scan the first 10 rows to find the row that best matches the 15 expected survey headers
  let bestHeaderRowIndex = 0;
  let bestMatchScore = -1;

  const maxScan = Math.min(matrix.length, 10);
  for (let r = 0; r < maxScan; r++) {
    const rowCells = matrix[r] || [];
    let score = 0;
    for (const cell of rowCells) {
      const norm = normalizeHeaderToken(cell);
      if (!norm) continue;
      if (CANONICAL_COLUMNS.some((col) => col.aliases.includes(norm) || col.aliases.some((a) => norm.includes(a)))) {
        score += 1;
      }
    }
    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestHeaderRowIndex = r;
    }
  }

  if (bestMatchScore < 2) {
    throw new Error(
      'Could not match village survey column headers. Expected columns such as Surveyor, Roll no, Address, Healthcare Facilities, Education Facilities, and Village Development Priority.'
    );
  }

  const rawHeaders = (matrix[bestHeaderRowIndex] || []).map((h) => cleanText(h));
  const usedColIndices = new Set<number>();
  const fieldToColIndex: Record<string, number> = {};
  const columnMappings: ColumnMappingResult[] = [];

  // Pass 1: exact alias matches
  for (const spec of CANONICAL_COLUMNS) {
    let matchedIdx = -1;
    for (let idx = 0; idx < rawHeaders.length; idx++) {
      if (usedColIndices.has(idx)) continue;
      const norm = normalizeHeaderToken(rawHeaders[idx]);
      if (spec.aliases.includes(norm)) {
        matchedIdx = idx;
        break;
      }
    }
    // Pass 2: substring match if exact alias wasn't found
    if (matchedIdx === -1) {
      for (let idx = 0; idx < rawHeaders.length; idx++) {
        if (usedColIndices.has(idx)) continue;
        const norm = normalizeHeaderToken(rawHeaders[idx]);
        if (!norm) continue;
        if (spec.aliases.some((alias) => alias.length >= 4 && norm.includes(alias))) {
          matchedIdx = idx;
          break;
        }
      }
    }

    if (matchedIdx !== -1) {
      usedColIndices.add(matchedIdx);
      fieldToColIndex[spec.field] = matchedIdx;
      columnMappings.push({
        canonicalField: spec.field,
        expectedHeader: spec.expectedHeader,
        matchedHeader: rawHeaders[matchedIdx],
        status: spec.isRedacted ? 'redacted' : 'matched',
      });
    } else {
      columnMappings.push({
        canonicalField: spec.field,
        expectedHeader: spec.expectedHeader,
        matchedHeader: null,
        status: 'missing',
      });
    }
  }

  const records: SurveyRecord[] = [];
  const skippedDetails: SkippedRowDetail[] = [];
  const seenSignatures = new Set<string>();
  let totalRowsScanned = 0;
  let duplicateRowsCount = 0;
  let redactedPhoneCount = 0;

  const getVal = (row: unknown[], field: string): unknown => {
    const colIdx = fieldToColIndex[field];
    return colIdx !== undefined ? row[colIdx] : '';
  };

  for (let r = bestHeaderRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const excelRowNumber = r + 1;

    // Ignore completely blank trailing rows without cluttering skipped count if every cell is empty
    const hasAnyContent = row.some((cell) => cleanText(cell) !== '');
    if (!hasAnyContent) {
      continue;
    }

    totalRowsScanned += 1;

    const surveyor = cleanText(getVal(row, 'surveyor')) || 'Unassigned Surveyor';
    const rollNo = cleanText(getVal(row, 'rollNo')).toUpperCase() || 'Unspecified';
    const respondent = cleanText(getVal(row, 'respondent')) || `Household #${excelRowNumber}`;
    const rawPhone = cleanText(getVal(row, 'phno'));
    const hasPhone = rawPhone.length > 0 && rawPhone !== '-' && rawPhone.toLowerCase() !== 'na';
    if (hasPhone) {
      redactedPhoneCount += 1;
    }

    const date = normalizeDate(getVal(row, 'date'));
    const gender = normalizeGender(getVal(row, 'gender'));
    const age = normalizeAge(getVal(row, 'age'));
    const address = cleanText(getVal(row, 'address'));

    const healthcareFacilities = cleanText(getVal(row, 'healthcareFacilities'));
    const educationFacilities = cleanText(getVal(row, 'educationFacilities'));
    const employmentOpportunities = cleanText(getVal(row, 'employmentOpportunities'));
    const transportationFacilities = cleanText(getVal(row, 'transportationFacilities'));
    const internetAndMobileNetwork = cleanText(getVal(row, 'internetAndMobileNetwork'));
    const bankingAndAtmFacilities = cleanText(getVal(row, 'bankingAndAtmFacilities'));
    const villageDevelopmentPriority = cleanText(getVal(row, 'villageDevelopmentPriority'));

    const categoryResponses = [
      healthcareFacilities,
      educationFacilities,
      employmentOpportunities,
      transportationFacilities,
      internetAndMobileNetwork,
      bankingAndAtmFacilities,
      villageDevelopmentPriority,
    ];

    const nonEmptyCategories = categoryResponses.filter((val) => val.length > 0 && val !== '-');

    if (nonEmptyCategories.length === 0) {
      skippedDetails.push({
        rowNumber: excelRowNumber,
        reason: 'All 7 village survey category columns were blank or empty.',
      });
      continue;
    }

    // Check if row is an accidental repeated header row inside spreadsheet
    if (
      normalizeHeaderToken(healthcareFacilities) === 'healthcarefacilities' &&
      normalizeHeaderToken(educationFacilities) === 'educationfacilities'
    ) {
      skippedDetails.push({
        rowNumber: excelRowNumber,
        reason: 'Repeated header row detected inside table body.',
      });
      continue;
    }

    // Deduplicate identical household survey rows
    const dedupeSignature = [
      respondent.toLowerCase(),
      address.toLowerCase(),
      rollNo.toLowerCase(),
      ...categoryResponses.map((c) => c.toLowerCase()),
    ].join('|');

    if (seenSignatures.has(dedupeSignature)) {
      duplicateRowsCount += 1;
      skippedDetails.push({
        rowNumber: excelRowNumber,
        reason: 'Duplicate survey response row skipped.',
      });
      continue;
    }
    seenSignatures.add(dedupeSignature);

    const village = extractVillageFromAddress(address);

    records.push({
      id: `SR-${excelRowNumber}-${records.length + 1}`,
      rowNumber: excelRowNumber,
      surveyor,
      rollNo,
      respondent,
      phoneRedacted: hasPhone,
      date,
      gender,
      age,
      address: address || 'Unspecified Locality',
      village,
      healthcareFacilities,
      educationFacilities,
      employmentOpportunities,
      transportationFacilities,
      internetAndMobileNetwork,
      bankingAndAtmFacilities,
      villageDevelopmentPriority,
    });
  }

  if (records.length === 0) {
    throw new Error('No valid household survey rows were found after scanning the spreadsheet.');
  }

  const summary: ImportSummary = {
    fileName: file.name,
    sheetName: selectedSheetName,
    importedAt: new Date().toISOString(),
    isDemo: false,
    totalRowsScanned,
    validResponsesCount: records.length,
    skippedRowsCount: skippedDetails.length,
    duplicateRowsCount,
    redactedPhoneCount,
    skippedDetails,
    columnMappings,
  };

  return { records, summary };
}

/**
 * Exports sanitized survey rows to Excel (.xlsx) or CSV, strictly omitting phone numbers.
 */
export function exportSanitizedSurveyData(
  records: SurveyRecord[],
  format: 'xlsx' | 'csv',
  anonymizeNames = false
): void {
  const exportRows = records.map((r, idx) => ({
    'S.No': idx + 1,
    Surveyor: r.surveyor,
    'Roll no': r.rollNo,
    Respondent: anonymizeNames ? `Respondent #${idx + 1}` : r.respondent,
    'Phone Status': 'Redacted for Privacy',
    Date: r.date,
    Gender: r.gender,
    Age: r.age ?? '',
    Village: r.village,
    Address: r.address,
    'Healthcare Facilities': r.healthcareFacilities,
    'Education Facilities': r.educationFacilities,
    'Employment Opportunities': r.employmentOpportunities,
    'Transportation Facilities': r.transportationFacilities,
    'Internet and Mobile Network': r.internetAndMobileNetwork,
    'Banking and ATM Facilities': r.bankingAndAtmFacilities,
    'Village Development Priority': r.villageDevelopmentPriority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sanitized Survey Data');

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    XLSX.writeFile(workbook, `Gram_Samasya_Survey_Export_${stamp}.xlsx`);
  } else {
    XLSX.writeFile(workbook, `Gram_Samasya_Survey_Export_${stamp}.csv`, { bookType: 'csv' });
  }
}

/**
 * Downloads a realistic 15-column sample Excel workbook matching the exact CSP format
 * so presenters can demonstrate live Excel file upload if needed.
 */
export function downloadSampleExcelTemplate(seedRecords: SurveyRecord[]): void {
  const sampleRows = seedRecords.slice(0, 20).map((r, index) => ({
    Surveyor: r.surveyor,
    'Roll no': r.rollNo,
    Respondent: r.respondent,
    Phno: `9848000${String(100 + index)}`, // Dummy phone number to demonstrate automatic privacy redaction on re-upload
    Date: r.date,
    Gender: r.gender,
    Age: r.age ?? 35,
    Address: r.address,
    'Healthcare Facilities': r.healthcareFacilities,
    'Education Facilities': r.educationFacilities,
    'Employment Opportunities': r.employmentOpportunities,
    'Transportation Facilities': r.transportationFacilities,
    'Internet and Mobile Network': r.internetAndMobileNetwork,
    'Banking and ATM Facilities': r.bankingAndAtmFacilities,
    'Village Development Priority': r.villageDevelopmentPriority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Village Survey');
  XLSX.writeFile(workbook, 'Gram_Samasya_CSP_Survey_Template.xlsx');
}

/**
 * Exports a consolidated CSV report covering overview, category statistics, top findings,
 * tracked issues, and development plan items (zero personal phone numbers).
 */
export function exportConsolidatedReportCsv(params: {
  summary: ImportSummary;
  categories: CategoryAnalyticsSummary[];
  findings: SurveyFinding[];
  issues: VillageIssue[];
  planItems: DevelopmentPlanItem[];
}): void {
  const lines: string[][] = [];
  const esc = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  lines.push(['GRAM SAMASYA AI - CONSOLIDATED VILLAGE ASSESSMENT REPORT']);
  lines.push(['Generated At', new Date().toLocaleString()]);
  lines.push(['Dataset Source', params.summary.isDemo ? 'Demo Preview Dataset' : params.summary.fileName]);
  lines.push(['Valid Household Responses', String(params.summary.validResponsesCount)]);
  lines.push(['Skipped / Duplicate Rows', String(params.summary.skippedRowsCount)]);
  lines.push(['Privacy Safeguard', 'Respondent phone numbers (Phno) strictly excluded']);
  lines.push([]);

  lines.push(['SECTION 1: SURVEY CATEGORY STATISTICS']);
  lines.push(['Category', 'Answered Households', 'Reported Concerns', 'Satisfactory / Adequate', 'Concern Rate (%)', 'Unique Issues']);
  for (const cat of params.categories) {
    lines.push([
      cat.categoryLabel,
      String(cat.answeredCount),
      String(cat.concernCount),
      String(cat.satisfactoryCount),
      `${cat.concernRatePercent}%`,
      String(cat.uniqueConcernsCount),
    ]);
  }
  lines.push([]);

  lines.push(['SECTION 2: TOP PRIORITIZED SURVEY FINDINGS']);
  lines.push(['Rank', 'Category', 'Reported Concern', 'Household Mentions', '% of Respondents', 'Villages Affected', 'Priority Score (0-100)', 'Priority Tier', 'Suggested Action']);
  params.findings.slice(0, 15).forEach((f, idx) => {
    lines.push([
      String(idx + 1),
      f.categoryLabel,
      f.concernText,
      String(f.count),
      `${f.percentageOfTotal}%`,
      f.villagesAffected.join('; '),
      String(f.compositePriorityScore),
      f.priorityLevel,
      f.suggestedAction,
    ]);
  });
  lines.push([]);

  lines.push(['SECTION 3: TRACKED VILLAGE ISSUES STATUS']);
  lines.push(['Issue ID', 'Title', 'Category', 'Village', 'Priority', 'Reported Date', 'Current Status', 'Source']);
  for (const issue of params.issues) {
    lines.push([
      issue.id,
      issue.title,
      issue.category,
      issue.village,
      issue.priority,
      issue.reportedDate,
      issue.status,
      issue.sourceType,
    ]);
  }
  lines.push([]);

  lines.push(['SECTION 4: DRAFT VILLAGE DEVELOPMENT ACTION PLAN (PROPOSALS FOR VERIFICATION)']);
  lines.push(['Identified Issue', 'Target Villages', 'Priority', 'Proposed Solution', 'Suggested Stakeholder', 'Illustrative Cost Estimate', 'Timeline', 'Status']);
  for (const item of params.planItems) {
    lines.push([
      item.identifiedIssue,
      item.targetVillages,
      item.priority,
      item.proposedSolution,
      item.suggestedDepartment,
      item.estimatedCostRange,
      item.suggestedTimeline,
      item.progressStatus,
    ]);
  }

  const csvContent = lines.map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Gram_Samasya_Consolidated_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
