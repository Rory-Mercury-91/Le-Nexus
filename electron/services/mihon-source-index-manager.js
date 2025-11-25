/**
 * Service de gestion de l'index des sources Tachiyomi/Mihon
 * Gère le téléchargement, cache et mapping source ID → baseUrl
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// URL de l'index GitHub
const INDEX_URL = 'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json';

// Chemins des fichiers de cache
const INDEX_CURRENT = 'index-current.json';
const INDEX_PREVIOUS = 'index-previous.json';

// Timeouts
const HTTP_TIMEOUT = 30000; // 30 secondes
const TOTAL_TIMEOUT = 60000; // 60 secondes

// Intervalles de retry (en millisecondes)
const RETRY_INTERVALS = [
  1 * 60 * 60 * 1000,    // 1 heure
  3 * 60 * 60 * 1000,    // 3 heures
  6 * 60 * 60 * 1000,    // 6 heures
  9 * 60 * 60 * 1000,    // 9 heures
  12 * 60 * 60 * 1000,   // 12 heures
  24 * 60 * 60 * 1000    // 24 heures
];

// Durée de validité du cache (24 heures)
const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000;

/**
 * Charge l'index embarqué depuis le fichier statique
 * L'index est stocké dans electron/services/resources/index-embedded.json
 */
function loadEmbeddedIndex() {
  try {
    // Chemin relatif depuis electron/services vers resources/index-embedded.json
    const embeddedPath = path.join(__dirname, 'resources', 'index-embedded.json');
    
    if (fs.existsSync(embeddedPath)) {
      let data = fs.readFileSync(embeddedPath, 'utf8');
      
      // Supprimer le BOM (Byte Order Mark) si présent
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      
      // Nettoyer les espaces en début/fin
      data = data.trim();
      
      const embeddedIndex = JSON.parse(data);
      console.log(`✅ Index embarqué chargé depuis: ${embeddedPath}`);
      return embeddedIndex;
    } else {
      console.warn(`⚠️ Index embarqué introuvable: ${embeddedPath}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur chargement index embarqué:', error.message);
    // Ne pas bloquer si l'index embarqué échoue, le système utilisera l'index téléchargé
    return null;
  }
}

/**
 * Récupère le chemin du dossier configs depuis PathManager
 */
function getConfigsPath(getPathManager) {
  try {
    const pm = typeof getPathManager === 'function' ? getPathManager() : getPathManager;
    if (pm) {
      return pm.getPaths().configs;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de récupérer PathManager:', error.message);
  }
  return null;
}

/**
 * Construit le chemin complet d'un fichier d'index
 */
function getIndexFilePath(configsPath, fileName) {
  if (!configsPath) {
    return null;
  }
  return path.join(configsPath, fileName);
}

/**
 * Charge un index depuis le cache local
 */
function loadCachedIndex(configsPath, fileName) {
  try {
    const filePath = getIndexFilePath(configsPath, fileName);
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const data = fs.readFileSync(filePath, 'utf8');
    const index = JSON.parse(data);
    
    console.log(`✅ Index chargé depuis cache: ${fileName} (${new Date(stats.mtime).toISOString()})`);
    return { index, lastModified: stats.mtime };
  } catch (error) {
    console.error(`❌ Erreur chargement index ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Sauvegarde un index dans le cache local
 */
function saveIndexToCache(configsPath, fileName, index) {
  try {
    if (!configsPath) {
      console.warn('⚠️ Pas de configsPath, impossible de sauvegarder l\'index');
      return false;
    }

    // S'assurer que le dossier configs existe
    if (!fs.existsSync(configsPath)) {
      fs.mkdirSync(configsPath, { recursive: true });
    }

    const filePath = getIndexFilePath(configsPath, fileName);
    if (!filePath) {
      return false;
    }

    fs.writeFileSync(filePath, JSON.stringify(index, null, 2), 'utf8');
    console.log(`✅ Index sauvegardé dans cache: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde index ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Effectue une rotation des fichiers de cache
 */
function rotateCache(configsPath) {
  try {
    const currentPath = getIndexFilePath(configsPath, INDEX_CURRENT);
    const previousPath = getIndexFilePath(configsPath, INDEX_PREVIOUS);

    if (!currentPath || !previousPath) {
      return;
    }

    // Si index-current existe, le déplacer vers index-previous
    if (fs.existsSync(currentPath)) {
      // Supprimer l'ancien index-previous s'il existe
      if (fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
      // Déplacer current vers previous
      fs.renameSync(currentPath, previousPath);
      console.log('🔄 Cache roté: index-current → index-previous');
    }
  } catch (error) {
    console.error('❌ Erreur rotation cache:', error.message);
  }
}

/**
 * Télécharge l'index depuis GitHub avec support des headers HTTP
 */
function downloadIndex(progressCallback = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(INDEX_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // Lire l'ETag du cache actuel si disponible
    // Pour l'instant, on télécharge toujours, mais on peut améliorer avec ETag plus tard

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: HTTP_TIMEOUT,
      headers: {
        'User-Agent': 'Le-Nexus/1.0',
        'Accept': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      // Vérifier le code de statut
      if (res.statusCode === 304) {
        // Not Modified - utiliser le cache
        req.destroy();
        resolve({ success: false, notModified: true });
        return;
      }

      if (res.statusCode !== 200) {
        req.destroy();
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      // Télécharger le fichier
      let data = '';
      const totalLength = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedLength = 0;

      res.on('data', (chunk) => {
        data += chunk;
        downloadedLength += chunk.length;
        
        // Appeler le callback de progression si disponible
        if (progressCallback && totalLength > 0) {
          const progress = (downloadedLength / totalLength) * 100;
          progressCallback({
            downloaded: downloadedLength,
            total: totalLength,
            progress: progress
          });
        }
      });

      res.on('end', () => {
        try {
          const index = JSON.parse(data);
          resolve({
            success: true,
            index,
            etag: res.headers['etag'],
            lastModified: res.headers['last-modified']
          });
        } catch (error) {
          reject(new Error(`Erreur parsing JSON: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout du téléchargement'));
    });

    req.end();
  });
}

/**
 * Vérifie si le cache actuel est encore valide (< 24h)
 */
function isCacheValid(configsPath) {
  const cached = loadCachedIndex(configsPath, INDEX_CURRENT);
  if (!cached || !cached.lastModified) {
    return false;
  }

  const age = Date.now() - cached.lastModified.getTime();
  return age < CACHE_VALIDITY_MS;
}

/**
 * Récupère l'index en suivant la logique de priorités
 */
async function getSourceIndex(getPathManager, progressCallback = null) {
  const configsPath = getConfigsPath(getPathManager);

  // Priorité 1: Index-current (téléchargé depuis GitHub)
  const currentCached = loadCachedIndex(configsPath, INDEX_CURRENT);
  if (currentCached && isCacheValid(configsPath)) {
    console.log('✅ Utilisation index-current (cache valide)');
    return { success: true, index: currentCached.index, source: 'current' };
  }

  // Priorité 2: Index-previous (cache de secours)
  const previousCached = loadCachedIndex(configsPath, INDEX_PREVIOUS);
  if (previousCached) {
    console.log('✅ Utilisation index-previous (fallback)');
    return { success: true, index: previousCached.index, source: 'previous' };
  }

  // Priorité 3: Index embarqué
  const embeddedIndex = loadEmbeddedIndex();
  if (embeddedIndex) {
    console.log('✅ Utilisation index embarqué (fallback final)');
    return { success: true, index: embeddedIndex, source: 'embedded' };
  }

  // Aucun index disponible
  console.error('❌ Aucun index disponible');
  return { success: false, error: 'Aucun index disponible' };
}

/**
 * Télécharge et met à jour l'index
 */
async function updateSourceIndex(getPathManager, progressCallback = null) {
  const configsPath = getConfigsPath(getPathManager);

  try {
    console.log('🔄 Téléchargement de l\'index depuis GitHub...');
    
    if (progressCallback) {
      progressCallback({ step: 'downloading', message: 'Téléchargement de l\'index des sources...', progress: 0 });
    }

    const result = await Promise.race([
      downloadIndex(progressCallback),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout total')), TOTAL_TIMEOUT)
      )
    ]);

    if (result.notModified) {
      console.log('ℹ️ Index non modifié, utilisation du cache');
      return { success: true, updated: false };
    }

    if (result.success && result.index) {
      // Effectuer la rotation du cache
      rotateCache(configsPath);

      // Sauvegarder le nouvel index
      if (saveIndexToCache(configsPath, INDEX_CURRENT, result.index)) {
        console.log('✅ Index téléchargé et mis à jour avec succès');
        console.log(`   📦 ${Array.isArray(result.index) ? result.index.length : '?'} extensions chargées`);
        return { success: true, updated: true, index: result.index };
      }
    }

    return { success: false, error: 'Échec de la sauvegarde' };
  } catch (error) {
    console.error('❌ Erreur téléchargement index:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Initialise et garantit la disponibilité de l'index
 * Retourne immédiatement un index disponible (cache ou embarqué) et télécharge en arrière-plan si nécessaire
 */
async function ensureSourceIndex(getPathManager, progressCallback = null, store = null) {
  const configsPath = getConfigsPath(getPathManager);

  // 1. Vérifier si un cache valide existe
  const existingIndex = await getSourceIndex(getPathManager);
  
  // Si un index valide est disponible (cache actuel valide OU cache précédent OU embarqué)
  if (existingIndex.success) {
    // Si c'est un cache actuel valide, rien à faire
    if (existingIndex.source === 'current' && isCacheValid(configsPath)) {
      console.log('✅ Index actuel valide, pas besoin de téléchargement');
      // Réinitialiser le retry manager si succès
      if (store) {
        const retryManager = new RetryManager(store);
        retryManager.recordAttempt(true);
      }
      return existingIndex;
    }
    
    // Si l'index embarqué ou un cache non valide est utilisé, télécharger en arrière-plan
    // Mais retourner immédiatement l'index disponible
    console.log(`ℹ️ Index disponible (${existingIndex.source}), téléchargement en arrière-plan pour mise à jour...`);
    
    // Télécharger en arrière-plan (ne pas bloquer)
    updateSourceIndexInBackground(getPathManager, store).catch(error => {
      console.warn('⚠️ Échec téléchargement en arrière-plan:', error.message);
    });
    
    return existingIndex;
  }

  // 2. Aucun index disponible - télécharger immédiatement (bloquant)
  // Vérifier si on doit faire un retry
  let shouldTryDownload = true;
  if (store) {
    const retryManager = new RetryManager(store);
    shouldTryDownload = retryManager.shouldRetry();
    
    if (!shouldTryDownload) {
      const retryInfo = retryManager.getRetryInfo();
      const nextRetryDate = new Date(retryInfo.nextRetry);
      console.log(`⏰ Téléchargement reporté jusqu'à ${nextRetryDate.toISOString()}`);
      // Utiliser les fallbacks (doit y en avoir un au moins)
      return await getSourceIndex(getPathManager);
    }
  }

  // Télécharger avec callback de progression
  if (progressCallback) {
    progressCallback({ step: 'downloading', message: 'Téléchargement de l\'index des sources...', progress: 0 });
  }

  const updateResult = await updateSourceIndex(getPathManager, progressCallback);
  
  // Gérer le retry manager
  if (store) {
    const retryManager = new RetryManager(store);
    retryManager.recordAttempt(updateResult.success);
  }

  if (updateResult.success && updateResult.index) {
    return { success: true, index: updateResult.index, source: 'current' };
  }

  // Si le téléchargement échoue, utiliser les fallbacks
  return await getSourceIndex(getPathManager);
}

/**
 * Télécharge l'index en arrière-plan sans bloquer
 */
async function updateSourceIndexInBackground(getPathManager, store = null) {
  try {
    // Vérifier si on doit faire un retry
    let shouldTryDownload = true;
    if (store) {
      const retryManager = new RetryManager(store);
      shouldTryDownload = retryManager.shouldRetry();
      
      if (!shouldTryDownload) {
        return;
      }
    }

    const updateResult = await updateSourceIndex(getPathManager, null);
    
    // Gérer le retry manager
    if (store) {
      const retryManager = new RetryManager(store);
      retryManager.recordAttempt(updateResult.success);
    }

    if (updateResult.success && updateResult.updated) {
      console.log('✅ Index mis à jour en arrière-plan');
    }
  } catch (error) {
    console.warn('⚠️ Erreur téléchargement en arrière-plan:', error.message);
  }
}

/**
 * Crée un mapping source ID → baseUrl depuis l'index
 */
function createSourceMapping(index) {
  const mapping = new Map();

  if (!Array.isArray(index)) {
    console.warn('⚠️ Index invalide: attendu un tableau');
    return mapping;
  }

  for (const extension of index) {
    if (extension.sources && Array.isArray(extension.sources)) {
      for (const source of extension.sources) {
        if (source.id && source.baseUrl) {
          // Certaines sources peuvent avoir plusieurs URLs séparées par des virgules (miroirs)
          // IMPORTANT: Tous les miroirs pointent vers le même contenu, donc le choix est purement cosmétique
          // On préfère utiliser le domaine "principal" (celui qui correspond au nom de la source)
          // Ex: pour "Bato.to", on préfère "bato.to" plutôt que "ato.to" (premier dans la liste)
          // NOTE: Les URLs peuvent se terminer par # dans index.json, on les enlève avant parsing
          const urls = source.baseUrl.split(',')
            .map(url => {
              // Nettoyer l'URL : enlever espaces et tous les # (fragment) à la fin
              let cleaned = url.trim();
              // Enlever les # à la fin (fragment vide)
              cleaned = cleaned.replace(/#+$/, '');
              // Enlever aussi les fragments qui pourraient rester (ex: "https://example.com#fragment")
              const hashIndex = cleaned.indexOf('#');
              if (hashIndex !== -1) {
                cleaned = cleaned.substring(0, hashIndex);
              }
              // Enlever les slashes finaux superflus
              cleaned = cleaned.replace(/\/+$/, '');
              return cleaned;
            })
            .filter(url => url && url.startsWith('http'));
          
          if (urls.length === 0) continue;
          
          let selectedUrl = urls[0]; // Par défaut, prendre la première
          
          // Si plusieurs miroirs sont disponibles, chercher le domaine principal
          if (source.name && urls.length > 1) {
            // Extraire le nom principal du domaine depuis le nom de la source
            // Ex: "Bato.to" -> "bato", "Sushiscan.fr" -> "sushiscan"
            const sourceNameLower = source.name.toLowerCase();
            let domainKey = sourceNameLower.split(/[.\s-]/)[0];
            
            // Si le nom extrait est trop court, utiliser une partie plus longue
            if (!domainKey || domainKey.length < 3) {
              domainKey = sourceNameLower.replace(/[^a-z0-9]/g, '').substring(0, 10);
            }
            
            // Chercher une URL dont le hostname correspond au nom principal
            // Ex: pour "Bato.to" (domainKey = "bato"), chercher "bato.to" dans la liste
            // Cela permet de prioriser le domaine principal plutôt qu'un miroir générique
            const preferredUrl = urls.find(url => {
              try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
                const hostnameMain = hostname.split('.')[0];
                
                // Correspondance exacte : le premier segment du hostname correspond au nom de la source
                // Ex: "bato" === "bato" pour "Bato.to" -> trouve "bato.to"
                if (hostnameMain === domainKey) {
                  return true;
                }
                return false;
              } catch {
                return false;
              }
            });
            
            // Utiliser le domaine principal si trouvé, sinon garder le premier miroir
            // (tous les miroirs sont équivalents fonctionnellement)
            if (preferredUrl) {
              selectedUrl = preferredUrl;
            }
          }
          
          if (selectedUrl) {
            mapping.set(String(source.id), selectedUrl);
          }
        }
      }
    }
  }

  // Ne pas logger à chaque création de mapping (trop verbeux)
  return mapping;
}

/**
 * Récupère le baseUrl d'une source depuis son ID
 */
async function getBaseUrlForSource(sourceId, getPathManager, indexCache = null) {
  if (!sourceId) {
    return null;
  }

  // Si un index est déjà en cache, l'utiliser
  let index = indexCache?.index;

  // Sinon, récupérer l'index
  if (!index) {
    const indexResult = await getSourceIndex(getPathManager);
    if (!indexResult.success || !indexResult.index) {
      return null;
    }
    index = indexResult.index;
  }

  // Créer le mapping
  const mapping = createSourceMapping(index);
  
  // Chercher le baseUrl
  const baseUrl = mapping.get(String(sourceId));
  return baseUrl || null;
}

/**
 * Construit l'URL complète d'un manga depuis son ID de source et son URL relative
 */
async function buildSourceUrl(sourceId, mangaUrl, getPathManager, indexCache = null) {
  if (!sourceId || !mangaUrl) {
    return null;
  }

  // Si mangaUrl est déjà une URL complète, la retourner
  if (mangaUrl.startsWith('http://') || mangaUrl.startsWith('https://')) {
    return mangaUrl;
  }

  // Récupérer le baseUrl depuis l'index
  const baseUrl = await getBaseUrlForSource(sourceId, getPathManager, indexCache);
  if (!baseUrl) {
    return null;
  }

  // Normaliser le baseUrl (enlever le slash final et tous les # s'ils existent)
  // Le # est un caractère spécial (fragment) qui peut poser problème lors de la construction d'URLs
  let normalizedBaseUrl = baseUrl.replace(/\/+$/, ''); // Enlever les slashes finaux
  // Enlever tous les # (fragment) - même au milieu si présent
  const hashIndex = normalizedBaseUrl.indexOf('#');
  if (hashIndex !== -1) {
    normalizedBaseUrl = normalizedBaseUrl.substring(0, hashIndex);
  }

  // Construire l'URL complète
  if (mangaUrl.startsWith('/')) {
    return `${normalizedBaseUrl}${mangaUrl}`;
  } else {
    return `${normalizedBaseUrl}/${mangaUrl}`;
  }
}

/**
 * Gère le système de retry avec backoff progressif
 */
class RetryManager {
  constructor(store) {
    this.store = store;
    this.retryKey = 'mihon-index-download-retry';
  }

  getRetryInfo() {
    return this.store.get(this.retryKey, {
      lastAttempt: null,
      attemptCount: 0,
      nextRetry: null
    });
  }

  shouldRetry() {
    const info = this.getRetryInfo();
    
    if (!info.nextRetry) {
      return true;
    }

    return Date.now() >= info.nextRetry;
  }

  recordAttempt(success) {
    const info = this.getRetryInfo();
    
    if (success) {
      // Succès : réinitialiser le compteur
      this.store.set(this.retryKey, {
        lastAttempt: Date.now(),
        attemptCount: 0,
        nextRetry: null
      });
    } else {
      // Échec : planifier le prochain retry
      const attemptCount = info.attemptCount;
      const interval = RETRY_INTERVALS[Math.min(attemptCount, RETRY_INTERVALS.length - 1)];
      const nextRetry = Date.now() + interval;

      this.store.set(this.retryKey, {
        lastAttempt: Date.now(),
        attemptCount: attemptCount + 1,
        nextRetry
      });

      const retryDate = new Date(nextRetry);
      console.log(`⏰ Prochain retry prévu: ${retryDate.toISOString()} (dans ${Math.round(interval / 1000 / 60)} minutes)`);
    }
  }

  reset() {
    this.store.delete(this.retryKey);
  }
}

/**
 * Récupère la liste de tous les sites disponibles depuis l'index
 * Retourne un tableau de { id, name, baseUrl, lang }
 */
function getAllSourcesFromIndex(index) {
  const sources = [];

  if (!Array.isArray(index)) {
    return sources;
  }

  for (const extension of index) {
    if (extension.sources && Array.isArray(extension.sources)) {
      for (const source of extension.sources) {
        if (source.id && source.name && source.baseUrl) {
          // Certaines sources peuvent avoir plusieurs URLs séparées par des virgules (miroirs)
          // IMPORTANT: Tous les miroirs pointent vers le même contenu, donc le choix est purement cosmétique
          // On préfère utiliser le domaine "principal" (celui qui correspond au nom de la source)
          // Ex: pour "Bato.to", on préfère "bato.to" plutôt que "ato.to" (premier dans la liste)
          // NOTE: Les URLs peuvent se terminer par # dans index.json, on les enlève avant parsing
          const urls = source.baseUrl.split(',')
            .map(url => {
              // Nettoyer l'URL : enlever espaces et tous les # (fragment) à la fin
              let cleaned = url.trim();
              // Enlever les # à la fin (fragment vide)
              cleaned = cleaned.replace(/#+$/, '');
              // Enlever aussi les fragments qui pourraient rester (ex: "https://example.com#fragment")
              const hashIndex = cleaned.indexOf('#');
              if (hashIndex !== -1) {
                cleaned = cleaned.substring(0, hashIndex);
              }
              // Enlever les slashes finaux superflus
              cleaned = cleaned.replace(/\/+$/, '');
              return cleaned;
            })
            .filter(url => url && url.startsWith('http'));
          
          if (urls.length === 0) continue;
          
          let selectedUrl = urls[0]; // Par défaut, prendre la première
          
          // Si plusieurs miroirs sont disponibles, chercher le domaine principal
          if (source.name && urls.length > 1) {
            // Extraire le nom principal du domaine depuis le nom de la source
            // Ex: "Bato.to" -> "bato", "Sushiscan.fr" -> "sushiscan"
            const sourceNameLower = source.name.toLowerCase();
            let domainKey = sourceNameLower.split(/[.\s-]/)[0];
            
            // Si le nom extrait est trop court, utiliser une partie plus longue
            if (!domainKey || domainKey.length < 3) {
              domainKey = sourceNameLower.replace(/[^a-z0-9]/g, '').substring(0, 10);
            }
            
            // Chercher une URL dont le hostname correspond au nom principal
            // Ex: pour "Bato.to" (domainKey = "bato"), chercher "bato.to" dans la liste
            // Cela permet de prioriser le domaine principal plutôt qu'un miroir générique
            const preferredUrl = urls.find(url => {
              try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
                const hostnameMain = hostname.split('.')[0];
                
                // Correspondance exacte : le premier segment du hostname correspond au nom de la source
                // Ex: "bato" === "bato" pour "Bato.to" -> trouve "bato.to"
                if (hostnameMain === domainKey) {
                  return true;
                }
                return false;
              } catch {
                return false;
              }
            });
            
            // Utiliser le domaine principal si trouvé, sinon garder le premier miroir
            // (tous les miroirs sont équivalents fonctionnellement)
            if (preferredUrl) {
              selectedUrl = preferredUrl;
            }
          }
          
          sources.push({
            id: String(source.id),
            name: source.name,
            baseUrl: selectedUrl,
            lang: source.lang || 'all'
          });
        }
      }
    }
  }

  // Trier par nom
  sources.sort((a, b) => a.name.localeCompare(b.name));

  return sources;
}

/**
 * Récupère le nom d'un site depuis son ID
 */
function getSourceNameById(sourceId, index) {
  if (!sourceId || !index) {
    return null;
  }

  const sources = getAllSourcesFromIndex(index);
  const source = sources.find(s => s.id === String(sourceId));
  return source ? source.name : null;
}

/**
 * Récupère le nom d'un site depuis son baseUrl
 */
function getSourceNameByBaseUrl(baseUrl, index) {
  if (!baseUrl || !index) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    
    const sources = getAllSourcesFromIndex(index);
    
    // Chercher par correspondance exacte du hostname
    for (const source of sources) {
      try {
        const sourceUrl = new URL(source.baseUrl);
        const sourceHostname = sourceUrl.hostname.toLowerCase().replace(/^www\./, '');
        if (sourceHostname === hostname) {
          return source.name;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
    
    // Chercher par correspondance partielle
    for (const source of sources) {
      try {
        const sourceUrl = new URL(source.baseUrl);
        const sourceHostname = sourceUrl.hostname.toLowerCase().replace(/^www\./, '');
        if (hostname.endsWith(sourceHostname) || sourceHostname.endsWith(hostname)) {
          return source.name;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  } catch (e) {
    // Erreur parsing URL
  }

  return null;
}

module.exports = {
  ensureSourceIndex,
  updateSourceIndex,
  getSourceIndex,
  buildSourceUrl,
  getBaseUrlForSource,
  createSourceMapping,
  loadEmbeddedIndex,
  getAllSourcesFromIndex,
  getSourceNameById,
  getSourceNameByBaseUrl,
  RetryManager
};
