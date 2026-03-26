import React from 'react';

export const IdleBackdrop: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018)_0%,rgba(255,255,255,0.004)_18%,transparent_42%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.04),transparent_30%)]" />

      <svg
        className="absolute inset-0 h-full w-full idle-backdrop-svg"
        viewBox="0 0 1600 1100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="idle-warm-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,240,232,0.85)" />
            <stop offset="32%" stopColor="rgba(255,168,145,0.42)" />
            <stop offset="72%" stopColor="rgba(255,110,92,0.12)" />
            <stop offset="100%" stopColor="rgba(255,110,92,0)" />
          </radialGradient>
          <radialGradient id="idle-warm-side" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,188,170,0.42)" />
            <stop offset="52%" stopColor="rgba(255,120,96,0.14)" />
            <stop offset="100%" stopColor="rgba(255,120,96,0)" />
          </radialGradient>
          <radialGradient id="idle-pearl" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="idle-blur-xl" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="82" />
          </filter>
          <filter id="idle-blur-lg" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="54" />
          </filter>
          <filter id="idle-noise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="idle-mask" cx="50%" cy="34%" r="62%">
            <stop offset="0%" stopColor="white" />
            <stop offset="58%" stopColor="rgba(255,255,255,0.72)" />
            <stop offset="88%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <mask id="idle-focus-mask">
            <rect width="1600" height="1100" fill="url(#idle-mask)" />
          </mask>
        </defs>

        <g mask="url(#idle-focus-mask)">
          <g className="idle-blob idle-blob-a" filter="url(#idle-blur-xl)">
            <path
              d="M470 310C560 216 764 174 920 224C1074 274 1178 400 1142 520C1106 642 930 724 744 706C560 688 368 570 356 444C348 396 390 350 470 310Z"
              fill="url(#idle-warm-core)"
            />
          </g>

          <g className="idle-blob idle-blob-b" filter="url(#idle-blur-lg)">
            <path
              d="M982 360C1060 310 1180 312 1258 374C1332 434 1368 542 1326 618C1286 692 1172 726 1068 704C964 680 866 598 854 508C846 446 894 404 982 360Z"
              fill="url(#idle-warm-side)"
            />
          </g>

          <g className="idle-blob idle-blob-c" filter="url(#idle-blur-lg)">
            <path
              d="M544 494C630 446 754 450 834 500C912 548 940 626 906 688C870 752 770 790 666 780C560 770 436 718 408 638C384 570 448 548 544 494Z"
              fill="url(#idle-pearl)"
            />
          </g>

          <g className="idle-sheen" filter="url(#idle-blur-lg)">
            <ellipse cx="804" cy="254" rx="212" ry="108" fill="rgba(255,255,255,0.12)" />
          </g>

          <g className="idle-vignette-soft" filter="url(#idle-blur-xl)">
            <ellipse cx="804" cy="572" rx="620" ry="340" fill="rgba(255,120,96,0.035)" />
          </g>
        </g>

        <rect width="1600" height="1100" filter="url(#idle-noise)" opacity="0.28" />
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,transparent_0%,rgba(15,15,16,0.08)_44%,rgba(15,15,16,0.52)_82%,rgba(15,15,16,0.9)_100%)]" />
    </div>
  );
};
