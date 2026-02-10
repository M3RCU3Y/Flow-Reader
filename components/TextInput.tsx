import React, { useMemo, useRef, useState } from 'react';
import { Upload, Loader2, ArrowRight, X } from 'lucide-react';
import { extractTextFromPDF } from '../services/pdfService';
import type { ExtractPdfProgressInfo, PdfExtractStage, ProcessingStatus } from '../types';

interface TextInputProps {
  onStartReading: (title: string, text: string) => void;
  onOpenHelp?: () => void;
  onTryDemo?: (title: string, text: string) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ onStartReading, onOpenHelp, onTryDemo }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progressStage, setProgressStage] = useState<PdfExtractStage | null>(null);
  const [progressPage, setProgressPage] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordReason, setPasswordReason] = useState<'need_password' | 'wrong_password'>('need_password');
  const [passwordDraft, setPasswordDraft] = useState('');
  const passwordResolverRef = useRef<((value: string | null) => void) | null>(null);
  const [urlDraft, setUrlDraft] = useState('');

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
    onStartReading(finalTitle, text);
  };

  const loadDemo = () => {
    const demoTitle = 'Demo: Focus Reader';
    const demoText =
      `Welcome to Focus Reader.\n\n` +
      `This is a short demo document so you can try RSVP and Bionic mode right away.\n\n` +
      `RSVP tip: Start around 250–350 WPM, then inch upward. If you find yourself rewinding, slow down 10–20%.\n\n` +
      `Bionic tip: The UI is hidden by default. Hover/touch the top edge to reveal the header, and the bottom edge to reveal settings.\n\n` +
      `Practice paragraph:\n` +
      `Speed reading isn't about forcing your eyes to move faster. It's about reducing distractions, finding a comfortable rhythm, and staying engaged.\n\n` +
      `Try switching modes using the toggle at the top once you start reading.`;

    setTitle(demoTitle);
    setText(demoText);
    setStatus('success');
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
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target?.result as string || '');
          setStatus('success');
          resetProgress();
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
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

  const normalizeUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const parseJinaText = (raw: string): { title?: string; text: string } => {
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
    let titleLine: string | undefined;
    let start = 0;

    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      const l = (lines[i] || '').trim();
      if (!l) continue;
      if (l.toLowerCase().startsWith('title:')) titleLine = l.slice(6).trim();
      if (/^(markdown|text)\s+content:/i.test(l)) {
        start = i + 1;
        break;
      }
    }

    while (start < lines.length) {
      const l = (lines[start] || '').trim();
      if (!l) {
        start++;
        continue;
      }
      if (/^(title:|url source:|source:|published:|author:)/i.test(l)) {
        start++;
        continue;
      }
      break;
    }

    const text = lines.slice(start).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { title: titleLine, text };
  };

  const importFromUrl = async () => {
    const url = normalizeUrl(urlDraft);
    if (!url) return;

    setStatus('processing');
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
      const parsed = parseJinaText(raw);
      const nextTitle = parsed.title || url.replace(/^https?:\/\//i, '').slice(0, 64);
      setTitle(nextTitle);
      setText(parsed.text);
      setStatus('success');
      resetProgress();
    } catch (e) {
      console.error(e);
      setStatus('error');
      resetProgress();
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl font-header font-bold text-text-primary mb-2">Read faster, retain more.</h2>
        <p className="text-text-secondary">Paste your text below or upload a document to begin.</p>
        <p className="text-xs text-text-secondary/70 mt-3">
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text here..."
          className="w-full h-64 bg-transparent border-2 border-dashed border-text-secondary/25 rounded-xl p-6 text-lg text-text-primary placeholder:text-text-primary/30 focus:border-accent-red/60 focus:outline-none focus:bg-transparent focus:ring-0 focus:ring-offset-0 transition-colors duration-200 focus:shadow-glow resize-none font-ui"
        />
        
        {/* Actions Bar inside */}
        <div className="absolute bottom-4 right-4 flex gap-2">
           <button
             onClick={() => fileInputRef.current?.click()}
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
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
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

      {status === 'error' && (
        <p className="mt-4 text-center text-red-500 text-sm">
          Failed to load file. Please try again.
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
