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

export interface ReaderPreferences {
  lastMode: ReaderMode;
  contextStrength: ContextStrength;
  bionicStrength: number;
  lineWidth: LineWidth;
}

export interface BookSettings {
  mode?: ReaderMode;
  contextStrength?: ContextStrength;
  bionicStrength?: number;
  lineWidth?: LineWidth;
  bionicScrollPercent?: number;
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

// Interface for the global pdfjsLib object
export interface PDFJS {
  getDocument: (url: string | Uint8Array) => {
    promise: Promise<PDFDocumentProxy>;
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
}

export interface PDFTextContent {
  items: Array<{ str: string }>;
}
