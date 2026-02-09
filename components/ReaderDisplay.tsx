import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ContextStrength } from '../types';

interface ReaderDisplayProps {
  word: string;
  prevWord?: string;
  nextWord?: string;
  showContext?: boolean;
  contextStrength?: ContextStrength;
  fitToWidth?: boolean;
}

const CONTEXT_STYLES: Record<
  ContextStrength,
  { opacity: number; scale: number; blur: number; gap: number; laneWidth: number }
> = {
  low: { opacity: 0.12, scale: 0.78, blur: 0.3, gap: 240, laneWidth: 240 },
  medium: { opacity: 0.2, scale: 0.84, blur: 0.2, gap: 220, laneWidth: 280 },
  high: { opacity: 0.28, scale: 0.9, blur: 0.2, gap: 200, laneWidth: 320 },
};

export const ReaderDisplay: React.FC<ReaderDisplayProps> = ({
  word,
  prevWord,
  nextWord,
  showContext = false,
  contextStrength = 'medium',
  fitToWidth = false,
}) => {
  // Logic to process the word
  const getPivotIndex = (w: string) => {
    const len = w.length;
    if (len === 1) return 0;
    // Standard ORP is slightly to the left of center for long words, 
    // but "middle letter" is requested.
    return Math.floor((len - 1) / 2);
  };

  const safeWord = word || '';
  const pivotIndex = safeWord ? getPivotIndex(safeWord) : 0;
  const leftPart = safeWord.slice(0, pivotIndex);
  const pivotChar = safeWord[pivotIndex] || '';
  const rightPart = safeWord.slice(pivotIndex + 1);
  const context = CONTEXT_STYLES[contextStrength];
  const fadeLeftMask = 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1) 28px)';
  const fadeRightMask = 'linear-gradient(to left, rgba(0,0,0,0), rgba(0,0,0,1) 28px)';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const recomputeScale = () => {
    if (!fitToWidth) {
      setScale(1);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth, scrollWidth } = el;
    if (clientWidth <= 0 || scrollWidth <= 0) return;
    if (scrollWidth <= clientWidth) {
      setScale(1);
      return;
    }
    const next = Math.max(0.65, Math.min(1, clientWidth / scrollWidth));
    setScale(next);
  };

  useLayoutEffect(() => {
    // Measure after render so long words can be scaled down without shifting the pivot.
    const frame = window.requestAnimationFrame(recomputeScale);
    return () => window.cancelAnimationFrame(frame);
  }, [safeWord, leftPart, rightPart, pivotChar, fitToWidth]);

  useEffect(() => {
    if (!fitToWidth) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recomputeScale());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToWidth]);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Guides (Optional, keeping it clean for High-End look) */}
      <div
        ref={containerRef}
        className="relative flex items-baseline justify-center w-full max-w-4xl text-[clamp(44px,14vw,64px)] leading-none font-header font-bold text-text-primary overflow-visible"
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center',
        }}
      >
          
          {/* Top and Bottom Focus bars - subtle */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-accent-red/20 -translate-x-1/2 hidden" /> 
          
          <div className="flex items-baseline w-full">
            <span className="flex-1 text-right">{leftPart}</span>
            <span className="text-accent-red mx-0.5 transform">{pivotChar}</span>
            <span className="flex-1 text-left">{rightPart}</span>
          </div>

          {showContext && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute right-1/2 top-1/2 -translate-y-1/2"
                style={{
                  transform: `translateX(-${context.gap}px) translateY(-50%)`,
                }}
                aria-hidden="true"
              >
                <div
                  className="overflow-hidden whitespace-nowrap text-right"
                  style={{
                    width: `${context.laneWidth}px`,
                    WebkitMaskImage: fadeLeftMask,
                    maskImage: fadeLeftMask,
                  }}
                >
                  <span
                    className="inline-block text-[36px] font-header font-semibold text-text-primary/80 transition-all duration-200 ease-out"
                    style={{
                      opacity: prevWord ? context.opacity : 0,
                      filter: context.blur ? `blur(${context.blur}px)` : undefined,
                      transform: `scale(${context.scale})`,
                      transformOrigin: 'right center',
                    }}
                  >
                    {prevWord || ''}
                  </span>
                </div>
              </div>

              <div
                className="absolute left-1/2 top-1/2 -translate-y-1/2"
                style={{
                  transform: `translateX(${context.gap}px) translateY(-50%)`,
                }}
                aria-hidden="true"
              >
                <div
                  className="overflow-hidden whitespace-nowrap text-left"
                  style={{
                    width: `${context.laneWidth}px`,
                    WebkitMaskImage: fadeRightMask,
                    maskImage: fadeRightMask,
                  }}
                >
                  <span
                    className="inline-block text-[36px] font-header font-semibold text-text-primary/80 transition-all duration-200 ease-out"
                    style={{
                      opacity: nextWord ? context.opacity : 0,
                      filter: context.blur ? `blur(${context.blur}px)` : undefined,
                      transform: `scale(${context.scale})`,
                      transformOrigin: 'left center',
                    }}
                  >
                    {nextWord || ''}
                  </span>
                </div>
              </div>
            </div>
          )}
          
      </div>
    </div>
  );
};
