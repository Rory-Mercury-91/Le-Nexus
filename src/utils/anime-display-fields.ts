/**
 * Configuration partagée des champs d'affichage pour les animés
 * Utilisée par le modal global (Settings) et le modal local (AnimeDetail)
 */

export type AnimeDisplayFieldKey = 
  | 'couverture'
  | 'titres_alternatifs'
  | 'description'
  | 'statut_diffusion'
  | 'date_debut'
  | 'date_fin'
  | 'date_sortie_vf'
  | 'saison_diffusion'
  | 'type'
  | 'demographie'
  | 'rating'
  | 'genres'
  | 'themes'
  | 'source'
  | 'studios'
  | 'producteurs'
  | 'diffuseurs'
  | 'mal_block'
  | 'relations'
  | 'liens_externes'
  | 'liens_streaming'
  | 'episodes'
  | 'badges';

export interface AnimeDisplayField {
  key: AnimeDisplayFieldKey;
  label: string;
}

export interface AnimeDisplayFieldCategory {
  title: string;
  icon: string;
  fields: AnimeDisplayField[];
}

/**
 * Catégories de champs pour l'affichage organisé (modal global)
 */
export const ANIME_DISPLAY_FIELD_CATEGORIES: AnimeDisplayFieldCategory[] = [
  {
    title: 'Présentation',
    icon: '🎬',
    fields: [
      { key: 'couverture', label: 'Couverture & statut' },
      { key: 'titres_alternatifs', label: 'Titres alternatifs' },
      { key: 'description', label: 'Synopsis' }
    ]
  },
  {
    title: 'Diffusion',
    icon: '⏱️',
    fields: [
      { key: 'statut_diffusion', label: 'Statut de diffusion' },
      { key: 'date_debut', label: 'Date de début VO' },
      { key: 'date_fin', label: 'Date de fin VO' },
      { key: 'date_sortie_vf', label: 'Date de sortie VF' },
      { key: 'saison_diffusion', label: 'Saison de diffusion' }
    ]
  },
  {
    title: 'Classification',
    icon: '🏷️',
    fields: [
      { key: 'type', label: 'Type (TV, OVA, Movie...)' },
      { key: 'demographie', label: 'Démographie' },
      { key: 'rating', label: 'Classification / Rating' },
      { key: 'genres', label: 'Genres' },
      { key: 'themes', label: 'Thèmes' },
      { key: 'source', label: 'Source (light novel, manga...)' }
    ]
  },
  {
    title: 'Production',
    icon: '🏢',
    fields: [
      { key: 'studios', label: 'Studios' },
      { key: 'producteurs', label: 'Producteurs' },
      { key: 'diffuseurs', label: 'Diffuseurs' }
    ]
  },
  {
    title: 'MyAnimeList',
    icon: '📊',
    fields: [
      { key: 'mal_block', label: 'Bloc statistiques MAL' }
    ]
  },
  {
    title: 'Relations & liens',
    icon: '🔗',
    fields: [
      { key: 'relations', label: 'Relations (prequel, sequel...)' },
      { key: 'liens_externes', label: 'Liens externes' },
      { key: 'liens_streaming', label: 'Liens de streaming' }
    ]
  },
  {
    title: 'Progression',
    icon: '📺',
    fields: [
      { key: 'episodes', label: 'Liste des épisodes' },
      { key: 'badges', label: 'Badges (en cours, source import)' }
    ]
  }
];

/**
 * Liste plate de tous les champs (pour le modal local)
 */
export const ANIME_DISPLAY_FIELDS: AnimeDisplayField[] = ANIME_DISPLAY_FIELD_CATEGORIES.flatMap(
  category => category.fields
);

/**
 * Valeurs par défaut pour tous les champs
 */
export const ANIME_DISPLAY_DEFAULTS: Record<AnimeDisplayFieldKey, boolean> = {
  couverture: true,
  description: true,
  titres_alternatifs: true,
  statut_diffusion: true,
  type: true,
  demographie: true,
  rating: true,
  genres: true,
  themes: true,
  source: true,
  studios: true,
  producteurs: true,
  diffuseurs: true,
  date_debut: true,
  date_fin: true,
  date_sortie_vf: true,
  saison_diffusion: true,
  mal_block: true,
  relations: true,
  liens_externes: true,
  liens_streaming: true,
  episodes: true,
  badges: true
};
