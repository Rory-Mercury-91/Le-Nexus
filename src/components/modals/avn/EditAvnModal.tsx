import { FolderOpen, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import '../../../index.css';
import type { AvnGame, AvnMoteur, AvnStatutJeu, AvnStatutPerso, AvnStatutTraduction, AvnTypeTraduction } from '../../../types';
import CoverImage from '../../common/CoverImage';

interface EditAvnModalProps {
  game: AvnGame;
  onClose: () => void;
  onSave: () => void;
}

export default function EditAvnModal({ game, onClose, onSave }: EditAvnModalProps) {
  const { showToast, ToastContainer } = useToast();
  const [titre, setTitre] = useState(game.titre);
  const [version, setVersion] = useState(game.version || '');
  const [statutJeu, setStatutJeu] = useState<AvnStatutJeu | ''>(game.statut_jeu || '');
  const [moteur, setMoteur] = useState<AvnMoteur | ''>(game.moteur || '');
  const [couvertureUrl, setCouvertureUrl] = useState(game.couverture_url || '');
  const [statutPerso, setStatutPerso] = useState<AvnStatutPerso | ''>(game.statut_perso || '');
  const [lienF95, setLienF95] = useState(game.lien_f95 || '');
  const [lienTraduction, setLienTraduction] = useState(game.lien_traduction || '');
  const [lienJeu, setLienJeu] = useState(game.lien_jeu || '');
  const [cheminExecutable, setCheminExecutable] = useState(game.chemin_executable || '');
  const [notesPrivees, setNotesPrivees] = useState(game.notes_privees || '');
  const [tagsInput, setTagsInput] = useState(game.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  
  // Champs de traduction
  const [versionTraduction, setVersionTraduction] = useState(game.version_traduction || '');
  const [statutTraduction, setStatutTraduction] = useState<AvnStatutTraduction | ''>(game.statut_traduction || '');
  const [typeTraduction, setTypeTraduction] = useState<AvnTypeTraduction | ''>(game.type_traduction || '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await window.electronAPI.updateAvnGame(game.id, {
        titre,
        version: version || null,
        statut_jeu: statutJeu || null,
        moteur: moteur || null,
        couverture_url: couvertureUrl || null,
        tags: tagsArray,
        statut_perso: statutPerso || null,
        lien_f95: lienF95 || null,
        lien_traduction: lienTraduction || null,
        lien_jeu: lienJeu || null,
        chemin_executable: cheminExecutable || null,
        notes_privees: notesPrivees || null,
        version_traduction: versionTraduction || null,
        statut_traduction: statutTraduction || null,
        type_traduction: typeTraduction || null
      });

      showToast({
        title: 'Jeu modifié',
        message: `"${titre}" a été mis à jour`,
        type: 'success'
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Erreur mise à jour jeu AVN:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour du jeu',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChooseExecutable = async () => {
    try {
      const result = await window.electronAPI.selectAvnExecutable();
      if (result.success && result.path) {
        setCheminExecutable(result.path);
        showToast({
          title: 'Exécutable sélectionné',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur sélection fichier:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la sélection du fichier',
        type: 'error'
      });
    }
  };

  const handleChooseCoverImage = async () => {
    try {
      const result = await window.electronAPI.selectAvnCoverImage();
      if (result.success && result.path) {
        // Le backend retourne déjà un chemin manga:// ou un chemin relatif
        // On utilise directement result.path
        setCouvertureUrl(result.path);
        showToast({
          title: 'Image sélectionnée',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la sélection de l\'image',
        type: 'error'
      });
    }
  };

  return (
    <>
      <ToastContainer />
      <div
        style={{
          position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header fixe */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            ✏️ Éditer {game.titre}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <form
          id="avn-edit-form"
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* ========== COLONNE GAUCHE ========== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section : Informations principales */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  📋 Informations principales
                </h3>

                {/* Titre */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="titre" className="label">
                    Titre <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="titre"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                {/* Version */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="version" className="label">
                    Version
                  </label>
                  <input
                    type="text"
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="input"
                    placeholder="ex: v0.5.2"
                  />
                </div>

                {/* Statut du jeu */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="statut_jeu" className="label">
                    Statut du jeu
                  </label>
                  <select
                    id="statut_jeu"
                    value={statutJeu}
                    onChange={(e) => setStatutJeu(e.target.value as AvnStatutJeu | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="EN COURS">EN COURS</option>
                    <option value="TERMINÉ">TERMINÉ</option>
                    <option value="ABANDONNÉ">ABANDONNÉ</option>
                  </select>
                </div>

                {/* Moteur */}
                <div>
                  <label htmlFor="moteur" className="label">
                    Moteur
                  </label>
                  <select
                    id="moteur"
                    value={moteur}
                    onChange={(e) => setMoteur(e.target.value as AvnMoteur | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="RenPy">RenPy</option>
                    <option value="Unity">Unity</option>
                    <option value="RPGM">RPGM</option>
                    <option value="Unreal">Unreal</option>
                    <option value="HTML">HTML</option>
                    <option value="Flash">Flash</option>
                    <option value="QSP">QSP</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Section : Couverture */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  🖼️ Couverture
                </h3>

                {/* Aperçu */}
                {couvertureUrl && (
                  <div style={{
                    marginBottom: '12px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid var(--border)'
                  }}>
                    <CoverImage
                      src={couvertureUrl}
                      alt="Aperçu couverture"
                      style={{
                        width: '100%',
                        maxHeight: '250px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}

                {/* URL Couverture */}
                <div>
                  <label htmlFor="couverture_url" className="label">
                    URL de la couverture
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      id="couverture_url"
                      value={couvertureUrl}
                      onChange={(e) => setCouvertureUrl(e.target.value)}
                      className="input"
                      placeholder="https://... ou chemin local"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleChooseCoverImage}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FolderOpen size={16} />
                      Parcourir
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    💡 Collez une URL ou sélectionnez une image locale HD
                  </p>
                </div>
              </div>

              {/* Section : Tags */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  🏷️ Tags
                </h3>

                <div>
                  <label htmlFor="tags" className="label">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="input"
                    placeholder="3DCG, Romance, Incest, ..."
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Exemple : 3DCG, Romance, Harem, Milf
                  </p>
                </div>
              </div>
            </div>

            {/* ========== COLONNE DROITE ========== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section : Liens */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  🔗 Liens
                </h3>

                {/* Lien F95Zone */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="lien_f95" className="label">
                    Lien F95Zone
                  </label>
                  <input
                    type="url"
                    id="lien_f95"
                    value={lienF95}
                    onChange={(e) => setLienF95(e.target.value)}
                    className="input"
                    placeholder="https://f95zone.to/threads/..."
                  />
                </div>

                {/* Lien traduction */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="lien_traduction" className="label">
                    Lien traduction française
                  </label>
                  <input
                    type="url"
                    id="lien_traduction"
                    value={lienTraduction}
                    onChange={(e) => setLienTraduction(e.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </div>

                {/* Lien download */}
                <div>
                  <label htmlFor="lien_jeu" className="label">
                    Lien de téléchargement
                  </label>
                  <input
                    type="url"
                    id="lien_jeu"
                    value={lienJeu}
                    onChange={(e) => setLienJeu(e.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Section : Traduction */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  🌐 Traduction
                </h3>

                {/* Version de la traduction */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="version_traduction" className="label">
                    Version de la traduction
                  </label>
                  <input
                    type="text"
                    id="version_traduction"
                    value={versionTraduction}
                    onChange={(e) => setVersionTraduction(e.target.value)}
                    className="input"
                    placeholder="v1.0 FR"
                  />
                </div>

                {/* Statut de traduction */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="statut_traduction" className="label">
                    Statut de traduction
                  </label>
                  <select
                    id="statut_traduction"
                    value={statutTraduction}
                    onChange={(e) => setStatutTraduction(e.target.value as AvnStatutTraduction | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="Traduction">Traduction</option>
                    <option value="Traduction (Mod inclus)">Traduction (Mod inclus)</option>
                    <option value="Traduction intégré">Traduction intégré</option>
                  </select>
                </div>

                {/* Type de traduction */}
                <div>
                  <label htmlFor="type_traduction" className="label">
                    Type de traduction
                  </label>
                  <select
                    id="type_traduction"
                    value={typeTraduction}
                    onChange={(e) => setTypeTraduction(e.target.value as AvnTypeTraduction | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="Manuelle">Manuelle</option>
                    <option value="Semi-automatique">Semi-automatique</option>
                    <option value="Automatique">Automatique</option>
                    <option value="VO française">VO française</option>
                  </select>
                </div>
              </div>

              {/* Section : Paramètres personnels */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)' }}>
                  👤 Paramètres personnels
                </h3>

                {/* Statut personnel */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="statut_perso" className="label">
                    Mon statut
                  </label>
                  <select
                    id="statut_perso"
                    value={statutPerso}
                    onChange={(e) => setStatutPerso(e.target.value as AvnStatutPerso | '')}
                    className="select"
                  >
                    <option value="">-- Non défini --</option>
                    <option value="À jouer">À jouer</option>
                    <option value="En cours">En cours</option>
                    <option value="Complété">Complété</option>
                    <option value="Abandonné">Abandonné</option>
                  </select>
                </div>

                {/* Chemin executable */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="chemin_executable" className="label">
                    Chemin de l'exécutable
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      id="chemin_executable"
                      value={cheminExecutable}
                      onChange={(e) => setCheminExecutable(e.target.value)}
                      className="input"
                      placeholder="C:\Games\MyGame\game.exe"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleChooseExecutable}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FolderOpen size={16} />
                      Parcourir
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    💡 Permet de lancer le jeu directement depuis l'app
                  </p>
                </div>

                {/* Notes privées */}
                <div>
                  <label htmlFor="notes_privees" className="label">
                    Notes privées
                  </label>
                  <textarea
                    id="notes_privees"
                    value={notesPrivees}
                    onChange={(e) => setNotesPrivees(e.target.value)}
                    className="input"
                    rows={6}
                    placeholder="Vos notes personnelles sur ce jeu..."
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer fixe */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            type="submit"
            form="avn-edit-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
