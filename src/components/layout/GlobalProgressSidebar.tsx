import { CheckCircle2, ChevronDown, ChevronUp, Play, RefreshCw, Square, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
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
      fontSize: '11px',
      minWidth: 0
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        minWidth: 0
      }}>
        <span style={{
          fontWeight: '600',
          color: `rgb(${color})`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '11px'
        }}>
          {label}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', fontSize: '10px' }}>
          {current} / {total} ({percentage}%)
        </span>
      </div>
      {stats.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          fontSize: '10px',
          color: 'var(--text-secondary)'
        }}>
          {stats.map((stat, idx) => (
            <span key={idx} style={{ whiteSpace: 'nowrap' }}>{stat}</span>
          ))}
        </div>
      )}
      {progress.currentAnime && (
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '10px',
          color: `rgb(${color})`,
          fontWeight: '500'
        }}>
          {progress.currentAnime}
        </div>
      )}
      <div style={{
        width: '100%',
        height: '4px',
        background: `rgba(${color}, 0.2)`,
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '4px'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `rgb(${color})`,
          transition: 'width 0.3s ease',
          borderRadius: '2px'
        }} />
      </div>
    </div>
  );
}

export default function GlobalProgressSidebar() {
  const {
    malSyncing,
    animeProgress,
    mangaProgress,
    translating,
    translationProgress,
    adulteGameUpdating,
    adulteGameProgress,
    cloudSyncing,
    cloudSyncProgress,
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
    setCloudSyncing,
    setCloudSyncProgress,
    isProgressCollapsed,
    setIsProgressCollapsed
  } = useGlobalProgress();

  const hasActive = malSyncing ||
    animeProgress !== null ||
    mangaProgress !== null ||
    translating ||
    adulteGameUpdating ||
    adulteGameProgress !== null ||
    cloudSyncing ||
    cloudSyncProgress !== null;

  const allCompleted = useMemo(() => {
    if (!hasActive) return false;
    const animeComplete = animeProgress === null || animeProgress.phase === 'complete';
    const mangaComplete = mangaProgress === null || mangaProgress.phase === 'complete';
    const cloudComplete = cloudSyncProgress === null || cloudSyncProgress.phase === 'complete';
    const gameComplete = adulteGameProgress === null || adulteGameProgress.phase === 'complete' || adulteGameProgress.phase === 'error';
    const translateComplete = !translating || (translationProgress && translationProgress.current >= translationProgress.total);
    const malComplete = !malSyncing;
    return animeComplete && mangaComplete && cloudComplete && gameComplete && translateComplete && malComplete;
  }, [hasActive, animeProgress, mangaProgress, cloudSyncProgress, adulteGameProgress, translating, translationProgress, malSyncing]);

  const handleCloseAll = useCallback(() => {
    setMalSyncing(false);
    setAnimeProgress(null);
    setMangaProgress(null);
    setTranslating(false);
    setTranslationProgress(null);
    setAdulteGameUpdating(false);
    setAdulteGameProgress(null);
    setCloudSyncing(false);
    setCloudSyncProgress(null);
  }, [setMalSyncing, setAnimeProgress, setMangaProgress, setTranslating, setTranslationProgress, setAdulteGameUpdating, setAdulteGameProgress, setCloudSyncing, setCloudSyncProgress]);

  if (!hasActive) {
    return null;
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
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
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {allCompleted ? (
            <CheckCircle2
              size={14}
              style={{
                color: 'rgb(34, 197, 94)',
                flexShrink: 0
              }}
            />
          ) : (
            <RefreshCw
              size={14}
              style={{
                animation: 'spin 1s linear infinite',
                color: 'var(--primary)',
                flexShrink: 0
              }}
            />
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: allCompleted ? 'rgb(34, 197, 94)' : 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {allCompleted ? 'Terminé' : 'En cours'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {/* Boutons pause/reprendre/arrêter pour les enrichissements actifs */}
          {!allCompleted && (
            <>
              {/* Boutons pour mangaProgress */}
              {mangaProgress && mangaProgress.type !== 'mihon-import' && (
                <>
                  {pausedMangaEnrichment && onResumeMangaEnrichment ? (
                    <button
                      type="button"
                      onClick={() => onResumeMangaEnrichment()}
                      disabled={stoppingMangaEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '4px',
                        color: stoppingMangaEnrichment ? 'var(--text-secondary)' : 'rgb(34, 197, 94)',
                        cursor: stoppingMangaEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Reprendre"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  ) : !pausedMangaEnrichment && onPauseMangaEnrichment ? (
                    <button
                      type="button"
                      onClick={() => onPauseMangaEnrichment()}
                      disabled={stoppingMangaEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '4px',
                        color: stoppingMangaEnrichment ? 'var(--text-secondary)' : 'rgb(245, 158, 11)',
                        cursor: stoppingMangaEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Pause"
                    >
                      <Square size={10} />
                    </button>
                  ) : null}
                  {onStopMangaEnrichment && (
                    <button
                      type="button"
                      onClick={() => onStopMangaEnrichment()}
                      disabled={stoppingMangaEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '4px',
                        color: stoppingMangaEnrichment ? 'var(--text-secondary)' : 'var(--error)',
                        cursor: stoppingMangaEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Arrêter"
                    >
                      <X size={10} />
                    </button>
                  )}
                </>
              )}
              {/* Boutons pour animeProgress */}
              {animeProgress && animeProgress.type !== 'manga' && (
                <>
                  {pausedAnimeEnrichment && onResumeAnimeEnrichment ? (
                    <button
                      type="button"
                      onClick={() => onResumeAnimeEnrichment()}
                      disabled={stoppingAnimeEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAnimeEnrichment ? 'var(--text-secondary)' : 'rgb(34, 197, 94)',
                        cursor: stoppingAnimeEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Reprendre"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  ) : !pausedAnimeEnrichment && onPauseAnimeEnrichment ? (
                    <button
                      type="button"
                      onClick={() => onPauseAnimeEnrichment()}
                      disabled={stoppingAnimeEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAnimeEnrichment ? 'var(--text-secondary)' : 'rgb(59, 130, 246)',
                        cursor: stoppingAnimeEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Pause"
                    >
                      <Square size={10} />
                    </button>
                  ) : null}
                  {onStopAnimeEnrichment && (
                    <button
                      type="button"
                      onClick={() => onStopAnimeEnrichment()}
                      disabled={stoppingAnimeEnrichment}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAnimeEnrichment ? 'var(--text-secondary)' : 'var(--error)',
                        cursor: stoppingAnimeEnrichment ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Arrêter"
                    >
                      <X size={10} />
                    </button>
                  )}
                </>
              )}
              {/* Boutons pour adulteGameProgress */}
              {adulteGameProgress && adulteGameProgress.phase === 'scraping' && (
                <>
                  {pausedAdulteGameUpdatesCheck && onResumeAdulteGameUpdatesCheck ? (
                    <button
                      type="button"
                      onClick={() => onResumeAdulteGameUpdatesCheck()}
                      disabled={stoppingAdulteGameUpdatesCheck}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAdulteGameUpdatesCheck ? 'var(--text-secondary)' : 'rgb(34, 197, 94)',
                        cursor: stoppingAdulteGameUpdatesCheck ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Reprendre"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  ) : !pausedAdulteGameUpdatesCheck && onPauseAdulteGameUpdatesCheck ? (
                    <button
                      type="button"
                      onClick={() => onPauseAdulteGameUpdatesCheck()}
                      disabled={stoppingAdulteGameUpdatesCheck}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAdulteGameUpdatesCheck ? 'var(--text-secondary)' : 'rgb(139, 92, 246)',
                        cursor: stoppingAdulteGameUpdatesCheck ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Pause"
                    >
                      <Square size={10} />
                    </button>
                  ) : null}
                  {onStopAdulteGameUpdatesCheck && (
                    <button
                      type="button"
                      onClick={() => onStopAdulteGameUpdatesCheck()}
                      disabled={stoppingAdulteGameUpdatesCheck}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '4px',
                        color: stoppingAdulteGameUpdatesCheck ? 'var(--text-secondary)' : 'var(--error)',
                        cursor: stoppingAdulteGameUpdatesCheck ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        minWidth: '20px',
                        height: '18px'
                      }}
                      title="Arrêter"
                    >
                      <X size={10} />
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {allCompleted && (
            <button
              type="button"
              onClick={handleCloseAll}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
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
              <X size={10} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              minWidth: '20px',
              height: '20px'
            }}
            title={isProgressCollapsed ? 'Afficher' : 'Masquer'}
          >
            {isProgressCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {!isProgressCollapsed && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Lectures */}
          {mangaProgress ? (
            <ProgressItem
              label={mangaProgress.type === 'mihon-import' ? '📥 Import Mihon' : '📚 Lectures'}
              progress={mangaProgress}
              color="245, 158, 11"
              onStop={undefined}
              onPause={undefined}
              onResume={undefined}
              stopping={false}
              paused={false}
              showStopButton={false}
            />
          ) : null}

          {/* Animes */}
          {animeProgress ? (
            <ProgressItem
              label={animeProgress.type === 'manga' ? '📚 Lectures' : '🎬 Animes'}
              progress={animeProgress}
              color="59, 130, 246"
              onStop={undefined}
              onPause={undefined}
              onResume={undefined}
              stopping={false}
              paused={false}
              showStopButton={false}
            />
          ) : malSyncing && !animeProgress && !mangaProgress && !translating && !adulteGameUpdating && !cloudSyncing ? (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                  🔄 Sync MAL
                </span>
                <button
                  type="button"
                  onClick={() => setMalSyncing(false)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
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
                  <X size={10} />
                  Arrêter
                </button>
              </div>
            </div>
          ) : null}

          {/* Cloud Sync */}
          {cloudSyncProgress && cloudSyncProgress.phase ? (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                  ☁️ Cloud
                </span>
                {cloudSyncProgress.total > 0 && (
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', fontSize: '10px' }}>
                    {cloudSyncProgress.current} / {cloudSyncProgress.total} ({cloudSyncProgress.percentage}%)
                  </span>
                )}
              </div>
              {cloudSyncProgress.message && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {cloudSyncProgress.message}
                </span>
              )}
              {cloudSyncProgress.total > 0 && (
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginTop: '4px'
                }}>
                  <div style={{
                    width: `${cloudSyncProgress.percentage}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    transition: 'width 0.3s ease',
                    borderRadius: '2px'
                  }} />
                </div>
              )}
            </div>
          ) : null}

          {/* Traduction */}
          {translating && translationProgress ? (
            <div style={{
              padding: '8px 12px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderRadius: '6px',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: '#667eea', whiteSpace: 'nowrap', fontSize: '11px' }}>
                  🤖 Traduction
                </span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', fontSize: '10px' }}>
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
                  fontSize: '10px'
                }}>
                  {translationProgress.currentAnime}
                </span>
              )}
            </div>
          ) : null}

          {/* Jeux adultes */}
          {adulteGameProgress && adulteGameProgress.phase === 'scraping' ? (
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
              onStop={undefined}
              onPause={undefined}
              onResume={undefined}
              stopping={false}
              paused={false}
              showStopButton={false}
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
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                  🎮 Jeux adultes
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
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
