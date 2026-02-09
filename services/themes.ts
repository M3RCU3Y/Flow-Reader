import { ThemeDefinition, ThemeTokens } from '../types';

const CUSTOM_THEMES_KEY = 'focus_reader_custom_themes';
const SELECTED_THEME_KEY = 'focus_reader_selected_theme';

const isHexColor = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
};

const isThemeTokens = (value: unknown): value is ThemeTokens => {
  if (!value || typeof value !== 'object') return false;
  const tokens = value as Record<string, unknown>;
  return (
    isHexColor(tokens.appBg) &&
    isHexColor(tokens.panelBg) &&
    isHexColor(tokens.textPrimary) &&
    isHexColor(tokens.textSecondary) &&
    isHexColor(tokens.accent) &&
    isHexColor(tokens.bionicHighlight) &&
    isHexColor(tokens.progress)
  );
};

const toRgbChannels = (hex: string): string => {
  const sanitized = hex.trim().replace('#', '');
  const full = sanitized.length === 3
    ? sanitized
        .split('')
        .map((char) => char + char)
        .join('')
    : sanitized;
  if (full.length !== 6) {
    return '0 0 0';
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

export const PRESET_THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    isPreset: true,
    tokens: {
      appBg: '#0f0f10',
      panelBg: '#18181b',
      textPrimary: '#ffffff',
      textSecondary: '#a1a1aa',
      accent: '#ff4757',
      bionicHighlight: '#ff6b6b',
      progress: '#ff4757',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    isPreset: true,
    tokens: {
      appBg: '#101113',
      panelBg: '#1e2024',
      textPrimary: '#f4f6f8',
      textSecondary: '#9aa0a6',
      accent: '#6ea8fe',
      bionicHighlight: '#9ad0ff',
      progress: '#6ea8fe',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    isPreset: true,
    tokens: {
      appBg: '#f3f1ea',
      panelBg: '#ffffff',
      textPrimary: '#2b2621',
      textSecondary: '#766f66',
      accent: '#d66b4c',
      bionicHighlight: '#c44a2a',
      progress: '#d66b4c',
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    isPreset: true,
    tokens: {
      appBg: '#f6efe2',
      panelBg: '#fff8ec',
      textPrimary: '#3a2f25',
      textSecondary: '#8a7b67',
      accent: '#b86b35',
      bionicHighlight: '#c8743d',
      progress: '#b86b35',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    isPreset: true,
    tokens: {
      appBg: '#002b36',
      panelBg: '#073642',
      textPrimary: '#fdf6e3',
      textSecondary: '#93a1a1',
      accent: '#cb4b16',
      bionicHighlight: '#b58900',
      progress: '#2aa198',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    isPreset: true,
    tokens: {
      appBg: '#000000',
      panelBg: '#0d0d0d',
      textPrimary: '#ffffff',
      textSecondary: '#cfcfcf',
      accent: '#00e0ff',
      bionicHighlight: '#ffcc00',
      progress: '#00e0ff',
    },
  },
];

export const getStoredCustomThemes = (): ThemeDefinition[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((theme): theme is ThemeDefinition => {
        if (!theme || typeof theme !== 'object') return false;
        const record = theme as Record<string, unknown>;
        if (record.isPreset) return false;
        if (typeof record.id !== 'string' || typeof record.name !== 'string') return false;
        return isThemeTokens(record.tokens);
      })
      .map((theme) => ({
        id: theme.id,
        name: theme.name,
        tokens: theme.tokens,
        basePresetId: theme.basePresetId,
      }));
  } catch (error) {
    console.error('Failed to parse custom themes', error);
    return [];
  }
};

export const saveStoredCustomThemes = (themes: ThemeDefinition[]): void => {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch (error) {
    console.error('Failed to persist custom themes', error);
  }
};

export const getStoredThemeId = (): string | null => {
  try {
    return localStorage.getItem(SELECTED_THEME_KEY);
  } catch (error) {
    console.error('Failed to read selected theme', error);
    return null;
  }
};

export const saveStoredThemeId = (themeId: string): void => {
  try {
    localStorage.setItem(SELECTED_THEME_KEY, themeId);
  } catch (error) {
    console.error('Failed to persist selected theme', error);
  }
};

export const applyThemeTokens = (tokens: ThemeTokens): void => {
  const root = document.documentElement;
  root.style.setProperty('--color-app-bg', toRgbChannels(tokens.appBg));
  root.style.setProperty('--color-panel-bg', toRgbChannels(tokens.panelBg));
  root.style.setProperty('--color-text-primary', toRgbChannels(tokens.textPrimary));
  root.style.setProperty('--color-text-secondary', toRgbChannels(tokens.textSecondary));
  root.style.setProperty('--color-accent', toRgbChannels(tokens.accent));
  root.style.setProperty('--color-bionic-highlight', toRgbChannels(tokens.bionicHighlight));
  root.style.setProperty('--color-progress', toRgbChannels(tokens.progress));
};
