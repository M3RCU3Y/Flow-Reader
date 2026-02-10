import type {
  ExtractPdfOptions,
  PDFJS,
  PDFTextContent,
  PDFTextItem,
  PdfExtractStage,
} from '../types';

declare global {
  interface Window {
    pdfjsLib: PDFJS;
  }
}

class PdfImportError extends Error {
  code: 'CANCELLED' | 'TOO_LARGE' | 'PASSWORD_REQUIRED' | 'FAILED';
  details?: unknown;

  constructor(code: PdfImportError['code'], message: string, details?: unknown) {
    super(message);
    this.name = 'PdfImportError';
    this.code = code;
    this.details = details;
  }
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const normalizeLine = (line: string) =>
  line
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

const cleanPageText = (text: string) => {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .normalize('NFKC')
    .replace(/\bcid:\d+\b/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n');

  // Dehyphenate across line breaks: "exam-\nple" -> "example"
  const dehyphenated = normalized.replace(/(\p{L}{2,})-\n(\p{L}{2,})/gu, '$1$2');

  const lines = dehyphenated
    .split('\n')
    .map((l) => normalizeLine(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return lines;
};

type LineItem = {
  str: string;
  x: number;
  y: number;
  width?: number;
};

const buildTextFromTextContent = (
  textContent: PDFTextContent,
  pageWidth: number
): { text: string; nonWhitespaceChars: number } => {
  const items: LineItem[] = (textContent.items as PDFTextItem[])
    .map((item) => {
      const t = item.transform || [0, 0, 0, 0, 0, 0];
      const x = t[4] ?? 0;
      const y = t[5] ?? 0;
      return { str: item.str ?? '', x, y, width: item.width };
    })
    .filter((it) => it.str && it.str.trim().length > 0);

  if (items.length === 0) return { text: '', nonWhitespaceChars: 0 };

  // Estimate average character width for spacing heuristics.
  const charWidths = items
    .filter((it) => typeof it.width === 'number' && it.width! > 0 && it.str.length > 0)
    .map((it) => it.width! / it.str.length)
    .filter((w) => Number.isFinite(w) && w > 0);
  const avgCharWidth = clamp(median(charWidths) || 5, 1, 20);
  const yTolerance = 2.5;

  // Sort by y (top to bottom) then x.
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > yTolerance) return b.y - a.y;
    return a.x - b.x;
  });

  // Group into lines by y coordinate.
  const lines: Array<{ y: number; items: LineItem[] }> = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(last.y - it.y) > yTolerance) {
      lines.push({ y: it.y, items: [it] });
    } else {
      last.items.push(it);
    }
  }

  // Normalize each line: sort by x and join with spacing based on gaps.
  const normalizedLines = lines
    .map((line) => {
      const lineItems = [...line.items].sort((a, b) => a.x - b.x);
      let out = '';
      let prevEndX: number | null = null;
      let prevStr = '';

      for (const it of lineItems) {
        const str = it.str;
        const x = it.x;
        const width = typeof it.width === 'number' ? it.width : str.length * avgCharWidth;
        const endX = x + width;

        let prefix = '';
        if (out.length > 0) {
          const gap = prevEndX == null ? avgCharWidth : x - prevEndX;
          const needsSpace = gap > avgCharWidth * 0.55;
          prefix = needsSpace ? ' ' : '';
          if (/^[,.;:!?)]/.test(str)) prefix = '';
          if (prevStr.endsWith('(')) prefix = '';
        }

        out += prefix + str;
        prevEndX = endX;
        prevStr = str;
      }

      return {
        y: line.y,
        startX: lineItems[0]?.x ?? 0,
        text: normalizeLine(out),
      };
    })
    .filter((l) => l.text.length > 0);

  if (normalizedLines.length === 0) return { text: '', nonWhitespaceChars: 0 };

  // Detect a simple 2-column layout by clustering line start X positions.
  const starts = normalizedLines.map((l) => l.startX).sort((a, b) => a - b);
  const minX = starts[0] ?? 0;
  const maxX = starts[starts.length - 1] ?? 0;
  let twoColumns = false;
  let splitX = 0;

  if (starts.length >= 12 && pageWidth > 0) {
    let c1 = minX;
    let c2 = maxX;
    for (let iter = 0; iter < 6; iter++) {
      const a: number[] = [];
      const b: number[] = [];
      for (const s of starts) {
        (Math.abs(s - c1) <= Math.abs(s - c2) ? a : b).push(s);
      }
      if (a.length) c1 = a.reduce((sum, v) => sum + v, 0) / a.length;
      if (b.length) c2 = b.reduce((sum, v) => sum + v, 0) / b.length;
    }

    const separation = Math.abs(c2 - c1);
    const left = Math.min(c1, c2);
    const right = Math.max(c1, c2);
    const leftCount = starts.filter((s) => Math.abs(s - left) < Math.abs(s - right)).length;
    const rightCount = starts.length - leftCount;

    twoColumns =
      separation > pageWidth * 0.22 &&
      left < pageWidth * 0.28 &&
      right > pageWidth * 0.44 &&
      leftCount >= 6 &&
      rightCount >= 6;

    if (twoColumns) splitX = (left + right) / 2;
  }

  const orderLines = (ls: typeof normalizedLines) => {
    const byY = [...ls].sort((a, b) => b.y - a.y);
    const gaps: number[] = [];
    for (let i = 0; i < byY.length - 1; i++) gaps.push(byY[i].y - byY[i + 1].y);
    const medGap = median(gaps.filter((g) => g > 0));
    const paragraphGap = medGap > 0 ? medGap * 1.6 : Infinity;

    let out = '';
    for (let i = 0; i < byY.length; i++) {
      const cur = byY[i];
      out += cur.text;
      if (i === byY.length - 1) break;
      const gap = cur.y - byY[i + 1].y;
      out += gap > paragraphGap ? '\n\n' : '\n';
    }
    return out;
  };

  const pageText = twoColumns
    ? `${orderLines(normalizedLines.filter((l) => l.startX < splitX))}\n\n${orderLines(
        normalizedLines.filter((l) => l.startX >= splitX)
      )}`
    : orderLines(normalizedLines);

  const nonWhitespaceChars = pageText.replace(/\s/g, '').length;
  return { text: pageText, nonWhitespaceChars };
};

const emitProgress = (
  opts: ExtractPdfOptions | undefined,
  info: { stage: PdfExtractStage; page: number; numPages: number; message?: string }
) => {
  opts?.onProgress?.(info);
};

export const extractTextFromPDF = async (file: File, opts?: ExtractPdfOptions): Promise<string> => {
  if (!window.pdfjsLib) throw new Error('PDF.js library not loaded');

  const signal = opts?.signal;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new PdfImportError('CANCELLED', 'Import cancelled');
  };

  try {
    throwIfAborted();
    const arrayBuffer = await file.arrayBuffer();
    throwIfAborted();

    emitProgress(opts, { stage: 'loading', page: 0, numPages: 0, message: 'Loading PDF…' });

    const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });

    loadingTask.onPassword = async (updatePassword, reason) => {
      if (!opts?.requestPassword) {
        throw new PdfImportError('PASSWORD_REQUIRED', 'This PDF requires a password.');
      }
      const pw = await opts.requestPassword({
        reason: reason === 2 ? 'wrong_password' : 'need_password',
      });
      if (!pw) throw new PdfImportError('CANCELLED', 'Password entry cancelled.');
      updatePassword(pw);
    };

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 0;

    if (numPages > 250 && !opts?.allowLargePdf) {
      throw new PdfImportError('TOO_LARGE', `This PDF is large (${numPages} pages).`, { numPages });
    }

    emitProgress(opts, { stage: 'loading', page: 0, numPages, message: `Loaded (${numPages} pages)` });

    // Lazy-load OCR only if needed.
    let ocrWorker: any | null = null;
    let lastOcrUpdateTs = 0;
    let lastOcrPercent = -1;

    const ensureOcrWorker = async () => {
      if (ocrWorker) return ocrWorker;
      const mod: any = await import('tesseract.js');
      const createWorker = mod.createWorker ?? mod.default?.createWorker;
      if (!createWorker) throw new PdfImportError('FAILED', 'OCR module failed to load.');

      const worker = await createWorker({
        logger: (m: any) => {
          if (signal?.aborted) return;
          if (m?.status !== 'recognizing text') return;
          const p = typeof m.progress === 'number' ? m.progress : 0;
          const percent = Math.round(p * 100);
          const now = Date.now();
          if (percent === lastOcrPercent) return;
          if (now - lastOcrUpdateTs < 250 && percent < 98) return;
          lastOcrUpdateTs = now;
          lastOcrPercent = percent;
          emitProgress(opts, { stage: 'ocr', page: 0, numPages, message: `Running OCR… ${percent}%` });
        },
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        // Some builds fetch language data relative to langPath; we pin eng directly.
        langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js-data@1.0.0/eng.traineddata.gz',
      });

      if (worker.loadLanguage && worker.initialize) {
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
      }

      ocrWorker = worker;
      return ocrWorker;
    };

    const recognizePageWithOcr = async (page: any, scale: number) => {
      throwIfAborted();
      const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new PdfImportError('FAILED', 'Canvas context unavailable for OCR.');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      await page.render({ canvasContext: ctx, viewport }).promise;
      throwIfAborted();

      const worker = await ensureOcrWorker();
      const res = await worker.recognize(canvas);
      return res?.data?.text ?? '';
    };

    const parts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      throwIfAborted();
      emitProgress(opts, { stage: 'extracting', page: i, numPages, message: `Extracting… (${i}/${numPages})` });

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
      const textContent = await page.getTextContent();
      const { text: pageText, nonWhitespaceChars } = buildTextFromTextContent(textContent, viewport.width);

      let finalText = pageText;
      if (nonWhitespaceChars < 30) {
        lastOcrPercent = -1;
        lastOcrUpdateTs = 0;
        emitProgress(opts, { stage: 'ocr', page: i, numPages, message: 'Running OCR…' });
        const scale = opts?.ocrScale ?? 2.0;
        finalText = await recognizePageWithOcr(page, scale);
      }

      parts.push(cleanPageText(finalText));
      await nextFrame();
    }

    throwIfAborted();
    emitProgress(opts, { stage: 'cleaning', page: numPages, numPages, message: 'Final cleanup…' });

    const combined = parts
      .filter((p) => p && p.trim().length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (ocrWorker?.terminate) {
      try {
        await ocrWorker.terminate();
      } catch {
        // ignore
      }
    }

    emitProgress(opts, { stage: 'cleaning', page: numPages, numPages, message: 'Done' });
    return combined;
  } catch (err) {
    if (err instanceof PdfImportError) throw err;
    console.error('Error parsing PDF:', err);
    throw new PdfImportError('FAILED', 'Failed to extract text from PDF', err);
  }
};

