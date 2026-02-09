import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRSVPProps {
  initialText?: string;
  initialWpm?: number;
  initialIndex?: number;
  onProgress?: (index: number) => void;
}

export const useRSVP = ({ initialText = '', initialWpm = 300, initialIndex = 0, onProgress }: UseRSVPProps) => {
  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Split text into words, handling simple punctuation for better pausing later if needed
    if (initialText) {
      const splitWords = initialText.trim().split(/\s+/).filter(w => w.length > 0);
      setWords(splitWords);
    }
  }, [initialText]);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const tick = useCallback(() => {
    setIndex(prev => {
      if (prev >= words.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      const next = prev + 1;
      if (onProgress) onProgress(next);
      return next;
    });
  }, [words.length, onProgress]);

  useEffect(() => {
    if (isPlaying) {
      const msPerWord = 60000 / wpm;
      timerRef.current = window.setInterval(tick, msPerWord);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, wpm, tick]);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  
  const reset = useCallback(() => {
    setIsPlaying(false);
    setIndex(0);
    if (onProgress) onProgress(0);
  }, [onProgress]);

  const seek = useCallback((newIndex: number) => {
    const safeIndex = Math.max(0, Math.min(newIndex, words.length - 1));
    setIndex(safeIndex);
    if (onProgress) onProgress(safeIndex);
  }, [words.length, onProgress]);

  return {
    words,
    index,
    currentWord: words[index] || '',
    isPlaying,
    wpm,
    setWpm,
    togglePlay,
    reset,
    seek,
    totalWords: words.length
  };
};