// ==UserScript==
// @name         MangaCollec → Ma Mangathèque
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Import automatique depuis MangaCollec vers Ma Mangathèque (via API)
// @author       You
// @match        https://www.mangacollec.com/editions/*
// @match        https://www.mangacollec.com/series/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    // Intercepter les appels à l'API MangaCollec
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            // Cloner la réponse pour pouvoir la lire
            const clonedResponse = response.clone();
            
            // Vérifier si c'est un appel à l'API series
            if (args[0] && args[0].includes('api.mangacollec.com/v2/series/')) {
                clonedResponse.json().then(data => {
                    console.log('🎯 API interceptée:', data);
                    window.mangacollecApiData = data;
                }).catch(() => {});
            }
            
            return response;
        });
    };

    const PORT = 51234; // Port du serveur local Electron

    // Détection du type de page
    const isSeriesPage = window.location.pathname.includes('/series/');
    const isEditionPage = window.location.pathname.includes('/editions/');
    
    // Stocker les données de l'API
    let apiSeriesData = null;

    // Extraction des données - Parfaitement aligné avec AddSerieModal
    const extractMangaData = () => {
        try {
            if (isSeriesPage) {
                return extractFromSeriesPage();
            } else if (isEditionPage) {
                return extractFromEditionPage();
            } else {
                throw new Error('Page non supportée');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'extraction:', error);
            throw error;
        }
    };

    // Extraction depuis la page /series/* (RICHE EN DONNÉES)
    const extractFromSeriesPage = () => {
        console.log('🔍 Extraction depuis page /series/*');
        
        // Utiliser les données de l'API si disponibles
        const apiData = window.mangacollecApiData;
        
        if (apiData) {
            console.log('✅ Utilisation des données de l\'API', apiData);
            return extractFromApiData(apiData);
        }
        
        // Sinon, fallback sur le scraping DOM (peu fiable)
        console.warn('⚠️ Pas de données API, tentative de scraping DOM...');
        return extractFromSeriesPageDOM();
    };
    
    // Extraction depuis les données de l'API (FIABLE)
    const extractFromApiData = (data) => {
        console.log('🎯 Structure API complète:', data);
        
        // La structure est : { series: [...], editions: [...], authors: [...], volumes: [...], kinds: [...], publishers: [...] }
        const serie = data.series?.[0];
        
        if (!serie) {
            console.error('❌ Pas de série trouvée dans les données API');
            return null;
        }
        
        console.log('✅ Série trouvée:', serie.title);
        
        const titre = serie.title || '';
        
        // Genres depuis "kinds"
        const genres = data.kinds?.map(k => k.title).join(', ') || '';
        
        // Type depuis "types"
        const type = data.types?.[0]?.title || 'Manga';
        
        // Démographie (si présent dans "kinds" avec "Shōnen", "Seinen", etc.)
        const demographieKind = data.kinds?.find(k => 
            ['Shōnen', 'Seinen', 'Shōjo', 'Josei', 'Kodomo'].includes(k.title)
        );
        const demographie = demographieKind?.title || null;
        
        // Trouver l'édition PRINCIPALE (parent_edition_id: null)
        const editionPrincipale = data.editions?.find(e => e.parent_edition_id === null) || data.editions?.[0];
        const nb_chapitres = editionPrincipale?.volumes_count || 0;
        const statut = editionPrincipale?.commercial_stop ? 'Terminée' : 
                      editionPrincipale?.not_finished ? 'En cours' : 'Terminée';
        
        // Éditeur depuis "publishers"
        const editeur = data.publishers?.[0]?.title || '';
        
        // Couverture : trouver le volume 1 de l'édition principale
        const premierVolume = data.volumes?.find(v => 
            v.edition_id === editionPrincipale?.id && v.number === 1
        ) || data.volumes?.find(v => v.number === 1) || data.volumes?.[0];
        const couverture_url = premierVolume?.image_url || '';
        
        // Auteurs : fusionner first_name + name (ou juste name si pas de first_name)
        const auteurs = data.authors?.map(a => {
            if (a.first_name) {
                return `${a.first_name} ${a.name}`;
            }
            return a.name;
        }).filter(n => n).join(', ') || '';
        
        // Description enrichie
        let description = '';
        if (auteurs) {
            description = `Par ${auteurs}.`;
        }
        if (editeur) {
            description += ` Édité par ${editeur} en France.`;
        }
        
        // Type de volume
        const type_volume = 'Broché';
        
        // Langue
        const langue_originale = type.toUpperCase() === 'MANHWA' ? 'ko' : 
                                type.toUpperCase() === 'MANHUA' ? 'zh' : 'ja';
        
        // Extraire les volumes de l'édition principale
        const volumes = data.volumes
            ?.filter(v => v.edition_id === editionPrincipale?.id)
            .sort((a, b) => a.number - b.number)
            .map(v => ({
                numero: v.number,
                couverture_url: v.image_url || '',
                date_sortie: v.release_date || null,
                isbn: v.isbn || null
            })) || [];
        
        console.log('📦 Données extraites:', {
            titre, genres, demographie, nb_chapitres, statut, editeur, auteurs, couverture_url, volumes_count: volumes.length
        });
        
        return {
            titre: titre,
            statut: statut,
            type_volume: type_volume,
            couverture_url: couverture_url || null,
            description: description || null,
            statut_publication: statut,
            annee_publication: null,
            genres: genres || null,
            nb_chapitres: nb_chapitres,
            langue_originale: langue_originale,
            demographie: demographie,
            rating: null,
            _source: 'MangaCollec API',
            _url: window.location.href,
            _type: type,
            _auteurs: auteurs,
            _editeur: editeur,
            // ✨ NOUVEAU : Liste des volumes disponibles
            volumes: volumes
        };
    };
    
    // Extraction depuis le DOM (FALLBACK, peu fiable)
    const extractFromSeriesPageDOM = () => {
        // Debug : Afficher tous les h1
        const allH1 = Array.from(document.querySelectorAll('h1'));
        console.log('🔍 Tous les h1 trouvés:', allH1.length);
        
        // 1. TITRE * (obligatoire) - Plusieurs tentatives
        let titre = 
            document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('[class*="title"]')?.textContent?.trim() ||
            '';
        
        // Nettoyer le titre (retirer les liens/boutons)
        titre = titre
            .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '') // Début
            .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '') // Fin
            .trim();
        
        console.log('🔍 Titre extrait (DOM):', titre || '(VIDE)');

        // 2. TYPE (MANGA / MANHWA / MANHUA / etc.)
        const typeElement = Array.from(document.querySelectorAll('p, span, div'))
            .find(el => el.textContent?.trim() === 'MANGA' || 
                       el.textContent?.trim() === 'MANHWA' || 
                       el.textContent?.trim() === 'MANHUA');
        const type = typeElement?.textContent?.trim() || 'MANGA';

        // 3. GENRES (Tags cliquables sur la page)
        // Les genres sont des liens ou boutons avec du texte court
        const genreLinks = Array.from(document.querySelectorAll('a, button, [class*="tag"], [class*="badge"]'))
            .filter(el => {
                const text = el.textContent?.trim() || '';
                // Filtrer les vrais genres (texte court, pas de chiffres, pas d'URL)
                return text.length > 2 && text.length < 25 && 
                       !text.match(/^\d+$/) && 
                       !text.includes('http') &&
                       !text.includes('Tome') &&
                       !text.includes('Edition');
            });
        
        const possibleGenres = ['Assassin', 'Aventure', 'Fantasy', 'Monde parallèle', 'Shōnen', 
                                'Action', 'Comédie', 'Drame', 'Romance', 'Tranche de vie',
                                'Science-fiction', 'Horreur', 'Mystère', 'Seinen', 'Shojo',
                                'Isekai', 'Ecchi', 'Harem', 'School life'];
        
        const genres = Array.from(new Set(
            genreLinks
                .map(el => el.textContent?.trim())
                .filter(g => possibleGenres.some(pg => pg.toLowerCase() === g?.toLowerCase()))
        )).join(', ');

        // 4. DÉMOGRAPHIE (Shōnen / Seinen / Shojo / Josei)
        const demographies = ['Shōnen', 'Seinen', 'Shojo', 'Josei', 'Kodomo'];
        const demographie = demographies.find(d => 
            document.body.textContent.includes(d)
        ) || null;

        // 5. AUTEURS
        const auteurElements = Array.from(document.querySelectorAll('[class*="author"], [class*="auteur"]'));
        const auteurs = auteurElements
            .map(el => el.textContent?.trim())
            .filter(a => a && a.length > 2 && a.length < 50)
            .join(', ');

        // 6. ÉDITIONS - Extraire info de la première édition simple
        const editionSimple = Array.from(document.querySelectorAll('h3, h4, p, div'))
            .find(el => el.textContent?.includes('Edition simple'));
        
        let nb_chapitres = null;
        let statut = 'En cours';
        let editeur = '';

        if (editionSimple) {
            // Chercher les infos autour de l'édition simple
            const editionText = editionSimple.parentElement?.textContent || editionSimple.textContent || '';
            
            // Nombre de tomes
            const tomesMatch = editionText.match(/(\d+)\s*tomes?\s*parus?/i);
            if (tomesMatch) {
                nb_chapitres = parseInt(tomesMatch[1]);
            }
            
            // Statut
            if (editionText.includes('Edition terminée')) {
                statut = 'Terminée';
            } else if (editionText.includes('Edition en cours')) {
                statut = 'En cours';
            }

            // Éditeur (souvent à côté de "Edition simple •")
            const editeurMatch = editionText.match(/Edition\s+simple\s*•\s*([^\d]+)/i);
            if (editeurMatch) {
                editeur = editeurMatch[1].trim().split(/\d/)[0].trim();
            }
        }

        // 7. COUVERTURE (Première image de tome)
        const couverture_url = 
            document.querySelector('img[alt*="Tome 1"]')?.src ||
            document.querySelector('img[src*="tome"]')?.src ||
            document.querySelector('img[alt*="tome"]')?.src ||
            '';

        // 8. DESCRIPTION
        let description = '';
        if (auteurs) {
            description = `Par ${auteurs}.`;
        }
        if (editeur) {
            description += ` Édité par ${editeur} en France.`;
        }

        // 9. TYPE_VOLUME
        const type_volume = 'Broché'; // Par défaut pour édition simple

        // 10. LANGUE_ORIGINALE
        const langue_originale = type === 'MANHWA' ? 'ko' : 
                                type === 'MANHUA' ? 'zh' : 'ja';

        return {
            titre: titre.trim(),
            statut: statut,
            type_volume: type_volume,
            couverture_url: couverture_url || null,
            description: description || null,
            statut_publication: statut, // Même valeur
            annee_publication: null,
            genres: genres || null,
            nb_chapitres: nb_chapitres,
            langue_originale: langue_originale,
            demographie: demographie,
            rating: null,
            _source: 'MangaCollec (Series)',
            _url: window.location.href,
            _type: type,
            _auteurs: auteurs,
            _editeur: editeur
        };
    };

    // Extraction depuis la page /editions/* (MOINS DE DONNÉES)
    const extractFromEditionPage = () => {
        // 1. TITRE * (obligatoire)
        let titre = 
            document.querySelector('h1')?.textContent?.trim() ||
            document.querySelector('[class*="series-title"]')?.textContent?.trim() ||
            document.querySelector('a[href*="/series/"]')?.textContent?.trim() ||
            '';
        
        // Nettoyer le titre (retirer les liens/boutons)
        titre = titre
            .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '') // Début
            .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '') // Fin
            .trim();

        // 2. STATUT (En cours / Terminée / Abandonnée)
        const bodyText = document.body.textContent;
        let statut = 'En cours'; // Par défaut
        if (bodyText.includes('Edition terminée') || bodyText.includes('Série terminée')) {
            statut = 'Terminée';
        } else if (bodyText.includes('Série abandonnée')) {
            statut = 'Abandonnée';
        }

        // 3. TYPE_VOLUME (Broché / Kindle / Webtoon / Broché Collector)
        const editionType = document.querySelector('.edition-type, h2')?.textContent?.trim() || '';
        let type_volume = 'Broché'; // Par défaut
        if (editionType.toLowerCase().includes('collector')) {
            type_volume = 'Broché Collector';
        } else if (editionType.toLowerCase().includes('kindle') || editionType.toLowerCase().includes('numérique')) {
            type_volume = 'Kindle';
        } else if (editionType.toLowerCase().includes('webtoon')) {
            type_volume = 'Webtoon';
        }

        // 4. COUVERTURE_URL (URL de l'image du tome 1)
        const couverture_url = 
            document.querySelector('img[alt*="Tome 1"]')?.src ||
            document.querySelector('img[src*="tome"]')?.src ||
            document.querySelector('.tome-cover img')?.src ||
            document.querySelector('img[class*="cover"]')?.src ||
            '';

        // 5. NB_CHAPITRES (Nombre de volumes/tomes)
        const tomeElements = document.querySelectorAll('[class*="tome"], [class*="volume"], img[alt*="Tome"]');
        const nb_chapitres = tomeElements.length || 
                            (document.body.textContent.match(/(\d+)\s*tomes?/i)?.[1]) || 
                            null;

        // 6. DESCRIPTION (Optionnel - MangaCollec n'a souvent pas de synopsis)
        const description = 
            document.querySelector('.synopsis')?.textContent?.trim() ||
            document.querySelector('.description')?.textContent?.trim() ||
            document.querySelector('[class*="summary"]')?.textContent?.trim() ||
            '';

        // 7. GENRES (Peu disponibles sur page édition)
        const genreElements = document.querySelectorAll('.tag, .genre, .category, [class*="tag"]');
        const genres = Array.from(genreElements)
            .map(el => el.textContent?.trim())
            .filter(g => g && g.length > 0 && g.length < 30)
            .join(', ') || '';

        // 8. EDITEUR (Pas dans le formulaire mais utile pour la description)
        const editeur = 
            document.querySelector('[href*="/editeurs/"]')?.textContent?.trim() ||
            Array.from(document.querySelectorAll('dt, .label'))
                .find(el => el.textContent?.includes('Editeur'))
                ?.nextElementSibling?.textContent?.trim() || 
            '';

        // Créer une description enrichie si vide
        let finalDescription = description;
        if (!finalDescription && editeur) {
            finalDescription = `Édité par ${editeur} en France.`;
        }

        // 9. LANGUE_ORIGINALE (Par défaut japonais pour manga)
        const langue_originale = 'ja';

        // Construire l'objet exactement comme attendu par createSerie
        return {
            titre: titre.trim(),
            statut: statut,
            type_volume: type_volume,
            couverture_url: couverture_url || null,
            description: finalDescription || null,
            statut_publication: null, // Non disponible sur page édition
            annee_publication: null, // Non disponible sur page édition
            genres: genres || null,
            nb_chapitres: nb_chapitres ? parseInt(nb_chapitres) : null,
            langue_originale: langue_originale,
            demographie: null, // Non disponible sur page édition
            rating: null, // Non disponible
            
            // Métadonnées supplémentaires (non envoyées à l'API mais utiles pour debug)
            _source: 'MangaCollec (Edition)',
            _url: window.location.href,
            _editeur: editeur
        };
    };

    // Envoyer les données à l'application Electron
    const sendToElectron = async (data, tomesOnly = false) => {
        try {
            const endpoint = tomesOnly ? 'import-tomes-only' : 'import-manga';
            const response = await fetch(`http://localhost:${PORT}/api/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Erreur connexion avec Ma Mangathèque:', error);
            throw error;
        }
    };

    // Créer l'interface utilisateur
    const createUI = () => {
        // Conteneur pour les 2 boutons
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 999999;
        `;

        // Bouton 1: Import complet (série + tomes)
        const buttonFull = document.createElement('button');
        buttonFull.innerHTML = '📚';
        buttonFull.title = 'Import complet (série + tomes)';
        buttonFull.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        buttonFull.onmouseenter = () => {
            buttonFull.style.transform = 'scale(1.1) rotate(5deg)';
            buttonFull.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.7)';
        };
        
        buttonFull.onmouseleave = () => {
            buttonFull.style.transform = 'scale(1) rotate(0deg)';
            buttonFull.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
        };

        // Bouton 2: Import tomes uniquement
        const buttonTomes = document.createElement('button');
        buttonTomes.innerHTML = '📖';
        buttonTomes.title = 'Import tomes uniquement (série doit exister)';
        buttonTomes.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        buttonTomes.onmouseenter = () => {
            buttonTomes.style.transform = 'scale(1.1) rotate(5deg)';
            buttonTomes.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.7)';
        };
        
        buttonTomes.onmouseleave = () => {
            buttonTomes.style.transform = 'scale(1) rotate(0deg)';
            buttonTomes.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.5)';
        };
        
        // Click handler pour l'import complet
        buttonFull.onclick = async () => {
            // Animation de chargement
            buttonFull.innerHTML = '⏳';
            buttonFull.disabled = true;
            buttonFull.style.cursor = 'wait';
            
            // Déclencher l'overlay immédiatement
            try {
                await fetch('http://localhost:51234/api/import-start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                console.warn('Impossible de notifier le début de l\'import:', e);
            }
            
            try {
                // Extraire les données (depuis l'API ou DOM)
                const data = extractMangaData();
                console.log('📊 Données extraites:', data);
                
                if (data.volumes && data.volumes.length > 0) {
                    console.log(`📚 ${data.volumes.length} volume(s) disponible(s) à créer:`, data.volumes);
                }
                
                // Vérifier que le titre existe (champ obligatoire)
                if (!data.titre) {
                    throw new Error('Impossible de trouver le titre de la série');
                }
                
                // Envoyer à Electron (import complet)
                const result = await sendToElectron(data, false);
                
                // Animation de succès
                buttonFull.innerHTML = '✅';
                buttonFull.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                // Notification enrichie selon le type de page
                const pageType = isSeriesPage ? 'série (riche)' : 'édition';
                const volumesIgnored = result.volumesIgnored || 0;
                const tomesInfo = result.tomesCreated > 0 
                    ? `<br><small>📚 ${result.tomesCreated} tome(s) créé(s)${volumesIgnored > 0 ? ` (${volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                    : '';
                const extraInfo = data.genres ? `<br><small>Genres: ${data.genres}</small>` : '';
                showNotification(`✅ <strong>${data.titre}</strong> ajoutée !<br><small>Source: ${pageType}</small>${tomesInfo}${extraInfo}`, 'success');
                
                // Reset après 2 secondes
                setTimeout(() => {
                    buttonFull.innerHTML = '📚';
                    buttonFull.disabled = false;
                    buttonFull.style.cursor = 'pointer';
                    buttonFull.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                // Animation d'erreur
                buttonFull.innerHTML = '❌';
                buttonFull.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                
                // Notification d'erreur
                const errorMsg = error.message.includes('Failed to fetch') 
                    ? '❌ Ma Mangathèque n\'est pas démarré' 
                    : `❌ Erreur: ${error.message}`;
                showNotification(errorMsg, 'error');
                
                // Reset après 3 secondes
                setTimeout(() => {
                    buttonFull.innerHTML = '📚';
                    buttonFull.disabled = false;
                    buttonFull.style.cursor = 'pointer';
                    buttonFull.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                }, 3000);
            }
        };
        
        // Click handler pour l'import tomes uniquement
        buttonTomes.onclick = async () => {
            // Animation de chargement
            buttonTomes.innerHTML = '⏳';
            buttonTomes.disabled = true;
            buttonTomes.style.cursor = 'wait';
            
            // Déclencher l'overlay immédiatement
            try {
                await fetch('http://localhost:51234/api/import-start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                console.warn('Impossible de notifier le début de l\'import:', e);
            }
            
            try {
                // Extraire les données (depuis l'API ou DOM)
                const data = extractMangaData();
                console.log('📊 Données extraites:', data);
                
                if (data.volumes && data.volumes.length > 0) {
                    console.log(`📚 ${data.volumes.length} volume(s) disponible(s):`, data.volumes);
                }
                
                // Vérifier que le titre existe (champ obligatoire)
                if (!data.titre) {
                    throw new Error('Impossible de trouver le titre de la série');
                }
                
                // Envoyer à Electron (tomes uniquement)
                const result = await sendToElectron(data, true);
                
                // Animation de succès
                buttonTomes.innerHTML = '✅';
                buttonTomes.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                // Notification enrichie
                const tomesCreated = result.tomesCreated || 0;
                const volumesIgnored = result.volumesIgnored || 0;
                const message = result.message || '';
                
                if (tomesCreated > 0) {
                    const ignoredInfo = volumesIgnored > 0 ? ` (${volumesIgnored} ignoré(s) sans date VF)` : '';
                    showNotification(`✅ ${tomesCreated} tome(s) ajouté(s) à <strong>${data.titre}</strong>${ignoredInfo}<br><small>Source: MangaCollec</small>`, 'success');
                } else {
                    const infoMsg = volumesIgnored > 0 
                        ? `Tous les tomes sont déjà présents (${volumesIgnored} ignoré(s) sans date VF)` 
                        : message || 'Tous les tomes sont déjà présents';
                    showNotification(`ℹ️ ${infoMsg}<br><small>${data.titre}</small>`, 'info');
                }
                
                // Reset après 2 secondes
                setTimeout(() => {
                    buttonTomes.innerHTML = '📖';
                    buttonTomes.disabled = false;
                    buttonTomes.style.cursor = 'pointer';
                    buttonTomes.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                // Animation d'erreur
                buttonTomes.innerHTML = '❌';
                buttonTomes.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                
                // Notification d'erreur
                const errorMsg = error.message.includes('Failed to fetch') 
                    ? '❌ Ma Mangathèque n\'est pas démarré' 
                    : `❌ Erreur: ${error.message}`;
                showNotification(errorMsg, 'error');
                
                // Reset après 3 secondes
                setTimeout(() => {
                    buttonTomes.innerHTML = '📖';
                    buttonTomes.disabled = false;
                    buttonTomes.style.cursor = 'pointer';
                    buttonTomes.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                }, 3000);
            }
        };
        
        // Ajouter les boutons au conteneur
        container.appendChild(buttonFull);
        container.appendChild(buttonTomes);
        document.body.appendChild(container);
    };

    // Afficher une notification
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.innerHTML = message; // Changé pour supporter le HTML
        notification.style.cssText = `
            position: fixed;
            bottom: 95px;
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

    // Attendre que l'API soit appelée
    const waitForApiData = (callback) => {
        console.log('⏳ Attente des données de l\'API...');
        
        let attempts = 0;
        const maxAttempts = 30; // 6 secondes max
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (window.mangacollecApiData) {
                clearInterval(checkInterval);
                console.log('✅ Données API disponibles !');
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout - Pas de données API après 6 secondes');
                callback(); // Créer l'UI quand même
            }
        }, 200); // Vérifier toutes les 200ms
    };

    // Initialisation
    const init = () => {
        console.log('🚀 Initialisation du script MangaCollec → Ma Mangathèque');
        addStyles();
        
        // Attendre que la page et l'API soient prêtes
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => waitForApiData(createUI), 1000);
            });
        } else {
            setTimeout(() => waitForApiData(createUI), 1000);
        }
    };

    init();
})();
