import { Upload } from 'lucide-react';
import { DragEvent, FormEvent } from 'react';
import CoverImage from '../../common/CoverImage';

interface MangaFormData {
  titre: string;
  statut: 'En cours' | 'Terminée' | 'Abandonnée';
  typeVolume: 'Broché' | 'Kindle' | 'Webtoon' | 'Broché Collector' | 'Coffret' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon';
  couvertureUrl: string;
  description: string;
  statutPublication: string;
  anneePublication: string;
  genres: string;
  nbVolumes: string;
  nbChapitres: string;
  langueOriginale: string;
  demographie: string;
  editeur: string;
  malId: string;
}

interface AddSerieFormProps {
  formData: MangaFormData;
  setFormData: (data: MangaFormData) => void;
  dragging: boolean;
  saving: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onUploadImage: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

/**
 * Formulaire complet pour AddSerieModal
 */
export default function AddSerieForm({
  formData,
  setFormData,
  dragging,
  saving,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadImage,
  onSubmit,
  onCancel
}: AddSerieFormProps) {
  return (
    <form onSubmit={onSubmit}>
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
                : formData.couvertureUrl 
                  ? '2px solid var(--border)' 
                  : '2px dashed var(--border)',
              overflow: 'hidden',
              background: dragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s',
              position: 'relative',
              cursor: 'pointer'
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
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
            ) : formData.couvertureUrl ? (
              <CoverImage
                src={formData.couvertureUrl}
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
            onClick={onUploadImage}
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
              value={formData.couvertureUrl}
              onChange={(e) => setFormData({ ...formData, couvertureUrl: e.target.value })}
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
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
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
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
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
                value={formData.typeVolume}
                onChange={(e) => setFormData({ ...formData, typeVolume: e.target.value as any })}
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
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                value={formData.anneePublication}
                onChange={(e) => setFormData({ ...formData, anneePublication: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Nb de volumes
              </label>
              <input
                type="number"
                placeholder="14"
                value={formData.nbVolumes}
                onChange={(e) => setFormData({ ...formData, nbVolumes: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Nb de chapitres
              </label>
              <input
                type="number"
                placeholder="102"
                value={formData.nbChapitres}
                onChange={(e) => setFormData({ ...formData, nbChapitres: e.target.value })}
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
                value={formData.statutPublication}
                onChange={(e) => setFormData({ ...formData, statutPublication: e.target.value })}
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
                value={formData.demographie}
                onChange={(e) => setFormData({ ...formData, demographie: e.target.value })}
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
                value={formData.langueOriginale}
                onChange={(e) => setFormData({ ...formData, langueOriginale: e.target.value })}
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
              value={formData.editeur}
              onChange={(e) => setFormData({ ...formData, editeur: e.target.value })}
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
              value={formData.genres}
              onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
              className="input"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              MAL ID (optionnel, recommandé pour enrichissement)
            </label>
            <input
              type="number"
              placeholder="85781"
              value={formData.malId}
              onChange={(e) => setFormData({ ...formData, malId: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onCancel}
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
  );
}
