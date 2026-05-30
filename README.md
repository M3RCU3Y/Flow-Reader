# Flow Reader

Flow Reader is a local-first speed reading app with:
- RSVP (word-by-word)
- RSVP+ (context-enhanced, desktop/landscape)
- Bionic Flow (scrollable reading with a “zen” UI reveal)
- Theme Studio (presets + custom themes)
- PDF import that extracts text reliably, with OCR fallback for scanned PDFs
- DOCX import
- URL import for articles (uses a public text extraction proxy to avoid CORS issues)

Everything is stored locally in your browser (no accounts, no sync).

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
- The app is PWA-enabled (installable). Offline works best after the first load (assets are cached).
