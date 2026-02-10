import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseRSVPProps {
  initialText?: string;
  initialWpm?: number;
  initialIndex?: number;
  onProgress?: (index: number) => void;
  smartTimingEnabled?: boolean;
  comfortModeEnabled?: boolean;
}

type WordToken = {
  w: string;
  paragraphStart: boolean;
};

const parseWords = (text: string): WordToken[] => {
  const tokens: WordToken[] = [];
  const re = /\S+|\n+/g;
  let match: RegExpExecArray | null;
  let paragraphStart = true;

  while ((match = re.exec(text))) {
    const t = match[0] || '';
    if (!t) continue;
    if (t[0] === '\n') {
      // Treat double-newlines as a paragraph boundary.
      if (t.length >= 2) paragraphStart = true;
      continue;
    }
    tokens.push({ w: t, paragraphStart });
    paragraphStart = false;
  }

  return tokens;
};

const stripWord = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '');

const computeDelayMs = (
  token: WordToken,
  baseMs: number,
  smartTimingEnabled: boolean,
  comfortFactor: number
) => {
  let ms = baseMs;

  if (smartTimingEnabled) {
    if (token.paragraphStart) ms *= 2.1;

    const cleaned = stripWord(token.w);
    const len = cleaned.length;
    if (len >= 13) ms *= 1.28;
    else if (len >= 9) ms *= 1.14;

    // Word-final punctuation is the most reliable signal.
    if (/[.?!][\"')\]]?$/.test(token.w)) ms *= 1.7;
    else if (/[,:;][\"')\]]?$/.test(token.w)) ms *= 1.25;
  }

  ms *= comfortFactor;
  return ms;
};

export const useRSVP = ({
  initialText = '',
  initialWpm = 300,
  initialIndex = 0,
  onProgress,
  smartTimingEnabled = true,
  comfortModeEnabled = true,
}: UseRSVPProps) => {
  const tokensRef = useRef<WordToken[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);

  const playStartIndexRef = useRef(0);
  const slowdownUntilRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialText) {
      tokensRef.current = [];
      setWords([]);
      return;
    }
    const parsed = parseWords(initialText);
    tokensRef.current = parsed;
    setWords(parsed.map((t) => t.w));
  }, [initialText]);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const totalWords = words.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setIndex((prev) => {
      const tokens = tokensRef.current;
      if (prev >= tokens.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      const next = prev + 1;
      onProgress?.(next);
      return next;
    });
  }, [onProgress]);

  // Schedule each word individually so we can vary timing (punctuation, paragraphs, long words, comfort ramp).
  useEffect(() => {
    clearTimer();

    if (!isPlaying) return;

    const tokens = tokensRef.current;
    if (index >= tokens.length - 1) {
      setIsPlaying(false);
      return;
    }

    const baseMs = 60000 / Math.max(60, wpm);
    const token = tokens[index] || { w: words[index] || '', paragraphStart: false };

    // Comfort mode: ramp for first ~40 words after pressing play.
    let comfortFactor = 1.0;
    if (comfortModeEnabled) {
      const played = Math.max(0, index - playStartIndexRef.current);
      const rampWindow = 40;
      const t = Math.min(1, played / rampWindow);
      comfortFactor = 1.35 - 0.35 * t;
    }

    // If the user rewound while playing, slow down briefly.
    if (slowdownUntilRef.current != null && index < slowdownUntilRef.current) {
      comfortFactor *= 1.18;
    } else if (slowdownUntilRef.current != null && index >= slowdownUntilRef.current) {
      slowdownUntilRef.current = null;
    }

    const delay = computeDelayMs(token, baseMs, smartTimingEnabled, comfortFactor);
    timerRef.current = window.setTimeout(tick, delay);

    return () => clearTimer();
  }, [clearTimer, comfortModeEnabled, index, isPlaying, smartTimingEnabled, tick, wpm, words]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      const next = !p;
      if (next) {
        playStartIndexRef.current = index;
        slowdownUntilRef.current = null;
      } else {
        clearTimer();
      }
      return next;
    });
  }, [clearTimer, index]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
    setIndex(0);
    onProgress?.(0);
  }, [clearTimer, onProgress]);

  const seek = useCallback(
    (newIndex: number) => {
      const safeIndex = Math.max(0, Math.min(newIndex, totalWords - 1));
      // If rewinding while playing, slow down for the next ~25 words.
      if (isPlaying && safeIndex < index) {
        slowdownUntilRef.current = safeIndex + 25;
      }
      setIndex(safeIndex);
      onProgress?.(safeIndex);
    },
    [index, isPlaying, onProgress, totalWords]
  );

  const currentWord = useMemo(() => words[index] || '', [index, words]);

  return {
    words,
    index,
    currentWord,
    isPlaying,
    wpm,
    setWpm,
    togglePlay,
    reset,
    seek,
    totalWords,
  };
};

