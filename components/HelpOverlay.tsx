import React, { useEffect, useRef } from 'react';
import { X, CircleHelp, Keyboard, MousePointer2, Shield } from 'lucide-react';
import type { ReaderMode } from '../types';

interface HelpOverlayProps {
  isOpen: boolean;
  mode: ReaderMode;
  hasActiveBook: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({
  isOpen,
  mode,
  hasActiveBook,
  onClose,
  onDontShowAgain,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close help"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        className="relative w-full max-w-2xl max-h-[80dvh] overflow-y-auto rounded-2xl bg-panel-bg border border-text-primary/10 shadow-2xl"
      >
        <div className="p-6 sm:p-7 border-b border-text-primary/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase tracking-widest">
              <CircleHelp className="w-4 h-4" />
              Quick Tips
            </div>
            <h2 className="mt-2 font-header text-2xl font-bold text-text-primary">
              Read faster, keep your place, stay in flow
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Everything is stored locally in your browser. No accounts, no sync, no tracking.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <section className="rounded-xl border border-text-primary/10 bg-black/15 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Keyboard className="w-4 h-4 text-text-secondary" />
              Keyboard Shortcuts (RSVP / RSVP+)
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
              <div className="flex items-center justify-between gap-4">
                <span>Play / pause</span>
                <code className="px-2 py-1 rounded bg-black/30 border border-text-primary/10 text-text-primary">
                  Space
                </code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Reset</span>
                <code className="px-2 py-1 rounded bg-black/30 border border-text-primary/10 text-text-primary">R</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Seek backward / forward</span>
                <code className="px-2 py-1 rounded bg-black/30 border border-text-primary/10 text-text-primary">
                  ← / →
                </code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Change speed</span>
                <span className="text-text-primary/80">Slider</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-text-primary/10 bg-black/15 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <MousePointer2 className="w-4 h-4 text-text-secondary" />
              Bionic Mode (Zen UI)
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              In Bionic mode, the UI stays hidden by default. Reach for it when you need it:
            </p>
            <div className="mt-3 space-y-2 text-sm text-text-secondary">
              <div className="flex items-start justify-between gap-4">
                <span>Top edge</span>
                <span className="text-text-primary/80">Reveals header (Library + mode toggle)</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Bottom edge</span>
                <span className="text-text-primary/80">Reveals progress + Bionic settings + Theme</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span>Scroll</span>
                <span className="text-text-primary/80">Auto-hides UI while scrolling</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-text-primary/10 bg-black/15 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <Shield className="w-4 h-4 text-text-secondary" />
              Privacy + Local Storage
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Your library, preferences, and themes are saved in your browser storage on this device.
              Use <span className="text-text-primary/80">Clear Data</span> in the Library to remove all Focus Reader data.
            </p>
          </section>
        </div>

        <div className="p-6 sm:p-7 border-t border-text-primary/10 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-xs text-text-secondary">
            {hasActiveBook ? (
              <span>
                Current mode: <span className="text-text-primary/80">{mode === 'bionic_flow' ? 'Bionic' : mode === 'rsvp_enhanced' ? 'RSVP+' : 'RSVP'}</span>
              </span>
            ) : (
              <span>Tip: Try the demo if you want something to test immediately.</span>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                onDontShowAgain();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
            >
              Don&apos;t show again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

