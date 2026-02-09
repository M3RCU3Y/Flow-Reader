import { Book, BookSettings } from '../types';

const STORAGE_KEY = 'focus_reader_library';

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
