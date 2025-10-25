import { Languages, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Serie } from '../../../types';
import CoverImage from '../../common/CoverImage';

interface EditSerieModalProps {
  serie: Serie;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSerieModal({ serie, onClose, onSuccess }: EditSerieModalProps) {
  const [titre, setTitre] = useState(serie.titre);
  const [typeVolume, setTypeVolume] = useState(serie.type_volume);
  const [couvertureUrl, setCouvertureUrl] = useState(serie.couverture_url || '');
  const [description, setDescription] = useState(serie.description || '');
  const [statutPublication, setStatutPublication] = useState(serie.statut_publication || '');
  const [anneePublication, setAnneePublication] = useState(serie.annee_publication?.toString() || '');
  const [genres, setGenres] = useState(serie.genres || '');
  const [nbChapitres, setNbChapitres] = useState(serie.nb_chapitres?.toString() || '');
  const [langueOriginale, setLangueOriginale] = useState(serie.langue_originale || '');
  const [demographie, setDemographie] = useState(serie.demographie || '');
  const [editeur, setEditeur] = useState(serie.editeur || '');
  const [rating, setRating] = useState(serie.rating || '');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    
    const result = await window.electronAPI.uploadCustomCover(titre, 'serie');
    if (result.success && result.localPath) {
      setCouvertureUrl(result.localPath);
    }
  };

  const handleTranslate = async () => {
    if (!description || !description.trim()) {
      setMessage({ type: 'error', text: 'Aucune description à traduire' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (description.includes('traduit automatiquement') || description.includes('Synopsis français')) {
      setMessage({ type: 'error', text: 'Cette description semble déjà traduite' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setTranslating(true);
    setMessage(null);
    
    try {
      const result = await window.electronAPI.translateSerieDescription(serie.id);
      
      if (result.success && result.translatedDescription) {
        setDescription(result.translatedDescription);
        setMessage({ type: 'success', text: 'Description traduite avec succès !' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la traduction' });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      console.error('Erreur traduction:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la traduction' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) {
      return;
    }

    setSaving(true);
    try {
      await window.electronAPI.updateSerie(serie.id, {
        titre: titre.trim(),
        type_volume: typeVolume,
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
      console.error('Erreur lors de la modification de la série:', error);
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
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Modifier la série</h2>
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

        {/* Message de feedback */}
        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

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
              placeholder="Titre de la série"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: '600' }}>
                Description (optionnel)
              </label>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={translating || !description || description.trim() === ''}
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: translating ? 'var(--surface)' : 'var(--primary)',
                  opacity: translating || !description ? 0.6 : 1
                }}
              >
                <Languages size={14} />
                {translating ? 'Traduction...' : 'Traduire'}
              </button>
            </div>
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
                {typeVolume === 'Scan Manga' || typeVolume === 'Scan Webtoon' ? 'Nb de chapitres' : 'Nb de volumes'}
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
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
