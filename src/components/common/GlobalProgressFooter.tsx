import { CheckCircle2, ChevronDown, ChevronUp, Play, RefreshCw, Square, X } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useGlobalProgress } from '../../contexts/GlobalProgressContext';
import { AnimeImportProgress } from '../../types';

// Fonction utilitaire pour formater le temps en MM:SS ou HH:MM:SS
function formatTime(value: number): string {
  if (!value || !isFinite(value) || value < 0) return '0:00';

  let totalSeconds: number;
  if (value > 86400000) {
    totalSeconds = 86400;
  } else {
    totalSeconds = Math.floor(value / 1000);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
}

function calculateETA(elapsedMs: number | undefined, current: number, total: number, speed: number | undefined): number | null {
  if (!elapsedMs || !speed || speed <= 0 || current >= total) return null;
  const remaining = total - current;
  const etaMs = (remaining / speed) * 60000;
  return Math.max(0, etaMs);
}

function ProgressItem({
  label,
  progress,
  color,
  onStop,
  onPause,
  onResume,
  stopping,
  paused = false,
  showStopButton = true
}: {
  label: string;
  progress: AnimeImportProgress;
  color: string;
  onStop?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  stopping?: boolean;
  paused?: boolean;
  showStopButton?: boolean;
}) {
  const current = progress.currentIndex || progress.imported + progress.updated;
  const total = progress.total;
  const percentage = Math.round((current / total) * 100);
  const calculatedETA = calculateETA(progress.elapsedMs, current, total, progress.speed);
  const displayETA = progress.etaMs || calculatedETA;

  const stats = [];
  if (progress.imported !== undefined) {
    if (progress.type?.includes('enrichment')) {
      stats.push(`✅ ${progress.imported} enrichis`);
    } else if (progress.type?.includes('adulte-game-updates')) {
      stats.push(`✅ ${progress.imported} mis à jour`);
    } else if (progress.type?.includes('mihon-import')) {
      stats.push(`✅ ${progress.imported} créés`);
    } else {
      stats.push(`✅ ${progress.imported} importés`);
    }
  }
  if (progress.updated !== undefined && progress.updated > 0) {
    if (progress.type?.includes('mihon-import')) {
      stats.push(`🔄 ${progress.updated} mis à jour`);
    } else if (progress.type?.includes('adulte-game-updates')) {
      stats.push(`📊 ${progress.updated} synchronisés`);
    }
  }
  if (progress.elapsedMs && progress.elapsedMs > 0 && progress.elapsedMs < 86400000) {
    stats.push(`⏱️ ${formatTime(progress.elapsedMs)}`);
  }
  if (displayETA && current < total) {
    stats.push(`⏳ ${formatTime(displayETA)}`);
  }
  if (progress.speed) {
    stats.push(`⚡ ${progress.speed.toFixed(1)}/min`);
  }

  return (
    <div style={{
      padding: '8px 12px',
      background: `rgba(${color}, 0.1)`,
      borderRadius: '6px',
      border: `1px solid rgba(${color}, 0.3)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      fontSize: '12px',
      minWidth: 0, // Permet la troncature dans les grilles flex
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        minWidth: 0 // Permet la troncature
      }}>
        <span style={{
          fontWeight: '600',
          color: `rgb(${color})`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '150px',
          flexShrink: 1
        }}>
          {label}
        </span>
        {stats.length > 0 && (
          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {stats.join(' | ')}
          </span>
        )}
        <span style={{ color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {current} / {total} ({percentage}%)
        </span>
        {showStopButton && (onPause || onResume || onStop) && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {paused && onResume ? (
              <button
                type="button"
                onClick={() => onResume()}
                disabled={stopping}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '4px',
                  color: stopping ? 'var(--text-secondary)' : 'rgb(34, 197, 94)',
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: '28px',
                  height: '24px'
                }}
                title="Reprendre"
              >
                <Play size={12} fill="currentColor" />
              </button>
            ) : !paused && onPause ? (
              <button
                type="button"
                onClick={() => onPause()}
                disabled={stopping}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '4px',
                  color: stopping ? 'var(--text-secondary)' : 'rgb(245, 158, 11)',
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: '28px',
                  height: '24px'
                }}
                title="Mettre en pause"
              >
                <Square size={12} />
              </button>
            ) : null}
            {onStop && (
              <button
                type="button"
                onClick={() => onStop()}
                disabled={stopping}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  color: stopping ? 'var(--text-secondary)' : 'var(--error)',
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: '28px',
                  height: '24px'
                }}
                title="Arrêter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {progress.currentAnime && (
        <span style={{
          color: `rgb(${color})`,
          fontWeight: '500',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginLeft: '0',
          maxWidth: '100%',
          display: 'block'
        }}>
          {progress.currentAnime}
        </span>
      )}
    </div>
  );
}

export default function GlobalProgressFooter() {
  const {
    malSyncing,
    animeProgress,
    mangaProgress,
    translating,
    translationProgress,
    adulteGameUpdating,
    adulteGameProgress,
    onStopAnimeEnrichment,
    onStopMangaEnrichment,
    onPauseAnimeEnrichment,
    onResumeAnimeEnrichment,
    onPauseMangaEnrichment,
    onResumeMangaEnrichment,
    onStopAdulteGameUpdatesCheck,
    onPauseAdulteGameUpdatesCheck,
    onResumeAdulteGameUpdatesCheck,
    stoppingAnimeEnrichment,
    stoppingMangaEnrichment,
    pausedAnimeEnrichment,
    pausedMangaEnrichment,
    stoppingAdulteGameUpdatesCheck,
    pausedAdulteGameUpdatesCheck,
    setMalSyncing,
    setAnimeProgress,
    setMangaProgress,
    setTranslating,
    setTranslationProgress,
    setAdulteGameUpdating,
    setAdulteGameProgress,
    isProgressCollapsed,
    setIsProgressCollapsed
  } = useGlobalProgress();

  // Vérifier directement les valeurs plutôt que d'utiliser la fonction
  const hasActive = malSyncing ||
    animeProgress !== null ||
    mangaProgress !== null ||
    translating ||
    adulteGameUpdating ||
    adulteGameProgress !== null;

  // Vérifier si toutes les progressions sont terminées (phase: 'complete' ou progressions null)
  const allCompleted = useMemo(() => {
    if (hasActive) {
      // Si il y a encore des opérations actives, ce n'est pas terminé
      const hasActiveOperation = malSyncing ||
        (animeProgress && animeProgress.phase !== 'complete') ||
        (mangaProgress && mangaProgress.phase !== 'complete') ||
        translating ||
        adulteGameUpdating ||
        (adulteGameProgress && adulteGameProgress.phase !== 'complete');

      return !hasActiveOperation;
    }
    return false;
  }, [hasActive, malSyncing, animeProgress, mangaProgress, translating, adulteGameUpdating, adulteGameProgress]);

  const handleCloseAll = useCallback(() => {
    setMalSyncing(false);
    setAnimeProgress(null);
    setMangaProgress(null);
    setTranslating(false);
    setTranslationProgress(null);
    setAdulteGameUpdating(false);
    setAdulteGameProgress(null);
  }, [setMalSyncing, setAnimeProgress, setMangaProgress, setTranslating, setTranslationProgress, setAdulteGameUpdating, setAdulteGameProgress]);

  // Fermer automatiquement la section si tous les enrichissements sont terminés/arrêtés
  useEffect(() => {
    // Vérifier si seuls les enrichissements étaient actifs et qu'ils sont tous terminés/arrêtés
    const onlyEnrichmentsActive = !malSyncing && !translating && !adulteGameUpdating &&
      (animeProgress !== null || mangaProgress !== null);

    const allEnrichmentsComplete = onlyEnrichmentsActive &&
      (animeProgress === null || animeProgress.phase === 'complete') &&
      (mangaProgress === null || mangaProgress.phase === 'complete');

    if (allEnrichmentsComplete && onlyEnrichmentsActive) {
      // Fermer automatiquement après 2 secondes pour permettre à l'utilisateur de voir le résultat
      const timeout = setTimeout(() => {
        handleCloseAll();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [animeProgress, mangaProgress, malSyncing, translating, adulteGameUpdating, handleCloseAll]);

  if (!hasActive) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: '260px', // Largeur de la sidebar
      right: 0,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      maxHeight: isProgressCollapsed ? '60px' : '180px',
      overflowY: isProgressCollapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.3s ease'
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: isProgressCollapsed ? '0' : '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {allCompleted ? (
            <CheckCircle2
              size={16}
              style={{
                color: 'rgb(34, 197, 94)',
                flexShrink: 0
              }}
            />
          ) : (
            <RefreshCw
              size={16}
              style={{
                animation: 'spin 1s linear infinite',
                color: 'var(--primary)',
                flexShrink: 0
              }}
            />
          )}
          <h3 style={{
            fontSize: '13px',
            fontWeight: '600',
            color: allCompleted ? 'rgb(34, 197, 94)' : 'var(--text)',
            margin: 0
          }}>
            {allCompleted ? 'Opérations terminées' : 'Opérations en cours'}
          </h3>
          {isProgressCollapsed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginLeft: '8px',
              flexWrap: 'wrap'
            }}>
              {mangaProgress && mangaProgress.total > 0 && (
                <span>
                  📚 Lectures | {mangaProgress.currentIndex || ((mangaProgress.imported || 0) + (mangaProgress.updated || 0))} / {mangaProgress.total} ({Math.round(((mangaProgress.currentIndex || ((mangaProgress.imported || 0) + (mangaProgress.updated || 0))) / mangaProgress.total) * 100)}%)
                </span>
              )}
              {animeProgress && animeProgress.total > 0 && (
                <span>
                  🎬 Animes | {animeProgress.currentIndex || ((animeProgress.imported || 0) + (animeProgress.updated || 0))} / {animeProgress.total} ({Math.round(((animeProgress.currentIndex || ((animeProgress.imported || 0) + (animeProgress.updated || 0))) / animeProgress.total) * 100)}%)
                </span>
              )}
              {adulteGameProgress && adulteGameProgress.total > 0 && (
                <span>
                  🎮 Jeux adultes | {adulteGameProgress.current || 0} / {adulteGameProgress.total} ({Math.round(((adulteGameProgress.current || 0) / adulteGameProgress.total) * 100)}%)
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {allCompleted && (
            <button
              type="button"
              onClick={handleCloseAll}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: 'transparent',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '4px',
                color: 'rgb(34, 197, 94)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Fermer"
            >
              <X size={12} />
              Fermer
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}
            style={{
              padding: '4px 6px',
              fontSize: '11px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: '28px',
              height: '24px'
            }}
            title={isProgressCollapsed ? 'Afficher' : 'Masquer'}
          >
            {isProgressCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isProgressCollapsed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px'
        }}>
          {/* Colonne 1: Lectures */}
          {mangaProgress ? (
            <ProgressItem
              label={mangaProgress.type === 'mihon-import' ? '📥 Import Mihon' : '📚 Lectures'}
              progress={mangaProgress}
              color="245, 158, 11"
              onStop={mangaProgress.type === 'mihon-import' ? undefined : onStopMangaEnrichment}
              onPause={mangaProgress.type === 'mihon-import' ? undefined : onPauseMangaEnrichment}
              onResume={mangaProgress.type === 'mihon-import' ? undefined : onResumeMangaEnrichment}
              stopping={mangaProgress.type === 'mihon-import' ? false : stoppingMangaEnrichment}
              paused={mangaProgress.type === 'mihon-import' ? false : pausedMangaEnrichment}
              showStopButton={mangaProgress.type !== 'mihon-import'}
            />
          ) : null}

          {/* Colonne 2: Animes */}
          {animeProgress ? (
            <ProgressItem
              label={animeProgress.type === 'manga' ? '📚 Lectures' : '🎬 Animes'}
              progress={animeProgress}
              color="59, 130, 246"
              onStop={onStopAnimeEnrichment}
              onPause={onPauseAnimeEnrichment}
              onResume={onResumeAnimeEnrichment}
              stopping={stoppingAnimeEnrichment}
              paused={pausedAnimeEnrichment}
              showStopButton={true}
            />
          ) : malSyncing && !animeProgress && !mangaProgress && !translating && !adulteGameUpdating ? (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  🔄 Synchronisation MAL
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Arrêter la synchronisation
                    setMalSyncing(false);
                    // Réinitialiser les progressions
                    // Note: La synchronisation continuera en arrière-plan mais ne sera plus affichée
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <X size={12} />
                  Arrêter
                </button>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Synchronisation en cours...
              </span>
            </div>
          ) : null}

          {/* Colonne 3: Traduction, Jeux Adultes, ou vide */}
          {translating && translationProgress ? (
            <div style={{
              padding: '8px 12px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderRadius: '6px',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: '#667eea', whiteSpace: 'nowrap' }}>
                  🤖 Traduction
                </span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {translationProgress.current} / {translationProgress.total} ({Math.round((translationProgress.current / translationProgress.total) * 100)}%)
                </span>
              </div>
              {translationProgress.currentAnime && (
                <span style={{
                  color: '#667eea',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginLeft: '0',
                  maxWidth: '100%',
                  display: 'block'
                }}>
                  🎬 {translationProgress.currentAnime}
                </span>
              )}
            </div>
          ) : adulteGameProgress && adulteGameProgress.phase === 'scraping' ? (
            <ProgressItem
              label="🎮 Jeux adultes"
              progress={{
                phase: 'anime',
                type: 'adulte-game-updates',
                total: adulteGameProgress.total,
                currentIndex: adulteGameProgress.current,
                imported: adulteGameProgress.updated || 0,
                updated: adulteGameProgress.sheetSynced || 0,
                skipped: 0,
                errors: 0,
                currentAnime: adulteGameProgress.gameTitle,
                elapsedMs: adulteGameProgress.elapsedMs,
                etaMs: adulteGameProgress.etaMs,
                speed: adulteGameProgress.speed
              }}
              color="139, 92, 246"
              onStop={onStopAdulteGameUpdatesCheck}
              onPause={onPauseAdulteGameUpdatesCheck}
              onResume={onResumeAdulteGameUpdatesCheck}
              stopping={stoppingAdulteGameUpdatesCheck}
              paused={pausedAdulteGameUpdatesCheck}
              showStopButton={true}
            />
          ) : adulteGameProgress ? (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  🎮 Jeux adultes
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  {adulteGameProgress.message}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
