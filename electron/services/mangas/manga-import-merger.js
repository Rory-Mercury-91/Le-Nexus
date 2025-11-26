/**
 * Service de fusion de données
 * Gère la fusion des données existantes avec les nouvelles données Nautiljon
 */

const { inferMediaType } = require('./manga-import-parser');

/**
 * Vérifie si une série a Nautiljon comme source principale
 * @param {string|null|undefined} source_donnees - Source des données de la série
 * @returns {boolean} - true si Nautiljon est la source principale
 */
function isNautiljonSource(source_donnees) {
  if (!source_donnees) return false;
  const source = String(source_donnees).toLowerCase();
  return source === 'nautiljon' || source.includes('nautiljon');
}

function splitAltString(str) {
  if (str == null) return [];
  return String(str)
    .split(/[\\/|]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * Collecte et fusionne intelligemment tous les titres alternatifs
 * Exclut automatiquement les titres déjà présents dans les champs principaux
 * @param {Object} currentData - Données actuelles de la série
 * @param {Object} parsedData - Nouvelles données parsées
 * @returns {Array<string>} - Liste des titres alternatifs dédupliqués
 */
function collectAlternativeTitles(currentData = {}, parsedData = {}) {
  const titles = [];
  const seen = new Set();

  const normalize = (title) => {
    if (!title) return '';
    // Ne PAS normaliser en NFD pour les caractères coréens/japonais/chinois (cela les casse)
    // Utiliser NFKC seulement pour normaliser les caractères latins
    let normalized = String(title)
      .normalize('NFKC')
      .toLowerCase()
      .trim();
    // Supprimer seulement les accents des caractères latins (pas les caractères asiatiques)
    normalized = normalized.replace(/[\u0300-\u036f]/g, '');
    // Supprimer espaces
    normalized = normalized.replace(/[\s\u2000-\u200B\u2028\u2029]+/g, ''); // Supprimer TOUS les espaces pour comparaison stricte
    // Conserver les caractères alphanumériques ET tous les caractères asiatiques
    normalized = normalized.replace(/[^\p{L}\p{N}]/gu, ''); // Garde lettres et chiffres Unicode (inclut coréen)
    return normalized;
  };

  // Enregistrer tous les titres principaux pour les exclure des alternatifs
  const originalNormalized = new Set();
  const registerOriginal = (title) => {
    if (!title) return;
    const normalized = normalize(String(title).trim());
    if (normalized) {
      originalNormalized.add(normalized);
    }
  };

  // Enregistrer tous les titres principaux (titre, titre_vo, titre_natif, titre_romaji, titre_anglais)
  registerOriginal(currentData.titre);
  registerOriginal(parsedData.titre);
  registerOriginal(currentData.titre_vo);
  registerOriginal(parsedData.titre_vo);
  registerOriginal(currentData.titre_romaji);
  registerOriginal(parsedData.titre_romaji);
  registerOriginal(currentData.titre_natif);
  registerOriginal(parsedData.titre_natif);
  registerOriginal(currentData.titre_anglais);
  registerOriginal(parsedData.titre_anglais);
  registerOriginal(currentData.titre_original);
  registerOriginal(parsedData.titre_original);

  // Fonction pour ajouter un titre uniquement s'il n'est pas déjà dans les titres principaux
  const addAtomicTitle = (title) => {
    if (!title) return;
    const cleaned = String(title).trim();
    if (!cleaned) return;
    const normalized = normalize(cleaned);
    if (!normalized) return;
    
    // Exclure si c'est un titre principal
    if (originalNormalized.has(normalized)) return;
    
    // Exclure les doublons
    if (!seen.has(normalized)) {
      seen.add(normalized);
      titles.push(cleaned);
    }
  };

  // Fonction pour traiter un titre (peut contenir plusieurs titres séparés par / ou |)
  const addTitle = (title) => {
    if (!title) return;
    const parts = splitAltString(title);
    if (parts.length > 1) {
      // Plusieurs titres séparés, les traiter individuellement
      parts.forEach(addAtomicTitle);
    } else {
      // Un seul titre
      addAtomicTitle(title);
    }
  };

  // Fonction pour parser et ajouter depuis un champ JSON array ou string
  const addFromSerialized = (value) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // C'est un JSON array, traiter chaque élément
        parsed.forEach(entry => {
          if (typeof entry === 'string') {
            const parts = splitAltString(entry);
            if (parts.length > 1) {
              parts.forEach(addAtomicTitle);
            } else {
              addAtomicTitle(entry);
            }
          } else {
            addAtomicTitle(String(entry));
          }
        });
        return;
      }
    } catch {
      // Ce n'est pas du JSON valide, traiter comme une chaîne
    }
    // Traiter comme une chaîne simple (peut contenir des séparateurs)
    splitAltString(value).forEach(addAtomicTitle);
  };

  // Ajouter les titres alternatifs existants (depuis currentData)
  // Logs de debug pour voir ce qui est dans les alternatifs existants
  if (currentData.titres_alternatifs) {
    console.log(`🔍 [collectAlternativeTitles] DEBUG: Alternatifs existants (currentData): ${currentData.titres_alternatifs}`);
  }
  addFromSerialized(currentData.titres_alternatifs);
  
  // Ajouter les titres alternatifs depuis les nouvelles données (parsedData)
  if (parsedData.titres_alternatifs) {
    console.log(`🔍 [collectAlternativeTitles] DEBUG: Alternatifs depuis nouvelles données (parsedData): ${parsedData.titres_alternatifs}`);
  }
  addFromSerialized(parsedData.titres_alternatifs);
  
  // Ajouter depuis titre_alternatif (ancien format, pour compatibilité)
  if (currentData.titre_alternatif) {
    addTitle(currentData.titre_alternatif);
  }
  if (parsedData.titre_alternatif) {
    addTitle(parsedData.titre_alternatif);
  }

  // Nettoyage final : retirer les titres qui sont maintenant dans les champs principaux
  // (utile si un titre était dans les alternatifs mais est maintenant dans titre_natif, etc.)
  // Utiliser les valeurs finales après fusion (parsedData prévaut sur currentData)
  const finalTitreNatif = parsedData.titre_natif !== undefined ? parsedData.titre_natif : currentData.titre_natif;
  const finalTitreVo = parsedData.titre_vo !== undefined ? parsedData.titre_vo : currentData.titre_vo;
  const finalTitreRomaji = parsedData.titre_romaji !== undefined ? parsedData.titre_romaji : currentData.titre_romaji;
  const finalTitreAnglais = parsedData.titre_anglais !== undefined ? parsedData.titre_anglais : currentData.titre_anglais;
  const finalTitre = parsedData.titre !== undefined ? parsedData.titre : currentData.titre;
  
  const finalMainTitlesSet = new Set([
    finalTitre,
    finalTitreVo,
    finalTitreRomaji,
    finalTitreNatif,
    finalTitreAnglais
  ].filter(Boolean).map(t => {
    const normalized = normalize(String(t));
    if (finalTitreNatif && String(t) === finalTitreNatif) {
      console.log(`🔍 [collectAlternativeTitles] DEBUG: Normalisation titre natif "${t}" → "${normalized}"`);
    }
    return normalized;
  }));
  
  console.log(`🔍 [collectAlternativeTitles] DEBUG: Titres collectés avant nettoyage (${titles.length}):`, titles);
  console.log(`🔍 [collectAlternativeTitles] DEBUG: Titres principaux finaux normalisés:`, Array.from(finalMainTitlesSet));
  
  const cleanedTitles = titles.filter(title => {
    const titleNormalized = normalize(title);
    const shouldKeep = !finalMainTitlesSet.has(titleNormalized);
    if (!shouldKeep) {
      console.log(`🧹 [collectAlternativeTitles] Titre retiré (présent dans titres principaux): "${title}" (normalisé: "${titleNormalized}")`);
    } else {
      // Debug : vérifier si le titre natif est dans les alternatifs
      if (finalTitreNatif) {
        const natifNormalized = normalize(finalTitreNatif);
        if (natifNormalized === titleNormalized) {
          console.log(`⚠️ [collectAlternativeTitles] DEBUG: Titre natif trouvé dans alternatifs mais pas retiré! Alt: "${title}", Natif: "${finalTitreNatif}", Normalized alt: "${titleNormalized}", Normalized natif: "${natifNormalized}", Match: ${natifNormalized === titleNormalized}`);
        }
      }
    }
    return shouldKeep;
  });
  
  console.log(`🔍 [collectAlternativeTitles] DEBUG: Titres après nettoyage (${cleanedTitles.length}):`, cleanedTitles);

  return cleanedTitles;
}

/**
 * Fusionne les données existantes avec les nouvelles données Nautiljon
 * Les données Nautiljon prévalent toujours sur les autres sources (sauf données utilisateur)
 * @param {Object} currentData - Données actuelles de la série dans la BDD
 * @param {Object} parsedData - Données parsées depuis Nautiljon
 * @param {string|null} userModifiedFields - JSON string des champs modifiés par l'utilisateur
 * @returns {Object} - Données fusionnées
 */
function mergeSerieData(currentData, parsedData, userModifiedFields = null) {
  // Vérifier si titres_alternatifs a été modifié par l'utilisateur
  const { isFieldUserModified } = require('../../utils/enrichment-helpers');
  const isTitresAlternatifsUserModified = userModifiedFields && isFieldUserModified(userModifiedFields, 'titres_alternatifs');
  
  let titresAlternatifsJson = null;
  
  // Nautiljon prévaut toujours pour le titre
  const newTitle = parsedData.titre !== undefined && parsedData.titre !== null ? parsedData.titre : currentData.titre;
  
    // Si le titre principal change, ajouter l'ancien titre aux alternatifs
    const oldTitle = currentData.titre;
    const titleChanged = oldTitle && newTitle && oldTitle !== newTitle;
    
    // Si l'utilisateur a modifié les titres alternatifs, conserver sa version
    if (isTitresAlternatifsUserModified && currentData.titres_alternatifs) {
      console.log(`⏭️ [Nautiljon] Titres alternatifs conservés (modifiés par l'utilisateur) pour série ID ${currentData.id}`);
      titresAlternatifsJson = currentData.titres_alternatifs;
    } else {
      // Fusionner tous les titres alternatifs dans titres_alternatifs (format JSON array)
      const altTitles = collectAlternativeTitles(currentData, parsedData);
      
      // Nettoyer les alternatifs : retirer les titres qui sont maintenant dans les champs principaux
      // (utile si un titre était dans les alternatifs mais est maintenant dans titre_natif, etc.)
      // Utiliser la même normalisation que dans l'enrichissement pour cohérence
      const normalizeForCleanup = (title) => {
        if (!title) return '';
        // Ne PAS normaliser en NFD pour les caractères coréens/japonais/chinois (cela les casse)
        // Utiliser NFKC seulement pour normaliser les caractères latins
        let normalized = String(title)
          .normalize('NFKC')
          .toLowerCase()
          .trim();
        // Supprimer seulement les accents des caractères latins (pas les caractères asiatiques)
        normalized = normalized.replace(/[\u0300-\u036f]/g, '');
        // Supprimer espaces et ponctuation
        normalized = normalized
          .replace(/[\s\u2000-\u200B\u2028\u2029]+/g, '') // Supprimer TOUS les espaces pour comparaison stricte
          .replace(/[.,;:!?()[\]{}'"`~\-_=+*&^%$#@]/g, '')
          .replace(/[！？。、，；：（）【】「」『』]/g, '');
        // Conserver les caractères alphanumériques ET tous les caractères asiatiques (japonais, chinois, coréen)
        // Utiliser \p{L} et \p{N} pour les propriétés Unicode (inclut coréen)
        normalized = normalized.replace(/[^\p{L}\p{N}]/gu, ''); // Garde lettres et chiffres Unicode (inclut coréen)
        return normalized;
      };
      
      // Liste des titres principaux finaux (après fusion) - utiliser les valeurs finales après preferNautiljon
      const finalTitreVo = parsedData.titre_vo !== undefined ? parsedData.titre_vo : (currentData.titre_vo || currentData.titre_natif || null);
      const finalTitreNatif = parsedData.titre_natif !== undefined ? parsedData.titre_natif : currentData.titre_natif;
      const finalTitreRomaji = parsedData.titre_romaji !== undefined ? parsedData.titre_romaji : currentData.titre_romaji;
      const finalTitreAnglais = parsedData.titre_anglais !== undefined ? parsedData.titre_anglais : currentData.titre_anglais;
      
      // Logs de debug pour les titres principaux finaux
      console.log(`🔍 [Nautiljon] DEBUG: Titres principaux finaux avant normalisation:`);
      console.log(`  - Titre: "${newTitle}"`);
      console.log(`  - Titre VO: "${finalTitreVo}"`);
      console.log(`  - Titre natif: "${finalTitreNatif}"`);
      console.log(`  - Titre romaji: "${finalTitreRomaji}"`);
      console.log(`  - Titre anglais: "${finalTitreAnglais}"`);
      
      const finalMainTitles = new Set([
        newTitle,
        finalTitreVo,
        finalTitreRomaji,
        finalTitreNatif,
        finalTitreAnglais
      ].filter(Boolean).map(t => {
        const normalized = normalizeForCleanup(t);
        if (finalTitreNatif && t === finalTitreNatif) {
          console.log(`🔍 [Nautiljon] DEBUG: Normalisation titre natif "${t}" → "${normalized}"`);
        }
        return normalized;
      }));
      
      console.log(`🔍 [Nautiljon] DEBUG: Titres principaux normalisés:`, Array.from(finalMainTitles));
      console.log(`🔍 [Nautiljon] DEBUG: Alternatifs à nettoyer (${altTitles.length}):`, altTitles);
      
      // Filtrer les alternatifs pour retirer ceux qui sont maintenant dans les titres principaux
      const cleanedAltTitles = altTitles.filter(alt => {
        const altNormalized = normalizeForCleanup(alt);
        const shouldKeep = !finalMainTitles.has(altNormalized);
        if (!shouldKeep) {
          console.log(`🧹 [Nautiljon] Titre retiré des alternatifs (présent dans titres principaux): "${alt}" (normalisé: "${altNormalized}")`);
        } else {
          // Debug : vérifier si le titre natif est dans les alternatifs
          if (finalTitreNatif) {
            const natifNormalized = normalizeForCleanup(finalTitreNatif);
            if (natifNormalized === altNormalized) {
              console.log(`⚠️ [Nautiljon] DEBUG: Titre natif trouvé dans alternatifs mais pas retiré! Alt: "${alt}", Natif: "${finalTitreNatif}", Normalized alt: "${altNormalized}", Normalized natif: "${natifNormalized}", Match: ${natifNormalized === altNormalized}`);
            }
          }
        }
        return shouldKeep;
      });
      
      console.log(`🔍 [Nautiljon] DEBUG: Alternatifs après nettoyage (${cleanedAltTitles.length}):`, cleanedAltTitles);
      
      // Si le titre principal a changé, ajouter l'ancien titre aux alternatifs
      if (titleChanged) {
        const oldTitleNormalized = normalizeForCleanup(oldTitle);
        const newTitleNormalized = normalizeForCleanup(newTitle);
        
        // Vérifier que l'ancien titre n'est pas déjà dans les alternatifs ou dans les titres principaux
        const isAlreadyInAlts = cleanedAltTitles.some(alt => normalizeForCleanup(alt) === oldTitleNormalized);
        const isInMainTitles = finalMainTitles.has(oldTitleNormalized) || newTitleNormalized === oldTitleNormalized;
        
        if (!isAlreadyInAlts && !isInMainTitles) {
          cleanedAltTitles.push(oldTitle);
          console.log(`📝 [Nautiljon] Ancien titre principal ajouté aux alternatifs: "${oldTitle}"`);
        }
      }
      
      if (cleanedAltTitles.length > 0) {
        titresAlternatifsJson = JSON.stringify(cleanedAltTitles);
      } else if (parsedData.titres_alternatifs !== undefined && parsedData.titres_alternatifs !== null) {
        // Si parsedData a déjà titres_alternatifs, l'utiliser directement
        titresAlternatifsJson = parsedData.titres_alternatifs;
      } else if (currentData.titres_alternatifs) {
        // Sinon, conserver celui existant
        titresAlternatifsJson = currentData.titres_alternatifs;
      }
    }
  
  // Inférer le media_type si absent
  let mediaType = currentData.media_type;
  if (!mediaType) {
    mediaType = inferMediaType(parsedData);
  }

  // Helper pour préférer Nautiljon : utilise parsedData même si null, sauf si undefined
  const preferNautiljon = (nautiljonValue, currentValue) => {
    return nautiljonValue !== undefined ? nautiljonValue : currentValue;
  };

  return {
    titre: newTitle,
    titre_alternatif: null, // Ne plus utiliser titre_alternatif, tout est dans titres_alternatifs
    titres_alternatifs: titresAlternatifsJson,
    // Nautiljon prévaut : utiliser parsedData même si null (mais pas undefined)
    titre_vo: preferNautiljon(parsedData.titre_vo, currentData.titre_vo || currentData.titre_natif || null),
    titre_natif: preferNautiljon(parsedData.titre_natif, currentData.titre_natif || null),
    type_volume: preferNautiljon(parsedData.type_volume, currentData.type_volume || 'Broché'),
    type_contenu: preferNautiljon(parsedData.type_contenu, currentData.type_contenu || 'volume'),
    couverture_url: preferNautiljon(parsedData.couverture_url, currentData.couverture_url || null),
    description: preferNautiljon(parsedData.description, currentData.description),
    statut_publication: preferNautiljon(parsedData.statut_publication_vo, currentData.statut_publication),
    statut_publication_vf: preferNautiljon(parsedData.statut_publication, currentData.statut_publication_vf),
    annee_publication: preferNautiljon(parsedData.annee_publication_vo, currentData.annee_publication),
    annee_vf: preferNautiljon(parsedData.annee_publication, currentData.annee_vf),
    genres: preferNautiljon(parsedData.genres, currentData.genres),
    nb_chapitres: preferNautiljon(parsedData.nb_chapitres_vo, currentData.nb_chapitres),
    nb_chapitres_vf: preferNautiljon(parsedData.nb_chapitres, currentData.nb_chapitres_vf),
    nb_volumes: (typeof parsedData.nb_volumes_vo === 'number' ? parsedData.nb_volumes_vo : preferNautiljon(parsedData.nb_volumes_vo, currentData.nb_volumes)),
    nb_volumes_vf: (typeof parsedData.nb_volumes === 'number' ? parsedData.nb_volumes : preferNautiljon(parsedData.nb_volumes, currentData.nb_volumes_vf)),
    editeur: preferNautiljon(parsedData.editeur, currentData.editeur),
    editeur_vo: preferNautiljon(parsedData.editeur_vo, currentData.editeur_vo),
    rating: preferNautiljon(parsedData.rating, currentData.rating),
    langue_originale: preferNautiljon(parsedData.langue_originale, currentData.langue_originale),
    demographie: preferNautiljon(parsedData.demographie, currentData.demographie),
    themes: preferNautiljon(parsedData.themes, currentData.themes),
    auteurs: preferNautiljon(parsedData.auteurs, currentData.auteurs),
    serialization: preferNautiljon(parsedData.serialization, currentData.serialization),
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
  prepareNewSerieData,
  isNautiljonSource,
  collectAlternativeTitles
};
