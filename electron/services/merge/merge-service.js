const { mergeConfigs } = require('./merge-config');
const { generateReport } = require('../../utils/report-generator');

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDisplayValue(fieldConfig, value) {
  if (value === null || value === undefined) return '';

  if (fieldConfig.type === 'json') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(parsed)) {
        return parsed.length > 5 ? `${parsed.slice(0, 5).join(', ')} (+${parsed.length - 5})` : parsed.join(', ');
      }
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed).slice(0, 5).join(', ');
      }
      return typeof value === 'string' ? value.substring(0, 120) : String(value);
    } catch {
      return typeof value === 'string' ? value.substring(0, 120) : String(value);
    }
  }

  if (fieldConfig.type === 'list' || fieldConfig.type === 'chips') {
    return String(value);
  }

  if (fieldConfig.type === 'longText') {
    const str = String(value);
    return str.length > 180 ? `${str.substring(0, 180)}…` : str;
  }

  if (fieldConfig.type === 'link') {
    return String(value);
  }

  if (fieldConfig.type === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  return String(value);
}

function compareValues(a, b) {
  return normalizeValue(a) === normalizeValue(b);
}

function ensureConfig(type) {
  const config = mergeConfigs[type];
  if (!config) {
    throw new Error(`Type de contenu inconnu: ${type}`);
  }
  return config;
}

function getMergePreview(db, type, sourceId, targetId) {
  try {
    const config = ensureConfig(type);
    const source = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(sourceId);
    if (!source) {
      return { success: false, error: `Entrée source ID ${sourceId} introuvable` };
    }

    const target = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(targetId);
    if (!target) {
      return { success: false, error: `Entrée cible ID ${targetId} introuvable` };
    }

    if (sourceId === targetId) {
      return { success: false, error: 'Impossible de fusionner une entrée avec elle-même' };
    }

    const fields = [];
    const previewFields = config.previewFields || [];

    previewFields.forEach((fieldConfig) => {
      const sourceValue = source[fieldConfig.key];
      if (!hasValue(sourceValue)) {
        return;
      }

      const targetValue = target[fieldConfig.key];

      fields.push({
        key: fieldConfig.key,
        label: fieldConfig.label,
        type: fieldConfig.type || 'text',
        sourceValue,
        sourceDisplayValue: formatDisplayValue(fieldConfig, sourceValue),
        targetValue,
        targetDisplayValue: hasValue(targetValue) ? formatDisplayValue(fieldConfig, targetValue) : '',
        targetHasValue: hasValue(targetValue),
        identical: compareValues(sourceValue, targetValue)
      });
    });

    return {
      success: true,
      type,
      entityLabel: config.label,
      table: config.table,
      fields,
      source: {
        id: sourceId,
        title: source[config.titleField] || `ID ${sourceId}`,
        cover: config.coverField ? source[config.coverField] : null
      },
      target: {
        id: targetId,
        title: target[config.titleField] || `ID ${targetId}`,
        cover: config.coverField ? target[config.coverField] : null
      }
    };
  } catch (error) {
    console.error('❌ Erreur préparation fusion:', error);
    return { success: false, error: error.message };
  }
}

function transferUserDataRecords(db, table, foreignKey, sourceId, targetId) {
  const rows = db.prepare(`SELECT * FROM ${table} WHERE ${foreignKey} = ?`).all(sourceId);
  let transferred = 0;

  rows.forEach((row) => {
    if (typeof row.user_id === 'undefined') {
      return;
    }
    const existing = db
      .prepare(`SELECT id FROM ${table} WHERE ${foreignKey} = ? AND user_id = ?`)
      .get(targetId, row.user_id);

    if (!existing) {
      db.prepare(
        `UPDATE ${table} SET ${foreignKey} = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(targetId, row.id);
      transferred++;
    } else {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);
    }
  });

  return transferred;
}

function transferMangaAssociations(db, sourceId, targetId) {
  const stats = {
    tomesTransferred: 0,
    userDataTransferred: 0,
    proprietairesTransferred: 0
  };

  const tomes = db.prepare('SELECT id, numero FROM manga_tomes WHERE serie_id = ?').all(sourceId);
  tomes.forEach((tome) => {
    const existing = db
      .prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?')
      .get(targetId, tome.numero);
    if (!existing) {
      db.prepare('UPDATE manga_tomes SET serie_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        targetId,
        tome.id
      );
      stats.tomesTransferred++;
    } else {
      db.prepare('DELETE FROM manga_tomes WHERE id = ?').run(tome.id);
    }
  });

  stats.userDataTransferred = transferUserDataRecords(
    db,
    'manga_user_data',
    'serie_id',
    sourceId,
    targetId
  );

  const proprietaires = db
    .prepare('SELECT id, user_id, user_uuid, tome_id FROM manga_manga_tomes_proprietaires WHERE serie_id = ?')
    .all(sourceId);

  const { getUserUuidById } = require('../../handlers/common-helpers');

  proprietaires.forEach((prop) => {
    const sourceTome = db.prepare('SELECT numero FROM manga_tomes WHERE id = ?').get(prop.tome_id);
    db.prepare('DELETE FROM manga_manga_tomes_proprietaires WHERE id = ?').run(prop.id);
    if (!sourceTome) {
      return;
    }

    const targetTome = db
      .prepare('SELECT id FROM manga_tomes WHERE serie_id = ? AND numero = ?')
      .get(targetId, sourceTome.numero);
    if (!targetTome) {
      return;
    }

    // Récupérer ou générer l'UUID pour cet utilisateur
    let userUuid = prop.user_uuid;
    if (!userUuid) {
      userUuid = getUserUuidById(db, prop.user_id);
    }

    const existing = db
      .prepare(
        'SELECT id FROM manga_manga_tomes_proprietaires WHERE serie_id = ? AND user_id = ? AND tome_id = ?'
      )
      .get(targetId, prop.user_id, targetTome.id);
    if (!existing) {
      db.prepare(
        'INSERT INTO manga_manga_tomes_proprietaires (serie_id, user_id, user_uuid, tome_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
      ).run(targetId, prop.user_id, userUuid, targetTome.id);
      stats.proprietairesTransferred++;
    }
  });

  return stats;
}

function transferAnimeAssociations(db, sourceId, targetId) {
  const stats = {
    episodesTransferred: 0,
    userDataTransferred: 0
  };

  // Note: anime_episodes table a été supprimée car redondante
  // Les données de progression sont dans anime_user_data.episode_progress (JSON)

  stats.userDataTransferred = transferUserDataRecords(
    db,
    'anime_user_data',
    'anime_id',
    sourceId,
    targetId
  );

  return stats;
}

function transferMovieAssociations(db, sourceId, targetId) {
  return {
    userDataTransferred: transferUserDataRecords(
      db,
      'movie_user_data',
      'movie_id',
      sourceId,
      targetId
    )
  };
}

function transferTvAssociations(db, sourceId, targetId) {
  return {
    userDataTransferred: transferUserDataRecords(
      db,
      'tv_show_user_data',
      'show_id',
      sourceId,
      targetId
    )
  };
}

function transferGameAssociations(db, sourceId, targetId) {
  return {
    userDataTransferred: transferUserDataRecords(
      db,
      'adulte_game_user_data',
      'game_id',
      sourceId,
      targetId
    )
  };
}

function transferBookAssociations(db, sourceId, targetId) {
  const stats = {
    proprietairesTransferred: 0,
    userDataTransferred: 0
  };

  // Transférer les propriétaires
  const proprietaires = db
    .prepare('SELECT * FROM book_proprietaires WHERE book_id = ?')
    .all(sourceId);

  proprietaires.forEach((prop) => {
    const existing = db
      .prepare('SELECT id FROM book_proprietaires WHERE book_id = ? AND user_id = ?')
      .get(targetId, prop.user_id);
    if (!existing) {
      db.prepare(
        'INSERT INTO book_proprietaires (book_id, user_id, prix, date_achat, created_at, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
      ).run(targetId, prop.user_id, prop.prix, prop.date_achat);
      stats.proprietairesTransferred++;
    } else {
      // Si existe déjà, supprimer la source
      db.prepare('DELETE FROM book_proprietaires WHERE id = ?').run(prop.id);
    }
  });

  // Transférer les données utilisateur
  stats.userDataTransferred = transferUserDataRecords(
    db,
    'book_user_data',
    'book_id',
    sourceId,
    targetId
  );

  return stats;
}

function transferAssociationsByType(db, type, sourceId, targetId) {
  switch (type) {
    case 'manga':
      return transferMangaAssociations(db, sourceId, targetId);
    case 'anime':
      return transferAnimeAssociations(db, sourceId, targetId);
    case 'movie':
      return transferMovieAssociations(db, sourceId, targetId);
    case 'tv':
      return transferTvAssociations(db, sourceId, targetId);
    case 'game':
      return transferGameAssociations(db, sourceId, targetId);
    case 'book':
      return transferBookAssociations(db, sourceId, targetId);
    default:
      return {};
  }
}

function mergeEntities(db, type, payload, getPathManager) {
  try {
    const config = ensureConfig(type);
    const { sourceId, targetId, selectedFields = [] } = payload || {};

    if (!sourceId || !targetId) {
      return { success: false, error: 'IDs source et cible requis' };
    }
    if (sourceId === targetId) {
      return { success: false, error: 'Impossible de fusionner une entrée avec elle-même' };
    }

    const source = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(sourceId);
    if (!source) {
      return { success: false, error: `Entrée source ID ${sourceId} introuvable` };
    }

    const target = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(targetId);
    if (!target) {
      return { success: false, error: `Entrée cible ID ${targetId} introuvable` };
    }

    const allowedFields = new Set(
      (config.allowedFields && config.allowedFields.length > 0
        ? config.allowedFields
        : (config.previewFields || []).map((f) => f.key)
      ).filter(Boolean)
    );

    const fieldsToApply = Array.from(new Set(selectedFields)).filter(
      (fieldKey) => allowedFields.has(fieldKey) && typeof source[fieldKey] !== 'undefined'
    );

    if (fieldsToApply.length === 0) {
      console.log('ℹ️ Fusion sans champs sélectionnés - seules les données associées seront transférées.');
    }

    let associationStats = {};

    const transaction = db.transaction(() => {
      if (fieldsToApply.length > 0) {
        const assignments = fieldsToApply.map((field) => `${field} = ?`);
        const values = fieldsToApply.map((field) => source[field]);
        const sql = `UPDATE ${config.table} SET ${assignments.join(
          ', '
        )}, updated_at = datetime('now') WHERE id = ?`;
        db.prepare(sql).run(...values, targetId);
      } else {
        db.prepare(`UPDATE ${config.table} SET updated_at = datetime('now') WHERE id = ?`).run(
          targetId
        );
      }

      associationStats = transferAssociationsByType(db, type, sourceId, targetId);
      db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(sourceId);
    });

    transaction();

    let reportPath = null;
    if (config.reportType && typeof getPathManager === 'function') {
      try {
        reportPath = generateReport(getPathManager, {
          type: config.reportType,
          stats: associationStats,
          mergeDetails: {
            sourceId,
            sourceTitre: source[config.titleField] || `ID ${sourceId}`,
            targetId,
            targetTitre: target[config.titleField] || `ID ${targetId}`,
            updatedFields: fieldsToApply
          },
          metadata: {
            timestamp: new Date().toISOString()
          },
          maxReports: 10
        });
      } catch (reportError) {
        console.warn('⚠️ Impossible de générer le rapport de fusion:', reportError.message);
      }
    }

    return {
      success: true,
      type,
      targetId,
      targetTitle: target[config.titleField] || `ID ${targetId}`,
      sourceTitle: source[config.titleField] || `ID ${sourceId}`,
      updatedFields: fieldsToApply,
      transfers: associationStats,
      reportPath
    };
  } catch (error) {
    console.error('❌ Erreur lors de la fusion:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getMergePreview,
  mergeEntities
};
