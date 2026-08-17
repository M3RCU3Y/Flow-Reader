import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('./quietCurrent.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

const extractKeyframeBodies = (source: string) => {
  const bodies: string[] = [];
  const keyframePattern = /@keyframes\s+[\w-]+\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = keyframePattern.exec(source))) {
    let depth = 1;
    let cursor = keyframePattern.lastIndex;
    const start = cursor;

    while (cursor < source.length && depth > 0) {
      const char = source[cursor];
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      cursor += 1;
    }

    bodies.push(source.slice(start, cursor - 1));
    keyframePattern.lastIndex = cursor;
  }

  return bodies;
};

describe('Quiet Current performance contract', () => {
  it('keeps continuous keyframes on compositor-friendly properties', () => {
    const keyframes = extractKeyframeBodies(css);
    expect(keyframes.length).toBeGreaterThan(0);

    const layoutOrPaintProperties = [
      'top',
      'right',
      'bottom',
      'left',
      'width',
      'height',
      'margin',
      'padding',
      'filter',
      'background',
      'box-shadow',
      'border',
      'font-size',
    ];

    for (const body of keyframes) {
      for (const property of layoutOrPaintProperties) {
        expect(body).not.toMatch(new RegExp(`(^|[;{\\s])${property}\\s*:`, 'm'));
      }
    }
  });

  it('ships reduced-motion and slow-display fallbacks', () => {
    expect(css).toContain('(prefers-reduced-motion: reduce)');
    expect(css).toContain('(update: slow)');
    expect(css).toContain('animation: none !important');
  });

  it('reduces decorative complexity on narrow screens', () => {
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (max-width: 560px)');
  });

  it('includes a focus hush state', () => {
    expect(css).toContain('main:has(textarea:focus)');
    expect(css).toContain('animation-play-state: paused');
  });
});
