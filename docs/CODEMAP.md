# Flow Reader Codemap

This is the high-signal map for future agents. Read this before changing behavior.

## Entry Points

- `index.html` owns document metadata, font/CDN scripts, Tailwind runtime config, and the PDF.js worker bootstrap.
- `src/index.tsx` mounts React, installs the PWA service worker, imports global styles, and wraps the app in `ErrorBoundary`.
- `src/App.tsx` is the main shell and state coordinator. It owns the active book, library list, reader mode, chrome visibility, session summaries, keyboard shortcuts, sprint timers, and most cross-component callbacks.
- `src/styles.css` owns global CSS variables, scrollbar styling, idle backdrop animation classes, and motion reduction behavior.

## Source Layout

- `src/components/` contains visual React components.
- `src/hooks/` contains reusable React hooks. `useRSVP` is the core RSVP playback hook.
- `src/services/` contains persistence, import, theme, and pure state helpers.
- `src/services/__fixtures__/` contains test fixtures.
- `src/types.ts` contains shared domain types.

## Main User Flows

### Text And File Import

- Start in `src/components/TextInput.tsx`.
- PDF extraction goes through `src/services/pdfService.ts`.
- URL cleanup goes through `src/services/urlImportService.ts`.
- DOCX extraction uses `mammoth` directly from the input surface.
- Source provenance is stored on `Book.settings.sourceMeta`.

### Reading Modes

- `src/hooks/useRSVP.ts` parses text into words and owns RSVP playback timing.
- `src/components/RSVPReader.tsx` renders the focused single-word view.
- `src/components/RSVPEnhancedReader.tsx` renders the context-enhanced RSVP view.
- `src/components/BionicFlowReader.tsx` renders scrollable bionic reading and maps scroll position back to progress.
- `src/components/ControlCenter.tsx` and `src/components/BionicControls.tsx` render mode-specific controls.
- `src/components/ReaderDisplay.tsx` handles word fitting for RSVP-style modes.

### Library And Persistence

- `src/services/storage.ts` is the localStorage-backed library API.
- `src/services/preferences.ts` stores global reader preferences.
- `src/services/bookState.ts` contains source filtering and restart helpers.
- `src/components/Library.tsx` and `src/components/LibrarySortMenu.tsx` render library navigation.

### Notes, Bookmarks, And Sessions

- `src/components/BookmarksPanel.tsx` owns the bookmarks/notes panel UI.
- `src/services/sessionSummary.ts` builds session summaries.
- `src/App.tsx` decides when a session is meaningful, persists summaries, and exposes the manual session recap action.

### Themes And Brand

- `src/services/themes.ts` owns preset/custom theme definitions and CSS variable application.
- `src/components/ThemeSelector.tsx` owns the theme editor UI.
- `src/components/IdleBackdrop.tsx` pairs with `src/styles.css` for the landing background.
- `src/components/BrandMark.tsx`, `public/pwa-icon.svg`, and `public/pwa-maskable.svg` should stay visually aligned.

## Current Pressure Points

- `src/App.tsx` is large and mixes app state, reading session lifecycle, global listeners, and layout chrome behavior. Safe future extractions: session lifecycle, reader chrome visibility, active-book mutations, and bionic hotspot behavior.
- `src/components/TextInput.tsx` is large and mixes editor UI, import orchestration, URL preview, PDF password flow, and fullscreen editing. Safe future extractions: URL import hook, file import hook, password prompt, import progress UI, fullscreen editor.
- Keep `pdfService.ts`, `urlImportService.ts`, `bookState.ts`, and `sessionSummary.ts` as examples for future service boundaries.

## Verification Pointers

- Run `npm run check` for TypeScript plus Vitest.
- Use `QA.md` for browser smoke flows after UI, import, persistence, or reader-mode changes.
- Avoid relying only on static checks when touching layout or reader state machines.
