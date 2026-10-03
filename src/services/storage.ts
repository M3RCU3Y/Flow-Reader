import { Book, BookSettings, SessionSummary } from '../types';
import { sanitizeReaderPreferences } from './preferences';

const STORAGE_KEY = 'focus_reader_library';
const PREFS_KEY = 'focus_reader_prefs';
const CUSTOM_THEMES_KEY = 'focus_reader_custom_themes';
const SELECTED_THEME_KEY = 'focus_reader_selected_theme';
const HELP_PREFS_KEY = 'focus_reader_help_prefs';
const BIONIC_HINT_KEY = 'focus_reader_seen_bionic_hint';
const SESSION_SUMMARIES_KEY = 'focus_reader_session_summaries';
const STUDY_GOAL_KEY = 'focus_reader_study_goal';

const parseJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to parse ${key}`, e);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return fallback;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const finiteNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const isSessionSummary = (value: unknown): value is SessionSummary => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.bookId !== 'string') return false;
  return ['startedAt', 'endedAt', 'wordsRead', 'avgWpm', 'rewinds', 'bookmarksAdded', 'notesAdded']
    .every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0);
};

const normalizeBook = (value: unknown): Book | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') return null;
  const book = value as unknown as Book;
  const words = Array.isArray(book.words) && (book.words.length > 0 || !book.text.trim())
    && book.words.every((word) => typeof word === 'string')
    ? book.words
    : book.text.match(/\S+/g) || [];
  const settings = isRecord(book.settings) ? book.settings : {};
  const prefs = sanitizeReaderPreferences({ ...settings, lastMode: settings.mode });
  const source = isRecord(settings.sourceMeta) ? settings.sourceMeta : null;
  const sourceMeta = source && ['paste', 'pdf', 'docx', 'url'].includes(source.sourceType as string)
    ? {
      sourceType: source.sourceType as NonNullable<BookSettings['sourceMeta']>['sourceType'],
      sourceUrl: typeof source.sourceUrl === 'string' ? source.sourceUrl : undefined,
    }
    : undefined;
  const normalizedSettings: BookSettings = {
    ...settings,
    mode: prefs.lastMode,
    contextStrength: prefs.contextStrength,
    bionicStrength: prefs.bionicStrength,
    bionicFontSize: prefs.bionicFontSize,
    lineWidth: prefs.lineWidth,
    sourceMeta,
    bionicScrollPercent: typeof settings.bionicScrollPercent === 'number' && Number.isFinite(settings.bionicScrollPercent)
      ? Math.max(0, Math.min(1, settings.bionicScrollPercent))
      : undefined,
    lastSessionSummary: isSessionSummary(settings.lastSessionSummary) ? settings.lastSessionSummary : undefined,
    bookmarks: Array.isArray(settings.bookmarks)
      ? settings.bookmarks.filter((item) => isRecord(item) && typeof item.id === 'string'
        && typeof item.index === 'number' && Number.isInteger(item.index) && item.index >= 0)
        .map((item) => ({ ...item, createdAt: finiteNumber(item.createdAt), note: typeof item.note === 'string' ? item.note : undefined }))
      : [],
    notes: Array.isArray(settings.notes)
      ? settings.notes.filter((item) => isRecord(item) && typeof item.id === 'string' && typeof item.text === 'string'
        && typeof item.index === 'number' && Number.isInteger(item.index) && item.index >= 0)
        .map((item) => ({ ...item, createdAt: finiteNumber(item.createdAt), updatedAt: finiteNumber(item.updatedAt) }))
      : [],
  };

  return {
    ...book,
    title: typeof book.title === 'string' ? book.title : 'Untitled',
    words,
    progressIndex: Math.max(0, Math.min(Math.max(0, words.length - 1), Math.floor(finiteNumber(book.progressIndex)))),
    createdAt: finiteNumber(book.createdAt),
    lastReadAt: finiteNumber(book.lastReadAt),
    settings: normalizedSettings,
  };
};

export const saveBook = (book: Book): void => {
  const library = getLibrary();
  const existingIndex = library.findIndex(b => b.id === book.id);
  
  if (existingIndex >= 0) {
    library[existingIndex] = { ...book, lastReadAt: Date.now() };
  } else {
    library.unshift({ ...book, lastReadAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
};

export const updateBookProgress = (id: string, index: number): void => {
  const library = getLibrary();
  const bookIndex = library.findIndex(b => b.id === id);
  if (bookIndex >= 0) {
    library[bookIndex].progressIndex = index;
    library[bookIndex].lastReadAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }
};

export const updateBookSettings = (id: string, settings: Partial<BookSettings>): void => {
  const library = getLibrary();
  const bookIndex = library.findIndex(b => b.id === id);
  if (bookIndex >= 0) {
    library[bookIndex].settings = {
      ...(library[bookIndex].settings || {}),
      ...settings,
    };
    library[bookIndex].lastReadAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }
};

export const updateBookTitle = (id: string, title: string): void => {
  const library = getLibrary();
  const bookIndex = library.findIndex(b => b.id === id);
  if (bookIndex >= 0) {
    library[bookIndex].title = title;
    library[bookIndex].lastReadAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }
};

export const getLibrary = (): Book[] => {
  const parsed = parseJson<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeBook).filter((book): book is Book => book !== null);
};

export const deleteBook = (id: string): Book[] => {
  const library = getLibrary().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  return library;
};

export const clearAllData = (): void => {
  // Local-first promise: clear everything this app stores.
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem(CUSTOM_THEMES_KEY);
  localStorage.removeItem(SELECTED_THEME_KEY);
  localStorage.removeItem(HELP_PREFS_KEY);
  localStorage.removeItem(BIONIC_HINT_KEY);
  localStorage.removeItem(SESSION_SUMMARIES_KEY);
  localStorage.removeItem(STUDY_GOAL_KEY);
};

export const getAllSessionSummaries = (): SessionSummary[] => {
  const parsed = parseJson<unknown>(SESSION_SUMMARIES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isSessionSummary)
    .sort((a, b) => b.endedAt - a.endedAt);
};

export const appendSessionSummary = (summary: SessionSummary): void => {
  const list = getAllSessionSummaries();
  const next = [summary, ...list].slice(0, 500);
  localStorage.setItem(SESSION_SUMMARIES_KEY, JSON.stringify(next));
};
