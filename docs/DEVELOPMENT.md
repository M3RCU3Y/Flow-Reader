# Development Guide

## Setup

```powershell
npm install
npm run dev
```

Vite is pinned to port `3000` in `vite.config.ts` and listens on `0.0.0.0`.

## Verification

```powershell
npm run typecheck
npm run test
npm run check
```

- `npm run typecheck` runs `tsc --noEmit`.
- `npm run test` runs Vitest once.
- `npm run check` runs both in sequence.

Do not use `npm run build` as the default local check. Production build verification is slower and normally belongs to the GitHub Pages workflow unless a task explicitly asks for it.

## Deployment

`.github/workflows/deploy.yml` deploys GitHub Pages from `main` with:

```powershell
npm ci
npm run build
```

`vite.config.ts` sets the production base path to `/Flow-Reader/`.

## Environment Notes

- Library entries, preferences, themes, and summaries are stored in browser localStorage.
- PDF parsing depends on PDF.js loaded from CDN in `index.html`.
- OCR fallback uses `tesseract.js`.
- DOCX import uses `mammoth`.
- URL import fetches a public text extraction proxy to avoid browser CORS limitations.
- If Rollup optional dependencies break after switching between Windows and WSL, rerun `npm install` from the same OS shell that will run Vite.

## Source Conventions

- Keep app code under `src/`.
- Prefer service modules for pure logic and browser-storage wrappers.
- Prefer focused components/hooks over adding more responsibilities to `App.tsx` or `TextInput.tsx`.
- Keep import and reading-mode changes covered by either Vitest or `QA.md` manual checks.
