import React from 'react';
import { ChevronDown } from 'lucide-react';

export type LibrarySort = 'recent' | 'progress' | 'created';

const OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'progress', label: 'Progress' },
  { value: 'created', label: 'Created' },
];

interface LibrarySortMenuProps {
  value: LibrarySort;
  onChange: (value: LibrarySort) => void;
}

export const LibrarySortMenu: React.FC<LibrarySortMenuProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const current = React.useMemo(() => {
    return OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  }, [value]);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-transparent border border-text-primary/10 rounded-full px-3 py-1 text-text-secondary hover:text-text-primary hover:border-text-primary/20 transition-colors"
        aria-label="Sort library"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-36 rounded-xl border border-text-primary/10 bg-panel-bg/95 backdrop-blur-md shadow-2xl p-1 z-50"
        >
          {OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  isSelected
                    ? 'bg-accent-red/15 text-text-primary border border-accent-red/30 shadow-glow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

