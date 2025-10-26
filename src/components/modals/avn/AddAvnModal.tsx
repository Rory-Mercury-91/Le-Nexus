import { Plus, Search, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import '../../../index.css';
import type { AvnMoteur, AvnStatutJeu, AvnStatutPerso, AvnStatutTraduction, AvnTypeTraduction } from '../../../types';

interface AddAvnModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type TabMode = 'search' | 'manual';
type PlatformType = 'f95' | 'lewdcorner';

export default function AddAvnModal({ onClose, onSuccess }: AddAvnModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('search');
  const [loading, setLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // Onglet Recherche par ID
  const [platform, setPlatform] = useState<PlatformType>('f95');
  const [searchId, setSearchId] = useState('');
  const [searchData, setSearchData] = useState<any>(null);

  // Onglet Manuel
  const [titre, setTitre] = useState('');
  const [version, setVersion] = useState('');
  const [statutJeu, setStatutJeu] = useState<AvnStatutJeu | ''>('');
  const [moteur, setMoteur] = useState<AvnMoteur | ''>('');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [statutPerso, setStatutPerso] = useState<AvnStatutPerso | ''>('');
  const [lienF95] = useState('');
  const [lienTraduction] = useState('');
  const [lienJeu] = useState('');
  const [cheminExecutable] = useState('');
  const [notesPrivees] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  // Champs de traduction
  const [versionTraduction, setVersionTraduction] = useState('');
  const [statutTraduction, setStatutTraduction] = useState<AvnStatutTraduction | ''>('');
  const [typeTraduction, setTypeTraduction] = useState<AvnTypeTraduction | ''>('');

  const handleSearch = async () => {
    if (!searchId.trim()) {
      showToast({
        title: 'ID requis',
        message: `Veuillez entrer un ID ${platform === 'f95' ? 'F95Zone' : 'LewdCorner'}`,
        type: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      
      const result = platform === 'f95'
        ? await window.electronAPI.searchAvnByF95Id(searchId)
        : await window.electronAPI.searchAvnByLewdCornerId(searchId);
      
      if (!result.success) {
        throw new Error(result.error || 'Jeu introuvable');
      }

      setSearchData(result.data);
      showToast({
        title: 'Jeu trouvé',
        message: `Données récupérées pour "${result.data.name}"`,
        type: 'success'
      });
    } catch (error: any) {
      console.error(`Erreur recherche ${platform === 'f95' ? 'F95' : 'LewdCorner'}:`, error);
      showToast({
        title: 'Erreur de recherche',
        message: error.message || 'Impossible de récupérer les données',
        type: 'error'
      });
      setSearchData(null);
    } finally {
      setLoading(false);
    }
  };

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

      // Les tags sont déjà un tableau depuis l'API
      const tagsArray = Array.isArray(searchData.tags) 
        ? searchData.tags.filter((t: string) => t && t.trim().length > 0)
        : (typeof searchData.tags === 'string' 
            ? searchData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
            : []);

      await window.electronAPI.createAvnGame({
        f95_thread_id: platform === 'f95' ? (searchData.id || Number(searchId)) : null,
        titre: searchData.name,
        version: searchData.version || null,
        statut_jeu: mapF95Status(searchData.status),
        moteur: mapF95Engine(searchData.engine),
        couverture_url: searchData.image || null,
        tags: tagsArray,
        lien_f95: platform === 'f95' ? (searchData.thread_url || `https://f95zone.to/threads/${searchId}`) : searchData.thread_url,
        statut_perso: 'À jouer'
      });

      showToast({
        title: 'Jeu ajouté',
        message: `"${searchData.name}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(`Erreur ajout jeu ${platform === 'f95' ? 'F95' : 'LewdCorner'}:`, error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de l\'ajout du jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await window.electronAPI.createAvnGame({
        titre,
        version: version || null,
        statut_jeu: statutJeu || null,
        moteur: moteur || null,
        couverture_url: couvertureUrl || null,
        tags: tagsArray,
        statut_perso: statutPerso || null,
        lien_f95: lienF95 || null,
        lien_traduction: lienTraduction || null,
        lien_jeu: lienJeu || null,
        chemin_executable: cheminExecutable || null,
        notes_privees: notesPrivees || null,
        version_traduction: versionTraduction || null,
        statut_traduction: statutTraduction || null,
        type_traduction: typeTraduction || null
      });

      showToast({
        title: 'Jeu ajouté',
        message: `"${titre}" a été ajouté à votre collection`,
        type: 'success'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur ajout manuel:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de l\'ajout du jeu',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const mapF95Status = (status: string): AvnStatutJeu => {
    if (status?.toLowerCase().includes('completed')) return 'TERMINÉ';
    if (status?.toLowerCase().includes('abandoned')) return 'ABANDONNÉ';
    return 'EN COURS';
  };

  const mapF95Engine = (engine: string): AvnMoteur | null => {
    const eng = engine?.toLowerCase();
    if (eng?.includes('renpy')) return 'RenPy';
    if (eng?.includes('unity')) return 'Unity';
    if (eng?.includes('rpgm')) return 'RPGM';
    if (eng?.includes('unreal')) return 'Unreal';
    if (eng?.includes('html')) return 'HTML';
    if (eng?.includes('flash')) return 'Flash';
    if (eng?.includes('qsp')) return 'QSP';
    return 'Autre';
  };

  return (
    <>
      <ToastContainer />
      <div
        style={{
          position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            🎮 Ajouter un jeu AVN
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              padding: '16px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'search' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'search' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'search' ? '700' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Search size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Recherche par ID
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '16px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'manual' ? '700' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Ajout manuel
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {activeTab === 'search' ? (
            /* Onglet Recherche par ID */
            <form onSubmit={handleAddFromSearch}>
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="platform" className="label">
                  Plateforme <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value as PlatformType);
                    setSearchId('');
                    setSearchData(null);
                  }}
                  className="input"
                  disabled={loading}
                  style={{ marginBottom: '16px' }}
                >
                  <option value="f95">F95Zone</option>
                  <option value="lewdcorner">LewdCorner</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="search_id" className="label">
                  ID {platform === 'f95' ? 'F95Zone' : 'LewdCorner'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {platform === 'f95' ? (
                    <>
                      Ex: Pour <code>https://f95zone.to/threads/xxx.214202/</code>, l'ID est <strong>214202</strong>
                    </>
                  ) : (
                    <>
                      Ex: Pour <code>https://lewdcorner.com/threads/xxx.2745/</code>, l'ID est <strong>2745</strong>
                    </>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    id="search_id"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="input"
                    placeholder={platform === 'f95' ? '214202' : '2745'}
                    style={{ flex: 1 }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Search size={16} />
                    {loading ? 'Recherche...' : 'Rechercher'}
                  </button>
                </div>
              </div>

              {searchData && (
                <div style={{
                  padding: '16px',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                    📋 Données récupérées
                  </h3>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                    <div><strong>Titre:</strong> {searchData.name}</div>
                    <div><strong>Version:</strong> {searchData.version || 'N/A'}</div>
                    <div><strong>Statut:</strong> {searchData.status || 'N/A'}</div>
                    <div><strong>Moteur:</strong> {searchData.engine || 'N/A'}</div>
                    {searchData.tags && searchData.tags.length > 0 && (
                      <div><strong>Tags:</strong> {Array.isArray(searchData.tags) ? searchData.tags.join(', ') : searchData.tags}</div>
                    )}
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* Onglet Manuel */
            <form onSubmit={handleAddManual}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label htmlFor="titre" className="label">
                    Titre <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="titre"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="version" className="label">
                    Version
                  </label>
                  <input
                    type="text"
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="input"
                    placeholder="v0.5.2"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label htmlFor="statut_jeu" className="label">
                      Statut du jeu
                    </label>
                    <select
                      id="statut_jeu"
                      value={statutJeu}
                      onChange={(e) => setStatutJeu(e.target.value as AvnStatutJeu | '')}
                      className="select"
                    >
                      <option value="">-- Non défini --</option>
                      <option value="EN COURS">EN COURS</option>
                      <option value="TERMINÉ">TERMINÉ</option>
                      <option value="ABANDONNÉ">ABANDONNÉ</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="moteur" className="label">
                      Moteur
                    </label>
                    <select
                      id="moteur"
                      value={moteur}
                      onChange={(e) => setMoteur(e.target.value as AvnMoteur | '')}
                      className="select"
                    >
                      <option value="">-- Non défini --</option>
                      <option value="RenPy">RenPy</option>
                      <option value="Unity">Unity</option>
                      <option value="RPGM">RPGM</option>
                      <option value="Unreal">Unreal</option>
                      <option value="HTML">HTML</option>
                      <option value="Flash">Flash</option>
                      <option value="QSP">QSP</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="statut_perso" className="label">
                    Mon statut
                  </label>
                  <select
                    id="statut_perso"
                    value={statutPerso}
                    onChange={(e) => setStatutPerso(e.target.value as AvnStatutPerso | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="À jouer">À jouer</option>
                    <option value="En cours">En cours</option>
                    <option value="Complété">Complété</option>
                    <option value="Abandonné">Abandonné</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="couverture_url" className="label">
                    URL de la couverture
                  </label>
                  <input
                    type="url"
                    id="couverture_url"
                    value={couvertureUrl}
                    onChange={(e) => setCouvertureUrl(e.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="label">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="input"
                    placeholder="3DCG, Romance, Incest, ..."
                  />
                </div>

                {/* Section Traduction */}
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(139, 92, 246, 0.1)', 
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>
                    🌐 Informations de traduction (optionnel)
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label htmlFor="version_traduction" className="label">
                        Version de la traduction
                      </label>
                      <input
                        type="text"
                        id="version_traduction"
                        value={versionTraduction}
                        onChange={(e) => setVersionTraduction(e.target.value)}
                        className="input"
                        placeholder="v1.0 FR"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label htmlFor="statut_traduction" className="label">
                          Statut de traduction
                        </label>
                        <select
                          id="statut_traduction"
                          value={statutTraduction}
                          onChange={(e) => setStatutTraduction(e.target.value as AvnStatutTraduction | '')}
                          className="select"
                        >
                          <option value="">-- Non défini --</option>
                          <option value="Traduction">Traduction</option>
                          <option value="Traduction (Mod inclus)">Traduction (Mod inclus)</option>
                          <option value="Traduction intégré">Traduction intégré</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="type_traduction" className="label">
                          Type de traduction
                        </label>
                        <select
                          id="type_traduction"
                          value={typeTraduction}
                          onChange={(e) => setTypeTraduction(e.target.value as AvnTypeTraduction | '')}
                          className="select"
                        >
                          <option value="">-- Non défini --</option>
                          <option value="Manuelle">Manuelle</option>
                          <option value="Semi-automatique">Semi-automatique</option>
                          <option value="Automatique">Automatique</option>
                          <option value="VO française">VO française</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            form={activeTab === 'search' ? undefined : undefined}
            onClick={activeTab === 'search' ? handleAddFromSearch : handleAddManual}
            className="btn btn-primary"
            disabled={loading || (activeTab === 'search' && !searchData)}
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
