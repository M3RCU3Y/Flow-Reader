import React from 'react';
import { Play, Pause } from 'lucide-react';
import type { ContextStrength } from '../types';

const CONTEXT_STRENGTHS: Array<{ value: ContextStrength; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
];

interface ControlCenterProps {
  isPlaying: boolean;
  onToggle: () => void;
  wpm: number;
  setWpm: (wpm: number) => void;
  progress: number;
  total: number;
  onSeek: (index: number) => void;
  contextStrength?: ContextStrength;
  onContextStrengthChange?: (strength: ContextStrength) => void;
  smartTimingEnabled?: boolean;
  comfortModeEnabled?: boolean;
  onSmartTimingChange?: (enabled: boolean) => void;
  onComfortModeChange?: (enabled: boolean) => void;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  isPlaying,
  onToggle,
  wpm,
  setWpm,
  progress,
  total,
  onSeek,
  contextStrength,
  onContextStrengthChange,
  smartTimingEnabled,
  comfortModeEnabled,
  onSmartTimingChange,
  onComfortModeChange
		}) => {
	  const [toast, setToast] = React.useState<{ id: number; text: string } | null>(null);

	  const showToast = React.useCallback((text: string) => {
	    setToast({ id: Date.now(), text });
	  }, []);

	  React.useEffect(() => {
	    if (!toast) return;
	    const t = window.setTimeout(() => setToast(null), 2200);
	    return () => window.clearTimeout(t);
	  }, [toast?.id]);
	  
	  // Calculate remaining time
	  const wordsLeft = total - progress;
	  const minutesLeft = Math.ceil(wordsLeft / wpm);

	  return (
	    <>
	      <div className="w-full bg-panel-bg/50 backdrop-blur-sm border border-text-primary/5 rounded-2xl p-4 sm:p-6 shadow-2xl">
      
      {/* Progress Scrubber */}
      <div className="mb-6 group">
        <div className="flex justify-between text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
           <span>Progress</span>
           <span>{minutesLeft}m left</span>
        </div>
        <input 
          type="range"
          min="0"
          max={total}
          value={progress}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-1 bg-text-primary/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-progress hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-all"
        />
      </div>

	      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Play Controls */}
        <div className="flex items-center gap-4">
           <button 
             onClick={onToggle}
             className="w-12 h-12 shrink-0 flex items-center justify-center bg-text-primary text-app-bg rounded-full hover:bg-accent-red hover:text-white transition-all shadow-glow"
             aria-label={isPlaying ? 'Pause' : 'Play'}
           >
             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
           </button>
           <div className="text-xs text-text-secondary font-mono">
             {progress} / {total} w
           </div>
        </div>

        {/* WPM Slider */}
           <div className="flex items-center gap-3 sm:gap-4 min-w-0">
           <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Speed</span>
           <div className="flex flex-1 items-center gap-3 bg-app-bg/50 px-4 py-2 rounded-lg border border-text-primary/5 min-w-0">
             <span className="text-sm font-mono w-12 text-center text-text-primary">{wpm}</span>
             <input
               type="range"
               min="100"
               max="1000"
               step="10"
               value={wpm}
               onChange={(e) => setWpm(parseInt(e.target.value))}
               className="flex-1 h-1 bg-text-primary/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text-primary hover:[&::-webkit-slider-thumb]:bg-accent-red"
               aria-label="Speed (WPM)"
             />
           </div>
        </div>

      </div>

	      {(typeof smartTimingEnabled === 'boolean' ||
	        typeof comfortModeEnabled === 'boolean' ||
	        (typeof contextStrength === 'string' && typeof onContextStrengthChange === 'function')) && (
	        <div className="mt-4 text-xs">
	          <div className="flex flex-wrap items-center gap-2">
	            <div className="flex flex-wrap items-center gap-2">
	              {typeof smartTimingEnabled === 'boolean' && (
	                <button
	                  type="button"
	                  role="switch"
	                  aria-checked={smartTimingEnabled}
	                  onClick={() => {
	                    const next = !smartTimingEnabled;
	                    onSmartTimingChange?.(next);
	                    if (next) showToast('Smart timing on: pauses for punctuation and paragraphs.');
	                  }}
	                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:border-accent-red/60 focus-visible:shadow-glow ${
	                    smartTimingEnabled
	                      ? 'bg-accent-red/15 border-accent-red/30 text-text-primary shadow-glow'
	                      : 'bg-text-primary/5 border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/20'
	                  }`}
	                >
	                  <span
	                    aria-hidden="true"
	                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${
	                      smartTimingEnabled ? 'bg-accent-red border-accent-red' : 'bg-transparent border-text-primary/20'
	                    }`}
	                  />
	                  Smart timing
	                </button>
	              )}
	              {typeof comfortModeEnabled === 'boolean' && (
	                <button
	                  type="button"
	                  role="switch"
	                  aria-checked={comfortModeEnabled}
	                  onClick={() => {
	                    const next = !comfortModeEnabled;
	                    onComfortModeChange?.(next);
	                    if (next) showToast('Comfort mode on: ramps up smoothly and eases after rewinds.');
	                  }}
	                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:border-accent-red/60 focus-visible:shadow-glow ${
	                    comfortModeEnabled
	                      ? 'bg-accent-red/15 border-accent-red/30 text-text-primary shadow-glow'
	                      : 'bg-text-primary/5 border-text-primary/10 text-text-secondary hover:text-text-primary hover:border-text-primary/20'
	                  }`}
	                >
	                  <span
	                    aria-hidden="true"
	                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${
	                      comfortModeEnabled ? 'bg-accent-red border-accent-red' : 'bg-transparent border-text-primary/20'
	                    }`}
	                  />
	                  Comfort mode
	                </button>
	              )}
	            </div>

	            {typeof contextStrength === 'string' && typeof onContextStrengthChange === 'function' && (
	              <div className="ml-auto flex items-center">
	                <div className="flex items-center gap-3 rounded-full border border-text-primary/10 bg-panel-bg/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary shadow-xl backdrop-blur-md">
	                  <span className="font-semibold">Context</span>
	                  <div className="flex items-center gap-1 rounded-full bg-text-primary/5 p-1">
	                    {CONTEXT_STRENGTHS.map((item) => (
	                      <button
	                        key={item.value}
	                        type="button"
	                        onClick={() => onContextStrengthChange(item.value)}
	                        className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
	                          contextStrength === item.value
	                            ? 'bg-accent-red/15 text-text-primary border border-accent-red/30 shadow-glow'
	                            : 'text-text-secondary hover:text-text-primary'
	                        }`}
	                      >
	                        {item.label}
	                      </button>
	                    ))}
	                  </div>
	                </div>
	              </div>
	            )}
	          </div>
	        </div>
	      )}
	    </div>
	    {toast && (
	      <div
	        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
	        className="fixed left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-full bg-panel-bg/85 backdrop-blur-md border border-text-primary/10 shadow-2xl text-xs text-text-primary animate-in fade-in slide-in-from-bottom-2 duration-200"
	        role="status"
	        aria-live="polite"
	      >
	        {toast.text}
	      </div>
	    )}
	  </>
	  );
	};
