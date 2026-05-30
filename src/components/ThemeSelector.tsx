import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Plus, Save, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { ThemeDefinition, ThemeTokens } from '../types';
import {
  PRESET_THEMES,
  applyThemeTokens,
  getStoredCustomThemes,
  getStoredThemeId,
  saveStoredCustomThemes,
  saveStoredThemeId,
} from '../services/themes';

const TOKEN_FIELDS: Array<{ key: keyof ThemeTokens; label: string }> = [
  { key: 'appBg', label: 'Background' },
  { key: 'panelBg', label: 'Surface' },
  { key: 'textPrimary', label: 'Primary text' },
  { key: 'textSecondary', label: 'Muted text' },
  { key: 'accent', label: 'Accent' },
  { key: 'bionicHighlight', label: 'Bionic highlight' },
  { key: 'progress', label: 'Progress' },
];

interface ThemeSelectorProps {
  isVisible: boolean;
  onOpenChange?: (open: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocusWithinChange?: (focused: boolean) => void;
}

const buildSwatch = (tokens: ThemeTokens) =>
  `linear-gradient(135deg, ${tokens.appBg} 0%, ${tokens.panelBg} 45%, ${tokens.accent} 100%)`;

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  isVisible,
  onOpenChange,
  onMouseEnter,
  onMouseLeave,
  onFocusWithinChange,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() => getStoredCustomThemes());
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    return getStoredThemeId() ?? PRESET_THEMES[0]?.id ?? 'midnight';
  });
  const [draftTokens, setDraftTokens] = useState<ThemeTokens>(PRESET_THEMES[0].tokens);
  const [draftName, setDraftName] = useState(PRESET_THEMES[0].name);

  const allThemes = useMemo(() => {
    return [...PRESET_THEMES, ...customThemes];
  }, [customThemes]);

  const selectedTheme = useMemo(() => {
    return allThemes.find((theme) => theme.id === selectedThemeId) ?? PRESET_THEMES[0];
  }, [allThemes, selectedThemeId]);

  const basePreset = useMemo(() => {
    if (selectedTheme.isPreset) return selectedTheme;
    if (!selectedTheme.basePresetId) return undefined;
    return PRESET_THEMES.find((theme) => theme.id === selectedTheme.basePresetId);
  }, [selectedTheme]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isVisible) {
      setIsOpen(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!selectedTheme) return;
    setDraftTokens(selectedTheme.tokens);
    setDraftName(selectedTheme.name);
  }, [selectedTheme]);

  useEffect(() => {
    if (isOpen) {
      applyThemeTokens(draftTokens);
      return;
    }
    applyThemeTokens(selectedTheme.tokens);
  }, [draftTokens, isOpen, selectedTheme.tokens]);

  useEffect(() => {
    if (isOpen) return;
    setDraftTokens(selectedTheme.tokens);
    setDraftName(selectedTheme.name);
  }, [isOpen, selectedTheme]);

  useEffect(() => {
    saveStoredCustomThemes(customThemes);
  }, [customThemes]);

  useEffect(() => {
    saveStoredThemeId(selectedTheme.id);
  }, [selectedTheme.id]);

  useEffect(() => {
    if (allThemes.some((theme) => theme.id === selectedThemeId)) return;
    setSelectedThemeId(PRESET_THEMES[0]?.id ?? 'midnight');
  }, [allThemes, selectedThemeId]);

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
  };

  const handleTokenChange = (key: keyof ThemeTokens, value: string) => {
    setDraftTokens((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    const trimmedName = draftName.trim();
    if (selectedTheme.isPreset) {
      const nextTheme: ThemeDefinition = {
        id: `custom-${Date.now()}`,
        name: trimmedName || `${selectedTheme.name} Custom`,
        tokens: draftTokens,
        basePresetId: selectedTheme.id,
      };
      setCustomThemes((prev) => [nextTheme, ...prev]);
      setSelectedThemeId(nextTheme.id);
      return;
    }
    setCustomThemes((prev) =>
      prev.map((theme) =>
        theme.id === selectedTheme.id
          ? { ...theme, name: trimmedName || theme.name, tokens: draftTokens }
          : theme
      )
    );
  };

  const handleRename = () => {
    if (selectedTheme.isPreset) return;
    const trimmedName = draftName.trim();
    if (!trimmedName) return;
    setCustomThemes((prev) =>
      prev.map((theme) =>
        theme.id === selectedTheme.id ? { ...theme, name: trimmedName } : theme
      )
    );
  };

  const handleDelete = () => {
    if (selectedTheme.isPreset) return;
    const remaining = customThemes.filter((theme) => theme.id !== selectedTheme.id);
    setCustomThemes(remaining);
    setSelectedThemeId(remaining[0]?.id ?? PRESET_THEMES[0]?.id ?? 'midnight');
  };

  const handleReset = () => {
    if (!basePreset) return;
    setDraftTokens(basePreset.tokens);
    if (selectedTheme.isPreset) {
      setDraftName(basePreset.name);
    }
  };

  const handleCreateCustom = () => {
    const nextTheme: ThemeDefinition = {
      id: `custom-${Date.now()}`,
      name: `Custom ${customThemes.length + 1}`,
      tokens: draftTokens,
      basePresetId: selectedTheme.isPreset ? selectedTheme.id : selectedTheme.basePresetId,
    };
    setCustomThemes((prev) => [nextTheme, ...prev]);
    setSelectedThemeId(nextTheme.id);
  };

  return (
    <div
      className={`fixed z-30 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
      }`}
      style={{
        right: 'calc(env(safe-area-inset-right) + 16px)',
        bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocusCapture={() => onFocusWithinChange?.(true)}
      onBlurCapture={() => {
        window.setTimeout(() => {
          if (!wrapperRef.current?.contains(document.activeElement)) {
            onFocusWithinChange?.(false);
          }
        }, 0);
      }}
      ref={wrapperRef}
    >
      <div className="relative flex items-end justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group flex items-center gap-2 rounded-full border border-text-primary/10 bg-panel-bg/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary shadow-xl backdrop-blur-md transition-all duration-300 hover:text-text-primary hover:border-text-primary/30 ${
            isOpen ? 'translate-x-0' : 'translate-x-1'
          }`}
          aria-expanded={isOpen}
          aria-label="Toggle theme panel"
        >
          <Palette className="h-4 w-4 text-accent-red" />
          <span className="hidden sm:inline">Theme</span>
        </button>

        <div
          className={`absolute right-0 bottom-[calc(100%+12px)] w-[min(90vw,360px)] max-h-[70dvh] overflow-y-auto rounded-2xl border border-text-primary/10 bg-panel-bg/90 p-5 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:right-full sm:bottom-0 sm:mr-3 ${
            isOpen
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none'
          } motion-reduce:transition-none`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-text-secondary">Theme Studio</p>
              <h3 className="text-lg font-header text-text-primary">Make it yours</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-text-primary/10 p-2 text-text-secondary transition-colors hover:text-text-primary"
              aria-label="Close theme panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Presets</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition-all ${
                      selectedTheme.id === theme.id
                        ? 'border-accent-red text-text-primary'
                        : 'border-transparent text-text-secondary hover:border-text-primary/20 hover:text-text-primary'
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-md border border-text-primary/10"
                      style={{ background: buildSwatch(theme.tokens) }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Custom</p>
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              {customThemes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-text-primary/15 p-3 text-xs text-text-secondary">
                  No custom themes yet. Save one to start.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {customThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition-all ${
                        selectedTheme.id === theme.id
                          ? 'border-accent-red text-text-primary'
                          : 'border-transparent text-text-secondary hover:border-text-primary/20 hover:text-text-primary'
                      }`}
                    >
                      <span
                        className="h-7 w-7 rounded-md border border-text-primary/10"
                        style={{ background: buildSwatch(theme.tokens) }}
                      />
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-text-primary/10 bg-app-bg/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Editor</p>
                  <p className="text-[11px] text-text-secondary">
                    {selectedTheme.isPreset ? 'Editing preset preview' : 'Editing custom theme'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-4 w-4 text-accent-red" />
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="w-full rounded-md border border-text-primary/10 bg-transparent px-2 py-1 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none"
                  placeholder="Theme name"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                {TOKEN_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center justify-between rounded-md border border-text-primary/5 bg-panel-bg/40 px-3 py-2 text-xs text-text-secondary"
                  >
                    <span>{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-secondary/70">
                        {draftTokens[field.key].toUpperCase()}
                      </span>
                      <input
                        type="color"
                        value={draftTokens[field.key]}
                        onChange={(event) => handleTokenChange(field.key, event.target.value)}
                        className="h-7 w-9 rounded-md border border-text-primary/20 bg-transparent"
                        aria-label={`${field.label} color`}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-red/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-text-primary transition hover:bg-accent-red"
                >
                  <Save className="h-3 w-3" />
                  {selectedTheme.isPreset ? 'Save As Custom' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={selectedTheme.isPreset}
                  className="inline-flex items-center gap-2 rounded-full border border-text-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-text-secondary transition hover:text-text-primary disabled:opacity-40"
                >
                  <Pencil className="h-3 w-3" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!basePreset}
                  className="inline-flex items-center gap-2 rounded-full border border-text-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-text-secondary transition hover:text-text-primary disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Preset
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={selectedTheme.isPreset}
                  className="inline-flex items-center gap-2 rounded-full border border-text-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-text-secondary transition hover:text-text-primary disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
