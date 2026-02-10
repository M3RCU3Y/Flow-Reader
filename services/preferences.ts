import { ReaderPreferences } from '../types';

const PREFS_KEY = 'focus_reader_prefs';

const DEFAULT_PREFS: ReaderPreferences = {
  lastMode: 'rsvp',
  contextStrength: 'medium',
  bionicStrength: 0.4,
  lineWidth: 'normal',
  smartTimingEnabled: true,
  comfortModeEnabled: true,
};

export const getReaderPreferences = (): ReaderPreferences => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to parse reader preferences', e);
    try {
      localStorage.removeItem(PREFS_KEY);
    } catch {
      // ignore
    }
    return { ...DEFAULT_PREFS };
  }
};

export const saveReaderPreferences = (prefs: ReaderPreferences): void => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
};
