import React from 'react';
import { ReaderMode } from '../types';

interface ModeToggleProps {
  mode: ReaderMode;
  onChange: (mode: ReaderMode) => void;
  modes?: Array<{ value: ReaderMode; label: string }>;
}

const DEFAULT_MODES: Array<{ value: ReaderMode; label: string }> = [
  { value: 'rsvp', label: 'RSVP' },
  { value: 'rsvp_enhanced', label: 'RSVP+' },
  { value: 'bionic_flow', label: 'Bionic' },
];

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange, modes }) => {
  const items = (modes && modes.length > 0 ? modes : DEFAULT_MODES).filter(Boolean);
  const activeIndex = Math.max(0, items.findIndex((item) => item.value === mode));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const direction = e.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (activeIndex + direction + items.length) % items.length;
    onChange(items[nextIndex].value);
  };

  return (
    <div
      className="relative inline-grid items-center p-1 rounded-full border border-text-primary/10 bg-text-primary/5 backdrop-blur-md shadow-xl"
      role="tablist"
      aria-label="Reader mode"
      onKeyDown={handleKeyDown}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <div
        className="absolute top-1 bottom-1 left-1 rounded-full bg-text-primary/10 border border-text-primary/10 shadow-inner transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${items.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={mode === item.value}
          onClick={() => onChange(item.value)}
          className={`relative z-10 min-w-[76px] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
            mode === item.value
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="inline-flex w-full items-center justify-center">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
