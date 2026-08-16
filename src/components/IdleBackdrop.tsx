import React from 'react';

export const IdleBackdrop: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018)_0%,rgba(255,255,255,0.004)_22%,transparent_44%),radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.045),transparent_27%)]" />
      <div className="idle-grid" />
      <div className="idle-orbit" />
      <div className="idle-light idle-light-left" />
      <div className="idle-light idle-light-center" />
      <div className="idle-light idle-light-right" />
      <div className="idle-light idle-light-floor" />
      <div className="idle-sheen-strip" />
      <div className="idle-grain" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,transparent_0%,rgba(11,11,13,0.035)_44%,rgba(11,11,13,0.32)_80%,rgba(11,11,13,0.76)_100%)]" />
    </div>
  );
};
