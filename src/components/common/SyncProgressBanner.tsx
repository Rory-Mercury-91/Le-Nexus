import { RefreshCw } from 'lucide-react';
import { AnimeImportProgress } from '../../types';

// Fonction utilitaire pour formater le temps en MM:SS ou HH:MM:SS
// Gère les valeurs en millisecondes (normalise toujours en secondes)
function formatTime(value: number): string {
  if (!value || !isFinite(value) || value < 0) return '0:00';
  
  // Le backend envoie elapsedMs en millisecondes (Date.now() - startTime)
  // Si la valeur est > 86400000ms (24h), c'est probablement une valeur aberrante
  // On limite à 24h maximum pour l'affichage
  let totalSeconds: number;
  
  // Si la valeur est > 24h en millisecondes, on la considère comme aberrante
  // et on limite à 24h
  if (value > 86400000) {
    // Valeur aberrante, on limite à 24h
    totalSeconds = 86400; // 24h en secondes
  } else {
    // Valeur normale en millisecondes, on convertit en secondes
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

// Calculer le temps estimé basé sur la progression et la vitesse
function calculateETA(elapsedMs: number | undefined, current: number, total: number, speed: number | undefined): number | null {
  if (!elapsedMs || !speed || speed <= 0 || current >= total) return null;
  
  const remaining = total - current;
  const etaMs = (remaining / speed) * 60000; // speed est en items/min
  
  return Math.max(0, etaMs);
}

interface SyncProgressBannerProps {
  isVisible: boolean;
  animeProgress: AnimeImportProgress | null;
  mangaProgress: AnimeImportProgress | null;
  translating: boolean;
  translationProgress: {
    current: number;
    total: number;
    translated: number;
    skipped: number;
    currentAnime: string;
  } | null;
  onStopAnimeEnrichment?: () => void | Promise<void>;
  onStopMangaEnrichment?: () => void | Promise<void>;
  stoppingAnimeEnrichment?: boolean;
  stoppingMangaEnrichment?: boolean;
  importType?: 'xml' | 'mal-sync';
}

export default function SyncProgressBanner({
  isVisible,
  animeProgress,
  mangaProgress,
  translating,
  translationProgress,
  onStopAnimeEnrichment,
  onStopMangaEnrichment,
  stoppingAnimeEnrichment = false,
  stoppingMangaEnrichment = false,
  importType: _importType
}: SyncProgressBannerProps) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'var(--surface)',
      padding: '16px 24px',
      marginBottom: '24px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <RefreshCw 
          size={20} 
          style={{ 
            animation: 'spin 1s linear infinite',
            color: 'var(--primary)'
          }} 
        />
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--text)',
          margin: 0
        }}>
          Synchronisation en cours
        </h3>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Progression Mangas */}
        {mangaProgress && (
          <div style={{
            padding: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📚 Mangas
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
              <span style={{ fontWeight: '600' }}>
                {mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated} / {mangaProgress.total}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {Math.round(((mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated) / mangaProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--surface-light)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '6px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                width: `${((mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated) / mangaProgress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            {mangaProgress.currentAnime && (
              <p style={{ 
                fontSize: '11px', 
                color: '#f59e0b', 
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: '4px 0 0 0'
              }}>
                {mangaProgress.currentAnime}
              </p>
            )}
            
            {/* Statistiques supplémentaires pour mangas */}
            {(() => {
              const current = mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated;
              const total = mangaProgress.total;
              const calculatedETA = calculateETA(
                mangaProgress.elapsedMs, 
                current, 
                total, 
                mangaProgress.speed
              );
              const displayETA = mangaProgress.etaMs || calculatedETA;
              const hasStats = mangaProgress.skipped !== undefined || 
                               mangaProgress.errors !== undefined || 
                               mangaProgress.elapsedMs || 
                               mangaProgress.currentIndex !== undefined ||
                               mangaProgress.imported !== undefined;
              
              if (!hasStats) return null;
              
              return (
                <div style={{ 
                  marginTop: '8px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}>
                  <span>✅ {mangaProgress.imported || 0} {(() => {
                    // Si c'est un enrichissement (type contient 'enrichment'), afficher "enrichis"
                    // Sinon, afficher "importés" (pour la synchronisation MAL)
                    if (mangaProgress.type?.includes('enrichment')) {
                      return 'enrichis';
                    }
                    return 'importés';
                  })()}</span>
                  {mangaProgress.skipped !== undefined && mangaProgress.skipped > 0 && (
                    <span>⏭️ {mangaProgress.skipped} ignorés</span>
                  )}
                  {mangaProgress.errors !== undefined && mangaProgress.errors > 0 && (
                    <span style={{ color: 'var(--error)' }}>⚠️ {mangaProgress.errors} erreurs</span>
                  )}
                  {mangaProgress.elapsedMs && mangaProgress.elapsedMs > 0 && mangaProgress.elapsedMs < 86400000 && (
                    <span>⏱️ Temps écoulé: {formatTime(mangaProgress.elapsedMs)}</span>
                  )}
                  {displayETA && current < total && (
                    <span>⏳ Temps restant: {formatTime(displayETA)}</span>
                  )}
                  {mangaProgress.speed && (
                    <span>⚡ {mangaProgress.speed.toFixed(1)} {mangaProgress.type === 'manga' ? 'mangas' : 'animes'}/min</span>
                  )}
                </div>
              );
            })()}

            {mangaProgress.type?.includes('enrichment') && onStopMangaEnrichment && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onStopMangaEnrichment()}
                  className="btn btn-outline"
                  disabled={stoppingMangaEnrichment}
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    color: stoppingMangaEnrichment ? 'var(--text-secondary)' : 'var(--error)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {stoppingMangaEnrichment ? 'Arrêt en cours...' : '⏹️ Stop enrichissement'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progression Animes */}
        {animeProgress && (
          <div style={{
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {animeProgress.type === 'manga' ? '📚' : '🎬'} {animeProgress.type === 'manga' ? 'Mangas' : 'Animes'}
              {animeProgress.currentBatch && animeProgress.totalBatches && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  📦 Lot {animeProgress.currentBatch}/{animeProgress.totalBatches}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
              <span style={{ fontWeight: '600' }}>
                {animeProgress.currentIndex || animeProgress.imported + animeProgress.updated} / {animeProgress.total}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {Math.round(((animeProgress.currentIndex || animeProgress.imported + animeProgress.updated) / animeProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--surface-light)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '6px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                width: `${((animeProgress.currentIndex || animeProgress.imported + animeProgress.updated) / animeProgress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            {animeProgress.currentAnime && (
              <p style={{ 
                fontSize: '11px', 
                color: 'var(--primary)', 
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: '4px 0 0 0'
              }}>
                {animeProgress.currentAnime}
              </p>
            )}
            
            {/* Statistiques supplémentaires (skipped, errors, temps) */}
            {(() => {
              const current = animeProgress.currentIndex || animeProgress.imported + animeProgress.updated;
              const total = animeProgress.total;
              const calculatedETA = calculateETA(
                animeProgress.elapsedMs, 
                current, 
                total, 
                animeProgress.speed
              );
              const displayETA = animeProgress.etaMs || calculatedETA;
              const hasStats = animeProgress.skipped !== undefined || 
                               animeProgress.errors !== undefined || 
                               animeProgress.elapsedMs || 
                               animeProgress.currentIndex !== undefined ||
                               animeProgress.imported !== undefined;
              
              if (!hasStats) return null;
              
              return (
                <div style={{ 
                  marginTop: '8px', 
                  paddingTop: '8px', 
                  borderTop: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}>
                  <span>✅ {animeProgress.imported || 0} {(() => {
                    // Si c'est un enrichissement (type contient 'enrichment'), afficher "enrichis"
                    // Sinon, afficher "importés" (pour la synchronisation MAL)
                    if (animeProgress.type?.includes('enrichment')) {
                      return 'enrichis';
                    }
                    return 'importés';
                  })()}</span>
                  {animeProgress.skipped !== undefined && animeProgress.skipped > 0 && (
                    <span>⏭️ {animeProgress.skipped} ignorés</span>
                  )}
                  {animeProgress.errors !== undefined && animeProgress.errors > 0 && (
                    <span style={{ color: 'var(--error)' }}>⚠️ {animeProgress.errors} erreurs</span>
                  )}
                  {animeProgress.elapsedMs && animeProgress.elapsedMs > 0 && animeProgress.elapsedMs < 86400000 && (
                    <span>⏱️ Temps écoulé: {formatTime(animeProgress.elapsedMs)}</span>
                  )}
                  {displayETA && current < total && (
                    <span>⏳ Temps restant: {formatTime(displayETA)}</span>
                  )}
                  {animeProgress.speed && (
                    <span>⚡ {animeProgress.speed.toFixed(1)} {animeProgress.type === 'manga' ? 'mangas' : 'animes'}/min</span>
                  )}
                </div>
              );
            })()}

            {animeProgress.type?.includes('enrichment') && onStopAnimeEnrichment && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onStopAnimeEnrichment()}
                  className="btn btn-outline"
                  disabled={stoppingAnimeEnrichment}
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    color: stoppingAnimeEnrichment ? 'var(--text-secondary)' : 'var(--error)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {stoppingAnimeEnrichment ? 'Arrêt en cours...' : '⏹️ Stop enrichissement'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Progression traduction */}
        {translating && translationProgress && (
          <div style={{
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '10px',
            border: '1px solid rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                background: '#667eea',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              🤖 Traduction des synopsis en cours...
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
              <span style={{ fontWeight: '600' }}>
                {translationProgress.current} / {translationProgress.total}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {Math.round((translationProgress.current / translationProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--surface-light)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                width: `${(translationProgress.current / translationProgress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            {translationProgress.currentAnime && (
              <p style={{ 
                fontSize: '11px', 
                color: '#667eea', 
                marginTop: '8px', 
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                🎬 {translationProgress.currentAnime}
              </p>
            )}
          </div>
        )}

        {/* Message d'attente si aucune progression */}
        {!animeProgress && !mangaProgress && !translating && (
          <div style={{
            textAlign: 'center',
            padding: '8px',
            color: 'var(--text-secondary)',
            fontSize: '12px'
          }}>
            <RefreshCw 
              size={16} 
              style={{ 
                animation: 'spin 1s linear infinite',
                color: 'var(--primary)',
                marginRight: '8px',
                verticalAlign: 'middle'
              }} 
            />
            Synchronisation en cours...
          </div>
        )}
      </div>
    </div>
  );
}
