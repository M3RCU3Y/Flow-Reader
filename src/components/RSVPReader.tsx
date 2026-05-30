import React from 'react';
import { ReaderDisplay } from './ReaderDisplay';

interface RSVPReaderProps {
  word: string;
  fitToWidth?: boolean;
  isMobile?: boolean;
}

export const RSVPReader: React.FC<RSVPReaderProps> = ({ word, fitToWidth, isMobile }) => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ReaderDisplay
        word={word}
        fitToWidth={fitToWidth}
        textSizeClassName={isMobile ? 'text-[clamp(40px,12.5vw,58px)]' : undefined}
      />
    </div>
  );
};
