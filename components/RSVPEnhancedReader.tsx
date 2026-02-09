import React from 'react';
import { ContextStrength } from '../types';
import { ReaderDisplay } from './ReaderDisplay';

const STRENGTHS: Array<{ value: ContextStrength; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
];

interface RSVPEnhancedReaderProps {
  word: string;
  prevWord?: string;
  nextWord?: string;
  contextStrength: ContextStrength;
  onContextStrengthChange: (strength: ContextStrength) => void;
  isUiVisible?: boolean;
  fitToWidth?: boolean;
}

export const RSVPEnhancedReader: React.FC<RSVPEnhancedReaderProps> = ({
  word,
  prevWord,
  nextWord,
  contextStrength,
  onContextStrengthChange,
  isUiVisible = true,
  fitToWidth = false,
}) => {
  return (
    <div className="relative h-full w-full">
      <div className="flex h-full w-full items-center justify-center">
        <ReaderDisplay
          word={word}
          prevWord={prevWord}
          nextWord={nextWord}
          showContext
          contextStrength={contextStrength}
          fitToWidth={fitToWidth}
        />
      </div>

      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 ${
          isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 rounded-full border border-text-primary/10 bg-panel-bg/70 px-3 py-2 text-xs uppercase tracking-widest text-text-secondary shadow-xl backdrop-blur-md">
          <span className="font-semibold">Context</span>
          <div className="flex items-center gap-1 rounded-full bg-text-primary/5 p-1">
            {STRENGTHS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onContextStrengthChange(item.value)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  contextStrength === item.value
                    ? 'bg-text-primary/10 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
