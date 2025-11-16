import { RefreshCw } from 'lucide-react';
import { AnimeImportProgress } from '../../../types';

// Fonction utilitaire pour formater le temps
function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '--';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

interface MalSyncOverlayProps {
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
}

export default function MalSyncOverlay({
  isVisible,
  animeProgress,
  mangaProgress,
  translating,
  translationProgress
}: MalSyncOverlayProps) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        padding: '32px',
        width: '600px',
        maxWidth: '600px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* En-tête */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <RefreshCw 
            size={24} 
            style={{ 
              animation: 'spin 1s linear infinite',
              color: 'var(--primary)'
            }} 
          />
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--text)',
            margin: 0
          }}>
            Synchronisation MyAnimeList
          </h2>
        </div>

        {/* Progression Mangas */}
        {mangaProgress && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📚 Mangas
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated} / {mangaProgress.total}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {Math.round(((mangaProgress.currentIndex || mangaProgress.imported + mangaProgress.updated) / mangaProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--surface-light)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '8px'
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
                marginBottom: '8px',
                maxWidth: '100%',
                margin: '0 0 8px 0'
              }}>
                {mangaProgress.currentAnime}
              </p>
            )}
            
            {/* Statistiques et timestamps */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px', 
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              {mangaProgress.imported > 0 && (
                <div>✅ Créés: <strong style={{ color: '#f59e0b' }}>{mangaProgress.imported}</strong></div>
              )}
              {mangaProgress.updated > 0 && (
                <div>🔄 Mis à jour: <strong style={{ color: '#f59e0b' }}>{mangaProgress.updated}</strong></div>
              )}
              {mangaProgress.elapsedMs && (
                <div>⏱️ Temps: <strong>{formatTime(mangaProgress.elapsedMs)}</strong></div>
              )}
              {mangaProgress.etaMs && (
                <div>⏳ ETA: <strong>{formatTime(mangaProgress.etaMs)}</strong></div>
              )}
              {mangaProgress.speed && (
                <div>⚡ Vitesse: <strong>{mangaProgress.speed.toFixed(1)}/min</strong></div>
              )}
            </div>
          </div>
        )}

        {/* Progression Animes */}
        {animeProgress && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎬 Animes
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {animeProgress.currentIndex || animeProgress.imported + animeProgress.updated} / {animeProgress.total}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {Math.round(((animeProgress.currentIndex || animeProgress.imported + animeProgress.updated) / animeProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '6px',
              background: 'var(--surface-light)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '8px'
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
                marginBottom: '8px',
                maxWidth: '100%',
                margin: '0 0 8px 0'
              }}>
                {animeProgress.currentAnime}
              </p>
            )}
            
            {/* Statistiques et timestamps */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px', 
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              {animeProgress.imported > 0 && (
                <div>✅ Créés: <strong style={{ color: 'var(--primary)' }}>{animeProgress.imported}</strong></div>
              )}
              {animeProgress.updated > 0 && (
                <div>🔄 Mis à jour: <strong style={{ color: 'var(--primary)' }}>{animeProgress.updated}</strong></div>
              )}
              {animeProgress.elapsedMs && (
                <div>⏱️ Temps: <strong>{formatTime(animeProgress.elapsedMs)}</strong></div>
              )}
              {animeProgress.etaMs && (
                <div>⏳ ETA: <strong>{formatTime(animeProgress.etaMs)}</strong></div>
              )}
              {animeProgress.speed && (
                <div>⚡ Vitesse: <strong>{animeProgress.speed.toFixed(1)}/min</strong></div>
              )}
            </div>
          </div>
        )}

        {/* Progression traduction */}
        {translating && translationProgress && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#667eea',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              🤖 Traduction des synopsis en cours...
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {translationProgress.current} / {translationProgress.total}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {Math.round((translationProgress.current / translationProgress.total) * 100)}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--surface-light)',
              borderRadius: '4px',
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
                fontSize: '13px', 
                color: '#667eea', 
                marginTop: '12px', 
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                margin: '12px 0 0 0'
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
            padding: '20px',
            color: 'var(--text-secondary)'
          }}>
            <RefreshCw 
              size={32} 
              style={{ 
                animation: 'spin 1s linear infinite',
                color: 'var(--primary)',
                marginBottom: '12px'
              }} 
            />
            <p style={{ fontSize: '14px', margin: 0 }}>
              Synchronisation en cours...
            </p>
          </div>
        )}

        {/* Message d'information */}
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginTop: '20px',
          lineHeight: '1.5'
        }}>
          ⏳ Veuillez ne pas quitter cette page pendant la synchronisation
        </p>
      </div>
    </div>
  );
}
