import React from 'react';
import { ChevronDown } from 'lucide-react';

export type LibrarySort = 'recent' | 'progress' | 'created';

const OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'progress', label: 'Progress' },
  { value: 'created', label: 'Added' },
];

interface LibrarySortMenuProps {
  value: LibrarySort;
  onChange: (value: LibrarySort) => void;
}

export const LibrarySortMenu: React.FC<LibrarySortMenuProps> = ({ value, onChange }) => (
  <div className="relative shrink-0">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as LibrarySort)}
      aria-label="Sort library"
      title="Sort by recent reading, progress, or date added"
      className="min-h-11 cursor-pointer appearance-none rounded-full border border-text-primary/10 bg-transparent py-2 pl-3 pr-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:border-text-primary/20 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
    >
      {OPTIONS.map((option) => (
        <option
          key={option.value}
          value={option.value}
          style={{ background: 'rgb(var(--color-panel-bg))', color: 'rgb(var(--color-text-primary))' }}
        >
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
  </div>
);
