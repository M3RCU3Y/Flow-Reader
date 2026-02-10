import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Trash2, X, CornerDownLeft } from 'lucide-react';
import type { Bookmark as BookmarkType } from '../types';

interface BookmarksPanelProps {
  isOpen: boolean;
  bookmarks: BookmarkType[];
  onAdd: (note?: string) => void;
  onJump: (index: number) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  getSnippet?: (index: number) => string;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  isOpen,
  bookmarks,
  onAdd,
  onJump,
  onDelete,
  onClose,
  getSnippet,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

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

  const sorted = useMemo(() => {
    return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close bookmarks"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        className="absolute w-[min(28rem,92vw)] max-h-[72dvh] overflow-hidden rounded-2xl bg-panel-bg border border-text-primary/10 shadow-2xl"
        style={{
          right: 'calc(env(safe-area-inset-right) + 16px)',
          top: 'calc(env(safe-area-inset-top) + 88px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmarks"
      >
        <div className="p-5 border-b border-text-primary/10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
              <Bookmark className="w-4 h-4" />
              Bookmarks
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Save places to revisit later. These are stored locally on this device.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-text-primary/10 flex gap-2">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Optional note…"
            className="flex-1 rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
            aria-label="Bookmark note"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAdd(noteDraft.trim() || undefined);
                setNoteDraft('');
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              onAdd(noteDraft.trim() || undefined);
              setNoteDraft('');
            }}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
          >
            Save
          </button>
        </div>

        <div className="p-2 overflow-y-auto max-h-[calc(72dvh-9.5rem)]">
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-text-secondary/80 text-sm">
              No bookmarks yet. Save one while you’re reading.
            </div>
          ) : (
            <ul className="space-y-2 p-3">
              {sorted.map((bm) => (
                <li
                  key={bm.id}
                  className="rounded-xl border border-text-primary/10 bg-black/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                        Word {bm.index}
                      </div>
                      {bm.note && (
                        <div className="mt-2 text-sm text-text-primary/90 break-words">
                          {bm.note}
                        </div>
                      )}
                      {getSnippet && (
                        <div className="mt-2 text-xs text-text-secondary/80 break-words">
                          {getSnippet(bm.index)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onJump(bm.index)}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                        title="Jump to bookmark"
                        aria-label="Jump to bookmark"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(bm.id)}
                        className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-text-primary/5 transition-colors"
                        title="Delete bookmark"
                        aria-label="Delete bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

