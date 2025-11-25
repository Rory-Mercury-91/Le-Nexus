import { Edit, Settings, Trash2 } from 'lucide-react';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import EnrichmentButton from '../../components/common/EnrichmentButton';
import ProtectedContent from '../../components/common/ProtectedContent';
import DisplaySettingsModal, { DisplayFieldCategory } from '../../components/modals/common/DisplaySettingsModal';
import AddTomeModal from '../../components/modals/manga/AddTomeModal';
import EditSerieModal from '../../components/modals/manga/EditSerieModal';
import EditTomeModal from '../../components/modals/manga/EditTomeModal';
import { useMangaDetail } from '../../hooks/details/useMangaDetail';
import { Tome } from '../../types';
import { isSensitiveManga } from '../../utils/manga-sensitivity';
import {
  MangaChaptersSection,
  MangaCover,
  MangaInfoSection,
  MangaTomesList
} from './components';

export default function SerieDetail() {
  const {
    serie,
    loading,
    tomes,
    lastTome,
    totalPrix,
    totalMihon,
    costsByUser,
    users,
    currentUser,
    profileImages,
    showAddTome,
    showEditSerie,
    editingTome,
    showCustomizeDisplay,
    draggingTomeId,
    enriching,
    setShowAddTome,
    setShowEditSerie,
    setEditingTome,
    setShowCustomizeDisplay,
    handleDeleteSerie,
    handleDeleteTome,
    handleStatusChange,
    handleToggleFavorite,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEnrich,
    handleForceEnrich,
    loadSerie,
    shouldShow,
    ConfirmDialog,
    TomeConfirmDialog
  } = useMangaDetail();

  // Vérifier si le manga est sensible
  const isSensitive = serie ? isSensitiveManga(serie.rating) : false;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Chargement...</p>
      </div>
    );
  }

  if (!serie) return null;

  // Mapper les tomes pour ajouter serie_id si manquant
  const tomesWithSerieId: Tome[] = tomes.map(tome => ({
    ...tome,
    serie_id: tome.serie_id ?? serie.id
  }));

  return (
    <ProtectedContent isSensitive={isSensitive}>
      <>
        <DetailPageHeader
          backLabel="Retour à la collection"
          backTo="/collection"
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCustomizeDisplay(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings size={16} />
                Personnaliser l'affichage
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowEditSerie(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit size={16} />
                Modifier
              </button>
              <EnrichmentButton
                onEnrich={handleEnrich}
                onForceEnrich={handleForceEnrich}
                enriching={enriching}
                buttonLabel="🚀 Enrichir"
                forceButtonLabel="🔄 Force vérification"
              />
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteSerie}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          }
        />

        <div
          className="fade-in"
          style={{
            padding: '110px 20px 80px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              width: '100%',
              maxWidth: '100%'
            }}
          >

            {/* En-tête de la série */}
            <div
              className="card"
              style={{
                padding: 'clamp(16px, 2vw, 20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(17px, 1.5vw, 25px)',
                  flexWrap: 'wrap',
                  width: '100%'
                }}
              >
                <MangaCover
                  serie={serie}
                  tomes={tomesWithSerieId}
                  shouldShow={shouldShow}
                  onToggleFavorite={handleToggleFavorite}
                  onStatusChange={handleStatusChange}
                  onCoverUpdated={() => loadSerie(true)}
                  onMarkAllRead={async () => {
                    await window.electronAPI.marquerSerieLue(serie.id);
                    loadSerie(true);
                  }}
                  onMarkAllChaptersRead={async () => {
                    await window.electronAPI.updateSerie(serie.id, { chapitres_lus: serie.nb_chapitres || 0 });
                    loadSerie(true);
                  }}
                  costsByUser={costsByUser}
                  totalPrix={totalPrix}
                  totalMihon={totalMihon}
                  profileImages={profileImages}
                />

                {/* Informations */}
                <MangaInfoSection serie={serie} shouldShow={shouldShow} />
              </div>

            </div>

            {/* Section Chapitres (pour gérer les chapitres) */}
            {shouldShow('section_chapitres') && (
              <div
                className="card"
                style={{
                  padding: 'clamp(16px, 2vw, 20px)'
                }}
              >
                <MangaChaptersSection
                  serie={serie}
                  shouldShow={true}
                  onChapitresLusChange={async (value) => {
                    await window.electronAPI.updateSerie(serie.id, { chapitres_lus: value });
                    loadSerie(true);
                  }}
                  onNbChapitresChange={async (value) => {
                    await window.electronAPI.updateSerie(serie.id, { nb_chapitres: value });
                    loadSerie(true);
                  }}
                  onChapitresMihonChange={async (value) => {
                    await window.electronAPI.updateSerie(serie.id, { chapitres_mihon: value ? 1 : 0 });
                    loadSerie(true);
                  }}
                />
              </div>
            )}

            {/* Liste des tomes - Pleine largeur (pour volumes ou volume+chapitre) */}
            {shouldShow('section_tomes') && (
              <div
                className="card"
                style={{
                  padding: 'clamp(16px, 2vw, 20px)'
                }}
              >
                <MangaTomesList
                  serie={serie}
                  tomes={tomesWithSerieId}
                  users={users}
                  profileImages={profileImages}
                  currentUserId={currentUser?.id || null}
                  draggingTomeId={draggingTomeId}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onToggleTomeLu={async (tomeId, checked) => {
                    await window.electronAPI.toggleTomeLu(tomeId, checked);
                    loadSerie(true);
                  }}
                  onToggleTomePossede={async (tomeId, checked) => {
                    await window.electronAPI.toggleTomePossede(tomeId, checked);
                    loadSerie(true);
                  }}
                  onToggleTomeMihon={async (tomeId, checked) => {
                    await window.electronAPI.toggleTomeMihon(tomeId, checked);
                    loadSerie(true);
                  }}
                  onEditTome={setEditingTome}
                  onDeleteTome={handleDeleteTome}
                  onAddTome={() => setShowAddTome(true)}
                  onPossederTousLesTomes={async () => {
                    await window.electronAPI.possederTousLesTomes(serie.id);
                    loadSerie(true);
                  }}
                  shouldShow={true}
                />
              </div>
            )}
          </div>
        </div>

        {showAddTome && (
          <AddTomeModal
            serieId={serie.id}
            serieTitre={serie.titre}
            mediaType={serie.media_type}
            typeVolume={serie.type_volume}
            lastTome={lastTome}
            onClose={() => setShowAddTome(false)}
            onSuccess={() => {
              setShowAddTome(false);
              loadSerie(true);
            }}
          />
        )}

        {showEditSerie && (
          <EditSerieModal
            serie={serie}
            onClose={() => setShowEditSerie(false)}
            onSuccess={() => {
              setShowEditSerie(false);
              loadSerie(true);
            }}
          />
        )}

        {editingTome !== null && (
          <EditTomeModal
            tome={tomesWithSerieId.find((t: Tome) => t.id === editingTome)!}
            serieTitre={serie.titre}
            mediaType={serie.media_type}
            typeVolume={serie.type_volume}
            onClose={() => setEditingTome(null)}
            onSuccess={() => {
              setEditingTome(null);
              loadSerie(true);
            }}
          />
        )}

        {showCustomizeDisplay && (
          <DisplaySettingsModal
            title="Affichage des mangas"
            description="Activez ou désactivez les sections visibles sur les fiches mangas."
            fields={[
              {
                title: 'Présentation',
                icon: '📚',
                fields: [
                  { key: 'couverture', label: 'Couverture' },
                  { key: 'titres_alternatifs', label: 'Titres alternatifs' },
                  { key: 'description', label: 'Synopsis' }
                ]
              },
              {
                title: 'Métadonnées',
                icon: '📊',
                fields: [
                  { key: 'annee_publication', label: 'Année VO' },
                  { key: 'annee_vf', label: 'Année VF' },
                  { key: 'date_debut', label: 'Date début (publication)' },
                  { key: 'date_fin', label: 'Date fin (publication)' },
                  { key: 'statut_publication', label: 'Statut VO' },
                  { key: 'statut_publication_vf', label: 'Statut VF' },
                  { key: 'nb_volumes', label: 'Nb volumes VO' },
                  { key: 'nb_volumes_vf', label: 'Nb volumes VF' },
                  { key: 'nb_chapitres', label: 'Nb chapitres VO' },
                  { key: 'nb_chapitres_vf', label: 'Nb chapitres VF' },
                  { key: 'genres', label: 'Genres' },
                  { key: 'themes', label: 'Thèmes' },
                  { key: 'media_type', label: 'Type de média' },
                  { key: 'demographie', label: 'Démographie' },
                  { key: 'type_volume', label: 'Type de volume' },
                  { key: 'editeur_vo', label: 'Éditeur VO' },
                  { key: 'editeur', label: 'Éditeur VF' },
                  { key: 'serialization', label: 'Prépublication' },
                  { key: 'auteurs', label: 'Auteurs' },
                  { key: 'langue_originale', label: 'Pays/Origine' }
                ]
              },
              {
                title: 'Contenu',
                icon: '📖',
                fields: [
                  { key: 'section_tomes', label: 'Liste des tomes' },
                  { key: 'section_chapitres', label: 'Gestion des chapitres' },
                  { key: 'section_progression', label: 'Progression lecture' },
                  { key: 'section_costs', label: 'Coûts et propriétaires' }
                ]
              },
              {
                title: 'Informations externes',
                icon: '🌐',
                fields: [
                  { key: 'mal_block', label: 'Bloc d\'informations MAL' }
                ]
              }
            ] as DisplayFieldCategory[]}
            mode="global-local"
            itemId={serie.id}
            loadGlobalPrefs={async () => {
              const prefs = await window.electronAPI.getMangaDisplaySettings?.();
              return prefs || {};
            }}
            loadLocalOverrides={async (itemId) => {
              const overrides = await window.electronAPI.getMangaDisplayOverrides?.(itemId);
              return overrides || {};
            }}
            saveLocalOverrides={async (itemId, overrides) => {
              await window.electronAPI.saveMangaDisplayOverrides?.(itemId, overrides);
            }}
            deleteLocalOverrides={async (itemId, keys) => {
              await window.electronAPI.deleteMangaDisplayOverrides?.(itemId, keys);
            }}
            onSave={() => {
              loadSerie(true); // recharger les prefs locales et globales après sauvegarde
            }}
            onClose={() => {
              setShowCustomizeDisplay(false);
            }}
          />
        )}

        <ConfirmDialog />
        <TomeConfirmDialog />
      </>
    </ProtectedContent>
  );
}
