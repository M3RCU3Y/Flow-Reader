import { Book, BookSettings, SessionSummary } from '../types';

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

const normalizeBook = (book: Book): Book => {
  const settings = book.settings || {};
  const normalizedSettings: BookSettings = {
    ...settings,
    bookmarks: Array.isArray(settings.bookmarks) ? settings.bookmarks : [],
    notes: Array.isArray(settings.notes) ? settings.notes : [],
  };

  return {
    ...book,
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
  const parsed = parseJson<Book[]>(STORAGE_KEY, []);
  return parsed.map(normalizeBook);
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
  const parsed = parseJson<SessionSummary[]>(SESSION_SUMMARIES_KEY, []);
  return parsed
    .filter((item) => item && typeof item.bookId === 'string')
    .sort((a, b) => b.endedAt - a.endedAt);
};

export const appendSessionSummary = (summary: SessionSummary): void => {
  const list = getAllSessionSummaries();
  const next = [summary, ...list].slice(0, 500);
  localStorage.setItem(SESSION_SUMMARIES_KEY, JSON.stringify(next));
};
