import EnrichmentConfigModal from '../common/EnrichmentConfigModal';
import { createMangaEnrichmentConfig } from '../common/enrichment-config-helpers';

export interface EnrichmentConfig {
  enabled: boolean;
  autoTranslate: boolean;
  fields: {
    // Titres alternatifs
    titre_romaji: boolean;
    titre_natif: boolean;
    titre_anglais: boolean;
    titres_alternatifs: boolean;

    // Métadonnées de publication
    date_debut: boolean;
    date_fin: boolean;
    serialization: boolean;

    // Classification
    themes: boolean;
    demographics: boolean;
    genres: boolean;

    // Statistiques MAL
    score: boolean;
    rank: boolean;
    popularity: boolean;

    // Production
    auteurs: boolean;

    // Contenu
    synopsis: boolean;
    background: boolean;
  };
  [key: string]: unknown;
}

interface MangaEnrichmentConfigModalProps {
  onClose: () => void;
  onSave: (config: EnrichmentConfig) => void;
}

export default function MangaEnrichmentConfigModal({ onClose, onSave }: MangaEnrichmentConfigModalProps) {
  const config = createMangaEnrichmentConfig();

  return (
    <EnrichmentConfigModal
      config={config}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
