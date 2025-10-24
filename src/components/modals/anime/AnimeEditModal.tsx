import { Languages, Loader2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { AnimeSerie } from '../../../types';
import CoverImage from '../../common/CoverImage';

interface AnimeEditModalProps {
  anime: AnimeSerie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnimeEditModal({ anime, onClose, onSuccess }: AnimeEditModalProps) {
  // Champs de base
  const [titre, setTitre] = useState(anime.titre);
  const [titreRomaji, setTitreRomaji] = useState(anime.titre_romaji || '');
  const [titreNatif, setTitreNatif] = useState(anime.titre_natif || '');
  const [titreAnglais, setTitreAnglais] = useState(anime.titre_anglais || '');
  const [titresAlternatifs, setTitresAlternatifs] = useState(anime.titres_alternatifs || '');
  const [couvertureUrl, setCouvertureUrl] = useState(anime.couverture_url || '');
  const [description, setDescription] = useState(anime.description || '');
  
  // Métadonnées
  const [type, setType] = useState(anime.type);
  const [source, setSource] = useState(anime.source || '');
  const [nbEpisodes, setNbEpisodes] = useState(anime.nb_episodes?.toString() || '');
  const [statutDiffusion, setStatutDiffusion] = useState(anime.statut_diffusion || '');
  const [enCoursDiffusion, setEnCoursDiffusion] = useState(anime.en_cours_diffusion || false);
  const [dateDebut, setDateDebut] = useState(anime.date_debut || '');
  const [dateFin, setDateFin] = useState(anime.date_fin || '');
  const [duree, setDuree] = useState(anime.duree || '');
  const [annee, setAnnee] = useState(anime.annee?.toString() || '');
  const [saisonDiffusion, setSaisonDiffusion] = useState(anime.saison_diffusion || '');
  
  // Classification
  const [genres, setGenres] = useState(anime.genres || '');
  const [themes, setThemes] = useState(anime.themes || '');
  const [demographics, setDemographics] = useState(anime.demographics || '');
  const [rating, setRating] = useState(anime.rating || '');
  const [score, setScore] = useState(anime.score?.toString() || '');
  
  // Production
  const [studios, setStudios] = useState(anime.studios || '');
  const [producteurs, setProducteurs] = useState(anime.producteurs || '');
  const [diffuseurs, setDiffuseurs] = useState(anime.diffuseurs || '');
  
  // Liens
  const [liensExternes, setLiensExternes] = useState(anime.liens_externes || '');
  const [liensStreaming, setLiensStreaming] = useState(anime.liens_streaming || '');
  
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const { showToast, ToastContainer } = useToast();

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

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }
    
    const result = await window.electronAPI.uploadCustomCover(titre, 'anime');
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
      showToast('Image téléchargée avec succès', 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      showToast('Le titre est obligatoire', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.updateAnime(anime.id, {
        titre: titre.trim(),
        titre_romaji: titreRomaji.trim() || null,
        titre_natif: titreNatif.trim() || null,
        titre_anglais: titreAnglais.trim() || null,
        titres_alternatifs: titresAlternatifs.trim() || null,
        couverture_url: couvertureUrl || null,
        description: description || null,
        type,
        source: source || null,
        nb_episodes: nbEpisodes ? parseInt(nbEpisodes) : 0,
        statut_diffusion: statutDiffusion || null,
        en_cours_diffusion: enCoursDiffusion,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        duree: duree || null,
        annee: annee ? parseInt(annee) : null,
        saison_diffusion: saisonDiffusion || null,
        genres: genres || null,
        themes: themes || null,
        demographics: demographics || null,
        rating: rating || null,
        score: score ? parseFloat(score) : null,
        studios: studios || null,
        producteurs: producteurs || null,
        diffuseurs: diffuseurs || null,
        liens_externes: liensExternes || null,
        liens_streaming: liensStreaming || null
      });
      
      if (result.success) {
        showToast('Anime modifié avec succès', 'success');
        setTimeout(() => onSuccess(), 800);
      } else {
        showToast(`Erreur: ${result.error}`, 'error');
        setSaving(false);
      }
    } catch (error) {
      console.error('Erreur lors de la modification de l\'anime:', error);
      showToast('Erreur lors de la modification', 'error');
      setSaving(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!description || description.length < 10) {
      showToast('Description trop courte pour être traduite', 'error');
      return;
    }

    setTranslating(true);
    try {
      const result = await window.electronAPI.translateText(description, 'fr');
      if (result.success && result.text) {
        setDescription(result.text);
        showToast('Description traduite avec succès', 'success');
      } else {
        showToast(`Erreur de traduction: ${result.error || 'Clé API manquante'}`, 'error');
      }
    } catch (error) {
      console.error('Erreur traduction description:', error);
      showToast('Erreur lors de la traduction', 'error');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px 16px',
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
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

        <form id="anime-edit-form" onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
                    <option value="Movie">Film</option>
                    <option value="OVA">OVA</option>
                    <option value="ONA">ONA</option>
                    <option value="Special">Special</option>
                    <option value="Music">Music</option>
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
                <button
                  type="button"
                  onClick={handleTranslateDescription}
                  disabled={!description || description.length < 10 || translating || saving}
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

              {/* Titres alternatifs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Titre romaji
                  </label>
                  <input
                    type="text"
                    placeholder="Romaji Title"
                    value={titreRomaji}
                    onChange={(e) => setTitreRomaji(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Titre anglais
                  </label>
                  <input
                    type="text"
                    placeholder="English Title"
                    value={titreAnglais}
                    onChange={(e) => setTitreAnglais(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Titres alternatifs
                </label>
                <input
                  type="text"
                  placeholder="Titre alt 1, Titre alt 2"
                  value={titresAlternatifs}
                  onChange={(e) => setTitresAlternatifs(e.target.value)}
                  className="input"
                />
              </div>

              {/* Métadonnées détaillées */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Source
                  </label>
                  <input
                    type="text"
                    placeholder="Manga, Light Novel..."
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Nb épisodes
                  </label>
                  <input
                    type="number"
                    placeholder="12"
                    value={nbEpisodes}
                    onChange={(e) => setNbEpisodes(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Durée
                  </label>
                  <input
                    type="text"
                    placeholder="24 min"
                    value={duree}
                    onChange={(e) => setDuree(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Statut diffusion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Statut diffusion
                  </label>
                  <input
                    type="text"
                    placeholder="Finished Airing"
                    value={statutDiffusion}
                    onChange={(e) => setStatutDiffusion(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Saison
                  </label>
                  <input
                    type="text"
                    placeholder="Winter, Spring..."
                    value={saisonDiffusion}
                    onChange={(e) => setSaisonDiffusion(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
                    <input
                      type="checkbox"
                      checked={enCoursDiffusion}
                      onChange={(e) => setEnCoursDiffusion(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    En cours de diffusion
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Date début
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Classification */}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Thèmes
                  </label>
                  <input
                    type="text"
                    placeholder="School, Military..."
                    value={themes}
                    onChange={(e) => setThemes(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Démographie
                  </label>
                  <input
                    type="text"
                    placeholder="Shounen, Seinen..."
                    value={demographics}
                    onChange={(e) => setDemographics(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Rating
                  </label>
                  <input
                    type="text"
                    placeholder="PG-13, R+..."
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Score MAL
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Production */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Studios
                </label>
                <input
                  type="text"
                  placeholder="Studio Ghibli, Toei Animation"
                  value={studios}
                  onChange={(e) => setStudios(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Producteurs
                  </label>
                  <input
                    type="text"
                    placeholder="Bandai Visual, Aniplex"
                    value={producteurs}
                    onChange={(e) => setProducteurs(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Diffuseurs
                  </label>
                  <input
                    type="text"
                    placeholder="Crunchyroll, Netflix"
                    value={diffuseurs}
                    onChange={(e) => setDiffuseurs(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Liens */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Liens externes
                </label>
                <input
                  type="text"
                  placeholder="Wikipedia, AniDB..."
                  value={liensExternes}
                  onChange={(e) => setLiensExternes(e.target.value)}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Liens streaming
                </label>
                <input
                  type="text"
                  placeholder="Crunchyroll, Netflix..."
                  value={liensStreaming}
                  onChange={(e) => setLiensStreaming(e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        </form>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end', 
          padding: '16px 32px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card-bg)',
          flexShrink: 0
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
            form="anime-edit-form"
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
      </div>
      <ToastContainer />
    </div>
  );
}
