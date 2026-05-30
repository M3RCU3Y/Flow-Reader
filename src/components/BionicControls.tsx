import React from 'react';
import { LineWidth } from '../types';

interface BionicControlsProps {
  bionicStrength: number;
  bionicFontSize: number;
  lineWidth: LineWidth;
  progressPercent: number;
  currentIndex: number;
  totalWords: number;
  onStrengthChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onLineWidthChange: (value: LineWidth) => void;
}

const WIDTH_OPTIONS: Array<{ value: LineWidth; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'focused', label: 'Focused' },
];

export const BionicControls: React.FC<BionicControlsProps> = ({
  bionicStrength,
  bionicFontSize,
  lineWidth,
  progressPercent,
  currentIndex,
  totalWords,
  onStrengthChange,
  onFontSizeChange,
  onLineWidthChange,
}) => {
  const strengthPercent = Math.min(80, Math.max(0, Math.round(bionicStrength * 100)));

  return (
    <div className="relative isolate w-full overflow-hidden rounded-2xl border border-text-primary/5 shadow-2xl">
      <div className="absolute inset-0 bg-panel-bg/58 backdrop-blur-xl" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/10" aria-hidden="true" />
      <div className="relative p-6">
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1 bg-text-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-progress rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-text-secondary font-mono">
            {currentIndex} / {totalWords} w
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Bionic Strength</span>
            <div className="flex items-center gap-3 bg-app-bg/50 px-4 py-2 rounded-lg border border-text-primary/5">
              <span className="text-sm font-mono w-10 text-center text-text-primary">{strengthPercent}%</span>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={strengthPercent}
                onChange={(e) => onStrengthChange(parseInt(e.target.value, 10) / 100)}
                className="w-28 h-1 bg-text-primary/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text-primary hover:[&::-webkit-slider-thumb]:bg-accent-red"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Font Size</span>
            <div className="flex items-center gap-3 bg-app-bg/50 px-4 py-2 rounded-lg border border-text-primary/5">
              <span className="text-sm font-mono w-10 text-center text-text-primary">{bionicFontSize}px</span>
              <input
                type="range"
                min="18"
                max="42"
                step="1"
                value={bionicFontSize}
                onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                className="w-28 h-1 bg-text-primary/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text-primary hover:[&::-webkit-slider-thumb]:bg-accent-red"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Line Width</span>
            <div className="flex items-center gap-1 rounded-full bg-text-primary/5 p-1 border border-text-primary/10">
              {WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onLineWidthChange(option.value)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all ${
                    lineWidth === option.value
                      ? 'bg-text-primary/10 text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
