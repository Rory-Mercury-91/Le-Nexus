import { Serie, SerieTag } from '../types';

const TAG_TO_LABEL: Record<SerieTag, string> = {
  a_lire: 'À lire',
  en_cours: 'En cours',
  lu: 'Terminé',
  abandonne: 'Abandonné',
  en_pause: 'En pause'
};

const STATUT_LECTURE_TO_LABEL: Record<string, string> = {
  'À lire': 'À lire',
  'A lire': 'À lire',
  'En cours': 'En cours',
  'Terminé': 'Terminé',
  'Terminée': 'Terminé',
  'Abandonné': 'Abandonné',
  'Abandonnée': 'Abandonné',
  'En pause': 'En pause'
};

export function getSerieStatusLabel(serie: Serie): string {
  if (serie.tag && TAG_TO_LABEL[serie.tag]) {
    return TAG_TO_LABEL[serie.tag];
  }

  if (serie.statut_lecture && STATUT_LECTURE_TO_LABEL[serie.statut_lecture]) {
    return STATUT_LECTURE_TO_LABEL[serie.statut_lecture];
  }

  return 'À lire';
}
