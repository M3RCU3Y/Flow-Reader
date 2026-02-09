import React from 'react';
import { ReaderDisplay } from './ReaderDisplay';

interface RSVPReaderProps {
  word: string;
  fitToWidth?: boolean;
}

export const RSVPReader: React.FC<RSVPReaderProps> = ({ word, fitToWidth }) => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ReaderDisplay word={word} fitToWidth={fitToWidth} />
    </div>
  );
};
