import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  MinusCircle,
} from 'lucide-react';
import { IssueStatus, PlanProgressStatus, PriorityLevel } from '../types';

export const PriorityIndicator: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-red-600" aria-hidden="true" />
          <span>Critical</span>
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>High</span>
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 whitespace-nowrap">
          <MinusCircle className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden="true" />
          <span>Medium</span>
        </span>
      );
    case 'Low':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <ArrowDownCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>Low</span>
        </span>
      );
  }
};

export const IssueStatusIndicator: React.FC<{ status: IssueStatus }> = ({ status }) => {
  switch (status) {
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Resolved</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden="true" />
          <span>In Progress</span>
        </span>
      );
    case 'Acknowledged':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Eye className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>Acknowledged</span>
        </span>
      );
    case 'Reported':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <FileWarning className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Reported</span>
        </span>
      );
  }
};

export const PlanStatusIndicator: React.FC<{ status: PlanProgressStatus }> = ({ status }) => {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Completed</span>
        </span>
      );
    case 'In Implementation':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden="true" />
          <span>In Implementation</span>
        </span>
      );
    case 'Draft Prioritized':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          <span>Draft Prioritized</span>
        </span>
      );
    case 'Under Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <Eye className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span>Under Review</span>
        </span>
      );
    case 'Proposed':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <MinusCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>Proposed</span>
        </span>
      );
  }
};
