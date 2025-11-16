import ProtectedContent from '../../components/common/ProtectedContent';
import AddTomeModal from '../../components/modals/manga/AddTomeModal';
import CustomizeDisplayModal from '../../components/modals/manga/CustomizeDisplayModal';
import EditSerieModal from '../../components/modals/manga/EditSerieModal';
import EditTomeModal from '../../components/modals/manga/EditTomeModal';
import { useMangaDetail } from '../../hooks/details/useMangaDetail';
import { Tome } from '../../types';
import { isSensitiveManga } from '../../utils/manga-sensitivity';
import {
    MangaChaptersSection,
    MangaCostsSection,
    MangaCover,
    MangaHeader,
    MangaInfoSection,
    MangaMalBlock,
    MangaProgressSection,
    MangaTomesList
} from './components';

export default function SerieDetail() {
  const {
    serie,
    loading,
    tomes,
    lastTome,
    totalPrix,
    costsByUser,
    users,
    currentUser,
    profileImages,
    showAddTome,
    showEditSerie,
    editingTome,
    showCustomizeDisplay,
    draggingTomeId,
    draggingSerie,
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
    handleSerieDragOver,
    handleSerieDragLeave,
    handleSerieDrop,
    handleEnrich,
    loadSerie,
    shouldShow,
    ConfirmDialog
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

  return (
    <ProtectedContent isSensitive={isSensitive}>
      <>
      <MangaHeader
        loading={loading}
        onEdit={() => setShowEditSerie(true)}
        onCustomize={() => setShowCustomizeDisplay(true)}
        onEnrich={handleEnrich}
        onDelete={handleDeleteSerie}
        enriching={enriching}
      />

      <div
        className="fade-in"
        style={{
          padding: '110px 40px 80px',
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
            maxWidth: '1400px',
            margin: '0 auto'
          }}
        >

        {/* En-tête de la série */}
        <div
          className="card"
          style={{
            padding: 'clamp(20px, 3vw, 36px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'clamp(20px, 3vw, 36px)',
              flexWrap: 'wrap',
              width: '100%'
            }}
          >
            <MangaCover
              serie={serie}
              tomes={tomes}
              draggingSerie={draggingSerie}
              shouldShow={shouldShow}
              onDragOver={handleSerieDragOver}
              onDragLeave={handleSerieDragLeave}
              onDrop={handleSerieDrop}
              onToggleFavorite={handleToggleFavorite}
              onStatusChange={handleStatusChange}
            />

            {/* Informations */}
            <MangaInfoSection serie={serie} shouldShow={shouldShow} />
          </div>

          {/* Section Informations MyAnimeList */}
          <MangaMalBlock serie={serie} shouldShow={shouldShow} />

          {/* Section Coûts et Progression */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: '24px'
            }}
          >
            <MangaCostsSection
              costsByUser={costsByUser}
              totalPrix={totalPrix}
              serie={serie}
              profileImages={profileImages}
              shouldShow={shouldShow('section_costs')}
            />

            <MangaProgressSection
              serie={serie}
              tomes={tomes}
              shouldShow={shouldShow('section_progression')}
              onMarkAllRead={async () => {
                await window.electronAPI.marquerSerieLue(serie.id);
                loadSerie(true);
              }}
              onMarkAllChaptersRead={async () => {
                await window.electronAPI.updateSerie(serie.id, { chapitres_lus: serie.nb_chapitres || 0 });
                loadSerie(true);
              }}
            />
          </div>
        </div>

        {/* Section Chapitres (pour gérer les chapitres) */}
        {shouldShow('section_chapitres') && (
          <div
            className="card"
            style={{
              padding: 'clamp(20px, 3vw, 32px)'
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
            />
          </div>
        )}

        {/* Liste des tomes - Pleine largeur (pour volumes ou volume+chapitre) */}
        {shouldShow('section_tomes') && (
          <div
            className="card"
            style={{
              padding: 'clamp(20px, 3vw, 32px)'
            }}
          >
            <MangaTomesList
              serie={serie}
              tomes={tomes}
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
          tome={tomes.find((t: Tome) => t.id === editingTome)!}
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
        <CustomizeDisplayModal
          mangaId={serie.id}
          onClose={() => {
            setShowCustomizeDisplay(false);
          }}
          onSave={() => {
            loadSerie(true); // recharger les prefs locales et globales après sauvegarde
          }}
        />
      )}

      <ConfirmDialog />
    </>
    </ProtectedContent>
  );
}
