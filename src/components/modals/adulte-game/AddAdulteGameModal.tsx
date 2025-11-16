import { FileJson, Plus, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import '../../../index.css';
import type { AdulteGameMoteur } from '../../../types';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';
import AddAdulteGameJsonTab from './AddAdulteGameJsonTab';
import AddAdulteGameManualForm from './AddAdulteGameManualForm';
import AddAdulteGameSearchTab from './AddAdulteGameSearchTab';

interface AddAdulteGameModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSearchId?: string;
}

type TabMode = 'search' | 'json' | 'manual';

export default function AddAdulteGameModal({ onClose, onSuccess, initialSearchId }: AddAdulteGameModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('search');
  const [loading, setLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // ========== ONGLET 1 : Recherche par ID (F95) ==========
  const [searchId, setSearchId] = useState(initialSearchId || '');
  const [searchData, setSearchData] = useState<any>(null);
  const searchDataRef = useRef<any>(null); // Ref pour stocker les données et éviter les problèmes de state

  // ========== ONGLET 2 : Insertion JSON (LewdCorner) ==========
  const [jsonData, setJsonData] = useState('');
  const [jsonError, setJsonError] = useState('');

  // ========== ONGLET 3 : Ajout manuel ==========
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
  const [dragging, setDragging] = useState(false);

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, loading);

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
      setSearchData(result.data);
      searchDataRef.current = result.data; // Stocker aussi dans le ref
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Erreur recherche F95:', error);
      showToast({
        title: 'Erreur de recherche',
        message: error.message || 'Impossible de récupérer les données',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const gameDataToSend: any = {
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
    } catch (error: any) {
      console.error('Erreur ajout jeu:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible d\'ajouter le jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLERS - Import JSON ==========
  const handleImportJson = async () => {
    try {
      const data = JSON.parse(jsonData);

      if (!data.name || !data.id) {
        setJsonError('Données invalides : "name" et "id" sont requis');
        return;
      }

      setLoading(true);
      setJsonError('');

      const tagsArray = Array.isArray(data.tags)
        ? data.tags
        : (data.tags || '').split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);

      await window.electronAPI.importAdulteGameFromJson({
        id: data.id,
        domain: data.domain || 'LewdCorner',
        name: data.name,
        version: data.version || null,
        status: data.status || null,
        tags: tagsArray,
        type: data.type || null,
        link: data.link || null,
        image: data.image || null
      });

      showToast({
        title: 'Jeu importé',
        message: `"${data.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur import JSON:', err);
      setJsonError('JSON invalide : ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ========== HANDLERS - Ajout manuel ==========
  const handleChooseCoverImage = async () => {
    try {
      const result = await window.electronAPI.selectAdulteGameCoverImage();
      if (result.success && result.path) {
        setCouvertureUrl(result.path);
        showToast({
          title: 'Image sélectionnée',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la sélection de l\'image',
        type: 'error'
      });
    }
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
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      const filePath = (imageFile as any).path;
      setCouvertureUrl(filePath);
      showToast({
        title: 'Image ajoutée',
        type: 'success'
      });
    }
  };

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
        traducteur: traducteur || null
      });

      showToast({
        title: 'Jeu ajouté',
        message: `"${titre}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur ajout manuel:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible d\'ajouter le jeu',
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
          borderBottom: '2px solid var(--border)',
          background: 'var(--surface-light)',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'search' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'search' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'search' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'search' ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            <Search size={18} />
            Recherche par ID (F95)
          </button>

          <button
            onClick={() => setActiveTab('json')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'json' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'json' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'json' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'json' ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            <FileJson size={18} />
            Insertion JSON (LewdCorner)
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'manual' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'manual' ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            Ajout manuel
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {activeTab === 'search' && (
            <AddAdulteGameSearchTab
              searchId={searchId}
              setSearchId={setSearchId}
              searchData={searchData}
              loading={loading}
              onSearch={handleSearch}
              onAddFromSearch={handleAddFromSearch}
            />
          )}

          {activeTab === 'json' && (
            <AddAdulteGameJsonTab
              jsonData={jsonData}
              setJsonData={setJsonData}
              setJsonError={setJsonError}
              jsonError={jsonError}
              loading={loading}
              onImport={handleImportJson}
            />
          )}

          {activeTab === 'manual' && (
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
              dragging={dragging}
              loading={loading}
              onChooseCoverImage={handleChooseCoverImage}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onSubmit={handleManualAdd}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
