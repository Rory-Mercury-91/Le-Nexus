import { Serie } from '../types';

/**
 * Normalise un titre pour la comparaison (supprime accents, minuscules, espaces, ponctuation)
 * Préserve les caractères japonais/chinois
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  // Normaliser les caractères japonais (unifier les variantes)
  let normalized = title
    .normalize('NFKC') // Normaliser les caractères composés et les variantes
    .toLowerCase();
  
  // Supprimer les accents latins
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Supprimer tous les espaces et caractères de ponctuation courants
  normalized = normalized
    .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, '') // Tous les types d'espaces
    .replace(/[.,;:!?()[\]{}'"`~\-_=+*&^%$#@]/g, '') // Ponctuation courante
    .replace(/[！？。、，；：（）【】「」『』]/g, ''); // Ponctuation japonaise
  
  // Garder uniquement les caractères alphanumériques et CJK
  normalized = normalized.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/g, '');
  
  return normalized.trim();
}

/**
 * Détecte si un titre contient des caractères japonais/chinois
 */
function hasJapaneseOrChinese(title: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(title);
}

/**
 * Organise les titres d'une série :
 * - Identifie le titre français (priorité)
 * - Identifie le titre original
 * - Collecte tous les titres alternatifs avec déduplication
 */
export function organizeMangaTitles(serie: Serie): {
  mainTitle: string; // Titre français (priorité) ou titre principal
  originalTitle: string | null; // Titre original (japonais/chinois)
  alternativeTitles: string[]; // Tous les autres titres dédupliqués
} {
  const allTitles: string[] = [];
  const seenNormalized = new Set<string>();
  
  // Collecter tous les titres disponibles
  // Le titre principal est toujours ajouté en premier et marqué comme vu
  if (serie.titre) {
    const mainTitleNormalized = normalizeTitle(serie.titre);
    seenNormalized.add(mainTitleNormalized);
    allTitles.push(serie.titre);
  }
  
  // Titres depuis MAL (avec déduplication immédiate)
  if (serie.titre_romaji) {
    const normalized = normalizeTitle(serie.titre_romaji);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      allTitles.push(serie.titre_romaji);
    }
  }
  if (serie.titre_natif) {
    const normalized = normalizeTitle(serie.titre_natif);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      allTitles.push(serie.titre_natif);
    }
  }
  if (serie.titre_anglais) {
    const normalized = normalizeTitle(serie.titre_anglais);
    if (!seenNormalized.has(normalized)) {
      seenNormalized.add(normalized);
      allTitles.push(serie.titre_anglais);
    }
  }
  if (serie.titres_alternatifs) {
    let others: string[] = [];
    // Gérer le cas où titres_alternatifs est un JSON array
    try {
      const parsed = JSON.parse(serie.titres_alternatifs) as unknown;
      if (Array.isArray(parsed)) {
        others = parsed
          .map((t) => (typeof t === 'string' ? t : String(t)).trim())
          .filter((t): t is string => t.length > 0);
      } else {
        // Sinon, traiter comme une chaîne séparée par des virgules ou "//"
        others = serie.titres_alternatifs
          .split(/[,/|]+/)
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
    } catch {
      // Si ce n'est pas du JSON, traiter comme une chaîne séparée par des virgules ou "//"
      others = serie.titres_alternatifs
        .split(/[,/|]+/)
        .map((t: string) => t.trim())
        .filter(Boolean);
    }
    // Ajouter avec déduplication immédiate
    for (const title of others) {
      const normalized = normalizeTitle(title);
      if (!seenNormalized.has(normalized)) {
        seenNormalized.add(normalized);
        allTitles.push(title);
      }
    }
  }
  
  // Les titres sont déjà dédupliqués dans allTitles
  const uniqueTitles = allTitles;
  
  // Identifier le titre français (priorité)
  // Le titre français est toujours celui qui vient de Nautiljon (serie.titre)
  const mainTitle = serie.titre || '';
  const mainTitleNormalized = normalizeTitle(mainTitle);
  let originalTitle: string | null = null;
  const alternativeTitles: string[] = [];
  
  // Identifier le titre original (japonais/chinois)
  // Priorité au titre natif (japonais/chinois), puis titre romaji
  const japaneseTitle = uniqueTitles.find(t => {
    const normalized = normalizeTitle(t);
    return hasJapaneseOrChinese(t) && normalized !== mainTitleNormalized;
  });
  if (japaneseTitle) {
    originalTitle = japaneseTitle;
  } else if (serie.titre_natif) {
    const normalized = normalizeTitle(serie.titre_natif);
    if (normalized !== mainTitleNormalized) {
      originalTitle = serie.titre_natif;
    }
  } else if (serie.titre_romaji) {
    const normalized = normalizeTitle(serie.titre_romaji);
    if (normalized !== mainTitleNormalized) {
      originalTitle = serie.titre_romaji;
    }
  }
  
  const originalTitleNormalized = originalTitle ? normalizeTitle(originalTitle) : null;
  
  // Collecter tous les autres titres comme titres alternatifs (en excluant le titre principal et le titre original)
  for (const title of uniqueTitles) {
    const normalized = normalizeTitle(title);
    // Exclure le titre principal et le titre original
    if (normalized !== mainTitleNormalized && normalized !== originalTitleNormalized) {
      alternativeTitles.push(title);
    }
  }
  
  // Si on a un titre original et qu'il n'est pas déjà dans les alternatifs, l'ajouter en premier
  if (originalTitle && originalTitleNormalized !== mainTitleNormalized) {
    // Vérifier qu'il n'est pas déjà présent (au cas où)
    const alreadyInAlts = alternativeTitles.some(t => normalizeTitle(t) === originalTitleNormalized);
    if (!alreadyInAlts) {
      alternativeTitles.unshift(originalTitle);
    }
  }
  
  return {
    mainTitle,
    originalTitle,
    alternativeTitles
  };
}
