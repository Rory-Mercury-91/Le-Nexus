/**
 * Traitement des données de traduction.
 * Gère le filtrage, le groupement et la construction des objets de traduction.
 */

/**
 * Filtre les traductions par traducteurs
 * @param {Array} data - Données du sheet
 * @param {Array<string>} traducteurs - Liste des traducteurs à filtrer
 * @returns {Array} Données filtrées
 */
function filterByTraducteurs(data, traducteurs) {
  if (!traducteurs || traducteurs.length === 0) {
    return [];
  }
  
  const filtered = data.filter(item => 
    traducteurs.some(trad => 
      item.traducteur.toLowerCase().includes(trad.toLowerCase())
    )
  );
  
  console.log(`✅ ${filtered.length} traductions filtrées pour les traducteurs suivis: ${traducteurs.join(', ')}`);
  return filtered;
}

/**
 * Groupe les traductions par ID de jeu
 * @param {Array} data - Données filtrées
 * @returns {object} Objet avec les ID de jeu comme clés et les traductions comme valeurs
 */
function getPlatformKeyFromSite(site) {
  const value = (site || '').toString().toLowerCase();
  if (!value) return 'unknown';
  if (value.includes('lewd')) return 'lewdcorner';
  if (value.includes('f95')) return 'f95zone';
  const normalized = value.replace(/[\s._-]+/g, '');
  if (normalized === 'f95z') return 'f95zone';
  if (value.includes('itch')) return 'itch';
  return 'unknown';
}

function getPlatformKeyFromLink(link) {
  if (!link) return 'unknown';
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();
    if (host.includes('lewdcorner')) return 'lewdcorner';
    if (host.includes('f95zone')) return 'f95zone';
    if (host.includes('itch')) return 'itch';
  } catch (error) {
    const value = link.toString().toLowerCase();
    if (value.includes('lewdcorner')) return 'lewdcorner';
    if (value.includes('f95zone')) return 'f95zone';
    if (value.includes('itch')) return 'itch';
  }
  return 'unknown';
}

function resolveEntryPlatformKey(entry, fallback = 'unknown') {
  const siteKey = getPlatformKeyFromSite(entry?.site);
  if (siteKey !== 'unknown') {
    return siteKey;
  }

  const linkCandidates = [
    entry?.lienF95,
    entry?.lien_f95,
    entry?.lien,
    entry?.lienJeu,
    entry?.lien_jeu,
    entry?.lienTraduction,
    entry?.lien_traduction,
    entry?.threadLink,
    entry?.thread,
    entry?.url,
    entry?.link
  ];

  for (const candidate of linkCandidates) {
    const linkKey = getPlatformKeyFromLink(candidate);
    if (linkKey !== 'unknown') {
      return linkKey;
    }
  }

  return fallback;
}

function groupTranslationsById(data) {
  const gamesById = {};
  for (const entry of data) {
    if (!entry.id) continue;
    
    const platformKey = resolveEntryPlatformKey(entry);
    const compositeKey = `${entry.id}::${platformKey}`;
    
    if (!gamesById[compositeKey]) {
      gamesById[compositeKey] = [];
    }
    gamesById[compositeKey].push(entry);
  }
  return gamesById;
}

/**
 * Construit le tableau des traductions à partir des entrées
 * @param {Array} entries - Entrées de traduction pour un jeu
 * @param {Array} existingTranslations - Traductions existantes (optionnel)
 * @returns {Array} Tableau des traductions avec le flag "actif"
 */
function buildTranslationsArray(entries, existingTranslations = []) {
  let traductions = [...existingTranslations];
  
  // Ajouter toutes les traductions (TRUE + FALSE) avec le flag "actif"
  for (const entry of entries) {
    const exists = traductions.some(t => 
      t.version === entry.versionTraduite && 
      t.traducteur === entry.traducteur
    );
    
    if (!exists) {
      traductions.push({
        version: entry.versionTraduite,
        lien: entry.lienTraduction,
        type: entry.typeTraduction,
        traducteur: entry.traducteur,
        actif: entry.actif // ✅ Stocker le flag actif
      });
    } else {
      // Mettre à jour le flag actif si l'entrée existe déjà
      const existing = traductions.find(t => 
        t.version === entry.versionTraduite && 
        t.traducteur === entry.traducteur
      );
      if (existing) {
        existing.actif = entry.actif;
      }
    }
  }
  
  return traductions;
}

/**
 * Détermine la plateforme à partir d'une entrée
 * @param {object} entry - Entrée de traduction
 * @returns {object} Objet avec plateforme et threadLink
 */
function determinePlateforme(entry) {
  const platformKey = resolveEntryPlatformKey(entry);
  const isLewdCorner = platformKey === 'lewdcorner';
  const plateforme = isLewdCorner ? 'LewdCorner' : 'F95Zone';
  const threadLink = isLewdCorner 
    ? `https://lewdcorner.com/threads/${entry.id}/`
    : `https://f95zone.to/threads/${entry.id}/`;
  
  return { plateforme, threadLink, platformKey };
}

/**
 * Trouve l'entrée active parmi les entrées
 * @param {Array} entries - Liste des entrées
 * @returns {object} Entrée active ou première entrée
 */
function findActiveEntry(entries) {
  return entries.find(e => e.actif === true) || entries[0];
}

/**
 * Filtre l'URL de couverture si nécessaire (LewdCorner)
 * @param {string|null} imageUrl - URL de la couverture
 * @returns {string|null} URL filtrée ou null
 */
function filterCoverImageUrl(imageUrl) {
  if (imageUrl && imageUrl.includes('lewdcorner.com')) {
    return null;
  }
  return imageUrl;
}

/**
 * Construit les traductions depuis une liste d'entrées
 * @param {Array} entries - Liste des entrées de traduction
 * @returns {Array} Tableau des traductions
 */
function buildTranslationsFromEntries(entries) {
  return entries.map(t => ({
    version: t.versionTraduite,
    type: t.typeTraduction,
    traducteur: t.traducteur,
    lien: t.lienTraduction,
    actif: t.actif
  }));
}

/**
 * Sépare les traductions actives et inactives
 * @param {Array} data - Données filtrées
 * @returns {object} Objet avec activeTrads et inactiveTrads
 */
function separateActiveInactive(data) {
  const activeTrads = data.filter(item => item.actif === true);
  const inactiveTrads = data.filter(item => item.actif === false);
  
  console.log(`✅ ${activeTrads.length} traductions actives (TRUE) - ⚠️ ${inactiveTrads.length} anciennes/autres (FALSE)`);
  
  return { activeTrads, inactiveTrads };
}

module.exports = {
  filterByTraducteurs,
  groupTranslationsById,
  buildTranslationsArray,
  determinePlateforme,
  findActiveEntry,
  filterCoverImageUrl,
  buildTranslationsFromEntries,
  separateActiveInactive,
  getPlatformKeyFromSite,
  getPlatformKeyFromLink,
  resolveEntryPlatformKey
};
