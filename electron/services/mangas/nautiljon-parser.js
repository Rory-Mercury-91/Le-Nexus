/**
 * Service de parsing pour Nautiljon.
 * Gère l'extraction et le parsing des données depuis le HTML de Nautiljon.
 */

/**
 * Fonction pour convertir une date française en ISO (YYYY-MM-DD)
 * @param {string} dateStr - Date au format français
 * @returns {string|null} - Date au format ISO ou null
 */
function convertToISO(dateStr) {
  if (!dateStr) return null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  
  const monthsFr = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  };
  
  const match1 = dateStr.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
  if (match1) {
    const [, day, month, year] = match1;
    const monthNum = monthsFr[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match2) {
    const [, day, month, year] = match2;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Extrait les données d'une série depuis le HTML de la page Nautiljon
 * @param {string} html - Contenu HTML de la page
 * @param {string} url - URL de la page (pour l'inclure dans les métadonnées)
 * @returns {Object} - Données extraites au format attendu par manga-import-service
 */
function extractMangaDataFromHTML(html, url) {
  // Extraire le texte brut de la page
  // On utilise une approche simple en enlevant les balises HTML
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ')
                           .replace(/&nbsp;/g, ' ')
                           .replace(/&amp;/g, '&')
                           .replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&quot;/g, '"')
                           .replace(/&#39;/g, "'");

  // 1. TITRE
  const titreMatch = html.match(/<h1[^>]*class="text_black"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  let titre = titreMatch ? titreMatch[1].trim() : '';
  titre = titre.replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '')
               .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '')
               .trim();

  if (!titre) {
    throw new Error('Impossible de trouver le titre de la série');
  }

  // 2. TITRE ORIGINAL
  let titre_original = null;
  const titreOrigMatch = textContent.match(/Titre original\s*:\s*([^\n]+)/i);
  if (titreOrigMatch) {
    titre_original = titreOrigMatch[1].trim();
  }

  // 3. TITRE ALTERNATIF
  let titre_alternatif = null;
  const titreAltMatch = textContent.match(/Titre alternatif\s*:\s*([^\n]+)/i);
  if (titreAltMatch) {
    titre_alternatif = titreAltMatch[1].trim();
  }

  // 4. TITRE VO (liste)
  const titreVoMatches = [...textContent.matchAll(/Titre VO\s*:\s*([^\n]+)/gi)];
  const titreVoList = titreVoMatches.map(match => match[1].trim()).filter(Boolean);

  // 4. TYPE / DÉMOGRAPHIE
  let demographie = null;
  const typeMatch = textContent.match(/Type\s*:\s*([^\n]+)/i);
  if (typeMatch) {
    demographie = typeMatch[1].trim();
  }

  let origine = null;
  const origineMatch = textContent.match(/Origine\s*:\s*([^\n]+)/i);
  if (origineMatch) {
    origine = origineMatch[1].trim();
  }

  let webnovel = false;
  const webnovelMatch = html.match(/<li[^>]*>\s*<span[^>]*>\s*Webnovel\s*:\s*<\/span>[^<]*<a[^>]*>\s*Oui\s*<\/a>\s*<\/li>/i);
  if (webnovelMatch) {
    webnovel = true;
  }

  // 5. GENRES
  let genres = null;
  const genresMatch = textContent.match(/Genres?\s*:\s*([^\n]+)/i);
  if (genresMatch) {
    genres = genresMatch[1].trim();
  }

  // 6. THÈMES
  let themes = null;
  const themesMatch = textContent.match(/Thèmes?\s*:\s*([^\n]+)/i);
  if (themesMatch) {
    themes = themesMatch[1].trim();
  }

  // 7. AUTEURS (simplifié - on prend juste "Auteur:" pour l'instant)
  let auteurs = null;
  const auteursMatch = textContent.match(/Auteur(?:\soriginal)?\s*:\s*([^\n]+)/i);
  if (auteursMatch) {
    auteurs = auteursMatch[1].trim();
  }

  // Scénariste, Dessinateur, etc.
  const auteursDetailed = {};
  const scenaristeMatch = textContent.match(/Scénariste\s*:\s*([^\n]+)/i);
  if (scenaristeMatch) auteursDetailed.scenariste = scenaristeMatch[1].trim();
  
  const dessinateurMatch = textContent.match(/Dessinateur\s*:\s*([^\n]+)/i);
  if (dessinateurMatch) auteursDetailed.dessinateur = dessinateurMatch[1].trim();
  
  const auteurOrigMatch = textContent.match(/Auteur original\s*:\s*([^\n]+)/i);
  if (auteurOrigMatch) auteursDetailed.auteur_original = auteurOrigMatch[1].trim();
  
  const traducteurMatch = textContent.match(/Traducteur\s*:\s*([^\n]+)/i);
  if (traducteurMatch) auteursDetailed.traducteur = traducteurMatch[1].trim();

  if (Object.keys(auteursDetailed).length > 0) {
    const auteursParts = [];
    if (auteursDetailed.scenariste) auteursParts.push(`Scénariste: ${auteursDetailed.scenariste}`);
    if (auteursDetailed.dessinateur) auteursParts.push(`Dessinateur: ${auteursDetailed.dessinateur}`);
    if (auteursDetailed.auteur_original) auteursParts.push(`Auteur original: ${auteursDetailed.auteur_original}`);
    if (auteursDetailed.traducteur) auteursParts.push(`Traducteur: ${auteursDetailed.traducteur}`);
    auteurs = auteursParts.join(' | ');
  }

  // 8. ÉDITEURS
  let editeur = null;
  const editeurMatch = textContent.match(/Éditeur VF\s*:\s*([^\n]+)/i);
  if (editeurMatch) {
    editeur = editeurMatch[1].trim();
  }

  let editeur_vo = null;
  const editeurVOMatch = textContent.match(/Éditeurs? VO\s*:\s*([^\n]+)/i);
  if (editeurVOMatch) {
    editeur_vo = editeurVOMatch[1].trim();
  }

  // 9. NOMBRE DE VOLUMES/CHAPITRES
  let nb_volumes = null;
  let nb_volumes_vo = null;
  let nb_chapitres = null;
  let nb_chapitres_vo = null;
  let type_contenu = 'volume';

  const nbChapMatch = textContent.match(/Nb chapitres VF\s*:\s*(\d+)/i);
  if (nbChapMatch) {
    nb_chapitres = parseInt(nbChapMatch[1]);
  }

  const nbChapVOMatch = textContent.match(/Nb chapitres VO\s*:\s*(\d+)/i);
  if (nbChapVOMatch) {
    nb_chapitres_vo = parseInt(nbChapVOMatch[1]);
  }

  const nbVolMatch = textContent.match(/Nb volumes VF\s*:\s*(\d+)/i);
  if (nbVolMatch) {
    nb_volumes = parseInt(nbVolMatch[1]);
  }

  const nbVolVOMatch = textContent.match(/Nb volumes VO\s*:\s*(\d+)/i);
  if (nbVolVOMatch) {
    nb_volumes_vo = parseInt(nbVolVOMatch[1]);
  }

  const hasVolumes = nb_volumes !== null || nb_volumes_vo !== null;
  const hasChapters = nb_chapitres !== null || nb_chapitres_vo !== null;

  if (hasVolumes && hasChapters) {
    type_contenu = 'volume+chapitre';
  } else if (hasChapters) {
    type_contenu = 'chapitre';
  } else if (hasVolumes) {
    type_contenu = 'volume';
  }

  // 10. ANNÉE
  let annee_publication = null;
  const anneeMatch = textContent.match(/Année VF\s*:\s*(\d{4})/i);
  if (anneeMatch) {
    annee_publication = parseInt(anneeMatch[1]);
  }

  // 11. PRIX
  let prix_defaut = null;
  const prixMatch = textContent.match(/Prix\s*:\s*(\d+(?:[.,]\d+)?)\s*€/i);
  if (prixMatch) {
    prix_defaut = parseFloat(prixMatch[1].replace(',', '.'));
  }

  // 12. STATUT
  let statut = null;
  const statutMatch = textContent.match(/Statut\s*:\s*([^\n]+)/i);
  if (statutMatch) {
    const statutStr = statutMatch[1].trim().toLowerCase();
    if (statutStr.includes('en cours') || statutStr.includes('en publication')) {
      statut = 'En cours';
    } else if (statutStr.includes('terminé') || statutStr.includes('terminée')) {
      statut = 'Terminée';
    } else {
      statut = 'En cours'; // Par défaut
    }
  } else {
    statut = 'En cours';
  }

  // 13. TYPE VOLUME
  let type_volume = 'Broché'; // Par défaut
  const typeVolMatch = textContent.match(/Type\s*:\s*([^\n]+)/i);
  if (typeVolMatch) {
    type_volume = typeVolMatch[1].trim();
  }

  // 14. LANGUE ORIGINALE
  let langue_originale = 'ja'; // Par défaut pour les mangas

  // 15. COUVERTURE
  let couverture_url = null;
  const coverMatch = html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i) ||
                      html.match(/<img[^>]*id="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i);
  if (coverMatch) {
    couverture_url = coverMatch[1];
    if (couverture_url.startsWith('/')) {
      couverture_url = `https://www.nautiljon.com${couverture_url}`;
    }
  }

  // 16. DESCRIPTION
  let description = null;
  const descMatch = html.match(/<div[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (descMatch) {
    description = descMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Construire l'objet de données au format attendu
  const mangaData = {
    titre,
    titre_alternatif,
    statut,
    type_volume,
    type_contenu,
    couverture_url: couverture_url || null,
    description: description || null,
    statut_publication: statut,
    genres: genres || null,
    themes: themes || null,
    demographie: demographie || null,
    langue_originale,
    annee_publication,
    nb_volumes,
    nb_volumes_vo,
    nb_chapitres,
    nb_chapitres_vo,
    editeur,
    editeur_vo,
    auteurs,
    _source: 'Nautiljon',
    _url: url,
    titre_original,
    _titre_vo_list: titreVoList,
    // Prix défaut pour les tomes (sera utilisé lors de l'extraction des tomes)
    _prix_defaut: prix_defaut
  };

  return {
    ...mangaData,
    origine: origine || null,
    source: null,
    webnovel: webnovel
  };
}

/**
 * Parse les détails d'un tome depuis le HTML de sa page
 * @param {string} html - Contenu HTML de la page du tome
 * @param {number} volumeNum - Numéro du volume
 * @returns {Object} - Détails du tome
 */
function parseTomeDetails(html, volumeNum) {
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ');

  // Image du tome
  let couverture_url = null;
  const coverMatch = html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i) ||
                      html.match(/<img[^>]*class="[^"]*coverimg[^"]*"[^>]*src="([^"]+)"/i) ||
                      html.match(/<img[^>]*itemprop="image"[^>]*src="([^"]+)"/i);
  if (coverMatch) {
    couverture_url = coverMatch[1];
    if (couverture_url.startsWith('/')) {
      couverture_url = `https://www.nautiljon.com${couverture_url}`;
    }
  }

  // Date de parution VF
  let date_sortie = null;
  const dateMatch = textContent.match(/Date de parution VF[^:]*:\s*([^\n]+)/i);
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    date_sortie = convertToISO(dateStr);
  }

  // Prix en euros
  let prix = null;
  const priceMatch = textContent.match(/Prix[^:]*:\s*(\d+(?:[.,]\d+)?)\s*€/i);
  if (priceMatch) {
    prix = parseFloat(priceMatch[1].replace(',', '.'));
  }

  return {
    numero: volumeNum,
    couverture_url,
    date_sortie,
    prix: prix || 0
  };
}

/**
 * Extrait les tomes depuis la page principale du manga
 * @param {string} html - HTML de la page principale
 * @param {string} baseUrl - URL de base de la page
 * @returns {Array<Object>} - Liste des tomes avec leurs URLs
 */
function extractTomeLinks(html, baseUrl) {
  const tomes = [];
  // Chercher tous les liens vers les volumes
  const volumeLinkRegex = /<a[^>]*href="([^"]*\/volume-\d+[^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
  const seenUrls = new Set();
  
  let match;
  while ((match = volumeLinkRegex.exec(html)) !== null) {
    const href = match[1];
    if (seenUrls.has(href)) continue;
    seenUrls.add(href);
    
    // Extraire le numéro de volume
    const volNumMatch = href.match(/volume-(\d+)/i);
    if (volNumMatch) {
      const volNum = parseInt(volNumMatch[1]);
      let fullUrl = href;
      if (!fullUrl.startsWith('http')) {
        fullUrl = fullUrl.startsWith('/') ? `https://www.nautiljon.com${fullUrl}` : `${baseUrl}/${fullUrl}`;
      }
      
      tomes.push({
        numero: volNum,
        url: fullUrl
      });
    }
  }
  
  // Trier par numéro
  tomes.sort((a, b) => a.numero - b.numero);
  return tomes;
}

module.exports = {
  convertToISO,
  extractMangaDataFromHTML,
  parseTomeDetails,
  extractTomeLinks
};
