import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanImportedText, parseProxyEnvelope, summarizeUrlImportPreview } from './urlImportService';

const fixturePath = resolve(__dirname, '__fixtures__/url-import/esp32-forum.txt');
const rawFixture = readFileSync(fixturePath, 'utf8');

describe('urlImportService', () => {
  it('cleans the forum fixture into readable article text', () => {
    const parsed = parseProxyEnvelope(rawFixture);
    const cleaned = cleanImportedText(parsed.body, {
      sourceUrl: 'https://esp32.com/viewtopic.php?t=32063',
    });

    expect(cleaned.text).toContain('I am trying to use multiple usb serial devices with ESP32-S3 host.');
    expect(cleaned.text).toContain('I followed this reference, and also checked the example.');
    expect(cleaned.text).not.toContain('ESP32 Forum');
    expect(cleaned.text).not.toContain('Board index');
    expect(cleaned.text).not.toMatch(/https?:\/\//);
    expect(cleaned.removedLineSamples).toContain('ESP32 Forum');
  });

  it('summarizes preview confidence and excerpts for the cleaned import', () => {
    const parsed = parseProxyEnvelope(rawFixture);
    const cleaned = cleanImportedText(parsed.body, {
      sourceUrl: 'https://esp32.com/viewtopic.php?t=32063',
    });
    const preview = summarizeUrlImportPreview({
      parsedTitle: parsed.title,
      resolvedTitle: parsed.title || 'fallback',
      rawText: parsed.body,
      cleaned,
    });

    expect(preview.titleOrigin).toBe('page');
    expect(preview.titleConfidence).toBe('high');
    expect(preview.cleanedWordCount).toBeGreaterThan(10);
    expect(preview.cleanedExcerpt).toContain('I am trying to use multiple usb serial devices');
  });
});
