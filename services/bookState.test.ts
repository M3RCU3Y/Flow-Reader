import { describe, expect, it } from 'vitest';
import { getBookSourceLabel, matchesSourceFilter, prepareRestartedBook } from './bookState';
import type { Book } from '../types';

const baseBook: Book = {
  id: 'book-1',
  title: 'USB Host Debugging',
  text: 'one two three',
  words: ['one', 'two', 'three'],
  progressIndex: 2,
  createdAt: 1,
  lastReadAt: 2,
  settings: {
    bionicScrollPercent: 0.7,
    sourceMeta: {
      sourceType: 'url',
      sourceUrl: 'https://example.com/post',
    },
  },
};

describe('bookState helpers', () => {
  it('prepares a restarted book from the top without losing metadata', () => {
    const restarted = prepareRestartedBook(baseBook);
    expect(restarted.progressIndex).toBe(0);
    expect(restarted.settings?.bionicScrollPercent).toBeUndefined();
    expect(restarted.settings?.sourceMeta).toEqual(baseBook.settings?.sourceMeta);
    expect(baseBook.progressIndex).toBe(2);
  });

  it('matches source filters and labels correctly', () => {
    expect(matchesSourceFilter(baseBook, 'url')).toBe(true);
    expect(matchesSourceFilter(baseBook, 'pdf')).toBe(false);
    expect(getBookSourceLabel('docx')).toBe('DOCX');
    expect(getBookSourceLabel('all')).toBe('All');
  });
});
