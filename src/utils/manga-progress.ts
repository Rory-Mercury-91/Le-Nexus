import { Serie } from '../types';

export type MangaProgressSource = 'tome' | 'volume' | 'chapitre' | 'none';

export interface MangaProgress {
  current: number;
  total: number;
  label: string;
  source: MangaProgressSource;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function pickFirstPositive(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number' && value > 0) {
      return value;
    }
  }
  return 0;
}

export function computeMangaProgress(serie: Serie): MangaProgress {
  const tomes = Array.isArray(serie.tomes) ? serie.tomes : [];
  const tomesTotal = tomes.length;
  const tomesLus = tomes.reduce((count, tome) => {
    const value = (tome?.lu as number | boolean | undefined) ?? 0;
    return count + (value ? 1 : 0);
  }, 0);

  const volumesLus = numberOrNull(serie.volumes_lus) ?? 0;
  const totalVolumes = pickFirstPositive(numberOrNull(serie.nb_volumes), numberOrNull(serie.nb_volumes_vf));

  const chapitresLus = numberOrNull(serie.chapitres_lus) ?? 0;
  const totalChapitres = pickFirstPositive(numberOrNull(serie.nb_chapitres), numberOrNull(serie.nb_chapitres_vf));

  // Préférences selon le type de contenu
  const preferChapitres = serie.type_contenu === 'chapitre';
  const preferVolumes = serie.type_contenu === 'volume';

  if (tomesTotal > 0) {
    const current = Math.min(tomesLus, tomesTotal);
    const label = `${current}/${tomesTotal} tome${tomesTotal > 1 ? 's' : ''} lus`;
    return { current, total: tomesTotal, label, source: 'tome' };
  }

  const hasVolumeData = totalVolumes > 0 || volumesLus > 0;
  const hasChapitreData = totalChapitres > 0 || chapitresLus > 0;

  if ((preferVolumes && hasVolumeData) || (hasVolumeData && !preferChapitres)) {
    const total = totalVolumes > 0 ? totalVolumes : Math.max(volumesLus, 0);
    const current = total > 0 ? Math.min(volumesLus, total) : volumesLus;
    const label = total > 0
      ? `${current}/${total} volume${total > 1 ? 's' : ''} lus`
      : `${current} volume${current > 1 ? 's' : ''} lus`;
    return { current, total, label, source: 'volume' };
  }

  if (hasChapitreData) {
    const total = totalChapitres > 0 ? totalChapitres : Math.max(chapitresLus, 0);
    const current = total > 0 ? Math.min(chapitresLus, total) : chapitresLus;
    const label = total > 0
      ? `${current}/${total} chapitre${total > 1 ? 's' : ''} lus`
      : `${current} chapitre${current > 1 ? 's' : ''} lus`;
    return { current, total, label, source: 'chapitre' };
  }

  return {
    current: 0,
    total: 0,
    label: 'Aucune progression',
    source: 'none'
  };
}
