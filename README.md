# Focus Reader

Focus Reader is a local-first speed reading app with:
- RSVP (word-by-word)
- RSVP+ (context-enhanced, desktop/landscape)
- Bionic Flow (scrollable reading with a “zen” UI reveal)
- Theme Studio (presets + custom themes)
- PDF import that extracts text reliably, with OCR fallback for scanned PDFs
- DOCX import
- URL import for articles (uses a public text extraction proxy to avoid CORS issues)

Everything is stored locally in your browser (no accounts, no sync).

## Run Locally

Prerequisites: Node.js

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:3001`).

## Notes
- The library, preferences, and themes use local browser storage.
- “Clear Data” removes Focus Reader data from this device.
- The app is PWA-enabled (installable). Offline works best after the first load (assets are cached).
