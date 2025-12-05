import { Fragment, useEffect, useState } from 'react';
import { MalSearchResult } from '../../../hooks/common/useMalSearch';
import { useToast } from '../../../hooks/common/useToast';
import AddMalSearchSection from './AddMalSearchSection';
import CoverImageUpload from './CoverImageUpload';
import MalCandidateSelectionModal from './MalCandidateSelectionModal';
import Modal from './Modal';
import ModalHeader from './ModalHeader';
import { useModalEscape } from './useModalEscape';

/**
 * Configuration pour AddMalItemModal
 */
export interface AddMalItemModalConfig<TResult extends MalSearchResult> {
  /** Titre de la modale */
  title: string;
  /** Type de média ('anime' ou 'manga') */
  mediaType: 'anime' | 'manga';
  /** Fonction pour rechercher */
  searchApi: (query: string) => Promise<TResult[]>;
  /** Fonction pour importer directement par ID MAL */
  importDirectlyApi: (malId: number, options?: any) => Promise<{
    success: boolean;
    requiresSelection?: boolean;
    candidates?: Array<any>;
    error?: string;
    [key: string]: any;
  }>;
  /** Fonction pour créer l'item */
  createApi: (data: Record<string, any>) => Promise<{ success: boolean; id?: number; error?: string;[key: string]: any }>;
  /** Fonction pour enrichir l'item après création */
  enrichApi?: (itemId: number, force?: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;
  /** Message de succès pour la création */
  createSuccessMessage?: string;
  /** Message de succès pour l'enrichissement */
  enrichSuccessMessage?: string;
  /** ID MAL initial (pour pré-remplir la recherche) */
  initialMalId?: number | string;
  /** Placeholder pour la recherche */
  searchPlaceholder?: string;
}

interface AddMalItemModalProps<TResult extends MalSearchResult> {
  config: AddMalItemModalConfig<TResult>;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Composant générique pour ajouter un item Anime ou Manga depuis MAL/Jikan
 * Utilisé par AddAnimeModal et AddMangaModal
 */
export default function AddMalItemModal<TResult extends MalSearchResult>({
  config,
  onClose,
  onSuccess
}: AddMalItemModalProps<TResult>) {
  const {
    title,
    mediaType,
    searchApi,
    importDirectlyApi,
    createApi,
    enrichApi,
    createSuccessMessage = 'Élément ajouté avec succès',
    enrichSuccessMessage = 'Enrichissement terminé',
    initialMalId,
    searchPlaceholder
  } = config;

  const { showToast, ToastContainer } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [importing, setImporting] = useState(false);
  const [malCandidateSelection, setMalCandidateSelection] = useState<{
    malId: number;
    candidates: Array<any>;
  } | null>(null);
  const [resolvingCandidate, setResolvingCandidate] = useState(false);

  // Champs communs du formulaire
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    annee: new Date().getFullYear(),
    genres: '',
    mal_id: '',
    image_url: ''
  });

  useModalEscape(onClose, saving);

  // Détecter si la recherche contient un ID MAL ou AniList
  const detectIdFromSearch = (input: string): { malId: number | null; anilistId: number | null } => {
    if (!input) return { malId: null, anilistId: null };
    const trimmed = input.trim();

    // Détecter URL AniList (anime ou manga)
    const anilistAnimeUrlMatch = trimmed.match(/anilist\.co\/anime\/(\d+)/i);
    if (anilistAnimeUrlMatch) {
      return { malId: null, anilistId: parseInt(anilistAnimeUrlMatch[1], 10) };
    }
    const anilistMangaUrlMatch = trimmed.match(/anilist\.co\/manga\/(\d+)/i);
    if (anilistMangaUrlMatch) {
      return { malId: null, anilistId: parseInt(anilistMangaUrlMatch[1], 10) };
    }

    // Détecter URL MAL
    const malUrlMatch = trimmed.match(/myanimelist\.net\/(?:anime|manga)\/(\d+)/i);
    if (malUrlMatch) {
      return { malId: parseInt(malUrlMatch[1], 10), anilistId: null };
    }

    // Si c'est juste un nombre, on assume que c'est un ID MAL (plus commun)
    if (/^\d+$/.test(trimmed)) {
      return { malId: parseInt(trimmed, 10), anilistId: null };
    }

    return { malId: null, anilistId: null };
  };

  // Initialiser la recherche si initialMalId est fourni
  useEffect(() => {
    if (initialMalId) {
      const searchValue = initialMalId.toString();
      setSearchTerm(searchValue);

      // Détecter si c'est un ID direct (MAL ou AniList)
      const detected = detectIdFromSearch(searchValue);
      if (detected.malId || detected.anilistId) {
        // Si c'est un ID, essayer l'import direct
        if (detected.malId) {
          handleImportFromMalResult(detected.malId);
        } else if (detected.anilistId) {
          handleImportFromAnilistResult(detected.anilistId);
        }
        return;
      }

      // Sinon, faire une recherche normale
      const performAutoSearch = async () => {
        setSearching(true);
        setShowResults(true);
        try {
          const results = await searchApi(searchValue);
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
      performAutoSearch();
    }
  }, [initialMalId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Détecter si c'est un ID direct (MAL ou AniList)
    const detected = detectIdFromSearch(searchTerm);
    if (detected.malId) {
      await handleImportFromMalResult(detected.malId);
      return;
    } else if (detected.anilistId) {
      await handleImportFromAnilistResult(detected.anilistId);
      return;
    }

    // Sinon, faire une recherche normale
    setSearching(true);
    setShowResults(true);
    try {
      const results = await searchApi(searchTerm);
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

  const handleSelectResult = (result: TResult) => {
    const malId = result.source === 'MyAnimeList' ? parseInt(result.id, 10) : 0;

    setFormData({
      titre: result.titre || '',
      description: result.description?.replace(/<[^>]*>/g, '') || '',
      annee: (result as any).annee_debut || new Date().getFullYear(),
      genres: (result as any).genres || '',
      mal_id: malId.toString(),
      image_url: result.couverture || ''
    });
    setShowResults(false);
    setSearchTerm('');
  };

  const handleImportFromAnilistResult = async (anilistId: number) => {
    if (!anilistId || anilistId <= 0) {
      showToast({ title: 'ID AniList invalide', type: 'error' });
      return;
    }

    if (mediaType === 'manga' && typeof window.electronAPI.addMangaByAnilistId === 'function') {
      await runMalImport(anilistId, {}, false, true); // true = isAnilist
    } else if (mediaType === 'anime' && typeof window.electronAPI.addAnimeByAnilistId === 'function') {
      await runMalImport(anilistId, {}, false, true); // true = isAnilist
    } else {
      showToast({ title: 'Import AniList non disponible pour ce type', type: 'error' });
      return;
    }
  };

  const handleImportFromMalResult = async (malId: number) => {
    if (!malId || malId <= 0) {
      showToast({ title: 'ID MyAnimeList invalide', type: 'error' });
      return;
    }

    await runMalImport(malId, {}, false, false); // false = isAnilist
  };

  const runMalImport = async (
    idValue: number,
    options: { targetSerieId?: number; forceCreate?: boolean } = {},
    fromSelection = false,
    isAnilist = false
  ) => {
    if (fromSelection) {
      setResolvingCandidate(true);
    } else {
      setImporting(true);
    }

    try {
      let result;
      if (isAnilist && mediaType === 'manga' && typeof window.electronAPI.addMangaByAnilistId === 'function') {
        result = await window.electronAPI.addMangaByAnilistId(idValue, options);
      } else if (isAnilist && mediaType === 'anime' && typeof window.electronAPI.addAnimeByAnilistId === 'function') {
        result = await window.electronAPI.addAnimeByAnilistId(idValue, options);
      } else {
        result = await importDirectlyApi(idValue, options);
      }

      if (result.success) {
        setMalCandidateSelection(null);
        if ('anime' in result && result.anime) {
          showToast({
            title: `✅ ${result.anime.titre} importé avec succès !`,
            type: 'success'
          });
        } else if ('serie' in result && result.serie) {
          showToast({
            title: `✅ ${result.serie.titre} importé avec succès !`,
            type: 'success'
          });
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else if (result.requiresSelection && Array.isArray(result.candidates)) {
        setMalCandidateSelection({ malId: idValue, candidates: result.candidates });
      } else {
        showToast({ title: result.error || 'Erreur lors de l\'import', type: 'error' });
      }
    } catch (error: any) {
      console.error('Erreur import MAL:', error);
      showToast({
        title: error?.message || 'Erreur lors de l\'import depuis MyAnimeList',
        type: 'error'
      });
    } finally {
      if (fromSelection) {
        setResolvingCandidate(false);
      } else {
        setImporting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titre.trim()) {
      showToast({ title: 'Le titre est obligatoire', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Préparer les données selon le type
      const submitData: Record<string, any> = {
        titre: formData.titre.trim(),
        description: formData.description.trim() || null,
        annee: formData.annee || new Date().getFullYear(),
        genres: formData.genres.trim() || null,
        mal_id: formData.mal_id ? parseInt(formData.mal_id, 10) : null
      };

      // Ajouter le champ image selon le type
      if (mediaType === 'anime') {
        submitData.image_url = formData.image_url.trim() || null;
        submitData.synopsis = submitData.description;
        delete submitData.description;
      } else {
        submitData.couvertureUrl = formData.image_url.trim() || null;
      }

      const result = await createApi(submitData);

      // createSerie retourne directement l'ID, createAnime retourne { success, id }
      const itemId = result.id || (typeof result === 'number' ? result : null);
      const success = result.success !== false && itemId !== null;

      if (success) {
        showToast({
          title: createSuccessMessage,
          type: 'success'
        });

        // Si un mal_id a été fourni, lancer l'enrichissement en arrière-plan
        if (submitData.mal_id && submitData.mal_id > 0 && enrichApi && itemId) {
          showToast({
            title: 'Enrichissement en cours...',
            message: 'Les données sont mises à jour en arrière-plan',
            type: 'info',
            duration: 3000
          });

          // Enrichissement en arrière-plan
          enrichApi(itemId, false)
            .then((enrichResult) => {
              if (enrichResult.success) {
                showToast({
                  title: enrichSuccessMessage,
                  message: enrichResult.message || 'Toutes les données ont été mises à jour',
                  type: 'success',
                  duration: 3000
                });
              } else {
                console.warn('Enrichissement partiel:', enrichResult.error);
              }
            })
            .catch((err) => {
              console.error('Erreur enrichissement:', err);
              // Ne pas afficher d'erreur, l'enrichissement est optionnel
            });
        }

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        showToast({
          title: (result as any).error || 'Erreur lors de l\'ajout',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Erreur ajout:', error);
      showToast({
        title: error?.message || `Erreur lors de l'ajout de ${title.toLowerCase()}`,
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Fragment>
      <Modal maxWidth="900px">
        <ModalHeader title={title} onClose={onClose} />

        <div style={{ padding: '24px' }}>
          {/* Recherche */}
          <AddMalSearchSection<TResult>
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchResults={searchResults}
            searching={searching}
            showResults={showResults}
            importing={importing}
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
            onImportFromMal={handleImportFromMalResult}
            mediaType={mediaType}
            searchPlaceholder={searchPlaceholder}
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
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {/* Colonne image */}
              <CoverImageUpload
                imageUrl={formData.image_url}
                onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                mediaType={mediaType}
                itemTitle={formData.titre || title}
              />

              {/* Colonne formulaire */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Titre */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Titre <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.titre}
                      onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                      className="input"
                      placeholder={mediaType === 'anime' ? 'Ex: Attack on Titan' : 'Ex: One Piece'}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={4}
                      placeholder="Synopsis..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  {/* Année et Genres */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Année
                      </label>
                      <input
                        type="number"
                        value={formData.annee || ''}
                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) || new Date().getFullYear() })}
                        className="input"
                        min="1900"
                        max={new Date().getFullYear() + 2}
                        placeholder={new Date().getFullYear().toString()}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Genres
                      </label>
                      <input
                        type="text"
                        value={formData.genres}
                        onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                        className="input"
                        placeholder="Action, Aventure, Fantasy"
                      />
                    </div>
                  </div>

                  {/* MAL ID */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      ID MyAnimeList (optionnel, recommandé pour enrichissement)
                    </label>
                    <input
                      type="number"
                      value={formData.mal_id}
                      onChange={(e) => setFormData({ ...formData, mal_id: e.target.value })}
                      className="input"
                      placeholder="Ex: 16498"
                      min="0"
                    />
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      fontStyle: 'italic'
                    }}>
                      Si un ID MAL est fourni, l'enrichissement automatique sera lancé après la création
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !formData.titre.trim()}
              >
                {saving ? 'Ajout en cours...' : 'Ajouter'}
              </button>
            </div>
          </form>
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
