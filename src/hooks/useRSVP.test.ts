import { describe, expect, it } from 'vitest';
import { parseWords } from './useRSVP';

describe('RSVP paragraph timing tokens', () => {
  it.each(['\n\n', '\r\n\r\n', '\r\r', '\n \t\n', '\r\n  \r\n'])
    ('marks the next paragraph after a blank line %j', (separator) => {
      expect(parseWords(`First sentence.${separator}Next paragraph.`)).toEqual([
        { w: 'First', paragraphStart: true },
        { w: 'sentence.', paragraphStart: false },
        { w: 'Next', paragraphStart: true },
        { w: 'paragraph.', paragraphStart: false },
      ]);
    });

  it('keeps ordinary wrapped lines in the same paragraph', () => {
    expect(parseWords('Wrapped\r\ntext with\nnewlines')).toEqual([
      { w: 'Wrapped', paragraphStart: true },
      { w: 'text', paragraphStart: false },
      { w: 'with', paragraphStart: false },
      { w: 'newlines', paragraphStart: false },
    ]);
  });
});
