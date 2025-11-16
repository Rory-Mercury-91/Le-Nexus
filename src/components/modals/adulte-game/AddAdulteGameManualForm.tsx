import { ChevronDown, FolderOpen } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { AdulteGameMoteur } from '../../../types';

interface AddAdulteGameManualFormProps {
  titre: string;
  setTitre: (titre: string) => void;
  lienF95: string;
  setLienF95: (lien: string) => void;
  version: string;
  setVersion: (version: string) => void;
  moteur: AdulteGameMoteur | '';
  setMoteur: (moteur: AdulteGameMoteur | '') => void;
  statutJeu: string;
  setStatutJeu: (statut: string) => void;
  developpeur: string;
  setDeveloppeur: (developpeur: string) => void;
  couvertureUrl: string;
  setCouvertureUrl: (url: string) => void;
  tagsInput: string;
  setTagsInput: (tags: string) => void;
  versionTraduite: string;
  setVersionTraduite: (version: string) => void;
  typeTradFr: string;
  setTypeTradFr: (type: string) => void;
  traducteur: string;
  setTraducteur: (traducteur: string) => void;
  dragging: boolean;
  loading: boolean;
  onChooseCoverImage: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSubmit: (e: FormEvent) => void;
}

const STATUTS_JEU = {
  'EN COURS': '🎮 EN COURS',
  'TERMINÉ': '✅ TERMINÉ',
  'ABANDONNÉ': '❌ ABANDONNÉ'
};

/**
 * Formulaire manuel pour AddAdulteGameModal
 */
export default function AddAdulteGameManualForm({
  titre,
  setTitre,
  lienF95,
  setLienF95,
  version,
  setVersion,
  moteur,
  setMoteur,
  statutJeu,
  setStatutJeu,
  developpeur,
  setDeveloppeur,
  couvertureUrl,
  setCouvertureUrl,
  tagsInput,
  setTagsInput,
  versionTraduite,
  setVersionTraduite,
  typeTradFr,
  setTypeTradFr,
  traducteur,
  setTraducteur,
  dragging,
  loading,
  onChooseCoverImage,
  onDragOver,
  onDragLeave,
  onDrop,
  onSubmit
}: AddAdulteGameManualFormProps) {
  const [showTraductionSection, setShowTraductionSection] = useState(false);

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Titre (pleine largeur) */}
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

        {/* Lien (pleine largeur) */}
        <div>
          <label htmlFor="lien_f95" className="label">
            Lien <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
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

        {/* Ligne 3 colonnes : Statut du jeu | Version | Moteur */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {/* Statut du jeu */}
          <div>
            <label htmlFor="statut_jeu" className="label">
              Statut du jeu <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
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

          {/* Version */}
          <div>
            <label htmlFor="version" className="label">
              Version <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="input"
              placeholder="ex: v1.0"
              required
            />
          </div>

          {/* Moteur */}
          <div>
            <label htmlFor="moteur" className="label">
              Moteur <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="moteur"
              value={moteur}
              onChange={(e) => setMoteur(e.target.value as AdulteGameMoteur | '')}
              className="select"
              required
            >
              <option value="">-- Sélectionner --</option>
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

        {/* Développeur (pleine largeur) */}
        <div>
          <label htmlFor="developpeur" className="label">
            Développeur <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
          </label>
          <input
            type="text"
            id="developpeur"
            value={developpeur}
            onChange={(e) => setDeveloppeur(e.target.value)}
            className="input"
            placeholder="ex: WillTylor"
          />
        </div>

        {/* Tags (pleine largeur) */}
        <div>
          <label htmlFor="tags" className="label">
            Tags (séparés par des virgules) <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
          </label>
          <textarea
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="input"
            rows={3}
            placeholder="3DCG, Romance, Incest, ..."
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* URL couverture (pleine largeur) */}
        <div>
          <label htmlFor="couverture_url" className="label">
            URL de la couverture <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
          </label>
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px',
              border: dragging ? '2px dashed var(--primary)' : 'none',
              borderRadius: dragging ? '8px' : '0',
              padding: dragging ? '8px' : '0',
              background: dragging ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="text"
              id="couverture_url"
              value={couvertureUrl}
              onChange={(e) => setCouvertureUrl(e.target.value)}
              className="input"
              placeholder={dragging ? "Déposez l'image ici..." : "https://... ou chemin local"}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={onChooseCoverImage}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FolderOpen size={16} />
              Parcourir
            </button>
          </div>
        </div>

        {/* Section Traduction */}
        <div style={{
          border: showTraductionSection ? '1px solid var(--border)' : 'none',
          borderRadius: '8px',
          background: showTraductionSection ? 'var(--surface)' : 'transparent',
          padding: showTraductionSection ? '0' : '0'
        }}>
          <button
            type="button"
            onClick={() => setShowTraductionSection(!showTraductionSection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: showTraductionSection ? 'transparent' : 'var(--surface)',
              border: showTraductionSection ? 'none' : '1px solid var(--border)',
              borderBottom: showTraductionSection ? '1px solid var(--border)' : 'none',
              borderRadius: showTraductionSection ? '8px 8px 0 0' : '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌐 Informations de traduction <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
            </h3>
            <ChevronDown
              size={20}
              style={{
                color: 'var(--text-secondary)',
                transform: showTraductionSection ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            />
          </button>

          {showTraductionSection && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Ligne 1 : Version de la traduction | Type de traduction */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Version traduite */}
                <div>
                  <label htmlFor="version_traduite" className="label">
                    Version de la traduction
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

                {/* Type traduction */}
                <div>
                  <label htmlFor="type_trad_fr" className="label">
                    Type de traduction
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
              </div>

              {/* Traducteur */}
              <div>
                <label htmlFor="traducteur" className="label">
                  Traducteur
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
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Ajout en cours...' : 'Ajouter le jeu'}
        </button>
      </div>
    </form>
  );
}
