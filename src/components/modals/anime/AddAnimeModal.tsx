import { Fragment, useEffect, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { AnimeSearchResult } from '../../../types';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';
import AddAnimeForm from './AddAnimeForm';
import AddAnimeMalImportSection from './AddAnimeMalImportSection';
import AddAnimeSearchSection from './AddAnimeSearchSection';
import MalCandidateSelectionModal from '../common/MalCandidateSelectionModal';

interface AddAnimeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMalId?: number;
}

export default function AddAnimeModal({ onClose, onSuccess, initialMalId }: AddAnimeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [malInput, setMalInput] = useState(initialMalId ? initialMalId.toString() : '');
  const [importing, setImporting] = useState(false);
  const [malCandidateSelection, setMalCandidateSelection] = useState<{
    malId: number;
    candidates: Array<{
      id: number;
      titre: string;
      media_type?: string | null;
      type_volume?: string | null;
      source_donnees?: string | null;
      statut?: string | null;
      mal_id?: number | null;
    }>;
  } | null>(null);
  const [resolvingCandidate, setResolvingCandidate] = useState(false);
  const { showToast, ToastContainer } = useToast();

  const [formData, setFormData] = useState({
    titre: '',
    titre_en: '',
    type: 'TV' as 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special',
    statut: 'plan_to_watch' as 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch',
    nb_episodes: 0,
    annee: new Date().getFullYear(),
    score: 0,
    synopsis: '',
    image_url: '',
    genres: '',
    mal_id: 0
  });

  const [saving, setSaving] = useState(false);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

  // Pré-remplir le champ MAL si un ID initial est fourni (sans importer automatiquement)
  useEffect(() => {
    if (initialMalId && initialMalId > 0) {
      setMalInput(initialMalId.toString());
      // Ne pas importer automatiquement, laisser l'utilisateur confirmer
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    setShowResults(true);
    try {
      const results = await window.electronAPI.searchAnime(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la recherche',
        type: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: AnimeSearchResult) => {
    // Convertir le format API vers le format de formulaire
    let type: 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special' = 'TV';
    if (result.format) {
      const formatMap: { [key: string]: 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special' } = {
        'TV': 'TV',
        'MOVIE': 'Movie',
        'OVA': 'OVA',
        'ONA': 'ONA',
        'SPECIAL': 'Special',
        'movie': 'Movie'
      };
      type = formatMap[result.format.toUpperCase()] || 'TV';
    }

    setFormData({
      titre: result.titre || '',
      titre_en: result.titre_romaji || result.titre_natif || '',
      type,
      statut: 'plan_to_watch',
      nb_episodes: result.episodes || 0,
      annee: result.annee_debut || new Date().getFullYear(),
      score: 0,
      synopsis: result.description?.replace(/<[^>]*>/g, '') || '',
      image_url: result.couverture || '',
      genres: result.genres || '',
      mal_id: 0
    });
    setShowResults(false);
    setSearchTerm('');
  };

  const handleUploadImage = async () => {
    // Pour l'instant, on stocke juste l'URL (pas de téléchargement local pour les animes)
    // Cela pourrait être implémenté plus tard
    showToast({
      title: 'Fonctionnalité en développement',
      message: 'Pour l\'instant, utilisez l\'URL directement.',
      type: 'info'
    });
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

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));

    if (!imageFile) {
      showToast({
        title: 'Fichier invalide',
        message: 'Veuillez déposer un fichier image valide.',
        type: 'warning'
      });
      return;
    }

    // Pour l'instant, pas de gestion d'upload local pour les animes
    showToast({
      title: 'Fonctionnalité en développement',
      message: 'Pour l\'instant, utilisez l\'URL directement.',
      type: 'info'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titre.trim()) {
      showToast({ title: 'Le titre est obligatoire', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Note: createAnime n'existe pas encore dans l'API, utiliser addAnimeByMalId pour l'instant
      // ou implémenter la création manuelle d'anime
      showToast({ title: 'Création manuelle d\'anime non implémentée', message: 'Veuillez utiliser l\'import depuis MyAnimeList', type: 'warning' });
      setSaving(false);
      return;

      // const result = await window.electronAPI.createAnime(formData);
      // if (result.success) {
      //   showToast({ title: `✅ ${formData.titre} ajouté avec succès !`, type: 'success' });
      //   setTimeout(() => {
      //     onSuccess();
      //     onClose();
      //   }, 1000);
      // } else {
      //   showToast({ title: result.error || 'Erreur lors de la création de l\'anime', type: 'error' });
      // }
    } catch (error) {
      console.error('Erreur:', error);
      showToast({ title: 'Une erreur est survenue lors de la création de l\'anime', type: 'error' });
    } finally {
      setSaving(false);
    }
  };


  const handleTranslateSynopsis = async () => {
    if (!formData.synopsis || formData.synopsis.length < 10) {
      showToast({ title: 'Synopsis trop court pour être traduit', type: 'error' });
      return;
    }

    setTranslating(true);
    try {
      const result = await window.electronAPI.translateText(formData.synopsis, 'fr');
      if (result.success && result.text) {
        setFormData({ ...formData, synopsis: result.text });
        showToast({ title: 'Synopsis traduit avec succès', type: 'success' });
      } else {
        showToast({ title: `Erreur de traduction: ${result.error || 'Clé API manquante'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Erreur traduction synopsis:', error);
      showToast({ title: 'Erreur lors de la traduction', type: 'error' });
    } finally {
      setTranslating(false);
    }
  };

  const runMalImport = async (
    malIdValue: number,
    options: { targetSerieId?: number; forceCreate?: boolean } = {},
    fromSelection = false
  ) => {
    if (fromSelection) {
      setResolvingCandidate(true);
    } else {
      setImporting(true);
    }

    try {
      const result = await window.electronAPI.addAnimeByMalId(malIdValue, options);

      if (result.success) {
        setMalCandidateSelection(null);
        if (result.anime) {
          showToast({ title: `✅ ${result.anime.titre} importé avec succès !`, type: 'success' });
        }
        setMalInput('');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        setMalCandidateSelection({ malId: malIdValue, candidates: result.candidates });
      } else {
        showToast({ title: result.error || 'Erreur lors de l\'import', type: 'error' });
      }
    } catch (error: any) {
      console.error('Erreur import MAL:', error);
      showToast({ title: error?.message || 'Erreur lors de l\'import depuis MyAnimeList', type: 'error' });
    } finally {
      if (fromSelection) {
        setResolvingCandidate(false);
      } else {
        setImporting(false);
      }
    }
  };

  const handleImportFromMAL = async () => {
    if (!malInput.trim()) {
      showToast({ title: 'Veuillez entrer un ID ou une URL MyAnimeList', type: 'error' });
      return;
    }

    const urlMatch = malInput.match(/(?:anime|manga)\/(\d+)/);
    const malId = urlMatch ? parseInt(urlMatch[1], 10) : parseInt(malInput.trim(), 10);

    if (isNaN(malId) || malId <= 0) {
      showToast({ title: 'ID MyAnimeList invalide', type: 'error' });
      return;
    }

    await runMalImport(malId, {}, false);
  };

  return (
    <Fragment>
      <Modal maxWidth="900px">
        <ModalHeader title="Ajouter un anime" onClose={onClose} />

        <div style={{ padding: '24px' }}>
          {/* Recherche */}
          <AddAnimeSearchSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchResults={searchResults}
            searching={searching}
            showResults={showResults}
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
          />

          {/* OU - Séparateur */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-secondary)'
            }}>
              OU
            </span>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
          </div>

          {/* Import depuis MyAnimeList */}
          <AddAnimeMalImportSection
            malInput={malInput}
            setMalInput={setMalInput}
            importing={importing}
            onImport={handleImportFromMAL}
          />

          {/* OU - Séparateur */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-secondary)'
            }}>
              OU
            </span>
            <div style={{
              flex: 1,
              height: '1px',
              background: 'rgba(139, 92, 246, 0.2)'
            }} />
          </div>

          {/* Formulaire */}
          <AddAnimeForm
            formData={formData}
            setFormData={setFormData}
            dragging={dragging}
            translating={translating}
            saving={saving}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onUploadImage={handleUploadImage}
            onTranslateSynopsis={handleTranslateSynopsis}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </Modal>
      {malCandidateSelection && (
        <MalCandidateSelectionModal
          malId={malCandidateSelection.malId}
          candidates={malCandidateSelection.candidates}
          loading={resolvingCandidate}
          onSelect={(candidateId) => {
            void runMalImport(malCandidateSelection.malId, { targetSerieId: candidateId }, true);
          }}
          onCreateNew={() => {
            void runMalImport(malCandidateSelection.malId, { forceCreate: true }, true);
          }}
          onClose={() => {
            if (!resolvingCandidate) {
              setMalCandidateSelection(null);
            }
          }}
        />
      )}
      {ToastContainer}
    </Fragment>
  );
}
