// ==UserScript==
// @name         Nautiljon → Le Nexus (Mangas & Animes Combiné)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Importe automatiquement vos mangas/scans et animes depuis Nautiljon vers Le Nexus avec support chapitres (Manhwa/Manhua) et déduplication intelligente. Script combiné pour les deux types de contenus.
// @author       Rory-Mercury91
// @match        https://www.nautiljon.com/mangas/*
// @match        https://www.nautiljon.com/animes/*
// @match        https://www.nautiljon.com/light_novels/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nautiljon.com
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      nautiljon.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 40000; // Port du serveur local Electron

    // Fonction pour convertir une date française en ISO (YYYY-MM-DD)
    const convertToISO = (dateStr) => {
        if (!dateStr) return null;
        
        // Si déjà au format ISO (YYYY-MM-DD), retourner tel quel
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
            return dateStr.trim();
        }
        
        // Convertir les dates françaises (ex: "16 juin 2021" ou "16/06/2021" ou "06/01/2024")
        const monthsFr = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        };
        
        // Format: "16 juin 2021"
        const match1 = dateStr.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
        if (match1) {
            const [, day, month, year] = match1;
            const monthNum = monthsFr[month.toLowerCase()];
            if (monthNum) {
                return `${year}-${monthNum}-${day.padStart(2, '0')}`;
            }
        }
        
        // Format: "06/01/2024" (DD/MM/YYYY)
        const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match2) {
            const [, day, month, year] = match2;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return null;
    };

    // Détecter si on est sur une page manga, light novel ou anime
    const isAnimePage = () => {
        return window.location.pathname.includes('/animes/');
    };
    
    const isLightNovelPage = () => {
        return window.location.pathname.includes('/light_novels/');
    };

    // Extraction des données depuis la page anime de Nautiljon
    const extractAnimeData = async () => {
        try {
            console.log('🎬 Extraction anime depuis Nautiljon...');
            
            const allText = document.body.innerText;
            
            // 1. TITRE * (obligatoire)
            let titre = 
                document.querySelector('h1.text_black')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('.titre')?.textContent?.trim() ||
                '';
            
            // Nettoyer le titre
            titre = titre
                .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '')
                .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '')
                .trim();
            
            if (!titre) {
                throw new Error('Impossible de trouver le titre de l\'anime');
            }
            
            console.log('✅ Titre:', titre);

            // 2. TITRE ORIGINAL (romaji + natif)
            let titre_original = null;
            const titreOrigMatch = allText.match(/Titre original\s*:\s*([^\n]+)/i);
            if (titreOrigMatch) {
                titre_original = titreOrigMatch[1].trim();
                console.log('🇯🇵 Titre original:', titre_original);
            }
            
            // Séparer romaji et natif si présent (format: "Ore dake Level Up na Ken / 俺だけレベルアップな件")
            let titre_romaji = null;
            let titre_natif = null;
            if (titre_original) {
                const parts = titre_original.split(' / ');
                if (parts.length >= 2) {
                    titre_romaji = parts[0].trim();
                    titre_natif = parts.slice(1).join(' / ').trim();
                } else {
                    // Vérifier si c'est du romaji (caractères latins) ou natif (caractères japonais)
                    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(titre_original)) {
                        titre_natif = titre_original;
                    } else {
                        titre_romaji = titre_original;
                    }
                }
            }

            // 3. TITRE ALTERNATIF
            let titre_alternatif = null;
            const titreAltMatch = allText.match(/Titre alternatif\s*:\s*([^\n]+)/i);
            if (titreAltMatch) {
                titre_alternatif = titreAltMatch[1].trim();
                console.log('🏷️ Titre alternatif:', titre_alternatif);
            }

            // 4. NOMBRE D'ÉPISODES ET DURÉE
            // Format: "12 × 24 min" ou "Série · Japon Japon · 12 × 24 min"
            let nb_episodes = null;
            let duree = null;
            const episodeMatch = allText.match(/(\d+)\s*×\s*(\d+)\s*min/i);
            if (episodeMatch) {
                nb_episodes = parseInt(episodeMatch[1]);
                const dureeMinutes = parseInt(episodeMatch[2]);
                duree = `${dureeMinutes} min par ep`;
                console.log('📺 Épisodes:', nb_episodes, '×', dureeMinutes, 'min');
            }

            // 5. ORIGINE (Source)
            let source = null;
            const origineMatch = allText.match(/Origine\s*:\s*([^\n]+)/i);
            if (origineMatch) {
                source = origineMatch[1].trim();
                console.log('📚 Origine:', source);
            }

            // 6. DATES DE DIFFUSION
            let date_debut = null;
            let date_fin = null;
            let en_cours_diffusion = false;
            
            // Format: "Diffusion terminée : du 06/01/2024 au 30/03/2024"
            const diffusionTermineeMatch = allText.match(/Diffusion terminée\s*:\s*du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
            if (diffusionTermineeMatch) {
                date_debut = convertToISO(diffusionTermineeMatch[1]);
                date_fin = convertToISO(diffusionTermineeMatch[2]);
                en_cours_diffusion = false;
                console.log('📅 Diffusion terminée:', date_debut, '→', date_fin);
            } else {
                // Format: "Diffusion en cours : depuis le 06/01/2024"
                const diffusionEnCoursMatch = allText.match(/Diffusion en cours\s*:\s*depuis le\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
                if (diffusionEnCoursMatch) {
                    date_debut = convertToISO(diffusionEnCoursMatch[1]);
                    en_cours_diffusion = true;
                    console.log('📅 Diffusion en cours depuis:', date_debut);
                }
            }

            // 7. SAISON DE DIFFUSION
            let saison_diffusion = null;
            const saisonMatch = allText.match(/Saison\s*:\s*([^\n]+)/i);
            if (saisonMatch) {
                saison_diffusion = saisonMatch[1].trim();
                console.log('🍂 Saison:', saison_diffusion);
            }

            // 8. DATE DE SORTIE VF (Version Française doublée) - Uniquement si explicitement mentionnée
            let date_sortie_vf = null;
            const dateVfMatch = allText.match(/Date de sortie en VF\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
            if (dateVfMatch) {
                date_sortie_vf = convertToISO(dateVfMatch[1]);
                console.log('🇫🇷 Date sortie VF (doublage français disponible):', date_sortie_vf);
            }

            // 9. DÉBUT SIMULCAST/STREAMING
            let date_debut_streaming = null;
            const streamingMatch = allText.match(/Début de diffusion en simulcast\/streaming\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
            if (streamingMatch) {
                date_debut_streaming = convertToISO(streamingMatch[1]);
                console.log('📡 Début streaming:', date_debut_streaming);
            }

            // 10. GENRES
            let genres = null;
            const genresMatch = allText.match(/Genres\s*:\s*([^\n]+)/i);
            if (genresMatch) {
                genres = genresMatch[1].trim().replace(/\s*-\s*/g, ', ');
                console.log('🎭 Genres:', genres);
            }

            // 11. THÈMES
            let themes = null;
            const themesMatch = allText.match(/Thèmes\s*:\s*([^\n]+)/i);
            if (themesMatch) {
                themes = themesMatch[1].trim().replace(/\s*-\s*/g, ', ');
                console.log('🏷️ Thèmes:', themes);
            }

            // 12. RATING et AGE CONSEILLÉ
            // D'abord extraire l'âge conseillé car c'est plus fiable
            let age_conseille = null;
            let rating = null;
            
            const ageMatch = allText.match(/Age conseillé\s*:\s*([^\n]+)/i);
            if (ageMatch) {
                age_conseille = ageMatch[1].trim();
                console.log('🔞 Age conseillé:', age_conseille);
                
                // Convertir l'âge conseillé en rating MAL standard
                if (age_conseille.includes('12') || age_conseille.includes('13')) {
                    rating = 'PG-13 - Teens 13 or older';
                } else if (age_conseille.includes('16')) {
                    rating = 'R - 17+ (violence & profanity)';
                } else if (age_conseille.includes('18')) {
                    rating = 'R - 17+ (violence & profanity)';
                } else if (age_conseille.toLowerCase().includes('tout public') || age_conseille.toLowerCase().includes('enfants')) {
                    rating = 'PG - Children';
                }
            }
            
            // Si pas de rating déterminé par l'âge, utiliser "Pour public averti"
            if (!rating) {
                const publicAvertiMatch = allText.match(/Pour public averti\s*:\s*Oui\s*\(([^)]+)\)/i);
                if (publicAvertiMatch) {
                    const description = publicAvertiMatch[1].trim();
                    // Convertir en format MAL standard
                    if (description.toLowerCase().includes('contenu adulte') || description.toLowerCase().includes('+18')) {
                        rating = 'Rx - Hentai'; // Contenu adulte = Rx (le plus explicite)
                    } else if (description.toLowerCase().includes('nudité modérée') || description.toLowerCase().includes('nudité')) {
                        rating = 'R+ - Mild Nudity';
                    } else if (description.toLowerCase().includes('violence modérée')) {
                        rating = 'R - 17+ (violence & profanity)';
                    } else if (description.toLowerCase().includes('violence')) {
                        rating = 'R - 17+ (violence & profanity)';
                    } else {
                        rating = 'R - 17+ (violence & profanity)';
                    }
                }
            }
            
            // Si l'âge conseillé est 18 ans ET qu'il y a "Pour public averti", considérer comme Rx
            if (age_conseille && age_conseille.includes('18') && !rating?.includes('Rx') && !rating?.includes('R+')) {
                const publicAvertiMatch = allText.match(/Pour public averti\s*:\s*Oui/i);
                if (publicAvertiMatch) {
                    rating = 'Rx - Hentai'; // 18 ans + public averti = Rx (le plus explicite)
                }
            }
            
            if (rating) {
                console.log('⚠️ Rating:', rating, age_conseille ? `(basé sur: ${age_conseille})` : '');
            }

            // 13. STUDIO D'ANIMATION
            let studios = null;
            const studioMatch = allText.match(/Studio d'animation\s*:\s*([^\n]+)/i);
            if (studioMatch) {
                studios = studioMatch[1].trim();
                console.log('🎬 Studio:', studios);
            }

            // 14. SIMULCAST / STREAMING (plateformes) - Extraire uniquement la partie avant "· Éditeur"
            // Attention : Ne pas confondre avec "Début de diffusion en simulcast/streaming" qui est pour la date
            let diffuseurs = null;
            // Chercher spécifiquement "Simulcast / streaming :" (sans "Début de diffusion")
            const streamingMatch2 = allText.match(/^(?!.*Début de diffusion)[^\n]*Simulcast\s*\/\s*streaming\s*:\s*([^\n]+)/im);
            // Si pas trouvé avec le premier pattern, essayer un pattern plus simple mais qui exclut "Début"
            if (!streamingMatch2) {
                // Chercher toutes les lignes qui contiennent "Simulcast / streaming"
                const lines = allText.split('\n');
                for (const line of lines) {
                    // Ignorer les lignes qui contiennent "Début de diffusion"
                    if (line.toLowerCase().includes('simulcast') && line.toLowerCase().includes('streaming') && 
                        !line.toLowerCase().includes('début de diffusion') && line.includes(':')) {
                        const match = line.match(/Simulcast\s*\/\s*streaming\s*:\s*(.+)/i);
                        if (match) {
                            let rawDiffuseurs = match[1].trim();
                            console.log('🔍 Raw Simulcast/Streaming trouvé:', rawDiffuseurs);
                            
                            // Extraire la partie avant "· Éditeur" ou "·"
                            const editeurSeparator = rawDiffuseurs.indexOf('·');
                            if (editeurSeparator !== -1) {
                                rawDiffuseurs = rawDiffuseurs.substring(0, editeurSeparator).trim();
                                console.log('🔍 Après séparation "·":', rawDiffuseurs);
                            }
                            
                            // Vérifier si la partie extraite contient uniquement une date (format DD/MM/YYYY)
                            const datePattern = /^\s*\d{1,2}[\/\s]\d{1,2}[\/\s]\d{4}\s*$/;
                            const containsDateOnly = datePattern.test(rawDiffuseurs);
                            
                            // Si ce n'est pas juste une date, et qu'il y a du texte (même avec des lettres), c'est probablement les plateformes
                            if (!containsDateOnly && rawDiffuseurs && /[a-zA-Z]/.test(rawDiffuseurs)) {
                                // Nettoyer et formater les diffuseurs
                                diffuseurs = rawDiffuseurs
                                    .replace(/\s*·\s*/g, ', ')
                                    .replace(/\s+/g, ' ')
                                    .trim();
                                console.log('📡 Simulcast/Streaming (plateformes):', diffuseurs);
                                break; // Sortir de la boucle une fois trouvé
                            } else if (containsDateOnly) {
                                console.log('⚠️ Ignoré (date détectée dans Simulcast/Streaming):', rawDiffuseurs);
                            }
                        }
                    }
                }
            } else {
                let rawDiffuseurs = streamingMatch2[1].trim();
                console.log('🔍 Raw Simulcast/Streaming trouvé:', rawDiffuseurs);
                
                // Extraire la partie avant "· Éditeur" ou "·"
                const editeurSeparator = rawDiffuseurs.indexOf('·');
                if (editeurSeparator !== -1) {
                    rawDiffuseurs = rawDiffuseurs.substring(0, editeurSeparator).trim();
                    console.log('🔍 Après séparation "·":', rawDiffuseurs);
                }
                
                // Vérifier si la partie extraite contient uniquement une date (format DD/MM/YYYY)
                const datePattern = /^\s*\d{1,2}[\/\s]\d{1,2}[\/\s]\d{4}\s*$/;
                const containsDateOnly = datePattern.test(rawDiffuseurs);
                
                // Si ce n'est pas juste une date, et qu'il y a du texte (même avec des lettres), c'est probablement les plateformes
                if (!containsDateOnly && rawDiffuseurs && /[a-zA-Z]/.test(rawDiffuseurs)) {
                    // Nettoyer et formater les diffuseurs
                    diffuseurs = rawDiffuseurs
                        .replace(/\s*·\s*/g, ', ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    console.log('📡 Simulcast/Streaming (plateformes):', diffuseurs);
                } else if (containsDateOnly) {
                    console.log('⚠️ Ignoré (date détectée dans Simulcast/Streaming):', rawDiffuseurs);
                }
            }
            
            if (!diffuseurs) {
                console.log('⚠️ Aucune ligne "Simulcast / streaming" (plateformes) trouvée dans le texte');
            }

            // 15. ÉDITEUR (DVD/Blu-ray)
            let editeur = null;
            const editeurMatch = allText.match(/Éditeur\s*:\s*([^\n]+)/i);
            if (editeurMatch) {
                editeur = editeurMatch[1].trim();
                console.log('💿 Éditeur:', editeur);
            }

            // 16. SITE WEB OFFICIEL - Extraire les URLs depuis les liens HTML
            // Stocker dans liens_externes au format JSON pour être compatible avec MAL
            let liens_externes = [];
            // Chercher la ligne "Site web officiel" dans le DOM
            const siteWebLi = Array.from(document.querySelectorAll('li')).find(li => {
                const spans = li.querySelectorAll('span.bold');
                const hasSiteWebLabel = Array.from(spans).some(span => 
                    span.textContent && span.textContent.includes('Site web officiel')
                );
                return hasSiteWebLabel;
            }) || Array.from(document.querySelectorAll('li')).find(li => {
                const text = li.textContent || '';
                return text.includes('Site web officiel') && text.includes(':');
            });
            
            if (siteWebLi) {
                // Chercher tous les liens <a> dans cet élément <li>
                const links = siteWebLi.querySelectorAll('a[href^="http"]');
                links.forEach(link => {
                    const href = link.href.trim();
                    const text = link.textContent.trim() || link.href;
                    if (href && !liens_externes.find(l => l.url === href)) {
                        liens_externes.push({
                            name: text === 'Lien' || text === 'Lien 2' ? new URL(href).hostname.replace('www.', '') : text,
                            url: href
                        });
                    }
                });
                
                if (liens_externes.length > 0) {
                    console.log('🌐 Site web officiel (URLs extraites):', liens_externes);
                } else {
                    console.log('⚠️ Site web officiel trouvé mais aucun lien HTTP trouvé');
                }
            }
            
            // Garder site_web pour compatibilité (premier lien si disponible)
            let site_web = liens_externes.length > 0 ? liens_externes[0].url : null;

            // 17. GROUPE (franchise)
            let franchise = null;
            const groupeMatch = allText.match(/Groupe\s*:\s*([^\n]+)/i);
            if (groupeMatch) {
                franchise = groupeMatch[1].trim();
                console.log('🔗 Groupe/Franchise:', franchise);
            }

            // 18. SYNOPSIS
            let description = null;
            
            // Chercher d'abord dans la div.description qui contient les <br> pour les paragraphes
            // Trouver le h2 "Synopsis" puis chercher .description dans le même .top_bloc
            const synopsisH2 = Array.from(document.querySelectorAll('.top_bloc h2')).find(h2 => 
                h2.textContent.trim().toLowerCase() === 'synopsis'
            );
            if (synopsisH2) {
                const topBloc = synopsisH2.closest('.top_bloc');
                const descriptionDiv = topBloc?.querySelector('.description');
                if (descriptionDiv) {
                    // Cloner l'élément pour ne pas modifier l'original
                    const clone = descriptionDiv.cloneNode(true);
                    // Convertir les <br> en sauts de ligne
                    clone.querySelectorAll('br').forEach(br => {
                        br.replaceWith(document.createTextNode('\n'));
                    });
                    // Extraire le texte (les balises HTML seront supprimées mais les \n conservés)
                    description = clone.textContent?.trim();
                }
            }
            
            // Fallback : chercher dans les éléments standards
            if (!description) {
                const synopsisElement = document.querySelector('#synopsis, .synopsis, [itemprop="description"]');
                if (synopsisElement) {
                    // Cloner pour convertir les <br>
                    const clone = synopsisElement.cloneNode(true);
                    clone.querySelectorAll('br').forEach(br => {
                        br.replaceWith(document.createTextNode('\n'));
                    });
                    description = clone.textContent?.trim();
                }
            }
            
            // Fallback : extraction depuis le texte brut
            if (!description) {
                const synopsisMatch = allText.match(/Synopsis\s+((?:.|\n)+?)(?=\n\n|Voir plus|Description rédigée|Compléter|Volumes|Bande-annonce|Fiches liées)/i);
                if (synopsisMatch) {
                    description = synopsisMatch[1].trim();
                }
            }
            
            if (description) {
                description = description
                    .replace(/^Synopsis\s*/i, '')
                    .replace(/Voir plus.*$/i, '')
                    .replace(/Description rédigée par.*$/is, '')
                    // Préserver les sauts de ligne multiples (paragraphes) mais normaliser les espaces multiples dans une même ligne
                    .replace(/[ \t]+/g, ' ') // Remplacer les espaces/tabs multiples par un seul espace
                    .replace(/\n{3,}/g, '\n\n') // Normaliser les sauts de ligne multiples (max 2)
                    .trim();
            }
            
            console.log('📝 Synopsis:', description ? `${description.substring(0, 80)}...` : 'Absent');

            // 19. COUVERTURE (prioriser l'affiche française si disponible)
            let couverture_url = null;
            
            // Chercher d'abord l'affiche française
            const afficheFrancaise = document.querySelector('#onglets_3_image_francaise img, a[title*="française" i] img, a[title*="affiche française" i] img');
            if (afficheFrancaise) {
                // Récupérer l'URL de la grande image (pas la mini)
                const afficheLink = afficheFrancaise.closest('a');
                if (afficheLink && afficheLink.href) {
                    // Convertir l'URL relative en absolue si nécessaire
                    couverture_url = afficheLink.href.startsWith('http') 
                        ? afficheLink.href 
                        : `https://www.nautiljon.com${afficheLink.href}`;
                    console.log('🖼️ Affiche française trouvée:', couverture_url);
                } else {
                    // Si pas de lien, utiliser l'image elle-même
                    couverture_url = afficheFrancaise.src;
                    // Remplacer "mini" par la version complète si possible
                    if (couverture_url.includes('/mini/')) {
                        couverture_url = couverture_url.replace('/mini/', '/');
                        console.log('🖼️ Affiche française (mini → complète):', couverture_url);
                    } else {
                        console.log('🖼️ Affiche française:', couverture_url);
                    }
                }
            }
            
            // Si pas d'affiche française, chercher l'affiche standard
            if (!couverture_url) {
                couverture_url = 
                    document.querySelector('.coverimg img')?.src ||
                    document.querySelector('.cover img')?.src ||
                    document.querySelector('img[itemprop="image"]')?.src ||
                    null;
                
                if (couverture_url) {
                    // Remplacer "mini" par la version complète si possible
                    if (couverture_url.includes('/mini/')) {
                        couverture_url = couverture_url.replace('/mini/', '/');
                    }
                    console.log('🖼️ Couverture standard:', couverture_url);
                } else {
                    console.log('🖼️ Aucune couverture trouvée');
                }
            }

            // 20. STATUT DE DIFFUSION
            let statut_diffusion = 'finished_airing';
            if (en_cours_diffusion) {
                statut_diffusion = 'currently_airing';
            } else if (!date_debut) {
                statut_diffusion = 'not_yet_aired';
            }

            // Construire l'objet de données
            const animeData = {
                titre: titre.trim(),
                titre_romaji: titre_romaji,
                titre_natif: titre_natif,
                titre_alternatif: titre_alternatif,
                titre_anglais: null, // Pas disponible sur Nautiljon
                nb_episodes: nb_episodes,
                duree: duree,
                source: source,
                date_debut: date_debut,
                date_fin: date_fin,
                en_cours_diffusion: en_cours_diffusion,
                saison_diffusion: saison_diffusion,
                date_sortie_vf: date_sortie_vf,
                date_debut_streaming: date_debut_streaming,
                genres: genres,
                themes: themes,
                rating: rating,
                age_conseille: age_conseille,
                studios: studios,
                diffuseurs: diffuseurs,
                editeur: editeur,
                site_web: site_web,
                liens_externes: liens_externes.length > 0 ? JSON.stringify(liens_externes) : null,
                franchise: franchise,
                description: description || null,
                couverture_url: couverture_url,
                statut_diffusion: statut_diffusion,
                
                // Métadonnées
                _source: 'Nautiljon',
                _url: window.location.href
            };
            
            console.log('📦 Données anime extraites:', animeData);
            return animeData;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'extraction anime:', error);
            throw error;
        }
    };

    // Extraire les données d'une page de tome avec retry sur 429 (pour mangas)
    const fetchTomeDetails = (tomeUrl, volumeNum, retryCount = 0) => {
        console.log(`  📖 Récupération tome ${volumeNum}: ${tomeUrl}`);
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: tomeUrl,
                onload: (response) => {
                    try {
                        // Si rate limit (429), attendre et réessayer
                        if (response.status === 429 && retryCount < 3) {
                            const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s max
                            console.log(`  ⏳ Rate limit détecté, attente de ${waitTime}ms avant retry...`);
                            setTimeout(() => {
                                fetchTomeDetails(tomeUrl, volumeNum, retryCount + 1).then(resolve).catch(reject);
                            }, waitTime);
                            return;
                        }
                        
                        const html = response.responseText;
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        // Image du tome
                        const tomeImage = 
                            doc.querySelector('.coverimg img')?.src ||
                            doc.querySelector('.cover img')?.src ||
                            doc.querySelector('img[itemprop="image"]')?.src ||
                            null;
                        
                        // Date de parution VF
                        let dateSortieVF = null;
                        const infoElements = doc.querySelectorAll('li, dd, p');
                        for (const el of infoElements) {
                            const text = el.textContent;
                            if (text.includes('Date de parution VF')) {
                                const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[a-zéû]+\s+\d{4})/i);
                                if (dateMatch) {
                                    dateSortieVF = convertToISO(dateMatch[1]);
                                    break;
                                }
                            }
                        }
                        
                        // Prix en euros
                        let prix = null;
                        for (const el of infoElements) {
                            const text = el.textContent;
                            if (text.includes('Prix')) {
                                const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/);
                                if (priceMatch) {
                                    prix = parseFloat(priceMatch[1].replace(',', '.'));
                                    break;
                                }
                            }
                        }
                        
                        console.log(`  ✅ Tome ${volumeNum}: image=${tomeImage ? '✓' : '✗'}, date=${dateSortieVF || 'N/A'}, prix=${prix ? prix + '€' : 'N/A'}`);
                        
                        resolve({
                            numero: volumeNum,
                            couverture_url: tomeImage,
                            date_sortie: dateSortieVF,
                            prix: prix
                        });
                        
                    } catch (error) {
                        console.warn(`  ⚠️ Erreur tome ${volumeNum}:`, error.message);
                        resolve({
                            numero: volumeNum,
                            couverture_url: null,
                            date_sortie: null,
                            prix: null
                        });
                    }
                },
                onerror: () => {
                    console.warn(`  ⚠️ Erreur réseau tome ${volumeNum}`);
                    resolve({
                        numero: volumeNum,
                        couverture_url: null,
                        date_sortie: null,
                        prix: null
                    });
                }
            });
        });
    };

    // Extraction des données depuis la page manga de Nautiljon
    const extractMangaData = async () => {
        try {
            console.log('🔍 Extraction manga depuis Nautiljon...');
            
            const lightNovelPage = isLightNovelPage();
            if (lightNovelPage) {
                console.log('📚 Page détectée comme Light Novel');
            }
            
            const allText = document.body.innerText;
            
            // 1. TITRE * (obligatoire)
            let titre = 
                document.querySelector('h1.text_black')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('.titre')?.textContent?.trim() ||
                '';
            
            // Nettoyer le titre
            titre = titre
                .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '')
                .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '')
                .trim();
            
            if (!titre) {
                throw new Error('Impossible de trouver le titre de la série');
            }
            
            console.log('✅ Titre:', titre);

            // 2. TITRE ORIGINAL (japonais/romanji)
            let titre_original = null;
            const titreOrigMatch = allText.match(/Titre original\s*:\s*([^\n]+)/i);
            if (titreOrigMatch) {
                titre_original = titreOrigMatch[1].trim();
                console.log('🇯🇵 Titre original:', titre_original);
            }

            // 3. TITRE ALTERNATIF
            let titre_alternatif = null;
            const titreAltMatch = allText.match(/Titre alternatif\s*:\s*([^\n]+)/i);
            if (titreAltMatch) {
                titre_alternatif = titreAltMatch[1].trim();
                console.log('🏷️ Titre alternatif:', titre_alternatif);
            }
            
            // Ne PAS fusionner titre_original dans titre_alternatif
            // titre_alternatif reste tel quel depuis Nautiljon
            // titre_original sera utilisé pour titre_vo si nécessaire

            // 4. TYPE (Shonen, Seinen, etc.)
            let type_demographie = null;
            const typeMatch = allText.match(/Type\s*:\s*([^\n]+)/i);
            if (typeMatch) {
                type_demographie = typeMatch[1].trim();
                console.log('📖 Type:', type_demographie);
            }

            // 5. GENRES
            let genres = null;
            const genresMatch = allText.match(/Genres?\s*:\s*([^\n]+)/i);
            if (genresMatch) {
                genres = genresMatch[1].trim();
                console.log('🎭 Genres:', genres);
            }

            // 6. THÈMES
            let themes = null;
            const themesMatch = allText.match(/Thèmes?\s*:\s*([^\n]+)/i);
            if (themesMatch) {
                themes = themesMatch[1].trim();
                console.log('🏷️ Thèmes:', themes);
            }

            // 7. AUTEURS AVEC RÔLES
            let auteurs = null;
            let auteurs_detailed = {};
            
            const scenaristeMatch = allText.match(/Scénariste\s*:\s*([^\n]+)/i);
            if (scenaristeMatch) {
                auteurs_detailed.scenariste = scenaristeMatch[1].trim();
                console.log('✍️ Scénariste:', auteurs_detailed.scenariste);
            }
            
            const dessinateurMatch = allText.match(/Dessinateur\s*:\s*([^\n]+)/i);
            if (dessinateurMatch) {
                auteurs_detailed.dessinateur = dessinateurMatch[1].trim();
                console.log('✍️ Dessinateur:', auteurs_detailed.dessinateur);
            }
            
            const auteurOrigMatch = allText.match(/Auteur original\s*:\s*([^\n]+)/i);
            if (auteurOrigMatch) {
                auteurs_detailed.auteur_original = auteurOrigMatch[1].trim();
                console.log('✍️ Auteur original:', auteurs_detailed.auteur_original);
            }
            
            const traducteurMatch = allText.match(/Traducteur\s*:\s*([^\n]+)/i);
            if (traducteurMatch) {
                auteurs_detailed.traducteur = traducteurMatch[1].trim();
                console.log('✍️ Traducteur:', auteurs_detailed.traducteur);
            }
            
            if (Object.keys(auteurs_detailed).length === 0) {
                const auteurMatch = allText.match(/Auteur(?:\soriginal)?\s*:\s*([^\n]+)/i);
                if (auteurMatch) {
                    auteurs = auteurMatch[1].trim();
                    console.log('✍️ Auteur:', auteurs);
                }
            } else {
                const auteursParts = [];
                if (auteurs_detailed.scenariste) auteursParts.push(`Scénariste: ${auteurs_detailed.scenariste}`);
                if (auteurs_detailed.dessinateur) auteursParts.push(`Dessinateur: ${auteurs_detailed.dessinateur}`);
                if (auteurs_detailed.auteur_original) auteursParts.push(`Auteur original: ${auteurs_detailed.auteur_original}`);
                if (auteurs_detailed.traducteur) auteursParts.push(`Traducteur: ${auteurs_detailed.traducteur}`);
                auteurs = auteursParts.join(' | ');
            }

            // 8. ÉDITEURS VF
            let editeur = null;
            const editeurMatch = allText.match(/Éditeur VF\s*:\s*([^\n]+)/i);
            if (editeurMatch) {
                editeur = editeurMatch[1].trim();
                console.log('🏢 Éditeur VF:', editeur);
            }
            
            // 9. ÉDITEURS VO - Extraction via DOM pour cibler la bonne édition
            // Pour un Manhwa, chercher l'édition coréenne (VO), pour un Manga, chercher l'édition japonaise (VO)
            let editeur_vo = null;
            const isManhwaForEditeur = type_demographie && type_demographie.toLowerCase().includes('manhwa');
            
            // Méthode 1 : Chercher dans le DOM via les h2/h3 qui contiennent la bonne édition VO
            try {
                // Log de débogage : afficher tous les headers pour comprendre la structure
                if (isManhwaForEditeur) {
                    const allHeaders = Array.from(document.querySelectorAll('h2, h3'));
                    console.log(`🔍 [DEBUG] ${allHeaders.length} header(s) h2/h3 trouvé(s) sur la page`);
                    const editionRelatedHeaders = allHeaders.filter(h => {
                        const text = h.textContent.toLowerCase();
                        return text.includes('édition');
                    });
                    console.log(`🔍 [DEBUG] ${editionRelatedHeaders.length} header(s) contenant "édition"`);
                    editionRelatedHeaders.forEach((h, idx) => {
                        console.log(`  [${idx}] "${h.textContent.trim()}"`);
                    });
                }
                
                const editionHeaders = Array.from(document.querySelectorAll('h2, h3')).filter(h => {
                    const text = h.textContent.toLowerCase();
                    if (isManhwaForEditeur) {
                        // Pour Manhwa : chercher édition coréenne (plusieurs variantes possibles)
                        // Recherche plus flexible : "corée", "coréen", "corée du sud", ou juste "sud" après "corée"
                        const hasEdition = text.includes('édition');
                        const hasCoree = text.includes('corée') || text.includes('coréen');
                        const hasSud = text.includes('sud');
                        const hasReliee = text.includes('reliée');
                        
                        // Combinaisons possibles
                        const match1 = hasEdition && hasCoree;
                        const match2 = hasEdition && hasReliee && (hasCoree || (text.includes('corée') && hasSud));
                        
                        if (match1 || match2) {
                            console.log(`✅ [DEBUG] Header match trouvé: "${h.textContent.trim()}"`);
                        }
                        
                        return match1 || match2;
                    } else {
                        // Pour Manga : chercher édition japonaise
                        return (text.includes('édition') && text.includes('japonaise')) || 
                               (text.includes('édition') && text.includes('reliée') && text.includes('japonaise'));
                    }
                });
                
                if (editionHeaders.length > 0) {
                    console.log(`🔍 ${editionHeaders.length} header(s) d'édition VO trouvé(s) pour extraction éditeur`);
                    for (const header of editionHeaders) {
                        // Chercher dans le parent du header (et ses parents si nécessaire)
                        let container = header.parentElement;
                        let searchDepth = 0;
                        while (container && searchDepth < 3) {
                            const containerText = container.textContent || container.innerText;
                            const editeurVOMatch = containerText.match(/Éditeurs? VO\s*:\s*([^\n]+)/i);
                            if (editeurVOMatch) {
                                editeur_vo = editeurVOMatch[1].trim();
                                console.log(`✅ Éditeur VO trouvé dans le conteneur parent (profondeur ${searchDepth})`);
                                break;
                            }
                            container = container.parentElement;
                            searchDepth++;
                        }
                        
                        if (editeur_vo) break;
                        
                        // Sinon, chercher dans les éléments suivants
                        let current = header.nextElementSibling;
                        for (let i = 0; i < 50 && current; i++) {
                            if (current.textContent) {
                                const editeurVOMatch = current.textContent.match(/Éditeurs? VO\s*:\s*([^\n]+)/i);
                                if (editeurVOMatch) {
                                    editeur_vo = editeurVOMatch[1].trim();
                                    console.log(`✅ Éditeur VO trouvé dans l'élément suivant (index ${i})`);
                                    break;
                                }
                            }
                            current = current.nextElementSibling;
                        }
                        if (editeur_vo) break;
                    }
                } else {
                    console.log('⚠️ Aucun header d\'édition VO trouvé pour extraction éditeur');
                }
            } catch (e) {
                console.log('⚠️ Erreur extraction DOM Éditeur VO:', e);
            }
            
            // Méthode 2 : Fallback sur allText
            if (!editeur_vo) {
                const editeurVOMatch = allText.match(/Éditeurs? VO\s*:\s*([^\n]+)/i);
                if (editeurVOMatch) {
                    editeur_vo = editeurVOMatch[1].trim();
                }
            }
            
            if (editeur_vo) {
                console.log('🏢 Éditeur VO:', editeur_vo);
            }

            // 9b. TITRE VO - Extraction via DOM pour plus de précision
            // Le "Titre VO" est généralement dans l'édition japonaise (même pour Manhwa, c'est la traduction japonaise)
            // Pour les autres champs (éditeur, année, volumes), on cherche dans l'édition coréenne pour Manhwa
            let titre_vo = null;
            
            // Méthode 1 : Chercher dans le DOM via les h2/h3 qui contiennent l'édition japonaise
            // (car "Titre VO" est généralement dans l'édition japonaise, même pour Manhwa)
            try {
                const editionHeaders = Array.from(document.querySelectorAll('h2, h3')).filter(h => {
                    const text = h.textContent.toLowerCase();
                    // Pour le titre VO, toujours chercher dans l'édition japonaise
                    return (text.includes('édition') && text.includes('japonaise')) || 
                           (text.includes('édition') && text.includes('reliée') && text.includes('japonaise'));
                });
                
                if (editionHeaders.length > 0) {
                    for (const header of editionHeaders) {
                        // Chercher dans le parent du header (section complète)
                        let container = header.parentElement;
                        if (container) {
                            const containerText = container.textContent || container.innerText;
                            // S'arrêter avant "Volume simple", "Tout cocher", "Édition", ou une nouvelle ligne avec un champ
                            const titreVOMatch = containerText.match(/Titre VO\s*:\s*([^\n]+?)(?=\s*(?:Volume simple|Tout cocher|Édition|Année|Nb volumes|Éditeur|Informations|$))/i);
                            if (titreVOMatch) {
                                titre_vo = titreVOMatch[1].trim();
                                break;
                            }
                        }
                        
                        // Sinon, chercher dans les éléments suivants
                        let current = header.nextElementSibling;
                        for (let i = 0; i < 30 && current; i++) {
                            if (current.textContent) {
                                // S'arrêter avant "Volume simple", "Tout cocher", "Édition", etc.
                                const titreVOMatch = current.textContent.match(/Titre VO\s*:\s*([^\n]+?)(?=\s*(?:Volume simple|Tout cocher|Édition|Année|Nb volumes|Éditeur|Informations|$))/i);
                                if (titreVOMatch) {
                                    titre_vo = titreVOMatch[1].trim();
                                    break;
                                }
                            }
                            current = current.nextElementSibling;
                        }
                        if (titre_vo) break;
                    }
                }
            } catch (e) {
                console.log('⚠️ Erreur extraction DOM Titre VO:', e);
            }
            
            // Méthode 2 : Fallback sur allText si pas trouvé via DOM
            if (!titre_vo) {
                // S'arrêter avant "Volume simple", "Tout cocher", "Édition", etc.
                let titreVOMatch = allText.match(/Titre VO\s*:\s*([^\n]+?)(?=\s*(?:Volume simple|Tout cocher|Édition|Année|Nb volumes|Éditeur|Informations|$))/i);
                if (!titreVOMatch) {
                    titreVOMatch = allText.match(/Titre VO\s+([^\n]+?)(?=\s*(?:Volume simple|Tout cocher|Édition|Année|Nb volumes|Éditeur|Informations|$))/i);
                }
                if (titreVOMatch) {
                    titre_vo = titreVOMatch[1].trim();
                }
            }
            
            if (titre_vo) {
                titre_vo = titre_vo.replace(/\s+/g, ' ').trim();
                console.log('📖 Titre VO:', titre_vo);
            } else {
                // Fallback : utiliser le titre original si disponible
                if (titre_original) {
                    titre_vo = titre_original;
                    console.log('📖 Titre VO (depuis Titre original):', titre_vo);
                } else {
                    console.log('⚠️ Titre VO non trouvé dans la page');
                }
            }

            // 10. NOMBRE DE VOLUMES ET/OU CHAPITRES
            let nb_volumes = null;
            let nb_volumes_vo = null;
            let nb_chapitres = null;
            let nb_chapitres_vo = null;
            let type_contenu = 'volume';
            
            const nbChapMatch = allText.match(/Nb chapitres VF\s*:\s*(\d+)/i);
            if (nbChapMatch) {
                nb_chapitres = parseInt(nbChapMatch[1]);
                console.log('📖 Nb chapitres VF:', nb_chapitres);
            }
            
            const nbChapVOMatch = allText.match(/Nb chapitres VO\s*:\s*(\d+)/i);
            if (nbChapVOMatch) {
                nb_chapitres_vo = parseInt(nbChapVOMatch[1]);
                console.log('📖 Nb chapitres VO:', nb_chapitres_vo);
            }
            
            const nbVolMatch = allText.match(/Nb volumes VF\s*:\s*(\d+)/i);
            if (nbVolMatch) {
                nb_volumes = parseInt(nbVolMatch[1]);
                console.log('📚 Nb volumes VF:', nb_volumes);
            }
            
            // Nb volumes VO - Extraction depuis plusieurs sources
            // Format 1: "Nb volumes VO : 15 (En cours)" dans le texte
            // Format 2: "Édition reliée Corée du Sud (15 tomes, en cours)" dans les headers
            let nbVolVOMatch = null;
            let statut_publication_vo = null; // Statut publication VO extrait depuis "Nb volumes VO : X (En cours)"
            const isManhwaForVolumes = type_demographie && type_demographie.toLowerCase().includes('manhwa');
            const isManhuaForVolumes = type_demographie && type_demographie.toLowerCase().includes('manhua');
            
            // Méthode 1 : Chercher "Nb volumes VO : X (En cours)" dans allText
            nbVolVOMatch = allText.match(/Nb volumes VO\s*:\s*(\d+)(?:\s*\(([^)]+)\))?/i);
            if (nbVolVOMatch) {
                console.log('✅ Nb volumes VO trouvé via champ "Nb volumes VO":', nbVolVOMatch[1]);
                // Extraire le statut entre parenthèses si présent
                if (nbVolVOMatch[2]) {
                    statut_publication_vo = nbVolVOMatch[2].trim();
                    console.log('✅ Statut publication VO trouvé:', statut_publication_vo);
                }
            }
            
            // Méthode 2 : Chercher dans les liens d'édition (format HTML: <a> Édition reliée <img flag> (X tomes, ...) </a>)
            if (!nbVolVOMatch) {
                try {
                    // Format HTML: <a class="tooltip infos_edition"> Édition reliée <img src="/static/images/flags/kr.png"> (15 tomes, en cours) </a>
                    // Chercher directement dans les liens <a> qui contiennent "Édition reliée" et un drapeau
                    const editionLinks = Array.from(document.querySelectorAll('a.infos_edition, a.tooltip')).filter(link => {
                        const text = (link.textContent || link.innerText).toLowerCase();
                        const hasEditionReliee = text.includes('édition') && text.includes('reliée');
                        const hasFlag = link.querySelector('img.flag');
                        
                        if (!hasEditionReliee || !hasFlag) return false;
                        
                        // Vérifier le pays du drapeau selon le type
                        if (isManhwaForVolumes) {
                            const flagAlt = hasFlag.getAttribute('alt') || hasFlag.getAttribute('title') || '';
                            return flagAlt.toLowerCase().includes('corée') || flagAlt.toLowerCase().includes('coréen');
                        } else if (isManhuaForVolumes) {
                            const flagAlt = hasFlag.getAttribute('alt') || hasFlag.getAttribute('title') || '';
                            return flagAlt.toLowerCase().includes('chine') || flagAlt.toLowerCase().includes('chinois');
                        } else {
                            // Pour Manga : chercher édition japonaise
                            const flagAlt = hasFlag.getAttribute('alt') || hasFlag.getAttribute('title') || '';
                            return flagAlt.toLowerCase().includes('japon') || flagAlt.toLowerCase().includes('japonais');
                        }
                    });
                    
                    if (editionLinks.length > 0) {
                        console.log(`🔍 ${editionLinks.length} lien(s) d'édition VO trouvé(s) pour extraction nb volumes`);
                        
                        // Chercher le format "(X tomes, ...)" dans le texte du lien
                        for (const link of editionLinks) {
                            const linkText = link.textContent || link.innerText;
                            // Format: "Édition reliée (15 tomes, en cours)" ou "Édition reliée Corée du Sud (15 tomes, en cours)"
                            const match = linkText.match(/\((\d+)\s+tomes?/i);
                            if (match) {
                                nbVolVOMatch = match;
                                console.log(`✅ Nb volumes VO trouvé dans lien "${linkText.trim()}":`, nbVolVOMatch[1]);
                                // Extraire aussi le statut depuis le lien si présent
                                if (!statut_publication_vo) {
                                    const statutMatch = linkText.match(/\([^)]*,\s*([^)]+)\)/i);
                                    if (statutMatch) {
                                        statut_publication_vo = statutMatch[1].trim();
                                        console.log(`✅ Statut publication VO trouvé dans lien:`, statut_publication_vo);
                                    }
                                }
                                break;
                            }
                        }
                    }
                    
                    // Fallback : Chercher dans les headers h2/h3 (ancienne méthode)
                    if (!nbVolVOMatch) {
                        const editionHeaders = Array.from(document.querySelectorAll('h2, h3')).filter(h => {
                            const text = h.textContent.toLowerCase();
                            if (isManhwaForVolumes) {
                                // Pour Manhwa : chercher édition coréenne
                                const hasEdition = text.includes('édition');
                                const hasCoree = text.includes('corée') || text.includes('coréen');
                                const hasSud = text.includes('sud');
                                const hasReliee = text.includes('reliée');
                                
                                const match1 = hasEdition && hasCoree;
                                const match2 = hasEdition && hasReliee && (hasCoree || (text.includes('corée') && hasSud));
                                
                                return match1 || match2;
                            } else if (isManhuaForVolumes) {
                                // Pour Manhua : chercher édition chinoise
                                return (text.includes('édition') && (text.includes('chine') || text.includes('chinois'))) ||
                                       (text.includes('édition') && text.includes('reliée') && (text.includes('chine') || text.includes('chinois')));
                            } else {
                                // Pour Manga : chercher édition japonaise
                                return (text.includes('édition') && text.includes('japonaise')) || 
                                       (text.includes('édition') && text.includes('reliée') && text.includes('japonaise'));
                            }
                        });
                        
                        if (editionHeaders.length > 0) {
                            console.log(`🔍 ${editionHeaders.length} header(s) d'édition VO trouvé(s) (fallback)`);
                            
                            for (const header of editionHeaders) {
                                const headerText = header.textContent || header.innerText;
                                const match = headerText.match(/\((\d+)\s+tomes?/i);
                                if (match) {
                                    nbVolVOMatch = match;
                                    console.log(`✅ Nb volumes VO trouvé dans header "${headerText.trim()}":`, nbVolVOMatch[1]);
                                    // Extraire aussi le statut depuis le header si présent
                                    if (!statut_publication_vo) {
                                        const statutMatch = headerText.match(/\([^)]*,\s*([^)]+)\)/i);
                                        if (statutMatch) {
                                            statut_publication_vo = statutMatch[1].trim();
                                            console.log(`✅ Statut publication VO trouvé dans header:`, statut_publication_vo);
                                        }
                                    }
                                    break;
                                }
                                
                                // Chercher aussi dans le lien parent
                                const linkElement = header.closest('a') || header.querySelector('a');
                                if (linkElement) {
                                    const linkText = linkElement.textContent || linkElement.innerText;
                                    const matchLink = linkText.match(/\((\d+)\s+tomes?/i);
                                    if (matchLink) {
                                        nbVolVOMatch = matchLink;
                                        console.log(`✅ Nb volumes VO trouvé dans lien parent "${linkText.trim()}":`, nbVolVOMatch[1]);
                                        // Extraire aussi le statut depuis le lien parent si présent
                                        if (!statut_publication_vo) {
                                            const statutMatch = linkText.match(/\([^)]*,\s*([^)]+)\)/i);
                                            if (statutMatch) {
                                                statut_publication_vo = statutMatch[1].trim();
                                                console.log(`✅ Statut publication VO trouvé dans lien parent:`, statut_publication_vo);
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('⚠️ Erreur extraction DOM Nb volumes VO:', e);
                }
            }
            
            if (nbVolVOMatch) {
                nb_volumes_vo = parseInt(nbVolVOMatch[1]);
                console.log('📚 Nb volumes VO:', nb_volumes_vo);
                
                // Normaliser le statut publication VO si présent
                if (statut_publication_vo) {
                    const statutLower = statut_publication_vo.toLowerCase();
                    if (statutLower.includes('terminé') || statutLower.includes('fini')) {
                        statut_publication_vo = 'Terminée';
                    } else if (statutLower.includes('en cours') || statutLower.includes('en publication')) {
                        statut_publication_vo = 'En cours';
                    } else if (statutLower.includes('abandonné') || statutLower.includes('annulé')) {
                        statut_publication_vo = 'Abandonnée';
                    } else {
                        // Garder le texte original si non reconnu
                        statut_publication_vo = statut_publication_vo.charAt(0).toUpperCase() + statut_publication_vo.slice(1).toLowerCase();
                    }
                    console.log('📊 Statut publication VO normalisé:', statut_publication_vo);
                }
            } else {
                console.log('⚠️ Nb volumes VO non trouvé dans la page');
            }
            
            const hasVolumes = nb_volumes !== null || nb_volumes_vo !== null;
            const hasChapters = nb_chapitres !== null || nb_chapitres_vo !== null;
            
            if (hasVolumes && hasChapters) {
                type_contenu = 'volume+chapitre';
                console.log('📦 Type: Webtoon avec tomes ET chapitres');
            } else if (hasChapters) {
                type_contenu = 'chapitre';
                console.log('📦 Type: Scan/webcomic numérique');
            } else if (hasVolumes) {
                type_contenu = 'volume';
                console.log('📦 Type: Tomes physiques');
            }

            // 11. ANNÉE VF
            let annee_publication = null;
            const anneeMatch = allText.match(/Année VF\s*:\s*(\d{4})/i);
            if (anneeMatch) {
                annee_publication = parseInt(anneeMatch[1]);
                console.log('📅 Année VF:', annee_publication);
            }

            // 11b. ANNÉE VO - Extraction depuis le champ "Origine" ou depuis les sections d'édition
            let annee_publication_vo = null;
            let anneeVOMatch = null;
            const isManhwaForYear = type_demographie && type_demographie.toLowerCase().includes('manhwa');
            
            // Méthode 1 : Chercher dans le champ "Origine" (format HTML: "Origine : Chine - 2020")
            try {
                // Format HTML: <li><span class="bold">Origine : </span> <img ...> Chine - <span itemprop="datePublished" content="2020">2020</span></li>
                // Le texte extrait sera: "Origine : Chine - 2020"
                
                // Méthode 1a : Chercher via DOM l'attribut itemprop="datePublished"
                try {
                    const datePublishedSpan = document.querySelector('span[itemprop="datePublished"]');
                    if (datePublishedSpan && datePublishedSpan.closest('li') && 
                        datePublishedSpan.closest('li').textContent.includes('Origine')) {
                        const year = datePublishedSpan.getAttribute('content') || datePublishedSpan.textContent;
                        if (year && /^\d{4}$/.test(year)) {
                            anneeVOMatch = [null, year];
                            console.log('✅ Année VO trouvée via itemprop="datePublished" dans Origine:', year);
                        }
                    }
                } catch (e) {
                    // Ignorer les erreurs DOM, continuer avec regex
                }
                
                // Méthode 1b : Chercher via regex dans allText (format: "Origine : [Pays] - [Année]")
                if (!anneeVOMatch) {
                    // Format texte: "Origine : Chine - 2020" (sans répétition du pays dans le texte extrait)
                    const origineMatch = allText.match(/Origine\s*:\s*[^-]*?-\s*(\d{4})/i);
                    if (origineMatch) {
                        anneeVOMatch = origineMatch;
                        console.log('✅ Année VO trouvée via champ "Origine" (regex):', anneeVOMatch[1]);
                    } else {
                        // Variante : "Pays : ... - [Année]"
                        const paysMatch = allText.match(/(?:Pays|Origine)\s*:\s*[^-]*?-\s*(\d{4})/i);
                        if (paysMatch) {
                            anneeVOMatch = paysMatch;
                            console.log('✅ Année VO trouvée via champ "Pays":', anneeVOMatch[1]);
                        } else {
                            // Fallback : chercher juste après "Origine :" n'importe quelle année (dans les 80 caractères suivants)
                            const origineSimpleMatch = allText.match(/Origine\s*:\s*.{0,80}?(\d{4})/i);
                            if (origineSimpleMatch) {
                                anneeVOMatch = origineSimpleMatch;
                                console.log('✅ Année VO trouvée via champ "Origine" (format simple):', anneeVOMatch[1]);
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Erreur extraction Année VO depuis Origine:', e);
            }
            
            // Méthode 2 : Chercher dans les sections d'édition VO (si pas trouvé via Origine)
            if (!anneeVOMatch) {
                try {
                    const editionHeaders = Array.from(document.querySelectorAll('h2, h3')).filter(h => {
                        const text = h.textContent.toLowerCase();
                        if (isManhwaForYear) {
                            // Pour Manhwa : chercher édition coréenne (plusieurs variantes possibles)
                            const hasEdition = text.includes('édition');
                            const hasCoree = text.includes('corée') || text.includes('coréen');
                            const hasSud = text.includes('sud');
                            const hasReliee = text.includes('reliée');
                            
                            const match1 = hasEdition && hasCoree;
                            const match2 = hasEdition && hasReliee && (hasCoree || (text.includes('corée') && hasSud));
                            
                            return match1 || match2;
                        } else {
                            // Pour Manga : chercher édition japonaise
                            return (text.includes('édition') && text.includes('japonaise')) || 
                                   (text.includes('édition') && text.includes('reliée') && text.includes('japonaise'));
                        }
                    });
                    
                    if (editionHeaders.length > 0) {
                        console.log(`🔍 ${editionHeaders.length} header(s) d'édition VO trouvé(s) pour extraction année`);
                        for (const header of editionHeaders) {
                            let container = header.parentElement;
                            let searchDepth = 0;
                            while (container && searchDepth < 3) {
                                const containerText = container.textContent || container.innerText;
                                const match = containerText.match(/Année VO\s*:\s*(\d{4})/i);
                                if (match) {
                                    anneeVOMatch = match;
                                    console.log(`✅ Année VO trouvée dans le conteneur parent (profondeur ${searchDepth})`);
                                    break;
                                }
                                container = container.parentElement;
                                searchDepth++;
                            }
                            
                            if (anneeVOMatch) break;
                            
                            let current = header.nextElementSibling;
                            for (let i = 0; i < 50 && current; i++) {
                                if (current.textContent) {
                                    const match = current.textContent.match(/Année VO\s*:\s*(\d{4})/i);
                                    if (match) {
                                        anneeVOMatch = match;
                                        console.log(`✅ Année VO trouvée dans l'élément suivant (index ${i})`);
                                        break;
                                    }
                                }
                                current = current.nextElementSibling;
                            }
                            if (anneeVOMatch) break;
                        }
                    }
                } catch (e) {
                    console.log('⚠️ Erreur extraction DOM Année VO:', e);
                }
            }
            
            // Méthode 3 : Fallback sur allText (format classique "Année VO : 2018")
            if (!anneeVOMatch) {
                anneeVOMatch = allText.match(/Année VO\s*:\s*(\d{4})/i);
                if (!anneeVOMatch) {
                    anneeVOMatch = allText.match(/Année VO\s+(\d{4})/i);
                }
                if (anneeVOMatch) {
                    console.log('✅ Année VO trouvée via allText (format classique)');
                }
            }
            
            if (anneeVOMatch) {
                annee_publication_vo = parseInt(anneeVOMatch[1]);
                console.log('📅 Année VO:', annee_publication_vo);
            } else {
                console.log('⚠️ Année VO non trouvée dans la page');
            }

            // 12. PRIX (défaut de la série)
            let prix_defaut = null;
            const prixMatch = allText.match(/Prix\s*:\s*(\d+(?:[.,]\d+)?)\s*€/i);
            if (prixMatch) {
                prix_defaut = parseFloat(prixMatch[1].replace(',', '.'));
                console.log('💰 Prix:', prix_defaut + '€');
            }

            // 13. SYNOPSIS
            let description = null;
            
            // Chercher d'abord dans la div.description qui contient les <br> pour les paragraphes
            // Trouver le h2 "Synopsis" puis chercher .description dans le même .top_bloc
            const synopsisH2 = Array.from(document.querySelectorAll('.top_bloc h2')).find(h2 => 
                h2.textContent.trim().toLowerCase() === 'synopsis'
            );
            if (synopsisH2) {
                const topBloc = synopsisH2.closest('.top_bloc');
                const descriptionDiv = topBloc?.querySelector('.description');
                if (descriptionDiv) {
                    // Cloner l'élément pour ne pas modifier l'original
                    const clone = descriptionDiv.cloneNode(true);
                    // Convertir les <br> en sauts de ligne
                    clone.querySelectorAll('br').forEach(br => {
                        br.replaceWith(document.createTextNode('\n'));
                    });
                    // Extraire le texte (les balises HTML seront supprimées mais les \n conservés)
                    description = clone.textContent?.trim();
                }
            }
            
            // Fallback : chercher dans les éléments standards
            if (!description) {
                const synopsisElement = document.querySelector('#synopsis, .synopsis, [itemprop="description"]');
                if (synopsisElement) {
                    // Cloner pour convertir les <br>
                    const clone = synopsisElement.cloneNode(true);
                    clone.querySelectorAll('br').forEach(br => {
                        br.replaceWith(document.createTextNode('\n'));
                    });
                    description = clone.textContent?.trim();
                }
            }
            
            // Fallback : extraction depuis le texte brut
            if (!description) {
                const synopsisMatch = allText.match(/Synopsis\s+((?:.|\n)+?)(?=\n\n|Voir plus|Description rédigée|Compléter|Volumes|Bande-annonce|Fiches liées)/i);
                if (synopsisMatch) {
                    description = synopsisMatch[1].trim();
                }
            }
            
            if (description) {
                description = description
                    .replace(/^Synopsis\s*/i, '')
                    .replace(/Voir plus.*$/i, '')
                    .replace(/Description rédigée par.*$/is, '')
                    .replace(/Compléter.*$/i, '')
                    // Préserver les sauts de ligne multiples (paragraphes) mais normaliser les espaces multiples dans une même ligne
                    .replace(/[ \t]+/g, ' ') // Remplacer les espaces/tabs multiples par un seul espace
                    .replace(/\n{3,}/g, '\n\n') // Normaliser les sauts de ligne multiples (max 2)
                    .trim();
            }
            
            console.log('📝 Synopsis:', description ? `${description.substring(0, 80)}...` : 'Absent');

            // 14. COUVERTURE PRINCIPALE
            const couverture_url = 
                document.querySelector('.coverimg img')?.src ||
                document.querySelector('.cover img')?.src ||
                document.querySelector('img[itemprop="image"]')?.src ||
                null;
            
            console.log('🖼️ Couverture série:', couverture_url ? 'Trouvée' : 'Non trouvée');

            // 15. STATUT
            let statut = 'En cours';
            let statutMatch = allText.match(/Nb chapitres VF\s*:\s*\d+\s*\((.*?)\)/i);
            if (!statutMatch) {
                statutMatch = allText.match(/Nb volumes VF\s*:\s*\d+\s*\((.*?)\)/i);
            }
            if (statutMatch) {
                const statutText = statutMatch[1].toLowerCase();
                if (statutText.includes('terminé') || statutText.includes('fini')) {
                    statut = 'Terminée';
                }
            }
            console.log('📊 Statut publication VF:', statut);

            // 16. DÉTECTION DES VOLUMES (édition française "Volume simple")
            console.log('\n📚 Recherche des volumes (édition française "Volume simple")...');
            const uniqueVolumes = [];
            
            try {
                // 1. Trouver tous les <h2> (zones d'édition par pays)
                const h2Elements = document.querySelectorAll('h2');
                console.log(`🔍 ${h2Elements.length} <h2> trouvé(s) sur la page`);
                let frenchH2 = null;
                
                // 2. Trouver le premier <h2> avec le flag français 🇫🇷
                for (const h2 of h2Elements) {
                    const h2Text = h2.textContent || '';
                    const h2HTML = h2.innerHTML || '';
                    
                    // Vérifier si c'est une édition française (flag français ou texte "français")
                    const hasFrenchFlag = h2HTML.includes('flags/fr.png') || 
                                         (h2HTML.includes('flag') && h2Text.toLowerCase().includes('français')) ||
                                         h2Text.toLowerCase().includes('français') ||
                                         h2HTML.includes('flags/fr');
                    
                    if (hasFrenchFlag) {
                        frenchH2 = h2;
                        console.log('🇫🇷 Édition française trouvée:', h2Text.substring(0, 50));
                        break;
                    }
                }
                
                if (!frenchH2) {
                    console.log('⚠️ Aucune édition française trouvée dans les <h2>');
                    // Afficher les h2 trouvés pour debug
                    h2Elements.forEach((h2, idx) => {
                        console.log(`  H2[${idx}]: ${h2.textContent?.substring(0, 50) || '(vide)'}`);
                    });
                }
                
                if (!frenchH2) {
                    console.log('⚠️ Aucune édition française trouvée, utilisation de la méthode de fallback');
                    // Fallback : méthode originale
                    const volumeLinks = document.querySelectorAll('a[href*="/volume-"]');
                    for (const link of volumeLinks) {
                        const href = link.href;
                        const linkText = link.textContent.trim();
                        const volNumMatch = linkText.match(/(?:Vol\.?|Volume)\s*(\d+)/i) || 
                                           href.match(/volume-(\d+)/i);
                        
                        if (volNumMatch) {
                            const volNum = parseInt(volNumMatch[1]);
                            if (!uniqueVolumes.find(v => v.numero === volNum)) {
                                uniqueVolumes.push({
                                    numero: volNum,
                                    url: href
                                });
                            }
                        }
                    }
                } else {
                    // 3. Dans le contexte du <h2> français, trouver le premier <h3> "Volume simple"
                    // Le h3 peut être après le h2 dans le DOM, on cherche dans le même conteneur parent
                    let volumeSimpleH3 = null;
                    
                    // Chercher le h3 après le h2 français dans le DOM
                    let currentElement = frenchH2.nextElementSibling;
                    while (currentElement && !volumeSimpleH3) {
                        // Si on trouve un autre h2, on s'arrête (on est passé à une autre section)
                        if (currentElement.tagName === 'H2') {
                            break;
                        }
                        
                        // Si c'est un h3 avec "volume simple"
                        if (currentElement.tagName === 'H3') {
                            const h3Text = currentElement.textContent?.trim() || '';
                            if (h3Text.toLowerCase().includes('volume simple')) {
                                volumeSimpleH3 = currentElement;
                                console.log('📖 Type "Volume simple" trouvé');
                                break;
                            }
                        }
                        
                        // Chercher aussi dans les enfants (au cas où la structure soit imbriquée)
                        const h3InChildren = currentElement.querySelector('h3');
                        if (h3InChildren) {
                            const h3Text = h3InChildren.textContent?.trim() || '';
                            if (h3Text.toLowerCase().includes('volume simple')) {
                                volumeSimpleH3 = h3InChildren;
                                console.log('📖 Type "Volume simple" trouvé (dans un enfant)');
                                break;
                            }
                        }
                        
                        currentElement = currentElement.nextElementSibling;
                    }
                    
                    // Fallback : chercher tous les h3 et trouver celui qui suit le h2 français
                    if (!volumeSimpleH3) {
                        const allH3 = document.querySelectorAll('h3');
                        let foundFrenchH2 = false;
                        for (const h3 of allH3) {
                            // Vérifier si on est passé le h2 français
                            if (frenchH2.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING) {
                                foundFrenchH2 = true;
                                const h3Text = h3.textContent?.trim() || '';
                                if (h3Text.toLowerCase().includes('volume simple')) {
                                    volumeSimpleH3 = h3;
                                    console.log('📖 Type "Volume simple" trouvé (fallback)');
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (volumeSimpleH3) {
                        // 4. Extraire l'ID d'édition depuis le <h2> français (attribut onclick)
                        let editionId = null;
                        
                        // L'ID d'édition est dans le <h2> parent, pas dans le <h3>
                        // Chercher le lien avec onclick dans le h2 français
                        const h2Link = frenchH2.querySelector('a[onclick]');
                        const onclickAttr = h2Link?.getAttribute('onclick');
                        
                        if (onclickAttr) {
                            // Extraire l'ID depuis onclick="swap('edition_1535');swapFold(...);"
                            const editionMatch = onclickAttr.match(/swap\(['"](edition_\d+)['"]\)/);
                            if (editionMatch) {
                                editionId = editionMatch[1];
                                console.log(`🆔 ID édition trouvé: ${editionId}`);
                            } else {
                                console.warn('⚠️ Pattern onclick non reconnu:', onclickAttr.substring(0, 100));
                            }
                        } else {
                            console.warn('⚠️ Aucun attribut onclick trouvé dans le h2 français');
                        }
                        
                        if (editionId) {
                            // 5. Trouver la div correspondant au h3 "Volume simple"
                            // Il peut y avoir plusieurs divs : edition_XXXX-1, edition_XXXX-2, etc.
                            // On doit trouver celle qui correspond au h3 "Volume simple"
                            let editionDiv = null;
                            
                            // Chercher toutes les divs qui commencent par l'ID d'édition
                            const allEditionDivs = document.querySelectorAll(`[id^="${editionId}-"]`);
                            console.log(`🔍 ${allEditionDivs.length} div(s) trouvée(s) pour l'édition ${editionId}`);
                            
                            // Si on a trouvé le h3 "Volume simple", chercher la div qui le suit ou qui contient des volumes après lui
                            if (volumeSimpleH3) {
                                // La div devrait être après le h3 dans le DOM
                                let currentElement = volumeSimpleH3.nextElementSibling;
                                while (currentElement) {
                                    if (currentElement.id && currentElement.id.startsWith(`${editionId}-`)) {
                                        editionDiv = currentElement;
                                        console.log(`✅ Div trouvée après h3: #${editionDiv.id}`);
                                        break;
                                    }
                                    // Si on trouve un autre h3, on s'arrête
                                    if (currentElement.tagName === 'H3') {
                                        break;
                                    }
                                    currentElement = currentElement.nextElementSibling;
                                }
                            }
                            
                            // Si pas trouvée, utiliser la première div (édition_XXXX-1)
                            if (!editionDiv && allEditionDivs.length > 0) {
                                editionDiv = allEditionDivs[0];
                                console.log(`📦 Utilisation de la première div trouvée: #${editionDiv.id}`);
                            }
                            
                            if (editionDiv) {
                                // Extraire tous les liens de volumes de cette div
                                const volumeLinks = editionDiv.querySelectorAll('a[href*="/volume-"]');
                                console.log(`📚 ${volumeLinks.length} lien(s) de volume trouvé(s) dans l'édition #${editionDiv.id}`);
                                
                                for (const link of volumeLinks) {
                                    const href = link.href;
                                    const linkText = link.textContent?.trim() || '';
                                    const title = link.getAttribute('title') || '';
                                    
                                    // Ignorer les tomes "à paraître" sans date (vérification via title)
                                    // Note: La date sera vérifiée plus tard depuis la page individuelle
                                    
                                    const volNumMatch = linkText.match(/(?:Vol\.?|Volume)\s*(\d+)/i) || 
                                                       href.match(/volume-(\d+)/i);
                                    
                                    if (volNumMatch) {
                                        const volNum = parseInt(volNumMatch[1]);
                                        if (!uniqueVolumes.find(v => v.numero === volNum)) {
                                            uniqueVolumes.push({
                                                numero: volNum,
                                                url: href
                                            });
                                        }
                                    }
                                }
                            } else {
                                console.log(`⚠️ Aucune div trouvée pour l'édition ${editionId}, utilisation de la méthode de fallback`);
                            }
                        } else {
                            console.log('⚠️ ID d\'édition non trouvé, utilisation de la méthode de fallback');
                        }
                    } else {
                        console.log('⚠️ Type "Volume simple" non trouvé dans l\'édition française');
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la détection des volumes:', error);
                // Fallback : méthode originale
                const volumeLinks = document.querySelectorAll('a[href*="/volume-"]');
                for (const link of volumeLinks) {
                    const href = link.href;
                    const volNumMatch = href.match(/volume-(\d+)/i);
                    if (volNumMatch) {
                        const volNum = parseInt(volNumMatch[1]);
                        if (!uniqueVolumes.find(v => v.numero === volNum)) {
                            uniqueVolumes.push({
                                numero: volNum,
                                url: href
                            });
                        }
                    }
                }
            }
            
            uniqueVolumes.sort((a, b) => a.numero - b.numero);
            console.log(`📖 ${uniqueVolumes.length} volume(s) unique(s) détecté(s) de l'édition française "Volume simple"`);

            // 17. RÉCUPÉRATION DES DÉTAILS DE CHAQUE TOME
            const volumes = [];
            if (uniqueVolumes.length > 0) {
                console.log('🔄 Récupération des détails des tomes...');
                
                const allTomeDetails = [];
                for (const vol of uniqueVolumes) {
                    const tomeDetails = await fetchTomeDetails(vol.url, vol.numero);
                    
                    if (!tomeDetails.prix && prix_defaut) {
                        tomeDetails.prix = prix_defaut;
                    }
                    
                    allTomeDetails.push(tomeDetails);
                    
                    const baseDelay = 350;
                    const progressiveDelay = allTomeDetails.length * 30;
                    const delay = Math.min(baseDelay + progressiveDelay, 1500);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                // Filtrer : ne garder que les tomes avec une date de sortie VF
                // (même si la date est future, c'est OK - c'est juste pas encore sorti mais date connue)
                const tomesWithDate = allTomeDetails.filter(tome => tome.date_sortie !== null && tome.date_sortie !== undefined);
                const tomesWithoutDate = allTomeDetails.filter(tome => tome.date_sortie === null || tome.date_sortie === undefined);
                
                if (tomesWithoutDate.length > 0) {
                    console.log(`⚠️ ${tomesWithoutDate.length} tome(s) sans date de sortie VF ignoré(s) (à paraître sans date connue)`);
                }
                
                // Déduplication par numéro (au cas où)
                const tomesByNumber = {};
                for (const tome of tomesWithDate) {
                    const num = tome.numero;
                    
                    if (!tomesByNumber[num]) {
                        tomesByNumber[num] = tome;
                    } else {
                        const existing = tomesByNumber[num];
                        
                        // Prioriser le tome avec le plus de données (date, couverture)
                        const shouldReplace = 
                            (!existing.date_sortie && tome.date_sortie) ||
                            (!existing.couverture_url && tome.couverture_url);
                        
                        if (shouldReplace) {
                            tomesByNumber[num] = tome;
                        }
                    }
                }
                
                volumes.push(...Object.values(tomesByNumber).sort((a, b) => a.numero - b.numero));
                
                console.log(`✅ ${volumes.length} tome(s) avec date de sortie VF récupéré(s) (${tomesWithoutDate.length} tome(s) sans date ignoré(s))`);
            }

            const isWebcomic = /Webcomic\s*:\s*Oui/i.test(allText);
            const isWebnovel = /Webnovel\s*:\s*Oui/i.test(allText);

            // Déterminer le type_volume automatiquement
            let type_volume = 'Broché';
            const typeDemographieLower = (type_demographie || '').toLowerCase();
            
            if (type_contenu === 'chapitre') {
                type_volume = 'Numérique';
            } else if (type_demographie === 'Manhwa' || type_demographie === 'Manhua' || typeDemographieLower.includes('manhwa') || typeDemographieLower.includes('manhua')) {
                if (volumes.length > 0) {
                    type_volume = 'Webtoon Physique';
                } else {
                    type_volume = 'Webtoon';
                }
            }
            
            if (typeDemographieLower.includes('light novel') || typeDemographieLower.includes('novel') || lightNovelPage || isWebnovel) {
                type_volume = 'Light Novel';
            }
            
            console.log(`📦 Type de volume détecté: ${type_volume} (démographie: ${type_demographie}, ${volumes.length} volume(s))`);

            // 18. MÉTADONNÉES SUPPLÉMENTAIRES
            let prepublication = null;
            const prepubMatch = allText.match(/Prépublié dans\s*:\s*([^\n]+)/i);
            if (prepubMatch) prepublication = prepubMatch[1].trim();

            let label = null;
            const labelMatch = allText.match(/Label\s*:\s*([^\n]+)/i);
            if (labelMatch) label = labelMatch[1].trim();

            let age = null;
            const ageMatch = allText.match(/Âge conseillé\s*:\s*([^\n]+)/i);
            if (ageMatch) age = ageMatch[1].trim();

            // 19b. RATING (converti depuis âge conseillé + public averti)
            let rating = null;
            
            // D'abord convertir l'âge conseillé en rating MAL standard
            if (age) {
                console.log('🔞 Age conseillé:', age);
                if (age.includes('12') || age.includes('13')) {
                    rating = 'PG-13 - Teens 13 or older';
                } else if (age.includes('16')) {
                    rating = 'R - 17+ (violence & profanity)';
                } else if (age.includes('18')) {
                    rating = 'R - 17+ (violence & profanity)';
                } else if (age.toLowerCase().includes('tout public') || age.toLowerCase().includes('enfants')) {
                    rating = 'PG - Children';
                }
            }
            
            // Si pas de rating déterminé par l'âge, utiliser "Pour public averti"
            if (!rating) {
                const publicAvertiMatch = allText.match(/Pour public averti\s*:\s*Oui\s*\(([^)]+)\)/i);
                if (publicAvertiMatch) {
                    const description = publicAvertiMatch[1].trim();
                    // Convertir en format MAL standard
                    if (description.toLowerCase().includes('contenu adulte') || description.toLowerCase().includes('+18')) {
                        rating = 'Rx - Hentai'; // Contenu adulte = Rx (le plus explicite)
                    } else if (description.toLowerCase().includes('nudité modérée') || description.toLowerCase().includes('nudité')) {
                        rating = 'R+ - Mild Nudity';
                    } else if (description.toLowerCase().includes('violence modérée')) {
                        rating = 'R - 17+ (violence & profanity)';
                    } else if (description.toLowerCase().includes('violence')) {
                        rating = 'R - 17+ (violence & profanity)';
                    } else {
                        rating = 'R - 17+ (violence & profanity)';
                    }
                }
            }
            
            // Si l'âge conseillé est 18 ans ET qu'il y a "Pour public averti", considérer comme Rx
            if (age && age.includes('18') && !rating?.includes('Rx') && !rating?.includes('R+')) {
                const publicAvertiMatch = allText.match(/Pour public averti\s*:\s*Oui/i);
                if (publicAvertiMatch) {
                    rating = 'Rx - Hentai'; // 18 ans + public averti = Rx (le plus explicite)
                }
            }
            
            if (rating) {
                console.log('⚠️ Rating:', rating, age ? `(basé sur: ${age})` : '');
            }

            // 19. LANGUE ORIGINALE (déduite du type de média et/ou du pays d'origine)
            let langue_originale = 'ja'; // Par défaut japonais
            let origineTexte = null;
            const origineRegexMatch = allText.match(/Origine\s*:\s*([^-]+?)(?:\s*-\s*\d{4})?/i);
            if (origineRegexMatch) {
                origineTexte = origineRegexMatch[1].trim();
            }
            
            // Priorité 1 : Déduire depuis le type de démographie (Manhwa, Manga, Manhua)
            if (type_demographie) {
                const demoLower = type_demographie.toLowerCase();
                if (demoLower.includes('manhwa')) {
                    langue_originale = 'ko'; // Coréen
                    console.log('🌐 Langue originale déduite depuis type:', langue_originale, '(Manhwa)');
                } else if (demoLower.includes('manhua')) {
                    langue_originale = 'zh'; // Chinois
                    console.log('🌐 Langue originale déduite depuis type:', langue_originale, '(Manhua)');
                } else if (demoLower.includes('manga')) {
                    langue_originale = 'ja'; // Japonais
                    console.log('🌐 Langue originale déduite depuis type:', langue_originale, '(Manga)');
                }
            }
            
            // Priorité 2 : Si pas trouvé via type, déduire depuis le pays d'origine (champ "Origine" sur Nautiljon)
            if (langue_originale === 'ja' || !type_demographie) {
                // Chercher "Origine" (format: "Origine : Japon - 2015" ou "Origine : Japon Japon - 2015")
                const paysMatch = origineRegexMatch || allText.match(/Pays\s*:\s*([^\n]+)/i);
                if (paysMatch) {
                    // Nettoyer le texte du pays (enlever les répétitions comme "Japon Japon")
                    let paysBrut = paysMatch[1].trim();
                    let paysText = paysBrut;
                    // Si le pays est répété (ex: "Japon Japon"), prendre seulement le premier
                    const paysWords = paysText.split(/\s+/);
                    if (paysWords.length >= 2 && paysWords[0].toLowerCase() === paysWords[1].toLowerCase()) {
                        paysText = paysWords[0];
                        paysBrut = paysWords[0];
                    }
                    if (!origineTexte) {
                        origineTexte = paysBrut;
                    }
                    paysText = paysText.toLowerCase();
                    // Mapping pays → code langue ISO 639-1
                    if (paysText.includes('corée') && !paysText.includes('nord')) {
                        langue_originale = 'ko'; // Corée du Sud
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('corée') && paysText.includes('nord')) {
                        langue_originale = 'ko'; // Corée du Nord (même langue)
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('chine') || paysText.includes('hong kong') || paysText.includes('taïwan')) {
                        langue_originale = 'zh'; // Chine/Taïwan/Hong Kong
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('japon')) {
                        langue_originale = 'ja'; // Japon
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('thaïlande')) {
                        langue_originale = 'th'; // Thaïlande
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('vietnam')) {
                        langue_originale = 'vi'; // Vietnam
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('france') || paysText.includes('belgique') || paysText.includes('suisse')) {
                        langue_originale = 'fr'; // France/Belgique/Suisse
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('espagne')) {
                        langue_originale = 'es'; // Espagne
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('italie')) {
                        langue_originale = 'it'; // Italie
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('allemagne') || paysText.includes('autriche')) {
                        langue_originale = 'de'; // Allemagne/Autriche
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('portugal') || paysText.includes('brésil')) {
                        langue_originale = 'pt'; // Portugal/Brésil
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('royaume-uni') || paysText.includes('états-unis') || paysText.includes('canada') || paysText.includes('australie')) {
                        langue_originale = 'en'; // Anglais
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('russie')) {
                        langue_originale = 'ru'; // Russie
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('indonésie')) {
                        langue_originale = 'id'; // Indonésie
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('malaisie')) {
                        langue_originale = 'ms'; // Malaisie
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else if (paysText.includes('philippines')) {
                        langue_originale = 'tl'; // Philippines (Tagalog)
                        console.log('🌐 Langue originale déduite depuis pays:', langue_originale, 'depuis pays:', paysMatch[1]);
                    } else {
                        console.log('⚠️ Pays non reconnu pour la langue, utilisation de la valeur par défaut:', langue_originale);
                    }
                } else {
                    console.log('⚠️ Aucun pays trouvé, langue originale par défaut:', langue_originale);
                }
            }

            // Construire l'objet de données
            const mangaData = {
                titre: titre.trim(),
                titre_alternatif: titre_alternatif,
                statut: statut,
                type_volume: type_volume,
                type_contenu: type_contenu,
                couverture_url: couverture_url,
                description: description || null,
                statut_publication: statut,
                statut_publication_vo: statut_publication_vo, // Statut publication VO extrait depuis "Nb volumes VO : X (En cours)"
                genres: genres,
                nb_volumes: nb_volumes,
                nb_volumes_vo: nb_volumes_vo,
                nb_chapitres: nb_chapitres,
                nb_chapitres_vo: nb_chapitres_vo,
                annee_publication: annee_publication,
                annee_publication_vo: annee_publication_vo,
                langue_originale: langue_originale,
                origine: origineTexte,
                demographie: type_demographie,
                editeur: editeur,
                editeur_vo: editeur_vo,
                titre_vo: titre_vo,
                rating: rating,
                webnovel: isWebnovel,
                
                // Métadonnées
                _source: 'Nautiljon',
                _url: window.location.href,
                _themes: themes,
                _auteurs: auteurs,
                _prepublication: prepublication,
                _label: label,
                _age_conseille: age,
                _webcomic: isWebcomic,
                _prix_defaut: prix_defaut,
                
                // Volumes avec détails
                volumes: volumes
            };
            
            console.log('📦 Données manga extraites:', mangaData);
            console.log(`📚 ${volumes.length} volume(s) avec images et prix`);
            return mangaData;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'extraction manga:', error);
            throw error;
        }
    };

    // Fonction principale d'extraction (détecte automatiquement manga ou anime)
    const extractData = async () => {
        if (isAnimePage()) {
            return await extractAnimeData();
        } else {
            return await extractMangaData();
        }
    };

    // Envoyer les données à l'application Electron
    const sendToElectron = (data, isAnime = false, tomesOnly = false) => {
        let endpoint;
        if (isAnime) {
            endpoint = 'import-anime';
        } else {
            endpoint = tomesOnly ? 'import-tomes-only' : 'import-manga';
        }
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `http://localhost:${PORT}/api/${endpoint}`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                onload: (response) => {
                    try {
                        if (response.status === 200) {
                            const result = JSON.parse(response.responseText);
                            resolve(result);
                        } else {
                            const errorData = JSON.parse(response.responseText);
                            throw new Error(errorData.error || `HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.error('❌ Erreur parsing:', error);
                        reject(error);
                    }
                },
                onerror: (error) => {
                    console.error('❌ Erreur connexion avec Le Nexus:', error);
                    reject(error);
                }
            });
        });
    };

    // Créer un overlay de sélection pour proposer la fusion
    const showSelectionOverlay = (newTitle, candidate, newMangaData) => {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'lenexus-selection-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                z-index: 9999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                text-align: center;
                padding: 40px;
                background: rgba(30, 30, 30, 0.95);
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                max-width: 600px;
                border: 2px solid rgba(99, 102, 241, 0.5);
            `;
            
            const title = document.createElement('h2');
            title.textContent = '🔍 Série similaire trouvée';
            title.style.cssText = `
                font-size: 24px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #fff;
            `;
            
            const message = document.createElement('p');
            message.innerHTML = `Une série similaire a été trouvée dans votre base de données (${candidate.similarity}% de similarité).<br><br>Que souhaitez-vous faire ?`;
            message.style.cssText = `
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 30px 0;
                color: #d1d5db;
            `;
            
            const candidateDiv = document.createElement('div');
            candidateDiv.style.cssText = `
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            `;
            
            const candidateTitle = document.createElement('div');
            candidateTitle.innerHTML = `<strong style="color: #818cf8;">Série existante :</strong><br>${candidate.titre}`;
            candidateTitle.style.cssText = `
                font-size: 16px;
                margin-bottom: 10px;
                color: #fff;
            `;
            
            if (candidate.matchedTitle && candidate.matchedTitle !== candidate.titre) {
                const matchedTitle = document.createElement('div');
                matchedTitle.innerHTML = `<small style="color: #9ca3af;">Titre correspondant : ${candidate.matchedTitle}</small>`;
                matchedTitle.style.cssText = `font-size: 14px; margin-top: 8px;`;
                candidateDiv.appendChild(matchedTitle);
            }
            
            candidateDiv.appendChild(candidateTitle);
            
            const newDiv = document.createElement('div');
            newDiv.style.cssText = `
                background: rgba(236, 72, 153, 0.1);
                border: 1px solid rgba(236, 72, 153, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            `;
            
            const newTitleEl = document.createElement('div');
            newTitleEl.innerHTML = `<strong style="color: #f472b6;">Nouvelle série :</strong><br>${newMangaData.titre || newTitle}`;
            newTitleEl.style.cssText = `
                font-size: 16px;
                color: #fff;
            `;
            newDiv.appendChild(newTitleEl);
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 30px;
                flex-wrap: wrap;
            `;
            
            const mergeButton = document.createElement('button');
            mergeButton.textContent = '🔄 Fusionner';
            mergeButton.style.cssText = `
                padding: 12px 24px;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            mergeButton.onmouseover = () => {
                mergeButton.style.transform = 'scale(1.05)';
                mergeButton.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
            };
            mergeButton.onmouseout = () => {
                mergeButton.style.transform = 'scale(1)';
                mergeButton.style.boxShadow = 'none';
            };
            mergeButton.onclick = () => {
                document.body.removeChild(overlay);
                resolve('merge');
            };
            
            const createButton = document.createElement('button');
            createButton.textContent = '➕ Créer nouvelle';
            createButton.style.cssText = `
                padding: 12px 24px;
                background: linear-gradient(135deg, #ec4899, #db2777);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            createButton.onmouseover = () => {
                createButton.style.transform = 'scale(1.05)';
                createButton.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
            };
            createButton.onmouseout = () => {
                createButton.style.transform = 'scale(1)';
                createButton.style.boxShadow = 'none';
            };
            createButton.onclick = () => {
                document.body.removeChild(overlay);
                resolve('create');
            };
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '❌ Annuler';
            cancelButton.style.cssText = `
                padding: 12px 24px;
                background: linear-gradient(135deg, #6b7280, #4b5563);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            cancelButton.onmouseover = () => {
                cancelButton.style.transform = 'scale(1.05)';
                cancelButton.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.4)';
            };
            cancelButton.onmouseout = () => {
                cancelButton.style.transform = 'scale(1)';
                cancelButton.style.boxShadow = 'none';
            };
            cancelButton.onclick = () => {
                document.body.removeChild(overlay);
                resolve('cancel');
            };
            
            buttonsDiv.appendChild(mergeButton);
            buttonsDiv.appendChild(createButton);
            buttonsDiv.appendChild(cancelButton);
            
            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(candidateDiv);
            content.appendChild(newDiv);
            content.appendChild(buttonsDiv);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        });
    };

    // Créer un overlay pour bloquer l'interaction pendant le scraping
    const createScrapingOverlay = () => {
        const overlay = document.createElement('div');
        overlay.id = 'lenexus-scraping-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            text-align: center;
            padding: 40px;
            background: rgba(30, 30, 30, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            border: 2px solid rgba(99, 102, 241, 0.5);
        `;
        
        const icon = document.createElement('div');
        icon.innerHTML = '⏳';
        icon.style.cssText = `
            font-size: 64px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Extraction en cours...';
        title.style.cssText = `
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 16px 0;
            color: #fff;
        `;
        
        const message = document.createElement('p');
        message.innerHTML = '<strong style="color: #fbbf24;">⚠️ Ne touchez pas à la page !</strong><br><br>Le script est en train d\'extraire les données de cette page. Veuillez patienter...';
        message.style.cssText = `
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
            color: #d1d5db;
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 4px solid rgba(99, 102, 241, 0.3);
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 24px auto 0;
        `;
        
        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(spinner);
        overlay.appendChild(content);
        
        // Ajouter les animations CSS si pas déjà présentes
        if (!document.getElementById('lenexus-overlay-styles')) {
            const style = document.createElement('style');
            style.id = 'lenexus-overlay-styles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(overlay);
        return overlay;
    };
    
    // Retirer l'overlay
    const removeScrapingOverlay = () => {
        const overlay = document.getElementById('lenexus-scraping-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    };

    // Créer l'interface utilisateur
    const createUI = () => {
        const container = document.createElement('div');
        container.id = 'nautiljon-menu-combined';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
        `;

        const isAnime = isAnimePage();
        
        // Pour les mangas, créer un menu avec 2 options (comme le script original)
        if (!isAnime) {
            const menu = document.createElement('div');
            menu.style.cssText = `
                position: absolute;
                bottom: 60px;
                left: 0;
                background: rgba(30, 30, 30, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 8px;
                display: none;
                flex-direction: column;
                gap: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-width: 200px;
            `;

            // Option 1: Import complet
            const optionFull = document.createElement('button');
            optionFull.innerHTML = '📚 Import complet';
            optionFull.title = 'Import complet (série + tomes)';
            optionFull.style.cssText = `
                padding: 12px 16px;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            `;
            
            optionFull.onmouseenter = () => {
                optionFull.style.transform = 'translateX(4px)';
                optionFull.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
            };
            
            optionFull.onmouseleave = () => {
                optionFull.style.transform = 'translateX(0)';
                optionFull.style.boxShadow = 'none';
            };

            // Option 2: Import tomes uniquement
            const optionTomes = document.createElement('button');
            optionTomes.innerHTML = '📖 Import tomes';
            optionTomes.title = 'Import tomes uniquement (série doit exister)';
            optionTomes.style.cssText = `
                padding: 12px 16px;
                background: linear-gradient(135deg, #ec4899, #db2777);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            `;
            
            optionTomes.onmouseenter = () => {
                optionTomes.style.transform = 'translateX(4px)';
                optionTomes.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)';
            };
            
            optionTomes.onmouseleave = () => {
                optionTomes.style.transform = 'translateX(0)';
                optionTomes.style.boxShadow = 'none';
            };

            // Bouton principal avec 3 points verticaux
            const menuButton = document.createElement('button');
            menuButton.innerHTML = '⋮';
            menuButton.title = 'Options d\'import Nautiljon';
            menuButton.style.cssText = `
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            let menuOpen = false;
            
            menuButton.onclick = (e) => {
                e.stopPropagation();
                menuOpen = !menuOpen;
                menu.style.display = menuOpen ? 'flex' : 'none';
                menuButton.style.transform = menuOpen ? 'rotate(90deg)' : 'rotate(0deg)';
            };
            
            menuButton.onmouseenter = () => {
                if (!menuOpen) {
                    menuButton.style.transform = 'scale(1.1)';
                    menuButton.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.6)';
                }
            };
            
            menuButton.onmouseleave = () => {
                if (!menuOpen) {
                    menuButton.style.transform = 'scale(1)';
                    menuButton.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                }
            };

            // Fermer le menu en cliquant ailleurs
            document.addEventListener('click', () => {
                if (menuOpen) {
                    menuOpen = false;
                    menu.style.display = 'none';
                    menuButton.style.transform = 'rotate(0deg)';
                }
            });

            menu.onclick = (e) => e.stopPropagation();
            
            // Handler pour import complet
            optionFull.onclick = async () => {
                menuOpen = false;
                menu.style.display = 'none';
                menuButton.style.transform = 'rotate(0deg)';
                
                optionFull.innerHTML = '⏳ Import...';
                optionFull.disabled = true;
                optionFull.style.cursor = 'wait';
                
                const overlay = createScrapingOverlay();
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'http://localhost:40000/api/import-start',
                    headers: { 'Content-Type': 'application/json' },
                    onerror: () => console.warn('Impossible de notifier le début de l\'import')
                });
                
                try {
                    const data = await extractMangaData();
                    
                    if (!data.titre) {
                        throw new Error('Impossible de trouver le titre de la série');
                    }
                    
                    const result = await sendToElectron(data, false);
                    
                    removeScrapingOverlay();
                    
                    // Si le serveur demande une sélection utilisateur (match à 99%)
                    if (result.requiresSelection && result.candidate) {
                        const userChoice = await showSelectionOverlay(
                            data.titre,
                            result.candidate,
                            result.newMangaData
                        );
                        
                        if (userChoice === 'cancel') {
                            // Annuler l'import et notifier Le Nexus pour fermer l'overlay
                            try {
                                await new Promise((resolve, reject) => {
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: 'http://localhost:40000/api/import-cancel',
                                        headers: { 'Content-Type': 'application/json' },
                                        onload: () => resolve(),
                                        onerror: () => reject()
                                    });
                                });
                            } catch (error) {
                                console.warn('Impossible de notifier l\'annulation à Le Nexus:', error);
                            }
                            
                            optionFull.innerHTML = '📚 Import complet';
                            optionFull.disabled = false;
                            optionFull.style.cursor = 'pointer';
                            optionFull.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                            showNotification('ℹ️ Import annulé', 'info');
                            return;
                        } else if (userChoice === 'merge') {
                            // Relancer l'import avec confirmation de fusion
                            const confirmResult = await sendToElectron({
                                ...data,
                                _targetSerieId: result.candidate.id,
                                _confirmMerge: true
                            }, false);
                            
                            optionFull.innerHTML = '✅';
                            optionFull.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            
                            const tomesInfo = confirmResult.tomesCreated 
                                ? `<br><small>${confirmResult.tomesCreated} tome(s) créé(s)${confirmResult.volumesIgnored > 0 ? ` (${confirmResult.volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                                : '';
                            showNotification(`✅ <strong>${data.titre}</strong> fusionné avec <strong>${result.candidate.titre}</strong> !<br><small>Source: Nautiljon</small>${tomesInfo}`, 'success');
                        } else {
                            // Créer une nouvelle série
                            const createResult = await sendToElectron({
                                ...data,
                                _forceCreate: true
                            }, false);
                            
                            optionFull.innerHTML = '✅';
                            optionFull.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            
                            const tomesInfo = createResult.tomesCreated 
                                ? `<br><small>${createResult.tomesCreated} tome(s) créé(s)${createResult.volumesIgnored > 0 ? ` (${createResult.volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                                : '';
                            showNotification(`✅ <strong>${data.titre}</strong> créée !<br><small>Source: Nautiljon</small>${tomesInfo}`, 'success');
                        }
                    } else {
                        optionFull.innerHTML = '✅';
                        optionFull.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        
                        const tomesInfo = result.tomesCreated 
                            ? `<br><small>${result.tomesCreated} tome(s) créé(s)${result.volumesIgnored > 0 ? ` (${result.volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                            : '';
                        showNotification(`✅ <strong>${data.titre}</strong> ajoutée !<br><small>Source: Nautiljon</small>${tomesInfo}`, 'success');
                    }
                    
                    setTimeout(() => {
                        optionFull.innerHTML = '📚 Import complet';
                        optionFull.disabled = false;
                        optionFull.style.cursor = 'pointer';
                        optionFull.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    }, 2000);
                    
                } catch (error) {
                    removeScrapingOverlay();
                    console.error('❌ Erreur:', error);
                    
                    optionFull.innerHTML = '❌ Erreur';
                    optionFull.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    
                    const errorMsg = error.message.includes('Failed to fetch') || error.message.includes('connexion')
                        ? '❌ Le Nexus n\'est pas démarré' 
                        : `❌ Erreur: ${error.message}`;
                    showNotification(errorMsg, 'error');
                    
                    setTimeout(() => {
                        optionFull.innerHTML = '📚 Import complet';
                        optionFull.disabled = false;
                        optionFull.style.cursor = 'pointer';
                        optionFull.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    }, 3000);
                }
            };
            
            // Handler pour import tomes uniquement
            optionTomes.onclick = async () => {
                menuOpen = false;
                menu.style.display = 'none';
                menuButton.style.transform = 'rotate(0deg)';
                
                optionTomes.innerHTML = '⏳ Import...';
                optionTomes.disabled = true;
                optionTomes.style.cursor = 'wait';
                
                const overlay = createScrapingOverlay();
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'http://localhost:40000/api/import-start',
                    headers: { 'Content-Type': 'application/json' },
                    onerror: () => console.warn('Impossible de notifier le début de l\'import')
                });
                
                try {
                    const data = await extractMangaData();
                    
                    if (!data.titre) {
                        throw new Error('Impossible de trouver le titre de la série');
                    }
                    
                    // Envoyer avec tomesOnly = true
                    const result = await sendToElectron(data, false, true);
                    
                    removeScrapingOverlay();
                    
                    optionTomes.innerHTML = '✅';
                    optionTomes.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    
                    const tomesCreated = result.tomesCreated || 0;
                    const volumesIgnored = result.volumesIgnored || 0;
                    const message = result.message || '';
                    
                    if (tomesCreated > 0) {
                        const ignoredInfo = volumesIgnored > 0 ? ` (${volumesIgnored} ignoré(s) sans date VF)` : '';
                        showNotification(`✅ ${tomesCreated} tome(s) ajouté(s) à <strong>${data.titre}</strong>${ignoredInfo}<br><small>Source: Nautiljon</small>`, 'success');
                    } else {
                        const infoMsg = volumesIgnored > 0 
                            ? `Tous les tomes sont déjà présents (${volumesIgnored} ignoré(s) sans date VF)` 
                            : message || 'Tous les tomes sont déjà présents';
                        showNotification(`ℹ️ ${infoMsg}<br><small>${data.titre}</small>`, 'info');
                    }
                    
                    setTimeout(() => {
                        optionTomes.innerHTML = '📖 Import tomes';
                        optionTomes.disabled = false;
                        optionTomes.style.cursor = 'pointer';
                        optionTomes.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                    }, 2000);
                    
                } catch (error) {
                    removeScrapingOverlay();
                    console.error('❌ Erreur:', error);
                    
                    optionTomes.innerHTML = '❌ Erreur';
                    optionTomes.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    
                    const errorMsg = error.message.includes('Failed to fetch') || error.message.includes('connexion')
                        ? '❌ Le Nexus n\'est pas démarré' 
                        : `❌ Erreur: ${error.message}`;
                    showNotification(errorMsg, 'error');
                    
                    setTimeout(() => {
                        optionTomes.innerHTML = '📖 Import tomes';
                        optionTomes.disabled = false;
                        optionTomes.style.cursor = 'pointer';
                        optionTomes.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                    }, 3000);
                }
            };
            
            menu.appendChild(optionFull);
            menu.appendChild(optionTomes);
            container.appendChild(menu);
            container.appendChild(menuButton);
            
        } else {
            // Pour les animes, un simple bouton
            const button = document.createElement('button');
            button.innerHTML = '🎬 Importer anime';
            button.title = 'Importer cet anime depuis Nautiljon';
            button.style.cssText = `
                padding: 14px 20px;
                background: linear-gradient(135deg, #ec4899, #db2777);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            
            button.onmouseenter = () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
            };
            
            button.onmouseleave = () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            };

            button.onclick = async () => {
                // Animation de chargement
                button.innerHTML = '⏳ Import...';
                button.disabled = true;
                button.style.cursor = 'wait';
                
                // Afficher l'overlay de blocage
                const overlay = createScrapingOverlay();
                
                // Déclencher l'overlay Electron immédiatement
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'http://localhost:40000/api/import-start',
                    headers: { 'Content-Type': 'application/json' },
                    onerror: () => console.warn('Impossible de notifier le début de l\'import')
                });
                
                try {
                    // Extraire les données
                    const data = await extractData();
                    
                    if (!data.titre) {
                        throw new Error('Impossible de trouver le titre');
                    }
                    
                    // Envoyer à Electron
                    const result = await sendToElectron(data, isAnime);
                    
                    // Retirer l'overlay
                    removeScrapingOverlay();
                    
                    // Si le serveur demande une sélection utilisateur (match à 99%)
                    if (result.requiresSelection && result.candidate) {
                        const userChoice = await showSelectionOverlay(
                            data.titre,
                            result.candidate,
                            result.newAnimeData
                        );
                        
                        if (userChoice === 'cancel') {
                            // Annuler l'import et notifier Le Nexus pour fermer l'overlay
                            try {
                                await new Promise((resolve, reject) => {
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: 'http://localhost:40000/api/import-cancel',
                                        headers: { 'Content-Type': 'application/json' },
                                        onload: () => resolve(),
                                        onerror: () => reject()
                                    });
                                });
                            } catch (error) {
                                console.warn('Impossible de notifier l\'annulation à Le Nexus:', error);
                            }
                            
                            button.innerHTML = '🎬 Importer anime';
                            button.disabled = false;
                            button.style.cursor = 'pointer';
                            button.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                            showNotification('ℹ️ Import annulé', 'info');
                            return;
                        } else if (userChoice === 'merge') {
                            // Relancer l'import avec confirmation de fusion
                            const confirmResult = await sendToElectron({
                                ...data,
                                _targetAnimeId: result.candidate.id,
                                _confirmMerge: true
                            }, isAnime);
                            
                            button.innerHTML = '✅';
                            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            showNotification(`✅ <strong>${data.titre}</strong> fusionné avec <strong>${result.candidate.titre}</strong> !<br><small>Source: Nautiljon</small>`, 'success');
                        } else {
                            // Créer un nouvel anime
                            const createResult = await sendToElectron({
                                ...data,
                                _forceCreate: true
                            }, isAnime);
                            
                            button.innerHTML = '✅';
                            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            showNotification(`✅ <strong>${data.titre}</strong> créé(e) !<br><small>Source: Nautiljon</small>`, 'success');
                        }
                    } else {
                        // Animation de succès
                        button.innerHTML = '✅';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        
                        // Notification de succès
                        showNotification(`✅ <strong>${data.titre}</strong> ajouté(e) !<br><small>Source: Nautiljon</small>`, 'success');
                    }
                    
                    // Reset après 2 secondes
                    setTimeout(() => {
                        button.innerHTML = '🎬 Importer anime';
                        button.disabled = false;
                        button.style.cursor = 'pointer';
                        button.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                    }, 2000);
                    
                } catch (error) {
                    // Retirer l'overlay en cas d'erreur
                    removeScrapingOverlay();
                    
                    console.error('❌ Erreur:', error);
                    
                    // Animation d'erreur
                    button.innerHTML = '❌ Erreur';
                    button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    
                    // Notification d'erreur
                    const errorMsg = error.message.includes('Failed to fetch') || error.message.includes('connexion')
                        ? '❌ Le Nexus n\'est pas démarré' 
                        : `❌ Erreur: ${error.message}`;
                    showNotification(errorMsg, 'error');
                    
                    // Reset après 3 secondes
                    setTimeout(() => {
                        button.innerHTML = '🎬 Importer anime';
                        button.disabled = false;
                        button.style.cursor = 'pointer';
                        button.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                    }, 3000);
                }
            };
            
            container.appendChild(button);
        }
        
        document.body.appendChild(container);
    };

    // Afficher une notification
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#ef4444'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 350px;
            line-height: 1.5;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };

    // Ajouter les animations CSS
    const addStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    };

    // Initialisation
    const init = () => {
        console.log(`🚀 Initialisation du script Nautiljon → Le Nexus (${isAnimePage() ? 'Anime' : 'Manga'})`);
        addStyles();
        
        // Attendre que la page soit prête
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(createUI, 500);
            });
        } else {
            setTimeout(createUI, 500);
        }
    };

    init();
})();
