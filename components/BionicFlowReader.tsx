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

export const BionicFlowReader: React.FC<BionicFlowReaderProps> = ({
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
  const lastIndexRef = useRef(currentIndex);
  const suppressPersistRef = useRef(false);
  const hasAutoScrolledRef = useRef(false);

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
  }, [measureParagraphs, lineWidth, bionicStrength, text]);

  useEffect(() => {
    lastIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
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

    if (nextIndex !== lastIndexRef.current) {
      lastIndexRef.current = nextIndex;
      onProgressIndex(nextIndex);
    }

    if (onScrollPercentChange && !suppressPersistRef.current) {
      const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
      onScrollPercentChange(clamp(container.scrollTop / maxScroll, 0, 1));
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
    };
  }, []);

  const strength = clamp(bionicStrength, 0, 0.8);
  const widthClass = getWidthClass(lineWidth);
  const typographyClass = getTypographyClass(lineWidth);

  return (
    <div className="h-full w-full min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full min-h-0 overflow-y-auto px-8 pb-8 pt-24 sm:pt-28 lg:pt-32 scrollbar-thin scrollbar-thumb-text-primary/10 scrollbar-track-transparent"
      >
        <div className={`mx-auto w-full ${widthClass} font-header ${typographyClass} text-text-primary/70`}>
          {paragraphs.map((paragraph, index) => {
            const tokens = paragraphTokens[index] || [];
            return (
              <p
                key={`${index}-${paragraph.slice(0, 24)}`}
                ref={(el) => {
                  paragraphRefs.current[index] = el;
                }}
                className="mb-8 whitespace-pre-wrap"
              >
                {tokens.map((token, tokenIndex) => {
                  if (token.type !== 'word') {
                    return (
                      <span key={`${index}-${tokenIndex}`}>{token.value}</span>
                    );
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
                    <span key={`${index}-${tokenIndex}`}>
                      <span className="font-semibold text-bionic-highlight/80">{bold}</span>
                      <span className="text-text-primary/80">{rest}</span>
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};
