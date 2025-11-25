const { updateFieldIfNotUserModified } = require('../../utils/enrichment-helpers');

const LIGHT_NOVEL_TYPES = ['light novel', 'novel', 'web novel'];

function isLightNovelEntry(entry = {}) {
  const mediaType = (entry.media_type || entry.type_volume || '').toLowerCase();
  if (!mediaType) {
    return false;
  }
  return LIGHT_NOVEL_TYPES.some(type => mediaType.includes(type));
}

function fetchAnimeByMalId(db, malId) {
  if (!malId) return null;
  return db
    .prepare(`
      SELECT id, mal_id, prequel_mal_id, sequel_mal_id, manga_source_mal_id, light_novel_source_mal_id, user_modified_fields
      FROM anime_series
      WHERE mal_id = ?
    `)
    .get(malId);
}

function fetchMangaByMalId(db, malId) {
  if (!malId) return null;
  return db
    .prepare(`
      SELECT id, mal_id, media_type, prequel_mal_id, sequel_mal_id,
             anime_adaptation_mal_id, light_novel_mal_id, manga_adaptation_mal_id,
             user_modified_fields
      FROM manga_series
      WHERE mal_id = ?
    `)
    .get(malId);
}

function ensureRelationValue(db, tableName, entity, fieldName, newValue) {
  if (!db || !entity || newValue === undefined || newValue === null) {
    return 0;
  }

  const currentValue = entity[fieldName];
  if (currentValue && Number(currentValue) === Number(newValue)) {
    return 0;
  }

  if (currentValue && Number(currentValue) !== Number(newValue)) {
    // Ne pas écraser une valeur déjà définie (les relations peuvent être multiples)
    return 0;
  }

  const updated = updateFieldIfNotUserModified(
    db,
    tableName,
    entity.id,
    fieldName,
    newValue,
    entity.user_modified_fields || null
  );

  return updated ? 1 : 0;
}

function propagateAnimeRelations(db, animeId) {
  if (!db || !animeId) return 0;

  try {
    const anime = db
      .prepare(`
        SELECT id, mal_id, prequel_mal_id, sequel_mal_id,
               manga_source_mal_id, light_novel_source_mal_id
        FROM anime_series
        WHERE id = ?
      `)
      .get(animeId);

    if (!anime || !anime.mal_id) {
      return 0;
    }

    let updates = 0;

    if (anime.prequel_mal_id) {
      const target = fetchAnimeByMalId(db, anime.prequel_mal_id);
      if (target && target.id !== anime.id) {
        updates += ensureRelationValue(db, 'anime_series', target, 'sequel_mal_id', anime.mal_id);
      }
    }

    if (anime.sequel_mal_id) {
      const target = fetchAnimeByMalId(db, anime.sequel_mal_id);
      if (target && target.id !== anime.id) {
        updates += ensureRelationValue(db, 'anime_series', target, 'prequel_mal_id', anime.mal_id);
      }
    }

    if (anime.manga_source_mal_id) {
      const target = fetchMangaByMalId(db, anime.manga_source_mal_id);
      if (target) {
        updates += ensureRelationValue(db, 'manga_series', target, 'anime_adaptation_mal_id', anime.mal_id);
      }
    }

    if (anime.light_novel_source_mal_id) {
      const target = fetchMangaByMalId(db, anime.light_novel_source_mal_id);
      if (target) {
        updates += ensureRelationValue(db, 'manga_series', target, 'anime_adaptation_mal_id', anime.mal_id);
      }
    }

    return updates;
  } catch (error) {
    console.warn(`⚠️ Impossible de propager les relations anime (ID ${animeId}):`, error.message);
    return 0;
  }
}

function propagateMangaRelations(db, mangaId) {
  if (!db || !mangaId) return 0;

  try {
    const manga = db
      .prepare(`
        SELECT id, mal_id, media_type, prequel_mal_id, sequel_mal_id,
               anime_adaptation_mal_id, light_novel_mal_id, manga_adaptation_mal_id
        FROM manga_series
        WHERE id = ?
      `)
      .get(mangaId);

    if (!manga || !manga.mal_id) {
      return 0;
    }

    let updates = 0;

    if (manga.prequel_mal_id) {
      const target = fetchMangaByMalId(db, manga.prequel_mal_id);
      if (target && target.id !== manga.id) {
        updates += ensureRelationValue(db, 'manga_series', target, 'sequel_mal_id', manga.mal_id);
      }
    }

    if (manga.sequel_mal_id) {
      const target = fetchMangaByMalId(db, manga.sequel_mal_id);
      if (target && target.id !== manga.id) {
        updates += ensureRelationValue(db, 'manga_series', target, 'prequel_mal_id', manga.mal_id);
      }
    }

    if (manga.anime_adaptation_mal_id) {
      const targetAnime = fetchAnimeByMalId(db, manga.anime_adaptation_mal_id);
      if (targetAnime) {
        const fieldName = isLightNovelEntry(manga) ? 'light_novel_source_mal_id' : 'manga_source_mal_id';
        updates += ensureRelationValue(db, 'anime_series', targetAnime, fieldName, manga.mal_id);
      }
    }

    if (manga.light_novel_mal_id) {
      const lightNovel = fetchMangaByMalId(db, manga.light_novel_mal_id);
      if (lightNovel && lightNovel.id !== manga.id) {
        updates += ensureRelationValue(db, 'manga_series', lightNovel, 'manga_adaptation_mal_id', manga.mal_id);
      }
    }

    if (manga.manga_adaptation_mal_id) {
      const mangaAdaptation = fetchMangaByMalId(db, manga.manga_adaptation_mal_id);
      if (mangaAdaptation && mangaAdaptation.id !== manga.id) {
        updates += ensureRelationValue(db, 'manga_series', mangaAdaptation, 'light_novel_mal_id', manga.mal_id);
      }
    }

    return updates;
  } catch (error) {
    console.warn(`⚠️ Impossible de propager les relations manga (ID ${mangaId}):`, error.message);
    return 0;
  }
}

function propagateAllAnimeRelations(db) {
  if (!db) return 0;
  try {
    const ids = db.prepare('SELECT id FROM anime_series WHERE mal_id IS NOT NULL').all();
    let totalUpdates = 0;
    ids.forEach(row => {
      totalUpdates += propagateAnimeRelations(db, row.id);
    });
    if (totalUpdates > 0) {
      console.log(`🔁 Cohérence relations anime: ${totalUpdates} mise(s) à jour appliquée(s).`);
    }
    return totalUpdates;
  } catch (error) {
    console.warn('⚠️ Impossible de propager les relations anime (global):', error.message);
    return 0;
  }
}

function propagateAllMangaRelations(db) {
  if (!db) return 0;
  try {
    const ids = db.prepare('SELECT id FROM manga_series WHERE mal_id IS NOT NULL').all();
    let totalUpdates = 0;
    ids.forEach(row => {
      totalUpdates += propagateMangaRelations(db, row.id);
    });
    if (totalUpdates > 0) {
      console.log(`🔁 Cohérence relations manga: ${totalUpdates} mise(s) à jour appliquée(s).`);
    }
    return totalUpdates;
  } catch (error) {
    console.warn('⚠️ Impossible de propager les relations manga (global):', error.message);
    return 0;
  }
}

function propagateAllRelations(db) {
  if (!db) return { anime: 0, manga: 0 };
  return {
    anime: propagateAllAnimeRelations(db),
    manga: propagateAllMangaRelations(db)
  };
}

module.exports = {
  propagateAnimeRelations,
  propagateMangaRelations,
  propagateAllAnimeRelations,
  propagateAllMangaRelations,
  propagateAllRelations
};
