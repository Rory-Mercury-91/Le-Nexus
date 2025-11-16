import { Languages, Upload } from 'lucide-react';
import { FormEvent } from 'react';
import { Serie } from '../../../types';
import { organizeMangaTitles } from '../../../utils/manga-titles';
import CoverImage from '../../common/CoverImage';

interface EditSerieFormData {
  titre: string;
  typeVolume: 'Broché' | 'Kindle' | 'Webtoon' | 'Broché Collector' | 'Coffret' | 'Webtoon Physique' | 'Light Novel' | 'Scan Manga' | 'Scan Webtoon' | 'Numérique';
  couvertureUrl: string;
  description: string;
  statutPublication: string;
  statutPublicationVf: string;
  anneePublication: string;
  anneeVf: string;
  genres: string;
  nbChapitres: string;
  nbChapitresVf: string;
  nbVolumes: string;
  nbVolumesVf: string;
  langueOriginale: string;
  demographie: string;
  editeur: string;
  editeurVo: string;
  themes: string;
  serialization: string;
  auteurs: string;
  titresAlternatifs: string; // Champ unifié pour tous les titres alternatifs (Nautiljon + MAL)
  mediaType: string;
  dateDebut: string;
  dateFin: string;
  malId: string;
  scoreMal: string;
  rankMal: string;
  popularityMal: string;
  background: string;
  prequelMalId: string;
  sequelMalId: string;
}

interface EditSerieFormProps {
  formData: EditSerieFormData;
  setFormData: (data: EditSerieFormData) => void;
  saving: boolean;
  translating: boolean;
  translatingBackground: boolean;
  onUploadImage: () => void;
  onTranslate: () => void;
  onTranslateBackground: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  message: { type: 'success' | 'error'; text: string } | null;
  serie?: Serie; // Pour organiser les titres
}

/**
 * Formulaire complet pour EditSerieModal
 */
export default function EditSerieForm({
  formData,
  setFormData,
  saving,
  translating,
  translatingBackground,
  onUploadImage,
  onTranslate,
  onTranslateBackground,
  onSubmit,
  onCancel,
  message,
  serie
}: EditSerieFormProps) {
  // Organiser les titres pour l'affichage si on a la série complète
  const organizedTitles = serie ? organizeMangaTitles(serie) : null;
  
  return (
    <>
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

      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Colonne image */}
          <div style={{ width: '200px', flexShrink: 0 }}>
            <div style={{
              width: '100%',
              height: '280px',
              borderRadius: '8px',
              border: formData.couvertureUrl ? '2px solid var(--border)' : '2px dashed var(--border)',
              overflow: 'hidden'
            }}>
              {formData.couvertureUrl ? (
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
              {organizedTitles && organizedTitles.mainTitle !== formData.titre && (
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  💡 Le titre principal affiché sera : {organizedTitles.mainTitle}
                </p>
              )}
            </div>

            {/* Section d'affichage des titres organisés */}
            {organizedTitles && organizedTitles.alternativeTitles.length > 0 && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '8px'
                }}>
                  Titres alternatifs (affichage)
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {organizedTitles.alternativeTitles.join(' // ')}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Les titres sont organisés automatiquement : titre français (Nautiljon) en priorité, puis titre original et autres titres alternatifs.
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600' }}>
                  Description (optionnel)
                </label>
                <button
                  type="button"
                  onClick={onTranslate}
                  disabled={translating || !formData.description || formData.description.trim() === ''}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: translating ? 'var(--surface)' : 'var(--primary)',
                    opacity: translating || !formData.description ? 0.6 : 1
                  }}
                >
                  <Languages size={14} />
                  {translating ? 'Traduction...' : 'Traduire'}
                </button>
              </div>
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
                  Année VO
                </label>
                <input
                  type="number"
                  placeholder="2014"
                  value={formData.anneePublication}
                  onChange={(e) => setFormData({ ...formData, anneePublication: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Année VF
                </label>
                <input
                  type="number"
                  placeholder="2017"
                  value={formData.anneeVf}
                  onChange={(e) => setFormData({ ...formData, anneeVf: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Nb de volumes VO
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
                  Nb de volumes VF
                </label>
                <input
                  type="number"
                  placeholder="14"
                  value={formData.nbVolumesVf}
                  onChange={(e) => setFormData({ ...formData, nbVolumesVf: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Nb de chapitres VO
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
                  Nb de chapitres VF
                </label>
                <input
                  type="number"
                  placeholder="102"
                  value={formData.nbChapitresVf}
                  onChange={(e) => setFormData({ ...formData, nbChapitresVf: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Statut publication VO
                </label>
                <input
                  type="text"
                  placeholder="En cours"
                  value={formData.statutPublication}
                  onChange={(e) => setFormData({ ...formData, statutPublication: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Statut publication VF
                </label>
                <input
                  type="text"
                  placeholder="Terminée"
                  value={formData.statutPublicationVf}
                  onChange={(e) => setFormData({ ...formData, statutPublicationVf: e.target.value })}
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
                Éditeur VO
              </label>
              <input
                type="text"
                placeholder="Enterbrain / Kodansha..."
                value={formData.editeurVo}
                onChange={(e) => setFormData({ ...formData, editeurVo: e.target.value })}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Thèmes
                </label>
                <input
                  type="text"
                  placeholder="Gastronomie, Monstres"
                  value={formData.themes}
                  onChange={(e) => setFormData({ ...formData, themes: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Prépublication (Serialization)
                </label>
                <input
                  type="text"
                  placeholder="Harta, Shonen Jump..."
                  value={formData.serialization}
                  onChange={(e) => setFormData({ ...formData, serialization: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Auteurs
              </label>
              <input
                type="text"
                placeholder="Kui, Ryouko"
                value={formData.auteurs}
                onChange={(e) => setFormData({ ...formData, auteurs: e.target.value })}
                className="input"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Titres alternatifs
              </label>
              <textarea
                placeholder="Séparez les titres par ' // '&#10;Ex: Hachi-nan tte, Sore wa Nai deshou! // 八男って、それはないでしょう! // The 8th Son? Are You Kidding Me? // Eighth son, I don't think so!"
                value={formData.titresAlternatifs}
                onChange={(e) => setFormData({ ...formData, titresAlternatifs: e.target.value })}
                className="input"
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Tous les titres alternatifs (Nautiljon et MAL) fusionnés. Séparez les titres par " // "
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Type de média</label>
                <select value={formData.mediaType} onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })} className="select">
                  <option value="">--</option>
                  <option value="Manga">Manga</option>
                  <option value="Manhwa">Manhwa</option>
                  <option value="Manhua">Manhua</option>
                  <option value="Light Novel">Light Novel</option>
                  <option value="Novel">Novel</option>
                  <option value="Webtoon">Webtoon</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Date début publication</label>
                <input type="date" value={formData.dateDebut} onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Date fin publication</label>
                <input type="date" value={formData.dateFin} onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })} className="input" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>MAL ID</label>
                <input type="number" placeholder="12345" value={formData.malId} onChange={(e) => setFormData({ ...formData, malId: e.target.value })} className="input" />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ID MyAnimeList pour enrichissement
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Score MAL</label>
                <input type="number" step="0.01" placeholder="8.50" value={formData.scoreMal} onChange={(e) => setFormData({ ...formData, scoreMal: e.target.value })} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Rank MAL</label>
                <input type="number" placeholder="1234" value={formData.rankMal} onChange={(e) => setFormData({ ...formData, rankMal: e.target.value })} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Popularité MAL</label>
                <input type="number" placeholder="5678" value={formData.popularityMal} onChange={(e) => setFormData({ ...formData, popularityMal: e.target.value })} className="input" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Prequel MAL ID</label>
                <input type="number" placeholder="12345" value={formData.prequelMalId} onChange={(e) => setFormData({ ...formData, prequelMalId: e.target.value })} className="input" />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ID MyAnimeList du préquel
                </p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Sequel MAL ID</label>
                <input type="number" placeholder="12345" value={formData.sequelMalId} onChange={(e) => setFormData({ ...formData, sequelMalId: e.target.value })} className="input" />
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ID MyAnimeList de la suite
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: '600' }}>
                  Background (historique/description détaillée)
                </label>
                <button
                  type="button"
                  onClick={onTranslateBackground}
                  disabled={translatingBackground || !formData.background || formData.background.trim() === ''}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: translatingBackground ? 'var(--surface)' : 'var(--primary)',
                    opacity: translatingBackground || !formData.background ? 0.6 : 1
                  }}
                >
                  <Languages size={14} />
                  {translatingBackground ? 'Traduction...' : 'Traduire'}
                </button>
              </div>
              <textarea
                placeholder="Informations contextuelles sur l'œuvre..."
                value={formData.background}
                onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                className="input"
                rows={4}
                style={{ resize: 'vertical', minHeight: '100px' }}
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
              'Enregistrer'
            )}
          </button>
        </div>
      </form>
    </>
  );
}
