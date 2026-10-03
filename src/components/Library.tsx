import React from 'react';
import { ArrowUpRight, Book as BookIcon, Search, Trash2 } from 'lucide-react';
import { Book } from '../types';
import { getBookSourceLabel, getBookSourceType } from '../services/bookState';

interface LibraryProps {
  books: Book[];
  onSelect: (book: Book) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  activeId?: string;
  emptyMessage?: string;
  isFiltered?: boolean;
  onResetFilters?: () => void;
}

export const Library: React.FC<LibraryProps> = ({ books, onSelect, onDelete, activeId, emptyMessage, isFiltered = false, onResetFilters }) => {
  if (books.length === 0) {
    return (
      <div className="library-empty-state flex flex-col items-center justify-center text-text-secondary text-center" role="status">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-text-primary/10 bg-text-primary/5">
          {isFiltered ? <Search className="w-4 h-4" aria-hidden="true" /> : <BookIcon className="w-4 h-4" aria-hidden="true" />}
        </div>
        <p className="text-sm text-text-secondary/80">{emptyMessage || 'No readings yet.'}</p>
        <p className="mt-2 max-w-[24ch] text-xs leading-relaxed text-text-secondary">
          {isFiltered ? 'Try a different title or show all sources.' : 'Paste text or import a document to start your first reading.'}
        </p>
        {isFiltered && onResetFilters && (
          <button type="button" onClick={onResetFilters} className="mt-3 min-h-11 rounded-lg border border-text-primary/15 px-4 text-xs text-text-primary transition-colors hover:bg-text-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red">
            Show all readings
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="library-list" aria-label="Saved readings">
      {books.map((book) => {
        const progress = Math.min(100, Math.max(0, Math.round((book.progressIndex / Math.max(1, book.words.length - 1)) * 100) || 0));
        const atEnd = book.words.length > 1 && book.progressIndex >= book.words.length - 1;
        const actionLabel = atEnd ? 'Open reading' : book.progressIndex > 0 ? 'Continue reading' : 'Start reading';
        const isActive = book.id === activeId;
        const lastSummary = book.settings?.lastSessionSummary;
        const sourceLabel = getBookSourceLabel(getBookSourceType(book));
        const sessionMinutes = lastSummary
          ? Math.max(1, Math.round((lastSummary.endedAt - lastSummary.startedAt) / 60000))
          : null;

        return (
          <li
            key={book.id}
            className={`library-card ${isActive ? 'library-card--active' : ''}`}
          >
            <button
              type="button"
              onClick={() => onSelect(book)}
              className="library-card__select focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
              style={{ paddingRight: '3.4rem' }}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${actionLabel}: ${book.title}, ${progress}% complete`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="library-card__title min-w-0 flex-1" title={book.title}>{book.title}</h3>
                <span className="library-card__source">{sourceLabel}</span>
              </div>

              <div className="library-card__meta">
                <span>{book.words.length.toLocaleString()} words</span>
                <div className="flex items-center gap-2">
                  <span>{progress}%</span>
                  <div
                    className="library-card__progress-track"
                    role="progressbar"
                    aria-label={`Reading progress for ${book.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="library-card__progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {lastSummary && sessionMinutes !== null && (
                <div className="library-card__session">
                  Last session · {lastSummary.wordsRead.toLocaleString()} words · {sessionMinutes} min
                </div>
              )}
              <span className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-text-primary/80">
                {isActive ? 'Current reading' : actionLabel}
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => onDelete(book.id, e)}
              className="library-card__delete focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              style={{ width: '2.75rem', height: '2.75rem', top: '0.4rem', right: '0.35rem' }}
              aria-label={`Delete ${book.title}`}
              title={`Delete ${book.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};
