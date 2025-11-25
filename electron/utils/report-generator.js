/**
 * Générateur de rapports d'état pour les imports, synchronisations et enrichissements
 * Gère automatiquement la rotation des fichiers (maximum 10 rapports conservés)
 */

const fs = require('fs');
const path = require('path');

/**
 * Génère un nom de fichier pour le rapport avec date et heure
 * @param {string} prefix - Préfixe du fichier (ex: 'mihon-import', 'mal-sync')
 * @returns {string} Nom de fichier formaté
 */
function generateReportFileName(prefix) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}-${dateStr}-${timeStr}.txt`;
}

/**
 * Fait la rotation des rapports, gardant seulement les N plus récents
 * @param {string} reportsDir - Dossier contenant les rapports
 * @param {string} prefix - Préfixe des fichiers à conserver
 * @param {number} maxReports - Nombre maximum de rapports à conserver (défaut: 10)
 */
function rotateReports(reportsDir, prefix, maxReports = 10) {
  try {
    if (!fs.existsSync(reportsDir)) {
      return;
    }

    // Lister tous les fichiers avec le préfixe
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith(prefix) && file.endsWith('.txt'))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Plus récents en premier

    // Supprimer les fichiers en excès
    if (files.length > maxReports) {
      const filesToDelete = files.slice(maxReports);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Rapport supprimé (rotation): ${file.name}`);
        } catch (error) {
          console.warn(`⚠️ Erreur lors de la suppression du rapport ${file.name}:`, error.message);
        }
      });
    }
  } catch (error) {
    console.warn(`⚠️ Erreur lors de la rotation des rapports:`, error.message);
  }
}

/**
 * Génère un rapport d'état et le sauvegarde avec rotation automatique
 * @param {Object} options - Options de génération du rapport
 * @param {Function} getPathManager - Fonction pour obtenir le PathManager
 * @param {string} options.type - Type d'opération ('mihon-import', 'mal-sync', 'enrichment-manga', 'enrichment-anime', 'nautiljon-import', 'nautiljon-sync')
 * @param {string} options.sourceFile - Nom du fichier source (optionnel)
 * @param {Object} options.stats - Statistiques globales
 * @param {Array} options.created - Liste des éléments créés (optionnel)
 * @param {Array} options.updated - Liste des éléments mis à jour (optionnel)
 * @param {Array} options.failed - Liste des erreurs (optionnel)
 * @param {Object} options.metadata - Métadonnées supplémentaires (optionnel)
 * @param {number} options.maxReports - Nombre maximum de rapports à conserver (défaut: 10)
 * @returns {string|null} Chemin du rapport généré, ou null en cas d'erreur
 */
function generateReport(getPathManager, options) {
  const {
    type,
    sourceFile = null,
    stats = {},
    created = [],
    updated = [],
    failed = [],
    potentialMatches = [],
    metadata = {},
    maxReports = 10
  } = options;

  try {
    const pm = getPathManager();
    if (!pm) {
      console.warn('⚠️ PathManager non disponible, impossible de générer le rapport');
      return null;
    }

    const paths = pm.getPaths();
    const reportsDir = path.join(paths.databases, 'reports');

    // Créer le dossier reports s'il n'existe pas
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Faire la rotation avant de créer le nouveau rapport
    rotateReports(reportsDir, type, maxReports);

    // Générer le nom du fichier
    const reportFileName = generateReportFileName(type);
    const reportPath = path.join(reportsDir, reportFileName);

    // Générer le contenu du rapport
    const now = new Date();
    const reportLines = [];
    const formatChangeValue = (value) => {
      if (value === undefined || value === null) {
        return '—';
      }
      if (typeof value === 'string') {
        return value.length > 80 ? `${value.substring(0, 77)}...` : value;
      }
      return String(value);
    };
    
    // En-tête
    reportLines.push('='.repeat(80));
    const typeLabels = {
      'mihon-import': 'RAPPORT D\'IMPORT MIHON',
      'mal-sync': 'RAPPORT DE SYNCHRONISATION MYANIMELIST',
      'mal-status-sync': 'RAPPORT DE SYNCHRONISATION STATUTS MYANIMELIST',
      'enrichment-manga': 'RAPPORT D\'ENRICHISSEMENT MANGAS',
      'enrichment-anime': 'RAPPORT D\'ENRICHISSEMENT ANIMES',
      'nautiljon-import': 'RAPPORT D\'IMPORT NAUTILJON',
      'nautiljon-sync': 'RAPPORT DE SYNCHRONISATION NAUTILJON',
      'adulte-game-sync': 'RAPPORT DE SYNCHRONISATION TRADUCTIONS JEUX ADULTES',
      'adulte-game-sync-existing': 'RAPPORT DE SYNCHRONISATION TRADUCTIONS JEUX ADULTES (EXISTANTS)',
      'adulte-game-updates-check': 'RAPPORT DE VÉRIFICATION MAJ JEUX ADULTES',
      'series-merge': 'RAPPORT DE FUSION DE SÉRIES'
    };
    reportLines.push(typeLabels[type] || `RAPPORT ${type.toUpperCase()}`);
    reportLines.push('='.repeat(80));
    reportLines.push(`Date: ${now.toLocaleString('fr-FR')}`);
    if (sourceFile) {
      reportLines.push(`Fichier source: ${typeof sourceFile === 'string' ? path.basename(sourceFile) : sourceFile}`);
    }
    if (metadata.user) {
      reportLines.push(`Utilisateur: ${metadata.user}`);
    }
    reportLines.push('');

    // Statistiques globales
    reportLines.push('STATISTIQUES GLOBALES:');
    reportLines.push('-'.repeat(80));
    
    // Pour les rapports de fusion de séries, afficher les détails de fusion
    if (type === 'series-merge' && options.mergeDetails) {
      const { sourceId, sourceTitre, targetId, targetTitre, mergedData } = options.mergeDetails;
      reportLines.push(`Fusion: "${sourceTitre}" (ID: ${sourceId}) → "${targetTitre}" (ID: ${targetId})`);
      reportLines.push(`Champs fusionnés: ${mergedData ? mergedData.join(', ') : 'Aucun'}`);
      reportLines.push('');
      if (stats) {
        reportLines.push(`Tomes transférés: ${stats.tomesTransferred || 0}`);
        reportLines.push(`Statuts transférés: ${stats.statutsTransferred || 0}`);
        reportLines.push(`Propriétaires transférés: ${stats.proprietairesTransferred || 0}`);
        reportLines.push(`Lectures transférées: ${stats.lecturesTransferred || 0}`);
        reportLines.push(`Séries masquées transférées: ${stats.masqueesTransferred || 0}`);
      }
      reportLines.push('');
    }
    
    if (stats && type !== 'series-merge') {
      if (stats.total !== undefined) {
      reportLines.push(`Total traité: ${stats.total}`);
    }
    if (stats.created !== undefined) {
      reportLines.push(`Créés: ${stats.created}`);
    }
    if (stats.updated !== undefined) {
      reportLines.push(`Mis à jour: ${stats.updated}`);
    }
    if (stats.enriched !== undefined) {
      reportLines.push(`Enrichis: ${stats.enriched}`);
    }
    if (stats.errors !== undefined) {
      reportLines.push(`Erreurs: ${stats.errors}`);
    }
    if (stats.skipped !== undefined) {
      reportLines.push(`Ignorés: ${stats.skipped}`);
    }
    if (stats.missing !== undefined) {
      reportLines.push(`Manquants: ${stats.missing}`);
    }
    if (stats.withMalId !== undefined) {
      reportLines.push(`Avec MAL ID: ${stats.withMalId}`);
    }
    if (stats.chaptersImported !== undefined) {
      reportLines.push(`Chapitres importés: ${stats.chaptersImported}`);
    }
    if (stats.mangas) {
      reportLines.push(`Mangas - Créés: ${stats.mangas.created || 0}, Mis à jour: ${stats.mangas.updated || 0}, Erreurs: ${stats.mangas.errors || 0}`);
    }
    if (stats.animes) {
      reportLines.push(`Animes - Créés: ${stats.animes.created || 0}, Mis à jour: ${stats.animes.updated || 0}, Erreurs: ${stats.animes.errors || 0}`);
    }
    if (stats.matched !== undefined) {
      reportLines.push(`Correspondances: ${stats.matched}`);
    }
    if (stats.synced !== undefined) {
      reportLines.push(`Synchronisés: ${stats.synced}`);
    }
    if (stats.checked !== undefined) {
      reportLines.push(`Vérifiés: ${stats.checked}`);
    }
    if (stats.sheetSynced !== undefined) {
      reportLines.push(`Google Sheet synchronisés: ${stats.sheetSynced}`);
    }
    if (stats.scraped !== undefined) {
      reportLines.push(`Scrapés: ${stats.scraped}`);
    }
    if (metadata.duration !== undefined) {
      const duration = Math.round(metadata.duration / 1000);
      reportLines.push(`Durée: ${duration}s`);
    }
    reportLines.push('');
    }

    // Détails des éléments créés
    if (created.length > 0) {
      reportLines.push('ÉLÉMENTS CRÉÉS:');
      reportLines.push('-'.repeat(80));
      created.forEach((item, index) => {
        reportLines.push(`${index + 1}. ${item.titre || item.name || item.title || 'Sans titre'}`);
        if (item.serieId) reportLines.push(`   ID série: ${item.serieId}`);
        if (item.animeId) reportLines.push(`   ID anime: ${item.animeId}`);
        if (item.id) reportLines.push(`   ID: ${item.id}`);
        
        // Informations d'action (si disponible)
        if (item.action) {
          if (item.action === 'created') {
            reportLines.push(`   ➕ Nouvelle série créée`);
          } else if (item.action === 'merged') {
            reportLines.push(`   🔄 Fusion effectuée`);
          }
        } else if (type === 'mal-sync' || type === 'mal-status-sync') {
          // Pour les rapports MAL, toujours indiquer si c'est une création
          if (item.serieId || item.animeId) {
            reportLines.push(`   ➕ Nouvelle série créée`);
          }
        }
        
        if (item.mal_id) reportLines.push(`   MAL ID: ${item.mal_id}`);
        if (item.source_url) {
          try {
            const url = new URL(item.source_url);
            reportLines.push(`   Site: ${url.hostname}`);
          } catch (e) {
            reportLines.push(`   Site: ${item.source_url}`);
          }
        }
        if (item.url) {
          try {
            const url = new URL(item.url);
            reportLines.push(`   URL: ${url.hostname}`);
          } catch (e) {
            reportLines.push(`   URL: ${item.url}`);
          }
        }
        if (item.f95_thread_id) reportLines.push(`   F95 Thread ID: ${item.f95_thread_id}`);
        if (item.plateforme) reportLines.push(`   Plateforme: ${item.plateforme}`);
        if (item.traducteur) reportLines.push(`   Traducteur: ${item.traducteur}`);
        if (item.traductions) reportLines.push(`   Traductions: ${item.traductions}`);
        reportLines.push('');
      });
    }

    // Détails des éléments mis à jour
    if (updated.length > 0) {
      reportLines.push('ÉLÉMENTS MIS À JOUR:');
      reportLines.push('-'.repeat(80));
      updated.forEach((item, index) => {
        reportLines.push(`${index + 1}. ${item.titre || item.name || item.title || 'Sans titre'}`);
        if (item.serieId) reportLines.push(`   ID série: ${item.serieId}`);
        if (item.animeId) reportLines.push(`   ID anime: ${item.animeId}`);
        if (item.id) reportLines.push(`   ID: ${item.id}`);
        
        // Informations de fusion (si disponible)
        if (item.action === 'merged' && item.existingSerieId) {
          // Afficher la fusion avec les noms des deux entrées
          if (item.existingSerieTitre) {
            reportLines.push(`   🔄 Fusion: "${item.titre || 'Sans titre'}" => "${item.existingSerieTitre}" (ID: ${item.existingSerieId})`);
          } else {
            reportLines.push(`   🔄 Fusion avec série existante ID: ${item.existingSerieId}`);
          }
          if (item.matchMethod) {
            const methodLabels = {
              'mal_id': 'par MAL ID',
              'title_exact': 'par titre exact',
              'title_similarity': 'par similarité de titre'
            };
            reportLines.push(`   📍 Méthode de matching: ${methodLabels[item.matchMethod] || item.matchMethod}`);
          }
          if (item.similarity !== null && item.similarity !== undefined) {
            reportLines.push(`   📊 Similarité: ${item.similarity.toFixed(2)}%`);
          }
          if (item.isExactMatch) {
            reportLines.push(`   ✅ Match exact détecté`);
          } else if (item.similarity >= 75) {
            reportLines.push(`   ⚠️ Match avec similarité détecté (≥75%)`);
          }
        }
        
        if (item.mal_id) reportLines.push(`   MAL ID: ${item.mal_id}`);
        if (item.source_url) {
          try {
            const url = new URL(item.source_url);
            reportLines.push(`   Site: ${url.hostname}`);
          } catch (e) {
            reportLines.push(`   Site: ${item.source_url}`);
          }
        }
        if (item.f95_thread_id) reportLines.push(`   F95 Thread ID: ${item.f95_thread_id}`);
        if (item.plateforme) reportLines.push(`   Plateforme: ${item.plateforme}`);
        if (item.traducteur) reportLines.push(`   Traducteur: ${item.traducteur}`);
        if (item.traductions) reportLines.push(`   Traductions: ${item.traductions}`);
        if (item.changes && Array.isArray(item.changes) && item.changes.length > 0) {
          reportLines.push(`   Modifications:`);
          item.changes.forEach(change => {
            if (change && typeof change === 'object' && 'field' in change) {
              const beforeVal = formatChangeValue(change.before);
              const afterVal = formatChangeValue(change.after);
              reportLines.push(`     • ${change.field}: ${beforeVal} → ${afterVal}`);
            } else {
              reportLines.push(`     • ${change}`);
            }
          });
        } else if (item.changes && typeof item.changes === 'string') {
          reportLines.push(`   Modifications: ${item.changes}`);
        }
        if (item.alreadySignaled) {
          reportLines.push(`   ⚠️ Mise à jour déjà signalée précédemment`);
        }
        if (item.minor) {
          reportLines.push(`   ℹ️ Changements mineurs (pas de signalement)`);
        }
        reportLines.push('');
      });
    }

    // Détails des matches potentiels non fusionnés (pour mihon-import et mal-sync)
    if (potentialMatches && potentialMatches.length > 0) {
      reportLines.push('MATCHES POTENTIELS NON FUSIONNÉS (À VÉRIFIER):');
      reportLines.push('-'.repeat(80));
      reportLines.push('⚠️ Les éléments ci-dessous ont été créés comme nouvelles entrées car des séries');
      reportLines.push('   similaires existaient déjà (similarité >= 75% mais non-exacte).');
      reportLines.push('   Vérifiez manuellement si vous souhaitez fusionner ces entrées.');
      reportLines.push('-'.repeat(80));
      potentialMatches.forEach((item, index) => {
        reportLines.push(`${index + 1}. "${item.newTitre || 'Sans titre'}"`);
        if (item.newSerieId) reportLines.push(`   ID nouvelle série: ${item.newSerieId}`);
        reportLines.push(`   🔍 Match potentiel avec: "${item.existingSerieTitre || 'Sans titre'}" (ID: ${item.existingSerieId})`);
        if (item.matchMethod) {
          const methodLabels = {
            'mal_id': 'par MAL ID',
            'title_exact': 'par titre exact',
            'title_similarity': 'par similarité de titre'
          };
          reportLines.push(`   📍 Méthode de matching: ${methodLabels[item.matchMethod] || item.matchMethod}`);
        }
        if (item.similarity !== null && item.similarity !== undefined) {
          reportLines.push(`   📊 Similarité: ${item.similarity.toFixed(2)}%`);
        }
        if (item.mal_id) reportLines.push(`   MAL ID: ${item.mal_id}`);
        if (item.source_url) {
          try {
            const url = new URL(item.source_url);
            reportLines.push(`   Site: ${url.hostname}`);
          } catch (e) {
            reportLines.push(`   Site: ${item.source_url}`);
          }
        }
        reportLines.push('');
      });
    }

    // Détails des erreurs
    if (failed.length > 0) {
      reportLines.push('ERREURS:');
      reportLines.push('-'.repeat(80));
      failed.forEach((item, index) => {
        reportLines.push(`${index + 1}. ${item.titre || item.name || item.title || 'Sans titre'}`);
        reportLines.push(`   Erreur: ${item.error || item.message || String(item)}`);
        if (item.mal_id) reportLines.push(`   MAL ID: ${item.mal_id}`);
        if (item.serieId) reportLines.push(`   ID série: ${item.serieId}`);
        if (item.animeId) reportLines.push(`   ID anime: ${item.animeId}`);
        if (item.source_url) {
          try {
            const url = new URL(item.source_url);
            reportLines.push(`   Site: ${url.hostname}`);
          } catch (e) {
            reportLines.push(`   Site: ${item.source_url}`);
          }
        }
        if (item.f95_thread_id) reportLines.push(`   F95 Thread ID: ${item.f95_thread_id}`);
        if (item.plateforme) reportLines.push(`   Plateforme: ${item.plateforme}`);
        reportLines.push('');
      });
    }

    // Pied de page
    reportLines.push('='.repeat(80));
    reportLines.push('Fin du rapport');
    reportLines.push('='.repeat(80));

    // Écrire le rapport
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');
    console.log(`📄 Rapport d'état sauvegardé: ${reportPath}`);

    return reportPath;
  } catch (error) {
    console.error(`⚠️ Erreur lors de la génération du rapport:`, error);
    return null;
  }
}

module.exports = {
  generateReport,
  rotateReports,
  generateReportFileName
};
