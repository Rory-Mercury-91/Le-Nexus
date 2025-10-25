import { useState, useEffect, FormEvent } from 'react';
import { X, FolderOpen } from 'lucide-react';
import type { AvnGame, AvnStatutPerso, AvnStatutJeu, AvnMoteur } from '../../../types';
import '../../../index.css';

interface EditAvnModalProps {
  game: AvnGame;
  onClose: () => void;
  onSave: () => void;
}

export default function EditAvnModal({ game, onClose, onSave }: EditAvnModalProps) {
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
        notes_privees: notesPrivees || null
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Erreur mise à jour jeu AVN:', error);
      alert('❌ Erreur lors de la mise à jour du jeu');
    } finally {
      setSaving(false);
    }
  };

  const handleChooseExecutable = async () => {
    try {
      // TODO: Implémenter la sélection de fichier via IPC
      alert('📁 Sélection de fichier à implémenter (file picker)');
    } catch (error) {
      console.error('Erreur sélection fichier:', error);
    }
  };

  return (
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
          maxWidth: '800px',
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
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Titre */}
            <div>
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
            <div>
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
            <div>
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

            {/* Statut personnel */}
            <div>
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

            {/* Couverture URL */}
            <div>
              <label htmlFor="couverture_url" className="label">
                URL de la couverture
              </label>
              <input
                type="url"
                id="couverture_url"
                value={couvertureUrl}
                onChange={(e) => setCouvertureUrl(e.target.value)}
                className="input"
                placeholder="https://..."
              />
            </div>

            {/* Lien F95Zone */}
            <div>
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
            <div>
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

            {/* Chemin executable */}
            <div>
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
            </div>

            {/* Tags */}
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
                rows={4}
                placeholder="Vos notes personnelles sur ce jeu..."
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
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
  );
}

