import React from 'react';

const WEATHER_WORDS = [
  { text: 'remember', className: 'reading-weather__word reading-weather__word--remember' },
  { text: 'focus', className: 'reading-weather__word reading-weather__word--focus' },
  { text: 'meaning', className: 'reading-weather__word reading-weather__word--meaning' },
  { text: 'read', className: 'reading-weather__word reading-weather__word--read' },
  { text: '¶', className: 'reading-weather__word reading-weather__word--mark' },
] as const;

export const IdleBackdrop: React.FC = () => {
  return (
    <div className="reading-weather pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="reading-weather__base" />
      <div className="reading-weather__ink reading-weather__ink--warm" />
      <div className="reading-weather__ink reading-weather__ink--cool" />

      <div className="reading-weather__typography">
        {WEATHER_WORDS.map((word) => (
          <span key={word.text} className={word.className}>
            {word.text}
          </span>
        ))}
        <p className="reading-weather__paragraph">
          attention becomes rhythm · rhythm becomes comprehension · comprehension settles into memory
        </p>
      </div>

      <div className="reading-weather__currents">
        <span className="reading-weather__current reading-weather__current--one" />
        <span className="reading-weather__current reading-weather__current--two" />
        <span className="reading-weather__current reading-weather__current--three" />
      </div>

      <div className="reading-weather__paper" />
      <div className="reading-weather__vignette" />
    </div>
  );
};
