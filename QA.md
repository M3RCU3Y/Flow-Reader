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
- Paste paragraphs separated by Windows CRLF blank lines and verify smart timing pauses like ordinary LF paragraphs.
- Focus desktop reader controls with Tab, wait beyond the idle timeout, and confirm the focused controls stay visible.

## Landing And Library

- With an empty editor, Start reading stays visible and disabled. Whitespace alone does not enable it.
- Load the sample and confirm the editor fills without opening help or starting playback.
- Paste text, check the word count, set an optional title, and verify that title appears in the library after starting.
- Open the fullscreen editor, cycle Tab/Shift+Tab through its controls, close with Escape, and verify focus returns to the opener.
- Search for a missing title or choose an empty source filter, then use Show all readings to reset both.
- Verify a reading saved at its last word shows 100% and sorts correctly by progress.
- Close the library and confirm its hidden controls cannot receive keyboard focus.

## Import Flows

- TXT: import a plain text file and verify it creates a readable book.
- DOCX: import a DOCX and verify text extraction creates a readable book.
- PDF: import a text PDF and verify progress messaging reaches the reader.
- PDF cancel: cancel a PDF import mid-process and confirm the app returns to idle without a generic error.
- Import cancellation: cancel TXT/DOCX/PDF or a URL, immediately edit or import newer text, and confirm the cancelled result cannot replace it. A cancelled file should preserve the previous title and source badge.
- During imports, verify Start reading, sample loading, and text editing stay disabled; the cancel action remains available.
- URL success: import a normal article URL and confirm the cleanup preview appears before loading.
- URL blocked: import a URL that hits a bot check or login wall and confirm fallback actions appear (`Open Source Page`, `Paste from Clipboard`).
- Forum URL: verify RSVP does not surface giant URL-like tokens after cleanup.

## Persistence

- Save a book, leave it, reopen it, and verify progress is restored.
- Change reader mode and Bionic settings, reopen the book, and verify settings persist.
- Change theme, refresh, and verify selected theme persists.
- Edit imported text and confirm the library source badge stays accurate.
- In a disposable browser profile, give library/preferences/session storage invalid JSON shapes or one malformed book, refresh, and verify usable books and explicit disabled timing preferences survive.

## Notes, Bookmarks, And Session Recap

- Add a bookmark and a note, close/reopen the panel, and verify local panel search/edit UI resets cleanly.
- Read long enough to create a session recap, then verify the recap does not auto-open.
- Confirm the manual session recap button appears only when the active book has recap data.

## Mobile Layout

- On a narrow viewport, verify the idle screen scrolls from hero to textarea to URL import.
- Type enough text to fill the textarea and confirm action buttons do not cover the text.
- Verify the dashboard/menu button does not overlap hero text.
