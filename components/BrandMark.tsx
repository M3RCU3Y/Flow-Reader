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
        <radialGradient
          id="flow-bg"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(22 16) rotate(50) scale(46)"
        >
          <stop stopColor="#28242D" />
          <stop offset="0.58" stopColor="#16141C" />
          <stop offset="1" stopColor="#0D0C12" />
        </radialGradient>
        <radialGradient
          id="flow-halo"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(32 32) rotate(90) scale(28)"
        >
          <stop stopColor="#FFB9A3" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FFB9A3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flow-stroke" x1="20" y1="16" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE2D3" />
          <stop offset="0.42" stopColor="#FFA487" />
          <stop offset="1" stopColor="#FF6E73" />
        </linearGradient>
        <linearGradient id="flow-detail" x1="30" y1="26" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD5C3" />
          <stop offset="1" stopColor="#FF9A7E" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="28" fill="url(#flow-bg)" />
      <circle cx="32" cy="32" r="28" fill="url(#flow-halo)" />
      <path
        d="M17.5 32C17.5 23.6 24.2 16.4 33 16.4C41.1 16.4 46.5 21.1 46.5 27.2C46.5 32.1 43.3 35.7 37.4 37.2L43.9 44.3"
        stroke="url(#flow-stroke)"
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.6 20.4V44.4"
        stroke="url(#flow-stroke)"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <path
        d="M21.6 30.6H35.2"
        stroke="url(#flow-detail)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M18 32C18 40.7 24.7 47.6 33.1 47.6C36.2 47.6 39 46.7 41.4 45.1"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
};
