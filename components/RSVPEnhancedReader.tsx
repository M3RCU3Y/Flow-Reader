import React from 'react';
import { ContextStrength } from '../types';
import { ReaderDisplay } from './ReaderDisplay';

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
  // Context selector UI lives in `ControlCenter` now (above the play button), but we still
  // keep these props for future-proofing and to avoid larger refactors in App.
  void onContextStrengthChange;
  void isUiVisible;

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
    </div>
  );
};
