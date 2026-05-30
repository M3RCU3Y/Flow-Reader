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
      <div className="flex flex-col items-center justify-center p-8 text-text-secondary opacity-50 text-center">
        <BookIcon className="w-8 h-8 mb-3" />
        <p className="text-sm">{emptyMessage || 'No readings yet.'}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 px-2">
      {books.map((book) => {
        const progress = Math.round((book.progressIndex / Math.max(1, book.words.length)) * 100) || 0;
        const isActive = book.id === activeId;
        const lastSummary = book.settings?.lastSessionSummary;
        const sourceLabel = getBookSourceLabel(getBookSourceType(book));

        return (
          <li
            key={book.id}
            onClick={() => onSelect(book)}
            className={`
              group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border
              ${isActive
                ? 'bg-text-primary/10 border-text-primary/20'
                : 'bg-transparent border-transparent hover:bg-text-primary/5 hover:border-text-primary/5'}
            `}
          >
            <div className="flex justify-between items-start gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className={`text-sm font-medium line-clamp-1 transition-colors ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                    {book.title}
                  </h3>
                  <span className="shrink-0 rounded-full border border-text-primary/10 bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                    {sourceLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => onDelete(book.id, e)}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-red p-1 rounded transition-all"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary/60 font-mono mt-2">
              <span>{book.words.length}w</span>
              <div className="flex items-center gap-2">
                <span>{progress}%</span>
                <div className="w-12 h-1 bg-text-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-progress rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            {lastSummary && (
              <div className="mt-2 text-[11px] text-text-secondary/70">
                Last session: {lastSummary.wordsRead}w • {Math.max(1, Math.round((lastSummary.endedAt - lastSummary.startedAt) / 60000))}m
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
