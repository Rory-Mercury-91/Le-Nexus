import EnrichmentConfigModal from '../common/EnrichmentConfigModal';
import { createAnimeEnrichmentConfig } from '../common/enrichment-config-helpers';

export interface EnrichmentConfig {
  enabled: boolean;
  imageSource: 'mal' | 'anilist' | 'tmdb';
  autoTranslate: boolean;
  fields: {
    // Titres alternatifs
    titre_romaji: boolean;
    titre_natif: boolean;
    titre_anglais: boolean;
    titres_alternatifs: boolean;

    // Métadonnées
    source: boolean;
    duree: boolean;
    saison_diffusion: boolean;
    date_debut: boolean;
    date_fin: boolean;
    en_cours_diffusion: boolean;

    // Classification
    themes: boolean;
    demographics: boolean;
    rating: boolean;
    score: boolean;

    // Production
    producteurs: boolean;
    diffuseurs: boolean;

    // Relations
    franchise: boolean;
  };
  [key: string]: unknown;
}

interface AnimeEnrichmentConfigModalProps {
  onClose: () => void;
  onSave: (config: EnrichmentConfig) => void;
}

export default function AnimeEnrichmentConfigModal({ onClose, onSave }: AnimeEnrichmentConfigModalProps) {
  const config = createAnimeEnrichmentConfig();

  return (
    <EnrichmentConfigModal
      config={config}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
