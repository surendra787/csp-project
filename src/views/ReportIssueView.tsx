import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Info,
  Trash2,
} from 'lucide-react';
import { IssueStatusIndicator, PriorityIndicator } from '../components/SemanticIndicators';
import { ISSUE_CATEGORIES, PRIORITY_LEVELS } from '../constants/categories';
import {
  IssueCategory,
  IssuePrefillDraft,
  IssueStatus,
  PageId,
  PriorityLevel,
  VillageIssue,
} from '../types';

interface ReportIssueViewProps {
  knownVillages: string[];
  prefillDraft: IssuePrefillDraft | null;
  onClearPrefill: () => void;
  onCreateIssue: (newIssue: Omit<VillageIssue, 'id' | 'statusHistory'> & { initialNote?: string }) => VillageIssue;
  recentIssues: VillageIssue[];
  onNavigate: (page: PageId) => void;
  onOpenIssueDetail: (issueId: string) => void;
}

const DEFAULT_SUGGESTIONS_BY_CATEGORY: Record<IssueCategory, string> = {
  Healthcare:
    'Coordinate with Mandal PHC Medical Officer and Village Health Committee for fixed-day OPD camp and essential medicine stock verification.',
  Education:
    'Schedule School Management Committee (SMC) inspection and coordinate infrastructure or safe student transport arrangements.',
  Employment:
    'Link eligible households with MGNREGS work calendar and Mandal youth skill development / SHG livelihood programs.',
  'Roads and Transportation':
    'Inspect damaged stretch / transit halt with Panchayat Raj Engineering staff and submit RTC depot commuter schedule representation.',
  'Water Supply':
    'Dispatch RWS & Panchayat waterman to inspect pipeline pressure, repair leaks, and verify overhead tank chlorination.',
  'Sanitation and Drainage':
    'Schedule immediate lane desilting, clear greywater blockages, and assign regular ward waste collection.',
  'Electricity and Streetlights':
    'Log pole number in Panchayat streetlight maintenance register and coordinate LED fixture/feeder repair with DISCOM lineman.',
  'Internet Connectivity':
    'Verify BharatNet Gram Panchayat Wi-Fi terminal uptime and submit signal dead-zone coordinates to telecom service providers.',
  'Banking Access':
    'Coordinate fixed-day Banking Correspondent (BC Sakhi / micro-ATM) service counter at the Panchayat Secretariat.',
  Agriculture:
    'Refer issue to Rythu Bharosa / Village Agriculture Assistant for irrigation channel, soil, or input support verification.',
  'Other Village Development':
    'Place issue before the Gram Sabha standing committee for field verification and GPDP priority listing.',
};

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ReportIssueView: React.FC<ReportIssueViewProps> = ({
  knownVillages,
  prefillDraft,
  onClearPrefill,
  onCreateIssue,
  recentIssues,
  onNavigate,
  onOpenIssueDetail,
}) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Healthcare');
  const [description, setDescription] = useState('');
  const [village, setVillage] = useState(knownVillages[0] || '');
  const [landmark, setLandmark] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [reportedDate, setReportedDate] = useState(todayIso);
  const [status, setStatus] = useState<IssueStatus>('Reported');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoName, setPhotoName] = useState<string | undefined>(undefined);
  const [isDerivedFromSurvey, setIsDerivedFromSurvey] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdIssue, setCreatedIssue] = useState<VillageIssue | null>(null);

  useEffect(() => {
    if (prefillDraft) {
      setTitle(prefillDraft.title);
      setCategory(prefillDraft.category);
      setDescription(prefillDraft.description);
      setVillage(prefillDraft.village);
      setPriority(prefillDraft.priority);
      setIsDerivedFromSurvey(true);
      setCreatedIssue(null);
      setErrorMessage(null);
      onClearPrefill();
    }
  }, [prefillDraft, onClearPrefill]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please attach a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file size must be under 10 MB.');
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setPhotoDataUrl(compressed);
      setPhotoName(file.name);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process attached photo.');
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (title.trim().length < 5) {
      setErrorMessage('Please enter a descriptive issue title (at least 5 characters).');
      return;
    }
    if (!village.trim()) {
      setErrorMessage('Please specify the village or locality name.');
      return;
    }
    if (description.trim().length < 15) {
      setErrorMessage('Please provide a clear description of the village issue (at least 15 characters).');
      return;
    }
    if (!reportedDate) {
      setErrorMessage('Please select a valid reported date.');
      return;
    }

    const saved = onCreateIssue({
      title: title.trim(),
      category,
      description: description.trim(),
      village: village.trim(),
      landmark: landmark.trim() || undefined,
      priority,
      photoDataUrl,
      photoName,
      reportedDate,
      status,
      suggestedAction: DEFAULT_SUGGESTIONS_BY_CATEGORY[category],
      sourceType: isDerivedFromSurvey
        ? 'Derived from Survey'
        : 'Prototype Field Submission',
      initialNote: isDerivedFromSurvey
        ? 'Logged in prototype issue tracker from consolidated survey finding.'
        : 'Submitted via Gram Samasya AI prototype field issue form.',
    });

    setCreatedIssue(saved);
    setTitle('');
    setDescription('');
    setLandmark('');
    setPhotoDataUrl(undefined);
    setPhotoName(undefined);
    setStatus('Reported');
    setIsDerivedFromSurvey(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-teal-700">
          Community Issue Logging &amp; Field Documentation
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
          Report a Village Issue
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Record field observations or escalate high-frequency household survey findings into the action tracker.
        </p>
      </div>

      {/* Prototype Transparency Notice */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-start gap-3">
        <Info className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-900">Prototype Submission Notice:</span> Submissions created here are stored locally in your browser for academic demonstration and administrative workflow tracking. They are labeled as prototype submissions and are not transmitted as official government grievances.
        </p>
      </div>

      {/* Success Banner */}
      {createdIssue && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-0.5">
              <div className="font-semibold">
                Prototype Issue Recorded Successfully — ID:{' '}
                <span className="font-mono">{createdIssue.id}</span>
              </div>
              <div>
                “{createdIssue.title}” in {createdIssue.village} has been added to Issues Management with status{' '}
                <span className="font-semibold">{createdIssue.status}</span>.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenIssueDetail(createdIssue.id)}
            className="px-3.5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
          >
            View in Issues Management
          </button>
        </div>
      )}

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex items-start gap-3" role="alert">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-900">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Village Issue Details
            </h2>
            {isDerivedFromSurvey && (
              <span className="text-xs font-medium text-teal-700">
                Pre-filled from Survey Finding
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Issue Title */}
            <div className="sm:col-span-2">
              <label htmlFor="issue-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Issue Title <span className="text-red-600">*</span>
              </label>
              <input
                id="issue-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Damaged culvert and waterlogging near Panchayat School Road"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="issue-category" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                id="issue-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="issue-priority" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Priority Level <span className="text-red-600">*</span>
              </label>
              <select
                id="issue-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
              >
                {PRIORITY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Village Name */}
            <div>
              <label htmlFor="issue-village" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Village Name <span className="text-red-600">*</span>
              </label>
              <input
                id="issue-village"
                type="text"
                list="known-villages-list"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Select or enter village name"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
              <datalist id="known-villages-list">
                {knownVillages.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            {/* Optional Landmark */}
            <div>
              <label htmlFor="issue-landmark" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Landmark <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="issue-landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Near Ward 3 Overhead Water Tank"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Reported Date */}
            <div>
              <label htmlFor="issue-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reported Date <span className="text-red-600">*</span>
              </label>
              <input
                id="issue-date"
                type="date"
                required
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Initial Status */}
            <div>
              <label htmlFor="issue-status" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Initial Status <span className="text-red-600">*</span>
              </label>
              <select
                id="issue-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Reported">Reported</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label htmlFor="issue-description" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detailed Description <span className="text-red-600">*</span>
              </label>
              <textarea
                id="issue-description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe affected households, duration of the issue, safety or livelihood impact, and field observations..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Optional Photo Attachment */}
            <div className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Field Photo Attachment <span className="font-normal text-slate-400">(Optional)</span>
              </span>
              {!photoDataUrl ? (
                <label className="flex items-center justify-center gap-2.5 px-4 py-5 border border-dashed border-slate-300 rounded-lg bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-medium text-slate-700">
                    Attach field photograph (JPG, PNG, WebP)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photoDataUrl}
                      alt={photoName || 'Attached village issue field photograph'}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 object-cover rounded border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {photoName || 'Field Photo Attached'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Compressed locally for browser persistence
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(undefined);
                      setPhotoName(undefined);
                    }}
                    className="p-2 text-slate-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    aria-label="Remove attached photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Suggested initial action will be automatically attached based on category.
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setDescription('');
                  setLandmark('');
                  setPhotoDataUrl(undefined);
                  setPhotoName(undefined);
                  setErrorMessage(null);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer"
              >
                Save Prototype Issue
              </button>
            </div>
          </div>
        </form>

        {/* Side Column: Recent Prototype Submissions */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Recently Logged Issues
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('issues-management')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentIssues.slice(0, 5).map((issue) => (
              <div key={issue.id} className="p-4 space-y-1.5 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono font-semibold text-slate-700">
                    {issue.id} · {issue.village}
                  </span>
                  <span className="font-mono tabular-nums">{issue.reportedDate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenIssueDetail(issue.id)}
                  className="text-left text-xs font-semibold text-slate-900 hover:text-teal-700 line-clamp-2 cursor-pointer"
                >
                  {issue.title}
                </button>
                <div className="flex items-center justify-between pt-0.5">
                  <IssueStatusIndicator status={issue.status} />
                  <PriorityIndicator priority={issue.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
