import React from 'react';
import { Play, Pause } from 'lucide-react';

interface ControlCenterProps {
  isPlaying: boolean;
  onToggle: () => void;
  wpm: number;
  setWpm: (wpm: number) => void;
  progress: number;
  total: number;
  onSeek: (index: number) => void;
}

export const ControlCenter: React.FC<ControlCenterProps> = ({
  isPlaying,
  onToggle,
  wpm,
  setWpm,
  progress,
  total,
  onSeek
}) => {
  
  // Calculate remaining time
  const wordsLeft = total - progress;
  const minutesLeft = Math.ceil(wordsLeft / wpm);

  return (
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
             />
           </div>
        </div>

      </div>
    </div>
  );
};
