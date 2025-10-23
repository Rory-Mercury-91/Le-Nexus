import { Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimeSerie } from '../types';
import CoverImage from './CoverImage';

interface AnimeSaison {
  id?: number;
  numero_saison: number;
  titre: string;
  nb_episodes: number;
  annee: number | null;
}

interface AnimeEditModalProps {
  anime: AnimeSerie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnimeEditModal({ anime, onClose, onSuccess }: AnimeEditModalProps) {
  const [titre, setTitre] = useState(anime.titre);
  const [titreNatif, setTitreNatif] = useState(anime.titre_natif || '');
  const [couvertureUrl, setCouvertureUrl] = useState(anime.couverture_url || '');
  const [description, setDescription] = useState(anime.description || '');
  const [statut, setStatut] = useState(anime.statut);
  const [type, setType] = useState(anime.type);
  const [annee, setAnnee] = useState(anime.annee?.toString() || '');
  const [genres, setGenres] = useState(anime.genres || '');
  const [studios, setStudios] = useState(anime.studios || '');
  const [saisons, setSaisons] = useState<AnimeSaison[]>([]);
  const [saving, setSaving] = useState(false);

  // Fermer le modal avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  // Charger les saisons au montage
  useState(() => {
    const loadSaisons = async () => {
      try {
        const loadedSaisons = await window.electronAPI.getAnimeSaisons(anime.id);
        setSaisons(loadedSaisons.map((s: any) => ({
          id: s.id,
          numero_saison: s.numero_saison,
          titre: s.titre,
          nb_episodes: s.nb_episodes,
          annee: s.annee
        })));
      } catch (error) {
        console.error('Erreur chargement saisons:', error);
      }
    };
    loadSaisons();
  });

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }
    
    const result = await window.electronAPI.uploadCustomCover(titre, 'anime');
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
    }
  };

  const handleAddSaison = () => {
    const newNumero = saisons.length > 0 
      ? Math.max(...saisons.map(s => s.numero_saison)) + 1 
      : 1;
    
    setSaisons([...saisons, {
      numero_saison: newNumero,
      titre: `Saison ${newNumero}`,
      nb_episodes: 12,
      annee: annee ? parseInt(annee) : null
    }]);
  };

  const handleRemoveSaison = (index: number) => {
    setSaisons(saisons.filter((_, i) => i !== index));
  };

  const handleUpdateSaison = (index: number, field: keyof AnimeSaison, value: any) => {
    const newSaisons = [...saisons];
    newSaisons[index] = { ...newSaisons[index], [field]: value };
    setSaisons(newSaisons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      return;
    }

    setSaving(true);
    try {
      await window.electronAPI.updateAnime(anime.id, {
        titre: titre.trim(),
        titre_natif: titreNatif.trim() || null,
        couverture_url: couvertureUrl || null,
        description: description || null,
        statut,
        type,
        annee: annee ? parseInt(annee) : null,
        genres: genres || null,
        studios: studios || null,
        saisons: saisons
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la modification de l\'anime:', error);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          position: 'sticky',
          top: 0,
          background: 'var(--card-bg)',
          zIndex: 10,
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Modifier l'anime</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Colonne image */}
            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{
                width: '100%',
                height: '280px',
                borderRadius: '8px',
                border: couvertureUrl ? '2px solid var(--border)' : '2px dashed var(--border)',
                overflow: 'hidden'
              }}>
                {couvertureUrl ? (
                  <CoverImage
                    src={couvertureUrl}
                    alt="Couverture"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    Aucune couverture
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleUploadImage}
                className="btn btn-outline"
                style={{ width: '100%', fontSize: '14px', marginTop: '12px' }}
              >
                <Upload size={16} />
                Choisir une image
              </button>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  URL couverture (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={couvertureUrl}
                  onChange={(e) => setCouvertureUrl(e.target.value)}
                  className="input"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
            </div>

            {/* Colonne formulaire */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Titre *
                </label>
                <input
                  type="text"
                  placeholder="Titre de l'anime"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Titre natif (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="日本語タイトル"
                  value={titreNatif}
                  onChange={(e) => setTitreNatif(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Statut
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as any)}
                    className="select"
                  >
                    <option value="En cours">En cours</option>
                    <option value="Terminé">Terminé</option>
                    <option value="Abandonné">Abandonné</option>
                    <option value="En attente">En attente</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="select"
                  >
                    <option value="TV">TV</option>
                    <option value="Film">Film</option>
                    <option value="OAV">OAV</option>
                    <option value="ONA">ONA</option>
                    <option value="Special">Special</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Année
                  </label>
                  <input
                    type="number"
                    placeholder="2024"
                    value={annee}
                    onChange={(e) => setAnnee(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Description (optionnel)
                </label>
                <textarea
                  placeholder="Synopsis de l'anime..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Genres
                </label>
                <input
                  type="text"
                  placeholder="Action, Aventure, Fantasy"
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Studios
                </label>
                <input
                  type="text"
                  placeholder="Studio Ghibli"
                  value={studios}
                  onChange={(e) => setStudios(e.target.value)}
                  className="input"
                />
              </div>

              {/* Gestion des saisons */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Saisons</h3>
                  <button
                    type="button"
                    onClick={handleAddSaison}
                    className="btn btn-primary"
                    style={{ fontSize: '14px' }}
                  >
                    <Plus size={16} />
                    Ajouter une saison
                  </button>
                </div>

                {saisons.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    border: '2px dashed var(--border)',
                    borderRadius: '8px'
                  }}>
                    Aucune saison. Cliquez sur "Ajouter une saison" pour commencer.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {saisons.map((saison, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'var(--bg)',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px auto', gap: '12px', alignItems: 'center' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                              Saison
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={saison.numero_saison}
                              onChange={(e) => handleUpdateSaison(index, 'numero_saison', parseInt(e.target.value))}
                              className="input"
                              style={{ fontSize: '14px', padding: '6px 8px' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                              Titre
                            </label>
                            <input
                              type="text"
                              value={saison.titre}
                              onChange={(e) => handleUpdateSaison(index, 'titre', e.target.value)}
                              className="input"
                              style={{ fontSize: '14px', padding: '6px 8px' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                              Épisodes
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={saison.nb_episodes}
                              onChange={(e) => handleUpdateSaison(index, 'nb_episodes', parseInt(e.target.value))}
                              className="input"
                              style={{ fontSize: '14px', padding: '6px 8px' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                              Année
                            </label>
                            <input
                              type="number"
                              placeholder="2024"
                              value={saison.annee || ''}
                              onChange={(e) => handleUpdateSaison(index, 'annee', e.target.value ? parseInt(e.target.value) : null)}
                              className="input"
                              style={{ fontSize: '14px', padding: '6px 8px' }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSaison(index)}
                            className="btn btn-danger"
                            style={{ fontSize: '14px', padding: '6px 12px' }}
                            title="Supprimer cette saison"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end', 
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            position: 'sticky',
            bottom: 0,
            background: 'var(--card-bg)',
            zIndex: 10
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
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="loading" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
