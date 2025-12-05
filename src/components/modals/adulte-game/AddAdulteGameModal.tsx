import { FileJson, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRawgSearch } from '../../../hooks/common/useRawgSearch';
import { useToast } from '../../../hooks/common/useToast';
import '../../../index.css';
import type { AdulteGameJsonData, AdulteGameMoteur, AppError } from '../../../types';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';
import AddAdulteGameJsonModal from './AddAdulteGameJsonModal';
import AddAdulteGameManualForm from './AddAdulteGameManualForm';
import AddRawgSearchSection, { RawgSearchResultItem } from './AddRawgSearchSection';

interface AddAdulteGameModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSearchId?: string;
}

export default function AddAdulteGameModal({ onClose, onSuccess, initialSearchId }: AddAdulteGameModalProps) {
  const [loading, setLoading] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<'f95' | 'rawg' | 'manual'>('f95');

  // ========== ONGLET 1 : Recherche par ID (F95) ==========
  const [searchId, setSearchId] = useState(initialSearchId || '');

  // ========== ONGLET 2 : Recherche RAWG ==========
  const {
    searchTerm: rawgSearchTerm,
    setSearchTerm: setRawgSearchTerm,
    searchResults: rawgSearchResults,
    searching: rawgSearching,
    importingDirectly: rawgImportingDirectly,
    handleSearch: handleRawgSearch,
    handleImportDirectly: handleRawgImportDirectly
  } = useRawgSearch<RawgSearchResultItem>({
    searchApi: async (query, page) => {
      const result = await window.electronAPI.searchRawgGames(query, page || 1);
      return result;
    },
    importDirectlyApi: async (rawgId) => {
      const result = await window.electronAPI.createGameFromRawg(rawgId, true);
      if (result?.success && result?.id) {
        onSuccess();
        onClose();
      }
      return result;
    },
    importSuccessMessage: 'Jeu importé avec succès depuis RAWG',
    importErrorMessage: 'Erreur lors de l\'import depuis RAWG'
  });

  // Handler pour sélectionner un résultat RAWG et créer directement le jeu
  const handleRawgResultSelect = async (result: RawgSearchResultItem) => {
    if (!result.rawgId) {
      showToast({
        title: 'Erreur',
        message: 'ID RAWG manquant',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const createResult = await window.electronAPI.createGameFromRawg(result.rawgId, true);

      if (createResult?.success && createResult?.id) {
        showToast({
          title: 'Jeu ajouté',
          message: `"${result.name}" a été ajouté à votre collection`,
          type: 'success'
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(createResult?.error || 'Impossible de créer le jeu');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du jeu';
      showToast({
        title: 'Erreur',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== Ajout manuel ==========
  const [titre, setTitre] = useState('');
  const [lienF95, setLienF95] = useState('');
  const [version, setVersion] = useState('');
  const [moteur, setMoteur] = useState<AdulteGameMoteur | ''>('');
  const [statutJeu, setStatutJeu] = useState('');
  const [developpeur, setDeveloppeur] = useState('');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [versionTraduite, setVersionTraduite] = useState('');
  const [typeTradFr, setTypeTradFr] = useState('');
  const [traducteur, setTraducteur] = useState('');
  const [lienTraduction, setLienTraduction] = useState('');
  const [traducteursList, setTraducteursList] = useState<string[]>([]);
  const [loadingTraducteurs, setLoadingTraducteurs] = useState(false);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, loading);

  // Charger la liste des traducteurs au montage
  useEffect(() => {
    const loadTraducteurs = async () => {
      try {
        setLoadingTraducteurs(true);
        const result = await window.electronAPI.fetchTraducteurs();
        if (result.success && result.traducteurs) {
          setTraducteursList(result.traducteurs);
        }
      } catch (error) {
        console.error('Erreur chargement traducteurs:', error);
      } finally {
        setLoadingTraducteurs(false);
      }
    };
    loadTraducteurs();
  }, []);

  // ========== UTILITAIRE - Extraire ID depuis URL ou ID simple ==========
  const extractF95Id = (input: string): string | null => {
    const cleaned = input.trim();

    if (/^\d+$/.test(cleaned)) {
      return cleaned;
    }

    const urlMatch = cleaned.match(/\.(\d+)\/?$/);
    if (urlMatch) {
      return urlMatch[1];
    }

    const idMatch = cleaned.match(/threads\/[^/]*\.(\d+)/);
    if (idMatch) {
      return idMatch[1];
    }

    return null;
  };

  // ========== HANDLERS - Recherche F95 ==========
  const handleSearchAuto = async (extractedId: string) => {
    try {
      setLoading(true);
      const result = await window.electronAPI.searchAdulteGameByF95Id(extractedId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Jeu introuvable');
      }

      const data = result.data;

      // Créer directement le jeu
      const tagsArray = Array.isArray(data.tags)
        ? data.tags
        : (data.tags || '').split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);

      const developerValue = data.developer || data.developpeur || null;
      const developpeurValue = developerValue && typeof developerValue === 'string' && developerValue.trim()
        ? developerValue.trim()
        : null;

      const gameDataToSend: {
        titre: string;
        version: string | null;
        statut_jeu: string | null;
        moteur: string | null;
        developpeur: string | null;
        couverture_url: string | null;
        tags: string[];
        f95_thread_id: number | null;
        plateforme: string;
        lien_f95: string | null;
      } = {
        titre: data.name,
        version: data.version || null,
        statut_jeu: data.status || null,
        moteur: data.engine || null,
        developpeur: developpeurValue || null,
        couverture_url: data.image || data.cover || null,
        tags: tagsArray,
        f95_thread_id: data.id ? parseInt(String(data.id)) : null,
        plateforme: 'F95Zone',
        lien_f95: data.thread_url || data.link || null
      };

      await window.electronAPI.createAdulteGameGame(gameDataToSend);

      showToast({
        title: 'Jeu ajouté',
        message: `"${data.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur recherche F95:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de récupérer les données';
      showToast({
        title: 'Erreur de recherche',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      showToast({
        title: 'ID ou URL requis',
        message: 'Veuillez entrer un ID F95Zone ou coller l\'URL complète du thread',
        type: 'warning'
      });
      return;
    }

    const extractedId = extractF95Id(searchId);

    if (!extractedId) {
      showToast({
        title: 'Format invalide',
        message: 'Impossible d\'extraire l\'ID. Utilisez un ID (ex: 112786) ou une URL complète F95Zone',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.searchAdulteGameByF95Id(extractedId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Jeu introuvable');
      }

      const data = result.data;

      // Créer directement le jeu
      const tagsArray = Array.isArray(data.tags)
        ? data.tags
        : (data.tags || '').split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);

      const developerValue = data.developer || data.developpeur || null;
      const developpeurValue = developerValue && typeof developerValue === 'string' && developerValue.trim()
        ? developerValue.trim()
        : null;

      const gameDataToSend: {
        titre: string;
        version: string | null;
        statut_jeu: string | null;
        moteur: string | null;
        developpeur: string | null;
        couverture_url: string | null;
        tags: string[];
        f95_thread_id: number | null;
        plateforme: string;
        lien_f95: string | null;
      } = {
        titre: data.name,
        version: data.version || null,
        statut_jeu: data.status || null,
        moteur: data.engine || null,
        developpeur: developpeurValue || null,
        couverture_url: data.image || data.cover || null,
        tags: tagsArray,
        f95_thread_id: data.id ? parseInt(String(data.id)) : null,
        plateforme: 'F95Zone',
        lien_f95: data.thread_url || data.link || null
      };

      await window.electronAPI.createAdulteGameGame(gameDataToSend);

      showToast({
        title: 'Jeu ajouté',
        message: `"${data.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur recherche F95:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de récupérer les données';
      showToast({
        title: 'Erreur de recherche',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearchId && initialSearchId.trim()) {
      setSearchId(initialSearchId);
      const extractedId = extractF95Id(initialSearchId);
      if (extractedId) {
        handleSearchAuto(extractedId);
      }
    }

  }, []);


  // ========== HANDLER - Création directe depuis JSON ==========
  const handleFillFormFromJson = async (jsonData: AdulteGameJsonData) => {
    if (!jsonData.name) {
      showToast({
        title: 'Erreur',
        message: 'Le nom du jeu est requis dans les données JSON',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);

      // Extraire l'ID F95Zone depuis le lien ou l'ID
      let f95ThreadId: number | null = null;
      let lienF95: string | null = null;
      let plateforme = 'F95Zone';

      if (jsonData.id) {
        f95ThreadId = typeof jsonData.id === 'number' ? jsonData.id : parseInt(String(jsonData.id));
      }

      const link = jsonData.link || jsonData.thread_url || jsonData.url;
      if (link) {
        lienF95 = typeof link === 'string' ? link : null;

        // Extraire l'ID depuis le lien si non fourni
        if (!f95ThreadId && lienF95) {
          const match = lienF95.match(/threads\/(?:[^/]*\.)?(\d+)/);
          if (match) {
            f95ThreadId = parseInt(match[1]);
          }
        }

        // Déterminer la plateforme
        if (lienF95 && lienF95.includes('lewdcorner.com')) {
          plateforme = 'LewdCorner';
        }
      }

      // Mapper le moteur
      const engineOrType = jsonData.type || jsonData.engine;
      let moteurValue: string | null = null;
      if (engineOrType && typeof engineOrType === 'string') {
        const engineValue = engineOrType.trim();
        const validEngines: AdulteGameMoteur[] = ['RenPy', 'Unity', 'RPGM', 'Unreal', 'HTML', 'Flash', 'QSP', 'Autre'];
        if (validEngines.includes(engineValue as AdulteGameMoteur)) {
          moteurValue = engineValue;
        }
      }

      // Mapper le statut
      let statutValue: string | null = null;
      if (jsonData.status) {
        const statusValue = jsonData.status.trim().toUpperCase();
        if (['EN COURS', 'TERMINÉ', 'ABANDONNÉ'].includes(statusValue)) {
          statutValue = statusValue;
        } else {
          const statusMap: Record<string, string> = {
            'EN COURS': 'EN COURS',
            'TERMINE': 'TERMINÉ',
            'TERMINÉ': 'TERMINÉ',
            'ABANDONNE': 'ABANDONNÉ',
            'ABANDONNÉ': 'ABANDONNÉ',
            'IN PROGRESS': 'EN COURS',
            'COMPLETED': 'TERMINÉ',
            'ABANDONED': 'ABANDONNÉ'
          };
          if (statusMap[statusValue]) {
            statutValue = statusMap[statusValue];
          }
        }
      }

      // Mapper le développeur
      const devValue = jsonData.developer || jsonData.developpeur || jsonData.dev;
      const developpeurValue = devValue && typeof devValue === 'string' ? devValue.trim() : null;

      // Mapper l'URL de couverture
      const coverValue = jsonData.image || jsonData.cover || jsonData.poster || jsonData.thumbnail;
      const couvertureUrlValue = coverValue && typeof coverValue === 'string' ? coverValue.trim() : null;

      // Mapper les tags
      let tagsArray: string[] = [];
      if (jsonData.tags) {
        if (Array.isArray(jsonData.tags)) {
          tagsArray = jsonData.tags.map((tag: string) => tag.trim()).filter((tag: string) => tag);
        } else if (typeof jsonData.tags === 'string') {
          tagsArray = jsonData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
        }
      }

      // Créer le jeu
      await window.electronAPI.createAdulteGameGame({
        titre: jsonData.name,
        version: jsonData.version || null,
        statut_jeu: statutValue,
        moteur: moteurValue,
        developpeur: developpeurValue,
        couverture_url: couvertureUrlValue,
        tags: tagsArray,
        f95_thread_id: f95ThreadId,
        plateforme: plateforme,
        lien_f95: lienF95
      });

      showToast({
        title: 'Jeu ajouté',
        message: `"${jsonData.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      const appError = error as AppError;
      console.error('Erreur création jeu depuis JSON:', appError);
      showToast({
        title: 'Erreur',
        message: appError.message || 'Impossible de créer le jeu depuis les données JSON',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLERS - Ajout manuel ==========

  const handleManualAdd = async (e: FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      showToast({
        title: 'Titre requis',
        message: 'Le titre est obligatoire',
        type: 'warning'
      });
      return;
    }

    if (!version.trim()) {
      showToast({
        title: 'Version requise',
        message: 'La version est obligatoire',
        type: 'warning'
      });
      return;
    }

    if (!moteur) {
      showToast({
        title: 'Moteur requis',
        message: 'Le moteur est obligatoire',
        type: 'warning'
      });
      return;
    }

    try {
      setLoading(true);

      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await window.electronAPI.createAdulteGameGame({
        titre,
        lien_f95: lienF95 || null,
        version,
        moteur,
        statut_jeu: statutJeu || null,
        developpeur: developpeur || null,
        couverture_url: couvertureUrl || null,
        tags: tagsArray,
        version_traduite: versionTraduite || null,
        type_trad_fr: typeTradFr || null,
        traducteur: traducteur || null,
        lien_traduction: lienTraduction || null
      });

      showToast({
        title: 'Jeu ajouté',
        message: `"${titre}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      const appError = error as AppError;
      console.error('Erreur ajout manuel:', appError);
      showToast({
        title: 'Erreur',
        message: appError.message || 'Impossible d\'ajouter le jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <Modal maxWidth="800px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClickOverlay={onClose}>
        {/* Header fixe */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            ➕ Ajouter un jeu adulte
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Onglets */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('f95')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'f95' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'f95' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'f95' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🌐 F95Zone
          </button>
          <button
            onClick={() => setActiveTab('rawg')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'rawg' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'rawg' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'rawg' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🎮 RAWG
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'manual' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✏️ Manuel
          </button>
        </div>

        {/* Section Recherche F95Zone */}
        {activeTab === 'f95' && (
          <div style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="ID (ex: 12345) ou URL complète (ex: https://f95zone.to/threads/...)"
                  className="input"
                  style={{ paddingLeft: '48px', width: '100%' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, height: '40px' }}
              >
                <Search size={18} />
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
              <button
                onClick={() => setShowJsonModal(true)}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                  height: '40px'
                }}
              >
                <FileJson size={18} />
                Ajouter JSON
              </button>
            </div>

          </div>
        )}

        {/* Section Recherche RAWG */}
        {activeTab === 'rawg' && (
          <div style={{
            padding: '24px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}>
            <AddRawgSearchSection
              searchTerm={rawgSearchTerm}
              setSearchTerm={setRawgSearchTerm}
              searchResults={rawgSearchResults}
              searching={rawgSearching}
              onSearch={handleRawgSearch}
              onSelectResult={handleRawgResultSelect}
              onImportDirectly={handleRawgImportDirectly}
              importingDirectly={rawgImportingDirectly}
            />
          </div>
        )}

        {/* Contenu scrollable - Formulaire manuel */}
        {activeTab === 'manual' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}>
            <AddAdulteGameManualForm
              titre={titre}
              setTitre={setTitre}
              lienF95={lienF95}
              setLienF95={setLienF95}
              version={version}
              setVersion={setVersion}
              moteur={moteur}
              setMoteur={setMoteur}
              statutJeu={statutJeu}
              setStatutJeu={setStatutJeu}
              developpeur={developpeur}
              setDeveloppeur={setDeveloppeur}
              couvertureUrl={couvertureUrl}
              setCouvertureUrl={setCouvertureUrl}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              versionTraduite={versionTraduite}
              setVersionTraduite={setVersionTraduite}
              typeTradFr={typeTradFr}
              setTypeTradFr={setTypeTradFr}
              traducteur={traducteur}
              setTraducteur={setTraducteur}
              lienTraduction={lienTraduction}
              setLienTraduction={setLienTraduction}
              traducteursList={traducteursList}
              loadingTraducteurs={loadingTraducteurs}
              loading={loading}
              onSubmit={handleManualAdd}
            />
          </div>
        )}
      </Modal>

      {/* Modale JSON */}
      {showJsonModal && (
        <AddAdulteGameJsonModal
          onClose={() => setShowJsonModal(false)}
          onFillForm={handleFillFormFromJson}
        />
      )}
    </>
  );
}
