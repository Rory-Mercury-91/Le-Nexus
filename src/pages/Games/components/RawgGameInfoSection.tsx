import { Calendar, Gamepad2, Globe2, Link2, ShoppingBag, Star, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ExternalLinkIcon from '../../../components/common/ExternalLinkIcon';
import LabelsCardContent from '../../../components/common/LabelsCardContent';
import DetailStatusSection from '../../../components/details/DetailStatusSection';
import { useDevMode } from '../../../hooks/common/useDevMode';
import { RawgGameDetail } from '../../../hooks/details/useRawgGameDetail';
import { COMMON_STATUSES } from '../../../utils/status';
import RawgGameCostsSection from './RawgGameCostsSection';

const GAME_STATUS_OPTIONS = COMMON_STATUSES.ADULTE_GAME;

interface RawgGameInfoSectionProps {
  game: RawgGameDetail;
  shouldShow: (field: string) => boolean;
  onStatusChange: (status: string) => void;
  onToggleFavorite: () => void;
  onLabelsChange?: () => void;
  onMarkAsOwned?: () => void;
  costsByUser?: Array<{ user: { id: number; name: string; color: string; emoji: string }; cost: number; platforms: string[] | null }>;
  totalPrix?: number;
  users?: Array<{ id: number; name: string; color: string; emoji: string }>;
  profileImages?: Record<string, string | null>;
  updatingStatus?: boolean;
  togglingFavorite?: boolean;
}

export default function RawgGameInfoSection({
  game,
  shouldShow,
  onStatusChange,
  onToggleFavorite,
  onLabelsChange,
  onMarkAsOwned,
  costsByUser = [],
  totalPrix = 0,
  profileImages = {},
  updatingStatus = false,
  togglingFavorite = false
}: RawgGameInfoSectionProps) {
  const { devMode } = useDevMode();
  const [exporting, setExporting] = useState(false);
  const rawgData = game.rawgData;

  // Calculer les boutiques valides (avec URL) pour la condition d'affichage
  // L'API RAWG fournit les stores, mais parfois store.url est vide
  // Dans ce cas, on peut construire l'URL depuis store.store.domain et le slug du jeu
  const validStores = useMemo(() => {
    if (!rawgData?.stores || !Array.isArray(rawgData.stores)) {
      return [];
    }
    return rawgData.stores
      .map((store: any) => {
        // Vérifier différentes structures possibles pour le nom
        const storeName = store.store?.name || store.name || 'Boutique';

        // L'API RAWG fournit l'URL directe vers la page d'achat dans store.url
        let storeUrl = store.url;

        // Si l'URL est vide, essayer de construire l'URL depuis le domaine et le slug du jeu
        if (!storeUrl || storeUrl.trim() === '' || storeUrl === 'null') {
          const domain = store.store?.domain;
          const gameSlug = rawgData?.slug;

          if (domain && gameSlug) {
            // Construire l'URL selon le type de store
            const domainLower = domain.toLowerCase();

            if (domainLower.includes('steampowered.com')) {
              // Pour Steam, on ne peut pas construire l'URL sans l'App ID
              // Mais on peut rediriger vers la recherche
              storeUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(rawgData?.name || '')}`;
            } else if (domainLower.includes('gog.com')) {
              // Pour GOG, utiliser le slug du jeu
              storeUrl = `https://www.gog.com/game/${gameSlug}`;
            } else if (domainLower.includes('epicgames.com')) {
              // Pour Epic Games, utiliser le slug
              storeUrl = `https://www.epicgames.com/store/en-US/p/${gameSlug}`;
            } else if (domainLower.includes('nintendo.com')) {
              // Pour Nintendo, rediriger vers la recherche
              storeUrl = `https://www.nintendo.com/store/search/?q=${encodeURIComponent(rawgData?.name || '')}`;
            } else if (domainLower.includes('playstation.com') || domainLower.includes('psn')) {
              // Pour PlayStation, rediriger vers la recherche
              storeUrl = `https://store.playstation.com/fr-fr/search/${encodeURIComponent(rawgData?.name || '')}`;
            } else if (domainLower.includes('xbox.com') || domainLower.includes('microsoft.com')) {
              // Pour Xbox, rediriger vers la recherche
              storeUrl = `https://www.xbox.com/fr-FR/games/store?q=${encodeURIComponent(rawgData?.name || '')}`;
            } else {
              // Pour les autres stores, utiliser le domaine avec https
              storeUrl = domain.startsWith('http') ? domain : `https://${domain}`;
            }
          } else if (domain) {
            // Si on a juste le domaine, créer un lien vers la page principale
            storeUrl = domain.startsWith('http') ? domain : `https://${domain}`;
          } else {
            // Si on n'a ni URL ni domaine, on ne peut pas afficher ce store
            return null;
          }
        }

        if (!storeUrl || storeUrl.trim() === '') {
          return null;
        }

        return {
          id: store.id || store.store?.id || `${storeName}-${storeUrl}`,
          name: storeName,
          url: storeUrl
        };
      })
      .filter(Boolean);
  }, [rawgData?.stores, rawgData?.slug, rawgData?.name]);

  // Debug: vérifier les boutiques (en mode dev uniquement)
  useEffect(() => {
    if (devMode && rawgData?.stores && rawgData.stores.length > 0) {
      console.log('🔍 [RAWG] Stores data:', rawgData.stores);
      console.log('🔍 [RAWG] Valid stores:', validStores);
      // Log la structure complète du premier store pour comprendre
      const firstStore = rawgData.stores[0];
      console.log('🔍 [RAWG] First store structure:', firstStore);
      console.log('🔍 [RAWG] First store.store:', firstStore?.store);
      console.log('🔍 [RAWG] First store.store keys:', firstStore?.store ? Object.keys(firstStore.store) : 'N/A');
      console.log('🔍 [RAWG] First store.store.domain:', firstStore?.store?.domain);
      console.log('🔍 [RAWG] First store.store.slug:', firstStore?.store?.slug);
    }
  }, [devMode, rawgData?.stores, validStores]);

  // Parser les plateformes depuis rawg_platforms si disponible
  const platformsFromDb = useMemo(() => {
    if (game.rawg_platforms) {
      try {
        const parsed = JSON.parse(game.rawg_platforms);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [game.rawg_platforms]);

  const platforms = rawgData?.platforms || platformsFromDb;
  const genres = rawgData?.genres || [];
  const tags = rawgData?.tags || [];
  const developers = rawgData?.developers || [];
  const publishers = rawgData?.publishers || [];

  const rating = rawgData?.rating ? (rawgData.rating * 20).toFixed(0) : null;
  const metacritic = rawgData?.metacritic;

  // Extraire l'ESRB rating (peut être un objet avec name/slug ou une string)
  const esrbRating = (() => {
    const esrb = rawgData?.esrb_rating;
    if (!esrb) return null;
    if (typeof esrb === 'string') return esrb;
    return esrb.name || null;
  })();

  // Fonction pour obtenir le style du badge ESRB
  const getEsrbBadgeStyle = (rating: string | null) => {
    if (!rating) return null;
    const ratingUpper = rating.toUpperCase();

    if (ratingUpper === 'AO' || ratingUpper.includes('ADULTS ONLY')) {
      return {
        emote: '🔞',
        background: 'rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        text: 'AO'
      };
    } else if (ratingUpper === 'M' || ratingUpper.includes('MATURE')) {
      return {
        emote: '⚠️',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        text: 'M'
      };
    } else if (ratingUpper === 'T' || ratingUpper.includes('TEEN')) {
      return {
        emote: '🔶',
        background: 'rgba(251, 191, 36, 0.15)',
        color: '#f59e0b',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        text: 'T'
      };
    } else if (ratingUpper.includes('E10') || ratingUpper.includes('EVERYONE 10')) {
      return {
        emote: '🟡',
        background: 'rgba(251, 191, 36, 0.1)',
        color: '#f59e0b',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        text: 'E10+'
      };
    } else if (ratingUpper === 'E' || ratingUpper.includes('EVERYONE')) {
      return {
        emote: '✅',
        background: 'rgba(16, 185, 129, 0.15)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        text: 'E'
      };
    } else if (ratingUpper === 'EC' || ratingUpper.includes('EARLY CHILDHOOD')) {
      return {
        emote: '👶',
        background: 'rgba(59, 130, 246, 0.15)',
        color: '#3b82f6',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        text: 'EC'
      };
    }
    return {
      emote: '📋',
      background: 'rgba(148, 163, 184, 0.15)',
      color: '#94a3b8',
      border: '1px solid rgba(148, 163, 184, 0.3)',
      text: rating
    };
  };

  const esrbBadgeStyle = getEsrbBadgeStyle(esrbRating);

  const handleExport = async () => {
    if (!window.electronAPI?.exportEntityData) {
      window.alert('Export indisponible dans ce contexte.');
      return;
    }
    try {
      setExporting(true);
      const result = await window.electronAPI.exportEntityData('adulte-game', game.id);
      if (result?.success && result.filePath) {
        window.alert(`Données exportées vers : ${result.filePath}`);
      } else {
        window.alert(result?.error || 'Erreur lors de l\'export des données.');
      }
    } catch (error: any) {
      console.error('Erreur export données jeu:', error);
      window.alert(error?.message || 'Erreur inattendue lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ flex: 1, minWidth: '320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
      {/* Titre et métadonnées principales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <h1 className="detail-page-title" style={{ flex: 1 }}>
            {game.titre}
          </h1>
          {devMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                background: 'var(--surface)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontFamily: 'monospace'
              }}>
                ID: {game.id}
              </span>
              <button
                onClick={handleExport}
                className="btn btn-outline"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}
                disabled={exporting}
              >
                {exporting ? 'Extraction...' : 'Extraire données'}
              </button>
            </div>
          )}
        </div>
        {rawgData?.alternative_names && rawgData.alternative_names.length > 0 && (
          <p className="detail-page-subtitle">
            {rawgData.alternative_names[0]}
          </p>
        )}
      </div>

      {/* Section Mes informations : 3 colonnes */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>
          Mes informations
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          alignItems: 'flex-start'
        }}>
          {/* Colonne 1 : Favoris + Statut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DetailStatusSection
              isFavorite={game.is_favorite}
              currentStatus={game.statut_perso || 'À jouer'}
              availableStatuses={GAME_STATUS_OPTIONS}
              statusCategory="adulteGame"
              onToggleFavorite={onToggleFavorite}
              onStatusChange={onStatusChange}
              togglingFavorite={togglingFavorite}
              updatingStatus={updatingStatus}
              showLabel={true}
            />
          </div>

          {/* Colonne 2 : Labels personnalisés */}
          {shouldShow('labels') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
                Labels personnalisés
              </div>
              <LabelsCardContent
                itemId={game.id}
                onLabelsChange={() => {
                  window.dispatchEvent(new CustomEvent('adulte-game-labels-updated', {
                    detail: { gameId: game.id }
                  }));
                  onLabelsChange?.();
                }}
                getLabels={window.electronAPI.getAdulteGameLabels as (id: number) => Promise<Array<{ label: string; color: string }>>}
                getAllLabels={window.electronAPI.getAllAdulteGameLabels as () => Promise<Array<{ label: string; color: string }>>}
                addLabel={window.electronAPI.addAdulteGameLabel as (id: number, label: string, color: string) => Promise<{ success: boolean }>}
                removeLabel={window.electronAPI.removeAdulteGameLabel as (id: number, label: string) => Promise<{ success: boolean }>}
                noCard={true}
              />
            </div>
          )}

          {/* Colonne 3 : Possession + Coûts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {onMarkAsOwned && (
              <RawgGameCostsSection
                costsByUser={costsByUser}
                totalPrix={totalPrix}
                profileImages={profileImages}
                onMarkAsOwned={onMarkAsOwned}
                shouldShow={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Score */}
      {(rating || metacritic || esrbBadgeStyle) && shouldShow('ratings') && (
        <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {rating && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#34d399',
                borderRadius: '999px',
                padding: '8px 14px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '14px'
              }}
            >
              <Star size={16} />
              {rating}% / 100
            </span>
          )}
          {metacritic && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                borderRadius: '999px',
                padding: '8px 14px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '14px'
              }}
            >
              <Star size={16} />
              Metacritic: {metacritic}
            </span>
          )}
          {esrbBadgeStyle && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: esrbBadgeStyle.background,
                color: esrbBadgeStyle.color,
                border: esrbBadgeStyle.border,
                borderRadius: '999px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <span style={{ fontSize: '14px' }}>{esrbBadgeStyle.emote}</span>
              <span>{esrbBadgeStyle.text}</span>
            </span>
          )}
        </div>
      )}

      {/* Genres et Tags */}
      {((genres.length > 0 && shouldShow('genres')) || (tags.length > 0 && shouldShow('tags'))) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {genres.map((genre) => (
            <span
              key={genre.id}
              style={{
                fontSize: '13px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#bfdbfe'
              }}
            >
              {genre.name}
            </span>
          ))}
          {tags.slice(0, 15).map((tag) => (
            <span
              key={tag.id}
              style={{
                fontSize: '13px',
                padding: '6px 12px',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#c4b5fd',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Tag size={12} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {rawgData?.description_raw && shouldShow('description') && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}
          >
            Synopsis
          </div>
          <div
            style={{
              color: 'var(--text)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontSize: '15px'
            }}
            dangerouslySetInnerHTML={{ __html: rawgData.description || rawgData.description_raw }}
          />
        </div>
      )}

      {/* Notes privées */}
      {game.notes_privees && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: 'var(--text)' }}>
            Notes privées
          </h3>
          <div style={{
            padding: '16px',
            background: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <p style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px' }}>
              {game.notes_privees}
            </p>
          </div>
        </div>
      )}

      {/* Métadonnées en deux colonnes */}
      {shouldShow('metadata') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}
        >
          {/* Colonne 1 : Date, Développeur, Statut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rawgData?.released && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Date de sortie
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {new Date(rawgData.released).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            )}

            {developers.length > 0 && shouldShow('developers') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Gamepad2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Développeur{developers.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {developers.map(d => d.name).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {rawgData?.status && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Gamepad2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Statut du jeu
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {rawgData.status}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne 2 : Éditeurs, Plateformes, Liens externes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {publishers.length > 0 && shouldShow('publishers') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Globe2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Éditeur{publishers.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {publishers.map(p => p.name).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {platforms.length > 0 && shouldShow('platforms') && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Gamepad2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '4px' }}>
                    Plateformes
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {platforms.map((platform: any, index: number) => {
                      const platformName = platform.platform?.name || platform.name || platform;
                      return index < platforms.length - 1 ? `${platformName}, ` : platformName;
                    }).join('')}
                  </div>
                </div>
              </div>
            )}

            {/* Liens externes et Boutiques */}
            {((shouldShow('externalLinks') && (rawgData?.website || rawgData?.reddit_url || game.rawg_id)) || (shouldShow('stores') && validStores.length > 0)) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Link2 size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '8px' }}>
                    Liens externes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Liens principaux */}
                    {shouldShow('externalLinks') && (rawgData?.website || rawgData?.reddit_url || game.rawg_id) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {rawgData?.website && (
                          <ExternalLinkIcon
                            href={rawgData.website}
                            size={20}
                            title="Site officiel"
                            showLabel={true}
                            label="Site officiel"
                          />
                        )}
                        {rawgData?.reddit_url && (
                          <ExternalLinkIcon
                            href={rawgData.reddit_url}
                            size={20}
                            title="Reddit"
                            showLabel={true}
                            label="Reddit"
                          />
                        )}
                        {game.rawg_id && (
                          <ExternalLinkIcon
                            href={`https://rawg.io/games/${rawgData?.slug || game.rawg_id}`}
                            size={20}
                            title="Page RAWG"
                            showLabel={true}
                            label="Page RAWG"
                          />
                        )}
                      </div>
                    )}

                    {/* Boutiques */}
                    {shouldShow('stores') && validStores.length > 0 && (
                      <div style={{ marginTop: shouldShow('externalLinks') && (rawgData?.website || rawgData?.reddit_url || game.rawg_id) ? '12px' : '0' }}>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShoppingBag size={14} />
                          Boutiques
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {validStores.filter((store): store is { id: string | number; name: string; url: string } => store !== null).map((store) => (
                            <ExternalLinkIcon
                              key={store.id}
                              href={store.url}
                              size={20}
                              title={store.name}
                              showLabel={true}
                              label={store.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
