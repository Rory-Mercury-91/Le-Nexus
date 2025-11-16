import { ChevronDown, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdulteGameCard } from '../../components/cards';
import { COMMON_STATUSES } from '../../components/cards/common';
import {
  BackToTopButton,
  CollectionFiltersBar,
  CollectionHeader,
  CollectionSearchBar,
  FilterToggle,
  Pagination,
  ProgressionHeader,
  SortOption
} from '../../components/collections';
import CollectionView from '../../components/common/CollectionView';
import ListItem from '../../components/common/ListItem';
import AddAdulteGameModal from '../../components/modals/adulte-game/AddAdulteGameModal';
import UpdateProgressInline from '../../components/collections/UpdateProgressInline';
import { useAdulteGameCollection } from '../../hooks/collections/useAdulteGameCollection';
import { useConfirm } from '../../hooks/common/useConfirm';
import { rememberScrollTarget, useScrollRestoration } from '../../hooks/common/useScrollRestoration';
import { useToast } from '../../hooks/common/useToast';
import type { AdulteGame, AdulteGameStatutJeu, AdulteGameStatutPerso } from '../../types';

export default function AdulteGame() {
  const navigate = useNavigate();
  const { ToastContainer } = useToast();
  const { ConfirmDialog: ConfirmModal } = useConfirm();
  
  // État pour la progression des mises à jour
  const [updateProgress, setUpdateProgress] = useState<{
    phase: 'start' | 'sheet' | 'scraping' | 'complete' | 'error';
    total: number;
    current: number;
    message: string;
    gameTitle?: string;
    updated?: number;
    sheetSynced?: number;
  } | null>(null);

  // Hook principal qui gère toute la logique métier
  const {
    games,
    loading,
    searchTerm,
    setSearchTerm,
    selectedStatutJeu,
    setSelectedStatutJeu,
    selectedStatutPerso,
    setSelectedStatutPerso,
    selectedPlateforme,
    setSelectedPlateforme,
    translationFilter,
    setTranslationFilter,
    showMajOnly,
    setShowMajOnly,
    showFavoriteOnly,
    setShowFavoriteOnly,
    showHidden,
    setShowHidden,
    selectedMoteur,
    setSelectedMoteur,
    availableMoteurs,
    unknownMoteurValue,
    selectedTags,
    selectedLabels,
    allTags,
    availableLabels,
    gameLabels,
    refreshLabelsForGame,
    tagPreferences,
    handleTagToggle,
    handleLabelToggle,
    sortBy,
    setSortBy,
    paginatedItems,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
    stats,
    viewMode,
    handleViewModeChange,
    filteredGames,
    sortedGames,
    hasActiveFilters,
    loadGames,
    handleCheckUpdates,
    handleToggleFavorite,
    handleChangeStatus,
    handleToggleHidden,
    handleImportFromF95Directly,
    detectUrlOrId,
    showAddFromUrl,
    importingF95,
    message,
    showAddModal,
    setShowAddModal,
    initialSearchId,
    setInitialSearchId,
    clearFilters
  } = useAdulteGameCollection();

  useScrollRestoration('collection.adulteGames.scroll', !loading);

  // Écouter les événements de progression des mises à jour
  useEffect(() => {
    const unsubscribe = window.electronAPI.onAdulteGameUpdatesProgress?.((progress) => {
      setUpdateProgress(progress);
      // Auto-masquer après 5 secondes si terminé ou erreur
      if (progress.phase === 'complete' || progress.phase === 'error') {
        setTimeout(() => {
          setUpdateProgress(null);
        }, 5000);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Wrapper pour handleCheckUpdates qui gère l'affichage de la progression
  const handleCheckUpdatesWithProgress = useCallback(async () => {
    setUpdateProgress({
      phase: 'start',
      total: 0,
      current: 0,
      message: 'Démarrage de la vérification...'
    });
    
    try {
      await handleCheckUpdates();
    } catch (error) {
      setUpdateProgress({
        phase: 'error',
        total: 0,
        current: 0,
        message: error instanceof Error ? error.message : 'Erreur lors de la vérification'
      });
    }
  }, [handleCheckUpdates]);

  // États d'UI spécifiques au composant (affichage des filtres collapsibles)
  const [showTagsFilter, setShowTagsFilter] = useState(false);
  const [showLabelsFilter, setShowLabelsFilter] = useState(false);

  // Fonctions de rendu spécifiques au composant
  const handleOpenGame = (gameId: number) => {
    rememberScrollTarget('collection.adulteGames.scroll', gameId);
    navigate(`/adulte-game/${gameId}`);
  };

  const renderGameCard = (game: AdulteGame) => (
    <AdulteGameCard
      key={`${game.id}-${game.statut_perso || ''}-${game.is_favorite ? 'fav' : 'no-fav'}-${viewMode}`}
      game={game}
      onClick={() => handleOpenGame(game.id)}
      onToggleFavorite={() => handleToggleFavorite(game.id)}
      onChangeStatus={(status) => handleChangeStatus(game.id, status)}
      onToggleHidden={() => handleToggleHidden(game.id)}
      onCoverUpdated={loadGames}
      isHidden={Boolean(game.is_hidden)}
      labels={gameLabels[game.id] || []}
      onLabelsUpdated={() => refreshLabelsForGame(game.id)}
    />
  );

  const renderGameListItem = (game: AdulteGame) => {
    const getVersionProgress = () => {
      const versionActuelle = game.version || '0.0';
      const versionJouee = game.version_jouee || versionActuelle;

      const parseVersion = (v: string) => {
        const nums = v.match(/\d+/g);
        if (!nums || nums.length === 0) return 0;
        return parseInt(nums.join(''));
      };

      const current = parseVersion(versionJouee);
      const total = parseVersion(versionActuelle);

      return total > 0 ? Math.round((current / total) * 100) : 0;
    };

    const cleanVersion = (v: string) => v.replace(/^v/i, '');

    const progression = getVersionProgress();
    const versionActuelle = game.version || '0.0';
    const versionJouee = game.version_jouee || versionActuelle;
    const subtitle = `v${cleanVersion(versionJouee)} / v${cleanVersion(versionActuelle)}`;

    // Badges (FR + Favori)
    const badges = (
      <>
        {game.traduction_fr_disponible && (
          <span style={{
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #0055A4 0%, #0055A4 33%, #FFFFFF 33%, #FFFFFF 66%, #EF4135 66%, #EF4135 100%)',
            color: '#000000',
            flexShrink: 0,
            letterSpacing: '0.5px'
          }}>
            FR
          </span>
        )}
        {!!game.is_favorite && (
          <span style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '700',
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            flexShrink: 0,
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            border: '1.5px solid rgba(255, 255, 255, 0.3)'
          }}>
            <span style={{ fontSize: '10px' }}>❤️</span>
            <span>Favori</span>
          </span>
        )}
      </>
    );

    // Badge de statut (uniquement pour les statuts spécifiques)
    const getStatusBadge = () => {
      const status = game.statut_perso || '';
      const hiddenStatuses = ['En cours', 'Terminé', 'À lire'];
      if (!status || hiddenStatuses.includes(status)) return null;

      const getStatusConfig = () => {
        switch (status) {
          case 'Abandonné':
            return {
              color: '#ffffff',
              bg: '#ef4444',
              icon: '🚫',
              label: 'Abandonné'
            };
          case 'En pause':
            return {
              color: '#000000',
              bg: '#fbbf24',
              icon: '⏸️',
              label: 'En pause'
            };
          default:
            return null;
        }
      };

      const config = getStatusConfig();
      if (!config) return null;

      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          background: config.bg,
          color: config.color,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          textTransform: 'uppercase',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ fontSize: '12px' }}>{config.icon}</span>
          <span>{config.label}</span>
        </span>
      );
    };

    return (
      <ListItem
        key={`${game.id}-${game.statut_perso || ''}-${game.is_favorite ? 'fav' : 'no-fav'}-${viewMode}`}
        title={game.titre}
        subtitle={subtitle}
        progression={progression}
        currentStatus={game.statut_perso || 'À lire'}
        availableStatuses={[...COMMON_STATUSES.ADULTE_GAME]}
        isFavorite={!!game.is_favorite}
        badges={badges}
        statusBadge={getStatusBadge()}
        onClick={() => handleOpenGame(game.id)}
        onToggleFavorite={() => handleToggleFavorite(game.id)}
        onChangeStatus={(status) => handleChangeStatus(game.id, status)}
        onToggleHidden={() => handleToggleHidden(game.id)}
      />
    );
  };

  if (loading && games.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <ConfirmModal />
      <div className="fade-in" style={{ padding: '32px 40px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {/* En-tête avec composant réutilisable */}
          <CollectionHeader
            title="Collection Jeux adulte"
            icon="🎮"
            count={filteredGames.length}
            countLabel={filteredGames.length > 1 ? 'jeux' : 'jeu'}
            onAdd={() => setShowAddModal(true)}
            addButtonLabel="Ajouter un jeu"
            extraButtons={
              <button
                onClick={handleCheckUpdatesWithProgress}
                disabled={loading}
                className="btn btn-primary"
              >
                <RefreshCw size={20} />
                Vérifier MAJ
              </button>
            }
          />

          {message && (
            <div style={{
              padding: '16px 20px',
              marginBottom: '24px',
              borderRadius: '12px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: message.type === 'success' ? '#10b981' : '#ef4444',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              {message.text}
            </div>
          )}

          {/* Stats de progression */}
          <ProgressionHeader type="adulte-game" stats={stats} />

          {/* Recherche et filtres avec composants réutilisables */}
          <CollectionFiltersBar
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <CollectionSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Rechercher un jeu (titre, F95 ID, LewdCorner ID)..."
              onSubmit={(e) => e.preventDefault()}
              showSubmitButton={false}
            />

            {/* Ligne 1 : Tri et Selects */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="select"
                style={{ minWidth: '200px' }}
              >
                <option value="title-asc">📖 Titre (A → Z)</option>
                <option value="title-desc">📖 Titre (Z → A)</option>
                <option value="date-desc">🆕 Ajout récent</option>
                <option value="date-asc">🕐 Ajout ancien</option>
                <option value="platform-asc">📦 Plateforme (A → Z)</option>
                <option value="platform-desc">📦 Plateforme (Z → A)</option>
              </select>

              <select
                value={selectedStatutJeu}
                onChange={(e) => setSelectedStatutJeu(e.target.value as AdulteGameStatutJeu | 'all')}
                className="select"
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="all">🔍 Tous les statuts jeu</option>
                <option value="EN COURS">🎮 EN COURS</option>
                <option value="TERMINÉ">✅ TERMINÉ</option>
                <option value="ABANDONNÉ">❌ ABANDONNÉ</option>
              </select>

              <select
                value={selectedStatutPerso}
                onChange={(e) => setSelectedStatutPerso(e.target.value as AdulteGameStatutPerso | 'all')}
                className="select"
                style={{ width: 'auto', minWidth: '200px' }}
              >
                <option value="all">🔍 Toutes les complétions</option>
                <option value="À lire">📋 À lire</option>
                <option value="En cours">🎮 En cours</option>
                <option value="En pause">⏸️ En pause</option>
                <option value="Terminé">✅ Terminé</option>
                <option value="Abandonné">❌ Abandonné</option>
              </select>

              <select
                value={selectedPlateforme}
                onChange={(e) => setSelectedPlateforme(e.target.value as 'all' | 'F95Zone' | 'LewdCorner')}
                className="select"
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="all">🔍 Toutes les plateformes</option>
                <option value="F95Zone">🌐 F95Zone</option>
                <option value="LewdCorner">🌐 LewdCorner</option>
              </select>

              <select
                value={selectedMoteur}
                onChange={(e) => setSelectedMoteur(e.target.value)}
                className="select"
                style={{ width: 'auto', minWidth: '200px' }}
              >
                <option value="all">🛠️ Tous les moteurs</option>
                {availableMoteurs.map((moteur) => (
                  <option key={moteur} value={moteur}>
                    {moteur === unknownMoteurValue ? '🕳️ Moteur non renseigné' : `🛠️ ${moteur}`}
                  </option>
                ))}
              </select>

              <select
                value={translationFilter}
                onChange={(e) => setTranslationFilter(e.target.value as 'all' | 'translated' | 'not-translated')}
                className="select"
                style={{ width: 'auto', minWidth: '200px' }}
              >
                <option value="all">🌍 Toutes les traductions</option>
                <option value="translated">🇫🇷 Jeux traduits</option>
                <option value="not-translated">🛠️ Jeux non traduits</option>
              </select>
            </div>

            {/* Ligne 2 : Toggles */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
              <FilterToggle
                checked={showMajOnly}
                onChange={setShowMajOnly}
                label="🔔 MAJ"
                icon="🔔"
                activeColor="#22c55e"
              />

              <FilterToggle
                checked={showFavoriteOnly}
                onChange={setShowFavoriteOnly}
                label="❤️ Favoris"
                icon="❤️"
                activeColor="var(--error)"
              />

              <FilterToggle
                checked={showHidden}
                onChange={setShowHidden}
                label="👁️ Jeux masqués"
                icon="👁️"
                activeColor="#f59e0b"
              />
            </div>

            {/* Filtre par tags */}
            {allTags.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowTagsFilter(!showTagsFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showTagsFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🏷️ Filtrer par tags
                    {selectedTags.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedTags.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showTagsFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showTagsFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {allTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const preference = tagPreferences[tag] || 'neutral';

                      let tagColor = '#f59e0b';
                      let borderColor = '#f59e0b';
                      if (preference === 'liked') {
                        tagColor = '#ef4444';
                        borderColor = '#ef4444';
                      } else if (preference === 'disliked') {
                        tagColor = '#1f2937';
                        borderColor = '#1f2937';
                      }

                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          title={`État: ${preference === 'liked' ? 'Favori' : preference === 'disliked' ? 'Non apprécié' : 'Neutre'} (Modifier depuis la page de détail)`}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: isSelected ? 'var(--primary)' : tagColor,
                            color: 'white',
                            border: isSelected ? '2px solid var(--primary)' : `2px solid ${borderColor}`,
                            fontWeight: isSelected ? '600' : preference !== 'neutral' ? '600' : '500',
                            opacity: preference === 'disliked' && !isSelected ? 0.8 : 1
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Filtre par labels */}
            {availableLabels.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowLabelsFilter(!showLabelsFilter)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: showLabelsFilter ? '12px' : '0'
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    🏷️ Filtrer par labels
                    {selectedLabels.length > 0 && (
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                        {selectedLabels.length}
                      </span>
                    )}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: 'var(--text-secondary)',
                      transform: showLabelsFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {showLabelsFilter && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                    {availableLabels.map(labelObj => (
                      <button
                        key={labelObj.label}
                        onClick={() => handleLabelToggle(labelObj.label)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '600',
                          border: selectedLabels.includes(labelObj.label) ? `2px solid ${labelObj.color}` : `2px solid ${labelObj.color}40`,
                          background: selectedLabels.includes(labelObj.label) ? labelObj.color : `${labelObj.color}20`,
                          color: selectedLabels.includes(labelObj.label) ? 'white' : labelObj.color,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {labelObj.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CollectionFiltersBar>

          {/* Pagination */}
          {sortedGames.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage as 25 | 50 | 100 | 'all'}
              totalItems={sortedGames.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(items: 25 | 50 | 100 | 'all') => setItemsPerPage(items)}
              onFirstPage={goToFirstPage}
              onLastPage={goToLastPage}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              viewMode={viewMode}
              onViewModeChange={(mode: 'grid' | 'list' | 'images') => handleViewModeChange(mode)}
              hideImageView={true}
            />
          )}

          {/* Message d'ajout depuis URL/ID F95Zone */}
          {showAddFromUrl && (() => {
            const detected = detectUrlOrId(searchTerm);
            return (
              <div style={{
                padding: '20px',
                marginBottom: '24px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '2px solid #8b5cf6',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#8b5cf6',
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  <span style={{ fontSize: '20px' }}>💡</span>
                  <span>Aucun résultat trouvé</span>
                </div>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  ID F95Zone détecté : <strong>{detected.id}</strong>. Souhaitez-vous ajouter ce jeu depuis F95Zone ?
                </p>
                <button
                  onClick={() => detected.id && handleImportFromF95Directly(detected.id)}
                  className="btn btn-primary"
                  disabled={importingF95}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '8px'
                  }}
                >
                  {importingF95 ? 'Import en cours...' : 'Ajouter depuis F95Zone'}
                </button>
              </div>
            );
          })()}

          {/* Progression des mises à jour (inline) */}
          {updateProgress && (
            <UpdateProgressInline
              phase={updateProgress.phase}
              total={updateProgress.total}
              current={updateProgress.current}
              message={updateProgress.message}
              gameTitle={updateProgress.gameTitle}
              updated={updateProgress.updated}
              sheetSynced={updateProgress.sheetSynced}
            />
          )}

          {/* Liste des jeux */}
          <CollectionView
            items={paginatedItems}
            loading={loading && !updateProgress}
            viewMode={viewMode}
            key={`${viewMode}-${currentPage}`}
            renderCard={renderGameCard}
            renderListItem={renderGameListItem}
            emptyMessage={games.length === 0 ? 'Ajoutez votre premier jeu adulte !' : (showAddFromUrl ? '' : 'Aucun jeu trouvé. Essayez de modifier vos filtres')}
            emptyIcon={<span style={{ fontSize: '64px', opacity: 0.3 }}>🎮</span>}
            gridMinWidth={400}
            imageMinWidth={350}
          />

          {showAddModal && (
            <AddAdulteGameModal
              initialSearchId={initialSearchId || undefined}
              onClose={() => {
                setShowAddModal(false);
                setInitialSearchId(null);
              }}
              onSuccess={async () => {
                await loadGames(true);
                setShowAddModal(false);
                setInitialSearchId(null);
              }}
            />
          )}


          {sortedGames.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage as 25 | 50 | 100 | 'all'}
                totalItems={sortedGames.length}
                onPageChange={setCurrentPage}
                onFirstPage={goToFirstPage}
                onLastPage={goToLastPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
                hideItemsPerPageSelect
                hideImageView
              />
            </div>
          )}

          <BackToTopButton />
        </div>
      </div>
    </>
  );
}
