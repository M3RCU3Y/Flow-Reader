import React, { useId } from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-8 h-8' }) => {
  const instanceId = useId().replace(/:/g, '');
  const bgId = `flow-bg-${instanceId}`;
  const markId = `flow-mark-${instanceId}`;
  const glowId = `flow-glow-${instanceId}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="10" y1="8" x2="55" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#29292F" />
          <stop offset="0.48" stopColor="#19191E" />
          <stop offset="1" stopColor="#0D0D10" />
        </linearGradient>
        <linearGradient id={markId} x1="18" y1="15" x2="46" y2="49" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF5EF" />
          <stop offset="0.42" stopColor="#FFC1A8" />
          <stop offset="1" stopColor="#FF6F6F" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(33 29) rotate(90) scale(24)">
          <stop stopColor="#FF8A7E" stopOpacity="0.2" />
          <stop offset="1" stopColor="#FF8A7E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="5.5" y="5.5" width="53" height="53" rx="17" fill={`url(#${bgId})`} />
      <rect x="6" y="6" width="52" height="52" rx="16.5" stroke="rgba(255,255,255,0.09)" />
      <circle cx="33" cy="29" r="24" fill={`url(#${glowId})`} />

      <path
        d="M20.5 43.8V20.2C20.5 18.7 21.7 17.5 23.2 17.5H40.8"
        stroke={`url(#${markId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 30.8H36.2"
        stroke={`url(#${markId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M17 46.5C22.2 41.9 27.2 40 32.4 40C37.8 40 42.6 42 47.6 46.5"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13.8 49.5C20.2 43.4 26.2 41.1 32.6 41.1C39 41.1 44.9 43.5 50.2 48.5"
        stroke="rgba(255,124,104,0.12)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="45.2" cy="18.6" r="1.8" fill="#FFC4AE" />
      <circle cx="45.2" cy="18.6" r="4.8" fill="#FF806F" opacity="0.08" />
    </svg>
  );
};
