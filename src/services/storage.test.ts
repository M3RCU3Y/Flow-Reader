import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReaderPreferences, saveReaderPreferences } from './preferences';
import { appendSessionSummary, getAllSessionSummaries, getLibrary, saveBook, updateBookProgress } from './storage';
import type { Book, SessionSummary } from '../types';

const book: Book = {
  id: 'saved-book',
  title: 'A saved article',
  text: 'one two three',
  words: ['one', 'two', 'three'],
  progressIndex: 1,
  createdAt: 10,
  lastReadAt: 20,
  settings: {
    mode: 'bionic_flow',
    bionicStrength: 0.6,
    sourceMeta: { sourceType: 'url', sourceUrl: 'https://example.com/article' },
    bookmarks: [{ id: 'bookmark-1', index: 1, note: 'Keep this', createdAt: 30 }],
    notes: [{ id: 'note-1', index: 2, text: 'A useful detail', createdAt: 30, updatedAt: 40 }],
  },
};

const summary: SessionSummary = {
  id: 'session-1', bookId: book.id, startedAt: 100, endedAt: 2000,
  wordsRead: 3, avgWpm: 300, rewinds: 0, bookmarksAdded: 1, notesAdded: 0,
};

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('stored reader preferences', () => {
  it('preserves deliberate mode and disabled timing choices through reloads', () => {
    const preferences = {
      ...getReaderPreferences(), lastMode: 'rsvp_enhanced' as const,
      smartTimingEnabled: false, comfortModeEnabled: false,
    };
    saveReaderPreferences(preferences);
    expect(getReaderPreferences()).toEqual(preferences);
  });

  it('recovers invalid settings while keeping the usable preferences', () => {
    localStorage.setItem('focus_reader_prefs', JSON.stringify({
      lastMode: 'missing-mode', contextStrength: null, lineWidth: {},
      bionicStrength: 15, bionicFontSize: -3, smartTimingEnabled: 'false', comfortModeEnabled: false,
    }));
    expect(getReaderPreferences()).toEqual({
      lastMode: 'rsvp', contextStrength: 'medium', lineWidth: 'normal',
      bionicStrength: 0.8, bionicFontSize: 18, smartTimingEnabled: true, comfortModeEnabled: false,
    });
  });

  it.each([null, [], 'legacy'])('falls back safely when preferences have the wrong shape: %j', (value) => {
    const defaults = getReaderPreferences();
    localStorage.setItem('focus_reader_prefs', JSON.stringify(value));
    expect(getReaderPreferences()).toEqual(defaults);
  });
});

describe('stored library recovery', () => {
  it.each([null, {}, 'legacy'])('does not crash on a non-array library: %j', (value) => {
    localStorage.setItem('focus_reader_library', JSON.stringify(value));
    expect(getLibrary()).toEqual([]);
  });

  it('retains valid books and their notes even when another entry is damaged', () => {
    localStorage.setItem('focus_reader_library', JSON.stringify([null, {}, book, { id: 'bad', text: 12 }]));
    const library = getLibrary();
    expect(library).toHaveLength(1);
    expect(library[0]).toMatchObject(book);
    updateBookProgress(book.id, 2);
    expect(getLibrary()[0]).toMatchObject({ ...book, progressIndex: 2, lastReadAt: expect.any(Number) });
  });

  it.each([null, [], [123]])('rebuilds invalid words %j and bounds reader progress', (words) => {
    localStorage.setItem('focus_reader_library', JSON.stringify([{ ...book, words, progressIndex: 999 }]));
    expect(getLibrary()[0]).toMatchObject({ words: ['one', 'two', 'three'], progressIndex: 2 });
  });

  it('drops malformed annotations and resets unusable per-book settings', () => {
    localStorage.setItem('focus_reader_library', JSON.stringify([{ ...book, settings: {
      ...book.settings, mode: 'missing-mode', bionicFontSize: 'huge', bionicScrollPercent: 4,
      bookmarks: [null, book.settings!.bookmarks![0]],
      notes: [{ id: 'bad-note', index: 0, text: null }, book.settings!.notes![0]],
    } }]));
    const recovered = getLibrary()[0];
    expect(recovered.settings?.mode).toBeUndefined();
    expect(recovered.settings?.bionicFontSize).toBeUndefined();
    expect(recovered.settings?.bionicScrollPercent).toBe(1);
    expect(recovered.settings?.bookmarks).toEqual(book.settings!.bookmarks);
    expect(recovered.settings?.notes).toEqual(book.settings!.notes);
  });

  it('can still save a fresh book after reading a damaged library', () => {
    localStorage.setItem('focus_reader_library', 'null');
    saveBook(book);
    expect(getLibrary()[0]).toMatchObject({ ...book, lastReadAt: expect.any(Number) });
  });
});

describe('stored session summaries', () => {
  it.each([null, {}, 'legacy'])('recovers from a non-array history: %j', (value) => {
    localStorage.setItem('focus_reader_session_summaries', JSON.stringify(value));
    expect(getAllSessionSummaries()).toEqual([]);
    appendSessionSummary(summary);
    expect(getAllSessionSummaries()).toEqual([summary]);
  });

  it('keeps complete summaries sorted and omits corrupt statistics', () => {
    const latest = { ...summary, id: 'session-2', endedAt: 3000 };
    localStorage.setItem('focus_reader_session_summaries', JSON.stringify([
      null, summary, { bookId: book.id }, { ...summary, wordsRead: '3' }, latest,
    ]));
    expect(getAllSessionSummaries()).toEqual([latest, summary]);
  });
});
