export interface UrlParseResult {
  title?: string;
  body: string;
}

export interface CleanStats {
  linesBefore: number;
  linesAfter: number;
  removedLines: number;
  rawUrlsRemoved: number;
  longTokensSplit: number;
  droppedReferenceDefs: number;
  suspiciousLeftovers: number;
}

export interface CleanedImportResult {
  text: string;
  stats: CleanStats;
  suspiciousTokens: string[];
  removedLineSamples: string[];
}

export type UrlImportConfidence = 'low' | 'medium' | 'high';

export interface UrlImportPreviewSummary {
  titleConfidence: UrlImportConfidence;
  sourceConfidence: UrlImportConfidence;
  titleOrigin: 'page' | 'fallback';
  rawWordCount: number;
  cleanedWordCount: number;
  rawExcerpt: string;
  cleanedExcerpt: string;
  removedLineSamples: string[];
}

export type UrlImportProfile = 'auto' | 'forum' | 'docs' | 'news';

const URL_RE = /\bhttps?:\/\/[^\s<>)\]]+/gi;
const WWW_RE = /\bwww\.[^\s<>)\]]+/gi;
const REF_DEF_RE = /^\s*\[([^\]]+)\]:\s*(https?:\/\/\S+)\s*$/i;
const SHORT_NAV_LINE_RE =
  /^(home|quick links|login|register|faq|board index|contact us|search|advanced search|members|notifications|logout)$/i;
const BOILERPLATE_LINE_RE =
  /(viewtopic\.php|search\.php|ucp\.php|app\.php\/feed|sid=[a-f0-9]{8,}|skip to content|jump to)/i;
const SEPARATOR_RE = /^[-_=*~]{3,}$/;

const collapseSpaces = (value: string) => value.replace(/[ \t]+/g, ' ').trim();

const domainFromUrl = (sourceUrl: string) => {
  try {
    return new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const inferProfile = (domain: string, input: UrlImportProfile): UrlImportProfile => {
  if (input !== 'auto') return input;
  if (/forum|phpbb|reddit|discourse/.test(domain)) return 'forum';
  if (/docs|readthedocs|developer|dev\./.test(domain)) return 'docs';
  return 'news';
};

const looksLikeHtml = (input: string) => /<!doctype html|<html\b|<body\b/i.test(input);

export const normalizeUrlInput = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const parseProxyEnvelope = (raw: string): UrlParseResult => {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let titleLine: string | undefined;
  let start = 0;

  for (let i = 0; i < Math.min(lines.length, 60); i++) {
    const line = (lines[i] || '').trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith('title:')) titleLine = line.slice(6).trim();
    if (/^(markdown|text)\s+content:/i.test(line)) {
      start = i + 1;
      break;
    }
  }

  while (start < lines.length) {
    const line = (lines[start] || '').trim();
    if (!line) {
      start++;
      continue;
    }
    if (/^(title:|url source:|source:|published:|author:)/i.test(line)) {
      start++;
      continue;
    }
    break;
  }

  const body = lines.slice(start).join('\n').trim();
  return { title: titleLine, body };
};

const stripHtml = (input: string) =>
  input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

const replaceLinksAndMarkup = (input: string) => {
  let output = input;
  let rawUrlsRemoved = 0;
  let droppedReferenceDefs = 0;

  // Remove reference definitions like: [1]: https://...
  output = output
    .split('\n')
    .filter((line) => {
      const isRefDef = REF_DEF_RE.test(line);
      if (isRefDef) droppedReferenceDefs += 1;
      return !isRefDef;
    })
    .join('\n');

  // Markdown links: [label](url) -> label
  output = output.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_m, label: string) => {
    rawUrlsRemoved += 1;
    return label.trim();
  });

  // Markdown ref links: [label][1] -> label
  output = output.replace(/\[([^\]\n]+)\]\[[^\]\n]+\]/g, (_m, label: string) => label.trim());

  // BBCode URL tags: [url=...]label[/url] -> label
  output = output.replace(/\[url=[^\]]+\]([\s\S]*?)\[\/url\]/gi, (_m, label: string) => collapseSpaces(label));
  output = output.replace(/\[url\](https?:\/\/[^\[]+)\[\/url\]/gi, () => {
    rawUrlsRemoved += 1;
    return '';
  });

  // HTML links: <a href="...">label</a> -> label
  output = output.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_m, label: string) => collapseSpaces(label));

  // Remove residual BBCode tags
  output = output.replace(/\[(\/)?(b|i|u|quote|code|img|color|size|list|\*)[^\]]*\]/gi, ' ');
  // Normalize leftover bracketed words to reduce odd tokens like "[this]2s2/...".
  output = output.replace(/\[([a-z0-9'_-]{1,40})\]/gi, '$1 ');

  output = output.replace(URL_RE, () => {
    rawUrlsRemoved += 1;
    return '';
  });
  output = output.replace(WWW_RE, () => {
    rawUrlsRemoved += 1;
    return '';
  });

  // Remove autolink wrappers like <https://...>
  output = output.replace(/<\s*https?:\/\/[^>]+\s*>/gi, () => {
    rawUrlsRemoved += 1;
    return '';
  });

  return { output, rawUrlsRemoved, droppedReferenceDefs };
};

const shouldDropLine = (line: string, domain: string, profile: UrlImportProfile) => {
  const compact = collapseSpaces(line);
  if (!compact) return false;

  if (SHORT_NAV_LINE_RE.test(compact)) return true;
  if (SEPARATOR_RE.test(compact)) return true;
  if (BOILERPLATE_LINE_RE.test(compact)) return true;

  const isPhpbbLike = domain.endsWith('esp32.com') || domain.endsWith('phpbb.com');
  if (profile === 'forum' || isPhpbbLike) {
    if (
      /(esp32 forum|quick links|unanswered topics|active topics|contact us|board index|hello,\s*guest|login|register)/i.test(
        compact
      )
    ) {
      return true;
    }
    if (/^(home|forum|faq)$/i.test(compact)) return true;
  }

  if (profile === 'docs') {
    if (/^(on this page|table of contents|navigation|edit this page|last updated)/i.test(compact)) return true;
  }

  if (profile === 'news') {
    if (/^(share this|advertisement|subscribe|newsletter|related articles?)$/i.test(compact)) return true;
  }

  // Drop very short utility lines that are usually chrome labels.
  if (compact.length <= 2 && !/[a-z0-9]/i.test(compact)) return true;
  if (/^[\[\](){}|]+$/.test(compact)) return true;

  return false;
};

const shouldJoinWrappedLine = (prev: string, next: string) => {
  if (!prev || !next) return false;
  if (prev.endsWith('-')) return true;
  if (/[.!?:;"')\]]$/.test(prev)) return false;
  if (/^(by|and|or|to|of|for|in|on|with|as|at|that|this|it|is|are|was|were)\b/i.test(next)) return true;
  if (/^[a-z0-9(]/.test(next)) return true;
  if (prev.length < 95 && next.length < 95) return true;
  return false;
};

const rebuildParagraphs = (lines: string[]) => {
  const rebuilt: string[] = [];
  for (const rawLine of lines) {
    const line = collapseSpaces(rawLine);
    if (!line) {
      if (rebuilt.length && rebuilt[rebuilt.length - 1] !== '') rebuilt.push('');
      continue;
    }

    if (!rebuilt.length || rebuilt[rebuilt.length - 1] === '') {
      rebuilt.push(line);
      continue;
    }

    const prev = rebuilt[rebuilt.length - 1];
    if (shouldJoinWrappedLine(prev, line)) {
      if (prev.endsWith('-')) {
        rebuilt[rebuilt.length - 1] = `${prev.slice(0, -1)}${line}`;
      } else {
        rebuilt[rebuilt.length - 1] = `${prev} ${line}`;
      }
    } else {
      rebuilt.push(line);
    }
  }
  return rebuilt.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const splitLongUrlishTokens = (text: string) => {
  let longTokensSplit = 0;
  const rewritten = text.replace(/\S{37,}/g, (token) => {
    if (!/[\/_=&?#%.-]/.test(token)) return token;
    longTokensSplit += 1;
    return token
      .replace(/([\/_=&?#%-]+)/g, '$1 ')
      .replace(/([.,:;])(?=\S)/g, '$1 ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  });
  return { text: rewritten, longTokensSplit };
};

export const cleanImportedText = (
  body: string,
  ctx: { sourceUrl: string; profile?: UrlImportProfile }
): CleanedImportResult => {
  const normalized = body.replace(/\r\n/g, '\n').normalize('NFKC');
  const base = looksLikeHtml(normalized) ? stripHtml(normalized) : normalized;
  const domain = domainFromUrl(ctx.sourceUrl);
  const profile = inferProfile(domain, ctx.profile || 'auto');
  const linesBefore = base.split('\n').length;

  const { output, rawUrlsRemoved, droppedReferenceDefs } = replaceLinksAndMarkup(base);
  const filteredLines: string[] = [];
  const removedLineSamples: string[] = [];
  let removedLines = 0;

  for (const line of output.split('\n')) {
    const compactLine = collapseSpaces(line);
    if (shouldDropLine(line, domain, profile)) {
      removedLines += 1;
      if (compactLine && removedLineSamples.length < 4) {
        removedLineSamples.push(compactLine);
      }
      continue;
    }
    filteredLines.push(line);
  }

  const rebuilt = rebuildParagraphs(filteredLines);
  const split = splitLongUrlishTokens(rebuilt);
  const cleanedText = split.text.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
  const linesAfter = cleanedText ? cleanedText.split('\n').length : 0;
  const suspiciousTokens = Array.from(
    new Set(
      (cleanedText.match(/\S{30,}/g) || [])
        .filter((token) => /[\/_=#%|[\]{}]/.test(token))
        .slice(0, 8)
    )
  );

  return {
    text: cleanedText,
    suspiciousTokens,
    removedLineSamples,
    stats: {
      linesBefore,
      linesAfter,
      removedLines,
      rawUrlsRemoved,
      longTokensSplit: split.longTokensSplit,
      droppedReferenceDefs,
      suspiciousLeftovers: suspiciousTokens.length,
    },
  };
};

const countWords = (input: string) => input.trim().split(/\s+/).filter(Boolean).length;

const toExcerpt = (input: string, maxChars = 220) => {
  const compact = collapseSpaces(input.replace(/\s+/g, ' '));
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars).trimEnd()}...`;
};

export const summarizeUrlImportPreview = (input: {
  parsedTitle?: string;
  resolvedTitle: string;
  rawText: string;
  cleaned: CleanedImportResult;
}): UrlImportPreviewSummary => {
  const rawWordCount = countWords(input.rawText);
  const cleanedWordCount = countWords(input.cleaned.text);
  const hasParsedTitle = Boolean(input.parsedTitle && input.parsedTitle.trim().length > 0);
  const titleLength = input.resolvedTitle.trim().length;

  let titleConfidence: UrlImportConfidence = 'low';
  if (hasParsedTitle && titleLength >= 12 && titleLength <= 120) {
    titleConfidence = 'high';
  } else if (hasParsedTitle || titleLength >= 8) {
    titleConfidence = 'medium';
  }

  let sourceConfidence: UrlImportConfidence = 'low';
  if (cleanedWordCount >= 180 && input.cleaned.stats.suspiciousLeftovers === 0) {
    sourceConfidence = 'high';
  } else if (cleanedWordCount >= 80 && input.cleaned.stats.suspiciousLeftovers <= 3) {
    sourceConfidence = 'medium';
  }

  return {
    titleConfidence,
    sourceConfidence,
    titleOrigin: hasParsedTitle ? 'page' : 'fallback',
    rawWordCount,
    cleanedWordCount,
    rawExcerpt: toExcerpt(input.rawText),
    cleanedExcerpt: toExcerpt(input.cleaned.text),
    removedLineSamples: input.cleaned.removedLineSamples,
  };
};
