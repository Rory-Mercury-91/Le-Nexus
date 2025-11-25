import { ChevronDown, Search } from 'lucide-react';
import { FormEvent, useState, useRef, useEffect } from 'react';
import type { AdulteGameMoteur } from '../../../types';
import CoverImageUpload from '../common/CoverImageUpload';

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
  lienTraduction: string;
  setLienTraduction: (lien: string) => void;
  traducteursList: string[];
  loadingTraducteurs: boolean;
  loading: boolean;
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
  lienTraduction,
  setLienTraduction,
  traducteursList,
  loadingTraducteurs,
  loading,
  onSubmit
}: AddAdulteGameManualFormProps) {
  const [showTraductionSection, setShowTraductionSection] = useState(false);
  const [traducteurSearch, setTraducteurSearch] = useState('');
  const [showTraducteurSuggestions, setShowTraducteurSuggestions] = useState(false);
  const traducteurInputRef = useRef<HTMLInputElement>(null);
  const traducteurContainerRef = useRef<HTMLDivElement>(null);

  // Filtrer les traducteurs selon la recherche
  const filteredTraducteurs = traducteursList.filter(trad =>
    trad.toLowerCase().includes(traducteurSearch.toLowerCase())
  );

  // Gérer le clic en dehors pour fermer les suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        traducteurContainerRef.current &&
        !traducteurContainerRef.current.contains(event.target as Node)
      ) {
        setShowTraducteurSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTraducteur = (trad: string) => {
    setTraducteur(trad);
    setTraducteurSearch(trad);
    setShowTraducteurSuggestions(false);
    // Focus sur le champ après sélection
    if (traducteurInputRef.current) {
      traducteurInputRef.current.focus();
    }
  };

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
          <label className="label" style={{ marginBottom: '12px' }}>
            Couverture <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
          </label>
          <CoverImageUpload
            imageUrl={couvertureUrl}
            onImageChange={setCouvertureUrl}
            mediaType="adulte-game"
            itemTitle={titre || 'nouveau_jeu'}
            useDirectPath={true}
            onSelectImage={async () => {
              const result = await window.electronAPI.selectAdulteGameCoverImage();
              return result;
            }}
          />
        </div>

        {/* Section Traduction */}
        <div 
          className="card"
          style={{
            marginBottom: 0,
            padding: '0',
            overflow: 'hidden'
          }}
        >
          <div
            onClick={() => setShowTraductionSection(!showTraductionSection)}
            style={{
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: showTraductionSection ? '1px solid var(--border)' : 'none',
              userSelect: 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '20px' }}>🌐</span>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              margin: 0,
              flex: 1,
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: 'var(--text)'
            }}>
              <span>Informations de traduction</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
            </h3>
            <ChevronDown
              size={20}
              style={{
                color: 'var(--text-secondary)',
                transform: showTraductionSection ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }}
            />
          </div>

          {showTraductionSection && (
            <div style={{ 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px'
            }}>
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
                    <option value="Intégré">✨ Intégré</option>
                  </select>
                </div>
              </div>

              {/* Traducteur avec autocomplete */}
              <div ref={traducteurContainerRef} style={{ position: 'relative' }}>
                <label htmlFor="traducteur" className="label">
                  Traducteur
                </label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    ref={traducteurInputRef}
                    type="text"
                    id="traducteur"
                    value={traducteurSearch || traducteur}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTraducteurSearch(value);
                      // Si la valeur correspond exactement à un traducteur, l'assigner
                      if (traducteursList.includes(value)) {
                        setTraducteur(value);
                      } else {
                        // Sinon, garder la recherche mais vider le traducteur sélectionné
                        setTraducteur('');
                      }
                      setShowTraducteurSuggestions(value.length > 0);
                    }}
                    onFocus={() => {
                      if (traducteurSearch || !traducteur) {
                        setShowTraducteurSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Si le traducteur n'est pas sélectionné mais qu'on a tapé quelque chose, garder la valeur
                      if (traducteurSearch && !traducteursList.includes(traducteurSearch)) {
                        setTraducteur(traducteurSearch);
                      }
                      // Fermer les suggestions après un court délai pour permettre le clic
                      // Note: Pas besoin de cleanup ici car c'est un événement utilisateur ponctuel
                      window.setTimeout(() => setShowTraducteurSuggestions(false), 200);
                    }}
                    className="input"
                    placeholder={loadingTraducteurs ? 'Chargement...' : 'Rechercher un traducteur (ex: Rory)...'}
                    style={{ paddingLeft: '40px' }}
                    disabled={loadingTraducteurs}
                  />
                </div>

                {/* Suggestions autocomplete */}
                {showTraducteurSuggestions && filteredTraducteurs.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px var(--shadow)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}
                  >
                    {filteredTraducteurs.slice(0, 10).map((trad) => (
                      <div
                        key={trad}
                        onClick={() => handleSelectTraducteur(trad)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {trad}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lien de traduction */}
              <div>
                <label htmlFor="lien_traduction" className="label">
                  Lien de traduction <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(optionnel)</span>
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
