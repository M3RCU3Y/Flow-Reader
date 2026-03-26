import React from 'react';

export const IdleBackdrop: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.006)_18%,transparent_40%),radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.038),transparent_28%)]" />
      <div className="idle-light idle-light-left" />
      <div className="idle-light idle-light-center" />
      <div className="idle-light idle-light-right" />
      <div className="idle-light idle-light-floor" />
      <div className="idle-sheen-strip" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,transparent_0%,rgba(15,15,16,0.05)_46%,rgba(15,15,16,0.36)_82%,rgba(15,15,16,0.74)_100%)]" />
    </div>
  );
};
