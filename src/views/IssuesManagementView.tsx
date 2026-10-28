import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  FilterX,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { IssueStatusIndicator, PriorityIndicator } from '../components/SemanticIndicators';
import { ISSUE_CATEGORIES, PRIORITY_LEVELS } from '../constants/categories';
import {
  IssueStatus,
  PageId,
  VillageIssue,
} from '../types';

interface IssuesManagementViewProps {
  issues: VillageIssue[];
  focusedIssueId: string | null;
  onClearFocusedIssue: () => void;
  onUpdateIssueStatus: (issueId: string, nextStatus: IssueStatus, note: string) => void;
  onAddIssueToDevelopmentPlan: (issue: VillageIssue) => void;
  onNavigate: (page: PageId) => void;
}

const STATUS_FLOW: IssueStatus[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

function getNextLogicalStatus(current: IssueStatus): IssueStatus | null {
  switch (current) {
    case 'Reported':
      return 'Acknowledged';
    case 'Acknowledged':
      return 'In Progress';
    case 'In Progress':
      return 'Resolved';
    case 'Resolved':
      return null;
  }
}

export const IssuesManagementView: React.FC<IssuesManagementViewProps> = ({
  issues,
  focusedIssueId,
  onClearFocusedIssue,
  onUpdateIssueStatus,
  onAddIssueToDevelopmentPlan,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IssueStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [villageFilter, setVillageFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(focusedIssueId);
  const [statusNote, setStatusNote] = useState('');
  const [planAddedBanner, setPlanAddedBanner] = useState<string | null>(null);

  React.useEffect(() => {
    if (focusedIssueId) {
      setSelectedIssueId(focusedIssueId);
      onClearFocusedIssue();
    }
  }, [focusedIssueId, onClearFocusedIssue]);

  const villagesList = useMemo(
    () => Array.from(new Set(issues.map((i) => i.village))).sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((issue) => {
      if (statusFilter !== 'ALL' && issue.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && issue.category !== categoryFilter) return false;
      if (villageFilter !== 'ALL' && issue.village !== villageFilter) return false;
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) return false;

      if (q) {
        const hay = `${issue.id} ${issue.title} ${issue.description} ${issue.village} ${issue.landmark || ''} ${issue.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, searchQuery, statusFilter, categoryFilter, villageFilter, priorityFilter]);

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<IssueStatus, number> = {
      Reported: 0,
      Acknowledged: 0,
      'In Progress': 0,
      Resolved: 0,
    };
    for (const i of issues) {
      counts[i.status] += 1;
    }
    return counts;
  }, [issues]);

  const handleStatusChange = (issue: VillageIssue, targetStatus: IssueStatus) => {
    const trimmed = statusNote.trim();
    const defaultNote =
      targetStatus === 'Reported' && issue.status === 'Resolved'
        ? 'Reopened resolved issue for additional field follow-up.'
        : `Status updated from ${issue.status} to ${targetStatus}.`;
    onUpdateIssueStatus(issue.id, targetStatus, trimmed || defaultNote);
    setStatusNote('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Administrative Workflow: Reported → Acknowledged → In Progress → Resolved
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Issues Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track village issue resolution progress, record status history timestamps, and reopen cases if needed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('report-issue')}
          className="px-4 py-2.5 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          + Report New Issue
        </button>
      </div>

      {planAddedBanner && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 flex items-center justify-between gap-3 text-xs text-teal-950">
          <span>{planAddedBanner}</span>
          <button
            type="button"
            onClick={() => onNavigate('development-plan')}
            className="font-semibold text-teal-800 hover:underline whitespace-nowrap cursor-pointer"
          >
            Open Development Plan →
          </button>
        </div>
      )}

      {/* Segmented Interactive Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({issues.length})
          </button>
          {STATUS_FLOW.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st} ({statusCounts[st]})
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setCategoryFilter('ALL');
            setVillageFilter('ALL');
            setPriorityFilter('ALL');
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
        >
          <FilterX className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Search & Attribute Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, village, landmark..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by issue category"
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
        >
          <option value="ALL">All Categories</option>
          {ISSUE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={villageFilter}
          onChange={(e) => setVillageFilter(e.target.value)}
          aria-label="Filter by village"
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
        >
          <option value="ALL">All Villages</option>
          {villagesList.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
        >
          <option value="ALL">All Priorities</option>
          {PRIORITY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Issues Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredIssues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                  <th className="py-3 px-4">Issue ID</th>
                  <th className="py-3 px-4 min-w-[220px]">Title &amp; Category</th>
                  <th className="py-3 px-3">Village</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Date Reported</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 min-w-[200px]">Suggested Action</th>
                  <th className="py-3 px-4 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {filteredIssues.map((issue) => {
                  const nextStatus = getNextLogicalStatus(issue.status);
                  return (
                    <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {issue.id}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-2">
                          {issue.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {issue.category} · {issue.sourceType}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                        <div>{issue.village}</div>
                        {issue.landmark && (
                          <div className="text-[11px] font-normal text-slate-500 truncate max-w-[140px]">
                            {issue.landmark}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <PriorityIndicator priority={issue.priority} />
                      </td>
                      <td className="py-3.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {issue.reportedDate}
                      </td>
                      <td className="py-3.5 px-3">
                        <IssueStatusIndicator status={issue.status} />
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">{issue.suggestedAction}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {nextStatus ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(issue, nextStatus)}
                              title={`Advance status to ${nextStatus}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold transition-colors cursor-pointer"
                            >
                              <span>→ {nextStatus}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(issue, 'In Progress')}
                              title="Reopen resolved issue"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedIssueId(issue.id)}
                            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              No tracked issues match the active filters
            </p>
            <p className="text-xs text-slate-500">
              Adjust your search query or status filter, or report a new village issue.
            </p>
          </div>
        )}
      </div>

      {/* Issue Details & Status History Modal */}
      {selectedIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {selectedIssue.id} · {selectedIssue.sourceType}
                </div>
                <h2 id="issue-modal-title" className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssueId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                aria-label="Close issue details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Metadata Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100 text-xs">
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="mt-1">
                    <IssueStatusIndicator status={selectedIssue.status} />
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Priority</div>
                  <div className="mt-1">
                    <PriorityIndicator priority={selectedIssue.priority} />
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Village &amp; Landmark</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {selectedIssue.village}
                    {selectedIssue.landmark ? ` · ${selectedIssue.landmark}` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Reported Date</div>
                  <div className="mt-1 font-mono tabular-nums font-semibold text-slate-900">
                    {selectedIssue.reportedDate}
                  </div>
                </div>
              </div>

              {/* Description & Suggested Action */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Field Description</h3>
                  <p className="text-slate-700">{selectedIssue.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-1">Recommended Administrative Action</h3>
                  <p className="text-slate-700">{selectedIssue.suggestedAction}</p>
                </div>
              </div>

              {/* Attached Photograph if Present */}
              {selectedIssue.photoDataUrl && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-900">Attached Field Photo</h3>
                  <img
                    src={selectedIssue.photoDataUrl}
                    alt={selectedIssue.photoName || selectedIssue.title}
                    referrerPolicy="no-referrer"
                    className="max-h-56 rounded-lg border border-slate-200 object-cover"
                  />
                </div>
              )}

              {/* Administrative Status Control */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900">
                  Update Issue Status (Recorded in Audit History)
                </h3>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional administrative note (e.g., Inspected by Panchayat Secretary, work started)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {STATUS_FLOW.map((st) => {
                    const isCurrent = selectedIssue.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => handleStatusChange(selectedIssue, st)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-900 text-white cursor-default'
                            : 'border border-slate-300 bg-white text-slate-800 hover:bg-teal-50 hover:border-teal-500'
                        }`}
                      >
                        {isCurrent ? `Current: ${st}` : `Mark ${st}`}
                      </button>
                    );
                  })}

                  {selectedIssue.status === 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedIssue, 'Reported')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen Issue</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status History Log */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900">
                  Status History Log ({selectedIssue.statusHistory.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {[...selectedIssue.statusHistory].reverse().map((entry) => (
                    <div key={entry.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="font-semibold text-slate-900">
                          {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `Created as ${entry.toStatus}`}
                        </span>
                        <p className="text-slate-600 mt-0.5">{entry.note}</p>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                        {entry.changedAt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onAddIssueToDevelopmentPlan(selectedIssue);
                    setPlanAddedBanner(`Added “${selectedIssue.title}” as a draft item in the Village Development Plan.`);
                    setSelectedIssueId(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Promote to Village Development Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIssueId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
