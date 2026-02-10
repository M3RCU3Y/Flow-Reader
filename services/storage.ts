import { Book, BookSettings } from '../types';

const STORAGE_KEY = 'focus_reader_library';
const PREFS_KEY = 'focus_reader_prefs';
const CUSTOM_THEMES_KEY = 'focus_reader_custom_themes';
const SELECTED_THEME_KEY = 'focus_reader_selected_theme';
const HELP_PREFS_KEY = 'focus_reader_help_prefs';
const BIONIC_HINT_KEY = 'focus_reader_seen_bionic_hint';

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
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse library", e);
    // Corrupted storage should not brick the app; reset.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return [];
  }
};

export const deleteBook = (id: string): Book[] => {
  const library = getLibrary().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  return library;
};

export const clearLibrary = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const clearAllData = (): void => {
  // Local-first promise: clear everything this app stores.
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PREFS_KEY);
  localStorage.removeItem(CUSTOM_THEMES_KEY);
  localStorage.removeItem(SELECTED_THEME_KEY);
  localStorage.removeItem(HELP_PREFS_KEY);
  localStorage.removeItem(BIONIC_HINT_KEY);
};
