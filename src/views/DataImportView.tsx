import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { DEMO_SURVEY_RECORDS } from '../data/demoData';
import { ImportSummary, PageId } from '../types';
import { downloadSampleExcelTemplate } from '../utils/excelParser';

interface DataImportViewProps {
  importSummary: ImportSummary;
  onUploadFile: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
  onRestoreDemoDataset: () => void;
  onResetAllPrototypeData: () => void;
  onNavigate: (page: PageId) => void;
}

export const DataImportView: React.FC<DataImportViewProps> = ({
  importSummary,
  onUploadFile,
  isUploading,
  uploadError,
  onRestoreDemoDataset,
  onResetAllPrototypeData,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetCompletedMessage, setResetCompletedMessage] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onUploadFile(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            Excel / CSV Ingestion · Header Mapping · Privacy Redaction
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Settings &amp; Survey Data Import
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Upload your actual 15-column village household survey workbook (.xlsx, .xls, or .csv). Your original spreadsheet file remains untouched.
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadSampleExcelTemplate(DEMO_SURVEY_RECORDS)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-teal-700" />
          <span>Download Sample 15-Column .xlsx</span>
        </button>
      </div>

      {resetCompletedMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5 flex items-center gap-3 text-xs text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{resetCompletedMessage}</span>
        </div>
      )}

      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3.5 flex items-start gap-3 text-xs text-red-900" role="alert">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Spreadsheet Import Error: </span>
            {uploadError}
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-teal-600 bg-teal-50/40'
            : 'border-slate-300 hover:border-teal-500'
        }`}
      >
        <input
          ref={fileInputRef}
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

        <div className="max-w-lg mx-auto space-y-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {importSummary.isDemo
              ? 'Upload Your Village Household Survey Excel Workbook'
              : 'Replace or Reprocess Active Survey Workbook'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Drag and drop an <span className="font-mono font-semibold">.xlsx</span>,{' '}
            <span className="font-mono font-semibold">.xls</span>, or{' '}
            <span className="font-mono font-semibold">.csv</span> file here, or select a file from your computer. Columns are matched automatically by header name.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Parsing Workbook…' : 'Choose Excel / CSV File'}</span>
            </button>

            {!importSummary.isDemo && (
              <button
                type="button"
                onClick={onRestoreDemoDataset}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Switch Back to Demo Dataset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Import Diagnostics & Privacy Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Dataset Summary & Skipped Rows */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active Dataset Diagnostics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {importSummary.isDemo
                ? 'Built-in CSP sample dataset metrics'
                : `Imported from ${importSummary.fileName} (Sheet: ${importSummary.sheetName})`}
            </p>
          </div>

          <div className="divide-y divide-slate-100 border-t border-b border-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Dataset Mode</span>
              <span className="font-semibold text-slate-900">
                {importSummary.isDemo ? 'Demo Preview Dataset' : 'Uploaded Survey Workbook'}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Total Non-Blank Rows Scanned</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {importSummary.totalRowsScanned}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Successfully Imported Responses</span>
              <span className="font-mono tabular-nums font-bold text-emerald-700">
                {importSummary.validResponsesCount}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Duplicate Rows Skipped</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {importSummary.duplicateRowsCount}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Total Skipped / Invalid Rows</span>
              <span className="font-mono tabular-nums font-semibold text-amber-700">
                {importSummary.skippedRowsCount}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600">Phone Numbers Auto-Redacted</span>
              <span className="font-mono tabular-nums font-semibold text-teal-700">
                {importSummary.redactedPhoneCount}
              </span>
            </div>
          </div>

          {importSummary.skippedDetails.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Skipped Row Log ({importSummary.skippedDetails.length})
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                {importSummary.skippedDetails.map((sk, idx) => (
                  <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                    <span className="font-mono text-amber-800 shrink-0">Row #{sk.rowNumber}</span>
                    <span className="text-slate-600 text-right">{sk.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-slate-800">Data Safety Architecture:</span> Spreadsheet parsing runs 100% locally in your browser. The <span className="font-mono">Phno</span> column is stripped during ingestion and never stored in public views, exports, or AI prompts.
            </p>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Return to Updated Dashboard →
            </button>
          </div>
        </div>

        {/* Right: 15-Column Schema Mapping Verification */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              15-Column Survey Header Mapping Inspector
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifies how your uploaded Excel columns mapped to the 15 expected village survey fields
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Expected Survey Column</th>
                  <th className="py-2.5 px-4">Matched Spreadsheet Header</th>
                  <th className="py-2.5 px-4">Handling Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importSummary.columnMappings.map((col, idx) => (
                  <tr key={col.canonicalField}>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {col.expectedHeader}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {col.matchedHeader || '— Not found in sheet —'}
                    </td>
                    <td className="py-2.5 px-4">
                      {col.status === 'redacted' ? (
                        <span className="inline-flex items-center gap-1.5 text-teal-800 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>Redacted (Privacy Protected)</span>
                        </span>
                      ) : col.status === 'matched' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mapped</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Missing (Defaulted Safely)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Prototype Reset Section with Confirmation Step */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900">
            Reset Demo &amp; Local Prototype Data
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Restores the built-in sample survey dataset, resets all custom reported issues and status changes back to initial demo records, and clears edited development plan items for a fresh presentation run.
          </p>
        </div>

        {!confirmResetOpen ? (
          <button
            type="button"
            onClick={() => {
              setResetCompletedMessage(null);
              setConfirmResetOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Prototype Data</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50/70 shrink-0">
            <span className="text-xs font-semibold text-red-900 mr-1">
              Confirm full reset?
            </span>
            <button
              type="button"
              onClick={() => {
                onResetAllPrototypeData();
                setConfirmResetOpen(false);
                setResetCompletedMessage(
                  'All survey data, issue records, AI analysis, and development plan proposals have been reset to clean demo defaults.'
                );
              }}
              className="px-3 py-1.5 rounded-md bg-red-700 text-white text-xs font-semibold hover:bg-red-800 cursor-pointer"
            >
              Yes, Reset Everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
