# Flow Reader

Flow Reader helps you read long articles, PDFs, notes, and saved text in the browser. It gives you RSVP, Bionic Flow, imports, themes, bookmarks, notes, and session recaps without sending your library anywhere.

Everything is stored locally in your browser (no accounts, no sync).

## Live App

https://m3rcu3y.github.io/Flow-Reader/

## Features

- RSVP word-by-word reading with adjustable speed and pauses.
- RSVP+ shows nearby words for more context on wider screens.
- Bionic Flow gives you scrollable reading that keeps progress in sync.
- PDF import with text extraction, password handling, cancellation, and OCR fallback for scanned pages.
- DOCX, TXT, pasted text, and article URL import.
- URL cleanup preview for removing page chrome, forum noise, references, and long raw links.
- Local library with source badges, progress persistence, sorting, and filtering.
- Bookmarks, notes, manual session recap, focus sprint controls, and export.
- Theme Studio with presets and custom themes.
- Installable PWA behavior after the first load.

## Project Map

- App source lives in `src/`.
- Start with `docs/CODEMAP.md` for the codebase tour.
- Development commands and environment notes live in `docs/DEVELOPMENT.md`.
- Import behavior is documented in `docs/IMPORT_PIPELINE.md`.
- Manual verification flows live in `QA.md`.

## Run Locally

Prerequisite: Node.js 24 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:3000`).

## Verify Changes

```bash
npm run check
npm run build
```

`npm run check` runs TypeScript (`tsc --noEmit`) and the Vitest suite. Production builds are handled by the GitHub Pages workflow on `main`.

## License

Flow Reader is licensed under the [MIT License](LICENSE).

## Notes
- The library, preferences, and themes use local browser storage.
- “Clear Data” removes Flow Reader data from this device.
- Offline works best after the first load because app assets are cached by the PWA service worker.
