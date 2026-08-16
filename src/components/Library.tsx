import React from 'react';
import { Book as BookIcon, Trash2 } from 'lucide-react';
import { Book } from '../types';
import { getBookSourceLabel, getBookSourceType } from '../services/bookState';

interface LibraryProps {
  books: Book[];
  onSelect: (book: Book) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  activeId?: string;
  emptyMessage?: string;
}

export const Library: React.FC<LibraryProps> = ({ books, onSelect, onDelete, activeId, emptyMessage }) => {
  if (books.length === 0) {
    return (
      <div className="library-empty-state flex flex-col items-center justify-center text-text-secondary text-center">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-text-primary/10 bg-text-primary/5">
          <BookIcon className="w-4 h-4" />
        </div>
        <p className="text-sm text-text-secondary/80">{emptyMessage || 'No readings yet.'}</p>
        <p className="mt-1 text-[11px] text-text-secondary/45">Imported documents stay on this device.</p>
      </div>
    );
  }

  return (
    <ul className="library-list">
      {books.map((book) => {
        const progress = Math.min(100, Math.max(0, Math.round((book.progressIndex / Math.max(1, book.words.length)) * 100) || 0));
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
              className="library-card__select"
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${book.title}, ${progress}% complete`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="library-card__title min-w-0 flex-1">{book.title}</h3>
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
            </button>

            <button
              type="button"
              onClick={(e) => onDelete(book.id, e)}
              className="library-card__delete"
              aria-label={`Delete ${book.title}`}
              title={`Delete ${book.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};
