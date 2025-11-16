import { Languages, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { AnimeSerie } from '../../../types';
import CoverImage from '../../common/CoverImage';
import Modal from '../common/Modal';
import { useModalEscape } from '../common/useModalEscape';

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
  const [dateSortieVf, setDateSortieVf] = useState(anime.date_sortie_vf || '');
  const [dateDebutStreaming, setDateDebutStreaming] = useState(anime.date_debut_streaming || '');
  const [duree, setDuree] = useState(anime.duree || '');
  const [annee, setAnnee] = useState(anime.annee?.toString() || '');
  const [saisonDiffusion, setSaisonDiffusion] = useState(anime.saison_diffusion || '');
  
  // Classification
  const [genres, setGenres] = useState(anime.genres || '');
  const [themes, setThemes] = useState(anime.themes || '');
  const [demographics, setDemographics] = useState(anime.demographics || '');
  const [rating, setRating] = useState(anime.rating || '');
  const [score, setScore] = useState(anime.score?.toString() || '');
  
  // Statistiques MAL
  const [rankMal, setRankMal] = useState(anime.rank_mal?.toString() || '');
  const [popularityMal, setPopularityMal] = useState(anime.popularity_mal?.toString() || '');
  const [scoredBy, setScoredBy] = useState(anime.scored_by?.toString() || '');
  const [favorites, setFavorites] = useState(anime.favorites?.toString() || '');
  
  // Production
  const [studios, setStudios] = useState(anime.studios || '');
  const [producteurs, setProducteurs] = useState(anime.producteurs || '');
  const [diffuseurs, setDiffuseurs] = useState(anime.diffuseurs || '');
  const [editeur, setEditeur] = useState(anime.editeur || '');
  
  // Informations contextuelles
  const [background, setBackground] = useState(anime.background || '');
  const [ageConseille, setAgeConseille] = useState(anime.age_conseille || '');
  const [siteWeb, setSiteWeb] = useState(anime.site_web || '');
  
  // Relations et franchise
  const [franchiseName, setFranchiseName] = useState(anime.franchise_name || '');
  const [franchiseOrder, setFranchiseOrder] = useState(anime.franchise_order?.toString() || '');
  const [prequelMalId, setPrequelMalId] = useState(anime.prequel_mal_id?.toString() || '');
  const [sequelMalId, setSequelMalId] = useState(anime.sequel_mal_id?.toString() || '');
  
  // Liens
  const [malUrl, setMalUrl] = useState(anime.mal_url || '');
  const [liensExternes, setLiensExternes] = useState(anime.liens_externes || '');
  const [liensStreaming, setLiensStreaming] = useState(anime.liens_streaming || '');
  
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const { showToast } = useToast();

  // Fermer le modal avec la touche Échap
  useModalEscape(onClose, saving);

  const handleUploadImage = async () => {
    // Supprimer l'ancienne image locale si elle existe
    if (couvertureUrl && couvertureUrl.startsWith('covers/')) {
      await window.electronAPI.deleteCoverImage(couvertureUrl);
    }
    
    const result = await window.electronAPI.uploadCustomCover(titre, 'anime', {
      mediaType: 'Anime'
    });
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
      showToast({ title: 'Image téléchargée avec succès', type: 'success' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      showToast({ title: 'Le titre est obligatoire', type: 'error' });
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
        date_sortie_vf: dateSortieVf || null,
        date_debut_streaming: dateDebutStreaming || null,
        duree: duree || null,
        annee: annee ? parseInt(annee) : null,
        saison_diffusion: saisonDiffusion || null,
        genres: genres || null,
        themes: themes || null,
        demographics: demographics || null,
        rating: rating || null,
        age_conseille: ageConseille || null,
        score: score ? parseFloat(score) : null,
        rank_mal: rankMal ? parseInt(rankMal) : null,
        popularity_mal: popularityMal ? parseInt(popularityMal) : null,
        scored_by: scoredBy ? parseInt(scoredBy) : null,
        favorites: favorites ? parseInt(favorites) : null,
        studios: studios || null,
        producteurs: producteurs || null,
        diffuseurs: diffuseurs || null,
        editeur: editeur || null,
        site_web: siteWeb || null,
        background: background || null,
        franchise_name: franchiseName || null,
        franchise_order: franchiseOrder ? parseInt(franchiseOrder) : null,
        prequel_mal_id: prequelMalId ? parseInt(prequelMalId) : null,
        sequel_mal_id: sequelMalId ? parseInt(sequelMalId) : null,
        mal_url: malUrl || null,
        liens_externes: liensExternes || null,
        liens_streaming: liensStreaming || null
      });
      
      if (result.success) {
        showToast({ title: 'Anime modifié avec succès', type: 'success' });
        setTimeout(() => onSuccess(), 800);
      } else {
        showToast({ title: 'Erreur lors de la modification', type: 'error' });
        setSaving(false);
      }
    } catch (error) {
      console.error('Erreur lors de la modification de l\'anime:', error);
      showToast({ title: 'Erreur lors de la modification', type: 'error' });
      setSaving(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!description || description.length < 10) {
      showToast({ title: 'Description trop courte pour être traduite', type: 'error' });
      return;
    }

    setTranslating(true);
    try {
      const result = await window.electronAPI.translateText(description, 'fr');
      if (result.success && result.text) {
        setDescription(result.text);
        showToast({ title: 'Description traduite avec succès', type: 'success' });
      } else {
        showToast({ title: `Erreur de traduction: ${result.error || 'Clé API manquante'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Erreur traduction description:', error);
      showToast({ title: 'Erreur lors de la traduction', type: 'error' });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Modal maxWidth="1000px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    Date début (VO)
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
                    Date fin (VO)
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Date sortie VF
                  </label>
                  <input
                    type="date"
                    value={dateSortieVf}
                    onChange={(e) => setDateSortieVf(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Date début streaming/simulcast
                  </label>
                  <input
                    type="date"
                    value={dateDebutStreaming}
                    onChange={(e) => setDateDebutStreaming(e.target.value)}
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
                    Âge conseillé
                  </label>
                  <input
                    type="text"
                    placeholder="12 ans et +, 16 ans..."
                    value={ageConseille}
                    onChange={(e) => setAgeConseille(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
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

              {/* Statistiques MAL */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Statistiques MyAnimeList
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Rang MAL
                    </label>
                    <input
                      type="number"
                      placeholder="#1"
                      value={rankMal}
                      onChange={(e) => setRankMal(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Popularité
                    </label>
                    <input
                      type="number"
                      placeholder="#1"
                      value={popularityMal}
                      onChange={(e) => setPopularityMal(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Nombre de notes
                    </label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={scoredBy}
                      onChange={(e) => setScoredBy(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Favoris
                    </label>
                    <input
                      type="number"
                      placeholder="500"
                      value={favorites}
                      onChange={(e) => setFavorites(e.target.value)}
                      className="input"
                    />
                  </div>
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Éditeur (DVD/Blu-ray)
                  </label>
                  <input
                    type="text"
                    placeholder="Crunchyroll SAS, KAZÉ..."
                    value={editeur}
                    onChange={(e) => setEditeur(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Site web officiel
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={siteWeb}
                    onChange={(e) => setSiteWeb(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Informations contextuelles */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Background / Informations contextuelles
                </label>
                <textarea
                  placeholder="Informations contextuelles sur l'anime..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="input"
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '100px' }}
                />
              </div>

              {/* Relations et franchise */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Relations et franchise
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Nom de la franchise
                    </label>
                    <input
                      type="text"
                      placeholder="Fate Series"
                      value={franchiseName}
                      onChange={(e) => setFranchiseName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Ordre dans la franchise
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={franchiseOrder}
                      onChange={(e) => setFranchiseOrder(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Prequel MAL ID
                    </label>
                    <input
                      type="number"
                      placeholder="12345"
                      value={prequelMalId}
                      onChange={(e) => setPrequelMalId(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Sequel MAL ID
                    </label>
                    <input
                      type="number"
                      placeholder="12346"
                      value={sequelMalId}
                      onChange={(e) => setSequelMalId(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Liens */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Liens
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                    URL MyAnimeList
                  </label>
                  <input
                    type="url"
                    placeholder="https://myanimelist.net/anime/12345"
                    value={malUrl}
                    onChange={(e) => setMalUrl(e.target.value)}
                    className="input"
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                    Liens externes (JSON)
                  </label>
                  <textarea
                    placeholder='[{"name": "Wikipedia", "url": "https://..."}]'
                    value={liensExternes}
                    onChange={(e) => setLiensExternes(e.target.value)}
                    className="input"
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                    Liens streaming (JSON)
                  </label>
                  <textarea
                    placeholder='[{"name": "Crunchyroll", "url": "https://..."}]'
                    value={liensStreaming}
                    onChange={(e) => setLiensStreaming(e.target.value)}
                    className="input"
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
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
      </Modal>
  );
}
