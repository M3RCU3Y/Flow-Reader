export interface Book {
  id: string;
  title: string;
  text: string;
  words: string[];
  progressIndex: number; // Current word index
  createdAt: number;
  lastReadAt: number;
  settings?: BookSettings;
}

export interface ReadingStats {
  totalWordsRead: number;
  sessionMinutes: number;
}

export interface RSVPState {
  isPlaying: boolean;
  wpm: number;
  currentWordIndex: number;
}

export type ProcessingStatus = 'idle' | 'processing' | 'error' | 'success';

export type ReaderMode = 'rsvp' | 'rsvp_enhanced' | 'bionic_flow';
export type ContextStrength = 'low' | 'medium' | 'high';
export type LineWidth = 'normal' | 'wide' | 'focused';
export type SourceType = 'paste' | 'pdf' | 'docx' | 'url';

export interface SourceMeta {
  sourceType: SourceType;
  sourceUrl?: string;
}

export interface ReaderPreferences {
  lastMode: ReaderMode;
  contextStrength: ContextStrength;
  bionicStrength: number;
  bionicFontSize: number;
  lineWidth: LineWidth;
  smartTimingEnabled?: boolean;
  comfortModeEnabled?: boolean;
}

export interface BookSettings {
  mode?: ReaderMode;
  contextStrength?: ContextStrength;
  bionicStrength?: number;
  bionicFontSize?: number;
  lineWidth?: LineWidth;
  bionicScrollPercent?: number;
  bookmarks?: Bookmark[];
  notes?: Note[];
  sourceMeta?: SourceMeta;
  lastSessionSummary?: SessionSummary;
}

export interface Bookmark {
  id: string;
  index: number;
  note?: string;
  createdAt: number;
  pinnedAt?: number;
}

export interface Note {
  id: string;
  index: number;
  text: string;
  createdAt: number;
  updatedAt: number;
  pinnedAt?: number;
}


export interface SessionSummary {
  id: string;
  bookId: string;
  startedAt: number;
  endedAt: number;
  wordsRead: number;
  avgWpm: number;
  rewinds: number;
  bookmarksAdded: number;
  notesAdded: number;
}

export interface ThemeTokens {
  appBg: string;
  panelBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  bionicHighlight: string;
  progress: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  tokens: ThemeTokens;
  basePresetId?: string;
  isPreset?: boolean;
}

export type PdfExtractStage = 'loading' | 'extracting' | 'ocr' | 'cleaning';

export interface ExtractPdfProgressInfo {
  stage: PdfExtractStage;
  page: number;
  numPages: number;
  message?: string;
}

export interface ExtractPdfOptions {
  signal?: AbortSignal;
  onProgress?: (info: ExtractPdfProgressInfo) => void;
  requestPassword?: (info: { reason: 'need_password' | 'wrong_password' }) => Promise<string | null>;
  allowLargePdf?: boolean;
  ocrScale?: number;
}

// Interface for the global pdfjsLib object
export interface PDFJS {
  getDocument: (
    src: string | Uint8Array | { data: Uint8Array }
  ) => {
    promise: Promise<PDFDocumentProxy>;
    onPassword?: (updatePassword: (password: string) => void, reason: number) => void;
  };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

export interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
  getTextContent: () => Promise<PDFTextContent>;
  getViewport: (opts: { scale: number; rotation?: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
  rotate?: number;
}

export interface PDFTextContent {
  items: PDFTextItem[];
}

export interface PDFTextItem {
  str: string;
  transform?: number[]; // [a,b,c,d,e,f]
  width?: number;
}
