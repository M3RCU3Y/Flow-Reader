import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="flow-bg" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26262B" />
          <stop offset="1" stopColor="#121216" />
        </linearGradient>
        <linearGradient id="flow-mark" x1="21" y1="17" x2="39" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE6D7" />
          <stop offset="0.52" stopColor="#FFB191" />
          <stop offset="1" stopColor="#FF7C68" />
        </linearGradient>
      </defs>

      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#flow-bg)" />
      <path
        d="M23 18.5V45.5"
        stroke="url(#flow-mark)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M23 21.5H36.5"
        stroke="url(#flow-mark)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M23 31.8H34"
        stroke="url(#flow-mark)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M16 45.5C21.2 41.8 26.5 40 32 40C37.5 40 42.8 41.8 48 45.5"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
