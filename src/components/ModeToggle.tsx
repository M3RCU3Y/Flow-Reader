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
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const selectIndex = (nextIndex: number) => {
    const next = items[nextIndex];
    if (!next) return;
    onChange(next.value);
    window.requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = items.length - 1;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    selectIndex(nextIndex);
  };

  return (
    <div
      className="reader-mode-toggle"
      role="tablist"
      aria-label="Reader mode"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <div
        className="reader-mode-toggle__indicator"
        aria-hidden="true"
        style={{
          width: `calc((100% - 0.6rem) / ${items.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {items.map((item, index) => {
        const selected = mode === item.value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="reader-mode-toggle__tab"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
