import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  FilterX,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PriorityIndicator } from '../components/SemanticIndicators';
import { SURVEY_CATEGORIES } from '../constants/categories';
import {
  ImportSummary,
  SurveyCategoryKey,
  SurveyRecord,
} from '../types';
import {
  classifySurveyAnswer,
  computeSurveyAnalytics,
} from '../utils/analyticsEngine';
import { exportSanitizedSurveyData } from '../utils/excelParser';

interface SurveyAnalyticsViewProps {
  records: SurveyRecord[];
  importSummary: ImportSummary;
}

type SortField = 'rowNumber' | 'date' | 'surveyor' | 'rollNo' | 'village' | 'age';

export const SurveyAnalyticsView: React.FC<SurveyAnalyticsViewProps> = ({
  records,
  importSummary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedSurveyor, setSelectedSurveyor] = useState('ALL');
  const [selectedRollNo, setSelectedRollNo] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedAgeBand, setSelectedAgeBand] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<'ALL' | SurveyCategoryKey>('ALL');
  const [onlyWithConcernsInCategory, setOnlyWithConcernsInCategory] = useState(false);
  const [anonymizeRespondents, setAnonymizeRespondents] = useState(false);

  const [sortField, setSortField] = useState<SortField>('rowNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Distinct dropdown options derived from actual uploaded dataset
  const filterOptions = useMemo(() => {
    const villages = Array.from(new Set(records.map((r) => r.village))).sort();
    const surveyors = Array.from(new Set(records.map((r) => r.surveyor))).sort();
    const rollNos = Array.from(new Set(records.map((r) => r.rollNo))).sort();
    return { villages, surveyors, rollNos };
  }, [records]);

  // Apply all interactive filters
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return records.filter((r) => {
      if (selectedVillage !== 'ALL' && r.village !== selectedVillage) return false;
      if (selectedSurveyor !== 'ALL' && r.surveyor !== selectedSurveyor) return false;
      if (selectedRollNo !== 'ALL' && r.rollNo !== selectedRollNo) return false;
      if (selectedGender !== 'ALL' && r.gender !== selectedGender) return false;

      if (selectedAgeBand !== 'ALL') {
        if (r.age === null) return false;
        if (selectedAgeBand === '18-30' && (r.age < 18 || r.age > 30)) return false;
        if (selectedAgeBand === '31-45' && (r.age < 31 || r.age > 45)) return false;
        if (selectedAgeBand === '46-60' && (r.age < 46 || r.age > 60)) return false;
        if (selectedAgeBand === '61+' && r.age < 61) return false;
      }

      if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date < dateFrom) {
        return false;
      }
      if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.date > dateTo) {
        return false;
      }

      if (selectedCategoryKey !== 'ALL' && onlyWithConcernsInCategory) {
        const cls = classifySurveyAnswer(selectedCategoryKey, r[selectedCategoryKey]);
        if (cls !== 'concern') return false;
      }

      if (q) {
        if (selectedCategoryKey !== 'ALL') {
          const catMatch = r[selectedCategoryKey].toLowerCase().includes(q);
          const addrMatch = r.address.toLowerCase().includes(q) || r.village.toLowerCase().includes(q);
          if (!catMatch && !addrMatch) return false;
        } else {
          const hay = [
            r.surveyor,
            r.rollNo,
            anonymizeRespondents ? '' : r.respondent,
            r.address,
            r.village,
            r.healthcareFacilities,
            r.educationFacilities,
            r.employmentOpportunities,
            r.transportationFacilities,
            r.internetAndMobileNetwork,
            r.bankingAndAtmFacilities,
            r.villageDevelopmentPriority,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
      }

      return true;
    });
  }, [
    records,
    searchQuery,
    selectedVillage,
    selectedSurveyor,
    selectedRollNo,
    selectedGender,
    selectedAgeBand,
    dateFrom,
    dateTo,
    selectedCategoryKey,
    onlyWithConcernsInCategory,
    anonymizeRespondents,
  ]);

  // Recompute analytics dynamically from the filtered dataset
  const filteredAnalytics = useMemo(
    () => computeSurveyAnalytics(filteredRecords),
    [filteredRecords]
  );

  const sortedRecords = useMemo(() => {
    const copy = [...filteredRecords];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'rowNumber':
          cmp = a.rowNumber - b.rowNumber;
          break;
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'surveyor':
          cmp = a.surveyor.localeCompare(b.surveyor);
          break;
        case 'rollNo':
          cmp = a.rollNo.localeCompare(b.rollNo);
          break;
        case 'village':
          cmp = a.village.localeCompare(b.village);
          break;
        case 'age':
          cmp = (a.age ?? -1) - (b.age ?? -1);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filteredRecords, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = sortedRecords.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedVillage('ALL');
    setSelectedSurveyor('ALL');
    setSelectedRollNo('ALL');
    setSelectedGender('ALL');
    setSelectedAgeBand('ALL');
    setDateFrom('');
    setDateTo('');
    setSelectedCategoryKey('ALL');
    setOnlyWithConcernsInCategory(false);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Focus category for answer frequency breakdown panel
  const activeInspectCategoryKey: SurveyCategoryKey =
    selectedCategoryKey === 'ALL'
      ? SurveyCategoryKey.Healthcare
      : selectedCategoryKey;

  const activeCategorySummary = filteredAnalytics.categorySummaries.find(
    (c) => c.categoryKey === activeInspectCategoryKey
  );

  const categoryChartData = filteredAnalytics.categorySummaries.map((c) => ({
    name: c.shortLabel,
    fullLabel: c.categoryLabel,
    ConcernRate: c.concernRatePercent,
    Concerns: c.concernCount,
    Satisfactory: c.satisfactoryCount,
    Answered: c.answeredCount,
  }));

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            {importSummary.isDemo ? 'Demo Preview Dataset' : `Dataset: ${importSummary.fileName}`}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Village Survey Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Explore response frequencies, percentages, surveyor coverage, and village-level breakdowns across all 7 household survey categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={filteredRecords.length === 0}
            onClick={() => exportSanitizedSurveyData(filteredRecords, 'csv', anonymizeRespondents)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Export Filtered CSV</span>
          </button>
          <button
            type="button"
            disabled={filteredRecords.length === 0}
            onClick={() => exportSanitizedSurveyData(filteredRecords, 'xlsx', anonymizeRespondents)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered Excel</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-800">
            Administrative &amp; Demographic Filters{' '}
            <span className="font-normal text-slate-500 ml-1">
              (Showing <span className="font-mono tabular-nums font-semibold text-slate-800">{filteredRecords.length}</span> of{' '}
              <span className="font-mono tabular-nums">{records.length}</span> responses)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymizeRespondents}
                onChange={(e) => setAnonymizeRespondents(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
              />
              <span>Mask respondent names</span>
            </label>

            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Keyword Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Keyword or Issue Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="e.g., hospital, bus, ATM, water..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Village (from Address) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Village / Locality (Address)
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => {
                setSelectedVillage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Villages ({filterOptions.villages.length})</option>
              {filterOptions.villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Surveyor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Surveyor Name
            </label>
            <select
              value={selectedSurveyor}
              onChange={(e) => {
                setSelectedSurveyor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Surveyors ({filterOptions.surveyors.length})</option>
              {filterOptions.surveyors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Roll Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Surveyor Roll No
            </label>
            <select
              value={selectedRollNo}
              onChange={(e) => {
                setSelectedRollNo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Roll Numbers</option>
              {filterOptions.rollNos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Survey Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Survey Category Focus
            </label>
            <select
              value={selectedCategoryKey}
              onChange={(e) => {
                setSelectedCategoryKey(e.target.value as 'ALL' | SurveyCategoryKey);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All 7 Survey Categories</option>
              {SURVEY_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Respondent Gender
            </label>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Age Group */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Age Group
            </label>
            <select
              value={selectedAgeBand}
              onChange={(e) => {
                setSelectedAgeBand(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="ALL">All Ages</option>
              <option value="18-30">18 – 30 years</option>
              <option value="31-45">31 – 45 years</option>
              <option value="46-60">46 – 60 years</option>
              <option value="61+">61+ years</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
        </div>

        {selectedCategoryKey !== 'ALL' && (
          <div className="pt-1 flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithConcernsInCategory}
                onChange={(e) => {
                  setOnlyWithConcernsInCategory(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
              />
              <span>Show only households reporting an actionable concern in selected category</span>
            </label>
          </div>
        )}
      </div>

      {/* Category Statistics Overview Strip */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Total Responses &amp; Percentage Breakdown by Survey Category
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any category row to inspect its exact individual survey answers on the right
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Filtered Sample: N = {filteredRecords.length}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left: Dynamic Category Chart + Summary Table */}
          <div className="lg:col-span-7 p-5 space-y-5">
            <div className="h-60 w-full">
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
                    height={46}
                  />
                  <YAxis
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown, _name: unknown, props: { payload?: { Concerns?: number; Answered?: number } }) => [
                      `${value}% (${props.payload?.Concerns ?? 0} of ${props.payload?.Answered ?? 0} answered)`,
                      'Concern Rate',
                    ]}
                    labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullLabel || ''}
                  />
                  <Bar dataKey="ConcernRate" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto border-t border-slate-100 pt-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 pr-3">Survey Category</th>
                    <th className="py-2 px-2 text-right">Answered</th>
                    <th className="py-2 px-2 text-right">Concerns</th>
                    <th className="py-2 px-2 text-right">Satisfactory</th>
                    <th className="py-2 pl-2 text-right">Concern %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnalytics.categorySummaries.map((cat) => {
                    const isFocused = activeInspectCategoryKey === cat.categoryKey;
                    return (
                      <tr
                        key={cat.categoryKey}
                        onClick={() => setSelectedCategoryKey(cat.categoryKey)}
                        className={`cursor-pointer transition-colors ${
                          isFocused ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 pr-3 text-slate-900">{cat.categoryLabel}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                          {cat.answeredCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-teal-800">
                          {cat.concernCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-500">
                          {cat.satisfactoryCount}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-900">
                          {cat.concernRatePercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Individual Answer Frequency Breakdown for Focused Category */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-[11px] font-medium text-teal-700">
                    Individual Answer Frequency Breakdown
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeCategorySummary?.categoryLabel}
                  </h3>
                </div>
                <select
                  value={activeInspectCategoryKey}
                  onChange={(e) => setSelectedCategoryKey(e.target.value as SurveyCategoryKey)}
                  aria-label="Choose category to inspect individual answers"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {SURVEY_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              {activeCategorySummary && activeCategorySummary.answerBreakdown.length > 0 ? (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {activeCategorySummary.answerBreakdown.map((ans) => (
                    <div key={ans.answer} className="space-y-1">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <span className="text-slate-800 leading-snug">
                          {ans.answer}
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            · {ans.classification === 'concern' ? 'Concern' : 'Satisfactory'}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap shrink-0">
                          {ans.count} ({ans.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ans.classification === 'concern' ? 'bg-teal-600' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.max(4, ans.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No recorded answers match the active filter criteria.
                </div>
              )}
            </div>

            {activeCategorySummary && activeCategorySummary.unansweredCount > 0 && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono tabular-nums">
                Unanswered / blank cells in this category: {activeCategorySummary.unansweredCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 Frequently Reported Concerns in Filtered Dataset */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Top 5 Frequently Reported Concerns (Filtered View)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Highest-frequency household concerns within the currently selected filters
          </p>
        </div>

        {filteredAnalytics.findings.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {[...filteredAnalytics.findings]
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item, idx) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">
                      0{idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.concernText}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.categoryLabel} · Villages: {item.villagesAffected.join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 pl-7 sm:pl-0">
                    <PriorityIndicator priority={item.priorityLevel} />
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-900">
                      {item.count} responses ({item.percentageOfTotal}%)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No reported concerns match your current filters.
          </div>
        )}
      </div>

      {/* Searchable & Sortable Survey Responses Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Household Survey Responses Register
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Respondent phone numbers (Phno) are automatically stripped and never displayed.</span>
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Page {safePage} of {totalPages}
          </div>
        </div>

        {paginatedRecords.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('rowNumber')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <span>Row</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('surveyor')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <span>Surveyor &amp; Roll No</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">Respondent &amp; Demographics</th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('village')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <span>Village &amp; Address</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort('date')}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <span>Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 min-w-[160px]">Healthcare</th>
                    <th className="py-3 px-3 min-w-[160px]">Education</th>
                    <th className="py-3 px-3 min-w-[160px]">Employment</th>
                    <th className="py-3 px-3 min-w-[160px]">Transportation</th>
                    <th className="py-3 px-3 min-w-[150px]">Internet &amp; Mobile</th>
                    <th className="py-3 px-3 min-w-[150px]">Banking &amp; ATM</th>
                    <th className="py-3 px-3 min-w-[180px]">Development Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {paginatedRecords.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-500">
                        #{row.rowNumber}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{row.surveyor}</div>
                        <div className="text-[11px] font-mono text-slate-500">{row.rollNo}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {anonymizeRespondents
                            ? `Household #${(safePage - 1) * pageSize + idx + 1}`
                            : row.respondent}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {row.gender} · {row.age !== null ? `${row.age} yrs` : 'Age N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-teal-800">{row.village}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2" title={row.address}>
                          {row.address}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{row.healthcareFacilities || '—'}</td>
                      <td className="py-3 px-3 text-slate-700">{row.educationFacilities || '—'}</td>
                      <td className="py-3 px-3 text-slate-700">{row.employmentOpportunities || '—'}</td>
                      <td className="py-3 px-3 text-slate-700">{row.transportationFacilities || '—'}</td>
                      <td className="py-3 px-3 text-slate-700">{row.internetAndMobileNetwork || '—'}</td>
                      <td className="py-3 px-3 text-slate-700">{row.bankingAndAtmFacilities || '—'}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {row.villageDevelopmentPriority || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
              <div className="text-xs text-slate-600 tabular-nums">
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, sortedRecords.length)} of {sortedRecords.length} filtered rows
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-14 px-4 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              No survey responses match your selected filters
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try broadening your village, surveyor, age, or keyword filters to inspect household responses.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
