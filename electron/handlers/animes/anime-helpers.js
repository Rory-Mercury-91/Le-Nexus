const fetch = require('node-fetch');
const { fetchAniListCover, filterStreamingLinks } = require('../../apis/anilist');
const { translateText: groqTranslate } = require('../../apis/groq');

/**
 * Helper : Traduire les saisons en français
 */
const translateSeason = (season) => {
  const seasons = {
    'winter': 'Hiver',
    'spring': 'Printemps',
    'summer': 'Été',
    'fall': 'Automne'
  };
  return seasons[season?.toLowerCase()] || season;
};

/**
 * Helper : Récupérer les données depuis Jikan API avec retry
 * Utilise l'endpoint /full pour obtenir toutes les données (rank, popularity, background, etc.)
 */
const fetchJikanData = async (malId, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Utiliser l'endpoint /full pour obtenir toutes les données
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);
      
      if (response.status === 429) {
        // Rate limit atteint, attendre plus longtemps
        const waitTime = attempt * 3000; // 3s, 6s, 9s
        console.log(`⏳ Jikan rate limit atteint pour MAL ${malId}, attente ${waitTime}ms (tentative ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Jikan API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(`Failed to fetch Jikan data after ${retries} attempts`);
};

/**
 * Helper : Extraire le nom de franchise depuis les relations MAL
 */
const extractFranchiseName = (anime, relations) => {
  let franchiseName = anime.title_english || anime.title;
  franchiseName = franchiseName
    .replace(/:\s*(Season|Part|Movie|OVA)\s*\d+/gi, '')
    .replace(/\s+(Season|Part)\s+\d+/gi, '')
    .replace(/\s+(II|III|IV|V|2nd|3rd|4th|5th)/gi, '')
    .trim();
  return franchiseName;
};

/**
 * Helper : Déterminer l'ordre dans la franchise
 */
const determineFranchiseOrder = (anime, relations) => {
  const prequels = relations?.filter(r => r.relation === 'Prequel') || [];
  return prequels.length + 1;
};

/**
 * Helper : Traduire avec Groq AI
 */
const translateWithGroq = async (text, store) => {
  const groqApiKey = store.get('groqApiKey', '');
  if (!groqApiKey || !text || text.length < 10) {
    return null;
  }
  const result = await groqTranslate(text, groqApiKey, 'fr', 'anime');
  return result.success ? result.text : null;
};

/**
 * Filtrer les liens externes selon les critères (exclure les sites asiatiques, redondants, etc.)
 * @param {Array} links - Tableau de liens externes {name, url}
 * @returns {Array} - Tableau de liens filtrés
 */
function filterExternalLinks(links) {
  // Liste des "Streaming Platforms" à exclure (liens génériques vers les plateformes)
  const streamingPlatformsToExclude = [
    'Netflix',
    'Ani-One Asia',
    'Aniplus TV',
    'Bahamut Anime Crazy',
    'Bilibili Global',
    'CatchPlay',
    'iQIYI'
  ];
  
  // Domaines/sites asiatiques à exclure
  const asianSitesToExclude = [
    'baike.baidu.com',      // Baidu Baike (chinois)
    'bangumi.tv',            // Bangumi (japonais)
    'douban.com',            // Douban (chinois)
    'moegirl.org.cn',        // Moegirl (chinois)
    'syoboi.jp',             // Syoboi (japonais)
    'cal.syoboi.jp'          // Syoboi calendrier
  ];
  
  // Sites redondants à exclure
  const redundantSitesToExclude = [
    'animenewsnetwork.com'   // ANN (redondant)
  ];
  
  // Fonction pour vérifier si un URL correspond à un domaine à exclure
  const shouldExcludeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Vérifier les sites asiatiques
      if (asianSitesToExclude.some(site => hostname.includes(site))) {
        return true;
      }
      
      // Vérifier les sites redondants
      if (redundantSitesToExclude.some(site => hostname.includes(site))) {
        return true;
      }
      
      // Exclure Wikipedia japonais (ja.wikipedia.org)
      if (hostname.includes('ja.wikipedia.org')) {
        return true;
      }
      
      // Exclure Twitter japonais (sololeveling_pr)
      if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
        if (url.toLowerCase().includes('sololeveling_pr') || url.toLowerCase().includes('sololeveling-pr')) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  };
  
  // Fonction pour vérifier si un lien doit être gardé
  const shouldKeepLink = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Toujours garder ces sites
      const keepSites = [
        'myanimelist.net',      // MAL
        'anidb.net',            // AniDB
        'sololeveling-anime.net' // Site officiel (exception asiatique)
      ];
      
      if (keepSites.some(site => hostname.includes(site))) {
        return true;
      }
      
      // Garder Wikipedia FR et EN uniquement
      if (hostname.includes('wikipedia.org')) {
        const langMatch = hostname.match(/^([a-z]{2,3})\.(m\.)?wikipedia\.org$/i);
        if (langMatch) {
          const lang = langMatch[1].toLowerCase();
          return lang === 'fr' || lang === 'en';
        }
      }
      
      // Garder Twitter anglais (sololeveling_en)
      if ((hostname.includes('x.com') || hostname.includes('twitter.com')) && 
          (url.toLowerCase().includes('sololeveling_en') || url.toLowerCase().includes('sololeveling-en'))) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  };
  
  // Filtrer les liens
  return links.filter(link => {
    const name = (typeof link === 'string' ? 'Wikipedia' : (link.name || ''));
    const url = (typeof link === 'string' ? link : (link.url || ''));
    
    if (!url) return false;
    
    // Exclure les "Streaming Platforms" génériques
    if (streamingPlatformsToExclude.some(platform => 
      name.toLowerCase() === platform.toLowerCase()
    )) {
      return false;
    }
    
    // Exclure les URLs selon les critères
    if (shouldExcludeUrl(url)) {
      return false;
    }
    
    // Garder seulement les liens qui correspondent aux critères
    return shouldKeepLink(url);
  }).map(link => {
    // Normaliser le format de retour
    if (typeof link === 'string') {
      return { name: 'Wikipedia', url: link };
    }
    return {
      name: link.name || 'Lien externe',
      url: link.url
    };
  });
}

/**
 * Vérifier si une URL Wikipedia existe (pas de 404)
 */
async function checkWikipediaUrlExists(url) {
  try {
    // Wikipedia renvoie toujours 200 même si l'article n'existe pas (page "article n'existe pas")
    // Utiliser l'API REST de Wikipedia qui renvoie vraiment 404 si l'article n'existe pas
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const articleTitle = pathParts[pathParts.length - 1]; // Dernière partie du chemin
    
    if (!articleTitle) return false;
    
    // Construire l'URL de l'API Wikipedia REST
    // Format: https://fr.wikipedia.org/api/rest_v1/page/summary/Titre_Article
    const apiUrl = `https://${urlObj.hostname}/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Le-Nexus/1.0'
      }
    });
    
    // L'API renvoie 200 si l'article existe, 404 s'il n'existe pas
    const exists = response.status === 200;
    
    if (!exists) {
      console.log(`⚠️ Page Wikipedia n'existe pas (API 404): ${url}`);
    }
    
    return exists;
  } catch (error) {
    // En cas d'erreur (timeout, etc.), on considère que la page n'existe pas
    console.log(`⚠️ Impossible de vérifier l'existence de ${url}:`, error.message);
    return false;
  }
}

/**
 * Préparer les données d'anime depuis les données Jikan
 */
async function prepareAnimeDataFromJikan(anime, malId, userId, sourceImport = 'manual') {
  const relations = anime.relations || [];
  const simplifiedRelations = relations
    .map(rel => ({
      relation: rel.relation,
      entries: (rel.entry || []).map(entry => ({
        mal_id: entry.mal_id || null,
        name: entry.name || null,
        type: entry.type || null
      }))
    }))
    .filter(rel => rel.entries.length > 0);

  const movieRelations = [];
  for (const rel of simplifiedRelations) {
    const relationLabel = rel.relation ? String(rel.relation).toLowerCase() : '';
    if (relationLabel.includes('movie')) {
      for (const entry of rel.entries) {
        movieRelations.push({
          relation: rel.relation,
          mal_id: entry.mal_id || null,
          name: entry.name || null,
          type: entry.type || null
        });
      }
    }
  }
  const franchiseName = extractFranchiseName(anime, relations);
  const franchiseOrder = determineFranchiseOrder(anime, relations);
  
  const prequel = relations.find(r => r.relation === 'Prequel');
  const sequel = relations.find(r => r.relation === 'Sequel');
  const prequelMalId = prequel?.entry[0]?.mal_id || null;
  const sequelMalId = sequel?.entry[0]?.mal_id || null;
  
  // Extraire les sources (manga, light novel) depuis les relations
  let mangaSourceMalId = null;
  let lightNovelSourceMalId = null;
  
  // Si le champ source indique "Light novel", chercher d'abord le light novel dans les relations
  const sourceType = anime.source?.toLowerCase() || '';
  const isLightNovelSource = sourceType.includes('light novel') || sourceType.includes('novel');
  
  // Parcourir les relations pour trouver les sources
  for (const rel of relations) {
    const relationType = rel.relation?.toLowerCase() || '';
    
    // Relations de type "Adaptation" : ce qui a été adapté DE cet anime (pas ce qu'on cherche)
    // Relations de type "Source" : ce dont cet anime est adapté
    if (rel.relation === 'Adaptation' && rel.entry && rel.entry.length > 0) {
      // Dans les relations "Adaptation", on cherche les sources (manga, light novel)
      // qui ont été adaptées EN cet anime
      for (const entry of rel.entry) {
        const entryType = entry.type?.toLowerCase() || '';
        if (entryType === 'manga' && entry.mal_id) {
          // Vérifier si c'est vraiment un manga ou un light novel
          try {
            const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
            const relatedData = await fetchJikanMangaData(entry.mal_id);
            const relatedType = relatedData.type?.toLowerCase() || '';
            if (relatedType === 'light novel' || relatedType === 'novel') {
              // Si c'est un light novel, le mettre dans light_novel_source_mal_id
              if (!lightNovelSourceMalId) {
                lightNovelSourceMalId = entry.mal_id;
              }
            } else {
              // Si c'est vraiment un manga, le mettre dans manga_source_mal_id
              // Même si on a déjà un light novel source, on garde aussi le manga pour référence
              if (!mangaSourceMalId) {
                mangaSourceMalId = entry.mal_id;
              }
            }
          } catch (error) {
            // Si erreur, assumer que c'est un manga
            if (!mangaSourceMalId) {
              mangaSourceMalId = entry.mal_id;
            }
          }
        } else if ((entryType === 'light novel' || entryType === 'novel') && !lightNovelSourceMalId) {
          lightNovelSourceMalId = entry.mal_id;
        }
      }
    }
    
    // Relations de type "Source" : source directe
    if (relationType === 'source' && rel.entry && rel.entry.length > 0) {
      for (const entry of rel.entry) {
        const entryType = entry.type?.toLowerCase() || '';
        if (entryType === 'manga' && !mangaSourceMalId) {
          mangaSourceMalId = entry.mal_id || null;
        } else if ((entryType === 'light novel' || entryType === 'novel') && !lightNovelSourceMalId) {
          lightNovelSourceMalId = entry.mal_id || null;
        }
      }
    }
  }
  
  // Si le champ source indique "Light novel" mais qu'on n'a pas trouvé de light novel dans les relations,
  // chercher dans toutes les relations "Adaptation" pour trouver un manga qui pourrait être un light novel
  if (isLightNovelSource && !lightNovelSourceMalId) {
    for (const rel of relations) {
      if (rel.relation === 'Adaptation' && rel.entry && rel.entry.length > 0) {
        for (const entry of rel.entry) {
          const entryType = entry.type?.toLowerCase() || '';
          if (entryType === 'manga' && entry.mal_id) {
            try {
              const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
              const relatedData = await fetchJikanMangaData(entry.mal_id);
              const relatedType = relatedData.type?.toLowerCase() || '';
              if (relatedType === 'light novel' || relatedType === 'novel') {
                lightNovelSourceMalId = entry.mal_id;
                break;
              }
            } catch (error) {
              // Ignorer les erreurs
            }
          }
        }
      }
    }
  }
  
  // Si on a un light novel source mais pas de manga, chercher aussi les mangas dans les relations "Adaptation"
  // pour référence (même si la source principale est le light novel, le manga peut être une adaptation intermédiaire)
  if (lightNovelSourceMalId && !mangaSourceMalId) {
    for (const rel of relations) {
      if (rel.relation === 'Adaptation' && rel.entry && rel.entry.length > 0) {
        for (const entry of rel.entry) {
          const entryType = entry.type?.toLowerCase() || '';
          if (entryType === 'manga' && entry.mal_id && entry.mal_id !== lightNovelSourceMalId) {
            // Vérifier que ce n'est pas un light novel
            try {
              const { fetchJikanMangaData } = require('../../services/mangas/manga-api-helpers');
              const relatedData = await fetchJikanMangaData(entry.mal_id);
              const relatedType = relatedData.type?.toLowerCase() || '';
              if (relatedType !== 'light novel' && relatedType !== 'novel') {
                mangaSourceMalId = entry.mal_id;
                break;
              }
            } catch (error) {
              // Si erreur, assumer que c'est un manga
              mangaSourceMalId = entry.mal_id;
              break;
            }
          }
        }
      }
    }
  }

  // Normaliser le type d'anime pour gérer les variantes (TV Special, tv_special -> Special, etc.)
  const normalizeAnimeTypeFromJikan = (type) => {
    if (!type) return 'TV';
    
    const trimmed = String(type).trim();
    const normalized = trimmed.toLowerCase().replace(/[_-]/g, ' ').trim();
    
    // Vérifier d'abord les types contenant "special" (TV Special, tv_special, etc.)
    if (normalized.includes('special')) {
      return 'Special';
    }
    
    // Mapping des types standardisés
    const typeMap = {
      'tv': 'TV',
      'ova': 'OVA',
      'ona': 'ONA',
      'movie': 'Movie',
      'music': 'Music'
    };
    
    if (typeMap[normalized]) {
      return typeMap[normalized];
    }
    
    // Si c'est déjà un type reconnu (avec majuscules), le retourner tel quel
    const recognizedTypes = ['TV', 'OVA', 'ONA', 'Movie', 'Special', 'Music'];
    if (recognizedTypes.includes(trimmed)) {
      return trimmed;
    }
    
    // Par défaut, retourner TV
    return 'TV';
  };

  return {
    mal_id: malId,
    mal_url: anime.url || `https://myanimelist.net/anime/${malId}`,
    titre: anime.title,
    titre_romaji: anime.title_japanese || null,
    titre_natif: anime.title_japanese || null,
    titre_anglais: anime.title_english || null,
    titres_alternatifs: anime.title_synonyms?.join(', ') || null,
    type: normalizeAnimeTypeFromJikan(anime.type),
    source: anime.source || null,
    nb_episodes: anime.type === 'Movie' ? 1 : (anime.episodes || 0),
    couverture_url: null, // Sera défini plus tard
    description: null, // Sera défini plus tard
    statut_diffusion: anime.status || 'Finished Airing',
    en_cours_diffusion: anime.airing ? 1 : 0,
    date_debut: anime.aired?.from || null,
    date_fin: anime.aired?.to || null,
    duree: anime.duration || null,
    annee: anime.year || anime.aired?.prop?.from?.year || null,
    saison_diffusion: translateSeason(anime.season),
    genres: anime.genres?.map(g => g.name).join(', ') || '',
    themes: anime.themes?.map(t => t.name).join(', ') || null,
    demographics: anime.demographics?.map(d => d.name).join(', ') || null,
    studios: anime.studios?.map(s => s.name).join(', ') || '',
    producteurs: anime.producers?.map(p => p.name).join(', ') || null,
    diffuseurs: anime.licensors?.map(l => l.name).join(', ') || null,
    rating: anime.rating || null,
    score: anime.score || null,
    rank_mal: anime.rank || null,
    popularity_mal: anime.popularity || null,
    scored_by: anime.scored_by || null,
    favorites: anime.favorites || null,
    background: anime.background || null,
    liens_externes: await (async () => {
      // Filtrer les liens externes avec la fonction utilitaire
      const allExternalLinks = anime.external || [];
      const filteredLinks = filterExternalLinks(allExternalLinks);
      
      // Séparer les liens Wikipedia des autres liens externes
      const wikipediaLinks = filteredLinks.filter(e => e.name === 'Wikipedia');
      const otherLinks = filteredLinks.filter(e => e.name !== 'Wikipedia');
      
      const processedLinks = [];
      let hasFrenchLink = false;
      
      // Fonction pour extraire le code langue depuis une URL Wikipedia
      const getWikipediaLang = (url) => {
        try {
          const urlObj = new URL(url);
          const match = urlObj.hostname.match(/^([a-z]{2,3})\.(m\.)?wikipedia\.org$/i);
          return match ? match[1].toLowerCase() : null;
        } catch {
          return null;
        }
      };
      
      // Fonction pour créer une URL Wikipedia française
      const createFrenchWikipediaUrl = (url) => {
        try {
          const urlObj = new URL(url);
          urlObj.hostname = urlObj.hostname.replace(/^[a-z]{2,3}\.wikipedia/, 'fr.wikipedia');
          return urlObj.toString();
        } catch {
          return url;
        }
      };
      
      // D'abord, vérifier si un lien français existe déjà
      wikipediaLinks.forEach(link => {
        const langCode = getWikipediaLang(link.url);
        if (langCode === 'fr') {
          hasFrenchLink = true;
        }
      });
      
      // Traiter chaque lien Wikipedia (déjà filtré pour FR et EN uniquement)
      wikipediaLinks.forEach(link => {
        processedLinks.push({
          name: 'Wikipedia',
          url: link.url
        });
      });
      
      // Si aucun lien français n'existe, en créer un à partir du premier lien EN
      if (!hasFrenchLink && wikipediaLinks.length > 0) {
        const firstEnglishLink = wikipediaLinks.find(link => {
          const langCode = getWikipediaLang(link.url);
          return langCode === 'en';
        });
        
        if (firstEnglishLink) {
          const frenchUrl = createFrenchWikipediaUrl(firstEnglishLink.url);
          // Vérifier que la page existe avant de l'ajouter
          const exists = await checkWikipediaUrlExists(frenchUrl);
          if (exists && !processedLinks.find(l => l.url === frenchUrl)) {
            processedLinks.push({
              name: 'Wikipedia',
              url: frenchUrl
            });
            console.log(`✅ Lien Wikipedia français ajouté: ${frenchUrl}`);
          } else if (!exists) {
            console.log(`⚠️ Page Wikipedia française n'existe pas: ${frenchUrl}`);
          }
        }
      }
      
      // Ajouter les autres liens externes (déjà filtrés)
      otherLinks.forEach(link => {
        processedLinks.push({
          name: link.name || 'Lien externe',
          url: link.url
        });
      });
      
      return JSON.stringify(processedLinks);
    })(),
    liens_streaming: (() => {
      // Filtrer les liens de streaming pour ne garder que les plateformes acceptées et les vrais liens
      const streamingLinks = anime.streaming || [];
      const filtered = filterStreamingLinks(streamingLinks);
      return JSON.stringify(filtered);
    })(),
    franchise_name: franchiseName,
    franchise_order: franchiseOrder,
    prequel_mal_id: prequelMalId,
    sequel_mal_id: sequelMalId,
    manga_source_mal_id: mangaSourceMalId,
    light_novel_source_mal_id: lightNovelSourceMalId,
    relations: simplifiedRelations.length > 0 ? JSON.stringify(simplifiedRelations) : null,
    movie_relations: movieRelations.length > 0 ? JSON.stringify(movieRelations) : null,
    source_import: sourceImport,
    user_id_ajout: userId
  };
}

/**
 * Insérer un anime dans la base de données
 */
function insertAnimeIntoDatabase(db, animeData) {
  // Logger toutes les données avant insertion
  const { logSavedData } = require('../../utils/log-saved-data');
  logSavedData(animeData, 'anime');
  
  const stmt = db.prepare(`
    INSERT INTO anime_series (
      mal_id, mal_url, titre, titre_romaji, titre_natif, titre_anglais, titres_alternatifs,
      type, source, nb_episodes, couverture_url, description, statut_diffusion, en_cours_diffusion,
      date_debut, date_fin, duree, annee, saison_diffusion, genres, themes, demographics,
      studios, producteurs, diffuseurs, rating, score, rank_mal, popularity_mal, scored_by,
      favorites, background, liens_externes, liens_streaming, franchise_name, franchise_order,
      prequel_mal_id, sequel_mal_id, manga_source_mal_id, light_novel_source_mal_id, relations, movie_relations, source_import, user_id_ajout
    ) VALUES (
      @mal_id, @mal_url, @titre, @titre_romaji, @titre_natif, @titre_anglais, @titres_alternatifs,
      @type, @source, @nb_episodes, @couverture_url, @description, @statut_diffusion, @en_cours_diffusion,
      @date_debut, @date_fin, @duree, @annee, @saison_diffusion, @genres, @themes, @demographics,
      @studios, @producteurs, @diffuseurs, @rating, @score, @rank_mal, @popularity_mal, @scored_by,
      @favorites, @background, @liens_externes, @liens_streaming, @franchise_name, @franchise_order,
      @prequel_mal_id, @sequel_mal_id, @manga_source_mal_id, @light_novel_source_mal_id, @relations, @movie_relations, @source_import, @user_id_ajout
    )
  `);
  
  const result = stmt.run(animeData);
  return result.lastInsertRowid;
}

// Import des fonctions communes
const { getUserIdByName } = require('../common-helpers');

/**
 * S'assure qu'une ligne anime_user_data existe pour un anime et un utilisateur
 */
function ensureAnimeUserDataRow(db, animeId, userId) {
  const existing = db.prepare('SELECT id FROM anime_user_data WHERE anime_id = ? AND user_id = ?').get(animeId, userId);
  if (!existing) {
    db.prepare(`
      INSERT INTO anime_user_data (
        anime_id, user_id, statut_visionnage, score, episodes_vus,
        date_debut, date_fin, is_favorite, is_hidden, tag, labels,
        notes_privees, episode_progress, display_preferences, created_at, updated_at
      )
      VALUES (?, ?, 'À regarder', NULL, 0, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, datetime('now'), datetime('now'))
    `).run(animeId, userId);
  }
}

module.exports = {
  translateSeason,
  fetchJikanData,
  extractFranchiseName,
  determineFranchiseOrder,
  translateWithGroq,
  filterExternalLinks,
  checkWikipediaUrlExists,
  prepareAnimeDataFromJikan,
  insertAnimeIntoDatabase,
  getUserIdByName,
  ensureAnimeUserDataRow
};
