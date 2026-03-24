import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Copy, Pin, PinOff, Search, Trash2, X, CornerDownLeft, MessageSquare, Pencil, Check, RotateCcw } from 'lucide-react';
import type { Bookmark as BookmarkType, Note } from '../types';

interface BookmarksPanelProps {
  isOpen: boolean;
  bookmarks: BookmarkType[];
  notes: Note[];
  onAdd: (note?: string) => void;
  onAddNote: (text: string) => void;
  onUpdateNote: (id: string, text: string) => void;
  onDeleteNote: (id: string) => void;
  onToggleNotePin: (id: string) => void;
  onJump: (index: number) => void;
  onDelete: (id: string) => void;
  onToggleBookmarkPin: (id: string) => void;
  onStartReview: () => void;
  reviewItemCount: number;
  onClose: () => void;
  getSnippet?: (index: number) => string;
}

const comparePinned = (a: { pinnedAt?: number; createdAt: number }, b: { pinnedAt?: number; createdAt: number }) => {
  const aPinned = a.pinnedAt ?? 0;
  const bPinned = b.pinnedAt ?? 0;
  if (aPinned !== bPinned) return bPinned - aPinned;
  return b.createdAt - a.createdAt;
};

const buildCopyText = (label: string, snippet: string, noteText?: string) => {
  const lines = [label, snippet.replace(/[“”]/g, '"')];
  if (noteText) lines.push(`Note: ${noteText}`);
  return lines.filter(Boolean).join('\n');
};

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  isOpen,
  bookmarks,
  notes,
  onAdd,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onToggleNotePin,
  onJump,
  onDelete,
  onToggleBookmarkPin,
  onStartReview,
  reviewItemCount,
  onClose,
  getSnippet,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [bookmarkNoteDraft, setBookmarkNoteDraft] = useState('');
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDraft, setEditingNoteDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

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

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = window.setTimeout(() => setCopyFeedback(''), 1800);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  useEffect(() => {
    if (isOpen) return;
    setSearchQuery('');
    setCopyFeedback('');
    setEditingNoteId(null);
    setEditingNoteDraft('');
    setBookmarkNoteDraft('');
    setNewNoteDraft('');
  }, [isOpen]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBookmarks = useMemo(() => {
    return [...bookmarks]
      .sort(comparePinned)
      .filter((bookmark) => {
        if (!normalizedQuery) return true;
        const searchable = [
          bookmark.note || '',
          `word ${bookmark.index + 1}`,
          getSnippet?.(bookmark.index) || '',
        ]
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedQuery);
      });
  }, [bookmarks, getSnippet, normalizedQuery]);

  const filteredNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => {
        const pinned = comparePinned(a, b);
        if (pinned !== 0) return pinned;
        return b.updatedAt - a.updatedAt;
      })
      .filter((note) => {
        if (!normalizedQuery) return true;
        const searchable = [note.text, `word ${note.index + 1}`, getSnippet?.(note.index) || '']
          .join(' ')
          .toLowerCase();
        return searchable.includes(normalizedQuery);
      });
  }, [getSnippet, normalizedQuery, notes]);

  const handleCopy = async (label: string, index: number, noteText?: string) => {
    const snippet = getSnippet?.(index) || `Word ${index + 1}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(buildCopyText(label, snippet, noteText));
      setCopyFeedback('Excerpt copied');
    } catch {
      setCopyFeedback('Clipboard unavailable');
    }
  };

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
        className="absolute w-[min(34rem,94vw)] max-h-[80dvh] overflow-hidden rounded-2xl bg-panel-bg border border-text-primary/10 shadow-2xl"
        style={{
          right: 'calc(env(safe-area-inset-right) + 16px)',
          top: 'calc(env(safe-area-inset-top) + 88px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmarks and notes"
      >
        <div className="p-5 border-b border-text-primary/10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
              <Bookmark className="w-4 h-4" />
              Bookmarks + Notes
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Search, pin, and copy key excerpts without leaving the reader.
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

        <div className="px-5 py-3 border-b border-text-primary/10 space-y-3">
          <button
            type="button"
            onClick={onStartReview}
            disabled={reviewItemCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-accent-red/30 bg-accent-red/15 text-sm font-semibold text-text-primary hover:bg-accent-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Review session ({reviewItemCount})
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, bookmarks, or excerpts…"
              className="w-full rounded-lg border border-text-primary/10 bg-black/10 pl-10 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors"
              aria-label="Search notes and bookmarks"
            />
          </div>

          {copyFeedback && <p className="text-xs text-text-secondary/80">{copyFeedback}</p>}
        </div>

        <div className="p-5 border-b border-text-primary/10 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary font-bold">
            <Bookmark className="w-3.5 h-3.5" />
            Add bookmark at current word
          </div>
          <div className="flex gap-2">
            <input
              value={bookmarkNoteDraft}
              onChange={(e) => setBookmarkNoteDraft(e.target.value)}
              placeholder="Optional bookmark note…"
              className="flex-1 rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
              aria-label="Bookmark note"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAdd(bookmarkNoteDraft.trim() || undefined);
                  setBookmarkNoteDraft('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                onAdd(bookmarkNoteDraft.trim() || undefined);
                setBookmarkNoteDraft('');
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
            >
              Save
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-text-secondary font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
            Add note at current word
          </div>
          <div className="flex gap-2">
            <input
              value={newNoteDraft}
              onChange={(e) => setNewNoteDraft(e.target.value)}
              placeholder="Write a quick note…"
              className="flex-1 rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
              aria-label="Reading note"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNoteDraft.trim()) {
                  onAddNote(newNoteDraft.trim());
                  setNewNoteDraft('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (!newNoteDraft.trim()) return;
                onAddNote(newNoteDraft.trim());
                setNewNoteDraft('');
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        <div className="p-2 overflow-y-auto max-h-[calc(80dvh-20rem)] space-y-2">
          <div className="px-3 pt-2 text-[11px] uppercase tracking-widest text-text-secondary font-bold">Notes</div>
          {filteredNotes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary/70">
              {normalizedQuery ? 'No notes match your search.' : 'No notes yet.'}
            </div>
          ) : (
            <ul className="space-y-2 px-3">
              {filteredNotes.map((note) => {
                const isEditing = editingNoteId === note.id;
                return (
                  <li key={note.id} className="rounded-xl border border-text-primary/10 bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
                          <span>Word {note.index + 1}</span>
                          {note.pinnedAt && (
                            <span className="rounded-full border border-accent-red/30 bg-accent-red/10 px-2 py-0.5 text-[10px] text-text-primary">
                              Pinned
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            value={editingNoteDraft}
                            onChange={(e) => setEditingNoteDraft(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary focus:border-accent-red/60 focus:outline-none transition-colors"
                          />
                        ) : (
                          <div className="mt-2 text-sm text-text-primary/90 break-words">{note.text}</div>
                        )}
                        {getSnippet && (
                          <div className="mt-2 text-xs text-text-secondary/80 break-words">{getSnippet(note.index)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onJump(note.index)}
                          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                          title="Jump to note"
                        >
                          <CornerDownLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(`Note at word ${note.index + 1}`, note.index, note.text)}
                          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                          title="Copy excerpt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleNotePin(note.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                          title={note.pinnedAt ? 'Unpin note' : 'Pin note'}
                        >
                          {note.pinnedAt ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              const nextText = editingNoteDraft.trim();
                              if (nextText) onUpdateNote(note.id, nextText);
                              setEditingNoteId(null);
                              setEditingNoteDraft('');
                              return;
                            }
                            setEditingNoteId(note.id);
                            setEditingNoteDraft(note.text);
                          }}
                          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                          title={isEditing ? 'Save note edit' : 'Edit note'}
                        >
                          {isEditing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteNote(note.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-text-primary/5 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-3 pt-4 text-[11px] uppercase tracking-widest text-text-secondary font-bold">Bookmarks</div>
          {filteredBookmarks.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary/70">
              {normalizedQuery ? 'No bookmarks match your search.' : 'No bookmarks yet.'}
            </div>
          ) : (
            <ul className="space-y-2 px-3 pb-3">
              {filteredBookmarks.map((bookmark) => (
                <li key={bookmark.id} className="rounded-xl border border-text-primary/10 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
                        <span>Word {bookmark.index + 1}</span>
                        {bookmark.pinnedAt && (
                          <span className="rounded-full border border-accent-red/30 bg-accent-red/10 px-2 py-0.5 text-[10px] text-text-primary">
                            Pinned
                          </span>
                        )}
                      </div>
                      {bookmark.note && <div className="mt-2 text-sm text-text-primary/90 break-words">{bookmark.note}</div>}
                      {getSnippet && <div className="mt-2 text-xs text-text-secondary/80 break-words">{getSnippet(bookmark.index)}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onJump(bookmark.index)}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                        title="Jump to bookmark"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(`Bookmark at word ${bookmark.index + 1}`, bookmark.index, bookmark.note)}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                        title="Copy excerpt"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleBookmarkPin(bookmark.id)}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-text-primary/5 transition-colors"
                        title={bookmark.pinnedAt ? 'Unpin bookmark' : 'Pin bookmark'}
                      >
                        {bookmark.pinnedAt ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(bookmark.id)}
                        className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-text-primary/5 transition-colors"
                        title="Delete bookmark"
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
