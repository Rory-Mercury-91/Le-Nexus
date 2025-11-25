/**
 * Service de fusion de données
 * Gère la fusion des données existantes avec les nouvelles données Nautiljon
 */

const { inferMediaType } = require('./manga-import-parser');

function splitAltString(str) {
  if (str == null) return [];
  return String(str)
    .split(/[\\/|]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

function collectAlternativeTitles(currentData = {}, parsedData = {}) {
  const titles = [];
  const seen = new Set();

  const normalize = (title) => {
    return title
      .normalize('NFKC')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, ' ')
      .trim();
  };

  const originalNormalized = new Set();
  const registerOriginal = (title) => {
    if (!title) return;
    const normalized = normalize(String(title).trim());
    if (normalized) {
      originalNormalized.add(normalized);
    }
  };

  registerOriginal(parsedData.titre || currentData.titre);
  registerOriginal(parsedData.titre_vo || currentData.titre_vo);
  registerOriginal(parsedData.titre_original || currentData.titre_original);
  registerOriginal(parsedData.titre_natif || currentData.titre_natif);

  const addAtomicTitle = (title) => {
    if (!title) return;
    const cleaned = String(title).trim();
    if (!cleaned) return;
    const normalized = normalize(cleaned);
    if (!normalized) return;
    if (originalNormalized.has(normalized)) return;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      titles.push(cleaned);
    }
  };

  const addTitle = (title) => {
    if (!title) return;
    const parts = splitAltString(title);
    if (parts.length > 1) {
      parts.forEach(addAtomicTitle);
    } else {
      addAtomicTitle(title);
    }
  };

  const addFromSerialized = (value) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        parsed.forEach(entry => {
          const parts = splitAltString(entry);
          if (parts.length > 0) {
            parts.forEach(addAtomicTitle);
          } else {
            addAtomicTitle(entry);
          }
        });
        return;
      }
    } catch {
      // not JSON
    }
    splitAltString(value).forEach(addTitle);
  };

  addFromSerialized(currentData.titres_alternatifs);
  addFromSerialized(parsedData.titres_alternatifs);

  splitAltString(currentData.titre_alternatif).forEach(addTitle);
  splitAltString(parsedData.titre_alternatif).forEach(addTitle);

  addTitle(currentData.titre);
  addTitle(parsedData.titre);
  addTitle(currentData.titre_romaji);
  addTitle(parsedData.titre_romaji);
  addTitle(currentData.titre_anglais);
  addTitle(parsedData.titre_anglais);

  return titles;
}

/**
 * Fusionne les données existantes avec les nouvelles données Nautiljon
 * @param {Object} currentData - Données actuelles de la série dans la BDD
 * @param {Object} parsedData - Données parsées depuis Nautiljon
 * @returns {Object} - Données fusionnées
 */
function mergeSerieData(currentData, parsedData) {
  // Fusionner tous les titres alternatifs dans titres_alternatifs (format JSON array)
  const altTitles = collectAlternativeTitles(currentData, parsedData);
  const newTitle = parsedData.titre || currentData.titre;
  
  // Inférer le media_type si absent
  let mediaType = currentData.media_type;
  if (!mediaType) {
    mediaType = inferMediaType(parsedData);
  }
  
  let titresAlternatifsJson = null;
  if (altTitles.length > 0) {
    titresAlternatifsJson = JSON.stringify(altTitles);
  } else if (parsedData.titres_alternatifs) {
    // Si parsedData a déjà titres_alternatifs, l'utiliser directement
    titresAlternatifsJson = parsedData.titres_alternatifs;
  } else if (currentData.titres_alternatifs) {
    // Sinon, conserver celui existant
    titresAlternatifsJson = currentData.titres_alternatifs;
  }

  return {
    titre: newTitle,
    titre_alternatif: null, // Ne plus utiliser titre_alternatif, tout est dans titres_alternatifs
    titres_alternatifs: titresAlternatifsJson,
    titre_vo: parsedData.titre_vo || currentData.titre_vo || currentData.titre_natif || null,
    titre_natif: parsedData.titre_natif || currentData.titre_natif || null,
    type_volume: parsedData.type_volume || currentData.type_volume || 'Broché',
    type_contenu: parsedData.type_contenu || currentData.type_contenu || 'volume',
    couverture_url: parsedData.couverture_url || currentData.couverture_url || null,
    description: parsedData.description || currentData.description,
    statut_publication: parsedData.statut_publication_vo || currentData.statut_publication, // VO depuis Nautiljon ou conservé
    statut_publication_vf: parsedData.statut_publication || currentData.statut_publication_vf,
    annee_publication: parsedData.annee_publication_vo || currentData.annee_publication, // Nautiljon VO ou MAL
    annee_vf: parsedData.annee_publication || currentData.annee_vf,
    genres: parsedData.genres || currentData.genres,
    nb_chapitres: parsedData.nb_chapitres_vo || currentData.nb_chapitres,
    nb_chapitres_vf: parsedData.nb_chapitres || currentData.nb_chapitres_vf,
    nb_volumes: (typeof parsedData.nb_volumes_vo === 'number' ? parsedData.nb_volumes_vo : currentData.nb_volumes),
    nb_volumes_vf: (typeof parsedData.nb_volumes === 'number' ? parsedData.nb_volumes : currentData.nb_volumes_vf),
    editeur: parsedData.editeur || currentData.editeur,
    editeur_vo: parsedData.editeur_vo || currentData.editeur_vo,
    rating: parsedData.rating || currentData.rating,
    langue_originale: parsedData.langue_originale || currentData.langue_originale,
    demographie: parsedData.demographie || currentData.demographie,
    themes: parsedData.themes || currentData.themes,
    auteurs: parsedData.auteurs || currentData.auteurs,
    serialization: parsedData.serialization || currentData.serialization,
    media_type: mediaType
  };
}

/**
 * Prépare les données pour la création d'une nouvelle série
 * @param {Object} parsedData - Données parsées depuis Nautiljon
 * @returns {Object} - Données formatées pour insertion
 */
function prepareNewSerieData(parsedData) {
  const mediaType = inferMediaType(parsedData);
  
  return {
    titre: parsedData.titre,
    titre_alternatif: null, // Ne plus utiliser titre_alternatif, tout est dans titres_alternatifs
    titres_alternatifs: parsedData.titres_alternatifs || null,
    titre_vo: parsedData.titre_vo || null,
    titre_natif: parsedData.titre_natif || null,
    statut: 'En cours',
    type_volume: parsedData.type_volume || 'Broché',
    type_contenu: parsedData.type_contenu || 'volume',
    couverture_url: parsedData.couverture_url || null,
    description: parsedData.description || null,
    statut_publication: parsedData.statut_publication_vo || null, // Statut VO depuis Nautiljon
    statut_publication_vf: parsedData.statut_publication || null,
    annee_publication: parsedData.annee_publication_vo || null, // Année VO si fournie
    annee_vf: parsedData.annee_publication || null,
    genres: parsedData.genres || null,
    nb_volumes: parsedData.nb_volumes_vo || null, // Nombre de volumes VO si fourni
    nb_volumes_vf: parsedData.nb_volumes || null,
    nb_chapitres: parsedData.nb_chapitres_vo || null,
    nb_chapitres_vf: parsedData.nb_chapitres || null,
    langue_originale: parsedData.langue_originale || 'ja',
    demographie: parsedData.demographie || null,
    editeur: parsedData.editeur || null,
    editeur_vo: parsedData.editeur_vo || null,
    rating: parsedData.rating || null,
    themes: parsedData.themes || null,
    auteurs: parsedData.auteurs || null,
    serialization: parsedData.serialization || null,
    media_type: mediaType
  };
}

module.exports = {
  mergeSerieData,
  prepareNewSerieData
};
