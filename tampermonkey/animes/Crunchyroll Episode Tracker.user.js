// ==UserScript==
// @name         Crunchyroll → Ma Mangathèque
// @namespace    http://tampermonkey.net/
// @version      2.6.0
// @description  Importe automatiquement vos animes depuis Crunchyroll vers Ma Mangathèque et marque vos épisodes comme vus avec auto-incrémentation et création automatique des saisons au marquage
// @author       Rory-Mercury91
// @match        https://*.crunchyroll.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 51234;
    let episodeSaved = null;
    let currentPageType = null;
    let lastUrl = window.location.href;
    
    // Détecter le type de page
    const getPageType = () => {
        const url = window.location.href;
        if (url.includes('/watch/') || url.includes('/video/')) {
            return 'episode';
        } else if (url.includes('/series/')) {
            return 'series';
        }
        return null;
    };
    
    const pageType = getPageType();
    currentPageType = pageType;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎬 CRUNCHYROLL → MA MANGATHÈQUE v2.3.0');
    console.log('✨ Double bouton: 📥 Import série + 👁️ Marquage épisode');
    console.log('🔄 Auto-détection des changements de page SPA');
    console.log('📍 URL:', window.location.href);
    console.log('📄 Type de page:', pageType || 'autre');
    console.log('═══════════════════════════════════════════════════');
    
    // Fonction helper pour merger les objets JSON-LD
    const mergeObjects = (objects) => {
        let acc = {};
        for (let curr of objects) {
            Object.assign(acc, curr);
            acc.aggregateRating = acc.aggregateRating || curr.aggregateRating;
            acc.partOfSeason = acc.partOfSeason || curr.partOfSeason;
            acc.partOfSeries = acc.partOfSeries || curr.partOfSeries;
            acc.potentialAction = acc.potentialAction || curr.potentialAction;
        }
        return acc;
    };
    
    // Extraire l'URL de la page principale de l'anime
    const getAnimeSeriesUrl = () => {
        try {
            // 1. Chercher dans les métadonnées JSON-LD
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const parsed = Array.from(scripts).map(script => {
                try {
                    return JSON.parse(script.innerText);
                } catch (error) {
                    return null;
                }
            }).filter(item => item !== null);
            
            const merged = mergeObjects(parsed);
            
            // L'URL de la série peut être dans partOfSeries.url
            if (merged.partOfSeries?.url) {
                console.log('✅ URL série trouvée dans JSON-LD:', merged.partOfSeries.url);
                return merged.partOfSeries.url;
            }
            
            // 2. Chercher un lien dans le DOM vers la série
            const seriesLink = document.querySelector('a[href*="/series/"]');
            if (seriesLink && seriesLink.href) {
                console.log('✅ URL série trouvée dans le DOM:', seriesLink.href);
                return seriesLink.href;
            }
            
            // 3. Chercher le titre cliquable (souvent un lien vers la série)
            const titleLink = document.querySelector('.show-title-link, [class*="show-title"]');
            if (titleLink && titleLink.href && titleLink.href.includes('/series/')) {
                console.log('✅ URL série trouvée via le titre:', titleLink.href);
                return titleLink.href;
            }
            
            console.log('⚠️ URL série non trouvée automatiquement');
            return null;
        } catch (error) {
            console.error('❌ Erreur détection URL série:', error);
            return null;
        }
    };
    
    // Extraire le numéro de saison de manière robuste
    const detectSeasonNumber = (title, jsonData) => {
        console.log('🔍 Détection de saison pour:', title);
        
        // 1. Vérifier dans les métadonnées JSON-LD
        if (jsonData.partOfSeason?.seasonNumber) {
            const seasonNum = parseInt(jsonData.partOfSeason.seasonNumber);
            console.log('✅ Saison trouvée dans JSON-LD (partOfSeason):', seasonNum);
            return seasonNum;
        }
        
        if (jsonData.seasonNumber) {
            const seasonNum = parseInt(jsonData.seasonNumber);
            console.log('✅ Saison trouvée dans JSON-LD (seasonNumber):', seasonNum);
            return seasonNum;
        }
        
        // 2. Chercher "Season X", "S X", "Saison X" dans le titre
        const seasonPatterns = [
            /Season\s*(\d+)/i,
            /Saison\s*(\d+)/i,
            /\bS(\d+)\b/,
            /Part\s*(\d+)/i,
            /Partie\s*(\d+)/i,
            /Cour\s*(\d+)/i
        ];
        
        for (const pattern of seasonPatterns) {
            const match = title.match(pattern);
            if (match) {
                const seasonNum = parseInt(match[1]);
                console.log(`✅ Saison trouvée via pattern "${pattern}":`, seasonNum);
                return seasonNum;
            }
        }
        
        // 3. Chercher dans le breadcrumb ou les métadonnées de la page
        const breadcrumb = document.querySelector('[data-t="breadcrumb-item"]:last-child, .show-title, h4.title');
        if (breadcrumb && breadcrumb.textContent) {
            const breadcrumbText = breadcrumb.textContent;
            for (const pattern of seasonPatterns) {
                const match = breadcrumbText.match(pattern);
                if (match) {
                    const seasonNum = parseInt(match[1]);
                    console.log(`✅ Saison trouvée dans breadcrumb:`, seasonNum);
                    return seasonNum;
                }
            }
        }
        
        // 4. Chercher un numéro à la fin du titre (ex: "Titre 2" ou "Titre - 2")
        const endNumberMatch = title.match(/\s+(?:-\s*)?(\d+)$/);
        if (endNumberMatch) {
            const num = parseInt(endNumberMatch[1]);
            // Seulement si c'est un nombre raisonnable pour une saison (1-20)
            if (num >= 1 && num <= 20) {
                console.log(`✅ Saison trouvée via numéro final:`, num);
                return num;
            }
        }
        
        // 5. Par défaut : saison 1
        console.log('⚠️ Saison non détectée, utilisation de la saison 1 par défaut');
        return 1;
    };
    
    // Nettoyer le titre en retirant les indicateurs de saison
    const cleanTitle = (title) => {
        let cleaned = title;
        
        // Retirer "Season X", "S X", etc.
        cleaned = cleaned.replace(/\s*(?:Season|Saison|Part|Partie|Cour)\s*\d+/gi, '').trim();
        cleaned = cleaned.replace(/\s*\bS\d+\b/g, '').trim();
        
        // Retirer numéro final si détecté comme saison (ex: "Titre 2" → "Titre")
        cleaned = cleaned.replace(/\s+(?:-\s*)?\d+$/, '').trim();
        
        // Retirer les tirets ou virgules orphelins à la fin
        cleaned = cleaned.replace(/\s*[-,;:]\s*$/, '').trim();
        
        console.log(`🧹 Titre nettoyé: "${title}" → "${cleaned}"`);
        return cleaned;
    };
    
    // Extraire les informations de l'épisode
    const extractEpisodeInfo = () => {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const parsed = Array.from(scripts).map(script => {
                try {
                    return JSON.parse(script.innerText);
                } catch (error) {
                    return null;
                }
            }).filter(item => item !== null);
            
            const merged = mergeObjects(parsed);
            let rawTitle = merged.partOfSeries?.name;
            const episode = Number(merged.episodeNumber) || 0;
            
            if (!rawTitle) {
                throw new Error("Titre non trouvé");
            }
            
            // Détecter le numéro de saison avec la nouvelle méthode robuste
            const season = detectSeasonNumber(rawTitle, merged);
            
            // Nettoyer le titre en retirant les indicateurs de saison
            const title = cleanTitle(rawTitle);
            
            console.log('✅ Épisode détecté:', { title, season, episode, rawTitle });
            return { title, season, episode };
        } catch (error) {
            console.error('❌ Erreur extraction épisode:', error);
            return null;
        }
    };
    
    // Récupérer les données depuis la page série
    const fetchAnimeDataFromSeriesPage = (seriesUrl) => {
        return new Promise((resolve, reject) => {
            console.log('🔄 Récupération des données depuis:', seriesUrl);
            
            GM_xmlhttpRequest({
                method: 'GET',
                url: seriesUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                onload: function(response) {
                    try {
                        if (response.status !== 200) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        
                        // Scraper les meta tags de la page série
                        console.log('🔎 Scraping HTML de la page série...');
                        const metaDesc = doc.querySelector('meta[name="description"], meta[property="og:description"]');
                        const metaImage = doc.querySelector('meta[property="og:image"]');
                        const metaTitle = doc.querySelector('meta[property="og:title"]');
                        
                        const scrapedFromSeries = {
                            description: metaDesc?.content || null,
                            imageUrl: metaImage?.content || null,
                            title: metaTitle?.content || null
                        };
                        
                        console.log('📊 Données scrapées de la page série:', scrapedFromSeries);
                        
                        // Essayer aussi les JSON-LD si disponibles
                        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                        const parsed = Array.from(scripts).map(script => {
                            try {
                                return JSON.parse(script.innerText);
                            } catch (error) {
                                return null;
                            }
                        }).filter(item => item !== null);
                        
                        let merged = {};
                        if (parsed.length > 0) {
                            merged = mergeObjects(parsed);
                            console.log('📊 Métadonnées JSON-LD trouvées:', merged);
                        } else {
                            console.log('⚠️ Aucune métadonnée JSON-LD, utilisation du scraping HTML');
                        }
                        
                        // Extraire les vraies données avec priorité au scraping
                        let title = merged.name || merged.partOfSeries?.name || scrapedFromSeries.title || 'Unknown';
                        const nativeTitle = merged.alternateName || null;
                        const description = scrapedFromSeries.description || merged.description || '';
                        
                        // Vraie image de couverture avec priorité au scraping
                        let imageUrl = scrapedFromSeries.imageUrl || '';
                        if (!imageUrl && merged.image) {
                            imageUrl = Array.isArray(merged.image) ? merged.image[0] : merged.image;
                        } else if (!imageUrl && merged.thumbnailUrl) {
                            imageUrl = Array.isArray(merged.thumbnailUrl) ? merged.thumbnailUrl[0] : merged.thumbnailUrl;
                        }
                        
                        // Détection de saison depuis le titre
                        let detectedSeason = 1;
                        const seasonMatch = title.match(/\s+(?:-\s*)?(\d+)$/);
                        if (seasonMatch) {
                            detectedSeason = parseInt(seasonMatch[1]);
                            title = title.replace(/\s+(?:-\s*)?\d+$/, '').trim();
                            console.log(`✅ Saison ${detectedSeason} détectée`);
                        }
                        
                        // Nombre d'épisodes
                        let totalEpisodes = merged.numberOfEpisodes ? Number(merged.numberOfEpisodes) : 12;
                        
                        const genres = merged.genre || [];
                        const genresStr = Array.isArray(genres) ? genres.join(', ') : String(genres || '');
                        
                        const animeData = {
                            titre: title,
                            titre_natif: nativeTitle,
                            couverture_url: imageUrl,
                            description: description,
                            saisons: [{
                                numero_saison: detectedSeason,
                                titre: `Saison ${detectedSeason}`,
                                nb_episodes: totalEpisodes,
                                annee: new Date().getFullYear()
                            }],
                            genres: genresStr || null,
                            type: 'TV',
                            studios: null,
                            annee: new Date().getFullYear(),
                            statut: 'En cours',
                            mal_id: null,
                            source_import: 'crunchyroll'
                        };
                        
                        console.log('✅ Données optimisées extraites:', animeData);
                        resolve(animeData);
                        
                    } catch (error) {
                        console.error('❌ Erreur parsing page série:', error);
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error('❌ Erreur requête:', error);
                    reject(new Error('Erreur de requête vers la page série'));
                }
            });
        });
    };
    
    // Scraping HTML direct depuis la page actuelle
    const scrapeDOMForData = () => {
        console.log('🔎 Scraping HTML de la page actuelle (DOM complet)...');
        const scraped = {
            description: null,
            imageUrl: null,
            genres: [],
            totalEpisodes: null
        };
        
        // Le titre est géré par extractEpisodeInfo() dans extractFullAnimeDataFallback()
        
        // 2. Description : chercher UNIQUEMENT dans le DOM (meta tags = épisode)
        // Chercher dans le DOM des éléments avec class contenant "description", "synopsis", "about"
        const descSelectors = [
            '[class*="show-description"]',
            '[class*="series-description"]',
            '[class*="synopsis"]',
            '[class*="about"]',
            '[class*="description"]',
            'p[class*="overview"]',
            '[data-t*="description"]',
            '[data-t*="synopsis"]'
        ];
        
        for (const selector of descSelectors) {
            const elem = document.querySelector(selector);
            if (elem && elem.textContent && elem.textContent.trim().length > 150) {
                scraped.description = elem.textContent.trim();
                console.log('✅ Description trouvée (DOM):', scraped.description.substring(0, 80) + '...');
                break;
            }
        }
        
        if (!scraped.description) {
            console.warn('⚠️ Description de série non trouvée dans le DOM');
        }
        
        // 3. Image : chercher dans le DOM avec priorité aux images keyart/backdrop
        const imgSelectors = [
            'img[src*="keyart"]',
            'img[src*="backdrop"]',
            'img[class*="show-poster"]',
            'img[class*="series-poster"]',
            'img[class*="content-image"]',
            'picture img',
            'img[class*="poster"]',
            'img[class*="thumbnail"]'
        ];
        
        for (const selector of imgSelectors) {
            const img = document.querySelector(selector);
            if (img && img.src) {
                // Ignorer les images floues
                if (img.src.includes('blur=')) {
                    continue;
                }
                // Priorité aux images keyart/backdrop (haute qualité sur page série)
                if (img.src.includes('keyart') || img.src.includes('backdrop')) {
                    scraped.imageUrl = img.src;
                    console.log('✅ Image keyart/backdrop trouvée (DOM):', scraped.imageUrl);
                    break;
                }
                // Sinon, accepter les autres images si elles sont assez grandes
                if (!img.src.includes('/episode/') && (img.src.includes('width=') || img.width > 200)) {
                    scraped.imageUrl = img.src;
                    console.log('✅ Image de série trouvée (DOM):', scraped.imageUrl);
                    break;
                }
            }
        }
        
        // Fallback: og:image si rien trouvé
        if (!scraped.imageUrl) {
            const metaImage = document.querySelector('meta[property="og:image"]');
            if (metaImage && metaImage.content) {
                scraped.imageUrl = metaImage.content;
                console.log('⚠️ Image trouvée (og:image - fallback):', scraped.imageUrl);
            }
        }
        
        // 4. Genres : chercher dans plusieurs endroits et FILTRER les faux genres
        const fakeGenres = ['sous-titrage', 'doublage', 'subtitled', 'dubbed', 'vf', 'vostfr', 'sub', 'dub'];
        
        // a) Meta keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords && metaKeywords.content) {
            const keywords = metaKeywords.content.split(',')
                .map(k => k.trim())
                .filter(k => {
                    if (!k || k.length < 3 || k.length > 30) return false;
                    const lower = k.toLowerCase();
                    return !fakeGenres.some(fake => lower.includes(fake));
                });
            if (keywords.length > 0) {
                scraped.genres = keywords;
                console.log('✅ Genres trouvés (keywords):', scraped.genres);
            }
        }
        
        // b) Chercher des badges/liens de genres dans le DOM
        if (scraped.genres.length === 0) {
            const genreElements = document.querySelectorAll('[class*="genre"], [class*="tag"], a[href*="/genre/"]');
            const genres = Array.from(genreElements)
                .map(el => el.textContent.trim())
                .flatMap(g => g.split(',').map(s => s.trim())) // Split par virgules
                .filter(g => {
                    if (!g || g.length < 3 || g.length > 30) return false;
                    const lower = g.toLowerCase();
                    return !fakeGenres.some(fake => lower.includes(fake));
                });
            if (genres.length > 0) {
                scraped.genres = [...new Set(genres)]; // Dédupliquer
                console.log('✅ Genres trouvés (DOM):', scraped.genres);
            }
        }
        
        if (scraped.genres.length === 0) {
            console.warn('⚠️ Aucun genre valide trouvé');
        }
        
        // 5. Nombre d'épisodes : chercher dans le texte de la page
        const bodyText = document.body.innerText;
        const episodePatterns = [
            /(?:of|sur|\/)\s*(\d{1,3})\s*(?:episodes?|épisodes?)/i,
            /(\d{1,3})\s*(?:episodes?|épisodes?)\s*(?:total|disponibles?)/i,
            /saison.*?(\d{1,3})\s*(?:episodes?|épisodes?)/i
        ];
        
        for (const pattern of episodePatterns) {
            const match = bodyText.match(pattern);
            if (match) {
                scraped.totalEpisodes = parseInt(match[1]);
                console.log('✅ Nombre d\'épisodes trouvé:', scraped.totalEpisodes);
                break;
            }
        }
        
        // Résumé du scraping
        console.log('📊 Résumé du scraping DOM:', {
            description: scraped.description ? `✅ ${scraped.description.substring(0, 50)}...` : '❌ NON TROUVÉ',
            imageUrl: scraped.imageUrl ? '✅ Trouvée' : '❌ NON TROUVÉ',
            genres: scraped.genres.length > 0 ? `✅ ${scraped.genres.join(', ')}` : '❌ NON TROUVÉ',
            totalEpisodes: scraped.totalEpisodes || '❌ NON TROUVÉ'
        });
        
        return scraped;
    };
    
    // Extraire depuis la page actuelle (épisode ou série)
    const extractFullAnimeDataFallback = () => {
        // Redétecter le type de page (important pour les SPAs)
        const currentUrl = window.location.href;
        const isSeriesPage = currentUrl.includes('/series/');
        console.log(isSeriesPage ? '🎬 Extraction depuis la page série' : '⚠️ Fallback: extraction depuis la page épisode');
        console.log('📍 URL actuelle:', currentUrl);
        
        try {
            // Parser les JSON-LD
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const parsed = Array.from(scripts).map(script => {
                try {
                    return JSON.parse(script.innerText);
                } catch (error) {
                    return null;
                }
            }).filter(item => item !== null);
            
            const merged = mergeObjects(parsed);
            console.log('📊 JSON-LD trouvé:', merged);
            
            // Sur la page série, le JSON-LD contient tout !
            let title = 'Unknown';
            let description = '';
            let imageUrl = '';
            
            if (isSeriesPage && merged['@type'] === 'TVSeries') {
                // Page série : JSON-LD complet
                title = merged.name || 'Unknown';
                // Nettoyer le titre (enlever "Watch " au début)
                title = title.replace(/^Watch\s+/, '').trim();
                description = merged.description || '';
                imageUrl = merged.image || '';
                console.log('✅ Données de la page série (JSON-LD):', { title, description: description.substring(0, 80) + '...', imageUrl });
            } else {
                // Page épisode OU JSON-LD non trouvé : utiliser extractEpisodeInfo pour le titre
                const episodeInfo = extractEpisodeInfo();
                title = episodeInfo?.title || merged.partOfSeries?.name || merged.name || 'Unknown';
                // Nettoyer le titre même si pas depuis JSON-LD
                title = title.replace(/^Watch\s+/, '').trim();
                console.log('✅ Titre de la série:', title);
            }
            
            const nativeTitle = merged.alternateName || null;
            
            // Scraping HTML pour données supplémentaires
            const scrapedData = scrapeDOMForData();
            
            // Compléter avec les données scrapées du DOM
            if (!isSeriesPage) {
                // Page épisode
                description = scrapedData.description || merged.partOfSeries?.description || merged.description || description;
                imageUrl = scrapedData.imageUrl || imageUrl;
                if (!imageUrl && merged.partOfSeries?.image) {
                    imageUrl = Array.isArray(merged.partOfSeries.image) ? merged.partOfSeries.image[0] : merged.partOfSeries.image;
                }
                if (!imageUrl && merged.thumbnailUrl) {
                    imageUrl = Array.isArray(merged.thumbnailUrl) ? merged.thumbnailUrl[0] : merged.thumbnailUrl;
                }
                if (!imageUrl && merged.image) {
                    imageUrl = Array.isArray(merged.image) ? merged.image[0] : merged.image;
                }
            } else {
                // Page série : compléter ce qui manque avec le DOM
                if (!description || description.length < 100) {
                    description = scrapedData.description || description;
                    console.log('✅ Description complétée depuis le DOM');
                }
                
                // Améliorer l'image si possible avec le DOM (sans blur)
                const domImage = scrapedData.imageUrl;
                // Préférer toujours l'image DOM si elle n'a pas de blur
                if (domImage && !domImage.includes('blur=')) {
                    imageUrl = domImage;
                    console.log('✅ Image améliorée depuis le DOM (sans blur)');
                } else if (imageUrl && imageUrl.includes('blur=')) {
                    // Si l'image JSON-LD a du blur, essayer le DOM
                    if (domImage) {
                        imageUrl = domImage;
                        console.log('⚠️ Image JSON-LD floue, remplacement par DOM');
                    }
                } else if (!imageUrl) {
                    imageUrl = domImage || merged.image || '';
                }
            }
            
            // Sur page série : ne pas détecter de saison (sera créée lors du marquage d'épisode)
            // Sur page épisode : détecter la saison depuis le JSON-LD
            let rawTitle = title;
            title = cleanTitle(title);
            
            if (isSeriesPage) {
                console.log('📋 Import depuis page série : pas de création de saison (seront créées au marquage d\'épisode)');
            }
            
            // Genres : combiner scraping et JSON-LD
            let genres = scrapedData.genres && scrapedData.genres.length > 0 ? scrapedData.genres : merged.genre || merged.partOfSeries?.genre || [];
            // Nettoyer et dédupliquer les genres
            if (Array.isArray(genres)) {
                genres = genres
                    .flatMap(g => String(g).split(',').map(s => s.trim())) // Split par virgules
                    .filter(g => g && g.length > 2 && g.length < 30); // Filtrer vides et trop longs/courts
                genres = [...new Set(genres)]; // Dédupliquer
            }
            const genresStr = Array.isArray(genres) ? genres.join(', ') : String(genres || '');
            
            console.log('📦 Données fallback extraites:', {
                titre: title,
                description: description ? description.substring(0, 80) + '...' : '❌ MANQUANT',
                imageUrl: imageUrl || '❌ MANQUANT',
                genres: genresStr || '❌ MANQUANT'
            });
            
            // Sur page série : ne pas créer de saisons (elles seront créées au marquage d'épisode)
            // Sur page épisode : ne devrait pas être utilisé (on n'importe pas depuis la page épisode)
            return {
                titre: title,
                titre_natif: nativeTitle,
                couverture_url: imageUrl,
                description: description,
                saisons: [], // Aucune saison lors de l'import (créées automatiquement au marquage)
                genres: genresStr || null,
                type: 'TV',
                studios: null,
                annee: new Date().getFullYear(),
                statut: 'En cours',
                mal_id: null,
                source_import: 'crunchyroll'
            };
        } catch (error) {
            console.error('❌ Erreur extraction fallback:', error);
            return null;
        }
    };
    
    // Extraire les données complètes
    const extractFullAnimeData = async () => {
        console.log('🎯 Extraction directe depuis le DOM de la page actuelle (Crunchyroll SPA)...');
        // Crunchyroll est une SPA : le HTML retourné par les requêtes HTTP est vide
        // La seule source fiable est le DOM actuel (déjà rendu par React)
        return extractFullAnimeDataFallback();
    };
    
    // Importer l'anime
    const importAnime = async (animeData) => {
        console.log('📥 Import de l\'anime:', animeData.titre);
        
        try {
            const response = await fetch(`http://localhost:${PORT}/api/import-anime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(animeData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Anime importé:', result);
            return result;
        } catch (error) {
            console.error('❌ Erreur import anime:', error);
            throw error;
        }
    };
    
    // Marquer l'épisode comme vu
    const markEpisodeWatched = async (episodeInfo) => {
        try {
            const response = await fetch(`http://localhost:${PORT}/api/mark-episode-watched`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titre: episodeInfo.title,
                    saison_numero: episodeInfo.season,
                    episode_numero: episodeInfo.episode,
                    platform: 'crunchyroll'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Erreur:', error);
            throw error;
        }
    };
    
    // Créer le bouton pour marquer l'épisode (page épisode)
    const createEpisodeButton = () => {
        const episodeInfo = extractEpisodeInfo();
        if (!episodeInfo) return;
        
        const key = `${episodeInfo.title}-${episodeInfo.season}-${episodeInfo.episode}`;
        
        const existingButton = document.getElementById('crunchyroll-episode-tracker');
        if (episodeSaved && episodeSaved !== key && existingButton) {
            console.log('🔄 Changement d\'épisode détecté');
            existingButton.remove();
            episodeSaved = null;
        }
        
        if (episodeSaved === key && existingButton) return;
        episodeSaved = key;
        
        if (existingButton) return;
        
        const button = document.createElement('button');
        button.id = 'crunchyroll-episode-tracker';
        button.innerHTML = '✅';
        button.title = `Marquer l'épisode ${episodeInfo.episode} comme vu`;
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 22px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        };
        
        button.onclick = async () => {
            button.disabled = true;
            button.innerHTML = '⏳';
            
            try {
                const result = await markEpisodeWatched(episodeInfo);
                button.innerHTML = '✅';
                console.log('✅ Épisode marqué:', result);
                
                setTimeout(() => {
                if (result.isComplete) {
                        button.innerHTML = '🎉';
                        button.title = 'Série terminée !';
                } else {
                        button.innerHTML = '✅';
                        button.disabled = false;
                }
                }, 2000);
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                if (error.message && error.message.includes('non trouvé')) {
                    button.innerHTML = '📥';
                    button.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    button.title = 'Anime non trouvé ! Allez sur la page série pour l\'importer';
                    const seriesUrl = getAnimeSeriesUrl();
                    console.warn('⚠️ Anime non trouvé. Importez-le depuis la page série : ' + (seriesUrl || 'URL série non trouvée'));
                    
                    setTimeout(() => {
                        button.innerHTML = '✅';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        button.title = `Marquer l'épisode ${episodeInfo.episode} comme vu`;
                            button.disabled = false;
                        }, 5000);
                } else {
                    button.innerHTML = '❌';
                    button.title = error.message;
                    setTimeout(() => {
                        button.innerHTML = '✅';
                        button.title = `Marquer l'épisode ${episodeInfo.episode} comme vu`;
                        button.disabled = false;
                    }, 3000);
                }
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Bouton marquage épisode ajouté');
    };
    
    // Créer le bouton pour importer l'anime (page série)
    const createSeriesButton = () => {
        const existingButton = document.getElementById('crunchyroll-series-import');
        if (existingButton) return;
        
        const button = document.createElement('button');
        button.id = 'crunchyroll-series-import';
        button.innerHTML = '📥';
        button.title = 'Importer cet anime dans Ma Mangathèque';
        button.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            z-index: 999999;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.6)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
        };
        
        button.onclick = async () => {
            button.disabled = true;
            button.innerHTML = '⏳';
            button.title = 'Import en cours...';
            
            try {
                console.log('📥 Import depuis la page série...');
                const animeData = await extractFullAnimeDataFallback();
                
                if (!animeData || !animeData.titre || animeData.titre === 'Unknown') {
                    throw new Error('Impossible d\'extraire les données de l\'anime');
                }
                
                console.log('📦 Données extraites:', animeData);
                const result = await importAnime(animeData);
                
                button.innerHTML = '✅';
                button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                button.title = 'Anime importé avec succès !';
                console.log('✅ Anime importé:', result);
                
                setTimeout(() => {
                    button.innerHTML = '🎉';
                    button.title = 'Import réussi ! Vous pouvez maintenant marquer les épisodes.';
                }, 2000);
            } catch (error) {
                console.error('❌ Erreur import:', error);
                button.innerHTML = '❌';
                button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                button.title = `Erreur: ${error.message}`;
                
                setTimeout(() => {
                    button.innerHTML = '📥';
                    button.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    button.title = 'Importer cet anime dans Ma Mangathèque';
                    button.disabled = false;
                }, 5000);
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Bouton import série ajouté');
    };
    
    let lastDetectedSeason = null; // Pour détecter les changements de saison
    
    // Détecter la saison actuellement affichée sur la page
    const detectCurrentSeason = () => {
        try {
            // 1. Priorité : Chercher dans l'URL (ex: ?season=2)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('season')) {
                const seasonNum = parseInt(urlParams.get('season'));
                if (seasonNum > 0) {
                    console.log(`✅ Saison détectée dans l'URL: ${seasonNum}`);
                    return seasonNum;
                }
            }
            
            // 2. Chercher dans le JSON-LD
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.innerText);
                    // Sur page série
                    if (data['@type'] === 'TVSeries' && data.seasonNumber) {
                        console.log(`✅ Saison détectée dans JSON-LD (TVSeries): ${data.seasonNumber}`);
                        return parseInt(data.seasonNumber);
                    }
                    // Sur page épisode
                    if (data['@type'] === 'TVEpisode' && data.partOfSeason?.seasonNumber) {
                        console.log(`✅ Saison détectée dans JSON-LD (TVEpisode): ${data.partOfSeason.seasonNumber}`);
                        return parseInt(data.partOfSeason.seasonNumber);
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // 3. SEULEMENT chercher dans les boutons/onglets ACTIFS (aria-selected="true")
            const activeButton = document.querySelector('button[aria-selected="true"], [class*="active"][class*="season"], .active');
            if (activeButton && activeButton.textContent) {
                const match = activeButton.textContent.match(/(?:Season|Saison|S)\s*(\d+)/i);
                if (match) {
                    const seasonNum = parseInt(match[1]);
                    console.log(`✅ Saison détectée dans bouton actif: ${seasonNum}`);
                    return seasonNum;
                }
            }
            
            // 4. Chercher dans le h1 PRINCIPAL de la page (premier h1 uniquement)
            const mainTitle = document.querySelector('h1');
            if (mainTitle && mainTitle.textContent) {
                const match = mainTitle.textContent.match(/(?:Season|Saison)\s*(\d+)/i);
                if (match) {
                    const seasonNum = parseInt(match[1]);
                    console.log(`✅ Saison détectée dans h1 principal: ${seasonNum}`);
                    return seasonNum;
                }
            }
            
            console.log('⚠️ Saison non détectée, défaut: 1');
            return 1; // Défaut : Saison 1
        } catch (error) {
            console.error('❌ Erreur detectCurrentSeason:', error);
            return 1;
        }
    };
    
    // Nettoyer les anciens boutons
    const removeAllButtons = () => {
        const episodeBtn = document.getElementById('crunchyroll-episode-tracker');
        const seriesBtn = document.getElementById('crunchyroll-series-import');
        if (episodeBtn) episodeBtn.remove();
        if (seriesBtn) seriesBtn.remove();
        episodeSaved = null;
        console.log('🧹 Anciens boutons supprimés');
    };
    
    // Créer le bon bouton selon le type de page
    const createAppropriateButton = (forcePageType = null) => {
        const detectedPageType = forcePageType || getPageType();
        
        if (detectedPageType === 'episode') {
        const titleElement = document.querySelector('.show-title-link');
        if (titleElement) {
                createEpisodeButton();
            }
        } else if (detectedPageType === 'series') {
            const seriesContent = document.querySelector('[class*="series"], [class*="show"]');
            if (seriesContent) {
                createSeriesButton();
            }
        }
    };
    
    // Observer les changements d'URL ET de saison (pour les SPAs)
    const checkUrlChange = () => {
        const newUrl = window.location.href;
        const urlChanged = newUrl !== lastUrl;
        
        // Vérifier aussi les changements de saison sur les pages série
        const currentSeason = getPageType() === 'series' ? detectCurrentSeason() : null;
        const seasonChanged = currentSeason && lastDetectedSeason && currentSeason !== lastDetectedSeason;
        
        if (urlChanged) {
            console.log('🔄 Changement d\'URL détecté:', newUrl);
            lastUrl = newUrl;
            
            // Détecter le nouveau type de page
            const newPageType = getPageType();
            if (newPageType !== currentPageType) {
                console.log('📄 Changement de type de page:', currentPageType, '→', newPageType);
                currentPageType = newPageType;
                
                // Supprimer les anciens boutons
                removeAllButtons();
                
                // Créer les nouveaux boutons après un délai
                setTimeout(() => {
                    createAppropriateButton(newPageType);
                    if (newPageType === 'series') {
                        lastDetectedSeason = detectCurrentSeason();
                    }
                }, 1000);
            }
        } else if (seasonChanged) {
            // L'URL n'a pas changé mais la saison a changé (navigation dans la page)
            console.log(`🔄 Changement de saison détecté: Saison ${lastDetectedSeason} → Saison ${currentSeason}`);
            lastDetectedSeason = currentSeason;
            
            // Supprimer et recréer le bouton pour refléter la nouvelle saison
            removeAllButtons();
            setTimeout(() => {
                createAppropriateButton('series');
            }, 500);
        } else if (currentSeason && !lastDetectedSeason) {
            // Première détection de saison
            lastDetectedSeason = currentSeason;
        }
    };
    
    // Vérifier les changements d'URL toutes les 500ms
    setInterval(checkUrlChange, 500);
    
    // Observer les changements du DOM
    const observer = new MutationObserver(() => {
        createAppropriateButton(currentPageType);
    });
    
    if (pageType) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    
    // Tentative initiale
    setTimeout(() => {
            createAppropriateButton(pageType);
    }, 2000);
    } else {
        console.log('⚠️ Page non supportée (ni épisode ni série)');
    }
})();
