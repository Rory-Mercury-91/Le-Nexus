import { Languages, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import { useTranslation } from '../../../hooks/common/useTranslation';
import { RawgGameDetail } from '../../../hooks/details/useRawgGameDetail';
import CoverImageUpload from '../common/CoverImageUpload';
import Modal from '../common/Modal';
import ModalHeader from '../common/ModalHeader';
import { useModalEscape } from '../common/useModalEscape';

interface EditRawgGameModalProps {
  game: RawgGameDetail;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRawgGameModal({ game, onClose, onSuccess }: EditRawgGameModalProps) {
  const { showToast, ToastContainer } = useToast();
  const { translate, translating } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Valeurs initiales
  const [titre, setTitre] = useState(game.titre || '');
  const [description, setDescription] = useState(game.rawg_description || '');
  const [couvertureUrl, setCouvertureUrl] = useState(game.couverture_url || '');
  const [notesPrivees, setNotesPrivees] = useState(game.notes_privees || '');
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(game.tags) ? game.tags.join(', ') : (game.tags || '')
  );

  useModalEscape(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      showToast({
        title: 'Erreur',
        message: 'Le titre est requis',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      // Parser les tags
      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      const tagsJson = tagsArray.length > 0 ? JSON.stringify(tagsArray) : null;

      await window.electronAPI.updateAdulteGameGame(game.id, {
        titre: titre.trim(),
        rawg_description: description.trim() || null,
        couverture_url: couvertureUrl.trim() || null,
        notes_privees: notesPrivees.trim() || null,
        tags: tagsJson
      });

      showToast({
        title: 'Jeu modifié',
        message: 'Le jeu a été modifié avec succès',
        type: 'success'
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erreur modification jeu RAWG:', error);
      showToast({
        title: 'Erreur',
        message: error.message || 'Impossible de modifier le jeu',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <Modal
        onClickOverlay={onClose}
        maxWidth="1200px"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ModalHeader
            title="Modifier le jeu RAWG"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Colonne gauche : Image de couverture */}
              <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Image de couverture
                  </label>
                  <CoverImageUpload
                    imageUrl={couvertureUrl}
                    onImageChange={setCouvertureUrl}
                    itemTitle={titre}
                    mediaType="adulte-game"
                  />
                </div>

                {/* Informations RAWG (lecture seule) */}
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  marginTop: 'auto'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    Informations RAWG
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {game.rawgData?.released && (
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>Date de sortie:</span><br />
                        {new Date(game.rawgData.released).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                    {game.rawgData?.rating && (
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>Note RAWG:</span><br />
                        {game.rawgData.rating.toFixed(1)} / 5
                      </div>
                    )}
                    {game.rawgData?.metacritic && (
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>Metacritic:</span><br />
                        {game.rawgData.metacritic}
                      </div>
                    )}
                    {game.rawgData?.developers && game.rawgData.developers.length > 0 && (
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>Développeur:</span><br />
                        {game.rawgData.developers.map(d => d.name).join(', ')}
                      </div>
                    )}
                    {game.rawgData?.publishers && game.rawgData.publishers.length > 0 && (
                      <div>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>Éditeur:</span><br />
                        {game.rawgData.publishers.map(p => p.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Colonne droite : Formulaire */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                {/* Titre */}
                <div>
                  <label htmlFor="titre" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Titre <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    id="titre"
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    required
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      translate({
                        text: description || '',
                        onTranslated: (translatedText) => setDescription(translatedText),
                        minLength: 10,
                        errorMessage: 'La description est trop courte pour être traduite'
                      });
                    }}
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

                {/* Tags */}
                <div>
                  <label htmlFor="tags" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Ex: Action, Aventure, RPG"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Les tags seront combinés avec les genres et tags de RAWG
                  </p>
                </div>

                {/* Notes privées */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <label htmlFor="notes" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Notes privées
                  </label>
                  <textarea
                    id="notes"
                    value={notesPrivees}
                    onChange={(e) => setNotesPrivees(e.target.value)}
                    rows={8}
                    placeholder="Vos notes personnelles sur ce jeu..."
                    className="input"
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '150px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
