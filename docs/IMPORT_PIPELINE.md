# Import Pipeline

Flow Reader supports paste, TXT, PDF, DOCX, and URL imports. The import surface is intentionally local-first: imported text becomes a `Book`, and source provenance is stored on `Book.settings.sourceMeta`.

## Entry Surface

`src/components/TextInput.tsx` owns the import UI:

- paste/manual text entry
- TXT file reading
- PDF import progress and password prompts
- DOCX extraction
- URL import profile selection, cleanup preview, and blocked-page fallback
- fullscreen editor

This file is a good candidate for future hook/component extraction, but behavior should stay covered by the QA flows before and after any split.

## PDF

`src/services/pdfService.ts` handles PDF extraction.

- Loads PDF.js from the global `window.pdfjsLib` initialized in `index.html`.
- Requests passwords through the caller when PDF.js reports protected files.
- Extracts text page by page.
- Falls back to OCR for scanned pages.
- Supports cancellation through `AbortSignal`.
- Reports progress with `ExtractPdfProgressInfo`.

Manual checks live in `QA.md`.

## DOCX

DOCX import uses `mammoth.extractRawText` in `TextInput.tsx`. Keep this path simple unless formatting-aware import becomes a product requirement.

## URL

`src/services/urlImportService.ts` contains the URL cleaner.

- `normalizeUrlInput(raw)` normalizes user-entered URLs.
- `parseProxyEnvelope(raw)` parses proxy responses into title/body fields.
- `cleanImportedText(text, options)` removes nav/chrome, reference definitions, raw URL tokens, and likely boilerplate.
- `summarizeUrlImportPreview(input)` builds the preview confidence, title source, cleanup counts, and excerpt.

The fixture-backed test is `src/services/urlImportService.test.ts`, using `src/services/__fixtures__/url-import/esp32-forum.txt`.

## Expected URL Cleaner Behavior

For the ESP32 forum fixture, the cleaner should:

- keep core post content such as `I am trying to use multiple usb serial devices with ESP32-S3 host.`
- keep readable context such as `I followed this reference, and also checked the example.`
- remove forum chrome such as `ESP32 Forum`, `Board index`, `Quick links`, `FAQ`, `Login`, and `Register`
- remove reference definitions like `[1]: https://...`
- avoid giant URL-like RSVP tokens

Run:

```powershell
npm run test -- src/services/urlImportService.test.ts
```

## Source Metadata

Preserve `Book.settings.sourceMeta` when editing text, restarting a book, or updating settings. Source filters in the library depend on it.
