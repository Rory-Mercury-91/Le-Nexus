import { useState, FormEvent } from 'react';
import { X, Search, Plus } from 'lucide-react';
import type { AvnStatutPerso, AvnStatutJeu, AvnMoteur } from '../../../types';
import '../../../index.css';

interface AddAvnModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type TabMode = 'f95' | 'manual';

const F95_API_URL = 'https://script.google.com/macros/s/AKfycbwb8C1478tnW30d77HtECYTxjJ2EpB1OrtQUueFeZ0tZPz3Uuze5s2FAQAnQOKShEzD/exec';

export default function AddAvnModal({ onClose, onSuccess }: AddAvnModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('f95');
  const [loading, setLoading] = useState(false);

  // Onglet F95
  const [f95Id, setF95Id] = useState('');
  const [f95Data, setF95Data] = useState<any>(null);

  // Onglet Manuel
  const [titre, setTitre] = useState('');
  const [version, setVersion] = useState('');
  const [statutJeu, setStatutJeu] = useState<AvnStatutJeu | ''>('');
  const [moteur, setMoteur] = useState<AvnMoteur | ''>('');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [statutPerso, setStatutPerso] = useState<AvnStatutPerso | ''>('');
  const [lienF95, setLienF95] = useState('');
  const [lienTraduction, setLienTraduction] = useState('');
  const [lienJeu, setLienJeu] = useState('');
  const [cheminExecutable, setCheminExecutable] = useState('');
  const [notesPrivees, setNotesPrivees] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleFetchF95 = async () => {
    if (!f95Id.trim()) {
      alert('❌ Veuillez entrer un ID F95Zone');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${F95_API_URL}?id=${f95Id}`);
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.name) {
        throw new Error('Jeu introuvable');
      }

      setF95Data(data);
      alert(`✅ Données récupérées: ${data.name}`);
    } catch (error: any) {
      console.error('Erreur fetch F95:', error);
      alert(`❌ ${error.message || 'Impossible de récupérer les données'}`);
      setF95Data(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromF95 = async (e: FormEvent) => {
    e.preventDefault();

    if (!f95Data) {
      alert('❌ Veuillez d\'abord rechercher un jeu');
      return;
    }

    try {
      setLoading(true);

      const tagsArray = f95Data.tags
        ? f95Data.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      await window.electronAPI.createAvnGame({
        f95_thread_id: f95Data.id || Number(f95Id),
        titre: f95Data.name,
        version: f95Data.version || null,
        statut_jeu: mapF95Status(f95Data.status),
        moteur: mapF95Engine(f95Data.engine),
        couverture_url: f95Data.image || null,
        tags: tagsArray,
        lien_f95: f95Data.thread_url || `https://f95zone.to/threads/${f95Id}`,
        statut_perso: 'À jouer'
      });

      alert(`✅ Jeu ajouté: ${f95Data.name}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur ajout jeu F95:', error);
      alert('❌ Erreur lors de l'ajout du jeu');
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
        notes_privees: notesPrivees || null
      });

      alert(`✅ Jeu ajouté: ${titre}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erreur ajout manuel:', error);
      alert('❌ Erreur lors de l'ajout du jeu');
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
            onClick={() => setActiveTab('f95')}
            style={{
              padding: '16px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'f95' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'f95' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'f95' ? '700' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Search size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Par ID F95Zone
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
          {activeTab === 'f95' ? (
            /* Onglet F95 */
            <form onSubmit={handleAddFromF95}>
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="f95_id" className="label">
                  ID F95Zone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Ex: Pour <code>https://f95zone.to/threads/xxx.214202/</code>, l'ID est <strong>214202</strong>
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    id="f95_id"
                    value={f95Id}
                    onChange={(e) => setF95Id(e.target.value)}
                    className="input"
                    placeholder="214202"
                    style={{ flex: 1 }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleFetchF95}
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Search size={16} />
                    {loading ? 'Recherche...' : 'Rechercher'}
                  </button>
                </div>
              </div>

              {f95Data && (
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
                    <div><strong>Titre:</strong> {f95Data.name}</div>
                    <div><strong>Version:</strong> {f95Data.version || 'N/A'}</div>
                    <div><strong>Statut:</strong> {f95Data.status || 'N/A'}</div>
                    <div><strong>Moteur:</strong> {f95Data.engine || 'N/A'}</div>
                    {f95Data.tags && (
                      <div><strong>Tags:</strong> {f95Data.tags}</div>
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
            className="btn btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            form={activeTab === 'f95' ? undefined : undefined}
            onClick={activeTab === 'f95' ? handleAddFromF95 : handleAddManual}
            className="btn btn-primary"
            disabled={loading || (activeTab === 'f95' && !f95Data)}
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

