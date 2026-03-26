import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, ArrowRight, X, Maximize2, ChevronDown } from 'lucide-react';
import { extractTextFromPDF } from '../services/pdfService';
import {
  cleanImportedText,
  normalizeUrlInput,
  parseProxyEnvelope,
  summarizeUrlImportPreview,
} from '../services/urlImportService';
import type { CleanStats, UrlImportConfidence, UrlImportProfile } from '../services/urlImportService';
import type { ExtractPdfProgressInfo, PdfExtractStage, ProcessingStatus, SourceMeta } from '../types';

interface TextInputProps {
  onStartReading: (
    title: string,
    text: string,
    sourceMeta?: SourceMeta
  ) => void;
  onOpenHelp?: () => void;
  onTryDemo?: (title: string, text: string) => void;
}

type UrlImportState = 'idle' | 'blocked' | 'error';

interface UrlPreviewState {
  title: string;
  sourceUrl: string;
  rawText: string;
  cleanedText: string;
  stats: CleanStats;
  suspiciousTokens: string[];
  titleConfidence: UrlImportConfidence;
  sourceConfidence: UrlImportConfidence;
  titleOrigin: 'page' | 'fallback';
  rawWordCount: number;
  cleanedWordCount: number;
  rawExcerpt: string;
  cleanedExcerpt: string;
  removedLineSamples: string[];
}

const BOT_CHECK_MARKERS = [
  'captcha',
  'verify you are human',
  'verification required',
  'cloudflare',
  'attention required',
  'access denied',
  'just a moment',
  'robot check',
  'security check',
  'challenge',
  'cf-challenge',
];

const MIN_URL_IMPORT_CHARS = 40;
const MIN_CLEANED_NON_WHITESPACE = 140;
const MIN_CLEANED_WORDS = 24;
const URL_IMPORT_PROFILES: Array<{ value: UrlImportProfile; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'forum', label: 'Forum' },
  { value: 'docs', label: 'Docs' },
  { value: 'news', label: 'News/Blog' },
];

const CONFIDENCE_LABELS: Record<UrlImportConfidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const confidenceClasses: Record<UrlImportConfidence, string> = {
  low: 'border-amber-500/30 bg-amber-500/10 text-text-primary',
  medium: 'border-sky-500/30 bg-sky-500/10 text-text-primary',
  high: 'border-emerald-500/30 bg-emerald-500/10 text-text-primary',
};

const isCancelledFileImport = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; code?: string };
  return candidate.name === 'AbortError' || candidate.code === 'CANCELLED';
};

const isLikelyBotCheckResponse = (
  raw: string,
  parsedText: string,
  cleanedText?: string,
  stats?: CleanStats
) => {
  const source = raw.toLowerCase();
  if (BOT_CHECK_MARKERS.some((marker) => source.includes(marker))) return true;
  const compact = parsedText.replace(/\s+/g, '');
  if (compact.length < MIN_URL_IMPORT_CHARS) return true;
  if (!cleanedText) return false;
  const cleanedWords = cleanedText.trim().split(/\s+/).filter(Boolean).length;
  const cleanedCompact = cleanedText.replace(/\s+/g, '');
  if (cleanedCompact.length < MIN_CLEANED_NON_WHITESPACE && cleanedWords < MIN_CLEANED_WORDS) return true;
  if (stats && stats.suspiciousLeftovers >= 6 && cleanedWords < 80) return true;
  return false;
};

export const TextInput: React.FC<TextInputProps> = ({ onStartReading, onOpenHelp, onTryDemo }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState(false);

  const [progressStage, setProgressStage] = useState<PdfExtractStage | null>(null);
  const [progressPage, setProgressPage] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordReason, setPasswordReason] = useState<'need_password' | 'wrong_password'>('need_password');
  const [passwordDraft, setPasswordDraft] = useState('');
  const passwordResolverRef = useRef<((value: string | null) => void) | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlImportState, setUrlImportState] = useState<UrlImportState>('idle');
  const [urlImportMessage, setUrlImportMessage] = useState('');
  const [blockedSourceUrl, setBlockedSourceUrl] = useState('');
  const [isPastingClipboard, setIsPastingClipboard] = useState(false);
  const [urlProfile, setUrlProfile] = useState<UrlImportProfile>('auto');
  const [urlPreview, setUrlPreview] = useState<UrlPreviewState | null>(null);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>({
    sourceType: 'paste',
  });

  useEffect(() => {
    if (!isFullscreenEditorOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreenEditorOpen]);

  const progressPercent = useMemo(() => {
    if (!progressTotal || progressTotal <= 0) return 0;
    if (!progressPage || progressPage < 0) return 0;
    return Math.min(100, Math.max(0, Math.round((progressPage / progressTotal) * 100)));
  }, [progressPage, progressTotal]);

  const resetProgress = () => {
    setProgressStage(null);
    setProgressPage(0);
    setProgressTotal(0);
    setProgressMessage('');
  };

  const handleStart = () => {
    if (!text.trim()) return;
    let finalTitle = title.trim();
    if (!finalTitle) {
      const firstLine = text
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.length > 0);
      if (firstLine) {
        finalTitle = firstLine.slice(0, 64);
      } else {
        finalTitle = `Untitled Note ${new Date().toLocaleDateString()}`;
      }
    }
    onStartReading(finalTitle, text, sourceMeta);
  };

  const triggerFilePicker = () => fileInputRef.current?.click();

  const loadDemo = () => {
    const demoTitle = 'Demo: Flow Reader';
    const demoText =
      `Welcome to Flow Reader.\n\n` +
      `This is a short demo document so you can try RSVP and Bionic mode right away.\n\n` +
      `RSVP tip: Start around 250–350 WPM, then inch upward. If you find yourself rewinding, slow down 10–20%.\n\n` +
      `Bionic tip: The UI is hidden by default. Hover/touch the top edge to reveal the header, and the bottom edge to reveal settings.\n\n` +
      `Practice paragraph:\n` +
      `Speed reading isn't about forcing your eyes to move faster. It's about reducing distractions, finding a comfortable rhythm, and staying engaged.\n\n` +
      `Try switching modes using the toggle at the top once you start reading.`;

    setTitle(demoTitle);
    setText(demoText);
    setSourceMeta({ sourceType: 'paste' });
    setStatus('success');
    setErrorMessage('');
    setUrlImportState('idle');
    setUrlImportMessage('');
    setBlockedSourceUrl('');
    setUrlPreview(null);
    resetProgress();
    onTryDemo?.(demoTitle, demoText);
    onOpenHelp?.();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // allow re-uploading the same file
    e.target.value = '';

    setStatus('processing');
    setErrorMessage('');
    setUrlPreview(null);
    resetProgress();
    setTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ''));

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isDocx =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        /\.docx$/i.test(file.name);

      if (isPdf) {
        setSourceMeta({ sourceType: 'pdf' });
        const onProgress = (info: ExtractPdfProgressInfo) => {
          setProgressStage(info.stage);
          setProgressPage(info.page);
          setProgressTotal(info.numPages);
          if (info.message) setProgressMessage(info.message);
        };

        const requestPassword = (info: { reason: 'need_password' | 'wrong_password' }) =>
          new Promise<string | null>((resolve) => {
            passwordResolverRef.current = resolve;
            setPasswordReason(info.reason);
            setPasswordDraft('');
            setPasswordModalOpen(true);
          });

        const runExtract = async (allowLargePdf: boolean) =>
          extractTextFromPDF(file, {
            signal: controller.signal,
            onProgress,
            requestPassword,
            allowLargePdf,
            // Prefer slightly lower scale on narrow screens (keeps memory sane).
            ocrScale: window.matchMedia('(max-width: 768px)').matches ? 1.6 : 2.0,
          });

        try {
          const extractedText = await runExtract(false);
          setText(extractedText);
          setStatus('success');
          resetProgress();
        } catch (err: any) {
          if (err?.name === 'PdfImportError' && err?.code === 'TOO_LARGE') {
            const pages = err?.details?.numPages ?? progressTotal;
            const ok = confirm(
              `This PDF has ${pages} pages. Importing it may be slow on your device. Continue anyway?`
            );
            if (!ok) throw err;
            const extractedText = await runExtract(true);
            setText(extractedText);
            setStatus('success');
            resetProgress();
          } else {
            throw err;
          }
        }
      } else if (isDocx) {
        setSourceMeta({ sourceType: 'docx' });
        setProgressStage('loading');
        setProgressMessage('Importing DOCX…');
        setProgressPage(0);
        setProgressTotal(0);

        const buf = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        const value = (res?.value || '').replace(/\r\n/g, '\n').trim();
        setText(value);
        setStatus('success');
        resetProgress();
      } else {
        setSourceMeta({ sourceType: 'paste' });
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target?.result as string || '');
          setStatus('success');
          resetProgress();
        };
        reader.readAsText(file);
      }
    } catch (error) {
      if (isCancelledFileImport(error, controller.signal)) {
        setStatus('idle');
        setErrorMessage('');
      } else {
        console.error(error);
        setStatus('error');
        setErrorMessage('Failed to load file. Please try again.');
      }
      resetProgress();
    } finally {
      abortControllerRef.current = null;
      // If a password prompt is still open for any reason, close it.
      setPasswordModalOpen(false);
      passwordResolverRef.current = null;
    }
  };

  const cancelImport = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('idle');
    setErrorMessage('');
    setUrlPreview(null);
    resetProgress();
    if (passwordResolverRef.current) {
      passwordResolverRef.current(null);
      passwordResolverRef.current = null;
    }
    setPasswordModalOpen(false);
  };

  const submitPassword = () => {
    const pw = passwordDraft;
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    setPasswordModalOpen(false);
    resolve?.(pw);
  };

  const cancelPassword = () => {
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    setPasswordModalOpen(false);
    resolve?.(null);
  };

  const stageLabel = useMemo(() => {
    if (!progressStage) return '';
    if (progressStage === 'loading') return 'Loading';
    if (progressStage === 'extracting') return 'Extracting';
    if (progressStage === 'ocr') return 'OCR';
    return 'Cleaning';
  }, [progressStage]);

  const importFromUrl = async () => {
    const url = normalizeUrlInput(urlDraft);
    if (!url) return;

    setStatus('processing');
    setErrorMessage('');
    setUrlImportState('idle');
    setUrlImportMessage('');
    setBlockedSourceUrl('');
    setUrlPreview(null);
    resetProgress();
    setProgressStage('loading');
    setProgressMessage('Fetching URL…');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Direct fetch often fails due to CORS; this proxy works for most sites.
      const proxied = `https://r.jina.ai/${url}`;
      const res = await fetch(proxied, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
      const raw = await res.text();
      const parsed = parseProxyEnvelope(raw);
      const cleaned = cleanImportedText(parsed.body, {
        sourceUrl: url,
        profile: urlProfile,
      });
      if (isLikelyBotCheckResponse(raw, parsed.body, cleaned.text, cleaned.stats)) {
        setStatus('idle');
        setUrlImportState('blocked');
        setUrlImportMessage(
          'Import succeeded but the content looks blocked or too noisy to read cleanly. Open the page in your browser, complete checks, then paste article text.'
        );
        setBlockedSourceUrl(url);
        resetProgress();
        return;
      }
      if (!cleaned.text.trim()) {
        throw new Error('No readable text was returned for this URL.');
      }
      const nextTitle = parsed.title || url.replace(/^https?:\/\//i, '').slice(0, 64);
      const previewSummary = summarizeUrlImportPreview({
        parsedTitle: parsed.title,
        resolvedTitle: nextTitle,
        rawText: parsed.body,
        cleaned,
      });
      setUrlPreview({
        title: nextTitle,
        sourceUrl: url,
        rawText: parsed.body,
        cleanedText: cleaned.text,
        stats: cleaned.stats,
        suspiciousTokens: cleaned.suspiciousTokens,
        ...previewSummary,
      });
      setStatus('idle');
      setUrlImportState('idle');
      setUrlImportMessage('Review import cleanup below before loading into the reader.');
      resetProgress();
    } catch (e: any) {
      console.error(e);
      if (e?.name === 'AbortError') {
        setStatus('idle');
        setUrlImportState('idle');
        setUrlImportMessage('');
      } else {
        setStatus('error');
        setUrlImportState('error');
        setUrlImportMessage(
          'Could not import this URL automatically. Try again, or open the page and paste the text.'
        );
        setErrorMessage('URL import failed. Check the link or use Open Source Page + Paste from Clipboard.');
      }
      resetProgress();
    } finally {
      abortControllerRef.current = null;
    }
  };

  const applyUrlImportChoice = (
    choice: 'cleaned' | 'raw' | 'edit',
    preview: UrlPreviewState
  ) => {
    const chosenText = choice === 'raw' ? preview.rawText : preview.cleanedText;
    setTitle(preview.title);
    setText(chosenText.trim());
    setSourceMeta({ sourceType: 'url', sourceUrl: preview.sourceUrl });
    setStatus('success');
    setErrorMessage('');
    setUrlImportState('idle');
    setBlockedSourceUrl('');
    setUrlImportMessage(
      choice === 'raw'
        ? 'Imported raw source text.'
        : `Imported cleaned text (${preview.stats.removedLines} noisy lines removed).`
    );
    setUrlPreview(null);
    if (choice === 'edit') {
      setIsFullscreenEditorOpen(true);
    }
  };

  const openSourcePage = () => {
    const target = blockedSourceUrl || normalizeUrlInput(urlDraft);
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const pasteFromClipboard = async () => {
    setIsPastingClipboard(true);
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard API unavailable');
      }
      const clip = await navigator.clipboard.readText();
      const cleaned = clip.trim();
      if (!cleaned) {
        setUrlImportMessage('Clipboard is empty. Copy article text first, then try again.');
        return;
      }
      setText(cleaned);
      setSourceMeta({
        sourceType: 'url',
        sourceUrl: blockedSourceUrl || normalizeUrlInput(urlDraft),
      });
      if (!title.trim()) {
        const fallbackTitle = (blockedSourceUrl || normalizeUrlInput(urlDraft))
          .replace(/^https?:\/\//i, '')
          .slice(0, 64);
        setTitle(fallbackTitle || `Imported Note ${new Date().toLocaleDateString()}`);
      }
      setStatus('success');
      setErrorMessage('');
      setUrlImportState('idle');
      setBlockedSourceUrl('');
      setUrlImportMessage('Pasted text from clipboard.');
    } catch (err) {
      console.error(err);
      setUrlImportMessage(
        'Clipboard access is blocked here. Copy the article text manually and paste it into the editor.'
      );
    } finally {
      setIsPastingClipboard(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="relative z-10 text-center mb-10">
        <h2 className="text-3xl font-header font-bold text-text-primary mb-2 drop-shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
          Read <span className="text-accent-red drop-shadow-[0_0_18px_rgba(var(--color-accent),0.18)]">faster</span>,
          retain <span className="text-accent-red drop-shadow-[0_0_18px_rgba(var(--color-accent),0.18)]">more</span>.
        </h2>
        <p className="text-text-primary/72 drop-shadow-[0_6px_18px_rgba(0,0,0,0.42)]">Paste your text below or upload a document to begin.</p>
        <p className="text-xs text-text-secondary/80 mt-3 drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          Your library and preferences stay on this device (local browser storage).
        </p>
      </div>

      <div className="relative group">
        {status === 'processing' && (
          <div className="absolute -top-3 left-6 right-6 z-10">
            <div className="h-1.5 rounded-full bg-text-primary/10 overflow-hidden">
              <div
                className="h-full bg-progress transition-[width] duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-secondary/80 font-mono">
              <span className="truncate">
                {progressMessage || (stageLabel ? `${stageLabel}…` : 'Working…')}
              </span>
              {progressTotal > 0 && (
                <span className="shrink-0 ml-3">
                  {stageLabel ? `${stageLabel} ` : ''}
                  {progressPage}/{progressTotal}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreenEditorOpen(true)}
          disabled={status === 'processing'}
          className="absolute top-4 right-4 z-20 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-panel-bg/80 border border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Open fullscreen editor"
          title="Fullscreen editor"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          placeholder="Paste text here..."
          className="w-full h-64 bg-transparent border-2 border-dashed border-text-secondary/25 rounded-xl p-6 pb-24 sm:pb-6 text-lg text-text-primary placeholder:text-text-primary/30 caret-accent-red focus:border-accent-red/60 focus:outline-none focus:bg-transparent focus:ring-0 focus:ring-offset-0 transition-colors duration-200 focus:shadow-glow resize-none font-ui overflow-y-auto overscroll-contain touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        />
        
        {/* Actions Bar inside */}
        <div
          className="absolute right-4 flex gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
           <button
             onClick={triggerFilePicker}
             className="flex items-center gap-2 px-4 py-2 bg-panel-bg border border-text-primary/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all font-medium"
             disabled={status === 'processing'}
           >
             {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
             {status === 'processing'
               ? `${stageLabel || 'Processing'}${progressTotal > 0 ? ` (${progressPage}/${progressTotal})` : '…'}`
               : 'Upload file'}
           </button>

           {status === 'processing' && (
             <button
               type="button"
               onClick={cancelImport}
               className="flex items-center gap-2 px-4 py-2 bg-panel-bg border border-text-primary/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all font-medium"
             >
               <X className="w-4 h-4" />
               Cancel
             </button>
           )}
           
           {text.trim() && (
             <button
               onClick={handleStart}
               className="flex items-center gap-2 px-6 py-2 bg-accent-red text-white rounded-lg text-sm font-bold shadow-glow hover:bg-accent-red/90 transition-all"
             >
               Start Reading <ArrowRight className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
        <button
          type="button"
          onClick={loadDemo}
          className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold bg-text-primary/10 border border-text-primary/10 text-text-primary hover:bg-text-primary/15 hover:border-text-primary/20 transition-colors"
        >
          Try a demo
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
        >
          How to use
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch justify-center gap-2">
        <div className="relative">
          <select
            value={urlProfile}
            onChange={(e) => {
              setUrlProfile(e.target.value as UrlImportProfile);
              setUrlImportMessage('');
              setUrlPreview(null);
            }}
            disabled={status === 'processing'}
            className="min-w-[7.25rem] appearance-none rounded-lg border border-text-primary/10 bg-black/10 pl-3 pr-10 py-2 text-sm text-text-primary focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
            aria-label="URL import profile"
          >
            {URL_IMPORT_PROFILES.map((profile) => (
              <option key={profile.value} value={profile.value} className="bg-panel-bg text-text-primary">
                {profile.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
        </div>
        <input
          value={urlDraft}
          onChange={(e) => {
            setUrlDraft(e.target.value);
            setUrlImportState('idle');
            setUrlImportMessage('');
            setBlockedSourceUrl('');
            setErrorMessage('');
            setUrlPreview(null);
          }}
          placeholder="Paste an article URL…"
          className="w-full sm:w-[28rem] rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
          aria-label="Article URL"
          disabled={status === 'processing'}
        />
        <button
          type="button"
          onClick={importFromUrl}
          disabled={status === 'processing' || !urlDraft.trim()}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-text-primary/10 border border-text-primary/10 text-text-primary hover:bg-text-primary/15 hover:border-text-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Import URL
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-text-secondary/60">
        URL import uses a public text extraction proxy for compatibility with most sites.
      </p>

      {urlImportMessage && (
        <p
          className={`mt-2 text-center text-xs ${
            urlImportState === 'error' ? 'text-red-400' : 'text-text-secondary/80'
          }`}
        >
          {urlImportMessage}
        </p>
      )}

      {urlImportState === 'blocked' && (
        <div className="mt-3 rounded-xl border border-text-primary/10 bg-panel-bg/70 p-4">
          <h3 className="text-sm font-semibold text-text-primary">This page needs a quick browser check</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Some sites require CAPTCHA/login interaction before text extraction works. Open the source page,
            complete any checks, then paste article text here.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={openSourcePage}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-text-primary/10 border border-text-primary/10 text-text-primary hover:bg-text-primary/15 hover:border-text-primary/20 transition-colors"
            >
              Open Source Page
            </button>
            <button
              type="button"
              onClick={pasteFromClipboard}
              disabled={isPastingClipboard}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-panel-bg border border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPastingClipboard ? 'Pasting…' : 'Paste from Clipboard'}
            </button>
          </div>
        </div>
      )}

      {urlPreview && (
        <div className="mt-3 rounded-xl border border-text-primary/10 bg-panel-bg/70 p-4">
          <h3 className="text-sm font-semibold text-text-primary">Import preview</h3>
          <p className="mt-1 text-xs text-text-secondary">
            {urlPreview.stats.removedLines} lines removed, {urlPreview.stats.rawUrlsRemoved} links normalized,
            {` ${urlPreview.stats.suspiciousLeftovers}`} suspicious leftovers.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest">
            <span className={`rounded-full border px-2 py-1 ${confidenceClasses[urlPreview.titleConfidence]}`}>
              Title {CONFIDENCE_LABELS[urlPreview.titleConfidence]}
            </span>
            <span className={`rounded-full border px-2 py-1 ${confidenceClasses[urlPreview.sourceConfidence]}`}>
              Source {CONFIDENCE_LABELS[urlPreview.sourceConfidence]}
            </span>
            <span className="rounded-full border border-text-primary/10 bg-black/20 px-2 py-1 text-text-secondary">
              {urlPreview.cleanedWordCount}/{Math.max(urlPreview.rawWordCount, 1)} words kept
            </span>
            <span className="rounded-full border border-text-primary/10 bg-black/20 px-2 py-1 text-text-secondary">
              {urlPreview.titleOrigin === 'page' ? 'Page title detected' : 'Fallback title'}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-text-primary/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Raw sample</p>
              <p className="mt-2 text-xs text-text-secondary break-words">{urlPreview.rawExcerpt || 'No raw sample available.'}</p>
            </div>
            <div className="rounded-lg border border-text-primary/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Cleaned sample</p>
              <p className="mt-2 text-xs text-text-primary/90 break-words">{urlPreview.cleanedExcerpt || 'No cleaned sample available.'}</p>
            </div>
          </div>
          {urlPreview.removedLineSamples.length > 0 && (
            <div className="mt-3 rounded-lg border border-text-primary/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Removed noisy lines</p>
              <p className="mt-1 text-xs text-text-secondary break-words">
                {urlPreview.removedLineSamples.join(' • ')}
              </p>
            </div>
          )}
          {urlPreview.suspiciousTokens.length > 0 && (
            <div className="mt-2 rounded-lg border border-text-primary/10 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Potential leftovers</p>
              <p className="mt-1 text-xs text-text-secondary break-words">
                {urlPreview.suspiciousTokens.join(' • ')}
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => applyUrlImportChoice('cleaned', urlPreview)}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
            >
              Use cleaned
            </button>
            <button
              type="button"
              onClick={() => applyUrlImportChoice('raw', urlPreview)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-text-primary/10 border border-text-primary/10 text-text-primary hover:bg-text-primary/15 hover:border-text-primary/20 transition-colors"
            >
              Use raw
            </button>
            <button
              type="button"
              onClick={() => applyUrlImportChoice('edit', urlPreview)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-panel-bg border border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-colors"
            >
              Edit first
            </button>
          </div>
        </div>
      )}

      {isFullscreenEditorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-app-bg">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-text-primary/10"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
          >
            <div className="text-sm font-semibold text-text-primary">Edit text</div>
            <button
              type="button"
              onClick={() => setIsFullscreenEditorOpen(false)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-panel-bg/60 border border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/25 transition-colors"
              aria-label="Close fullscreen editor"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 px-4 py-4">
            <textarea
              value={text}
              onChange={(e) => {
            setText(e.target.value);
          }}
              placeholder="Paste text here..."
              autoFocus
              className="w-full h-full min-h-0 rounded-xl border border-text-primary/10 bg-black/10 p-4 pb-28 text-base sm:text-lg text-text-primary placeholder:text-text-secondary/60 caret-accent-red focus:border-accent-red/60 focus:outline-none resize-none font-ui overflow-y-auto overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            />
          </div>

          <div
            className="shrink-0 px-4 pt-3 border-t border-text-primary/10 bg-app-bg"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={triggerFilePicker}
                className="flex items-center gap-2 px-4 py-2 bg-panel-bg border border-text-primary/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all font-medium"
                disabled={status === 'processing'}
              >
                {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {status === 'processing'
                  ? `${stageLabel || 'Processing'}${progressTotal > 0 ? ` (${progressPage}/${progressTotal})` : '…'}`
                  : 'Upload file'}
              </button>

              {status === 'processing' && (
                <button
                  type="button"
                  onClick={cancelImport}
                  className="flex items-center gap-2 px-4 py-2 bg-panel-bg border border-text-primary/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-primary/30 transition-all font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}

              {text.trim() && (
                <button
                  onClick={() => {
                    if (!text.trim()) return;
                    handleStart();
                    setIsFullscreenEditorOpen(false);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-red text-white rounded-lg text-sm font-bold shadow-glow hover:bg-accent-red/90 transition-all"
                >
                  Start Reading <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close password prompt"
            onClick={cancelPassword}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-panel-bg border border-text-primary/10 shadow-2xl p-6">
            <h3 className="font-header text-xl font-bold text-text-primary">This PDF is locked</h3>
            <p className="mt-2 text-sm text-text-secondary">
              {passwordReason === 'wrong_password'
                ? 'That password did not work. Try again.'
                : 'Enter the password to import this document.'}
            </p>

            <input
              type="password"
              value={passwordDraft}
              onChange={(e) => setPasswordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPassword();
                if (e.key === 'Escape') cancelPassword();
              }}
              autoFocus
              className="mt-4 w-full rounded-md border border-text-primary/10 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
              placeholder="Password"
              aria-label="PDF password"
            />

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelPassword}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPassword}
                disabled={!passwordDraft}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow disabled:opacity-60 disabled:cursor-not-allowed hover:bg-accent-red/90 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className="mt-4 text-center text-red-500 text-sm">
          {errorMessage}
        </p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.pdf,.docx"
        className="hidden"
      />
    </div>
  );
};
