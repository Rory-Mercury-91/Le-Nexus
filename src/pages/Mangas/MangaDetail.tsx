import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import DetailPageHeader from '../../components/common/DetailPageHeader';
import EnrichmentButton from '../../components/common/EnrichmentButton';
import ProtectedContent from '../../components/common/ProtectedContent';
import BookOwnershipModal from '../../components/modals/book/BookOwnershipModal';
import OwnershipModalLoader from '../../components/modals/book/OwnershipModalLoader';
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
  const location = useLocation();
  const { id } = useParams();
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
    draggingTomeId,
    enriching,
    setShowAddTome,
    setShowEditSerie,
    setEditingTome,
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

  // Flag pour s'assurer qu'on n'ouvre la modale qu'une seule fois
  const hasOpenedEditModal = useRef(false);
  const lastSerieId = useRef<string | undefined>(undefined);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);

  // Réinitialiser le flag si on change de série
  useEffect(() => {
    if (id !== lastSerieId.current) {
      lastSerieId.current = id;
      hasOpenedEditModal.current = false;
    }
  }, [id]);

  // Ouvrir automatiquement le mode édition si demandé via navigation state
  useEffect(() => {
    if (location.state?.openEdit && !loading && serie && !hasOpenedEditModal.current) {
      hasOpenedEditModal.current = true;
      setShowEditSerie(true);
      // Nettoyer le state pour éviter de rouvrir à chaque navigation
      window.history.replaceState({ ...location.state, openEdit: undefined }, '');
    }
  }, [location.state, loading, serie, setShowEditSerie]);

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
          backTo={location.state?.from || '/lectures'}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  onMarkAsOwned={() => {
                    if (!currentUser) {
                      // Afficher un message d'erreur si pas d'utilisateur connecté
                      return;
                    }
                    if (users.length === 0) {
                      // Afficher un message d'erreur si pas d'utilisateurs disponibles
                      return;
                    }
                    setShowOwnershipModal(true);
                  }}
                  costsByUser={costsByUser}
                  totalPrix={totalPrix}
                  totalMihon={totalMihon}
                  profileImages={profileImages}
                />

                {/* Informations */}
                <MangaInfoSection
                  serie={serie}
                  shouldShow={shouldShow}
                  onLabelsChange={() => {
                    loadSerie(true);
                    // Déclencher un événement pour mettre à jour la liste
                    window.dispatchEvent(new CustomEvent('manga-labels-updated', {
                      detail: { serieId: serie.id }
                    }));
                  }}
                />
              </div>
            </div>

            {/* Section Chapitres (pour gérer les chapitres) */}
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

            {/* Liste des tomes - Toujours affichée pour permettre l'ajout de tomes */}
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

        {showOwnershipModal && serie && (
          <>
            {users.length > 0 && currentUser ? (
              <BookOwnershipModal
                item={{ type: 'serie', serie, tomes: tomesWithSerieId }}
                users={users}
                currentUserId={currentUser.id}
                onClose={() => setShowOwnershipModal(false)}
                onSuccess={() => {
                  loadSerie(true);
                  setShowOwnershipModal(false);
                }}
              />
            ) : (
              <OwnershipModalLoader onClose={() => setShowOwnershipModal(false)} />
            )}
          </>
        )}

        <ConfirmDialog />
        <TomeConfirmDialog />
      </>
    </ProtectedContent>
  );
}
