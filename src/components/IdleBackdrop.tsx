import React from 'react';

export const IdleBackdrop: React.FC = () => {
  return (
    <div className="quiet-current pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="quiet-current__base" />
      <div className="quiet-current__light quiet-current__light--warm" />
      <div className="quiet-current__light quiet-current__light--cool" />

      <svg
        className="quiet-current__lines quiet-current__motion"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <linearGradient id="quiet-current-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(var(--color-text-primary))" stopOpacity="0" />
            <stop offset="20%" stopColor="rgb(var(--color-text-primary))" stopOpacity="0.08" />
            <stop offset="51%" stopColor="rgb(var(--color-accent))" stopOpacity="0.16" />
            <stop offset="80%" stopColor="rgb(var(--color-text-primary))" stopOpacity="0.055" />
            <stop offset="100%" stopColor="rgb(var(--color-text-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="quiet-current__line-group quiet-current__line-group--primary">
          <path d="M-120 298 C 250 214, 472 352, 784 310 S 1242 204, 1720 318" />
          <path d="M-100 434 C 262 372, 520 478, 818 426 S 1270 340, 1700 442" />
        </g>

        <g className="quiet-current__line-group quiet-current__line-group--secondary">
          <path d="M-140 592 C 214 516, 486 626, 808 566 S 1262 484, 1740 606" />
        </g>
      </svg>

      <div className="quiet-current__trace quiet-current__motion">
        attention&nbsp;&nbsp;·&nbsp;&nbsp;comprehension&nbsp;&nbsp;·&nbsp;&nbsp;memory
      </div>
      <div className="quiet-current__paper" />
      <div className="quiet-current__vignette" />
    </div>
  );
};
