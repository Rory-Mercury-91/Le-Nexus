import { X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useToast } from '../../../hooks/common/useToast';
import '../../../index.css';
import type { AdulteGame } from '../../../types';
import CoverImageUpload from '../common/CoverImageUpload';
import Modal from '../common/Modal';

interface EditAdulteGameModalProps {
  game: AdulteGame;
  onClose: () => void;
  onSave: () => void;
}

// Dictionnaire des statuts de jeu avec émoticônes
const STATUTS_JEU = {
  'EN COURS': '🎮 EN COURS',
  'TERMINÉ': '✅ TERMINÉ',
  'ABANDONNÉ': '❌ ABANDONNÉ'
};

export default function EditAdulteGameModal({ game, onClose, onSave }: EditAdulteGameModalProps) {
  const { showToast, ToastContainer } = useToast();
  
  // Tous les champs sont éditables
  const [titre, setTitre] = useState(game.titre);
  const [version, setVersion] = useState(game.version || '');
  const [statutJeu, setStatutJeu] = useState(game.statut_jeu || '');
  const [developpeur, setDeveloppeur] = useState(game.developpeur || '');
  const [couvertureUrl, setCouvertureUrl] = useState(game.couverture_url || '');
  const [tagsInput, setTagsInput] = useState(game.tags?.join(', ') || '');
  const [versionTraduite, setVersionTraduite] = useState(game.version_traduite || '');
  const [typeTradFr, setTypeTradFr] = useState(game.type_trad_fr || '');
  const [traducteur, setTraducteur] = useState(game.traducteur || '');
  const [saving, setSaving] = useState(false);

  // Fonction helper pour déterminer le nom du site dynamiquement
  const getSiteName = (): string => {
    // Utiliser game_site en priorité (nouveau champ)
    if (game.game_site) {
      return game.game_site;
    }
    // Fallback sur plateforme (alias)
    if (game.plateforme) {
      return game.plateforme;
    }
    // Détecter depuis les liens
    if (game.lien_lewdcorner || game.Lewdcorner_thread_id) {
      return 'LewdCorner';
    }
    if (game.lien_f95 || game.f95_thread_id) {
      if (game.lien_f95?.includes('lewdcorner.com')) {
        return 'LewdCorner';
      }
      return 'F95Zone';
    }
    return 'Autre';
  };

  // Lien généré depuis l'ID (affiché mais non éditable directement car basé sur l'ID)
  const siteName = getSiteName();
  const lienF95 = game.lien_f95 || game.lien_lewdcorner || (
    siteName === 'LewdCorner' && game.Lewdcorner_thread_id
      ? `https://lewdcorner.com/threads/${game.Lewdcorner_thread_id}/`
      : game.f95_thread_id
        ? `https://f95zone.to/threads/${game.f95_thread_id}/`
        : ''
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);

      const tagsArray = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Mettre à jour traductions_multiples si modifié
      let traductionsMultiples = game.traductions_multiples;
      try {
        if (traductionsMultiples) {
          const traductions = JSON.parse(traductionsMultiples);
          // Mettre à jour la première traduction active (ou la première tout court)
          const activeIndex = traductions.findIndex((t: any) => t.actif === true);
          const indexToUpdate = activeIndex >= 0 ? activeIndex : 0;
          
          if (traductions[indexToUpdate]) {
            traductions[indexToUpdate].version = versionTraduite || traductions[indexToUpdate].version;
            traductions[indexToUpdate].type = typeTradFr || traductions[indexToUpdate].type;
            traductions[indexToUpdate].traducteur = traducteur || traductions[indexToUpdate].traducteur;
            traductionsMultiples = JSON.stringify(traductions);
          }
        }
      } catch (e) {
        console.error('Erreur parsing traductions_multiples:', e);
      }

      await window.electronAPI.updateAdulteGameGame(game.id, {
        titre,
        version: version || null,
        statut_jeu: statutJeu || null,
        developpeur: developpeur || null,
        couverture_url: couvertureUrl || null,
        tags: tagsArray,
        version_traduite: versionTraduite || null,
        type_trad_fr: typeTradFr || null,
        traducteur: traducteur || null,
        traductions_multiples: traductionsMultiples
      });

      showToast({
        title: 'Jeu modifié',
        message: `"${titre}" a été mis à jour`,
        type: 'success'
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Erreur mise à jour jeu adulte:', error);
      showToast({
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour du jeu',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      {ToastContainer}
      <Modal maxWidth="1100px" maxHeight="90vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClickOverlay={onClose}>
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
              ✏️ Éditer {titre}
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
            id="adulte-game-edit-form"
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
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Informations principales
                  </h3>

                  {/* Titre */}
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="titre" className="label">
                      Titre <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis Google Sheet)</span>
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
                      Version <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis Google Sheet)</span>
                    </label>
                    <input
                      type="text"
                      id="version"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="input"
                      placeholder="ex: v1.0"
                    />
                  </div>

                  {/* Développeur */}
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="developpeur" className="label">
                      Développeur <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis F95)</span>
                    </label>
                    <input
                      type="text"
                      id="developpeur"
                      value={developpeur}
                      onChange={(e) => setDeveloppeur(e.target.value)}
                      className="input"
                      placeholder="Nom du studio ou auteur"
                    />
                  </div>

                  {/* Statut du jeu */}
                  <div>
                    <label htmlFor="statut_jeu" className="label">
                      Statut du jeu <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis {siteName})</span>
                    </label>
                    <select
                      id="statut_jeu"
                      value={statutJeu}
                      onChange={(e) => setStatutJeu(e.target.value)}
                      className="select"
                    >
                      <option value="">-- Non défini --</option>
                      {Object.entries(STATUTS_JEU).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section : Couverture */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🖼️ Couverture
                  </h3>
                  <CoverImageUpload
                    imageUrl={couvertureUrl}
                    onImageChange={setCouvertureUrl}
                    mediaType="adulte-game"
                    itemTitle={titre}
                    useDirectPath={true}
                    onSelectImage={async () => {
                      const result = await window.electronAPI.selectAdulteGameCoverImage();
                      return result;
                    }}
                  />
                </div>
              </div>

              {/* ========== COLONNE DROITE ========== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Section : Liens */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔗 Liens
                  </h3>

                  {/* Lien (généré depuis l'ID) */}
                  <div>
                    <label className="label">
                      {siteName} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(créé depuis l'ID)</span>
                    </label>
                    <div style={{
                      padding: '10px 12px',
                      background: 'var(--surface-light)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      color: 'var(--text)'
                    }}>
                      {lienF95 ? (
                        <a 
                          href={lienF95} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                        >
                          {lienF95}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Non disponible</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section : Traduction */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌐 Traduction
                  </h3>

                  {/* Version de la traduction */}
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="version_traduite" className="label">
                      Version de la traduction <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis Google Sheet)</span>
                    </label>
                    <input
                      type="text"
                      id="version_traduite"
                      value={versionTraduite}
                      onChange={(e) => setVersionTraduite(e.target.value)}
                      className="input"
                      placeholder="ex: v1.0 FR"
                    />
                  </div>

                  {/* Type de traduction */}
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="type_trad_fr" className="label">
                      Type de traduction <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis Google Sheet)</span>
                    </label>
                    <select
                      id="type_trad_fr"
                      value={typeTradFr}
                      onChange={(e) => setTypeTradFr(e.target.value)}
                      className="select"
                    >
                      <option value="">-- Non défini --</option>
                      <option value="Traduction Humaine">👤 Traduction Humaine</option>
                      <option value="Traduction Automatique">🤖 Traduction Automatique</option>
                      <option value="Traduction Semi-Automatique">🤖👤 Traduction Semi-Automatique</option>
                    </select>
                  </div>

                  {/* Traducteur */}
                  <div>
                    <label htmlFor="traducteur" className="label">
                      Traducteur <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(récupéré depuis Google Sheet)</span>
                    </label>
                    <input
                      type="text"
                      id="traducteur"
                      value={traducteur}
                      onChange={(e) => setTraducteur(e.target.value)}
                      className="input"
                      placeholder="ex: Rory-Mercury91"
                    />
                  </div>
                </div>

                {/* Section : Tags */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏷️ Tags
                  </h3>

                  <div>
                    <label htmlFor="tags" className="label">
                      Tags (séparés par des virgules)
                    </label>
                    <textarea
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="input"
                      rows={4}
                      placeholder="3DCG, Romance, Incest, ..."
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Exemple : 3DCG, Romance, Harem, Milf
                    </p>
                  </div>
                </div>

                {/* Info supplémentaire */}
                <div style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                    ℹ️ <strong>Info :</strong> Les valeurs affichées proviennent de Google Sheet (titre, versions, traducteur) et {siteName} (statut du jeu). Vous pouvez modifier tous les champs si nécessaire, mais les prochaines synchronisations automatiques écraseront certaines valeurs avec les données des sources externes.
                  </p>
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
              className="btn"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="adulte-game-edit-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
      </Modal>
    </>
  );
}
