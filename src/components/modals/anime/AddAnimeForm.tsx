import { Languages, Loader2, Upload } from 'lucide-react';
import { DragEvent, FormEvent } from 'react';
import CoverImage from '../../common/CoverImage';

interface AnimeFormData {
  titre: string;
  titre_en: string;
  type: 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special';
  statut: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
  nb_episodes: number;
  annee: number;
  score: number;
  synopsis: string;
  image_url: string;
  genres: string;
  mal_id: number;
}

interface AddAnimeFormProps {
  formData: AnimeFormData;
  setFormData: (data: AnimeFormData) => void;
  dragging: boolean;
  translating: boolean;
  saving: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onUploadImage: () => void;
  onTranslateSynopsis: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

/**
 * Formulaire manuel pour AddAnimeModal
 */
export default function AddAnimeForm({
  formData,
  setFormData,
  dragging,
  translating,
  saving,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadImage,
  onTranslateSynopsis,
  onSubmit,
  onCancel
}: AddAnimeFormProps) {
  return (
    <form onSubmit={onSubmit}>
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
            onClick={onUploadImage}
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
                onClick={onTranslateSynopsis}
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
          onClick={onCancel}
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
  );
}
