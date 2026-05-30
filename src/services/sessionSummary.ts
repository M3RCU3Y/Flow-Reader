import { SessionSummary } from '../types';

export const MIN_MEANINGFUL_SESSION_MS = 1200;

interface BuildSessionSummaryInput {
  bookId: string;
  startedAt: number | null;
  endedAt: number;
  wordsRead: number;
  currentWpm: number;
  wpmSamples: number[];
  rewinds: number;
  bookmarksAdded: number;
  notesAdded: number;
  makeId?: () => string;
}

export const buildSessionSummary = ({
  bookId,
  startedAt,
  endedAt,
  wordsRead,
  currentWpm,
  wpmSamples,
  rewinds,
  bookmarksAdded,
  notesAdded,
  makeId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`,
}: BuildSessionSummaryInput): SessionSummary | null => {
  if (!startedAt) return null;
  const durationMs = Math.max(0, endedAt - startedAt);
  const hasMeaningfulActivity = wordsRead > 0 || bookmarksAdded > 0 || notesAdded > 0;
  if (durationMs < MIN_MEANINGFUL_SESSION_MS && !hasMeaningfulActivity) {
    return null;
  }

  const avgWpm = wpmSamples.length
    ? Math.round(wpmSamples.reduce((sum, sample) => sum + sample, 0) / wpmSamples.length)
    : currentWpm;

  return {
    id: makeId(),
    bookId,
    startedAt,
    endedAt,
    wordsRead,
    avgWpm,
    rewinds,
    bookmarksAdded,
    notesAdded,
  };
};
