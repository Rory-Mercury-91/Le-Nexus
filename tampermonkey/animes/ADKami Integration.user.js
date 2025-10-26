// ==UserScript==
// @name         ADKami → Le Nexus (Intégration complète)
// @namespace    http://tampermonkey.net/
// @version      2.2.1
// @description  Import d'animes et marquage d'épisodes depuis ADKami
// @author       You
// @match        https://www.adkami.com/anime/*
// @match        https://adkami.com/anime/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      adkami.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 51234;
    const currentUrl = window.location.pathname;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎬 ADKAMI INTEGRATION v2.2.1 - Titre unifié corrigé');
    console.log('📍 URL:', window.location.href);
    console.log('═══════════════════════════════════════════════════');
    
    // Fonction partagée: Extraire les données de base (MAL ID, titres)
    const extractBaseAnimeData = () => {
        let titre = null;
        let titre_natif = null;
        let mal_id = null;
        
        // Extraire les titres
        const ficheInfoBlock = document.querySelector('.fiche-info');
        if (ficheInfoBlock) {
            const h4Elements = ficheInfoBlock.querySelectorAll('h4');
            if (h4Elements.length > 0) {
                titre = h4Elements[0]?.textContent?.trim();
            }
            if (h4Elements.length > 1) {
                titre_natif = h4Elements[1]?.textContent?.trim();
            }
        }
        
        // Fallback pour titre
        if (!titre) {
            titre = document.querySelector('h1')?.textContent?.trim();
            if (titre) {
                titre = titre.replace(/\s*-\s*Episode\s+\d+.*$/i, '').trim();
            }
        }
        
        // Extraire MAL ID depuis JSON-LD
        console.log('🔍 Recherche du MAL ID dans la page actuelle...');
        const allJsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        console.log(`📜 ${allJsonLdScripts.length} script(s) JSON-LD trouvé(s)`);
        
        allJsonLdScripts.forEach((script, index) => {
            try {
                console.log(`📄 Script ${index + 1}:`, script.id || 'sans ID');
                const jsonData = JSON.parse(script.textContent);
                console.log('📦 Contenu:', jsonData);
                
                // Chercher le MAL ID dans diverses structures possibles
                if (jsonData.url && typeof jsonData.url === 'string') {
                    const malMatch = jsonData.url.match(/myanimelist\.net\/anime\/(\d+)/);
                    if (malMatch) {
                        mal_id = parseInt(malMatch[1]);
                        console.log('✅ MAL ID trouvé dans URL:', mal_id);
                    }
                }
                
                // Alternative: chercher dans sameAs
                if (jsonData.sameAs && Array.isArray(jsonData.sameAs)) {
                    jsonData.sameAs.forEach(url => {
                        const malMatch = url.match(/myanimelist\.net\/anime\/(\d+)/);
                        if (malMatch) {
                            mal_id = parseInt(malMatch[1]);
                            console.log('✅ MAL ID trouvé dans sameAs:', mal_id);
                        }
                    });
                }
            } catch (e) {
                console.warn('⚠️ Erreur parsing script JSON-LD:', e);
            }
        });
        
        console.log('✅ MAL ID final:', mal_id);
        
        return { titre, titre_natif, mal_id };
    };
    
    // ============================================
    // MODE 1: PAGE INFO - IMPORT D'ANIME
    // ============================================
    const isInfoPage = () => {
        // Page d'info: /anime/5805/info OU page principale /anime/5805
        // PAS une page d'épisode: /anime/5805/2/1/2/1/
        return (currentUrl.match(/\/anime\/\d+$/) || currentUrl.includes('/info')) && 
               !currentUrl.match(/\/anime\/\d+\/\d+\/\d+\//);
    };
    
    const extractFullAnimeData = async () => {
        console.log('🎬 Extraction complète depuis ADKami...');
        
        const { titre, titre_natif, mal_id } = extractBaseAnimeData();
        
        if (!titre) {
            throw new Error('Titre non trouvé');
        }
        
        console.log('✅ Titre:', titre);
        console.log('🏷️ Titre natif:', titre_natif);
        console.log('🔑 MAL ID:', mal_id);
        
        // Extraire description
        let description = null;
        const ficheInfoBlock = document.querySelector('.fiche-info');
        if (ficheInfoBlock) {
            const descElement = ficheInfoBlock.querySelector('p.description');
            if (descElement) {
                description = descElement.textContent.trim();
            }
        }
        
        // Extraire les métadonnées
        let annee = null, saison = null, auteur = null, studios = null;
        if (ficheInfoBlock) {
            const pElements = ficheInfoBlock.querySelectorAll('.row p');
            pElements.forEach(p => {
                const text = p.textContent;
                if (text.includes('Date de sortie:')) {
                    const dateMatch = text.match(/\d{4}/);
                    if (dateMatch) annee = parseInt(dateMatch[0]);
                }
                if (text.includes('Saison:')) {
                    const saisonLink = p.querySelector('a b');
                    if (saisonLink) saison = saisonLink.textContent.trim();
                }
                if (text.includes('Auteur:')) {
                    auteur = text.replace('Auteur:', '').trim();
                }
                if (text.includes('Studio:')) {
                    studios = text.replace('Studio:', '').trim();
                }
            });
        }
        
        // Extraire genres
        let genres = null;
        if (ficheInfoBlock) {
            const genreElements = ficheInfoBlock.querySelectorAll('ul.list li span[itemprop="genre"]');
            if (genreElements.length > 0) {
                genres = Array.from(genreElements).map(el => el.textContent.trim()).join(', ');
            }
        }
        
        // Extraire type et statut
        let type = 'TV', statut = 'En cours';
        const iconContainer = document.querySelector('.anime-information-icon');
        if (iconContainer) {
            const iconElements = iconContainer.querySelectorAll('span');
            iconElements.forEach(icon => {
                const title = icon.getAttribute('title');
                if (title) {
                    if (title.includes('Film') || title.includes('Movie')) type = 'Film';
                    else if (title.includes('OAV') || title.includes('OVA')) type = 'OAV';
                    else if (title.includes('ONA')) type = 'ONA';
                    else if (title.includes('Special')) type = 'Special';
                    
                    if (title.includes('En cours') || title.includes('Airing')) statut = 'En cours';
                    else if (title.includes('Terminé') || title.includes('Finished')) statut = 'Terminé';
                }
            });
        }
        
        // Extraire cover
        let couverture_url = null;
        if (ficheInfoBlock) {
            const coverImg = ficheInfoBlock.querySelector('img');
            if (coverImg) {
                couverture_url = coverImg.src || coverImg.dataset.src;
            }
        }
        if (!couverture_url) {
            const mainImg = document.querySelector('img[alt*="titre"], img[itemprop="image"]');
            if (mainImg) couverture_url = mainImg.src || mainImg.dataset.src;
        }
        
        // Compter saisons et épisodes
        const saisons = [];
        const saisonContainers = document.querySelectorAll('#nav-episode .saison-container');
        
        saisonContainers.forEach((container, index) => {
            const episodes = container.querySelectorAll('.episodes-list-item');
            const nbEpisodes = episodes.length;
            
            saisons.push({
                numero_saison: index + 1,
                nb_episodes: nbEpisodes,
                titre: `Saison ${index + 1}`
            });
        });
        
        return {
            titre,
            titre_natif,
            mal_id,
            description,
            annee,
            saison,
            auteur,
            studios,
            genres,
            type,
            statut,
            couverture_url,
            saisons,
            source_import: 'adkami'
        };
    };
    
    const createImportButton = () => {
        const button = document.createElement('button');
        button.id = 'adkami-import-button';
        button.innerHTML = '📥';
        button.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            z-index: 999999;
            padding: 12px 24px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            transition: all 0.3s ease;
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
        };
        
        button.onclick = async () => {
            try {
                button.disabled = true;
                button.innerHTML = '⏳ Extraction...';
                
                const data = await extractFullAnimeData();
                
                if (!data || !data.titre) {
                    button.innerHTML = '❌ Erreur: Données incomplètes';
                    button.disabled = false;
                    return;
                }
                
                button.innerHTML = '⏳ Envoi...';
                const result = await importAnime(data);
                
                button.innerHTML = '✅ Importé avec succès !';
                button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                console.log('✅ Import réussi:', result);
                
                setTimeout(() => {
                    button.innerHTML = '📥 Importer dans Le Nexus';
                    button.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                    button.disabled = false;
                }, 3000);
                
            } catch (error) {
                button.innerHTML = '❌ Erreur: ' + error.message;
                button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                console.error('❌ Erreur:', error);
                
                setTimeout(() => {
                    button.innerHTML = '📥 Importer dans Le Nexus';
                    button.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                    button.disabled = false;
                }, 5000);
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Bouton d\'import ajouté');
    };
    
    // ============================================
    // MODE 2: PAGE ÉPISODE - MARQUAGE
    // ============================================
    const isEpisodePage = () => {
        return currentUrl.match(/\/anime\/\d+\/\d+\/\d+\//);
    };
    
    const extractEpisodeInfo = async () => {
        const urlMatch = currentUrl.match(/\/anime\/(\d+)\/(\d+)\/(\d+)\//);
        if (!urlMatch) return null;
        
        const animeId = urlMatch[1];
        const episode = parseInt(urlMatch[2]);
        const saison = parseInt(urlMatch[3]);
        
        // Extraire le titre depuis le bloc .fiche-info (même source que l'import)
        console.log('🔍 Extraction du titre depuis .fiche-info...');
        
        let titre = null;
        const ficheInfo = document.querySelector('.fiche-info');
        
        if (ficheInfo) {
            const h4 = ficheInfo.querySelector('h4');
            if (h4) {
                const fullTitle = h4.textContent.trim();
                const parts = fullTitle.split('/');
                // Utiliser le titre anglais/français (première partie)
                titre = parts[0].trim();
            }
        }
        
        // Fallback: utiliser le h1 si .fiche-info n'est pas disponible
        if (!titre) {
            const titleElement = 
                document.querySelector('h1.title-header-video') ||
                document.querySelector('h1');
            
            titre = titleElement?.textContent?.trim() || '';
            titre = titre.replace(/\s*-\s*Episode\s+\d+.*$/i, '').trim();
        }
        
        console.log('✅ Titre extrait:', titre);
        console.log('⚠️ MAL ID non disponible sur les pages épisode ADKami');
        
        return Promise.resolve({
            titre,
            saison_numero: saison,
            episode_numero: episode,
            mal_id: null // ADKami n'expose pas le MAL ID dans le HTML
        });
    };
    
    // Extraire les données complètes depuis le bloc .fiche-info de la page épisode
    const extractFullAnimeDataFromEpisodePage = () => {
        console.log('🔍 Extraction des données depuis le bloc .fiche-info...');
        
        const ficheInfo = document.querySelector('.fiche-info');
        if (!ficheInfo) {
            console.warn('⚠️ Bloc .fiche-info non trouvé');
            return null;
        }
        
        // Titre (dans h4)
        const h4 = ficheInfo.querySelector('h4');
        let titre = null;
        let titre_natif = null;
        
        if (h4) {
            const fullTitle = h4.textContent.trim();
            const parts = fullTitle.split('/');
            if (parts.length >= 2) {
                titre = parts[0].trim(); // "Hero Without a Class: Who Even Needs Skills?!"
                titre_natif = parts[1].trim(); // "無職の英雄 別にスキルなんか要らなかったんだが"
            } else {
                titre = fullTitle;
            }
        }
        
        // Description
        const descElement = ficheInfo.querySelector('.description');
        const description = descElement ? descElement.textContent.trim() : null;
        
        // Genres
        const genreElements = ficheInfo.querySelectorAll('span[itemprop="genre"]');
        const genres = Array.from(genreElements).map(el => el.textContent.trim()).join(', ');
        
        // Auteur
        let auteur = null;
        const rows = ficheInfo.querySelectorAll('.row p');
        rows.forEach(p => {
            const text = p.textContent;
            if (text.includes('Auteur:')) {
                auteur = text.replace('Auteur:', '').trim();
            }
        });
        
        // Studio
        let studios = null;
        rows.forEach(p => {
            const text = p.textContent;
            if (text.includes('Studio:')) {
                studios = text.replace('Studio:', '').trim();
            }
        });
        
        // Cover (depuis l'image de la page)
        const coverImg = document.querySelector('.blocshadow img.col-12.m-hidden, .blocshadow img[alt]');
        const couverture_url = coverImg ? coverImg.src : null;
        
        // Saisons et épisodes (depuis le menu de navigation)
        const saisons = [];
        const saisonContainers = document.querySelectorAll('#nav-episode .saison-container');
        
        saisonContainers.forEach((container) => {
            const episodes = container.querySelectorAll('li a[href*="/anime/"]');
            const nbEpisodes = episodes.length;
            
            if (nbEpisodes > 0) {
                // Extraire le numéro de saison depuis <li class="saison">saison X</li>
                let saisonNumero = saisons.length + 1; // Par défaut, incrémenter
                const saisonLabel = container.querySelector('li.saison');
                
                if (saisonLabel) {
                    const match = saisonLabel.textContent.match(/saison\s+(\d+)/i);
                    if (match) {
                        saisonNumero = parseInt(match[1]);
                    }
                }
                
                saisons.push({
                    numero_saison: saisonNumero,
                    nb_episodes: nbEpisodes,
                    titre: `Saison ${saisonNumero}`
                });
            }
        });
        
        console.log('✅ Données extraites:', { titre, titre_natif, description, genres, auteur, studios, saisons });
        
        return {
            titre,
            titre_natif,
            mal_id: null,
            description,
            genres,
            studios,
            couverture_url,
            type: 'TV',
            statut: 'En cours',
            saisons
        };
    };
    
    const importAnime = async (animeData) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `http://localhost:${PORT}/api/import-anime`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(animeData),
                onload: (response) => {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: () => reject(new Error('Erreur réseau'))
            });
        });
    };
    
    const markEpisodeWatched = async (episodeInfo) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `http://localhost:${PORT}/api/mark-episode-watched`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(episodeInfo),
                onload: (response) => {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        const errorData = JSON.parse(response.responseText);
                        reject(new Error(errorData.error || `HTTP ${response.status}`));
                    }
                },
                onerror: () => reject(new Error('Erreur réseau'))
            });
        });
    };
    
    let episodeSaved = null;
    
    const createEpisodeButton = async () => {
        const episodeInfo = await extractEpisodeInfo();
        if (!episodeInfo || !episodeInfo.titre) return;
        
        // Vérifier si déjà traité
        const key = `${episodeInfo.titre}-${episodeInfo.saison_numero}-${episodeInfo.episode_numero}`;
        if (episodeSaved === key) {
            console.log('ℹ️ Épisode déjà traité');
            return;
        }
        episodeSaved = key;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('adkami-episode-button')) return;
        
        const button = document.createElement('button');
        button.id = 'adkami-episode-button';
        button.innerHTML = '✅';
        button.title = `Marquer "${episodeInfo.titre}" S${episodeInfo.saison_numero}E${episodeInfo.episode_numero} comme vu`;
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
            padding: 10px 16px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
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
            try {
                button.disabled = true;
                button.innerHTML = '⏳...';
                
                const result = await markEpisodeWatched(episodeInfo);
                
                button.innerHTML = '✅ Marqué !';
                button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                console.log('✅ Épisode marqué:', result);
                
                setTimeout(() => {
                    button.remove();
                    episodeSaved = null;
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                // Si l'anime n'existe pas, tenter de l'importer automatiquement
                if (error.message && error.message.includes('non trouvé')) {
                    console.log('🔄 Anime non trouvé, tentative d\'import automatique...');
                    
                    try {
                        button.innerHTML = '📥 Import...';
                        button.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
                        
                        // Extraire les données complètes depuis la page
                        const animeData = extractFullAnimeDataFromEpisodePage();
                        
                        if (!animeData || !animeData.titre) {
                            throw new Error('Impossible d\'extraire les données de l\'anime');
                        }
                        
                        // Importer l'anime
                        console.log('📤 Envoi des données:', animeData);
                        const importResult = await importAnime(animeData);
                        console.log('✅ Import réussi:', importResult);
                        
                        // Retenter de marquer l'épisode
                        button.innerHTML = '⏳ Marquage...';
                        const markResult = await markEpisodeWatched(episodeInfo);
                        
                        button.innerHTML = '✅ Marqué !';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        console.log('✅ Épisode marqué:', markResult);
                        
                        setTimeout(() => {
                            button.remove();
                            episodeSaved = null;
                        }, 2000);
                        
                    } catch (importError) {
                        button.innerHTML = '❌ Import échoué';
                        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                        console.error('❌ Erreur import:', importError);
                        
                        setTimeout(() => {
                            button.innerHTML = '✅';
                            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                            button.disabled = false;
                        }, 3000);
                    }
                } else {
                    button.innerHTML = '❌ Erreur';
                    button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    
                    setTimeout(() => {
                        button.innerHTML = '✅';
                        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                        button.disabled = false;
                    }, 3000);
                }
            }
        };
        
        document.body.appendChild(button);
        console.log('✅ Bouton de marquage ajouté');
    };
    
    // ============================================
    // INITIALISATION
    // ============================================
    const init = () => {
        if (isInfoPage()) {
            console.log('📄 Mode: Import d\'anime');
            setTimeout(createImportButton, 1000);
        } else if (isEpisodePage()) {
            console.log('🎬 Mode: Marquage d\'épisode');
            
            // Observer pour détecter les changements d'épisode
            const observer = new MutationObserver(() => {
                const titleElement = document.querySelector('h1.title-header-video');
                if (titleElement && !document.getElementById('adkami-episode-button')) {
                    createEpisodeButton();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(createEpisodeButton, 2000);
        } else {
            console.log('⚠️ Page non reconnue');
        }
    };
    
    // Lancer l'initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
