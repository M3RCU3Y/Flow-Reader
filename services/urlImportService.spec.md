# URL Import Cleaner Spec (Fixture-Driven)

This project currently has no automated test runner for service-level unit tests, so this file defines expected behavior for deterministic manual checks.

## Fixture
- Input fixture: `services/__fixtures__/url-import/esp32-forum.txt`
- Cleaner entrypoint:
  - `parseProxyEnvelope(raw)`
  - `cleanImportedText(parsed.body, { sourceUrl: 'https://esp32.com/viewtopic.php?t=32063' })`

## Expected outcomes

1. The output should keep core post content.
- Example kept phrases:
  - `I am trying to use multiple usb serial devices with ESP32-S3 host.`
  - `I followed this reference, and also checked the example.`

2. Raw links should not appear in the reading body.
- Remove:
  - `https://docs.espressif.com/...`
  - `https://github.com/espressif/...`
  - `viewtopic.php?...&sid=...`

3. Forum chrome should be removed.
- Remove lines like:
  - `ESP32 Forum`
  - `Board index`
  - `Quick links`
  - `FAQ`
  - `Login`
  - `Register`
  - `Unanswered topics`
  - `Active topics`

4. Reference-definition lines should be removed.
- Remove:
  - `[1]: https://...`
  - `[2]: https://...`

5. Output should avoid giant URL-like RSVP tokens.
- Any URL-like token over 36 characters should be removed or split into readable chunks.

## Manual verification flow

1. Start app with `npm run dev`.
2. Import URL from `https://esp32.com/viewtopic.php?t=32063`.
3. Confirm imported text is readable and not dominated by forum nav/chrome.
4. Switch to RSVP/RSVP+ and confirm no giant raw URL token flashes as the main word.
5. Confirm blocked/challenge fallback still appears on known bot-check pages.
