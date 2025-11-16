import { useEffect, useRef } from 'react';

const SCROLL_CONTAINER_ID = 'app-scroll-container';
const TARGET_KEY_SUFFIX = '::target';
const viteEnv = (import.meta as any)?.env;
const isDev = Boolean(viteEnv?.DEV ?? viteEnv?.MODE === 'development');
const DEBUG_STORAGE_KEY = 'debug.scrollRestoration';

function isDebugEnabled(): boolean {
  if (isDev) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    if ((window as any).__LE_NEXUS_DEBUG_SCROLL__ === true) {
      return true;
    }
    const stored = window.localStorage?.getItem(DEBUG_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

function debugLog(message: string, data?: Record<string, unknown>) {
  if (!isDebugEnabled()) {
    return;
  }
  if (data) {
    console.debug(`[useScrollRestoration] ${message}`, data);
  } else {
    console.debug(`[useScrollRestoration] ${message}`);
  }
}

function getScrollContainer(): Window | HTMLElement | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const element = document.getElementById(SCROLL_CONTAINER_ID);
  return element ?? window;
}

function escapeSelector(value: string): string {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value);
  }
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

export function rememberScrollTarget(storageKey: string, itemId: string | number) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage?.setItem(`${storageKey}${TARGET_KEY_SUFFIX}`, String(itemId));
  } catch (error) {
    if (isDebugEnabled()) {
      debugLog('Impossible de sauvegarder la tuile cible', { storageKey, itemId, error });
    }
  }
}

type ScrollSource = 'container' | 'window' | 'document';

interface ScrollSnapshot {
  position: number;
  source: ScrollSource;
}

const SOURCE_PRIORITY: Record<ScrollSource, number> = {
  document: 3,
  container: 2,
  window: 1
};

function getScrollTop(target: Window | HTMLElement | null): number {
  if (!target) {
    return 0;
  }
  if (target instanceof Window) {
    return target.scrollY;
  }
  return target.scrollTop;
}

function scrollTo(target: Window | HTMLElement | null, position: number) {
  if (!target) {
    return;
  }
  if (target instanceof Window) {
    target.scrollTo({ top: position, behavior: 'auto' });
    return;
  }
  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ top: position, behavior: 'auto' });
    return;
  }
  target.scrollTop = position;
}

function captureScroll(
  container: Window | HTMLElement | null,
  sourceTarget?: EventTarget | null
): ScrollSnapshot {
  if (typeof window === 'undefined') {
    return { position: 0, source: 'window' };
  }
  const doc =
    typeof document !== 'undefined' ? document.scrollingElement ?? document.documentElement ?? null : null;
  const body = typeof document !== 'undefined' ? document.body ?? null : null;

  const candidates: Array<{ position: number; source: ScrollSource; priority: number }> = [];

  const addCandidate = (position: number | null | undefined, source: ScrollSource, priority: number) => {
    if (position === null || position === undefined || Number.isNaN(position)) {
      return;
    }
    candidates.push({ position, source, priority });
  };

  if (sourceTarget && sourceTarget instanceof HTMLElement) {
    addCandidate(sourceTarget.scrollTop, 'container', 4);
  }

  if (container && container !== window && container instanceof HTMLElement) {
    addCandidate(container.scrollTop, 'container', 3);
  }

  if (doc) {
    addCandidate(doc.scrollTop, 'document', 2);
  }

  if (body) {
    addCandidate(body.scrollTop, 'document', 1);
  }

  addCandidate(window.scrollY ?? window.pageYOffset ?? 0, 'window', 0);

  const significant = candidates
    .filter((candidate) => Math.abs(candidate.position) > 0.5)
    .sort((a, b) => b.priority - a.priority)[0];

  if (significant) {
    return { position: significant.position, source: significant.source };
  }

  const fallback = candidates.sort((a, b) => b.priority - a.priority)[0];
  if (fallback) {
    return { position: fallback.position, source: fallback.source };
  }

  return { position: 0, source: 'window' };
}

function serializeSnapshot(snapshot: ScrollSnapshot): string {
  return JSON.stringify(snapshot);
}

function deserializeSnapshot(value: string | null): ScrollSnapshot | null {
  if (value === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as ScrollSnapshot | number;
    if (typeof parsed === 'number') {
      return { position: parsed, source: 'window' };
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as ScrollSnapshot).position === 'number' &&
      ((parsed as ScrollSnapshot).source === 'container' ||
        (parsed as ScrollSnapshot).source === 'window' ||
        (parsed as ScrollSnapshot).source === 'document')
    ) {
      return parsed as ScrollSnapshot;
    }
  } catch (error) {
    debugLog('Erreur lors de la désérialisation, fallback', { value, error });
  }
  const fallback = Number(value);
  if (!Number.isNaN(fallback)) {
    return { position: fallback, source: 'window' };
  }
  return null;
}

export function useScrollRestoration(storageKey: string, ready: boolean) {
  const restoredRef = useRef(false);
  const containerRef = useRef<Window | HTMLElement | null>(null);
  const lastSnapshotRef = useRef<ScrollSnapshot | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) {
      return;
    }
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = 'auto';
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    containerRef.current = getScrollContainer();
    const container = containerRef.current;
    if (container) {
      debugLog('Conteneur détecté', {
        storageKey,
        type: container === window ? 'window' : container instanceof HTMLElement ? container.id || 'element' : 'unknown',
        initialScroll: getScrollTop(container)
      });
    }

    let ticking = false;
    const savePosition = (sourceTarget?: EventTarget | null) => {
      try {
        const snapshot = captureScroll(container, sourceTarget);
        const previous =
          lastSnapshotRef.current ?? deserializeSnapshot(sessionStorage.getItem(storageKey));
        let shouldStore = true;
        if (previous) {
          if (SOURCE_PRIORITY[snapshot.source] < SOURCE_PRIORITY[previous.source] && snapshot.position <= previous.position) {
            shouldStore = false;
          }
          if (SOURCE_PRIORITY[snapshot.source] === SOURCE_PRIORITY[previous.source] && Math.abs(snapshot.position - previous.position) <= 0.5) {
            shouldStore = false;
          }
        }

        if (!shouldStore) {
          if (isDebugEnabled()) {
            debugLog('Sauvegarde ignorée (priorité plus faible ou identique)', {
              storageKey,
              snapshot,
              previous
            });
          }
          return;
        }

        sessionStorage.setItem(storageKey, serializeSnapshot(snapshot));
        lastSnapshotRef.current = snapshot;
        if (isDebugEnabled()) {
          const doc = typeof document !== 'undefined' ? document.scrollingElement ?? document.documentElement : null;
          const body = typeof document !== 'undefined' ? document.body : null;
          const firstChild =
            container && container !== window && container instanceof HTMLElement
              ? (container.firstElementChild as HTMLElement | null)
              : null;
          debugLog('Position sauvegardée', {
            storageKey,
            ...snapshot,
            containerScrollTop: container && container !== window && container instanceof HTMLElement ? container.scrollTop : undefined,
            firstChildTag: firstChild?.tagName,
            firstChildId: firstChild?.id,
            firstChildScrollTop: firstChild?.scrollTop,
            documentScrollTop: doc?.scrollTop,
            bodyScrollTop: body?.scrollTop,
            windowScrollY: typeof window !== 'undefined' ? window.scrollY : undefined,
            sourceTargetTag:
              sourceTarget && sourceTarget instanceof HTMLElement
                ? sourceTarget.tagName
                : sourceTarget === window
                  ? 'window'
                  : undefined,
            sourceTargetId:
              sourceTarget && sourceTarget instanceof HTMLElement ? sourceTarget.id : undefined,
            sourceTargetScrollTop:
              sourceTarget && sourceTarget instanceof HTMLElement
                ? sourceTarget.scrollTop
                : sourceTarget === window
                  ? window.scrollY
                  : sourceTarget instanceof Document
                    ? sourceTarget.documentElement?.scrollTop ?? sourceTarget.body?.scrollTop ?? undefined
                    : undefined
          });
        }
      } catch (error) {
        console.warn(`[useScrollRestoration] Impossible d'enregistrer "${storageKey}":`, error);
      }
    };

    const handleScroll = (event: Event) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (isDebugEnabled()) {
          const target = event.target as EventTarget | null;
          const targetType =
            target === window
              ? 'window'
              : target instanceof Document
                ? 'document'
                : target instanceof HTMLElement
                  ? target.tagName
                  : typeof target;
          const targetScrollTop =
            target === window
              ? window.scrollY
              : target instanceof Document
                ? target.documentElement?.scrollTop ?? target.body?.scrollTop ?? undefined
                : target instanceof HTMLElement
                  ? target.scrollTop
                  : undefined;
          debugLog('Scroll event détecté', {
            storageKey,
            targetType,
            targetId: target instanceof HTMLElement ? target.id : undefined,
            containerScrollTop: container && container !== window && container instanceof HTMLElement ? container.scrollTop : undefined,
            targetScrollTop,
            isTrusted: event.isTrusted
          });
        }
        savePosition(event.target);
        ticking = false;
      });
    };

    const cleanupFns: Array<() => void> = [];

    const addListener = (target: EventTarget | null, options?: boolean | AddEventListenerOptions) => {
      if (!target) {
        return;
      }
      target.addEventListener('scroll', handleScroll, options);
      cleanupFns.push(() => target.removeEventListener('scroll', handleScroll, options));
    };

    if (container && container !== window) {
      addListener(container, { passive: true });
    }
    addListener(window, { passive: true });
    addListener(document, { passive: true, capture: true });

    return () => {
      cleanupFns.forEach((fn) => fn());
      if (lastSnapshotRef.current) {
        sessionStorage.setItem(storageKey, serializeSnapshot(lastSnapshotRef.current));
      } else {
        savePosition();
      }
    };
  }, [storageKey]);

  useEffect(() => {
    if (!ready || restoredRef.current || typeof window === 'undefined') {
      return;
    }

    restoredRef.current = true;
    const container = containerRef.current ?? getScrollContainer();
    containerRef.current = container;

    const targetStorageKey = `${storageKey}${TARGET_KEY_SUFFIX}`;

    const restoreFromSnapshot = () => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        const snapshot = deserializeSnapshot(stored);
        if (snapshot) {
          debugLog('Position restaurée trouvée', { storageKey, ...snapshot });
          lastSnapshotRef.current = snapshot;
          const runRestore = () => {
            let target: Window | HTMLElement | null = window;
            if (snapshot.source === 'container') {
              target = container;
            } else if (snapshot.source === 'document' && typeof document !== 'undefined') {
              target = (document.scrollingElement as HTMLElement | null) ?? document.documentElement ?? document.body ?? window;
            }
            scrollTo(target, snapshot.position);
          };
          runRestore();
          requestAnimationFrame(runRestore);
        } else {
          debugLog('Aucune position trouvée, retour haut', { storageKey });
          requestAnimationFrame(() => {
            scrollTo(container, 0);
          });
        }
      } catch (error) {
        console.warn(`[useScrollRestoration] Impossible de restaurer "${storageKey}":`, error);
      }
    };

    const tryScrollToTarget = (targetId: string | null): boolean => {
      if (!targetId) {
        return false;
      }
      const selector = `[data-scroll-id="${escapeSelector(targetId)}"]`;
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        if (isDebugEnabled()) {
          debugLog('Position restaurée via tuile', { storageKey, targetId });
        }
        try {
          sessionStorage.removeItem(targetStorageKey);
        } catch (error) {
          if (isDebugEnabled()) {
            debugLog('Impossible de nettoyer la tuile cible', { storageKey, error });
          }
        }
        return true;
      }
      return false;
    };

    let storedTargetId: string | null = null;
    try {
      storedTargetId = sessionStorage.getItem(targetStorageKey);
    } catch (error) {
      if (isDebugEnabled()) {
        debugLog('Impossible de lire la tuile cible', { storageKey, error });
      }
    }

    if (storedTargetId) {
      if (tryScrollToTarget(storedTargetId)) {
        return;
      }
      requestAnimationFrame(() => {
        if (tryScrollToTarget(storedTargetId)) {
          return;
        }
        try {
          sessionStorage.removeItem(targetStorageKey);
        } catch (error) {
          if (isDebugEnabled()) {
            debugLog('Impossible de nettoyer la tuile cible', { storageKey, error });
          }
        }
        restoreFromSnapshot();
      });
      return;
    }

    restoreFromSnapshot();
  }, [storageKey, ready]);
}
