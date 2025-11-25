const { getUserIdByName } = require('./manga-helpers');
const { safeJsonParse } = require('../common-helpers');
const { getSourceIndex, getAllSourcesFromIndex } = require('../../services/mihon-source-index-manager');

/**
 * Handlers pour les opérations de lecture (READ) sur les séries de mangas
 */

/**
 * Récupère la liste des séries avec filtres
 */
function handleGetSeries(db, store, filters = {}) {
  const currentUser = store.get('currentUser', '');

  // Récupérer l'ID de l'utilisateur actuel
  const userId = getUserIdByName(db, currentUser);
  const userBinding = typeof userId === 'number' ? userId : -1;

  let query = `
    SELECT 
      s.*,
      (SELECT COUNT(*) FROM manga_tomes WHERE serie_id = s.id) as tome_count,
      mud.tag as manual_tag,
      mud.tag_manual_override as tag_manual_override,
      mud.is_favorite as is_favorite,
      mud.statut_lecture as statut_lecture_mal,
      mud.score as score_utilisateur_mal,
      mud.volumes_lus as volumes_lus_mal,
      mud.chapitres_lus as chapitres_lus_mal,
      mud.date_debut as date_debut_lecture_mal,
      mud.date_fin as date_fin_lecture_mal,
      mud.is_hidden as is_masquee,
      mud.labels as labels
    FROM manga_series s 
    LEFT JOIN manga_user_data mud ON s.id = mud.serie_id AND mud.user_id = ?
    WHERE 1=1
  `;
  const params = [userBinding];

  // Filtrer les séries masquées (sauf si on demande explicitement à les afficher)
  if (currentUser && !filters.afficherMasquees) {
    query += ` AND (mud.is_hidden IS NULL OR mud.is_hidden = 0)`;
  }

  if (typeof userId === 'number') {
    query += ` AND (s.user_id_ajout = ? OR s.user_id_ajout IS NULL OR s.user_id_ajout = 0)`;
    params.push(userId);
  }

  if (filters.statut) {
    query += ' AND s.statut = ?';
    params.push(filters.statut);
  }

  if (filters.type_volume) {
    query += ' AND s.type_volume = ?';
    params.push(filters.type_volume);
  }

  // Filtrer par source_id (ID de la source Mihon/Tachiyomi)
  if (filters.source_id) {
    query += ' AND s.source_id = ?';
    params.push(filters.source_id);
  }

  // Support du filtre source_url pour compatibilité (fallback)
  if (filters.source_url && !filters.source_id) {
    // Filtrer par domaine du site (ex: sushiscan.fr, yaoiscan.fr)
    // Le filtre peut être un domaine exact ou une partie de l'URL
    query += ' AND s.source_url LIKE ?';
    params.push(`%${filters.source_url}%`);
  }

  if (filters.search) {
    // Recherche par titre OU par MAL ID si numérique
    const isNumericSearch = /^\d+$/.test(filters.search.trim());
    if (isNumericSearch) {
      query += ' AND s.mal_id = ?';
      params.push(parseInt(filters.search.trim()));
    } else {
      const searchPattern = `%${filters.search}%`;
      query += ` AND (
        s.titre LIKE ? 
        OR s.titre_romaji LIKE ?
        OR s.titre_natif LIKE ?
        OR s.titre_anglais LIKE ?
        OR s.titres_alternatifs LIKE ?
        OR s.titre_alternatif LIKE ?
        OR s.description LIKE ?
        OR s.auteurs LIKE ?
      )`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
  }

  // Filtre par tag
  if (filters.tag) {
    if (filters.tag === 'aucun') {
      query += ' AND (mud.tag IS NULL OR mud.tag = "") AND (mud.is_favorite IS NULL OR mud.is_favorite = 0)';
    } else if (filters.tag === 'favori') {
      query += ' AND mud.is_favorite = 1';
    } else if (filters.tag === 'en_cours' || filters.tag === 'lu') {
      // Pour les tags automatiques, on filtre après la requête
      // car ils dépendent du calcul de la progression
    } else {
      query += ' AND mud.tag = ?';
      params.push(filters.tag);
    }
  }

  query += ' ORDER BY s.titre ASC';

  const stmt = db.prepare(query);
  const series = stmt.all(...params);

  // Calculer le tag effectif pour chaque série en fonction de la progression
  let seriesWithTags = series.map(serie => {
    let effectiveTag = serie.tag_manual_override ? (serie.manual_tag || null) : null;

    // Récupérer les manga_tomes avec leur statut de lecture pour l'utilisateur actuel
    let tomesWithLecture = [];
    if (currentUser && userId) {
      // Récupérer les manga_tomes avec leur statut de lecture depuis manga_user_data.tome_progress
      if (serie.tome_count > 0) {
        // Récupérer tome_progress depuis manga_user_data
        const userData = db.prepare('SELECT tome_progress FROM manga_user_data WHERE serie_id = ? AND user_id = ?').get(serie.id, userId);
        const tomeProgress = userData ? safeJsonParse(userData.tome_progress, []) : [];
        const tomeProgressMap = {};
        if (Array.isArray(tomeProgress)) {
          tomeProgress.forEach(tp => {
            if (tp.tome_id) {
              tomeProgressMap[tp.tome_id] = tp;
            }
          });
        }

        // Récupérer tous les manga_tomes
        const allTomes = db.prepare(`
          SELECT id, numero
          FROM manga_tomes
          WHERE serie_id = ?
          ORDER BY numero ASC
        `).all(serie.id);

        // Enrichir avec les données de progression
        tomesWithLecture = allTomes.map(tome => {
          const progress = tomeProgressMap[tome.id];
          return {
            id: tome.id,
            numero: tome.numero,
            lu: progress && progress.lu ? 1 : 0
          };
        });
      }

      // Calculer automatiquement le tag basé sur les progressions (manga_tomes ET chapitres)
      if (!effectiveTag) {
        const { calculateAutoCompletionTag } = require('./manga-helpers');
        const autoTag = calculateAutoCompletionTag(db, serie.id, userId);
        if (autoTag !== null) {
          effectiveTag = autoTag;
        }
      }
    }

    // Parser les labels
    const labels = serie.labels ? safeJsonParse(serie.labels, []) : [];

    return {
      ...serie,
      tomes: tomesWithLecture,
      tag: effectiveTag,
      is_favorite: serie.is_favorite ? true : false,
      // Utiliser les données MAL si disponibles, sinon celles de la table manga_series
      statut_lecture: serie.statut_lecture_mal || serie.statut_lecture || null,
      score_utilisateur: serie.score_utilisateur_mal || serie.score_utilisateur || null,
      volumes_lus: serie.volumes_lus_mal !== null && serie.volumes_lus_mal !== undefined ? serie.volumes_lus_mal : (serie.volumes_lus || null),
      chapitres_lus: serie.chapitres_lus_mal !== null && serie.chapitres_lus_mal !== undefined ? serie.chapitres_lus_mal : (serie.chapitres_lus || null),
      date_debut_lecture: serie.date_debut_lecture_mal || serie.date_debut_lecture || null,
      date_fin_lecture: serie.date_fin_lecture_mal || serie.date_fin_lecture || null,
      labels: labels
    };
  });

  // Filtrer par tag automatique si nécessaire
  if (filters.tag === 'en_cours') {
    seriesWithTags = seriesWithTags.filter(s => s.tag === 'en_cours');
  } else if (filters.tag === 'lu') {
    seriesWithTags = seriesWithTags.filter(s => s.tag === 'lu');
  }

  return seriesWithTags;
}

/**
 * Récupère une série avec ses manga_tomes
 */
function handleGetSerie(db, store, id) {
  const serie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(id);
  if (!serie) return null;

  const tomes = db.prepare('SELECT id, serie_id, numero, prix, date_sortie, date_achat, couverture_url, type_tome, mihon, created_at FROM manga_tomes WHERE serie_id = ? ORDER BY numero ASC').all(id);

  // Récupérer l'utilisateur actuel
  const currentUser = store.get('currentUser', '');

  // Récupérer les données utilisateur depuis manga_user_data
  const userId = getUserIdByName(db, currentUser);
  const userData = userId ? db.prepare(`
    SELECT tag, tag_manual_override, is_favorite, statut_lecture, score, volumes_lus, chapitres_lus, date_debut, date_fin, tome_progress, is_hidden, labels
    FROM manga_user_data
    WHERE serie_id = ? AND user_id = ?
  `).get(id, userId) : null;

  const tagData = userData ? { tag: userData.tag, is_favorite: userData.is_favorite, tag_manual_override: userData.tag_manual_override } : null;
  const statutUtilisateur = userData ? {
    statut_lecture: userData.statut_lecture,
    score: userData.score,
    volumes_lus: userData.volumes_lus,
    chapitres_lus: userData.chapitres_lus,
    date_debut: userData.date_debut,
    date_fin: userData.date_fin
  } : null;

  // Calculer le tag effectif (manuel ou automatique)
  let effectiveTag = tagData && tagData.tag_manual_override ? tagData.tag : null;
  if (!effectiveTag) {
    const { calculateAutoCompletionTag } = require('./manga-helpers');
    const autoTag = calculateAutoCompletionTag(db, id, userId);
    if (autoTag !== null) {
      effectiveTag = autoTag;
    }
  }

  // Récupérer tome_progress depuis manga_user_data
  const tomeProgress = userData && userData.tome_progress ? safeJsonParse(userData.tome_progress, []) : [];
  const tomeProgressMap = {};
  if (Array.isArray(tomeProgress)) {
    tomeProgress.forEach(tp => {
      if (tp.tome_id) {
        tomeProgressMap[tp.tome_id] = tp;
      }
    });
  }

  // Enrichir chaque tome avec son statut de lecture et ses propriétaires
  const tomesAvecLecture = tomes.map(tome => {
    const progress = tomeProgressMap[tome.id];
    const lecture = progress ? {
      lu: progress.lu ? 1 : 0,
      date_lecture: progress.date_lecture || null
    } : null;

    // Récupérer les propriétaires de ce tome
    const proprietaires = db.prepare(`
      SELECT u.id, u.name, u.color
      FROM manga_manga_tomes_proprietaires tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tome_id = ?
    `).all(tome.id);

    const proprietaireIds = proprietaires.map(p => p.id);

    // Si date_achat est renseignée et que l'utilisateur actuel n'est pas encore propriétaire, l'ajouter automatiquement
    if (userId && tome.date_achat && !proprietaireIds.includes(userId)) {
      db.prepare(`
        INSERT OR IGNORE INTO manga_manga_tomes_proprietaires (serie_id, tome_id, user_id)
        VALUES (?, ?, ?)
      `).run(tome.serie_id, tome.id, userId);
      proprietaireIds.push(userId);
      // Ajouter aussi l'utilisateur à la liste des propriétaires pour l'affichage
      const user = db.prepare('SELECT id, name, color FROM users WHERE id = ?').get(userId);
      if (user) {
        proprietaires.push(user);
      }
    }

    return {
      ...tome,
      lu: lecture ? lecture.lu : 0,
      date_lecture: lecture ? lecture.date_lecture : null,
      mihon: tome.mihon || 0,
      proprietaires: proprietaires,
      proprietaireIds: proprietaireIds
    };
  });

  // Extraire l'URL Nautiljon depuis le champ dédié
  let nautiljonUrl = serie.nautiljon_url || null;

  if (nautiljonUrl) {
    console.log(`✅ URL Nautiljon extraite depuis champ dédié pour série ${id}: ${nautiljonUrl}`);
  } else {
    // Fallback : essayer depuis relations (pour compatibilité avec les anciennes données)
    try {
      if (serie.relations) {
        const relations = safeJsonParse(serie.relations, {});
        nautiljonUrl = relations.nautiljon?.url
          || relations.nautiljon
          || relations.Nautiljon?.url
          || relations.Nautiljon
          || null;

        if (nautiljonUrl) {
          console.log(`✅ URL Nautiljon extraite depuis relations (fallback) pour série ${id}: ${nautiljonUrl}`);
          // Migrer vers le champ dédié
          db.prepare('UPDATE manga_series SET nautiljon_url = ? WHERE id = ?').run(nautiljonUrl, id);
        }
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
      console.warn('⚠️ Erreur parsing relations pour série', id, ':', e.message);
    }
  }

  // Parser les labels
  const labels = userData && userData.labels ? safeJsonParse(userData.labels, []) : [];

  // Construire l'objet retourné en s'assurant que nautiljon_url est bien inclus
  const result = {
    ...serie,
    manga_tomes: tomesAvecLecture, // Pour compatibilité
    tomes: tomesAvecLecture, // Format attendu par le frontend
    tag: effectiveTag,
    manual_tag: tagData ? tagData.tag : null,
    is_favorite: tagData ? (tagData.is_favorite ? true : false) : false,
    // Utiliser les données MAL si disponibles, sinon celles de la table manga_series
    statut_lecture: statutUtilisateur ? statutUtilisateur.statut_lecture : (serie.statut_lecture || null),
    score_utilisateur: statutUtilisateur ? statutUtilisateur.score : (serie.score_utilisateur || null),
    volumes_lus: statutUtilisateur && statutUtilisateur.volumes_lus !== null && statutUtilisateur.volumes_lus !== undefined
      ? statutUtilisateur.volumes_lus
      : (serie.volumes_lus || null),
    chapitres_lus: statutUtilisateur && statutUtilisateur.chapitres_lus !== null && statutUtilisateur.chapitres_lus !== undefined
      ? statutUtilisateur.chapitres_lus
      : (serie.chapitres_lus || null),
    date_debut_lecture: statutUtilisateur ? statutUtilisateur.date_debut : (serie.date_debut_lecture || null),
    date_fin_lecture: statutUtilisateur ? statutUtilisateur.date_fin : (serie.date_fin_lecture || null),
    nautiljon_url: nautiljonUrl,
    labels: labels
  };

  return result;
}

/**
 * Enregistre les handlers IPC pour les opérations de lecture
 */
function registerMangaSeriesReadHandlers(ipcMain, getDb, store, getPathManager = null) {
  // Handler pour récupérer la liste des séries avec filtres
  const getSeriesHandler = (event, filters = {}) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }
      return handleGetSeries(db, store, filters);
    } catch (error) {
      console.error('Erreur get-series:', error);
      throw error;
    }
  };

  // Récupérer la liste des séries avec filtres (alias pour compatibilité)
  ipcMain.handle('get-series', getSeriesHandler);
  ipcMain.handle('get-manga_series', getSeriesHandler);

  // Récupérer une série avec ses manga_tomes
  ipcMain.handle('get-serie', (event, id) => {
    try {
      const db = getDb();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }
      return handleGetSerie(db, store, id);
    } catch (error) {
      console.error('Erreur get-serie:', error);
      throw error;
    }
  });

  // Récupérer un manga par mal_id
  ipcMain.handle('get-manga-by-mal-id', async (event, malId) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const manga = db.prepare('SELECT id, titre, mal_id, couverture_url FROM manga_series WHERE mal_id = ?').get(malId);
      return manga || null;
    } catch (error) {
      console.error('Erreur get-manga-by-mal-id:', error);
      return null;
    }
  });

  // Handler de débogage : afficher toutes les données d'une série dans la console
  ipcMain.handle('debug-get-serie-data', (event, serieId) => {
    try {
      const db = getDb();
      if (!db) throw new Error('Base de données non initialisée');

      const serie = db.prepare('SELECT * FROM manga_series WHERE id = ?').get(serieId);
      if (!serie) {
        console.log(`❌ Série ID ${serieId} introuvable`);
        return null;
      }

      console.log('\n' + '='.repeat(80));
      console.log(`📚 DONNÉES COMPLÈTES DE LA SÉRIE ID ${serieId}: "${serie.titre}"`);
      console.log('='.repeat(80));

      // Afficher toutes les colonnes de manière organisée
      const fields = [
        { key: 'id', label: 'ID', emoji: '🆔' },
        { key: 'titre', label: 'Titre', emoji: '📖' },
        { key: 'titre_alternatif', label: 'Titre alternatif (ancien)', emoji: '🏷️' },
        { key: 'titre_romaji', label: 'Titre romaji', emoji: '📖' },
        { key: 'titre_natif', label: 'Titre natif', emoji: '📖' },
        { key: 'titre_anglais', label: 'Titre anglais', emoji: '📖' },
        { key: 'titres_alternatifs', label: 'Titres alternatifs (JSON)', emoji: '🏷️' },
        { key: 'titre_vo', label: 'Titre VO', emoji: '📖' },
        { key: 'mal_id', label: 'MAL ID', emoji: '🆔' },
        { key: 'statut', label: 'Statut', emoji: '📊' },
        { key: 'type_volume', label: 'Type volume', emoji: '📦' },
        { key: 'type_contenu', label: 'Type contenu', emoji: '📦' },
        { key: 'media_type', label: 'Type média', emoji: '📖' },
        { key: 'couverture_url', label: 'Couverture URL', emoji: '🖼️' },
        { key: 'description', label: 'Description', emoji: '📝' },
        { key: 'statut_publication', label: 'Statut publication VO', emoji: '📊' },
        { key: 'statut_publication_vf', label: 'Statut publication VF', emoji: '📊' },
        { key: 'annee_publication', label: 'Année publication VO', emoji: '📅' },
        { key: 'annee_vf', label: 'Année VF', emoji: '📅' },
        { key: 'date_debut', label: 'Date début', emoji: '📅' },
        { key: 'date_fin', label: 'Date fin', emoji: '📅' },
        { key: 'genres', label: 'Genres', emoji: '🏷️' },
        { key: 'themes', label: 'Thèmes', emoji: '🎭' },
        { key: 'demographie', label: 'Démographie', emoji: '👥' },
        { key: 'langue_originale', label: 'Langue originale', emoji: '🌍' },
        { key: 'nb_volumes', label: 'Nb volumes VO', emoji: '📚' },
        { key: 'nb_volumes_vf', label: 'Nb volumes VF', emoji: '📚' },
        { key: 'nb_chapitres', label: 'Nb chapitres VO', emoji: '📖' },
        { key: 'nb_chapitres_vf', label: 'Nb chapitres VF', emoji: '📖' },
        { key: 'editeur', label: 'Éditeur VF', emoji: '🏢' },
        { key: 'editeur_vo', label: 'Éditeur VO', emoji: '🏢' },
        { key: 'serialization', label: 'Sérialisation', emoji: '📰' },
        { key: 'auteurs', label: 'Auteurs', emoji: '✍️' },
        { key: 'rating', label: 'Rating', emoji: '⭐' },
        { key: 'score_mal', label: 'Score MAL', emoji: '⭐' },
        { key: 'rank_mal', label: 'Rank MAL', emoji: '📊' },
        { key: 'popularity_mal', label: 'Popularité MAL', emoji: '📈' },
        { key: 'background', label: 'Background', emoji: '📝' },
        { key: 'source_donnees', label: 'Source données', emoji: '📥' },
        { key: 'prequel_mal_id', label: 'Prequel MAL ID', emoji: '🔗' },
        { key: 'sequel_mal_id', label: 'Sequel MAL ID', emoji: '🔗' },
        { key: 'anime_adaptation_mal_id', label: 'Anime adaptation MAL ID', emoji: '🎬' },
        { key: 'light_novel_mal_id', label: 'Light novel MAL ID', emoji: '📚' },
        { key: 'manga_adaptation_mal_id', label: 'Manga adaptation MAL ID', emoji: '📖' },
        { key: 'relations', label: 'Relations (JSON)', emoji: '🔗' },
        { key: 'created_at', label: 'Créé le', emoji: '📅' },
        { key: 'updated_at', label: 'Modifié le', emoji: '📅' }
      ];

      fields.forEach(({ key, label, emoji }) => {
        const value = serie[key];
        if (value !== null && value !== undefined && value !== '') {
          let displayValue = value;

          // Formater les valeurs spéciales
          if (key === 'titres_alternatifs' && typeof value === 'string') {
            const parsed = safeJsonParse(value, null);
            displayValue = Array.isArray(parsed) ? parsed.join(', ') : value;
          } else if (key === 'relations' && typeof value === 'string') {
            const parsed = safeJsonParse(value, null);
            displayValue = parsed && Array.isArray(parsed) ? `[${parsed.length} relation(s)]` : (value.substring(0, 100) + (value.length > 100 ? '...' : ''));
          } else if (key === 'description' && typeof value === 'string' && value.length > 150) {
            displayValue = value.substring(0, 150) + '...';
          } else if (key === 'background' && typeof value === 'string' && value.length > 150) {
            displayValue = value.substring(0, 150) + '...';
          }

          console.log(`${emoji} ${label}: ${displayValue}`);
        }
      });

      // Afficher les manga_tomes
      const manga_tomes = db.prepare('SELECT id, numero, prix, date_sortie, date_achat, couverture_url, type_tome, mihon FROM manga_tomes WHERE serie_id = ? ORDER BY numero ASC').all(serieId);
      if (manga_tomes.length > 0) {
        console.log(`\n📚 ${manga_tomes.length} tome(s) associé(s):`);
        manga_tomes.forEach(tome => {
          console.log(`   - Tome ${tome.numero}: ${tome.prix}€ | Sortie: ${tome.date_sortie || 'N/A'} | Achat: ${tome.date_achat || 'N/A'}`);
        });
      }

      console.log('='.repeat(80) + '\n');

      return serie;
    } catch (error) {
      console.error('❌ Erreur debug-get-serie-data:', error);
      return null;
    }
  });

  // Récupérer la liste des sites disponibles depuis l'index
  // Filtrée pour ne garder que ceux qui sont présents dans la base de données
  ipcMain.handle('get-available-sources', async (event) => {
    try {
      if (!getPathManager) {
        return { success: false, error: 'PathManager non disponible', sources: [] };
      }
      const db = getDb();
      if (!db) {
        return { success: false, error: 'Base de données non initialisée', sources: [] };
      }

      // Récupérer l'index
      const indexResult = await getSourceIndex(getPathManager);
      if (!indexResult.success || !indexResult.index) {
        return { success: false, error: 'Index non disponible', sources: [] };
      }

      // Récupérer tous les source_id utilisés dans la base
      let usedSourceIds = new Set();
      try {
        const sourceIds = db.prepare(`
          SELECT DISTINCT source_id 
          FROM manga_series 
          WHERE source_id IS NOT NULL AND source_id != ''
        `).all();
        usedSourceIds = new Set(sourceIds.map(row => row.source_id));
      } catch (error) {
        console.warn('⚠️ Erreur récupération source_id depuis la base:', error.message);
      }

      // Filtrer les sources pour ne garder que celles utilisées
      const allSources = getAllSourcesFromIndex(indexResult.index);
      const usedSources = allSources.filter(source => usedSourceIds.has(source.id));

      return { success: true, sources: usedSources };
    } catch (error) {
      console.error('Erreur get-available-sources:', error);
      return { success: false, error: error.message, sources: [] };
    }
  });
}

module.exports = { registerMangaSeriesReadHandlers };
