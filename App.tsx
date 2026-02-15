import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book, BookSettings, Bookmark, ReaderMode, ReaderPreferences } from './types';
import { useRSVP } from './hooks/useRSVP';
import { saveBook, getLibrary, deleteBook, updateBookProgress, clearLibrary, clearAllData, updateBookSettings, updateBookTitle } from './services/storage';
import { getReaderPreferences, saveReaderPreferences } from './services/preferences';
import { ControlCenter } from './components/ControlCenter';
import { TextInput } from './components/TextInput';
import { Library } from './components/Library';
import { ModeToggle } from './components/ModeToggle';
import { RSVPReader } from './components/RSVPReader';
import { RSVPEnhancedReader } from './components/RSVPEnhancedReader';
import { BionicFlowReader } from './components/BionicFlowReader';
import { BionicControls } from './components/BionicControls';
import { ThemeSelector } from './components/ThemeSelector';
import { HelpOverlay } from './components/HelpOverlay';
import { BookMarked, Trash2, Menu, PanelLeftClose, Download } from 'lucide-react';
import { BookmarksPanel } from './components/BookmarksPanel';
import { LibrarySortMenu } from './components/LibrarySortMenu';

export default function App() {
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [library, setLibrary] = useState<Book[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // On narrow viewports, default to closed so the drawer doesn't cover the whole app on load.
    // This is evaluated client-side only (Vite app).
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 768px)').matches;
  });
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [librarySort, setLibrarySort] = useState<'recent' | 'progress' | 'created'>('recent');
  const uiIdleTimeoutRef = useRef<number | null>(null);
  const [isBionicScrolling, setIsBionicScrolling] = useState(false);
  const bionicScrollIdleTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const touchMovedRef = useRef(false);
  const tapHideTimeoutTopRef = useRef<number | null>(null);
  const tapHideTimeoutBottomRef = useRef<number | null>(null);
  const suppressRevealUntilRef = useRef(0);
  const [isTopHotspotActive, setIsTopHotspotActive] = useState(false);
  const [isBottomHotspotActive, setIsBottomHotspotActive] = useState(false);
  const topHotspotHideTimeoutRef = useRef<number | null>(null);
  const bottomHotspotHideTimeoutRef = useRef<number | null>(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isFooterHovered, setIsFooterHovered] = useState(false);
  const [isHeaderFocused, setIsHeaderFocused] = useState(false);
  const [isFooterFocused, setIsFooterFocused] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isThemeHovered, setIsThemeHovered] = useState(false);
  const [isThemeFocused, setIsThemeFocused] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const headerControlsRef = useRef<HTMLDivElement | null>(null);
  const footerControlsRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [controlsModeReady, setControlsModeReady] = useState(true);
  const [isCompactPortrait, setIsCompactPortrait] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [suppressHelp, setSuppressHelp] = useState(false);
  const [showBionicHint, setShowBionicHint] = useState(false);
  const [isBionicHintFading, setIsBionicHintFading] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

  const initialPrefs = useMemo<ReaderPreferences>(() => getReaderPreferences(), []);
  const [readerSettings, setReaderSettings] = useState<ReaderPreferences>(initialPrefs);
  const [controlsPrevMode, setControlsPrevMode] = useState<ReaderMode | null>(null);
  const defaultPrefsRef = useRef<ReaderPreferences>(initialPrefs);
  const bionicScrollPercentRef = useRef<number | null>(null);
  const scrollPersistTimeoutRef = useRef<number | null>(null);
  const controlsCleanupTimeoutRef = useRef<number | null>(null);
  const previousModeRef = useRef<ReaderMode>(initialPrefs.lastMode);
  const bionicHintFadeRef = useRef<number | null>(null);
  const bionicHintHideRef = useRef<number | null>(null);

  // Initialize library
  useEffect(() => {
    setLibrary(getLibrary());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('focus_reader_help_prefs');
      const parsed = raw ? (JSON.parse(raw) as { suppressHelp?: boolean }) : null;
      setSuppressHelp(Boolean(parsed?.suppressHelp));
    } catch {
      // ignore
    }
  }, []);

  const setHelpSuppressed = (next: boolean) => {
    setSuppressHelp(next);
    try {
      localStorage.setItem('focus_reader_help_prefs', JSON.stringify({ suppressHelp: next }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }
    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: portrait) and (max-width: 1024px)');
    const update = () => setIsCompactPortrait(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const update = () => setIsNarrowViewport(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const showDashboardHamburger = !isSidebarOpen && !activeBook;

  const handleStartNew = (title: string, text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const newBook: Book = {
      id: Date.now().toString(),
      title,
      text,
      words,
      progressIndex: 0,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
    };
    saveBook(newBook);
    setLibrary(getLibrary());
    setActiveBook(newBook);
    // Enter Focus Mode
    setIsSidebarOpen(false);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = deleteBook(id);
    setLibrary(updated);
    if (activeBook?.id === id) setActiveBook(null);
  };

  const handleClearData = () => {
    if (confirm('Clear all Focus Reader data on this device? This removes your library, preferences, and themes.')) {
      clearAllData();
      setLibrary([]);
      setActiveBook(null);
    }
  };

  const handleSelectBook = (book: Book) => {
    setActiveBook(book);
    // Enter Focus Mode
    setIsSidebarOpen(false);
  };

  const handleExitReader = () => {
    if (activeBook) {
      updateBookProgress(activeBook.id, rsvp.index);
      setLibrary(getLibrary());
    }
    setActiveBook(null);
    // Return to Dashboard View
    setIsSidebarOpen(true);
  };

  const saveTitle = (nextTitle: string) => {
    if (!activeBook) return;
    const trimmed = nextTitle.trim();
    const finalTitle = trimmed || activeBook.title;
    if (finalTitle === activeBook.title) {
      setIsEditingTitle(false);
      setTitleDraft(activeBook.title);
      return;
    }
    updateBookTitle(activeBook.id, finalTitle);
    setActiveBook({ ...activeBook, title: finalTitle });
    setLibrary(getLibrary());
    setIsEditingTitle(false);
    setTitleDraft(finalTitle);
  };

  const exportActiveBook = () => {
    if (!activeBook) return;
    const rawName = (activeBook.title || 'focus-reader').trim() || 'focus-reader';
    const safeName = rawName.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 80);
    const blob = new Blob([activeBook.text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 250);
  };

  const getActiveBookmarks = (): Bookmark[] => {
    return (activeBook?.settings?.bookmarks || []).slice();
  };

  const saveActiveBookmarks = (next: Bookmark[]) => {
    if (!activeBook) return;
    updateBookSettings(activeBook.id, { bookmarks: next });
    setActiveBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          ...(prev.settings || {}),
          bookmarks: next,
        },
      };
    });
    setLibrary(getLibrary());
  };

  const addBookmark = (note?: string) => {
    if (!activeBook) return;
    const nextIndex = rsvp.index;
    const existing = getActiveBookmarks();
    if (existing.some((b) => b.index === nextIndex)) return;
    const bm: Bookmark = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      index: nextIndex,
      note,
      createdAt: Date.now(),
    };
    saveActiveBookmarks([bm, ...existing].slice(0, 200));
  };

  const deleteBookmark = (id: string) => {
    const existing = getActiveBookmarks();
    saveActiveBookmarks(existing.filter((b) => b.id !== id));
  };

  const jumpToBookmark = (idx: number) => {
    rsvp.seek(idx);
    if (activeBook) {
      updateBookProgress(activeBook.id, idx);
      setLibrary(getLibrary());
    }
    setIsBookmarksOpen(false);
  };

  const getBookmarkSnippet = (idx: number) => {
    const slice = rsvp.words.slice(idx, idx + 8).join(' ');
    return slice ? `“${slice}…”` : '';
  };

  // Toggle Sidebar manually
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // RSVP Hook
  const rsvp = useRSVP({
    initialText: activeBook?.text,
    initialIndex: activeBook?.progressIndex,
    initialWpm: 300,
    smartTimingEnabled: readerSettings.smartTimingEnabled ?? true,
    comfortModeEnabled: readerSettings.comfortModeEnabled ?? true,
    onProgress: (idx) => {
       // local update
    }
  });

  const requestedMode = readerSettings.lastMode;
  const mode: ReaderMode = isCompactPortrait && requestedMode === 'rsvp_enhanced' ? 'rsvp' : requestedMode;
  const contextStrength = readerSettings.contextStrength;
  const bionicStrength = readerSettings.bionicStrength;
  const lineWidth = readerSettings.lineWidth;
  const showRsvpScrim = Boolean(activeBook && mode !== 'bionic_flow' && rsvp.isPlaying);
  // On touch devices (mobile), focus can "stick" after tapping buttons, which can accidentally
  // keep the UI visible forever. Treat focus as an engagement signal only on non-narrow viewports.
  const isThemeEngaged = isThemeOpen || isThemeHovered || (isThemeFocused && !isNarrowViewport);
  const isBionicMode = mode === 'bionic_flow';
  // Use an overlay controls bar so the RSVP word can be truly centered in the full viewport
  // (controls shouldn't "steal" height from the reader area).
  const isFooterOverlay = isBionicMode || isCompactPortrait || mode === 'rsvp' || mode === 'rsvp_enhanced';
  const isLibraryDrawer = isNarrowViewport;

  const visibleLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    let items = library;
    if (q) {
      items = library.filter((b) => {
        const title = (b.title || '').toLowerCase();
        if (title.includes(q)) return true;
        // Content search can be heavy; cap to the first chunk for responsiveness.
        const sample = (b.text || '').slice(0, 6000).toLowerCase();
        return sample.includes(q);
      });
    }

    const sorted = [...items];
    if (librarySort === 'created') {
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (librarySort === 'progress') {
      sorted.sort((a, b) => {
        const ap = a.words?.length ? a.progressIndex / a.words.length : 0;
        const bp = b.words?.length ? b.progressIndex / b.words.length : 0;
        if (bp !== ap) return bp - ap;
        return (b.lastReadAt || 0) - (a.lastReadAt || 0);
      });
    } else {
      sorted.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
    }

    return sorted;
  }, [library, libraryQuery, librarySort]);

  const headerEngagedRef = useRef(false);
  const footerEngagedRef = useRef(false);
  const themeEngagedRef = useRef(false);
  const pointerInTopHotspotRef = useRef(false);
  const pointerInBottomHotspotRef = useRef(false);

  const lastRsvpPreferenceRef = useRef<ReaderMode>('rsvp');
  useEffect(() => {
    if (requestedMode === 'rsvp' || requestedMode === 'rsvp_enhanced') {
      lastRsvpPreferenceRef.current = requestedMode;
    }
  }, [requestedMode]);

  useEffect(() => {
    headerEngagedRef.current = isHeaderHovered || isHeaderFocused;
  }, [isHeaderHovered, isHeaderFocused]);

  useEffect(() => {
    footerEngagedRef.current = isFooterHovered || isFooterFocused;
  }, [isFooterHovered, isFooterFocused]);

  useEffect(() => {
    themeEngagedRef.current = isThemeEngaged;
  }, [isThemeEngaged]);

  const isHeaderVisibleBionic =
    !isBionicScrolling && (isTopHotspotActive || isHeaderHovered || isHeaderFocused);
  const isFooterVisibleBionic =
    !isBionicScrolling &&
    (isBottomHotspotActive || isFooterHovered || isFooterFocused || isThemeEngaged);

  const isHeaderVisible = !activeBook ? true : isBionicMode ? isHeaderVisibleBionic : isUiVisible;
  const isFooterVisible = !activeBook ? true : isBionicMode ? isFooterVisibleBionic : isUiVisible;
  const isThemeVisible = !activeBook || (isBionicMode ? isFooterVisibleBionic : isUiVisible) || isThemeEngaged;

  const applyBookSettings = (updates: Partial<BookSettings>) => {
    if (!activeBook) return;
    setActiveBook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          ...(prev.settings || {}),
          ...updates,
        },
      };
    });
    updateBookSettings(activeBook.id, updates);
    setLibrary(getLibrary());
  };

  const updateReaderSettings = (updates: Partial<ReaderPreferences>, bookUpdates?: Partial<BookSettings>) => {
    setReaderSettings((prev) => {
      const next = { ...prev, ...updates };
      saveReaderPreferences(next);
      defaultPrefsRef.current = next;
      return next;
    });
    if (bookUpdates) {
      applyBookSettings(bookUpdates);
    }
  };

  const handleModeChange = (nextMode: ReaderMode) => {
    if (isCompactPortrait) {
      if (nextMode === 'rsvp') {
        // Preserve the user's RSVP preference (RSVP vs RSVP+) while portrait blocks RSVP+.
        const desired = lastRsvpPreferenceRef.current;
        if (desired !== requestedMode) {
          updateReaderSettings({ lastMode: desired }, { mode: desired });
        }
        return;
      }
      if (nextMode === 'rsvp_enhanced') {
        // Not selectable in portrait; treat as base RSVP.
        return;
      }
    }
    updateReaderSettings({ lastMode: nextMode }, { mode: nextMode });
  };

  // Persist progress periodically
  useEffect(() => {
    if (activeBook) {
      const interval = setInterval(() => {
        updateBookProgress(activeBook.id, rsvp.index);
        setLibrary(getLibrary()); 
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeBook, rsvp.index]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeBook || mode === 'bionic_flow') return;
      if (e.code === 'Space') {
        e.preventDefault();
        rsvp.togglePlay();
      }
      if (e.code === 'KeyR') {
        rsvp.reset();
      }
      if (e.code === 'ArrowLeft') {
         rsvp.seek(Math.max(0, rsvp.index - 10));
      }
      if (e.code === 'ArrowRight') {
         rsvp.seek(Math.min(rsvp.totalWords - 1, rsvp.index + 10));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBook, mode, rsvp]);

  useEffect(() => {
    if (mode === 'bionic_flow' && rsvp.isPlaying) {
      rsvp.togglePlay();
    }
  }, [mode, rsvp]);

  const clearBionicHintTimers = () => {
    if (bionicHintFadeRef.current) {
      window.clearTimeout(bionicHintFadeRef.current);
      bionicHintFadeRef.current = null;
    }
    if (bionicHintHideRef.current) {
      window.clearTimeout(bionicHintHideRef.current);
      bionicHintHideRef.current = null;
    }
  };

  const dismissBionicHint = () => {
    clearBionicHintTimers();
    setIsBionicHintFading(true);
    bionicHintHideRef.current = window.setTimeout(() => {
      setShowBionicHint(false);
      setIsBionicHintFading(false);
      bionicHintHideRef.current = null;
    }, 320);
  };

  useEffect(() => {
    if (!activeBook) return;
    if (mode !== 'bionic_flow') return;
    // First-time bionic hint (local-only).
    try {
      const seen = localStorage.getItem('focus_reader_seen_bionic_hint') === 'true';
      if (seen) return;
      setShowBionicHint(true);
      setIsBionicHintFading(false);
      localStorage.setItem('focus_reader_seen_bionic_hint', 'true');
      bionicHintFadeRef.current = window.setTimeout(() => {
        setIsBionicHintFading(true);
        bionicHintFadeRef.current = null;
      }, 3500);
      bionicHintHideRef.current = window.setTimeout(() => {
        setShowBionicHint(false);
        setIsBionicHintFading(false);
        bionicHintHideRef.current = null;
      }, 3820);
      return () => clearBionicHintTimers();
    } catch {
      // ignore
    }
  }, [activeBook?.id, mode]);

  useEffect(() => clearBionicHintTimers, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      if (controlsCleanupTimeoutRef.current) {
        window.clearTimeout(controlsCleanupTimeoutRef.current);
        controlsCleanupTimeoutRef.current = null;
      }
      setControlsPrevMode(null);
      setControlsModeReady(true);
      previousModeRef.current = mode;
      return;
    }
    const previousMode = previousModeRef.current;
    if (mode === previousMode) return;
    if (controlsCleanupTimeoutRef.current) {
      window.clearTimeout(controlsCleanupTimeoutRef.current);
      controlsCleanupTimeoutRef.current = null;
    }
    setControlsPrevMode(previousMode);
    setControlsModeReady(false);
    const frame = window.requestAnimationFrame(() => setControlsModeReady(true));
    controlsCleanupTimeoutRef.current = window.setTimeout(() => {
      setControlsPrevMode(null);
      controlsCleanupTimeoutRef.current = null;
    }, 520);
    previousModeRef.current = mode;
    return () => window.cancelAnimationFrame(frame);
  }, [mode, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (controlsCleanupTimeoutRef.current) {
        window.clearTimeout(controlsCleanupTimeoutRef.current);
        controlsCleanupTimeoutRef.current = null;
      }
    };
  }, []);

  const isFocusWithinHeaderControls = () => {
    const active = document.activeElement;
    if (!active) return false;
    return Boolean(headerControlsRef.current && headerControlsRef.current.contains(active));
  };

  const isFocusWithinFooterControls = () => {
    const active = document.activeElement;
    if (!active) return false;
    return Boolean(footerControlsRef.current && footerControlsRef.current.contains(active));
  };

  const handleHeaderFocusCapture = () => setIsHeaderFocused(true);
  const handleHeaderBlurCapture = () => {
    window.setTimeout(() => {
      if (!isFocusWithinHeaderControls()) {
        setIsHeaderFocused(false);
      }
    }, 0);
  };

  const handleFooterFocusCapture = () => setIsFooterFocused(true);
  const handleFooterBlurCapture = () => {
    window.setTimeout(() => {
      if (!isFocusWithinFooterControls()) {
        setIsFooterFocused(false);
      }
    }, 0);
  };

  useEffect(() => {
    if (!activeBook) {
      setIsUiVisible(true);
      return;
    }

    if (mode === 'bionic_flow') return;

    const showUi = () => {
      setIsUiVisible(true);
      if (uiIdleTimeoutRef.current) {
        window.clearTimeout(uiIdleTimeoutRef.current);
      }
      if (isThemeEngaged) {
        return;
      }
      uiIdleTimeoutRef.current = window.setTimeout(() => {
        setIsUiVisible(false);
      }, 1600);
    };

    const handleScroll = () => {
      showUi();
    };

    showUi();
    window.addEventListener('mousemove', showUi);
    window.addEventListener('mousedown', showUi);
    window.addEventListener('keydown', showUi);
    window.addEventListener('touchstart', showUi);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousemove', showUi);
      window.removeEventListener('mousedown', showUi);
      window.removeEventListener('keydown', showUi);
      window.removeEventListener('touchstart', showUi);
      window.removeEventListener('scroll', handleScroll, true);
      if (uiIdleTimeoutRef.current) {
        window.clearTimeout(uiIdleTimeoutRef.current);
        uiIdleTimeoutRef.current = null;
      }
    };
  }, [activeBook?.id, mode, isThemeEngaged]);

	useEffect(() => {
	  if (!activeBook || mode !== 'bionic_flow') return;

    // Bionic mode is "zen": UI stays hidden unless the user reaches for it (hotspots or focus).
    setIsUiVisible(false);
    setIsBionicScrolling(false);
    setIsTopHotspotActive(false);
    setIsBottomHotspotActive(false);
    setIsHeaderHovered(false);
    setIsFooterHovered(false);
    setIsHeaderFocused(false);
    setIsFooterFocused(false);

	    const TOP_HOTSPOT_PX = 160;
	    const BOTTOM_HOTSPOT_PX = 280;
	    const hideDelayMs = 380;
	    const tapHoldMs = 1800;
	    const revealSuppressAfterScrollMs = 400;
	    const scrollIdleMs = 420;

	    const clearTapTimers = () => {
	      if (tapHideTimeoutTopRef.current) {
	        window.clearTimeout(tapHideTimeoutTopRef.current);
	        tapHideTimeoutTopRef.current = null;
	      }
	      if (tapHideTimeoutBottomRef.current) {
	        window.clearTimeout(tapHideTimeoutBottomRef.current);
	        tapHideTimeoutBottomRef.current = null;
	      }
	    };

	    const clearHotspotTimers = () => {
	      if (topHotspotHideTimeoutRef.current) {
	        window.clearTimeout(topHotspotHideTimeoutRef.current);
	        topHotspotHideTimeoutRef.current = null;
	      }
	      if (bottomHotspotHideTimeoutRef.current) {
	        window.clearTimeout(bottomHotspotHideTimeoutRef.current);
	        bottomHotspotHideTimeoutRef.current = null;
	      }
	    };

	    const handleScroll = () => {
	      suppressRevealUntilRef.current =
	        (typeof performance !== 'undefined' ? performance.now() : Date.now()) + revealSuppressAfterScrollMs;
	      setIsBionicScrolling(true);
	      // While scrolling: force-hide. Reveal is only via subsequent hotspot/focus.
	      clearTapTimers();
	      clearHotspotTimers();
	      setIsTopHotspotActive(false);
	      setIsBottomHotspotActive(false);
	      pointerInTopHotspotRef.current = false;
	      pointerInBottomHotspotRef.current = false;
	      touchStartRef.current = null;
	      touchMovedRef.current = false;
	      if (bionicScrollIdleTimeoutRef.current) {
	        window.clearTimeout(bionicScrollIdleTimeoutRef.current);
	      }
	      bionicScrollIdleTimeoutRef.current = window.setTimeout(() => {
	        setIsBionicScrolling(false);
	      }, scrollIdleMs);
	    };

    const updateHotspot = (withinTop: boolean, withinBottom: boolean) => {
      pointerInTopHotspotRef.current = withinTop;
      pointerInBottomHotspotRef.current = withinBottom;

      if (withinTop) {
        if (topHotspotHideTimeoutRef.current) {
          window.clearTimeout(topHotspotHideTimeoutRef.current);
          topHotspotHideTimeoutRef.current = null;
        }
        setIsTopHotspotActive(true);
      } else if (!topHotspotHideTimeoutRef.current) {
        topHotspotHideTimeoutRef.current = window.setTimeout(() => {
          // Only hide if the user didn't move into the controls or back into the hotspot.
          if (pointerInTopHotspotRef.current) return;
          if (headerEngagedRef.current) return;
          setIsTopHotspotActive(false);
          topHotspotHideTimeoutRef.current = null;
        }, hideDelayMs);
      }

      if (withinBottom) {
        if (bottomHotspotHideTimeoutRef.current) {
          window.clearTimeout(bottomHotspotHideTimeoutRef.current);
          bottomHotspotHideTimeoutRef.current = null;
        }
        setIsBottomHotspotActive(true);
      } else if (!bottomHotspotHideTimeoutRef.current) {
        bottomHotspotHideTimeoutRef.current = window.setTimeout(() => {
          if (pointerInBottomHotspotRef.current) return;
          if (footerEngagedRef.current) return;
          if (themeEngagedRef.current) return;
          setIsBottomHotspotActive(false);
          bottomHotspotHideTimeoutRef.current = null;
        }, hideDelayMs);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const withinTop = event.clientY <= TOP_HOTSPOT_PX;
      const withinBottom = event.clientY >= window.innerHeight - BOTTOM_HOTSPOT_PX;
      updateHotspot(withinTop, withinBottom);
    };

	    const handleTouchStart = (event: TouchEvent) => {
	      const touch = event.touches[0];
	      if (!touch) return;
	      touchStartRef.current = {
	        x: touch.clientX,
	        y: touch.clientY,
	        t: typeof performance !== 'undefined' ? performance.now() : Date.now(),
	      };
	      touchMovedRef.current = false;
	      // Do not reveal on touchstart; a swipe should not flash controls.
	    };

	    const handleTouchMove = (event: TouchEvent) => {
	      const start = touchStartRef.current;
	      const touch = event.touches[0];
	      if (!start || !touch) return;
	      const dx = touch.clientX - start.x;
	      const dy = touch.clientY - start.y;
	      if (Math.hypot(dx, dy) > 10) {
	        touchMovedRef.current = true;
	      }
	    };

	    const scheduleHideTop = () => {
	      if (tapHideTimeoutTopRef.current) window.clearTimeout(tapHideTimeoutTopRef.current);
	      tapHideTimeoutTopRef.current = window.setTimeout(() => {
	        tapHideTimeoutTopRef.current = null;
	        if (headerEngagedRef.current) return;
	        setIsTopHotspotActive(false);
	      }, tapHoldMs);
	    };

	    const scheduleHideBottom = () => {
	      if (tapHideTimeoutBottomRef.current) window.clearTimeout(tapHideTimeoutBottomRef.current);
	      tapHideTimeoutBottomRef.current = window.setTimeout(() => {
	        tapHideTimeoutBottomRef.current = null;
	        if (footerEngagedRef.current) return;
	        if (themeEngagedRef.current) return;
	        setIsBottomHotspotActive(false);
	      }, tapHoldMs);
	    };

	    const handleTouchEnd = () => {
	      const start = touchStartRef.current;
	      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
	      touchStartRef.current = null;

	      // If we were scrolling very recently, ignore tap reveal to avoid "regen".
	      if (now < suppressRevealUntilRef.current) {
	        touchMovedRef.current = false;
	        return;
	      }

	      if (!start) {
	        touchMovedRef.current = false;
	        return;
	      }

	      if (touchMovedRef.current) {
	        // Treat as scroll/drag gesture.
	        touchMovedRef.current = false;
	        return;
	      }

	      const withinTop = start.y <= TOP_HOTSPOT_PX;
	      const withinBottom = start.y >= window.innerHeight - BOTTOM_HOTSPOT_PX;

	      clearHotspotTimers();
	      clearTapTimers();

	      // Tap behavior:
	      // - near top: header only
	      // - near bottom: footer only
	      // - middle: show both (more forgiving on mobile)
	      if (withinTop) {
	        pointerInTopHotspotRef.current = true;
	        setIsTopHotspotActive(true);
	        scheduleHideTop();
	      } else {
	        pointerInTopHotspotRef.current = false;
	      }

	      if (withinBottom) {
	        pointerInBottomHotspotRef.current = true;
	        setIsBottomHotspotActive(true);
	        scheduleHideBottom();
	      } else {
	        pointerInBottomHotspotRef.current = false;
	      }

	      if (!withinTop && !withinBottom) {
	        pointerInTopHotspotRef.current = true;
	        pointerInBottomHotspotRef.current = true;
	        setIsTopHotspotActive(true);
	        setIsBottomHotspotActive(true);
	        scheduleHideTop();
	        scheduleHideBottom();
	      }

	      touchMovedRef.current = false;
	    };

    const handleMouseLeave = () => {
      clearHotspotTimers();
      pointerInTopHotspotRef.current = false;
      pointerInBottomHotspotRef.current = false;
      setIsTopHotspotActive(false);
      setIsBottomHotspotActive(false);
    };

	    window.addEventListener('scroll', handleScroll, true);
	    window.addEventListener('pointermove', handlePointerMove);
	    window.addEventListener('touchstart', handleTouchStart);
	    window.addEventListener('touchmove', handleTouchMove);
	    window.addEventListener('touchend', handleTouchEnd);
	    window.addEventListener('touchcancel', handleTouchEnd);
	    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
	      window.removeEventListener('scroll', handleScroll, true);
	      window.removeEventListener('pointermove', handlePointerMove);
	      window.removeEventListener('touchstart', handleTouchStart);
	      window.removeEventListener('touchmove', handleTouchMove);
	      window.removeEventListener('touchend', handleTouchEnd);
	      window.removeEventListener('touchcancel', handleTouchEnd);
	      window.removeEventListener('mouseleave', handleMouseLeave);
	      clearTapTimers();
	      clearHotspotTimers();
	      if (bionicScrollIdleTimeoutRef.current) {
	        window.clearTimeout(bionicScrollIdleTimeoutRef.current);
	        bionicScrollIdleTimeoutRef.current = null;
	      }
	    };
	  }, [activeBook?.id, mode]);

  useEffect(() => {
    if (mode !== 'bionic_flow') {
      setIsBionicScrolling(false);
      setIsTopHotspotActive(false);
      setIsBottomHotspotActive(false);
      pointerInTopHotspotRef.current = false;
      pointerInBottomHotspotRef.current = false;
      setIsHeaderHovered(false);
      setIsFooterHovered(false);
      setIsHeaderFocused(false);
      setIsFooterFocused(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'bionic_flow') return;
    if (isHeaderHovered || isHeaderFocused) {
      if (topHotspotHideTimeoutRef.current) {
        window.clearTimeout(topHotspotHideTimeoutRef.current);
        topHotspotHideTimeoutRef.current = null;
      }
    }
  }, [mode, isHeaderHovered, isHeaderFocused]);

  useEffect(() => {
    if (mode !== 'bionic_flow') return;
    if (isFooterHovered || isFooterFocused || isThemeEngaged) {
      if (bottomHotspotHideTimeoutRef.current) {
        window.clearTimeout(bottomHotspotHideTimeoutRef.current);
        bottomHotspotHideTimeoutRef.current = null;
      }
    }
  }, [mode, isFooterHovered, isFooterFocused, isThemeEngaged]);

  useEffect(() => {
    if (!activeBook) return;
    if (!isThemeEngaged) return;
    if (mode === 'bionic_flow') return;
    setIsUiVisible(true);
    if (uiIdleTimeoutRef.current) {
      window.clearTimeout(uiIdleTimeoutRef.current);
      uiIdleTimeoutRef.current = null;
    }
  }, [activeBook, isThemeEngaged]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      document.body.dataset.fullscreen = document.fullscreenElement ? 'true' : 'false';
    };
    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!activeBook) return;
    const settings = activeBook.settings;
    const defaults = defaultPrefsRef.current;
    const nextSettings: ReaderPreferences = {
      lastMode: settings?.mode ?? defaults.lastMode,
      contextStrength: settings?.contextStrength ?? defaults.contextStrength,
      bionicStrength: settings?.bionicStrength ?? defaults.bionicStrength,
      lineWidth: settings?.lineWidth ?? defaults.lineWidth,
    };
    bionicScrollPercentRef.current = settings?.bionicScrollPercent ?? null;
    setReaderSettings(nextSettings);
    setTitleDraft(activeBook.title);
    setIsEditingTitle(false);
  }, [activeBook?.id]);

  useEffect(() => {
    if (!activeBook) return;
    setIsBionicScrolling(false);
    if (bionicScrollIdleTimeoutRef.current) {
      window.clearTimeout(bionicScrollIdleTimeoutRef.current);
      bionicScrollIdleTimeoutRef.current = null;
    }
    if (mode === 'bionic_flow') {
      // Entering bionic should start hidden (zen).
      setIsUiVisible(false);
      return;
    }
    setIsUiVisible(true);
  }, [activeBook?.id, mode]);

  useEffect(() => {
    if (scrollPersistTimeoutRef.current) {
      window.clearTimeout(scrollPersistTimeoutRef.current);
      scrollPersistTimeoutRef.current = null;
    }
  }, [activeBook?.id]);

  const handleContextStrengthChange = (strength: ReaderPreferences['contextStrength']) => {
    updateReaderSettings({ contextStrength: strength }, { contextStrength: strength });
  };

  const handleBionicStrengthChange = (strength: number) => {
    updateReaderSettings({ bionicStrength: strength }, { bionicStrength: strength });
  };

  const handleLineWidthChange = (width: ReaderPreferences['lineWidth']) => {
    updateReaderSettings({ lineWidth: width }, { lineWidth: width });
  };

  const handleSmartTimingChange = (enabled: boolean) => {
    updateReaderSettings({ smartTimingEnabled: enabled });
  };

  const handleComfortModeChange = (enabled: boolean) => {
    updateReaderSettings({ comfortModeEnabled: enabled });
  };

  const handleBionicScrollPercent = (percent: number) => {
    bionicScrollPercentRef.current = percent;
    if (!activeBook) return;
    const bookId = activeBook.id;
    if (scrollPersistTimeoutRef.current) {
      window.clearTimeout(scrollPersistTimeoutRef.current);
    }
    scrollPersistTimeoutRef.current = window.setTimeout(() => {
      updateBookSettings(bookId, { bionicScrollPercent: percent });
      setLibrary(getLibrary());
      setActiveBook((prev) => {
        if (!prev || prev.id !== bookId) return prev;
        return {
          ...prev,
          settings: {
            ...(prev.settings || {}),
            bionicScrollPercent: percent,
          },
        };
      });
    }, 400);
  };

  useEffect(() => {
    // When the library is open as a drawer, prevent background scroll (especially iOS).
    if (!isLibraryDrawer) return;
    if (!isSidebarOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isLibraryDrawer, isSidebarOpen]);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] bg-app-bg text-text-primary overflow-hidden font-ui selection:bg-accent-red selection:text-text-primary">
      
      {/* 1. LEFT SIDEBAR (Collapsible) */}
      {isLibraryDrawer && isSidebarOpen && (
        <button
          type="button"
          aria-label="Close Library"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity"
        />
      )}
      <aside 
        className={`
          h-full bg-panel-bg flex flex-col border-r border-text-primary/5 overflow-hidden
          transition-all duration-700 cubic-bezier(0.25, 1, 0.5, 1)
          ${isLibraryDrawer ? 'fixed top-0 left-0 z-50 w-[min(20rem,86vw)] shadow-2xl' : 'relative z-20 flex-shrink-0'}
          ${
            isSidebarOpen
              ? 'translate-x-0 opacity-100'
              : isLibraryDrawer
                ? '-translate-x-full opacity-0 pointer-events-none border-none'
                : 'w-0 -translate-x-10 opacity-0 border-none'
          }
          ${isLibraryDrawer ? '' : isSidebarOpen ? 'w-80' : 'w-0'}
        `}
      >
        
        {/* Sidebar Header with Toggle inside */}
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-accent-red rounded-sm flex items-center justify-center text-white font-header font-bold text-xl shadow-glow">
               F
             </div>
             <h1 className="font-header text-xl font-bold tracking-tight text-text-primary whitespace-nowrap">Focus Reader</h1>
          </div>
          <button onClick={toggleSidebar} className="text-text-secondary hover:text-text-primary transition-colors">
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Library List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-text-primary/10 scrollbar-track-transparent">
		           <div className="px-2 mt-2 mb-3">
		             <div className="flex items-center justify-between gap-2">
		               <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary opacity-50 whitespace-nowrap">Your Library</h2>
		               <LibrarySortMenu value={librarySort} onChange={setLibrarySort} />
		             </div>

             <input
               value={libraryQuery}
               onChange={(e) => setLibraryQuery(e.target.value)}
               placeholder="Search…"
               className="mt-3 w-full rounded-lg border border-text-primary/10 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-red/60 focus:outline-none transition-colors duration-200"
               aria-label="Search library"
             />
           </div>
           <Library 
             books={visibleLibrary} 
             onSelect={handleSelectBook} 
             onDelete={handleDelete}
             activeId={activeBook?.id} 
           />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-text-primary/5">
          <button 
            onClick={handleClearData}
            className="flex items-center gap-3 w-full p-3 text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </aside>

      {/* 2. RIGHT MAIN STAGE */}
      <main className="flex-1 h-full min-h-0 relative flex flex-col bg-app-bg">
        
        {/* Top Floating Toggle (Visible when sidebar is closed) */}
        {!isSidebarOpen && !activeBook && (
           <button 
             onClick={toggleSidebar}
             className="absolute top-6 left-6 z-50 p-2 bg-black/20 backdrop-blur-md rounded-lg text-text-secondary hover:text-text-primary border border-text-primary/5 hover:border-text-primary/20 transition-all shadow-xl"
             title="Open Library"
           >
             <Menu className="w-5 h-5" />
           </button>
        )}

	        {/* Content Area */}
	        <div
            className={`flex-1 w-full h-full min-h-0 flex flex-col items-center relative ${
              !activeBook ? 'overflow-y-auto justify-start sm:justify-center py-8 sm:py-0' : 'justify-center'
            }`}
            style={
              !activeBook
                ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }
                : undefined
            }
          >
          
	          {!activeBook ? (
	            // STATE A: Idle / Input
	            <div
                className="w-full max-w-3xl px-8 fade-in animate-in slide-in-from-bottom-4 duration-700"
                style={
                  showDashboardHamburger && isNarrowViewport
                    ? { paddingTop: 'calc(env(safe-area-inset-top) + 80px)' }
                    : undefined
                }
              >
	               <TextInput
	                 onStartReading={handleStartNew}
	                 onOpenHelp={() => setIsHelpOpen(true)}
	                 onTryDemo={() => {
                   if (!suppressHelp) setIsHelpOpen(true);
                 }}
               />
            </div>
          ) : (
            // STATE B: Reading Mode (Full Screen Focus)
            <>
              <div
                aria-hidden="true"
                className={`absolute inset-0 z-0 bg-black/40 transition-opacity duration-300 ease-out motion-reduce:transition-none pointer-events-none ${
                  showRsvpScrim ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div className="w-full h-full min-h-0 flex flex-col relative animate-in fade-in zoom-in-95 duration-700">
              
              {/* Header Elements: Back Button & Mode Toggle */}
	              <div 
	                ref={headerControlsRef}
	                onMouseEnter={() => setIsHeaderHovered(true)}
	                onMouseLeave={() => setIsHeaderHovered(false)}
	                onFocusCapture={handleHeaderFocusCapture}
	                onBlurCapture={handleHeaderBlurCapture}
	                style={isNarrowViewport ? { paddingTop: 'calc(env(safe-area-inset-top) + 12px)' } : undefined}
	                className={`absolute top-0 left-0 w-full p-4 sm:p-8 z-20 transition-all duration-500 ${isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
	              >
	                <div className="grid grid-cols-[1fr_auto_1fr] items-start sm:items-center">
	                 <button 
	                   onClick={handleExitReader}
	                   className="group inline-flex w-fit items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-text-secondary hover:text-text-primary transition-all text-sm font-medium tracking-wide border border-text-primary/5 hover:border-text-primary/20 shadow-lg justify-self-start"
	                 >
                   <span className="group-hover:-translate-x-1 transition-transform">←</span> 
                   <span className="hidden sm:inline">Library</span>
                 </button>
                 
                 {/* Mode Toggle */}
                 <div className="justify-self-center">
                    <ModeToggle
                      mode={mode}
                      onChange={handleModeChange}
                      modes={
                        isCompactPortrait
                          ? [
                              { value: 'rsvp', label: 'RSVP' },
                              { value: 'bionic_flow', label: 'Bionic' },
                            ]
                          : [
                              { value: 'rsvp', label: 'RSVP' },
                              { value: 'rsvp_enhanced', label: 'RSVP+' },
                              { value: 'bionic_flow', label: 'Bionic' },
                            ]
                      }
                    />
                 </div>

	                 <div className="flex flex-col items-end gap-2 justify-self-end">
	                   <div className="text-text-secondary font-header italic opacity-80 hidden sm:block">
	                   {isEditingTitle ? (
	                     <input
                       type="text"
                       value={titleDraft}
                       onChange={(e) => setTitleDraft(e.target.value)}
                       onBlur={() => saveTitle(titleDraft)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') saveTitle(titleDraft);
                         if (e.key === 'Escape') {
                           setIsEditingTitle(false);
                           setTitleDraft(activeBook.title);
                         }
                       }}
                       className="bg-transparent border-b border-text-primary/20 focus:border-accent-red focus:outline-none text-sm italic text-text-primary/90 w-56 text-right"
                       aria-label="Document title"
                     />
                   ) : (
                     <button
                       type="button"
                       onClick={() => setIsEditingTitle(true)}
                       className="hover:text-text-primary transition-colors text-sm italic"
                       title="Rename document"
                     >
	                       {activeBook.title}
	                     </button>
	                   )}
	                   </div>
	                   <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
	                     <button
	                       type="button"
	                       onClick={() => setIsHelpOpen(true)}
	                       className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/30 border border-text-primary/5 text-text-secondary hover:text-text-primary hover:border-text-primary/20 transition-colors font-semibold"
	                       aria-label="Help"
	                       title="Help"
	                     >
	                       ?
	                     </button>
	                     <button
	                       type="button"
	                       onClick={() => setIsBookmarksOpen(true)}
	                       className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/30 border border-text-primary/5 text-text-secondary hover:text-text-primary hover:border-text-primary/20 transition-colors"
	                       aria-label="Bookmarks"
	                       title="Bookmarks"
	                     >
	                       <BookMarked className="w-4 h-4" />
	                     </button>
	                     <button
	                       type="button"
	                       onClick={exportActiveBook}
	                       className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/30 border border-text-primary/5 text-text-secondary hover:text-text-primary hover:border-text-primary/20 transition-colors"
	                       aria-label="Export as text"
	                       title="Export as .txt"
	                     >
	                       <Download className="w-4 h-4" />
	                     </button>
	                   </div>
	                 </div>
	                </div>
	              </div>

              {/* Reader Area */}
	              <div className="flex-1 w-full min-h-0 relative z-10">
	                <div
	                  key={mode}
		                  className={`h-full w-full animate-in fade-in duration-500 ${mode === 'bionic_flow' ? '' : 'flex items-center justify-center'} ${
		                    mode === 'rsvp' || mode === 'rsvp_enhanced' ? 'lg:-translate-y-14 xl:-translate-y-16' : ''
		                  }`}
		                >
                  {mode === 'bionic_flow' ? (
                    <BionicFlowReader
                      text={activeBook.text}
                      currentIndex={rsvp.index}
                      totalWords={rsvp.totalWords}
                      bionicStrength={bionicStrength}
                      lineWidth={lineWidth}
                      initialScrollPercent={activeBook.settings?.bionicScrollPercent ?? bionicScrollPercentRef.current}
                      onProgressIndex={rsvp.seek}
                      onScrollPercentChange={handleBionicScrollPercent}
                    />
                  ) : mode === 'rsvp_enhanced' ? (
                    <RSVPEnhancedReader
                      word={rsvp.currentWord}
                      prevWord={rsvp.words[rsvp.index - 1] || ''}
                      nextWord={rsvp.words[rsvp.index + 1] || ''}
                      contextStrength={contextStrength}
                      onContextStrengthChange={handleContextStrengthChange}
                      isUiVisible={isUiVisible}
	                      fitToWidth={isCompactPortrait}
	                    />
	                  ) : (
	                    <RSVPReader word={rsvp.currentWord} fitToWidth={isNarrowViewport} isMobile={isNarrowViewport} />
	                  )}
	                </div>
	              </div>

              {/* Controls Area */}
              <div
                ref={footerControlsRef}
                onMouseEnter={() => setIsFooterHovered(true)}
                onMouseLeave={() => setIsFooterHovered(false)}
                onFocusCapture={handleFooterFocusCapture}
                onBlurCapture={handleFooterBlurCapture}
                style={
                  isFooterOverlay
                    ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 4rem)' }
                    : undefined
                }
                className={`w-full max-w-2xl mx-auto px-6 sm:px-8 z-20 transition-all duration-500 ease-in-out transform ${
                  isFooterOverlay ? 'absolute bottom-0 left-1/2 -translate-x-1/2' : 'relative pb-16'
                } ${isFooterVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}
              >
                <div className="relative">
                  {controlsPrevMode && (
                    <div
                      className={`absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none pointer-events-none ${
                        controlsModeReady ? 'opacity-0 translate-y-2 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'
                      }`}
                    >
                      {controlsPrevMode === 'bionic_flow' ? (
                        <BionicControls
                          bionicStrength={bionicStrength}
                          lineWidth={lineWidth}
                          progressPercent={Math.min(100, Math.max(0, Math.round((rsvp.index / Math.max(1, rsvp.totalWords)) * 100)))}
                          currentIndex={rsvp.index}
                          totalWords={rsvp.totalWords}
                          onStrengthChange={handleBionicStrengthChange}
                          onLineWidthChange={handleLineWidthChange}
                        />
	                      ) : (
	                        <ControlCenter
	                          isPlaying={rsvp.isPlaying}
	                          onToggle={rsvp.togglePlay}
	                          wpm={rsvp.wpm}
	                          setWpm={rsvp.setWpm}
	                          progress={rsvp.index}
	                          total={rsvp.totalWords}
	                          onSeek={rsvp.seek}
	                          contextStrength={controlsPrevMode === 'rsvp_enhanced' ? contextStrength : undefined}
	                          onContextStrengthChange={controlsPrevMode === 'rsvp_enhanced' ? handleContextStrengthChange : undefined}
	                          smartTimingEnabled={readerSettings.smartTimingEnabled ?? true}
	                          comfortModeEnabled={readerSettings.comfortModeEnabled ?? true}
	                          onSmartTimingChange={handleSmartTimingChange}
	                          onComfortModeChange={handleComfortModeChange}
	                        />
	                      )}
                    </div>
                  )}
                  <div
                    className={`relative transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                      controlsModeReady ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
                    }`}
                  >
                    {mode === 'bionic_flow' ? (
                      <BionicControls
                        bionicStrength={bionicStrength}
                        lineWidth={lineWidth}
                        progressPercent={Math.min(100, Math.max(0, Math.round((rsvp.index / Math.max(1, rsvp.totalWords)) * 100)))}
                        currentIndex={rsvp.index}
                        totalWords={rsvp.totalWords}
                        onStrengthChange={handleBionicStrengthChange}
                        onLineWidthChange={handleLineWidthChange}
                      />
	                    ) : (
	                      <ControlCenter
	                        isPlaying={rsvp.isPlaying}
	                        onToggle={rsvp.togglePlay}
	                        wpm={rsvp.wpm}
	                        setWpm={rsvp.setWpm}
	                        progress={rsvp.index}
	                        total={rsvp.totalWords}
	                        onSeek={rsvp.seek}
	                        contextStrength={mode === 'rsvp_enhanced' ? contextStrength : undefined}
	                        onContextStrengthChange={mode === 'rsvp_enhanced' ? handleContextStrengthChange : undefined}
	                        smartTimingEnabled={readerSettings.smartTimingEnabled ?? true}
	                        comfortModeEnabled={readerSettings.comfortModeEnabled ?? true}
	                        onSmartTimingChange={handleSmartTimingChange}
	                        onComfortModeChange={handleComfortModeChange}
	                      />
	                    )}
                  </div>
                </div>
              </div>

            </div>
            </>
          )}
        </div>
        <ThemeSelector
          isVisible={isThemeVisible}
          onOpenChange={setIsThemeOpen}
          onMouseEnter={() => setIsThemeHovered(true)}
          onMouseLeave={() => setIsThemeHovered(false)}
          onFocusWithinChange={setIsThemeFocused}
        />

        {showBionicHint && (
          <div
            className={`absolute top-24 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
              isBionicHintFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-black/55 backdrop-blur-md border border-text-primary/10 shadow-xl text-sm text-text-primary">
              <span className="text-text-primary/90">
                Tip: In Bionic mode, hover/touch the <span className="font-bold">top</span> or <span className="font-bold">bottom</span> edge to reveal controls.
              </span>
              <button
                type="button"
                onClick={dismissBionicHint}
                className="p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-text-primary/10 transition-colors"
                aria-label="Dismiss tip"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <HelpOverlay
          isOpen={isHelpOpen}
          mode={mode}
          hasActiveBook={Boolean(activeBook)}
          onClose={() => setIsHelpOpen(false)}
          onDontShowAgain={() => setHelpSuppressed(true)}
        />

        <BookmarksPanel
          isOpen={Boolean(activeBook) && isBookmarksOpen}
          bookmarks={getActiveBookmarks()}
          onAdd={addBookmark}
          onJump={jumpToBookmark}
          onDelete={deleteBookmark}
          onClose={() => setIsBookmarksOpen(false)}
          getSnippet={getBookmarkSnippet}
        />
      </main>

    </div>
  );
}
