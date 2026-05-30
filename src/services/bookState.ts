import { Book, SourceType } from '../types';

export type LibrarySourceFilter = 'all' | SourceType;

export const BOOK_SOURCE_LABELS: Record<SourceType, string> = {
  paste: 'Paste',
  pdf: 'PDF',
  docx: 'DOCX',
  url: 'URL',
};

export const LIBRARY_SOURCE_FILTERS: LibrarySourceFilter[] = ['all', 'paste', 'pdf', 'docx', 'url'];

export const getBookSourceType = (book: Book): SourceType => {
  return book.settings?.sourceMeta?.sourceType ?? 'paste';
};

export const getBookSourceLabel = (sourceType: LibrarySourceFilter): string => {
  if (sourceType === 'all') return 'All';
  return BOOK_SOURCE_LABELS[sourceType];
};

export const getLibrarySourceLabel = (filter: LibrarySourceFilter): string => {
  return getBookSourceLabel(filter);
};

export const matchesSourceFilter = (book: Book, filter: LibrarySourceFilter): boolean => {
  return filter === 'all' || getBookSourceType(book) === filter;
};

export const prepareRestartedBook = (book: Book): Book => {
  return {
    ...book,
    progressIndex: 0,
    settings: {
      ...(book.settings || {}),
      bionicScrollPercent: undefined,
    },
  };
};
