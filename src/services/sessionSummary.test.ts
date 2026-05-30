import { describe, expect, it } from 'vitest';
import { buildSessionSummary, MIN_MEANINGFUL_SESSION_MS } from './sessionSummary';

describe('buildSessionSummary', () => {
  it('returns null for a trivial session', () => {
    const summary = buildSessionSummary({
      bookId: 'book-1',
      startedAt: 100,
      endedAt: 100 + MIN_MEANINGFUL_SESSION_MS - 1,
      wordsRead: 0,
      currentWpm: 320,
      wpmSamples: [],
      rewinds: 0,
      bookmarksAdded: 0,
      notesAdded: 0,
      makeId: () => 'summary-1',
    });

    expect(summary).toBeNull();
  });

  it('builds a summary for meaningful reading activity', () => {
    const summary = buildSessionSummary({
      bookId: 'book-1',
      startedAt: 100,
      endedAt: 5100,
      wordsRead: 180,
      currentWpm: 320,
      wpmSamples: [300, 330, 360],
      rewinds: 2,
      bookmarksAdded: 1,
      notesAdded: 1,
      makeId: () => 'summary-2',
    });

    expect(summary).toEqual({
      id: 'summary-2',
      bookId: 'book-1',
      startedAt: 100,
      endedAt: 5100,
      wordsRead: 180,
      avgWpm: 330,
      rewinds: 2,
      bookmarksAdded: 1,
      notesAdded: 1,
    });
  });

  it('keeps short but intentional sessions when the user saved something', () => {
    const summary = buildSessionSummary({
      bookId: 'book-1',
      startedAt: 100,
      endedAt: 500,
      wordsRead: 0,
      currentWpm: 280,
      wpmSamples: [],
      rewinds: 0,
      bookmarksAdded: 1,
      notesAdded: 0,
      makeId: () => 'summary-3',
    });

    expect(summary?.id).toBe('summary-3');
    expect(summary?.bookmarksAdded).toBe(1);
  });
});
