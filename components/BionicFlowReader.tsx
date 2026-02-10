import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LineWidth } from '../types';

interface BionicFlowReaderProps {
  text: string;
  currentIndex: number;
  totalWords: number;
  bionicStrength: number;
  lineWidth: LineWidth;
  initialScrollPercent?: number | null;
  onProgressIndex: (index: number) => void;
  onScrollPercentChange?: (percent: number) => void;
}

type Token =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'punct'; value: string };

type ParagraphMeta = {
  top: number;
  height: number;
  startIndex: number;
  wordCount: number;
};

const TOKEN_REGEX = /([A-Za-z0-9]+(?:'[A-Za-z0-9]+)*)|(\s+)|([^\sA-Za-z0-9]+)/g;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  for (const match of text.matchAll(TOKEN_REGEX)) {
    if (match[1]) {
      tokens.push({ type: 'word', value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: 'space', value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'punct', value: match[3] });
    }
  }
  return tokens;
};

const splitBionic = (word: string, strength: number) => {
  if (strength <= 0) {
    return { bold: '', rest: word };
  }
  const len = word.length;
  if (len <= 3) {
    return { bold: word, rest: '' };
  }
  const boldLen = clamp(Math.floor(len * strength), 1, len);
  return {
    bold: word.slice(0, boldLen),
    rest: word.slice(boldLen),
  };
};

const getWidthClass = (lineWidth: LineWidth) => {
  switch (lineWidth) {
    case 'wide':
      return 'max-w-[110ch]';
    case 'normal':
      return 'max-w-[90ch]';
    case 'focused':
    default:
      return 'max-w-[72ch]';
  }
};

const getTypographyClass = (lineWidth: LineWidth) => {
  if (lineWidth === 'focused') {
    return 'text-[18px] leading-[1.9] tracking-[0.01em]';
  }
  return 'text-lg leading-relaxed';
};

const BionicFlowReaderImpl: React.FC<BionicFlowReaderProps> = ({
  text,
  currentIndex,
  totalWords,
  bionicStrength,
  lineWidth,
  initialScrollPercent,
  onProgressIndex,
  onScrollPercentChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [paragraphMeta, setParagraphMeta] = useState<ParagraphMeta[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastComputedIndexRef = useRef(currentIndex);
  const lastEmittedIndexRef = useRef(currentIndex);
  const lastEmitAtRef = useRef(0);
  const pendingEmitIndexRef = useRef<number | null>(null);
  const pendingEmitTimerRef = useRef<number | null>(null);
  const lastEmittedPercentRef = useRef<number | null>(null);
  const lastPercentEmitAtRef = useRef(0);
  const pendingEmitPercentRef = useRef<number | null>(null);
  const pendingPercentTimerRef = useRef<number | null>(null);
  const suppressPersistRef = useRef(false);
  const hasAutoScrolledRef = useRef(false);
  const strengthMeasureTimeoutRef = useRef<number | null>(null);

  const paragraphs = useMemo(() => {
    return text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
      .filter((paragraph) => paragraph.length > 0);
  }, [text]);

  const paragraphWordCounts = useMemo(() => {
    return paragraphs.map((paragraph) => paragraph.split(/\s+/).filter(Boolean).length);
  }, [paragraphs]);

  const paragraphWordStarts = useMemo(() => {
    const starts: number[] = [];
    let running = 0;
    paragraphWordCounts.forEach((count) => {
      starts.push(running);
      running += count;
    });
    return starts;
  }, [paragraphWordCounts]);

  const paragraphTokens = useMemo(() => {
    return paragraphs.map((paragraph) => tokenize(paragraph));
  }, [paragraphs]);

  const measureParagraphs = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    const scrollTop = container.scrollTop;
    const meta: ParagraphMeta[] = [];

    paragraphs.forEach((_, index) => {
      const el = paragraphRefs.current[index];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      meta.push({
        top: rect.top - containerTop + scrollTop,
        height: rect.height,
        startIndex: paragraphWordStarts[index] || 0,
        wordCount: paragraphWordCounts[index] || 0,
      });
    });
    setParagraphMeta(meta);
  }, [paragraphs, paragraphWordStarts, paragraphWordCounts]);

  useEffect(() => {
    const handleResize = () => measureParagraphs();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureParagraphs]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureParagraphs);
    return () => window.cancelAnimationFrame(frame);
  }, [measureParagraphs, lineWidth, text]);

  useEffect(() => {
    if (strengthMeasureTimeoutRef.current) {
      window.clearTimeout(strengthMeasureTimeoutRef.current);
      strengthMeasureTimeoutRef.current = null;
    }
    // Bionic strength changes can subtly reflow line-wrapping (due to font weight changes).
    // Debounce measurement so dragging feels smooth.
    strengthMeasureTimeoutRef.current = window.setTimeout(() => {
      measureParagraphs();
      strengthMeasureTimeoutRef.current = null;
    }, 250);
    return () => {
      if (strengthMeasureTimeoutRef.current) {
        window.clearTimeout(strengthMeasureTimeoutRef.current);
        strengthMeasureTimeoutRef.current = null;
      }
    };
  }, [bionicStrength, measureParagraphs]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    // Reset scroll progress refs when text changes.
    lastComputedIndexRef.current = clamp(currentIndex, 0, Math.max(0, totalWords - 1));
    lastEmittedIndexRef.current = lastComputedIndexRef.current;
    lastEmitAtRef.current = 0;
    pendingEmitIndexRef.current = null;
    if (pendingEmitTimerRef.current) {
      window.clearTimeout(pendingEmitTimerRef.current);
      pendingEmitTimerRef.current = null;
    }
    lastEmittedPercentRef.current = null;
    lastPercentEmitAtRef.current = 0;
    pendingEmitPercentRef.current = null;
    if (pendingPercentTimerRef.current) {
      window.clearTimeout(pendingPercentTimerRef.current);
      pendingPercentTimerRef.current = null;
    }
  }, [text]);

  const scrollToTop = useCallback((top: number) => {
    const container = containerRef.current;
    if (!container) return;
    suppressPersistRef.current = true;
    container.scrollTo({ top, behavior: 'auto' });
    window.setTimeout(() => {
      suppressPersistRef.current = false;
    }, 200);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || paragraphMeta.length === 0 || hasAutoScrolledRef.current) return;

    const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
    if (initialScrollPercent !== null && initialScrollPercent !== undefined) {
      scrollToTop(maxScroll * clamp(initialScrollPercent, 0, 1));
      hasAutoScrolledRef.current = true;
      return;
    }

    if (totalWords <= 0) return;
    const targetIndex = clamp(currentIndex, 0, totalWords - 1);
    const match = paragraphMeta.find((meta) => {
      return targetIndex >= meta.startIndex && targetIndex < meta.startIndex + meta.wordCount;
    });

    if (match) {
      const offset = (targetIndex - match.startIndex) / Math.max(1, match.wordCount);
      const focusOffset = container.clientHeight * 0.3;
      const targetTop = clamp(match.top + match.height * offset - focusOffset, 0, maxScroll);
      scrollToTop(targetTop);
    } else {
      scrollToTop(0);
    }
    hasAutoScrolledRef.current = true;
  }, [paragraphMeta, initialScrollPercent, currentIndex, totalWords, scrollToTop]);

  const updateProgressFromScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || paragraphMeta.length === 0 || totalWords <= 0) return;

    const focusY = container.scrollTop + container.clientHeight * 0.3;
    let active = paragraphMeta[0];
    for (const meta of paragraphMeta) {
      if (focusY >= meta.top) {
        active = meta;
      } else {
        break;
      }
    }
    const progressInParagraph = clamp(
      (focusY - active.top) / Math.max(1, active.height),
      0,
      1
    );
    const nextIndex = clamp(
      active.startIndex + Math.floor(active.wordCount * progressInParagraph),
      0,
      totalWords - 1
    );

    lastComputedIndexRef.current = nextIndex;

    // Throttle progress emissions so scrolling doesn't hammer the parent state tree.
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const emitIndex = (idx: number) => {
      lastEmittedIndexRef.current = idx;
      lastEmitAtRef.current = now;
      pendingEmitIndexRef.current = null;
      onProgressIndex(idx);
    };

    const distance = Math.abs(nextIndex - lastEmittedIndexRef.current);
    const timeSince = now - lastEmitAtRef.current;
    if (distance >= 2 && timeSince >= 120) {
      emitIndex(nextIndex);
    } else {
      pendingEmitIndexRef.current = nextIndex;
      if (pendingEmitTimerRef.current === null) {
        pendingEmitTimerRef.current = window.setTimeout(() => {
          pendingEmitTimerRef.current = null;
          const pending = pendingEmitIndexRef.current;
          if (pending === null) return;
          // Emit a trailing update so the index settles correctly after scrolling stops.
          if (pending !== lastEmittedIndexRef.current) {
            onProgressIndex(pending);
            lastEmittedIndexRef.current = pending;
          }
          pendingEmitIndexRef.current = null;
        }, 140);
      }
    }

    if (onScrollPercentChange && !suppressPersistRef.current) {
      const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
      const pct = clamp(container.scrollTop / maxScroll, 0, 1);
      const lastPct = lastEmittedPercentRef.current;
      const pctNow = now;
      const pctTimeSince = pctNow - lastPercentEmitAtRef.current;
      const pctDistance = lastPct === null ? 1 : Math.abs(pct - lastPct);

      const emitPct = (value: number) => {
        lastEmittedPercentRef.current = value;
        lastPercentEmitAtRef.current = pctNow;
        pendingEmitPercentRef.current = null;
        onScrollPercentChange(value);
      };

      if (pctDistance >= 0.002 && pctTimeSince >= 120) {
        emitPct(pct);
      } else {
        pendingEmitPercentRef.current = pct;
        if (pendingPercentTimerRef.current === null) {
          pendingPercentTimerRef.current = window.setTimeout(() => {
            pendingPercentTimerRef.current = null;
            const pending = pendingEmitPercentRef.current;
            if (pending === null) return;
            onScrollPercentChange(pending);
            lastEmittedPercentRef.current = pending;
            pendingEmitPercentRef.current = null;
          }, 180);
        }
      }
    }
  }, [paragraphMeta, totalWords, onProgressIndex, onScrollPercentChange]);

  const handleScroll = () => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateProgressFromScroll();
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (pendingEmitTimerRef.current !== null) {
        window.clearTimeout(pendingEmitTimerRef.current);
        pendingEmitTimerRef.current = null;
      }
      if (pendingPercentTimerRef.current !== null) {
        window.clearTimeout(pendingPercentTimerRef.current);
        pendingPercentTimerRef.current = null;
      }
      if (strengthMeasureTimeoutRef.current !== null) {
        window.clearTimeout(strengthMeasureTimeoutRef.current);
        strengthMeasureTimeoutRef.current = null;
      }
    };
  }, []);

  const strength = clamp(bionicStrength, 0, 0.8);
  const widthClass = getWidthClass(lineWidth);
  const typographyClass = getTypographyClass(lineWidth);

  const renderedParagraphs = useMemo(() => {
    const paragraphStyle: React.CSSProperties = {
      // Isolate paragraphs to reduce layout/paint scope without affecting measurements.
      ...( { contain: 'content' } as any),
    };

    return paragraphs.map((paragraph, index) => {
      const tokens = paragraphTokens[index] || [];
      return (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          ref={(el) => {
            paragraphRefs.current[index] = el;
          }}
          className="mb-8 whitespace-pre-wrap"
          style={paragraphStyle}
        >
          {tokens.map((token, tokenIndex) => {
            if (token.type !== 'word') {
              return token.value;
            }
            const { bold, rest } = splitBionic(token.value, strength);
            if (!bold) {
              return (
                <span key={`${index}-${tokenIndex}`} className="text-text-primary/80">
                  {rest}
                </span>
              );
            }
            return (
              <React.Fragment key={`${index}-${tokenIndex}`}>
                <span className="font-semibold text-bionic-highlight/80">{bold}</span>
                <span className="text-text-primary/80">{rest}</span>
              </React.Fragment>
            );
          })}
        </p>
      );
    });
  }, [paragraphTokens, paragraphs, strength]);

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full min-h-0 overflow-y-auto px-8 pb-8 pt-24 sm:pt-28 lg:pt-32 scrollbar-thin scrollbar-thumb-text-primary/10 scrollbar-track-transparent"
      >
        <div className={`mx-auto w-full ${widthClass} font-header ${typographyClass} text-text-primary/70`}>
          {renderedParagraphs}
        </div>
      </div>
    </div>
  );
};

// Memoize to avoid re-rendering the giant text tree for tiny progress changes.
// We allow large index jumps (e.g. bookmark jumps) to re-render.
export const BionicFlowReader = React.memo(BionicFlowReaderImpl, (prev, next) => {
  if (prev.text !== next.text) return false;
  if (prev.totalWords !== next.totalWords) return false;
  if (prev.bionicStrength !== next.bionicStrength) return false;
  if (prev.lineWidth !== next.lineWidth) return false;
  if (prev.onProgressIndex !== next.onProgressIndex) return false;
  if (prev.onScrollPercentChange !== next.onScrollPercentChange) return false;

  // Ignore small index changes (typically caused by scroll progress updates).
  // Still re-render for larger jumps so external seeks can take effect.
  const jump = Math.abs((prev.currentIndex ?? 0) - (next.currentIndex ?? 0));
  if (jump >= 25) return false;
  return true;
});

BionicFlowReader.displayName = 'BionicFlowReader';
