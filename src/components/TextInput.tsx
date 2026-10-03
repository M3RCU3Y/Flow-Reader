import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, ArrowRight, X, Maximize2, ChevronDown, BookOpen, Link, ShieldCheck } from 'lucide-react';
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

export const TextInput: React.FC<TextInputProps> = ({ onStartReading, onOpenHelp }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenOpenerRef = useRef<HTMLElement | null>(null);
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (passwordResolverRef.current) return;
      if (event.key === 'Escape') setIsFullscreenEditorOpen(false);
      if (event.key !== 'Tab') return;
      const controls = fullscreenRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      const opener = fullscreenOpenerRef.current;
      if (opener?.isConnected) opener.focus();
      else editorRef.current?.focus();
    };
  }, [isFullscreenEditorOpen]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    passwordResolverRef.current?.(null);
  }, []);

  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);

  const openFullscreenEditor = () => {
    fullscreenOpenerRef.current = document.activeElement as HTMLElement | null;
    setIsFullscreenEditorOpen(true);
  };

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
    if (!text.trim() || status === 'processing') return;
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
    if (status === 'processing') return;
    const demoTitle = 'Demo: Flow Reader';
    const demoText =
      `Welcome to Flow Reader.\n\n` +
      `Here is a short demo document so you can try RSVP and Bionic mode right away.\n\n` +
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
    editorRef.current?.focus();
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
    setUrlImportState('idle');
    setUrlImportMessage('');
    setBlockedSourceUrl('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const ensureCurrentImport = () => {
      if (controller.signal.aborted || abortControllerRef.current !== controller) {
        throw new DOMException('Import cancelled', 'AbortError');
      }
    };
    const applyFileText = (value: string, sourceType: SourceMeta['sourceType']) => {
      ensureCurrentImport();
      setTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ''));
      setSourceMeta({ sourceType });
      setText(value);
      setStatus('success');
      resetProgress();
    };

    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isDocx =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        /\.docx$/i.test(file.name);

      if (isPdf) {
        const onProgress = (info: ExtractPdfProgressInfo) => {
          if (controller.signal.aborted || abortControllerRef.current !== controller) return;
          setProgressStage(info.stage);
          setProgressPage(info.page);
          setProgressTotal(info.numPages);
          if (info.message) setProgressMessage(info.message);
        };

        const requestPassword = (info: { reason: 'need_password' | 'wrong_password' }) =>
          new Promise<string | null>((resolve) => {
            if (controller.signal.aborted || abortControllerRef.current !== controller) {
              resolve(null);
              return;
            }
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
          applyFileText(extractedText, 'pdf');
        } catch (err: any) {
          if (err?.name === 'PdfImportError' && err?.code === 'TOO_LARGE') {
            const pages = err?.details?.numPages ?? progressTotal;
            const ok = confirm(
              `This PDF has ${pages} pages. Importing it may be slow on your device. Continue anyway?`
            );
            if (!ok) throw err;
            const extractedText = await runExtract(true);
            applyFileText(extractedText, 'pdf');
          } else {
            throw err;
          }
        }
      } else if (isDocx) {
        setProgressStage('loading');
        setProgressMessage('Importing DOCX…');
        setProgressPage(0);
        setProgressTotal(0);

        const buf = await file.arrayBuffer();
        ensureCurrentImport();
        const mammoth = await import('mammoth');
        ensureCurrentImport();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        const value = (res?.value || '').replace(/\r\n/g, '\n').trim();
        applyFileText(value, 'docx');
      } else {
        applyFileText(await file.text(), 'paste');
      }
    } catch (error) {
      if (abortControllerRef.current !== controller) return;
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
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setPasswordModalOpen(false);
        passwordResolverRef.current = null;
      }
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
    if (status === 'processing') return;
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
      if (controller.signal.aborted || abortControllerRef.current !== controller) return;
      const parsed = parseProxyEnvelope(raw);
      const cleaned = cleanImportedText(parsed.body, {
        sourceUrl: url,
        profile: urlProfile,
      });
      if (isLikelyBotCheckResponse(raw, parsed.body, cleaned.text, cleaned.stats)) {
        setStatus('idle');
        setUrlImportState('blocked');
        setUrlImportMessage(
          'We reached the page, but the text is not readable yet. Open it in your browser, finish any checks, then paste the article text.'
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
      setUrlImportMessage('Check the cleanup before adding it to your library.');
      resetProgress();
    } catch (e: any) {
      if (abortControllerRef.current !== controller) return;
      if (e?.name === 'AbortError') {
        setStatus('idle');
        setUrlImportState('idle');
        setUrlImportMessage('');
      } else {
        console.error(e);
        setStatus('error');
        setUrlImportState('error');
        setUrlImportMessage(
          'Could not import this URL. Try again, or open the page and paste the text.'
        );
        setErrorMessage('URL import failed. Check the link, or open the source page and paste from the clipboard.');
      }
      resetProgress();
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
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
        ? 'Imported the original text.'
        : `Imported cleaned text (${preview.stats.removedLines} noisy lines removed).`
    );
    setUrlPreview(null);
    if (choice === 'edit') {
      openFullscreenEditor();
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
    <div className="landing-workspace w-full">
      
      <div className="landing-hero">
        <p className="landing-eyebrow"><BookOpen size={14} aria-hidden="true" /> A little space to read</p>
        <h1>Find your <span>reading rhythm.</span></h1>
        <p className="landing-description">Bring an article, a chapter, or your notes. Set your pace and settle into the words.</p>
        <p className="landing-privacy"><ShieldCheck size={14} aria-hidden="true" /> Your library stays on this device. No account needed.</p>
      </div>
      <section className="reading-composer" aria-label="New reading" aria-busy={status === 'processing'}>
        <div className="composer-heading">
          <label htmlFor="reading-text">Your next read</label>
          <button type="button" onClick={openFullscreenEditor} disabled={status === 'processing'} className="composer-expand" aria-label="Open fullscreen editor" title="Fullscreen editor"><Maximize2 size={16} aria-hidden="true" /></button>
        </div>
        <textarea id="reading-text" ref={editorRef} value={text} disabled={status === 'processing'} onChange={(e) => setText(e.target.value)} placeholder="Paste something you want to read…" aria-describedby="reading-info" className="composer-text" />
        {wordCount > 0 && (
          <div className="composer-title">
            <label htmlFor="reading-title">Title</label>
            <input id="reading-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={status === 'processing'} placeholder="Optional — we'll use the first line" maxLength={200} />
          </div>
        )}
        {status === 'processing' && (
          <div className="composer-progress" role="status" aria-live="polite">
            <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden="true" /><span>{progressMessage || (stageLabel ? stageLabel + '…' : 'Importing…')}</span>{progressTotal > 0 && <span className="ml-auto shrink-0">{progressPage}/{progressTotal}</span>}</div>
            {progressTotal > 0 && <progress value={progressPercent} max={100} aria-label="Import progress" />}
          </div>
        )}
        <div className="composer-footer">
          <p id="reading-info" className="composer-info">{wordCount ? wordCount.toLocaleString() + ' words · ~' + Math.max(1, Math.ceil(wordCount / 300)) + ' min at 300 WPM' : 'TXT, PDF, or DOCX · Or paste any text'}</p>
          <div className="composer-actions">
            {status === 'processing' ? <button type="button" onClick={cancelImport} className="composer-secondary"><X size={16} aria-hidden="true" /> Cancel import</button> : <button type="button" onClick={triggerFilePicker} className="composer-secondary"><Upload size={16} aria-hidden="true" /> Upload file</button>}
            <button type="button" onClick={handleStart} disabled={!wordCount || status === 'processing'} className="composer-primary">Start reading <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </section>
      <form className="url-import" onSubmit={(e) => { e.preventDefault(); void importFromUrl(); }}>
        <label htmlFor="article-url" className="url-heading"><Link size={14} aria-hidden="true" /> Or bring an article link</label>
        <div className="url-import-fields">
          <input id="article-url" value={urlDraft} type="text" inputMode="url" autoComplete="url" onChange={(e) => { setUrlDraft(e.target.value); setUrlImportState('idle'); setUrlImportMessage(''); setBlockedSourceUrl(''); setErrorMessage(''); setUrlPreview(null); }} placeholder="example.com/article" aria-describedby="url-disclosure" disabled={status === 'processing'} />
          <div className="url-profile">
            <select value={urlProfile} onChange={(e) => { setUrlProfile(e.target.value as UrlImportProfile); setUrlImportMessage(''); setUrlPreview(null); }} disabled={status === 'processing'} aria-label="URL import profile">
              {URL_IMPORT_PROFILES.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>
          <button type="submit" disabled={status === 'processing' || !urlDraft.trim()} className="composer-secondary">Import URL <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <p id="url-disclosure">Links are sent to a public text extractor. Paste text above to keep it local.</p>
      </form>
      {urlImportMessage && <p role="status" aria-live="polite" className="mt-3 text-center text-sm text-text-secondary">{urlImportMessage}</p>}
      <div className="landing-utilities">
        <span>Nothing on hand?</span>
        <button type="button" onClick={loadDemo} disabled={status === 'processing'}>Try a sample <ArrowRight size={13} aria-hidden="true" /></button>
        <span className="utility-divider" aria-hidden="true">·</span>
        <button type="button" onClick={onOpenHelp}>How it works</button>
      </div>

      {urlImportState === 'blocked' && (
        <div className="mt-3 rounded-xl border border-text-primary/10 bg-panel-bg/70 p-4">
          <h3 className="text-sm font-semibold text-text-primary">Open the page first</h3>
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
            {urlPreview.stats.removedLines} lines removed, {urlPreview.stats.rawUrlsRemoved} links simplified,
            {` ${urlPreview.stats.suspiciousLeftovers}`} possible leftovers.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest">
            <span className={`rounded-full border px-2 py-1 ${confidenceClasses[urlPreview.titleConfidence]}`}>
              Title confidence: {CONFIDENCE_LABELS[urlPreview.titleConfidence]}
            </span>
            <span className={`rounded-full border px-2 py-1 ${confidenceClasses[urlPreview.sourceConfidence]}`}>
              Source confidence: {CONFIDENCE_LABELS[urlPreview.sourceConfidence]}
            </span>
            <span className="rounded-full border border-text-primary/10 bg-black/20 px-2 py-1 text-text-secondary">
              {urlPreview.cleanedWordCount}/{Math.max(urlPreview.rawWordCount, 1)} words kept
            </span>
            <span className="rounded-full border border-text-primary/10 bg-black/20 px-2 py-1 text-text-secondary">
              {urlPreview.titleOrigin === 'page' ? 'Page title detected' : 'Title guessed from URL'}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-text-primary/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Original preview</p>
              <p className="mt-2 text-xs text-text-secondary break-words">{urlPreview.rawExcerpt || 'No original preview available.'}</p>
            </div>
            <div className="rounded-lg border border-text-primary/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Reader preview</p>
              <p className="mt-2 text-xs text-text-primary/90 break-words">{urlPreview.cleanedExcerpt || 'No reader preview available.'}</p>
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
              <p className="text-[11px] uppercase tracking-widest text-text-secondary">Check these</p>
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
              Use cleaned text
            </button>
            <button
              type="button"
              onClick={() => applyUrlImportChoice('raw', urlPreview)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-text-primary/10 border border-text-primary/10 text-text-primary hover:bg-text-primary/15 hover:border-text-primary/20 transition-colors"
            >
              Use original text
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
        <div ref={fullscreenRef} role="dialog" aria-modal="true" aria-labelledby="fullscreen-title" className="fixed inset-0 z-50 flex flex-col bg-app-bg">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-text-primary/10"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
          >
            <div id="fullscreen-title" className="text-sm font-semibold text-text-primary">Edit text</div>
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
              aria-label="Reading text"
              disabled={status === 'processing'}
              placeholder="Paste text here…"
              autoFocus
              className="w-full h-full min-h-0 rounded-xl border border-text-primary/10 bg-black/10 p-4 pb-28 text-base sm:text-lg text-text-primary placeholder:text-text-secondary/60 caret-accent-red focus:border-accent-red/60 focus:outline-none resize-none font-ui overflow-y-auto overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            />
          </div>

          <div
            className="shrink-0 px-4 pt-3 border-t border-text-primary/10 bg-app-bg"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                  disabled={status === 'processing'}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-red text-white rounded-lg text-sm font-bold shadow-glow hover:bg-accent-red/90 transition-all"
                >
                  Start reading <ArrowRight className="w-4 h-4" />
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
        <p role="alert" className="mt-4 text-center text-red-500 text-sm">
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
