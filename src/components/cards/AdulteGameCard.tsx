import { Gamepad2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAdulteGameLock } from '../../hooks/useAdulteGameLock';
import { AdulteGame } from '../../types';
import { shouldBlurByEsrbRating } from '../../utils/esrb-rating';
import AdulteGameLabelsModal from '../modals/adulte-game/AdulteGameLabelsModal';
import { CardActionsMenu, CardBadge, CardCover, CardTitle, COMMON_STATUSES, FavoriteBadge, StatusBadge, useIsNew } from './common';

interface AdulteGameCardProps {
  game: AdulteGame;
  onClick: () => void;
  onToggleFavorite: () => Promise<void>;
  onChangeStatus: (status: string) => Promise<void>;
  onToggleHidden: () => Promise<void>;
  onCoverUpdated?: () => void;
  isHidden?: boolean;
  labels?: Array<{ label: string; color: string }>;
  onLabelsUpdated?: () => void;
}

export default function AdulteGameCard({
  game,
  onClick,
  onToggleFavorite,
  onChangeStatus,
  onToggleHidden,
  onCoverUpdated,
  isHidden = false,
  labels = [],
  onLabelsUpdated
}: AdulteGameCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const { isLocked, hasPassword } = useAdulteGameLock();
  const checkIsNew = useIsNew(game.created_at, {
    hideIfCompleted: true,
    completedStatus: 'Terminé',
    currentStatus: game.statut_perso || undefined
  });
  const isNew = checkIsNew;

  const handleStatusChange = async (newStatus: string) => {
    await onChangeStatus(newStatus);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    try {
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));

      if (!imageFile || !game.titre) {
        return;
      }

      // Supprimer l'ancienne image locale si elle existe
      if (game.couverture_url && game.couverture_url.startsWith('covers/')) {
        await window.electronAPI.deleteCoverImage(game.couverture_url);
      }

      // Sauvegarder la nouvelle image
      const filePath = (imageFile as any).path;
      if (!filePath) return;

      const result = await window.electronAPI.saveCoverFromPath(filePath, game.titre, 'adulte-game');

      if (result.success && result.localPath) {
        // Mettre à jour la base de données
        await window.electronAPI.updateAdulteGameGame(game.id, {
          couverture_url: result.localPath
        });

        // Notifier le parent pour recharger les données
        if (onCoverUpdated) {
          onCoverUpdated();
        }
      }
    } catch (error) {
      console.error('Erreur lors du drop:', error);
    }
  };

  // Pour les jeux RAWG, flouter seulement si le code maître est présent ET que le rating ESRB nécessite un floutage
  // Pour les autres jeux, utiliser le système de mot de passe
  const shouldBlurByEsrb = game.game_site === 'RAWG' && shouldBlurByEsrbRating((game as any).esrb_rating);
  const shouldBlurCover = (shouldBlurByEsrb && hasPassword && isLocked) || (game.game_site !== 'RAWG' && hasPassword && isLocked);

  // Mode Images uniquement : désactivé pour JEUX ADULTES (format paysage différent 16/9 vs 2/3)
  // Le paramètre _imageOnly est ignoré pour JEUX ADULTES

  const handleOpenLabelsModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowLabelsModal(true);
  };

  const hasLabels = labels.length > 0;

  return (
    <div
      onClick={dragging ? undefined : onClick}
      className="card"
      style={{
        padding: '0',
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        cursor: dragging ? 'copy' : 'pointer',
        zIndex: isMenuOpen ? 1000 : 1,
        border: dragging ? '2px solid var(--primary)' : undefined,
        background: dragging ? 'rgba(99, 102, 241, 0.1)' : undefined
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bannière (format paysage) */}
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        position: 'relative',
        overflow: 'visible',
        background: 'var(--surface)'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '0',
          opacity: dragging ? 0.5 : 1,
          transition: 'opacity 0.2s'
        }}>
          <CardCover
            src={game.couverture_url || undefined}
            alt={game.titre}
            fallbackIcon={<Gamepad2 size={48} />}
            objectFit="contain"
            shouldBlur={shouldBlurCover}
            hasMasterPassword={hasPassword}
          />
        </div>

        {dragging && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            Déposez l'image ici
          </div>
        )}

        {/* Badge Favori (en haut à gauche) */}
        <FavoriteBadge isFavorite={!!game.is_favorite} onToggle={onToggleFavorite} />

        {/* Badge Nouveau (à gauche, après le cœur) */}
        <CardBadge show={isNew()} offsetForFavorite={!!game.is_favorite} />

        {/* Badge Mise à jour disponible */}
        <CardBadge
          show={!!game.maj_disponible}
          offsetForFavorite={!!game.is_favorite}
          offsetForNew={isNew()}
          text="🔄 MAJ"
          background="linear-gradient(135deg, var(--primary), var(--primary-light))"
          boxShadow="0 3px 10px rgba(99, 102, 241, 0.4)"
        />

        {/* Badge Statut (toujours affiché, y compris "À jouer" par défaut) */}
        <StatusBadge key={`status-${game.id}-${game.statut_perso}`} status={game.statut_perso || game.completion_perso || 'À jouer'} type="adulte-game" />

        {/* Menu actions */}
        <CardActionsMenu
          isFavorite={!!game.is_favorite}
          isHidden={isHidden}
          currentStatus={game.statut_perso || 'À lire'}
          availableStatuses={COMMON_STATUSES.ADULTE_GAME}
          onToggleFavorite={onToggleFavorite}
          onToggleHidden={onToggleHidden}
          onChangeStatus={handleStatusChange}
          onMenuOpen={setIsMenuOpen}
          statusCategory="adulteGame"
        />
      </div>

      {/* Modal Labels */}
      {showLabelsModal && (
        <AdulteGameLabelsModal
          gameId={game.id}
          onClose={() => setShowLabelsModal(false)}
          onLabelsChange={async () => {
            if (onLabelsUpdated) {
              await onLabelsUpdated();
            }
          }}
        />
      )}

      {/* Contenu : Versions + Titre */}
      <div style={{
        padding: '8px 10px 4px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        borderTop: '1px solid var(--border)',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Informations de version (masquées pour les jeux RAWG) */}
        {game.game_site !== 'RAWG' && (
          <div style={{
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            {/* Ligne 1 : Version actuelle et Version traduite côte à côte */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>Version actuelle : </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {game.version || 'Non connue'}
                </span>
              </span>
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>Version traduite : </span>
                <span style={{
                  color: (() => {
                    if (!game.version_traduite) {
                      return 'var(--text-secondary)';
                    }
                    // Si c'est "intégré", couleur neutre
                    if (game.version_traduite.toLowerCase().includes('intégré')) {
                      return 'var(--text)';
                    }
                    // Sinon, comparer avec la version actuelle
                    if (game.version && game.version_traduite !== game.version) {
                      return 'var(--error)';
                    }
                    return 'var(--success)';
                  })(),
                  fontWeight: 600
                }}>
                  {game.version_traduite || 'Non connue'}
                </span>
              </span>
            </div>
            {/* Ligne 2 : Dernière version jouée (uniquement si renseignée) */}
            {game.version_jouee && (
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>Dernière version jouée : </span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {game.version_jouee}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Titre + Badges additionnels */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {/* Badge Traduction FR */}
          {!!game.traduction_fr_disponible && (
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #0055A4 0%, #0055A4 33%, #FFFFFF 33%, #FFFFFF 66%, #EF4135 66%, #EF4135 100%)',
              color: '#000000',
              flexShrink: 0,
              alignSelf: 'flex-start',
              letterSpacing: '0.5px'
            }}>
              FR
            </span>
          )}
          <CardTitle title={game.titre}>{game.titre}</CardTitle>
        </div>
      </div>

      <div
        style={{
          padding: '0 10px 10px 10px',
          display: 'flex',
          alignItems: hasLabels ? 'center' : 'stretch',
          justifyContent: hasLabels ? 'space-between' : 'flex-start',
          gap: '8px',
          minHeight: '42px',
          maxHeight: '60px',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        {hasLabels ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
              overflow: 'hidden',
              maxHeight: '60px'
            }}
          >
            {labels.map(({ label, color }) => (
              <span
                key={label}
                title={label}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  background: color,
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenLabelsModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px dashed var(--border-strong)',
              background: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--primary)',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            Ajouter un label
          </button>
        )}

        {hasLabels && (
          <button
            type="button"
            onClick={handleOpenLabelsModal}
            title="Ajouter un label"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--surface-light)',
              color: 'var(--primary)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
