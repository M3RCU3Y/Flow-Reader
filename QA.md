# QA Checklist

Use this after changes that touch UI, imports, reader modes, persistence, or app shell state.

## Automated First

```powershell
npm run check
```

## Browser Smoke

Start the app:

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Core Reading

- Paste several paragraphs and start reading.
- Verify `RSVP`, `RSVP+`, and `Bionic Flow` can each render the same text.
- Press Space to play/pause in RSVP mode.
- Seek near the end and verify replay from the end works through the normal play path.
- In Bionic Flow, scroll and confirm progress updates without jumping.

## Import Flows

- TXT: import a plain text file and verify it creates a readable book.
- DOCX: import a DOCX and verify text extraction creates a readable book.
- PDF: import a text PDF and verify progress messaging reaches the reader.
- PDF cancel: cancel a PDF import mid-process and confirm the app returns to idle without a generic error.
- URL success: import a normal article URL and confirm the cleanup preview appears before loading.
- URL blocked: import a URL that hits a bot check or login wall and confirm fallback actions appear (`Open Source Page`, `Paste from Clipboard`).
- Forum URL: verify RSVP does not surface giant URL-like tokens after cleanup.

## Persistence

- Save a book, leave it, reopen it, and verify progress is restored.
- Change reader mode and Bionic settings, reopen the book, and verify settings persist.
- Change theme, refresh, and verify selected theme persists.
- Edit imported text and confirm the library source badge stays accurate.

## Notes, Bookmarks, And Session Recap

- Add a bookmark and a note, close/reopen the panel, and verify local panel search/edit UI resets cleanly.
- Read long enough to create a session recap, then verify the recap does not auto-open.
- Confirm the manual session recap button appears only when the active book has recap data.

## Mobile Layout

- On a narrow viewport, verify the idle screen scrolls from hero to textarea to URL import.
- Type enough text to fill the textarea and confirm action buttons do not cover the text.
- Verify the dashboard/menu button does not overlap hero text.
