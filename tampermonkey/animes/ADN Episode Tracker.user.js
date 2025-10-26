// ==UserScript==
// @name         ADN → Ma Mangathèque
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Importe automatiquement vos animes depuis ADN vers Ma Mangathèque et marque vos épisodes comme vus avec auto-incrémentation
// @author       Rory-Mercury91
// @match        https://*.animationdigitalnetwork.com/video/*
// @match        https://animedigitalnetwork.fr/video/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 51234;
    let episodeSaved = null;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎬 ADN → MA MANGATHÈQUE v1.0.0');
    console.log('✨ Import automatique et marquage d\'épisodes');
    console.log('📍 URL:', window.location.href);
    console.log('═══════════════════════════════════════════════════');
    
    // Extraire l'URL de la page principale de l'anime depuis l'URL d'épisode
    const getAnimeMainPageUrl = () => {
        const currentUrl = window.location.href;
        // URL épisode: https://animationdigitalnetwork.com/video/1331-hero-without-a-class-who-even-needs-skills/29932-episode-1
        // URL principale: https://animationdigitalnetwork.com/video/1331-hero-without-a-class-who-even-needs-skills
        
        const match = currentUrl.match(/^(https:\/\/[^\/]+\/video\/[^\/]+)/);
        if (match) {
            return match[1];
        }
        return null;
    };
    
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
    
    // Extraire les informations de l'épisode (depuis la page épisode)
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
            const title = merged.partOfSeries?.name;
            const episode = Number(merged.episodeNumber ?? 1);
            const season = merged.partOfSeason?.seasonNumber ?? 1;
            
            if (!title || !season) {
                throw new Error("Données non trouvées");
            }
            
            console.log('✅ Épisode détecté:', { title, season, episode });
            return { title, season, episode };
        } catch (error) {
            console.error('❌ Erreur extraction épisode:', error);
            return null;
        }
    };
    
    // Récupérer les données complètes depuis la page principale de l'anime
    const fetchAnimeDataFromMainPage = (mainPageUrl) => {
        return new Promise((resolve, reject) => {
            console.log('🔄 Récupération des données depuis:', mainPageUrl);
            
            GM_xmlhttpRequest({
                method: 'GET',
                url: mainPageUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                onload: function(response) {
                    try {
                        if (response.status !== 200) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        // Parser le HTML de la page principale
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        
                        // Extraire les métadonnées JSON-LD de la page principale
                        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                        const parsed = Array.from(scripts).map(script => {
                            try {
                                return JSON.parse(script.innerText);
                            } catch (error) {
                                return null;
                            }
                        }).filter(item => item !== null);
                        
                        if (parsed.length === 0) {
                            throw new Error('Aucune métadonnée JSON-LD trouvée sur la page principale');
                        }
                        
                        const merged = mergeObjects(parsed);
                        console.log('📊 Métadonnées de la page principale:', merged);
                        
                        // Extraire les vraies données de l'anime
                        const title = merged.name || merged.partOfSeries?.name;
                        const nativeTitle = merged.alternateName || null;
                        const description = merged.description || '';
                        
                        // Vraie image de couverture de l'anime (pas de l'épisode)
                        let imageUrl = '';
                        if (merged.image) {
                            if (Array.isArray(merged.image)) {
                                imageUrl = merged.image[0] || '';
                            } else {
                                imageUrl = merged.image;
                            }
                        } else if (merged.thumbnailUrl) {
                            if (Array.isArray(merged.thumbnailUrl)) {
                                imageUrl = merged.thumbnailUrl[0] || '';
                            } else {
                                imageUrl = merged.thumbnailUrl;
                            }
                        }
                        
                        // Informations détaillées
                        const genres = merged.genre || [];
                        const genresStr = Array.isArray(genres) ? genres.join(', ') : (genres ? String(genres) : '');
                        
                        // Vraies informations de saison/épisodes
                        let totalEpisodes = null;
                        let seasons = [];
                        
                        if (merged.numberOfEpisodes) {
                            totalEpisodes = Number(merged.numberOfEpisodes);
                        }
                        
                        // Si c'est une série avec saisons
                        if (merged.containsSeason && Array.isArray(merged.containsSeason)) {
                            seasons = merged.containsSeason.map(season => ({
                                numero_saison: season.seasonNumber || 1,
                                titre: season.name || `Saison ${season.seasonNumber}`,
                                nb_episodes: season.numberOfEpisodes || totalEpisodes || 12,
                                annee: season.startDate ? new Date(season.startDate).getFullYear() : new Date().getFullYear()
                            }));
                        } else {
                            // Série sans saisons multiples
                            seasons = [{
                                numero_saison: 1,
                                titre: 'Saison 1',
                                nb_episodes: totalEpisodes || 12,
                                annee: merged.startDate ? new Date(merged.startDate).getFullYear() : new Date().getFullYear()
                            }];
                        }
                        
                        // MAL ID
                        let malId = null;
                        if (merged.identifier) {
                            if (typeof merged.identifier === 'string') {
                                const match = merged.identifier.match(/\/(\d+)/);
                                if (match) malId = parseInt(match[1]);
                            } else if (merged.identifier.value) {
                                malId = parseInt(merged.identifier.value);
                            }
                        }
                        
                        // Studios
                        let studios = null;
                        if (merged.productionCompany) {
                            if (Array.isArray(merged.productionCompany)) {
                                studios = merged.productionCompany.map(s => s.name || s).join(', ');
                            } else {
                                studios = merged.productionCompany.name || merged.productionCompany;
                            }
                        }
                        
                        const animeData = {
                            titre: title,
                            titre_natif: nativeTitle,
                            couverture_url: imageUrl,
                            description: description,
                            saisons: seasons,
                            genres: genresStr || null,
                            type: 'TV',
                            studios: studios,
                            annee: seasons[0]?.annee || new Date().getFullYear(),
                            statut: 'En cours', // TODO: extraire le vrai statut si disponible
                            mal_id: malId,
                            source_import: 'adn'
                        };
                        
                        console.log('✅ Données optimisées extraites:', animeData);
                        resolve(animeData);
                        
                    } catch (error) {
                        console.error('❌ Erreur parsing page principale:', error);
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error('❌ Erreur requête:', error);
                    reject(new Error('Erreur de requête vers la page principale'));
                }
            });
        });
    };
    
    // Fallback: extraire depuis la page épisode (méthode originale)
    const extractFullAnimeDataFallback = () => {
        console.log('⚠️ Fallback: extraction depuis la page épisode');
        // ... code original de extractFullAnimeData ...
        // (à copier de l'ancien script si nécessaire)
        return null;
    };
    
    // Extraire les données complètes optimisées
    const extractFullAnimeData = async () => {
        try {
            const mainPageUrl = getAnimeMainPageUrl();
            if (!mainPageUrl) {
                console.log('⚠️ Impossible de déterminer l\'URL principale, fallback...');
                return extractFullAnimeDataFallback();
            }
            
            console.log('🎯 URL principale détectée:', mainPageUrl);
            return await fetchAnimeDataFromMainPage(mainPageUrl);
            
        } catch (error) {
            console.error('❌ Erreur extraction optimisée:', error);
            console.log('🔄 Tentative fallback...');
            return extractFullAnimeDataFallback();
        }
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
                    platform: 'adn'
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
    
    // Créer le bouton (même logique que l'original)
    const createButton = () => {
        const episodeInfo = extractEpisodeInfo();
        if (!episodeInfo) return;
        
        const key = `${episodeInfo.title}-${episodeInfo.season}-${episodeInfo.episode}`;
        
        const existingButton = document.getElementById('adn-episode-tracker');
        if (episodeSaved && episodeSaved !== key && existingButton) {
            console.log('🔄 Changement d\'épisode détecté');
            existingButton.remove();
            episodeSaved = null;
        }
        
        if (episodeSaved === key && existingButton) return;
        episodeSaved = key;
        
        if (existingButton) return;
        
        const button = document.createElement('button');
        button.id = 'adn-episode-tracker';
        button.innerHTML = '✅';
        button.title = `Marquer "${episodeInfo.title}" S${episodeInfo.season}E${episodeInfo.episode} comme vu`;
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
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
        };
        
        button.onclick = async () => {
            button.disabled = true;
            button.innerHTML = '⏳';
            
            try {
                const result = await markEpisodeWatched(episodeInfo);
                button.innerHTML = '✅';
                console.log('✅ Épisode marqué:', result);
                
                if (result.isComplete) {
                    setTimeout(() => {
                        button.innerHTML = '🎉 Terminé !';
                    }, 1000);
                } else {
                    setTimeout(() => {
                        button.innerHTML = '✅';
                        button.disabled = false;
                    }, 3000);
                }
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                if (error.message && error.message.includes('non trouvé')) {
                    console.log('🔄 Anime non trouvé, import automatique...');
                    button.innerHTML = '📥 Import...';
                    button.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    button.title = 'Import automatique depuis ADN...';
                    
                    try {
                        const animeData = await extractFullAnimeData();
                        if (!animeData) {
                            throw new Error('Impossible d\'extraire les données optimisées');
                        }
                        
                        console.log('📦 Données optimisées:', animeData);
                        await importAnime(animeData);
                        
                        button.innerHTML = '✅ Importé';
                        console.log('✅ Anime importé automatiquement');
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        button.innerHTML = '⏳';
                        const retryResult = await markEpisodeWatched(episodeInfo);
                        
                        button.innerHTML = '✅';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        console.log('✅ Épisode marqué après import automatique:', retryResult);
                        
                        setTimeout(() => {
                            if (retryResult.isComplete) {
                                button.innerHTML = '🎉 Terminé !';
                            } else {
                                button.innerHTML = '✅';
                                button.disabled = false;
                            }
                        }, 1000);
                    } catch (importError) {
                        button.innerHTML = '❌';
                        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                        button.title = `Erreur d'import: ${importError.message}`;
                        console.error('❌ Erreur import automatique:', importError);
                        
                        setTimeout(() => {
                            button.innerHTML = '✅';
                            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            button.title = `Marquer "${episodeInfo.title}" S${episodeInfo.season}E${episodeInfo.episode} comme vu`;
                            button.disabled = false;
                        }, 5000);
                    }
                } else {
                    button.innerHTML = '❌';
                    button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    button.title = `Erreur: ${error.message}`;
                    
                    setTimeout(() => {
                        button.innerHTML = '✅';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        button.title = `Marquer "${episodeInfo.title}" S${episodeInfo.season}E${episodeInfo.episode} comme vu`;
                        button.disabled = false;
                    }, 5000);
                }
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Bouton ADN ajouté');
    };
    
    // Observer les changements
    const observer = new MutationObserver(() => {
        const titleElement = document.querySelector('h1 > span');
        if (titleElement) {
            createButton();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    
    // Tentative initiale
    setTimeout(() => {
        createButton();
    }, 2000);
})();
