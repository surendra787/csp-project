import React, { useRef, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Compass,
  Database,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Upload,
  X,
} from 'lucide-react';
import { ImportSummary, PageId } from '../types';

interface AppShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  importSummary: ImportSummary;
  onQuickUploadFile: (file: File) => Promise<void>;
  isUploading: boolean;
  issuesOpenCount: number;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: PageId;
  label: string;
  shortBreadcrumb: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', shortBreadcrumb: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Village Survey Analytics', shortBreadcrumb: 'Village Survey Analytics', icon: BarChart3 },
  { id: 'report-issue', label: 'Report an Issue', shortBreadcrumb: 'Report Village Issue', icon: FilePlus2 },
  { id: 'issues-management', label: 'Issues Management', shortBreadcrumb: 'Issues Management', icon: ClipboardList },
  { id: 'ai-recommendations', label: 'AI Recommendations', shortBreadcrumb: 'AI Recommendations', icon: Lightbulb },
  { id: 'development-plan', label: 'Village Development Plan', shortBreadcrumb: 'Village Development Plan', icon: Compass },
  { id: 'reports', label: 'Reports', shortBreadcrumb: 'Consolidated Reports', icon: FileText },
  { id: 'settings', label: 'Settings / Data Import', shortBreadcrumb: 'Settings & Data Import', icon: Database },
];

/**
 * Original non-governmental civic geometric mark inspired by Indian rural community crossroads & lotus petals.
 */
const CivicGeometricMark: React.FC = () => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-9 h-9 shrink-0"
    aria-hidden="true"
  >
    <rect width="36" height="36" rx="8" fill="#0D9488" />
    <circle cx="18" cy="18" r="10.5" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.85" />
    <path
      d="M18 9.5C20.2 12.6 20.2 15.4 18 18C15.8 15.4 15.8 12.6 18 9.5Z"
      fill="#F59E0B"
    />
    <path
      d="M18 26.5C20.2 23.4 20.2 20.6 18 18C15.8 20.6 15.8 23.4 18 26.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M9.5 18C12.6 15.8 15.4 15.8 18 18C15.4 20.2 12.6 20.2 9.5 18Z"
      fill="#FFFFFF"
    />
    <path
      d="M26.5 18C23.4 15.8 20.6 15.8 18 18C20.6 20.2 23.4 20.2 26.5 18Z"
      fill="#FFFFFF"
    />
    <circle cx="18" cy="18" r="2.2" fill="#0F172A" />
  </svg>
);

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  importSummary,
  onQuickUploadFile,
  isUploading,
  issuesOpenCount,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeNavMeta = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onQuickUploadFile(file);
      e.target.value = '';
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Brand Identity */}
      <div className="px-5 py-5 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            onNavigate('dashboard');
            setMobileNavOpen(false);
          }}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg w-full"
        >
          <CivicGeometricMark />
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white truncate">
              Gram Samasya AI
            </div>
            <div className="text-[11px] leading-snug text-slate-400 line-clamp-2">
              Smart Village Issues Identification &amp; Resolution
            </div>
          </div>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileNavOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'issues-management' && issuesOpenCount > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums shrink-0 ${
                    isActive ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  {issuesOpenCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Summary Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2.5">
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <div className="font-medium text-slate-200 truncate">
            {importSummary.isDemo ? 'Demo Preview Dataset' : importSummary.fileName}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-400">
            {importSummary.validResponsesCount} responses · {importSummary.isDemo ? 'Sample' : 'Uploaded'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate('settings');
            setMobileNavOpen(false);
          }}
          className="w-full py-2 px-3 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors text-center whitespace-nowrap"
        >
          Manage Survey Dataset
        </button>
        <p className="text-[10px] leading-normal text-slate-500">
          Academic CSP Prototype · Not affiliated with an official government portal.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Hidden global Excel upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload village survey Excel or CSV workbook"
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 no-print sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/60 transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 flex flex-col">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-3 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Bar Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="font-display font-semibold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap hidden sm:inline"
              >
                Gram Samasya AI
              </button>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {activeNavMeta.shortBreadcrumb}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>{isUploading ? 'Importing...' : 'Upload Excel'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('report-issue')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5 shrink-0" />
              <span>Report Issue</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Quiet Academic Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 no-print">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              Gram Samasya AI · Community Service Project (CSP) Civic Analytics Prototype
            </div>
            <div>
              Privacy Safeguard Active: Respondent phone numbers are excluded from dashboards, exports, and AI prompts.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
