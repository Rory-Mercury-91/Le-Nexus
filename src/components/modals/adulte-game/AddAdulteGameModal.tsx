import { FileJson, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import '../../../index.css';
import type { AdulteGameJsonData, AdulteGameMoteur, AppError } from '../../../types';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';
import AddAdulteGameJsonModal from './AddAdulteGameJsonModal';
import AddAdulteGameManualForm from './AddAdulteGameManualForm';

interface AdulteGameSearchData {
  name: string;
  version?: string;
  status?: string;
  engine?: string;
  developer?: string;
  developpeur?: string;
  image?: string;
  cover?: string;
  tags?: string[];
  id?: string | number;
  thread_url?: string;
  link?: string;
  [key: string]: unknown;
}

interface AddAdulteGameModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSearchId?: string;
}

export default function AddAdulteGameModal({ onClose, onSuccess, initialSearchId }: AddAdulteGameModalProps) {
  const [loading, setLoading] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // ========== ONGLET 1 : Recherche par ID (F95) ==========
  const [searchId, setSearchId] = useState(initialSearchId || '');
  const [searchData, setSearchData] = useState<AdulteGameSearchData | null>(null);
  const searchDataRef = useRef<AdulteGameSearchData | null>(null); // Ref pour stocker les données et éviter les problèmes de state

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

      if (!result.success) {
        throw new Error(result.error || 'Jeu introuvable');
      }

      console.log('📥 Données reçues du handler de recherche (auto):', result.data);
      setSearchData(result.data || null);
      searchDataRef.current = result.data || null; // Stocker aussi dans le ref
    } catch (error) {
      console.error('Erreur recherche F95:', error);
      setSearchData(null);
      searchDataRef.current = null;
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

      if (!result.success) {
        throw new Error(result.error || 'Jeu introuvable');
      }

      if (result.data) {
        console.log('📥 Données reçues du handler de recherche:', result.data);
        console.log('📥 developer dans result.data:', result.data.developer);
        console.log('📥 Clés dans result.data:', Object.keys(result.data));
        setSearchData(result.data);
        searchDataRef.current = result.data; // Stocker aussi dans le ref
        console.log('📥 searchDataRef.current après assignation:', searchDataRef.current);
        console.log('📥 developer dans searchDataRef.current:', searchDataRef.current?.developer);
        showToast({
          title: 'Jeu trouvé',
          message: `Données récupérées pour "${result.data.name}"`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur recherche F95:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de récupérer les données';
      showToast({
        title: 'Erreur de recherche',
        message: errorMessage,
        type: 'error'
      });
      setSearchData(null);
      searchDataRef.current = null;
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

  const handleAddFromSearch = async (e: FormEvent) => {
    e.preventDefault();

    if (!searchData) {
      showToast({
        title: 'Recherche requise',
        message: 'Veuillez d\'abord rechercher un jeu',
        type: 'warning'
      });
      return;
    }

    try {
      setLoading(true);

      // RE-RECHERCHER les données pour garantir qu'on a les données complètes avec developer
      const extractedId = extractF95Id(searchId || searchData.id?.toString() || '');
      if (!extractedId) {
        throw new Error('Impossible d\'extraire l\'ID F95Zone');
      }

      // Re-rechercher les données directement depuis le handler
      const freshResult = await window.electronAPI.searchAdulteGameByF95Id(extractedId);
      if (!freshResult.success || !freshResult.data) {
        throw new Error(freshResult.error || 'Impossible de récupérer les données');
      }

      // Utiliser les données fraîchement récupérées qui contiennent bien developer
      const data = freshResult.data;

      const tagsArray = Array.isArray(data.tags)
        ? data.tags
        : (data.tags || '').split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);

      // Extraire le développeur directement depuis les données fraîches
      const developerValue = data.developer || data.developpeur || null;
      const developpeurValue = developerValue && typeof developerValue === 'string' && developerValue.trim()
        ? developerValue.trim()
        : null;

      // Créer l'objet de données en utilisant les données fraîches
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
        message: `"${searchData.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      const appError = error as AppError;
      console.error('Erreur ajout jeu:', appError);
      showToast({
        title: 'Erreur',
        message: appError.message || 'Impossible d\'ajouter le jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLER - Pré-remplissage depuis JSON ==========
  const handleFillFormFromJson = (jsonData: AdulteGameJsonData) => {
    // Mapper les données JSON vers le formulaire
    // Titre
    if (jsonData.name) setTitre(jsonData.name);

    // Lien F95Zone
    if (jsonData.link || jsonData.thread_url || jsonData.url) {
      setLienF95(jsonData.link || jsonData.thread_url || jsonData.url || '');
    }

    // Version
    if (jsonData.version) setVersion(jsonData.version);

    // Moteur (type ou engine)
    const engineOrType = jsonData.type || jsonData.engine;
    if (engineOrType && typeof engineOrType === 'string') {
      const engineValue = engineOrType.trim();
      const validEngines: AdulteGameMoteur[] = ['RenPy', 'Unity', 'RPGM', 'Unreal', 'HTML', 'Flash', 'QSP', 'Autre'];
      if (validEngines.includes(engineValue as AdulteGameMoteur)) {
        setMoteur(engineValue as AdulteGameMoteur);
      }
    }

    // Statut du jeu
    if (jsonData.status) {
      const statusValue = jsonData.status.trim().toUpperCase();
      if (['EN COURS', 'TERMINÉ', 'ABANDONNÉ'].includes(statusValue)) {
        setStatutJeu(statusValue);
      } else {
        // Essayer de mapper les variations
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
          setStatutJeu(statusMap[statusValue]);
        }
      }
    }

    // Développeur
    if (jsonData.developer || jsonData.developpeur || jsonData.dev) {
      const devValue = jsonData.developer || jsonData.developpeur || jsonData.dev;
      if (typeof devValue === 'string') {
        setDeveloppeur(devValue.trim());
      }
    }

    // URL de couverture
    if (jsonData.image || jsonData.cover || jsonData.poster || jsonData.thumbnail) {
      const coverValue = jsonData.image || jsonData.cover || jsonData.poster || jsonData.thumbnail;
      if (typeof coverValue === 'string') {
        setCouvertureUrl(coverValue.trim());
      }
    }

    // Tags (peut être une chaîne ou un tableau)
    if (jsonData.tags) {
      if (Array.isArray(jsonData.tags)) {
        // Si c'est un tableau, joindre avec des virgules
        setTagsInput(jsonData.tags.map((tag: string) => tag.trim()).join(', '));
      } else if (typeof jsonData.tags === 'string') {
        // Si c'est déjà une chaîne, utiliser directement
        setTagsInput(jsonData.tags.trim());
      }
    }

    showToast({
      title: 'Formulaire pré-rempli',
      message: 'Les champs ont été remplis avec les données JSON. Vérifiez et ajustez si nécessaire.',
      type: 'success'
    });
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

        {/* Section Recherche */}
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

          {/* Résultat de recherche */}
          {searchData && (
            <div style={{
              padding: '16px',
              background: 'var(--surface-light)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {searchData.cover && (
                  <img
                    src={searchData.cover}
                    alt={searchData.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
                    {searchData.name}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    {searchData.version && <span>Version: <strong>{searchData.version}</strong></span>}
                    {searchData.status && <span>Statut: <strong>{searchData.status}</strong></span>}
                    {searchData.engine && <span>Moteur: <strong>{searchData.engine}</strong></span>}
                  </div>
                  <form onSubmit={handleAddFromSearch} style={{ display: 'inline-block' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {loading ? 'Ajout en cours...' : 'Ajouter ce jeu'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenu scrollable - Formulaire manuel */}
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
