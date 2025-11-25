const { net, session } = require('electron');

/**
 * Fait une requête HTTP en utilisant Electron.net avec cookies de session persistants
 * @param {string} url - URL à requêter
 * @param {object} options - Options (headers, method, etc.)
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
async function fetchWithSession(url, options = {}) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const persistentSession = session.fromPartition('persist:lenexus');

        // Vérifier les cookies disponibles pour debug
        try {
          const cookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
          const cookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
          const allCookies = [...cookies, ...cookiesWww];

          if (allCookies.length > 0 && url.includes('f95zone.to')) {
            const sessionCookies = allCookies.filter(c =>
              c.name === 'xf_session' || c.name === 'xf_user'
            );
            if (sessionCookies.length > 0) {
              console.log(`  🍪 ${allCookies.length} cookie(s) disponibles pour fetchWithSession (${sessionCookies.length} de session)`);
            }
          }
        } catch (error) {
          // Ignorer les erreurs de récupération de cookies
        }
        
        const request = net.request({
          url: url,
          method: options.method || 'GET',
          session: persistentSession
        });

        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request.setHeader(key, value);
          });
        }

        let responseData = '';

        request.on('response', (response) => {
          response.on('data', (chunk) => {
            responseData += chunk.toString();
          });

          response.on('end', () => {
            resolve({
              statusCode: response.statusCode,
              headers: response.headers,
              body: responseData,
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode,
              text: async () => responseData
            });
          });
        });

        request.on('error', (error) => {
          reject(error);
        });

        request.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
}

/**
 * Utilise une fenêtre Electron cachée pour charger la page et exécuter le JavaScript
 * Cela utilise directement le Chromium d'Electron (comme la fenêtre de connexion)
 * @param {string} url - URL de la page à charger
 * @returns {Promise<string|null>} HTML complet après exécution du JavaScript, ou null si erreur
 */
async function fetchWithPuppeteer(url) {
  const { BrowserWindow, session } = require('electron');
  const persistentSession = session.fromPartition('persist:lenexus');
  
  // Créer une session temporaire pour la fenêtre cachée pour éviter d'affecter la session principale
  // Mais copier les cookies de la session persistante pour l'authentification
  const tempSession = session.fromPartition('temp:puppeteer-' + Date.now());
  
  // Copier les cookies de la session persistante vers la session temporaire
  try {
    const cookies = await persistentSession.cookies.get({});
    for (const cookie of cookies) {
      await tempSession.cookies.set({
        ...cookie,
        url: cookie.domain.startsWith('.') ? `https://${cookie.domain.substring(1)}` : `https://${cookie.domain}`
      });
    }
  } catch (cookieError) {
    console.warn('  ⚠️ Erreur lors de la copie des cookies:', cookieError.message);
  }
  
  let hiddenWindow = null;
  
  try {
    console.warn('  🔍 Utilisation du Chromium d\'Electron (fenêtre cachée)');
    
    // Créer une fenêtre cachée avec une session temporaire (pour éviter d'affecter la session principale)
    hiddenWindow = new BrowserWindow({
      show: false,
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: tempSession // Utiliser une session temporaire pour éviter d'affecter la session principale
      }
    });

    // Bloquer les ressources inutiles pour accélérer (mais permettre les images de couverture)
    // On bloque seulement les images qui ne sont pas des couvertures
    // IMPORTANT: Utiliser une fonction nommée pour pouvoir la supprimer après
    const requestHandler = (details, callback) => {
      const resourceType = details.resourceType;
      const url = details.url;
      
      // Toujours bloquer fonts et media
      if (['font', 'media'].includes(resourceType)) {
        callback({ cancel: true });
        return;
      }
      
      // Pour les images, bloquer seulement si ce n'est pas une image de couverture
      // Les images de couverture sont généralement dans attachments.f95zone.to ou preview.f95zone.to
      if (resourceType === 'image') {
        // Permettre les images de couverture (attachments.f95zone.to, preview.f95zone.to)
        // et les images dans les lightbox (lbContainer)
        if (url.includes('attachments.f95zone.to') || 
            url.includes('preview.f95zone.to') ||
            url.includes('f95zone.to/attachments/')) {
          callback({}); // Autoriser cette image
          return;
        }
        // Bloquer les autres images (icônes, avatars, etc.)
        callback({ cancel: true });
        return;
      }
      
      // Autoriser tout le reste
      callback({});
    };
    
    hiddenWindow.webContents.session.webRequest.onBeforeRequest(requestHandler);

    // Récupérer les cookies pour vérification
    try {
      const electronCookies = await persistentSession.cookies.get({ domain: 'f95zone.to' });
      const electronCookiesWww = await persistentSession.cookies.get({ domain: '.f95zone.to' });
      const allCookies = [...electronCookies, ...electronCookiesWww];
      const uniqueCookies = Array.from(
        new Map(allCookies.map(cookie => [cookie.name, cookie])).values()
      );

      if (uniqueCookies && uniqueCookies.length > 0) {
        console.warn(`  🍪 ${uniqueCookies.length} cookie(s) de session Electron trouvé(s)`);
        const cookieNames = uniqueCookies.map(c => c.name).join(', ');
        console.warn(`  📋 Cookies: ${cookieNames}`);
        
        const hasSessionCookie = uniqueCookies.some(c => 
          c.name === 'xf_session' || c.name === 'xf_user' || c.name.includes('session')
        );
        console.warn(`  ${hasSessionCookie ? '✅' : '⚠️'} Cookie de session présent: ${hasSessionCookie}`);
      } else {
        console.warn(`  ⚠️ Aucun cookie de session Electron trouvé pour f95zone.to`);
        console.warn(`  💡 Pour récupérer tous les tags, connectez-vous à F95Zone dans l'application Electron`);
      }
    } catch (cookieError) {
      console.warn(`  ⚠️ Erreur lors de la vérification des cookies: ${cookieError.message}`);
    }

    // Charger la page
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout lors du chargement de la page'));
      }, 15000);

      hiddenWindow.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve();
      });

      hiddenWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        clearTimeout(timeout);
        reject(new Error(`Échec du chargement: ${errorDescription} (${errorCode})`));
      });

      hiddenWindow.loadURL(url);
    });

    // Attendre que les tags soient chargés
    let previousTagCount = 0;
    let stableCount = 0;
    const maxWaitTime = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const currentTagCount = await hiddenWindow.webContents.executeJavaScript(`
        document.querySelectorAll('.js-tagList .tagItem').length
      `);

      if (currentTagCount > previousTagCount) {
        previousTagCount = currentTagCount;
        stableCount = 0;
      } else if (currentTagCount === previousTagCount && currentTagCount > 0) {
        stableCount += 100;
        if (stableCount >= 1000) {
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Vérifier le nombre final de tags
    let finalTagCount = await hiddenWindow.webContents.executeJavaScript(`
      document.querySelectorAll('.js-tagList .tagItem').length
    `);

    // Si on a moins de 35 tags, essayer de scroller
    if (finalTagCount < 35) {
      await hiddenWindow.webContents.executeJavaScript(`
        (() => {
          const tagList = document.querySelector('.js-tagList');
          if (tagList) {
            tagList.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        })()
      `);

      await new Promise(resolve => setTimeout(resolve, 1000));

      finalTagCount = await hiddenWindow.webContents.executeJavaScript(`
        document.querySelectorAll('.js-tagList .tagItem').length
      `);

      if (finalTagCount < 35) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        finalTagCount = await hiddenWindow.webContents.executeJavaScript(`
          document.querySelectorAll('.js-tagList .tagItem').length
        `);
      }
    }

    // Vérifier l'URL
    const currentUrl = hiddenWindow.webContents.getURL();
    if (!currentUrl.includes('f95zone.to/threads/')) {
      console.warn(`  ⚠️ ATTENTION: URL actuelle (${currentUrl}) ne correspond pas à une page de thread F95Zone`);
    }

    // Récupérer le titre
    const pageTitle = await hiddenWindow.webContents.executeJavaScript(`
      document.querySelector('.p-title-value')?.textContent?.trim() || document.title
    `);
    console.warn(`  📄 Titre de la page détecté: ${pageTitle?.substring(0, 50)}...`);

    // Récupérer le HTML complet
    const html = await hiddenWindow.webContents.executeJavaScript(`
      document.documentElement.outerHTML
    `);

    console.warn('  ✅ HTML récupéré via Chromium d\'Electron (DOM complet avec JavaScript exécuté)');
    return html;
  } catch (error) {
    console.warn('  ⚠️ Erreur avec Chromium d\'Electron, utilisation du fetch classique:', error.message);
    return null;
  } finally {
    // Fermer la fenêtre et nettoyer la session temporaire
    if (hiddenWindow && !hiddenWindow.isDestroyed()) {
      hiddenWindow.close();
    }
    
    // Nettoyer la session temporaire
    try {
      await tempSession.clearStorageData();
    } catch (cleanupError) {
      // Ignorer les erreurs de nettoyage
    }
  }
}

/**
 * URL de l'API F95List pour le contrôle de version
 */
const F95LIST_API_URL = 'https://script.google.com/macros/s/AKfycbwb8C1478tnW30d77HtECYTxjJ2EpB1OrtQUueFeZ0tZPz3Uuze5s2FAQAnQOKShEzD/exec';

/**
 * Décode les entités HTML
 */
function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parse le HTML d'une page F95Zone pour extraire les informations du jeu
 * @param {string} html - Le HTML de la page F95Zone
 * @returns {object} Objet contenant { name, version, developer, status, engine, tags, image }
 */
function parseF95ZoneGameData(html) {
  // Utiliser jsdom pour parser le HTML et utiliser querySelectorAll comme le script Tampermonkey
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const decodeHTMLLocal = decodeHTML;

  // Extraire le titre depuis le <title>
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch) {
    throw new Error('Titre non trouvé dans la page F95Zone');
  }

  const fullTitle = decodeHTMLLocal(titleMatch[1]);
  const regTitle = /([\w\\']+)(?=\s-)/gi;
  const titleWords = Array.from(fullTitle.matchAll(regTitle)).map(m => m[0]);

  // Chercher le titre dans le h1 avec classe p-title-value (plus fiable) - utiliser jsdom
  const titleElement = document.querySelector('.p-title-value');
  let rawTitleText = '';
  if (titleElement) {
    // Utiliser textContent comme le script Tampermonkey
    rawTitleText = titleElement.textContent.trim().replace(/\s+/g, ' ');
  }
  if (!rawTitleText) {
    rawTitleText = decodeHTMLLocal(fullTitle).replace(/\s+/g, ' ').trim();
  }

  // Parser le titre structuré - utiliser la même logique que le script Tampermonkey
  // Le script utilise: regName = /.*-\s(.*?)\s\[/i pour extraire le nom entre " - " et le premier crochet
  const regNameForTitle = /.*-\s(.*?)\s\[/i;
  const regTitleForWords = /([\w\\']+)(?=\s-)/gi;

  const titleWordsMatch = fullTitle.match(regTitleForWords) || [];
  const nameMatch = fullTitle.match(regNameForTitle) || [];

  let parsedTitle = '';
  let parsedVersion = '';
  let parsedDeveloper = '';

  // PRIORITÉ 1: Utiliser regNameForTitle pour extraire le titre (comme le script Tampermonkey)
  // Cette regex fonctionne si le titre contient " - " (ex: "Ren'Py - A Family Venture [v0.09]")
  if (nameMatch && nameMatch[1]) {
    parsedTitle = nameMatch[1].trim();
  }

  // PRIORITÉ 2: Essayer le match structuré complet pour version et développeur
  const structuredMatch = rawTitleText.match(/(.*?)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*$/);

  if (structuredMatch) {
    // Si on n'a pas encore de titre, utiliser celui du structuredMatch
    if (!parsedTitle) {
      let extractedTitle = structuredMatch[1].trim();
      // Retirer "Ren'Py" ou "RenPy" du début si présent (comme le script Tampermonkey)
      // Le script extrait "A Family Venture" au lieu de "Ren'Py A Family Venture"
      extractedTitle = extractedTitle.replace(/^Ren['']?Py\s+/i, '').trim();
      parsedTitle = extractedTitle;
    }
    parsedVersion = structuredMatch[2].trim();
    parsedDeveloper = structuredMatch[3].trim();
  } else {
    // Fallback : extraire version et développeur séparément
    const versionFallback = rawTitleText.match(/\[([^\]]+)\]/);
    const developerFallback = rawTitleText.match(/\[([^\]]+)\]\s*$/);

    if (versionFallback) {
      parsedVersion = versionFallback[1].trim();
    }

    if (developerFallback) {
      parsedDeveloper = developerFallback[1].trim();
    }

    // Si on n'a pas encore de titre, extraire depuis rawTitleText et retirer "Ren'Py"
    if (!parsedTitle) {
      let extractedTitle = rawTitleText.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim();
      // Retirer "Ren'Py" ou "RenPy" du début si présent
      extractedTitle = extractedTitle.replace(/^Ren['']?Py\s+/i, '').trim();
      parsedTitle = extractedTitle || fullTitle.trim();
    }
  }

  // Si toujours pas de titre, utiliser rawTitleText ou title (sans "Ren'Py")
  if (!parsedTitle) {
    let fallbackTitle = rawTitleText.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim() || fullTitle.trim();
    fallbackTitle = fallbackTitle.replace(/^Ren['']?Py\s+/i, '').trim();
    parsedTitle = fallbackTitle;
  }

  const normalizedTitle = parsedTitle || 'Titre inconnu';
  const normalizedVersion = parsedVersion || '';
  const normalizedDeveloper = parsedDeveloper || '';

  // Log pour debug
  if (normalizedDeveloper) {
    console.log(`  👤 Développeur extrait: "${normalizedDeveloper}"`);
  }

  // Fallback sur les versions dans les crochets du title
  const versionMatch = fullTitle.matchAll(/\[([^\]]+)\]/gi);
  const allBracketsFromTitle = Array.from(versionMatch).map(m => m[1]);
  const validVersions = allBracketsFromTitle.filter(v =>
    v.toLowerCase().startsWith('v') ||
    /^\d+\.\d+/.test(v) ||
    /^(final|completed|abandoned)$/i.test(v) ||
    /^(arc|chapter|ch\.?|episode|ep\.?|season|s)\s*\d+/i.test(v) ||
    /^s\d+\s+(ch|chapter|ep|episode)\.?\s*\d+/i.test(v)
  );
  const fallbackVersion = validVersions.length > 0 ? validVersions[validVersions.length - 1] : null;
  const versionToSave = (normalizedVersion || fallbackVersion || '').trim();

  // Détecter le statut et le moteur
  let status = 'Ongoing';
  let engine = 'Autre';

  for (const word of titleWords) {
    switch (word) {
      case 'Abandoned':
        status = 'Abandoned';
        break;
      case 'Completed':
        status = 'Completed';
        break;
    }

    switch (word) {
      case "Ren'Py":
      case 'RenPy':
        engine = 'RenPy';
        break;
      case 'RPGM':
        engine = 'RPGM';
        break;
      case 'Unity':
        engine = 'Unity';
        break;
      case 'Unreal':
        engine = 'Unreal';
        break;
      case 'Flash':
        engine = 'Flash';
        break;
      case 'HTML':
        engine = 'HTML';
        break;
      case 'QSP':
        engine = 'QSP';
        break;
      case 'Others':
        engine = 'Autre';
        break;
    }
  }

  // Extraire l'image - utiliser jsdom comme le script Tampermonkey
  let image = null;

  // Méthode 1: Chercher img.bbImage avec data-src (comme le script Tampermonkey)
  const imageElement = document.querySelector("img.bbImage[data-src]") ||
    document.querySelector("img.bbImage[src]") ||
    document.querySelector("[data-lb-id] img");

  if (imageElement) {
    const container = imageElement.closest(".lbContainer");
    const zoomer = container?.querySelector(".lbContainer-zoomer");

    image = zoomer?.getAttribute("data-src") ||
      imageElement.getAttribute("data-src") ||
      imageElement.getAttribute("src") ||
      "";

    // Convertir en URL absolue si nécessaire
    if (image) {
      try {
        const url = new URL(image, 'https://f95zone.to');
        image = url.href;
      } catch (error) {
        // Garder l'image telle quelle si l'URL est invalide
      }
    }
  }

  // Fallback: meta og:image
  if (!image) {
    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage) {
      image = metaImage.getAttribute("content") || "";
    }
  }

  // Normaliser l'image
  if (image) {
    image = image.replace(/^https:\/\/preview\.f95zone\.to\//i, 'https://attachments.f95zone.to/');
  }

  if (image && image.includes('/thumb/')) {
    image = image.replace('/thumb/', '/');
  }

  // Extraire les tags - utiliser EXACTEMENT la même logique que le script Tampermonkey
  // Le script utilise: document.querySelectorAll(".tagItem") puis .textContent
  // On utilise jsdom pour avoir un vrai DOM et faire exactement pareil

  console.log('🔍 Extraction des tags depuis le HTML F95Zone...');

  // Compter les occurrences de "tagItem" dans le HTML brut pour debug
  const tagItemCountInHtml = (html.match(/class="[^"]*tagItem[^"]*"/gi) || []).length;
  console.log(`  🔍 Occurrences de "tagItem" dans le HTML brut: ${tagItemCountInHtml}`);

  // Méthode 0: Chercher les tags dans les scripts JavaScript ou données JSON
  // Certains sites chargent les tags via JavaScript depuis du JSON ou des variables JS
  let tags = [];
  const tagSet = new Set(); // Pour éviter les doublons

  // Chercher dans les scripts JavaScript pour des tableaux de tags ou des objets avec tags
  try {
    // Pattern 1: Chercher des tableaux JavaScript avec des tags (ex: var tags = ["tag1", "tag2"])
    const jsArrayPattern = /(?:var|let|const)\s+\w*[Tt]ag\w*\s*=\s*\[([^\]]+)\]/gi;
    let jsMatch;
    while ((jsMatch = jsArrayPattern.exec(html)) !== null) {
      const arrayContent = jsMatch[1];
      // Extraire les strings entre guillemets
      const stringPattern = /["']([^"']+)["']/g;
      let stringMatch;
      while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
        const potentialTag = stringMatch[1].trim();
        if (potentialTag && potentialTag.length > 0 && potentialTag.length < 50 &&
          !potentialTag.includes('http') && !potentialTag.includes('@') &&
          !tagSet.has(potentialTag.toLowerCase())) {
          tags.push(potentialTag);
          tagSet.add(potentialTag.toLowerCase());
        }
      }
    }

    // Pattern 2: Chercher dans les scripts avec type="application/json" ou "application/ld+json"
    const jsonScriptPattern = /<script[^>]*type=["']application\/(json|ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi;
    const { safeJsonParse } = require('../common-helpers');
    let scriptMatch;
    while ((scriptMatch = jsonScriptPattern.exec(html)) !== null) {
      const jsonData = safeJsonParse(scriptMatch[2], null);
      if (jsonData) {
        // Chercher récursivement dans le JSON pour trouver des tags
        const findTagsInObject = (obj, path = '') => {
          if (Array.isArray(obj)) {
            obj.forEach((item, index) => findTagsInObject(item, `${path}[${index}]`));
          } else if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
              const currentPath = path ? `${path}.${key}` : key;
              // Si la clé contient "tag" ou si c'est un tableau de strings courtes
              if (key.toLowerCase().includes('tag') && Array.isArray(value)) {
                value.forEach(tag => {
                  if (typeof tag === 'string') {
                    const cleanTag = tag.trim();
                    if (cleanTag && cleanTag.length > 0 && cleanTag.length < 50 &&
                      !cleanTag.includes('http') && !cleanTag.includes('@') &&
                      !tagSet.has(cleanTag.toLowerCase())) {
                      tags.push(cleanTag);
                      tagSet.add(cleanTag.toLowerCase());
                    }
                  }
                });
              } else if (typeof value === 'string' && value.length < 50 &&
                (key.toLowerCase().includes('tag') || currentPath.toLowerCase().includes('tag'))) {
                const cleanTag = value.trim();
                if (cleanTag && cleanTag.length > 0 &&
                  !cleanTag.includes('http') && !cleanTag.includes('@') &&
                  !tagSet.has(cleanTag.toLowerCase())) {
                  tags.push(cleanTag);
                  tagSet.add(cleanTag.toLowerCase());
                }
              } else if (typeof value === 'object') {
                findTagsInObject(value, currentPath);
              }
            });
          }
        };
        findTagsInObject(jsonData);
      }
    }

    // Pattern 3: Chercher dans les attributs data-* qui pourraient contenir des tags
    const dataTagPattern = /data-[^=]*tag[^=]*=["']([^"']+)["']/gi;
    let dataMatch;
    while ((dataMatch = dataTagPattern.exec(html)) !== null) {
      const potentialTag = decodeHTMLLocal(dataMatch[1]).trim();
      if (potentialTag && potentialTag.length > 0 && potentialTag.length < 50 &&
        !potentialTag.includes('http') && !tagSet.has(potentialTag.toLowerCase())) {
        tags.push(potentialTag);
        tagSet.add(potentialTag.toLowerCase());
      }
    }

    if (tags.length > 0) {
      console.log(`  ✅ Tags trouvés dans JavaScript/JSON: ${tags.length}`);
    }
  } catch (error) {
    // Ignorer les erreurs
  }

  try {
    // Méthode 1: Utiliser jsdom avec querySelectorAll (comme le script Tampermonkey)
    // D'abord, chercher spécifiquement dans .js-tagList pour être sûr
    const tagListContainer = document.querySelector(".js-tagList");
    let tagElements = [];

    if (tagListContainer) {
      console.log(`  🔍 Conteneur .js-tagList trouvé, extraction des tags depuis ce conteneur`);
      tagElements = tagListContainer.querySelectorAll(".tagItem") || [];
      console.log(`  🔍 Éléments .tagItem trouvés dans .js-tagList: ${tagElements.length}`);
    }

    // Fallback: chercher partout si le conteneur n'est pas trouvé
    if (tagElements.length === 0) {
      tagElements = document.querySelectorAll(".tagItem") || [];
      console.log(`  🔍 Éléments .tagItem trouvés partout (fallback): ${tagElements.length}`);
    }

    if (tagItemCountInHtml > tagElements.length) {
      console.warn(`  ⚠️ DÉCALAGE: ${tagItemCountInHtml} occurrences dans HTML brut mais seulement ${tagElements.length} trouvées par jsdom`);
    }

    // Extraire les tags depuis les éléments trouvés
    const newTags = Array.from(tagElements).map((tag) => {
      // Utiliser textContent comme le script Tampermonkey
      const text = tag.textContent ? tag.textContent.trim() : '';
      // Décoder les entités HTML (comme &amp; -> &)
      const decodedText = decodeHTMLLocal(text);
      if (decodedText && !tagSet.has(decodedText.toLowerCase())) {
        tagSet.add(decodedText.toLowerCase());
        return decodedText;
      }
      return null;
    }).filter(tag => tag !== null);

    // Ajouter les nouveaux tags à la liste
    tags = [...tags, ...newTags];

    console.log(`  ✅ Méthode jsdom: ${newTags.length} nouveau(x) tag(s) trouvé(s) (${tagElements.length} éléments .tagItem)`);
    console.log(`  📊 Total tags après jsdom: ${tags.length}`);

    // Debug: vérifier si on a bien tous les tags
    if (tagElements.length > 0 && newTags.length < tagElements.length) {
      console.warn(`  ⚠️ Attention: ${tagElements.length} éléments trouvés mais seulement ${newTags.length} tags valides`);
    }
  } catch (error) {
    console.warn('  ⚠️ Erreur avec jsdom:', error.message);
  }

  // Méthode 2: Fallback avec regex pour s'assurer qu'on ne rate rien
  // IMPORTANT: Si jsdom ne trouve que 31 tags mais qu'il devrait y en avoir 38,
  // utiliser le regex pour extraire TOUS les tags depuis le HTML brut
  // Chercher spécifiquement dans .js-tagList d'abord
  let regexFoundCount = 0;

  // Pattern pour trouver le contenu de .js-tagList
  // Utiliser un pattern plus permissif pour capturer même si la structure HTML varie
  const tagListMatch = html.match(/<span[^>]*class="[^"]*js-tagList[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

  if (tagListMatch) {
    const tagListContent = tagListMatch[1];
    console.log(`  🔍 Contenu .js-tagList trouvé dans HTML brut, extraction via regex...`);

    // Compter d'abord combien de tagItem on devrait trouver
    const expectedCount = (tagListContent.match(/class="[^"]*tagItem[^"]*"/gi) || []).length;
    console.log(`  🔍 Tags attendus dans .js-tagList (d'après regex): ${expectedCount}`);

    // Chercher tous les liens avec classe tagItem dans ce contenu
    // Utiliser un pattern plus robuste qui capture même les balises imbriquées
    const tagItemPattern = /<a[^>]*class="[^"]*tagItem[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const foundTags = [];

    while ((match = tagItemPattern.exec(tagListContent)) !== null) {
      let tagText = match[1];

      // Nettoyer le HTML imbriqué (supprimer toutes les balises)
      tagText = tagText.replace(/<[^>]*>/g, '');

      // Décoder les entités HTML (important pour &amp; -> &)
      tagText = decodeHTMLLocal(tagText);

      // Nettoyer les espaces
      tagText = tagText.trim().replace(/\s+/g, ' ');

      // Ajouter si non vide et non déjà présent
      if (tagText && tagText.length > 0 && !tagSet.has(tagText.toLowerCase())) {
        tags.push(tagText);
        tagSet.add(tagText.toLowerCase());
        foundTags.push(tagText);
        regexFoundCount++;
      }
    }

    if (regexFoundCount > 0) {
      console.log(`  ✅ Fallback regex depuis .js-tagList: ${regexFoundCount} tag(s) supplémentaire(s) trouvé(s)`);
    }

    // Si on trouve moins de tags que prévu ET qu'on n'a pas déjà tous les tags via jsdom, essayer un pattern plus large
    if (expectedCount > foundTags.length && tags.length < expectedCount) {
      console.log(`  🔄 Tentative avec pattern plus large (${foundTags.length}/${expectedCount} tags extraits par regex)...`);

      // Pattern alternatif : chercher tous les liens dans .js-tagList, même sans classe tagItem
      const allLinksPattern = /<a[^>]*href="\/tags\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let linkMatch;
      let altCount = 0;

      while ((linkMatch = allLinksPattern.exec(tagListContent)) !== null) {
        let tagText = linkMatch[1];
        tagText = tagText.replace(/<[^>]*>/g, '');
        tagText = decodeHTMLLocal(tagText).trim().replace(/\s+/g, ' ');

        if (tagText && tagText.length > 0 && !tagSet.has(tagText.toLowerCase())) {
          tags.push(tagText);
          tagSet.add(tagText.toLowerCase());
          altCount++;
        }
      }

      if (altCount > 0) {
        console.log(`  ✅ Pattern alternatif: ${altCount} tag(s) supplémentaire(s) trouvé(s)`);
      }
    } else if (tags.length >= expectedCount) {
      // Si on a déjà tous les tags via jsdom, pas besoin du fallback regex
      console.log(`  ✅ Tous les tags déjà récupérés via jsdom (${tags.length}/${expectedCount})`);
    }
  }

  // Fallback général si .js-tagList n'est pas trouvé ou si on n'a pas assez de tags
  if (tags.length < 35) {
    console.log(`  🔄 Fallback regex général (${tags.length} tags trouvés, objectif: 35+)...`);
    const tagItemPatterns = [
      /<a[^>]*class="[^"]*tagItem[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
      /<span[^>]*class="[^"]*tagItem[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      /<div[^>]*class="[^"]*tagItem[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<li[^>]*class="[^"]*tagItem[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
    ];

    for (const pattern of tagItemPatterns) {
      pattern.lastIndex = 0; // Réinitialiser pour chaque pattern
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let tagText = match[1];

        // Nettoyer le HTML imbriqué
        tagText = tagText.replace(/<[^>]*>/g, '');

        // Décoder les entités HTML
        tagText = decodeHTMLLocal(tagText);

        // Nettoyer les espaces
        tagText = tagText.trim().replace(/\s+/g, ' ');

        // Ajouter si non vide et non déjà présent
        if (tagText && tagText.length > 0 && !tagSet.has(tagText.toLowerCase())) {
          tags.push(tagText);
          tagSet.add(tagText.toLowerCase());
          regexFoundCount++;
        }
      }
    }

    if (regexFoundCount > 0) {
      console.log(`  ✅ Fallback regex général: ${regexFoundCount} tag(s) supplémentaire(s) au total`);
    }
  }

  // Méthode 3: Chercher aussi dans le HTML brut avec des patterns plus larges
  // Certains tags pourraient être dans des structures différentes ou chargés dynamiquement
  if (tags.length < 35) {
    console.log(`  🔄 Recherche complémentaire dans le HTML brut (${tags.length} tags trouvés, objectif: 35+)...`);

    // Chercher tous les liens dans les sections de tags (même sans classe tagItem)
    // Pattern pour trouver les sections de tags dans le HTML
    const tagSectionPatterns = [
      /<div[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<ul[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
      /<section[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
    ];

    const foundSections = new Set();
    for (const pattern of tagSectionPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const sectionHtml = match[1];
        // Chercher tous les liens dans cette section
        const linkPattern = /<a[^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkPattern.exec(sectionHtml)) !== null) {
          let tagText = linkMatch[1];
          // Nettoyer le HTML
          tagText = tagText.replace(/<[^>]*>/g, '');
          tagText = decodeHTMLLocal(tagText).trim();

          // Vérifier si ça ressemble à un tag valide
          if (tagText && tagText.length > 0 && tagText.length < 50 &&
            !tagSet.has(tagText.toLowerCase()) &&
            !tagText.includes('http') && !tagText.includes('@') &&
            !tagText.startsWith('www.') && !tagText.match(/^\d+$/)) {
            tags.push(tagText);
            tagSet.add(tagText.toLowerCase());
            foundSections.add(tagText);
          }
        }
      }
    }

    // Méthode 4: Chercher aussi avec jsdom dans les sections de tags
    // MAIS SEULEMENT dans .js-tagList pour éviter de récupérer des éléments de navigation
    const tagListContainer = document.querySelector('.js-tagList');
    let domFoundCount = 0;

    if (tagListContainer) {
      // Chercher tous les liens dans .js-tagList qui n'ont pas déjà été trouvés
      const links = tagListContainer.querySelectorAll('a') || [];
      for (const link of links) {
        const text = link.textContent.trim();
        // Vérifier que c'est bien un tag (pas un élément de navigation)
        // Les tags dans .js-tagList ont généralement la classe tagItem
        if (link.classList.contains('tagItem') && text && text.length > 0 && text.length < 50 && !tagSet.has(text.toLowerCase())) {
          // Vérifier si ça ressemble à un tag valide
          if (!text.includes('http') && !text.includes('@') && !text.startsWith('www.') && !text.match(/^\d+$/) &&
            !['Join Now!', 'Menu', 'Forums', 'RSS', 'Top', 'Bottom'].includes(text)) {
            tags.push(text);
            tagSet.add(text.toLowerCase());
            domFoundCount++;
          }
        }
      }
    }

    const totalNew = foundSections.size + domFoundCount;
    if (totalNew > 0) {
      console.log(`  ✅ Recherche complémentaire: ${totalNew} tag(s) supplémentaire(s) trouvé(s) (${foundSections.size} depuis HTML brut, ${domFoundCount} depuis jsdom)`);
    } else {
      console.log(`  ℹ️ Aucun tag supplémentaire trouvé dans les sections complémentaires`);
    }
  }

  console.log(`  📊 Total tags extraits: ${tags.length}`);

  // Log des tags pour debug (premiers et derniers)
  if (tags.length > 0) {
    const firstFew = tags.slice(0, 3).join(', ');
    const lastFew = tags.length > 3 ? tags.slice(-3).join(', ') : '';
    console.log(`  📝 Tags (échantillon): ${firstFew}${lastFew ? ` ... ${lastFew}` : ''}`);
  }

  // S'assurer que developer n'est pas une chaîne vide
  const finalDeveloper = normalizedDeveloper && normalizedDeveloper.trim() ? normalizedDeveloper.trim() : null;

  return {
    name: normalizedTitle.trim(),
    version: versionToSave || null,
    developer: finalDeveloper,
    status: status,
    engine: engine,
    tags: tags,
    image: image
  };
}

module.exports = { fetchWithSession, fetchWithPuppeteer, F95LIST_API_URL, parseF95ZoneGameData, decodeHTML };
