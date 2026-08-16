# Flow Reader UX and Product Audit

This audit accompanies the `agent/flow-reader-product-polish` branch. It separates changes that are safe to land as product polish from larger architectural work that should be handled deliberately.

## What felt unreliable

Flow Reader already has a surprisingly broad feature set, but several details made the product feel less trustworthy than the underlying functionality deserved:

- The landing screen had weak visual hierarchy, so the primary action competed with demo, help, URL import, and file import controls.
- The library looked like a utility drawer rather than a durable reading workspace.
- Some interaction affordances were hover-first. Selecting a library entry relied on a clickable list item and the delete control was mostly hidden until hover.
- The reader mode switch looked polished but only partially implemented the expected keyboard tab pattern.
- Product styling used many local utility-class combinations without a compact surface vocabulary, which made related controls feel slightly inconsistent.
- The repository had deployment checks on `main`, but no equivalent non-deploying CI gate for feature branches.
- Build configuration still contained unused Gemini environment-variable plumbing even though the app does not use Gemini.

## Changes in this branch

### Product presentation

- Deepened the dark visual system with more deliberate surfaces, borders, elevation, and focus states.
- Reworked the idle backdrop into a subtle reading-space atmosphere using a grid, orbit, grain, and restrained warm light.
- Gave the landing experience stronger editorial hierarchy and a dedicated glass reading dock.
- Refined the Flow Reader mark while keeping the existing identity and warm accent.
- Improved mobile spacing and reduced-motion behavior.

### Library

- Converted reading selection into a real keyboard-focusable button instead of a clickable list item.
- Kept delete as an independent control with an explicit accessible label.
- Made deletion discoverable on touch devices instead of depending on hover.
- Clarified word counts, progress, source metadata, and previous-session information.

### Reader controls

- Added roving tab focus to the reader mode switch.
- Added Arrow Left, Arrow Right, Home, and End keyboard behavior.
- Unified the switch with the updated surface language.

### Reliability and build hygiene

- Added CI for pull requests and non-main branches. It runs `npm ci`, `npm run check`, and `npm run build` without deploying.
- Removed stale Gemini build-time definitions.
- Enabled PWA cleanup of outdated caches and immediate client claim behavior.
- Improved metadata and mobile app-shell hints in `index.html`.

## Recommended follow-up work

### Priority 0: Make first-load/offline behavior more self-contained

The app currently loads Tailwind's browser runtime, Google Fonts, and PDF.js from external CDNs. The PWA can cache those resources after they have loaded, but a fresh installation still depends on those networks.

Move Tailwind to the normal Vite/PostCSS build pipeline, bundle PDF.js through npm, and consider either self-hosting fonts or using a robust local fallback stack. This reduces first-load failure modes, makes the PWA claim more trustworthy, and removes runtime styling compilation.

### Priority 1: Split the two oversized orchestration components

`src/App.tsx` currently owns reader state, session state, mobile chrome visibility, global listeners, persistence coordination, sprint behavior, overlays, and layout. `src/components/TextInput.tsx` owns multiple import engines plus several UI flows.

Good extraction targets:

- `useReadingSession`
- `useReaderChrome`
- `useActiveBook`
- `useBionicHotspots`
- `useFileImport`
- `useUrlImport`
- `PdfPasswordDialog`
- `ImportProgress`
- `FullscreenEditor`

The goal is not abstraction for its own sake. The goal is to make individual user flows testable without loading the entire application shell.

### Priority 1: Clarify URL-import privacy

The local library is private to the device, but URL import intentionally sends the entered URL to a public text extractor. The existing disclosure is good, but the distinction should be even clearer because “local-first” can otherwise be interpreted as “nothing ever leaves this device.”

Recommended product wording should distinguish:

- pasted/file content: processed locally, except OCR dependencies already loaded by the app;
- URL import: the URL is sent to the extractor, then the resulting text is stored locally.

A “Paste locally instead” route should remain prominent whenever URL extraction fails.

### Priority 1: Add browser-level regression tests

The existing service tests are useful, but the riskiest behavior now lives in browser interactions: mode switching, resume prompts, Bionic scroll persistence, mobile drawers, import status, localStorage restoration, and keyboard shortcuts.

Add a small Playwright suite covering:

1. Paste text → start → play/pause → seek → exit → resume.
2. Switch RSVP / RSVP+ / Bionic and persist the mode.
3. Add/delete a library item with keyboard navigation.
4. Mobile drawer and landing layout at a narrow viewport.
5. URL-import blocked/fallback state using a mocked response.
6. PWA production build smoke test.

### Priority 2: Replace browser-native confirmation dialogs

`confirm()` is currently used for destructive data clearing and large-PDF continuation. App-native dialogs would feel more coherent, provide better explanation, and give more control over focus management.

### Priority 2: Improve long-library scalability

The localStorage model is reasonable for a personal reader, but importing many large documents will eventually make synchronous serialization and full-list rendering noticeable. A future storage migration to IndexedDB should be considered before adding cloud sync or very large libraries.

## Suggested sequence

1. Land this visual/accessibility/CI pass after branch checks are green.
2. Bundle runtime CDN dependencies.
3. Split `App.tsx` and `TextInput.tsx` along the flow boundaries above.
4. Add Playwright coverage while those boundaries are fresh.
5. Revisit storage only if the product is going to support genuinely large libraries or sync.

The reader engine itself does not need to be rewritten as part of this cleanup. The RSVP timing hook and service boundaries are already better isolated than the app shell, so the highest-return work is around orchestration, first-load reliability, accessibility, and product trust.
