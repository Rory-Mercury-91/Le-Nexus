import { Languages, Loader2, Search, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { AnimeSearchResult } from '../../../types';
import CoverImage from '../../common/CoverImage';

interface AddAnimeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAnimeModal({ onClose, onSuccess }: AddAnimeModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AnimeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [malInput, setMalInput] = useState('');
  const [importing, setImporting] = useState(false);
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

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

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'AniList': return '#02A9FF';
      case 'Kitsu': return '#F75239';
      default: return 'var(--primary)';
    }
  };

  const getStatutColor = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return '#10b981'; // Vert
    if (s === 'releasing' || s === 'current') return '#3b82f6'; // Bleu
    if (s === 'not_yet_released' || s === 'upcoming') return '#94a3b8'; // Gris
    if (s === 'cancelled') return '#ef4444'; // Rouge
    return '#8b5cf6'; // Violet par défaut
  };

  const getStatutLabel = (statut: string) => {
    const s = statut.toLowerCase();
    if (s === 'finished' || s === 'completed') return 'Terminé';
    if (s === 'releasing' || s === 'current') return 'En cours';
    if (s === 'not_yet_released' || s === 'upcoming') return 'À venir';
    if (s === 'cancelled') return 'Annulé';
    return statut;
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

  const handleImportFromMAL = async () => {
    if (!malInput.trim()) {
      showToast({ title: 'Veuillez entrer un ID ou une URL MyAnimeList', type: 'error' });
      return;
    }

    setImporting(true);
    try {
      // Extraire l'ID de l'URL si c'est une URL
      let malId: number;
      const urlMatch = malInput.match(/anime\/(\d+)/);
      if (urlMatch) {
        malId = parseInt(urlMatch[1]);
      } else {
        malId = parseInt(malInput.trim());
      }

      if (isNaN(malId) || malId <= 0) {
        showToast({ title: 'ID MyAnimeList invalide', type: 'error' });
        setImporting(false);
        return;
      }

      console.log(`🎬 Import de l'anime MAL ID: ${malId}`);
      const result = await window.electronAPI.addAnimeByMalId(malId);

      if (result.success && result.anime) {
        showToast({ title: `✅ ${result.anime.titre} importé avec succès !`, type: 'success' });
        setMalInput('');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        showToast({ title: result.error || 'Erreur lors de l\'import', type: 'error' });
      }
    } catch (error) {
      console.error('Erreur import MAL:', error);
      showToast({ title: 'Erreur lors de l\'import depuis MyAnimeList', type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Ajouter un anime</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Recherche */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Rechercher et pré-remplir les informations
            </label>
            <p style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)', 
              marginBottom: '8px',
              lineHeight: '1.4'
            }}>
              💡 Tapez un titre → Recherchez → Sélectionnez un résultat pour pré-remplir → Modifiez si besoin
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Ex: Attack on Titan, Death Note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch(e as any);
                  }
                }}
                className="input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleSearch(e); }}
                className="btn btn-primary"
                disabled={searching || !searchTerm.trim()}
              >
                {searching ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
                Rechercher
              </button>
            </div>
          </div>

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
          <div style={{ 
            marginBottom: '24px', 
            padding: '20px', 
            border: '2px solid rgba(46, 81, 162, 0.3)',
            borderRadius: '12px',
            background: 'rgba(46, 81, 162, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#2e51a2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                MAL
              </div>
              <label style={{ fontWeight: '600', fontSize: '15px' }}>
                Importer depuis MyAnimeList
              </label>
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)', 
              marginBottom: '12px',
              lineHeight: '1.5'
            }}>
              🚀 <strong>Import complet automatique</strong> : ID ou URL → Toutes les données (cover HD, synopsis traduit, genres, etc.) récupérées automatiquement !
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Ex: 59027 ou https://myanimelist.net/anime/59027/..."
                value={malInput}
                onChange={(e) => setMalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImportFromMAL();
                  }
                }}
                className="input"
                style={{ flex: 1 }}
                disabled={importing}
              />
              <button
                type="button"
                onClick={handleImportFromMAL}
                className="btn"
                style={{
                  background: '#2e51a2',
                  color: 'white',
                  border: 'none'
                }}
                disabled={importing || !malInput.trim()}
              >
                {importing ? (
                  <>
                    <Loader2 size={20} className="spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Importer
                  </>
                )}
              </button>
            </div>
            <p style={{ 
              fontSize: '11px', 
              color: 'var(--text-secondary)', 
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              💡 Exemples : <code style={{ 
                background: 'rgba(139, 92, 246, 0.1)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>59027</code> ou <code style={{ 
                background: 'rgba(139, 92, 246, 0.1)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontSize: '11px'
              }}>https://myanimelist.net/anime/59027/Spy_x_Family_Season_3</code>
            </p>
          </div>

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

          {/* Résultats de recherche */}
          {showResults && (
            <div style={{
              marginTop: '16px',
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              background: 'var(--surface)'
            }}>
              {searching ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                  <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Recherche en cours...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucun résultat trouvé
                </div>
              ) : (
                <div>
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.source}-${result.id}-${index}`}
                      onClick={() => handleSelectResult(result)}
                      style={{
                        padding: '16px',
                        borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        gap: '16px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {result.couverture && (
                        <img
                          src={result.couverture}
                          alt={result.titre}
                          style={{
                            width: '60px',
                            height: '85px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {result.titre}
                          </h4>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: getSourceBadgeColor(result.source),
                            color: 'white',
                            fontWeight: '600',
                            flexShrink: 0
                          }}>
                            {result.source}
                          </span>
                        </div>
                        {result.titre_romaji && result.titre_romaji !== result.titre && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: '0 0 6px 0'
                          }}>
                            {result.titre_romaji}
                          </p>
                        )}
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}>
                          {result.format && <span>📺 {result.format}</span>}
                          {result.episodes && <span>🎬 {result.episodes} ép.</span>}
                          {result.annee_debut && (
                            <span>
                              📅 {result.annee_debut}
                              {result.annee_fin && result.annee_fin !== result.annee_debut 
                                ? `-${result.annee_fin}` 
                                : result.annee_fin ? '' : '-?'}
                            </span>
                          )}
                          {result.rating && <span>⭐ {result.rating}</span>}
                          {result.statut && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: getStatutColor(result.statut),
                              color: 'white'
                            }}>
                              {getStatutLabel(result.statut)}
                            </span>
                          )}
                        </div>
                        {result.description && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginTop: '8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.5'
                          }}>
                            {result.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
            marginBottom: '24px'
          }} />

          {/* Formulaire */}
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Colonne image */}
            <div style={{ width: '200px', flexShrink: 0 }}>
              <div 
                style={{
                  width: '100%',
                  height: '280px',
                  borderRadius: '8px',
                  border: dragging 
                    ? '2px solid var(--primary)' 
                    : formData.image_url 
                      ? '2px solid var(--border)' 
                      : '2px dashed var(--border)',
                  overflow: 'hidden',
                  background: dragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  transition: 'all 0.2s',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {dragging ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    📥 Déposer l'image
                  </div>
                ) : formData.image_url ? (
                  <CoverImage
                    src={formData.image_url}
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
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '20px',
                    gap: '8px'
                  }}>
                    <Upload size={24} style={{ opacity: 0.5 }} />
                    <div>Glissez une image ici</div>
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
                  URL image (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="input"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
            </div>

            {/* Colonne formulaire */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Titre */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Titre <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    className="input"
                    placeholder="Ex: Attack on Titan"
                    required
                  />
                </div>

                {/* Titre anglais */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Titre anglais (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.titre_en}
                    onChange={(e) => setFormData({ ...formData, titre_en: e.target.value })}
                    className="input"
                    placeholder="Ex: Shingeki no Kyojin"
                  />
                </div>

                {/* Type et Statut */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="select"
                    >
                      <option value="TV">TV</option>
                      <option value="Movie">Film</option>
                      <option value="OVA">OVA</option>
                      <option value="ONA">ONA</option>
                      <option value="Special">Spécial</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Statut
                    </label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                      className="select"
                    >
                      <option value="watching">En cours</option>
                      <option value="completed">Terminé</option>
                      <option value="on_hold">En pause</option>
                      <option value="dropped">Abandonné</option>
                      <option value="plan_to_watch">Prévu</option>
                    </select>
                  </div>
                </div>

                {/* Épisodes et Année */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Nombre d'épisodes
                    </label>
                    <input
                      type="number"
                      value={formData.nb_episodes || ''}
                      onChange={(e) => setFormData({ ...formData, nb_episodes: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="0"
                      placeholder="Ex: 24"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Année
                    </label>
                    <input
                      type="number"
                      value={formData.annee || ''}
                      onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) || 0 })}
                      className="input"
                      min="1900"
                      max={new Date().getFullYear() + 2}
                      placeholder={new Date().getFullYear().toString()}
                    />
                  </div>
                </div>

                {/* Synopsis */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Synopsis (optionnel)
                  </label>
                  <textarea
                    value={formData.synopsis}
                    onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                    className="input"
                    rows={4}
                    placeholder="Description de l'anime..."
                    style={{ resize: 'vertical' }}
                  />
                  <button
                    type="button"
                    onClick={handleTranslateSynopsis}
                    disabled={!formData.synopsis || formData.synopsis.length < 10 || translating || saving}
                    className="btn"
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      padding: '8px 12px',
                      background: translating ? 'var(--surface)' : 'rgba(99, 102, 241, 0.1)',
                      color: translating ? 'var(--text-secondary)' : 'var(--primary)',
                      border: '1px solid',
                      borderColor: translating ? 'var(--border)' : 'var(--primary)'
                    }}
                  >
                    {translating ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Traduction en cours...
                      </>
                    ) : (
                      <>
                        <Languages size={16} />
                        Traduire en français
                      </>
                    )}
                  </button>
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
      <ToastContainer />
    </div>
  );
}
