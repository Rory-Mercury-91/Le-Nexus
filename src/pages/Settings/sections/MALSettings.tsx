import { CheckCircle, RefreshCw, Upload } from 'lucide-react';
import { AnimeImportProgress, AnimeImportResult } from '../../../types';

interface MALSettingsProps {
  malConnected: boolean;
  malUser: any;
  malLastSync: any;
  malSyncing: boolean;
  malAutoSyncEnabled: boolean;
  malAutoSyncInterval: number;
  translating: boolean;
  translationProgress: {
    current: number;
    total: number;
    translated: number;
    skipped: number;
    currentAnime: string;
  } | null;
  importingAnimes: boolean;
  animeImportProgress: AnimeImportProgress | null;
  importType: 'xml' | 'mal-sync';
  animeImportResult: AnimeImportResult | null;
  animeImageSource: 'anilist' | 'mal';
  onMalConnect: () => void;
  onMalDisconnect: () => void;
  onMalSyncNow: () => void;
  onMalTranslateSynopsis: () => void;
  onMalAutoSyncChange: (enabled: boolean) => void;
  onMalIntervalChange: (interval: number) => void;
  onImportAnimeXml: () => void;
  onAnimeImageSourceChange: (source: 'anilist' | 'mal') => void;
}

export default function MALSettings({
  malConnected,
  malUser,
  malLastSync,
  malSyncing,
  malAutoSyncEnabled,
  malAutoSyncInterval,
  translating,
  translationProgress,
  importingAnimes,
  animeImportProgress,
  importType,
  animeImportResult,
  animeImageSource,
  onMalConnect,
  onMalDisconnect,
  onMalSyncNow,
  onMalTranslateSynopsis,
  onMalAutoSyncChange,
  onMalIntervalChange,
  onImportAnimeXml,
  onAnimeImageSourceChange,
}: MALSettingsProps) {
  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="https://myanimelist.net/img/common/pwa/launcher-icon-3x.png" alt="MAL" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
        Import & Synchronisation MyAnimeList
      </h2>
      
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
        Importez vos animes depuis MyAnimeList via OAuth (automatique) ou fichier XML (manuel)
      </p>

      {malConnected ? (
        <>
          {/* Utilisateur connecté */}
          <div style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {malUser?.picture && (
                <img src={malUser.picture} alt={malUser.name} style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
              )}
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                  ✅ Connecté en tant que <strong>{malUser?.name}</strong>
                </p>
                {malLastSync?.timestamp && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Dernière sync : {new Date(malLastSync.timestamp).toLocaleString('fr-FR')}
                    {malLastSync.success && malLastSync.total && (
                      <> • {malLastSync.total.updated} mis à jour</>
                    )}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onMalDisconnect}
              className="btn"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 16px',
                fontSize: '13px'
              }}
            >
              Déconnecter
            </button>
          </div>

          {/* Bouton synchronisation manuelle */}
          <button
            onClick={onMalSyncNow}
            disabled={malSyncing}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: malSyncing ? 0.6 : 1
            }}
          >
            <RefreshCw size={18} style={{ animation: malSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {malSyncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}
          </button>

          {/* Bouton Traduction manuelle */}
          <button
            onClick={onMalTranslateSynopsis}
            disabled={translating}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: translating ? 0.6 : 1,
              background: translating ? 'var(--surface)' : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              color: 'white'
            }}
          >
            <span style={{ fontSize: '18px' }}>🤖</span>
            {translating ? 'Traduction en cours...' : 'Traduire les synopsis'}
          </button>

          {/* Synchronisation automatique */}
          <div style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginBottom: '12px'
            }}>
              <input
                type="checkbox"
                checked={malAutoSyncEnabled}
                onChange={(e) => onMalAutoSyncChange(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                Synchronisation automatique
              </span>
            </label>

            {malAutoSyncEnabled && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text-secondary)'
                }}>
                  Fréquence de synchronisation
                </label>
                <select
                  value={malAutoSyncInterval}
                  onChange={(e) => onMalIntervalChange(Number(e.target.value))}
                  className="select"
                  style={{ width: '100%' }}
                >
                  <option value={1}>Toutes les heures</option>
                  <option value={3}>Toutes les 3 heures</option>
                  <option value={6}>Toutes les 6 heures</option>
                  <option value={12}>Toutes les 12 heures</option>
                  <option value={24}>Une fois par jour</option>
                </select>
              </div>
            )}

            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '12px',
              lineHeight: '1.5'
            }}>
              💡 La synchronisation met à jour automatiquement vos chapitres lus et épisodes vus depuis votre compte MyAnimeList.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Non connecté */}
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            lineHeight: '1.6'
          }}>
            Connectez votre compte MyAnimeList pour synchroniser automatiquement vos chapitres lus et épisodes vus depuis vos applications mobiles (Mihon, AniList, etc.).
          </p>

          <button
            onClick={onMalConnect}
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <img src="https://myanimelist.net/img/common/pwa/launcher-icon-3x.png" alt="MAL" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
            Connecter mon compte MyAnimeList
          </button>

          <details style={{ marginTop: '16px' }}>
            <summary style={{
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              padding: '8px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}>
              ℹ️ Comment ça fonctionne ?
            </summary>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: '12px',
              background: 'var(--surface)',
              borderRadius: '8px',
              marginTop: '8px',
              lineHeight: '1.6'
            }}>
              <ol style={{ paddingLeft: '20px', margin: '0' }}>
                <li>Cliquez sur "Connecter" ci-dessus</li>
                <li>Votre navigateur s'ouvrira sur MyAnimeList</li>
                <li>Autorisez l'accès à votre liste</li>
                <li>Revenez à l'application</li>
                <li>Activez la synchronisation automatique</li>
              </ol>
              <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                🔐 Vos identifiants ne sont jamais stockés. Seul un jeton d'accès sécurisé est utilisé.
              </p>
            </div>
          </details>
        </>
      )}
      
      {/* Choix source d'images anime */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🖼️ Source des images anime
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
          Choisissez la source des images lors de l'import d'animes
        </p>
        <select
          value={animeImageSource}
          onChange={(e) => onAnimeImageSourceChange(e.target.value as 'anilist' | 'mal')}
          className="select"
          style={{ width: '100%', maxWidth: '300px' }}
        >
          <option value="anilist">AniList (Meilleure qualité - Recommandé)</option>
          <option value="mal">MyAnimeList</option>
        </select>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
          💡 AniList offre généralement des images en meilleure résolution que MyAnimeList
        </p>
      </div>
      
      {/* Import XML (toujours disponible) */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📄 Import manuel via XML
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
          Alternative : Importez votre liste depuis un fichier XML exporté de MyAnimeList
        </p>
        <button
          onClick={onImportAnimeXml}
          className="btn"
          disabled={importingAnimes}
          style={{ 
            width: '100%',
            background: 'var(--surface-light)',
            border: '1px solid var(--border)'
          }}
        >
          <Upload size={18} />
          {importingAnimes ? 'Import en cours...' : 'Choisir un fichier XML'}
        </button>
      </div>
      
      {/* Progression d'import (XML ou MAL Sync) */}
      {animeImportProgress && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          {/* Titre dynamique selon le type d'import */}
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text)' }}>
            {importType === 'mal-sync' ? '🔄 Synchronisation MyAnimeList en cours...' : '📦 Import XML en cours...'}
          </div>
          
          {/* Informations lots (uniquement pour XML) */}
          {importType === 'xml' && animeImportProgress.currentBatch && animeImportProgress.totalBatches && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📦 Lot {animeImportProgress.currentBatch}/{animeImportProgress.totalBatches}
            </div>
          )}
          
          {/* Progression globale */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated} / {animeImportProgress.total}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {Math.round(((animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated) / animeImportProgress.total) * 100)}%
            </span>
          </div>
          
          {/* Barre de progression */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'var(--surface-light)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              width: `${((animeImportProgress.currentIndex || animeImportProgress.imported + animeImportProgress.updated) / animeImportProgress.total) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          
          {/* Élément en cours */}
          {animeImportProgress.currentAnime && (
            <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '12px', fontWeight: '500' }}>
              {importType === 'mal-sync' ? '📚' : '🎬'} {animeImportProgress.currentAnime}
            </p>
          )}
          
          {/* ⏱️ Chronomètre et statistiques de performance */}
          {animeImportProgress.elapsedMs && (
            <div style={{ 
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                fontSize: '12px'
              }}>
                {/* Temps écoulé */}
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>⏱️ Temps écoulé</div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    {Math.floor(animeImportProgress.elapsedMs / 60000)}:{String(Math.floor((animeImportProgress.elapsedMs % 60000) / 1000)).padStart(2, '0')}
                  </div>
                </div>
                
                {/* Temps estimé restant */}
                {animeImportProgress.etaMs && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>⏳ Temps restant</div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {Math.floor(animeImportProgress.etaMs / 60000)}:{String(Math.floor((animeImportProgress.etaMs % 60000) / 1000)).padStart(2, '0')}
                    </div>
                  </div>
                )}
                
                {/* Vitesse */}
                {animeImportProgress.speed && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>⚡ Vitesse</div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {animeImportProgress.speed.toFixed(1)} animes/min
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Statistiques temps réel */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            fontSize: '12px', 
            color: 'var(--text-secondary)', 
            marginTop: '8px' 
          }}>
            <span>✅ {animeImportProgress.imported || 0} importés</span>
            <span>⏭️ {animeImportProgress.skipped || 0} ignorés</span>
            {animeImportProgress.errors > 0 && (
              <span style={{ color: 'var(--error)' }}>⚠️ {animeImportProgress.errors} erreurs</span>
            )}
          </div>
        </div>
      )}

      {/* Progression traduction synopsis (après import/sync MAL) */}
      {translating && translationProgress && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
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
          
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            🎯 Traduction automatique des synopsis anglais → français via Groq AI
            <br />
            ⏳ Merci de ne pas quitter l'application
          </p>
          
          {/* Progression */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {translationProgress.current} / {translationProgress.total}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {Math.round((translationProgress.current / translationProgress.total) * 100)}%
            </span>
          </div>
          
          {/* Barre de progression */}
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
          
          {/* Anime en cours */}
          <p style={{ 
            fontSize: '13px', 
            color: '#667eea', 
            marginTop: '12px', 
            fontWeight: '500',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            🎬 {translationProgress.currentAnime}
          </p>
          
          {/* Statistiques */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            fontSize: '12px', 
            color: 'var(--text-secondary)', 
            marginTop: '12px' 
          }}>
            <span>✅ {translationProgress.translated} traduits</span>
            {translationProgress.skipped > 0 && (
              <span>⏭️ {translationProgress.skipped} ignorés</span>
            )}
          </div>
          
          {/* Temps estimé */}
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '6px',
            fontSize: '12px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            ⏱️ Durée estimée restante : ~{Math.ceil((translationProgress.total - translationProgress.current) * 3.5 / 60)} min
          </div>
        </div>
      )}

      {animeImportResult && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
            Import terminé !
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <p>✅ <strong>{animeImportResult.imported}</strong> animes importés</p>
            <p>🔄 <strong>{animeImportResult.updated}</strong> animes mis à jour</p>
            <p>⏭️ <strong>{animeImportResult.skipped || 0}</strong> animes ignorés</p>
            <p>📊 <strong>{animeImportResult.total || (animeImportResult.imported + animeImportResult.updated + (animeImportResult.skipped || 0))}</strong> animes au total</p>
            {animeImportResult.totalTimeMs && (
              <>
                <p>⏱️ <strong>{(animeImportResult.totalTimeMs / 60000).toFixed(2)}</strong> minutes</p>
                <p>⚡ <strong>{animeImportResult.speed?.toFixed(1)}</strong> animes/min</p>
              </>
            )}
            {animeImportResult.errors && animeImportResult.errors.length > 0 && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--error)' }}>
                  ⚠️ {animeImportResult.errors.length} erreur(s)
                </summary>
                <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                  {animeImportResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i} style={{ color: 'var(--text-secondary)' }}>{err.error}</li>
                  ))}
                  {animeImportResult.errors.length > 5 && (
                    <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      ... et {animeImportResult.errors.length - 5} autres erreurs
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
