const { getUserIdByName } = require('./manga-helpers');

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
      (SELECT COUNT(*) FROM tomes WHERE serie_id = s.id) as tome_count,
      st.tag as manual_tag,
      st.is_favorite as is_favorite,
      ssu.statut_lecture as statut_lecture_mal,
      ssu.score as score_utilisateur_mal,
      ssu.volumes_lus as volumes_lus_mal,
      ssu.chapitres_lus as chapitres_lus_mal,
      ssu.date_debut as date_debut_lecture_mal,
      ssu.date_fin as date_fin_lecture_mal,
      CASE WHEN sm.serie_id IS NOT NULL THEN 1 ELSE 0 END as is_masquee
    FROM series s 
    LEFT JOIN serie_tags st ON s.id = st.serie_id AND st.user_id = ?
    LEFT JOIN serie_statut_utilisateur ssu ON s.id = ssu.serie_id AND ssu.user_id = ?
    LEFT JOIN series_masquees sm ON s.id = sm.serie_id AND sm.user_id = ?
    WHERE 1=1
  `;
  const params = [userBinding, userBinding, userBinding];

  // Filtrer les séries masquées (sauf si on demande explicitement à les afficher)
  if (currentUser && !filters.afficherMasquees) {
    query += ` AND sm.serie_id IS NULL`;
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

  if (filters.search) {
    // Recherche par titre OU par MAL ID si numérique
    const isNumericSearch = /^\d+$/.test(filters.search.trim());
    if (isNumericSearch) {
      query += ' AND s.mal_id = ?';
      params.push(parseInt(filters.search.trim()));
    } else {
      query += ' AND s.titre LIKE ?';
      params.push(`%${filters.search}%`);
    }
  }

  // Filtre par tag
  if (filters.tag) {
    if (filters.tag === 'aucun') {
      query += ' AND st.tag IS NULL AND (st.is_favorite IS NULL OR st.is_favorite = 0)';
    } else if (filters.tag === 'favori') {
      query += ' AND st.is_favorite = 1';
    } else if (filters.tag === 'en_cours' || filters.tag === 'lu') {
      // Pour les tags automatiques, on filtre après la requête
      // car ils dépendent du calcul de la progression
    } else {
      query += ' AND st.tag = ?';
      params.push(filters.tag);
    }
  }

  query += ' ORDER BY s.titre ASC';

  const stmt = db.prepare(query);
  const series = stmt.all(...params);
  
  // Calculer le tag effectif pour chaque série en fonction de la progression
  let seriesWithTags = series.map(serie => {
    let effectiveTag = serie.manual_tag || null;
    
    // Récupérer les tomes avec leur statut de lecture pour l'utilisateur actuel
    let tomesWithLecture = [];
    if (currentUser && userId) {
      // Récupérer les tomes avec leur statut de lecture
      if (serie.tome_count > 0) {
        tomesWithLecture = db.prepare(`
          SELECT 
            t.id,
            t.numero,
            CASE WHEN lt.lu = 1 THEN 1 ELSE 0 END as lu
          FROM tomes t
          LEFT JOIN lecture_tomes lt ON t.id = lt.tome_id AND lt.user_id = ?
          WHERE t.serie_id = ?
          ORDER BY t.numero ASC
        `).all(userId, serie.id);
      }

      // Calculer automatiquement le tag basé sur les progressions (tomes ET chapitres)
      const { calculateAutoCompletionTag } = require('./manga-helpers');
      const autoTag = calculateAutoCompletionTag(db, serie.id, userId);
      if (autoTag !== null) {
        effectiveTag = autoTag;
      }
    }
    
    return {
      ...serie,
      tomes: tomesWithLecture,
      tag: effectiveTag,
      is_favorite: serie.is_favorite ? true : false,
      // Utiliser les données MAL si disponibles, sinon celles de la table series
      statut_lecture: serie.statut_lecture_mal || serie.statut_lecture || null,
      score_utilisateur: serie.score_utilisateur_mal || serie.score_utilisateur || null,
      volumes_lus: serie.volumes_lus_mal !== null && serie.volumes_lus_mal !== undefined ? serie.volumes_lus_mal : (serie.volumes_lus || null),
      chapitres_lus: serie.chapitres_lus_mal !== null && serie.chapitres_lus_mal !== undefined ? serie.chapitres_lus_mal : (serie.chapitres_lus || null),
      date_debut_lecture: serie.date_debut_lecture_mal || serie.date_debut_lecture || null,
      date_fin_lecture: serie.date_fin_lecture_mal || serie.date_fin_lecture || null
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
 * Récupère une série avec ses tomes
 */
function handleGetSerie(db, store, id) {
  const serie = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
  if (!serie) return null;

  const tomes = db.prepare('SELECT * FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(id);
  
  // Récupérer l'utilisateur actuel
  const currentUser = store.get('currentUser', '');
  
  // Récupérer le tag de la série pour l'utilisateur actuel
  const userId = getUserIdByName(db, currentUser);
  const tagData = userId ? db.prepare('SELECT tag, is_favorite FROM serie_tags WHERE serie_id = ? AND user_id = ?').get(id, userId) : null;
  
  // Récupérer le statut utilisateur MAL si disponible
  const statutUtilisateur = userId ? db.prepare(`
    SELECT statut_lecture, score, volumes_lus, chapitres_lus, date_debut, date_fin
    FROM serie_statut_utilisateur
    WHERE serie_id = ? AND user_id = ?
  `).get(id, userId) : null;
  
  // Calculer le tag effectif (manuel ou automatique)
  let effectiveTag = tagData ? tagData.tag : null;
  if (!effectiveTag || effectiveTag === null) {
    // Calculer automatiquement le tag basé sur les progressions (tomes ET chapitres)
    const { calculateAutoCompletionTag } = require('./manga-helpers');
    const autoTag = calculateAutoCompletionTag(db, id, userId);
    if (autoTag !== null) {
      effectiveTag = autoTag;
    }
  }
  
  // Enrichir chaque tome avec son statut de lecture et ses propriétaires
  const tomesAvecLecture = tomes.map(tome => {
    const lecture = userId ? db.prepare('SELECT lu, date_lecture FROM lecture_tomes WHERE tome_id = ? AND user_id = ?')
      .get(tome.id, userId) : null;
    
    // Récupérer les propriétaires de ce tome
    const proprietaires = db.prepare(`
      SELECT u.id, u.name, u.color
      FROM tomes_proprietaires tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tome_id = ?
    `).all(tome.id);
    
    const proprietaireIds = proprietaires.map(p => p.id);
    
    // Si date_achat est renseignée et que l'utilisateur actuel n'est pas encore propriétaire, l'ajouter automatiquement
    if (userId && tome.date_achat && !proprietaireIds.includes(userId)) {
      db.prepare(`
        INSERT OR IGNORE INTO tomes_proprietaires (tome_id, user_id)
        VALUES (?, ?)
      `).run(tome.id, userId);
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
      proprietaires: proprietaires,
      proprietaireIds: proprietaireIds
    };
  });

  // Parser les relations pour extraire l'URL Nautiljon
  let nautiljonUrl = null;
  try {
    if (serie.relations) {
      const relations = JSON.parse(serie.relations);
      nautiljonUrl = relations.nautiljon?.url || null;
    }
  } catch (e) {
    // Ignorer les erreurs de parsing
  }

  return { 
    ...serie, 
    tomes: tomesAvecLecture, 
    tag: effectiveTag,
    manual_tag: tagData ? tagData.tag : null,
    is_favorite: tagData ? (tagData.is_favorite ? true : false) : false,
    // Utiliser les données MAL si disponibles, sinon celles de la table series
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
    nautiljon_url: nautiljonUrl
  };
}

/**
 * Enregistre les handlers IPC pour les opérations de lecture
 */
function registerMangaSeriesReadHandlers(ipcMain, getDb, store) {
  // Récupérer la liste des séries avec filtres
  ipcMain.handle('get-series', (event, filters = {}) => {
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
  });

  // Récupérer une série avec ses tomes
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
      
      const manga = db.prepare('SELECT id, titre, mal_id FROM series WHERE mal_id = ?').get(malId);
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
      
      const serie = db.prepare('SELECT * FROM series WHERE id = ?').get(serieId);
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
            try {
              const parsed = JSON.parse(value);
              displayValue = Array.isArray(parsed) ? parsed.join(', ') : value;
            } catch {
              displayValue = value;
            }
          } else if (key === 'relations' && typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              displayValue = `[${parsed.length} relation(s)]`;
            } catch {
              displayValue = value.substring(0, 100) + (value.length > 100 ? '...' : '');
            }
          } else if (key === 'description' && typeof value === 'string' && value.length > 150) {
            displayValue = value.substring(0, 150) + '...';
          } else if (key === 'background' && typeof value === 'string' && value.length > 150) {
            displayValue = value.substring(0, 150) + '...';
          }
          
          console.log(`${emoji} ${label}: ${displayValue}`);
        }
      });
      
      // Afficher les tomes
      const tomes = db.prepare('SELECT id, numero, prix, date_sortie, date_achat, couverture_url, type_tome FROM tomes WHERE serie_id = ? ORDER BY numero ASC').all(serieId);
      if (tomes.length > 0) {
        console.log(`\n📚 ${tomes.length} tome(s) associé(s):`);
        tomes.forEach(tome => {
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
}

module.exports = { registerMangaSeriesReadHandlers };
