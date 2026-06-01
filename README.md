# Flow Reader

Flow Reader is a local-first reading workspace for moving through long text with speed, focus, and control. It combines RSVP, Bionic Flow, document imports, themes, bookmarks, notes, and session summaries in a polished browser app.

Everything is stored locally in your browser (no accounts, no sync).

## Live App

https://m3rcu3y.github.io/Flow-Reader/

## Features

- RSVP word-by-word reading with smart timing and comfort controls.
- RSVP+ for context-enhanced reading on desktop and landscape layouts.
- Bionic Flow for scrollable, focused reading with progress-aware navigation.
- PDF import with text extraction, password handling, cancellation, and OCR fallback for scanned pages.
- DOCX, TXT, pasted text, and article URL import.
- URL cleanup preview for removing page chrome, forum noise, references, and long raw links.
- Local library with source badges, progress persistence, sorting, and filtering.
- Bookmarks, notes, manual session recap, focus sprint controls, and export.
- Theme Studio with presets and custom themes.
- Installable PWA behavior after the first load.

## Project Map

- App source lives in `src/`.
- Future agents should start with `docs/CODEMAP.md` for the codebase tour.
- Development commands and environment notes live in `docs/DEVELOPMENT.md`.
- Import behavior is documented in `docs/IMPORT_PIPELINE.md`.
- Manual verification flows live in `QA.md`.

## Run Locally

Prerequisites: Node.js

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:3000`).

## Verify Changes

```bash
npm run check
```

`npm run check` runs TypeScript (`tsc --noEmit`) and the Vitest suite. Production builds are handled by the GitHub Pages workflow on `main`.

## Notes
- The library, preferences, and themes use local browser storage.
- “Clear Data” removes Flow Reader data from this device.
- Offline works best after the first load because app assets are cached by the PWA service worker.
