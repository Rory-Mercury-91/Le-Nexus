import { ExternalLink, Loader, Search, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MangaDexResult } from '../../../types';
import CoverImage from '../../common/CoverImage';

interface AddSerieModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSerieModal({ onClose, onSuccess }: AddSerieModalProps) {
  const [titre, setTitre] = useState('');
  const [statut, setStatut] = useState<'En cours' | 'Terminée' | 'Abandonnée'>('En cours');
  const [typeVolume, setTypeVolume] = useState<'Broché' | 'Kindle' | 'Webtoon' | 'Broché Collector' | 'Coffret' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon'>('Broché');
  const [couvertureUrl, setCouvertureUrl] = useState('');
  const [description, setDescription] = useState('');
  const [statutPublication, setStatutPublication] = useState('');
  const [anneePublication, setAnneePublication] = useState('');
  const [genres, setGenres] = useState('');
  const [nbChapitres, setNbChapitres] = useState('');
  const [langueOriginale, setLangueOriginale] = useState('');
  const [demographie, setDemographie] = useState('');
  const [editeur, setEditeur] = useState('');
  const [rating, setRating] = useState('');
  const [searchResults, setSearchResults] = useState<MangaDexResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

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

  const handleSearchMangadex = async () => {
    if (!titre.trim()) return;
    
    setSearching(true);
    const results = await window.electronAPI.searchManga(titre);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSearchAmazon = async () => {
    if (!titre.trim()) return;
    
    const searchQuery = encodeURIComponent(`${titre} manga français`);
    const amazonUrl = `https://www.amazon.fr/s?k=${searchQuery}`;
    await window.electronAPI.openExternal(amazonUrl);
  };

  const handleSelectManga = async (manga: MangaDexResult) => {
    setTitre(manga.titre);
    setDescription(manga.description || '');
    setStatutPublication(manga.statut_publication || '');
    setAnneePublication(manga.annee_publication?.toString() || '');
    setGenres(manga.genres || '');
    setNbChapitres(manga.nb_chapitres?.toString() || '');
    setLangueOriginale(manga.langue_originale || '');
    setDemographie(manga.demographie || '');
    setEditeur('');
    setRating(manga.rating || '');
    setSearchResults([]);

    // Télécharger la couverture si disponible
    if (manga.couverture) {
      setSearching(true);
      const fileName = `${manga.id}.jpg`;
      const result = await window.electronAPI.downloadCover(manga.couverture, fileName, manga.titre, 'serie');
      
      if (result.success && result.localPath) {
        // Image téléchargée avec succès
        setCouvertureUrl(result.localPath);
      } else {
        // Fallback sur l'URL en ligne
        setCouvertureUrl(manga.couverture);
      }
      setSearching(false);
    } else {
      setCouvertureUrl('');
    }
  };

  const handleUploadImage = async () => {
    // Utiliser le titre actuel ou un titre temporaire
    const titrePourDossier = titre.trim() || 'nouvelle_serie';
    
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }
    
    const result = await window.electronAPI.uploadCustomCover(titrePourDossier, 'serie');
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
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
      const titrePourDossier = titre.trim() || 'nouvelle_serie';
      
      // Supprimer l'ancienne image locale si elle existe
      if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
        await window.electronAPI.deleteCoverImage(couvertureUrl);
      }
      
      // Dans Electron, les fichiers droppés ont une propriété 'path'
      const filePath = (imageFile as any).path;
      const result = await window.electronAPI.saveCoverFromPath(filePath, titrePourDossier, 'serie');
      if (result.success && result.localPath) {
        setCouvertureUrl(result.localPath);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      return;
    }

    setSaving(true);
    try {
      // Déterminer automatiquement le type_contenu selon le type_volume
      const typeContenu = (typeVolume === 'Scan Manga' || typeVolume === 'Scan Webtoon') ? 'chapitre' : 'volume';

      await window.electronAPI.createSerie({
        titre: titre.trim(),
        statut,
        type_volume: typeVolume,
        type_contenu: typeContenu,
        couverture_url: couvertureUrl || null,
        description: description || null,
        statut_publication: statutPublication || null,
        annee_publication: anneePublication ? parseInt(anneePublication) : null,
        genres: genres || null,
        nb_chapitres: nbChapitres ? parseInt(nbChapitres) : null,
        langue_originale: langueOriginale || null,
        demographie: demographie || null,
        editeur: editeur || null,
        rating: rating || null
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur lors de la création de la série:', error);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '900px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Ajouter une série</h2>
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
          {/* Recherche MangaDex */}
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
              💡 Tapez un titre → Recherchez → Sélectionnez un résultat pour pré-remplir → Modifiez le titre manuellement si besoin
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Ex: One Piece, Naruto..."
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchMangadex();
                  }
                }}
                className="input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSearchMangadex}
                className="btn btn-primary"
                disabled={searching || !titre.trim()}
              >
                {searching ? <Loader size={20} className="loading" /> : <Search size={20} />}
                Rechercher
              </button>
              <button
                type="button"
                onClick={handleSearchAmazon}
                className="btn btn-outline"
                disabled={!titre.trim()}
                title="Ouvre Amazon.fr dans votre navigateur"
              >
                <ExternalLink size={20} />
                Amazon.fr
              </button>
            </div>

            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <div style={{
                marginTop: '12px',
                background: 'var(--surface-light)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {searchResults.map((manga) => (
                  <div
                    key={manga.id}
                    onClick={() => handleSelectManga(manga)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.2s',
                      marginBottom: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {manga.couverture && (
                      <img
                        src={manga.couverture}
                        alt={manga.titre}
                        style={{
                          width: '60px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontWeight: '600', margin: 0 }}>{manga.titre}</h4>
                        {manga.source && (() => {
                          const colors: Record<string, string> = {
                            'MangaDex': '#ff6740',
                            'AniList': '#02A9FF',
                            'Kitsu': '#FC5B5B',
                            'MyAnimeList': '#2E51A2',
                            'MangaUpdates': '#E85D75'
                          };
                          const source = manga.source || '';
                          return (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '600',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              background: colors[source] || '#666',
                              color: '#fff',
                              textTransform: 'uppercase'
                            }}>
                              {source === 'MyAnimeList' ? 'MAL' : source === 'MangaUpdates' ? 'MU' : source}
                            </span>
                          );
                        })()}
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {manga.description || 'Aucune description'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    : couvertureUrl 
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
                ) : couvertureUrl ? (
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
              placeholder="Titre de la série"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
                <option value="Terminée">Terminée</option>
                <option value="Abandonnée">Abandonnée</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Type de volume
              </label>
              <select
                value={typeVolume}
                onChange={(e) => setTypeVolume(e.target.value as any)}
                className="select"
              >
                <option value="Broché">Broché</option>
                <option value="Broché Collector">Broché Collector</option>
                <option value="Coffret">Coffret</option>
                <option value="Kindle">Kindle</option>
                <option value="Webtoon">Webtoon</option>
                <option value="Webtoon Physique">Webtoon Physique</option>
                <option value="Light Novel">Light Novel</option>
                <option value="Scan Manga">Scan Manga</option>
                <option value="Scan Webtoon">Scan Webtoon</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Description (optionnel)
            </label>
            <textarea
              placeholder="Synopsis du manga..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={3}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Année
              </label>
              <input
                type="number"
                placeholder="2020"
                value={anneePublication}
                onChange={(e) => setAnneePublication(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Nb de volumes
              </label>
              <input
                type="number"
                placeholder="20"
                value={nbChapitres}
                onChange={(e) => setNbChapitres(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Statut publication
              </label>
              <input
                type="text"
                placeholder="En cours"
                value={statutPublication}
                onChange={(e) => setStatutPublication(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Démographie
              </label>
              <input
                type="text"
                placeholder="Shōnen"
                value={demographie}
                onChange={(e) => setDemographie(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Langue
              </label>
              <input
                type="text"
                placeholder="ja"
                value={langueOriginale}
                onChange={(e) => setLangueOriginale(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Rating
              </label>
              <input
                type="text"
                placeholder="Tout public"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Éditeur VF
            </label>
            <input
              type="text"
              placeholder="Delcourt/Tonkam"
              value={editeur}
              onChange={(e) => setEditeur(e.target.value)}
              className="input"
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

          </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
