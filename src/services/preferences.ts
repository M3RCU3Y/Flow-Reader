import { ReaderPreferences } from '../types';

const PREFS_KEY = 'focus_reader_prefs';

const DEFAULT_PREFS: ReaderPreferences = {
  lastMode: 'rsvp',
  contextStrength: 'medium',
  bionicStrength: 0.4,
  bionicFontSize: 28,
  lineWidth: 'normal',
  smartTimingEnabled: true,
  comfortModeEnabled: true,
};

export const sanitizeReaderPreferences = (value: unknown): Partial<ReaderPreferences> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const prefs = value as Record<string, unknown>;
  const valid: Partial<ReaderPreferences> = {};
  if (prefs.lastMode === 'rsvp' || prefs.lastMode === 'rsvp_enhanced' || prefs.lastMode === 'bionic_flow') {
    valid.lastMode = prefs.lastMode;
  }
  if (prefs.contextStrength === 'low' || prefs.contextStrength === 'medium' || prefs.contextStrength === 'high') {
    valid.contextStrength = prefs.contextStrength;
  }
  if (prefs.lineWidth === 'normal' || prefs.lineWidth === 'wide' || prefs.lineWidth === 'focused') {
    valid.lineWidth = prefs.lineWidth;
  }
  if (typeof prefs.bionicStrength === 'number' && Number.isFinite(prefs.bionicStrength)) {
    valid.bionicStrength = Math.max(0, Math.min(0.8, prefs.bionicStrength));
  }
  if (typeof prefs.bionicFontSize === 'number' && Number.isFinite(prefs.bionicFontSize)) {
    valid.bionicFontSize = Math.max(18, Math.min(42, prefs.bionicFontSize));
  }
  if (typeof prefs.smartTimingEnabled === 'boolean') valid.smartTimingEnabled = prefs.smartTimingEnabled;
  if (typeof prefs.comfortModeEnabled === 'boolean') valid.comfortModeEnabled = prefs.comfortModeEnabled;
  return valid;
};

export const getReaderPreferences = (): ReaderPreferences => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed: unknown = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...sanitizeReaderPreferences(parsed),
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
