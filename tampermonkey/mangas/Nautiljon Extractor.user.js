// ==UserScript==
// @name         Nautiljon → Le Nexus
// @namespace    http://tampermonkey.net/
// @version      1.6.1
// @description  Importe automatiquement vos mangas/scans depuis Nautiljon vers Le Nexus avec support chapitres (Manhwa/Manhua) et déduplication intelligente (350-1500ms)
// @author       Rory-Mercury91
// @match        https://www.nautiljon.com/mangas/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 51234; // Port du serveur local Electron

    // Fonction pour convertir une date française en ISO (YYYY-MM-DD)
    const convertToISO = (dateStr) => {
        if (!dateStr) return null;
        
        // Si déjà au format ISO (YYYY-MM-DD), retourner tel quel
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
            return dateStr.trim();
        }
        
        // Convertir les dates françaises (ex: "16 juin 2021" ou "16/06/2021")
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
        
        // Format: "16/06/2021"
        const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match2) {
            const [, day, month, year] = match2;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return null;
    };

    // Extraire les données d'une page de tome avec retry sur 429
    const fetchTomeDetails = async (tomeUrl, volumeNum, retryCount = 0) => {
        try {
            console.log(`  📖 Récupération tome ${volumeNum}: ${tomeUrl}`);
            
            const response = await fetch(tomeUrl);
            
            // Si rate limit (429), attendre et réessayer
            if (response.status === 429 && retryCount < 3) {
                const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s max
                console.log(`  ⏳ Rate limit détecté, attente de ${waitTime}ms avant retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return fetchTomeDetails(tomeUrl, volumeNum, retryCount + 1);
            }
            
            const html = await response.text();
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
            
            return {
                numero: volumeNum,
                couverture_url: tomeImage,
                date_sortie: dateSortieVF,
                prix: prix
            };
            
        } catch (error) {
            console.warn(`  ⚠️ Erreur tome ${volumeNum}:`, error.message);
            return {
                numero: volumeNum,
                couverture_url: null,
                date_sortie: null,
                prix: null
            };
        }
    };

    // Extraction des données depuis la page manga de Nautiljon
    const extractMangaData = async () => {
        try {
            console.log('🔍 Extraction depuis Nautiljon...');
            
            // 1. TITRE * (obligatoire)
            let titre = 
                document.querySelector('h1.text_black')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('.titre')?.textContent?.trim() ||
                '';
            
            // Nettoyer le titre (retirer les liens/boutons comme "Modifier", "Supprimer", etc.)
            titre = titre
                .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '') // Début
                .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '') // Fin
                .trim();
            
            if (!titre) {
                throw new Error('Impossible de trouver le titre de la série');
            }
            
            console.log('✅ Titre:', titre);

            // 2. TITRE ALTERNATIF
            let titre_alternatif = null;
            const allText = document.body.innerText;
            const titreAltMatch = allText.match(/Titre alternatif\s*:\s*([^\n]+)/i);
            if (titreAltMatch) {
                titre_alternatif = titreAltMatch[1].trim();
                console.log('🏷️ Titre alternatif:', titre_alternatif);
            }

            // 3. TYPE (Shonen, Seinen, etc.)
            let type_demographie = null;
            const typeMatch = allText.match(/Type\s*:\s*([^\n]+)/i);
            if (typeMatch) {
                type_demographie = typeMatch[1].trim();
                console.log('📖 Type:', type_demographie);
            }

            // 4. GENRES
            let genres = null;
            const genresMatch = allText.match(/Genres?\s*:\s*([^\n]+)/i);
            if (genresMatch) {
                genres = genresMatch[1].trim();
                console.log('🎭 Genres:', genres);
            }

            // 5. THÈMES
            let themes = null;
            const themesMatch = allText.match(/Thèmes?\s*:\s*([^\n]+)/i);
            if (themesMatch) {
                themes = themesMatch[1].trim();
                console.log('🏷️ Thèmes:', themes);
            }

            // 6. AUTEUR
            let auteurs = null;
            const auteurMatch = allText.match(/Auteur(?:\soriginal)?\s*:\s*([^\n]+)/i);
            if (auteurMatch) {
                auteurs = auteurMatch[1].trim();
                console.log('✍️ Auteur:', auteurs);
            }

            // 7. ÉDITEUR VF
            let editeur = null;
            const editeurMatch = allText.match(/Éditeur VF\s*:\s*([^\n]+)/i);
            if (editeurMatch) {
                editeur = editeurMatch[1].trim();
                console.log('🏢 Éditeur VF:', editeur);
            }

            // 8. NOMBRE DE VOLUMES VF ou CHAPITRES VF
            let nb_chapitres = null;
            let type_contenu = 'volume'; // 'volume' ou 'chapitre'
            
            // Priorité 1: Chercher "Nb chapitres VF" (pour scans/webcomics)
            const nbChapMatch = allText.match(/Nb chapitres VF\s*:\s*(\d+)/i);
            if (nbChapMatch) {
                nb_chapitres = parseInt(nbChapMatch[1]);
                type_contenu = 'chapitre';
                console.log('📖 Nb chapitres VF:', nb_chapitres, '(scan/webcomic)');
            } else {
                // Priorité 2: Chercher "Nb volumes VF" (pour tomes physiques)
                const nbVolMatch = allText.match(/Nb volumes VF\s*:\s*(\d+)/i);
                if (nbVolMatch) {
                    nb_chapitres = parseInt(nbVolMatch[1]);
                    type_contenu = 'volume';
                    console.log('📚 Nb volumes VF:', nb_chapitres, '(tome physique)');
                }
            }

            // 9. ANNÉE VF
            let annee_publication = null;
            const anneeMatch = allText.match(/Année VF\s*:\s*(\d{4})/i);
            if (anneeMatch) {
                annee_publication = parseInt(anneeMatch[1]);
                console.log('📅 Année VF:', annee_publication);
            }

            // 10. PRIX (défaut de la série)
            let prix_defaut = null;
            const prixMatch = allText.match(/Prix\s*:\s*(\d+(?:[.,]\d+)?)\s*€/i);
            if (prixMatch) {
                prix_defaut = parseFloat(prixMatch[1].replace(',', '.'));
                console.log('💰 Prix:', prix_defaut + '€');
            }

            // 11. SYNOPSIS
            let description = null;
            
            // Stratégie 1: Chercher via sélecteurs DOM
            const synopsisElement = document.querySelector('#synopsis, .synopsis, [itemprop="description"]');
            if (synopsisElement) {
                description = synopsisElement.textContent?.trim();
            }
            
            // Stratégie 2: Extraire depuis le texte brut de la page (plus fiable pour Nautiljon)
            if (!description) {
                const synopsisMatch = allText.match(/Synopsis\s+((?:.|\n)+?)(?=\n\n|Voir plus|Description rédigée|Compléter|Volumes|Bande-annonce|Fiches liées)/i);
                if (synopsisMatch) {
                    description = synopsisMatch[1].trim();
                }
            }
            
            // Nettoyer le synopsis
            if (description) {
                description = description
                    .replace(/^Synopsis\s*/i, '')
                    .replace(/Voir plus.*$/i, '')
                    .replace(/Description rédigée par.*$/is, '')
                    .replace(/Compléter.*$/i, '')
                    .replace(/\s+/g, ' ') // Normaliser les espaces
                    .trim();
            }
            
            console.log('📝 Synopsis:', description ? `${description.substring(0, 80)}...` : 'Absent');

            // 12. COUVERTURE PRINCIPALE
            const couverture_url = 
                document.querySelector('.coverimg img')?.src ||
                document.querySelector('.cover img')?.src ||
                document.querySelector('img[itemprop="image"]')?.src ||
                null;
            
            console.log('🖼️ Couverture série:', couverture_url ? 'Trouvée' : 'Non trouvée');

            // 13. STATUT (récupéré depuis la version VF)
            let statut = 'En cours';
            // Priorité 1: Chercher dans "Nb chapitres VF" pour les scans
            let statutMatch = allText.match(/Nb chapitres VF\s*:\s*\d+\s*\((.*?)\)/i);
            if (!statutMatch) {
                // Priorité 2: Chercher dans "Nb volumes VF" pour les tomes
                statutMatch = allText.match(/Nb volumes VF\s*:\s*\d+\s*\((.*?)\)/i);
            }
            if (statutMatch) {
                const statutText = statutMatch[1].toLowerCase();
                if (statutText.includes('terminé') || statutText.includes('fini')) {
                    statut = 'Terminée';
                }
            }
            console.log('📊 Statut publication VF:', statut);

            // 14. DÉTECTION DES VOLUMES
            console.log('\n📚 Recherche des volumes...');
            const volumeLinks = document.querySelectorAll('a[href*="/volume-"]');
            const uniqueVolumes = [];
            const seenUrls = new Set();
            
            for (const link of volumeLinks) {
                const href = link.href;
                if (seenUrls.has(href)) continue;
                seenUrls.add(href);
                
                // Extraire le numéro de volume depuis le texte ou l'URL
                const linkText = link.textContent.trim();
                const volNumMatch = linkText.match(/(?:Vol\.?|Volume)\s*(\d+)/i) || 
                                   href.match(/volume-(\d+)/i);
                
                if (volNumMatch) {
                    const volNum = parseInt(volNumMatch[1]);
                    uniqueVolumes.push({
                        numero: volNum,
                        url: href
                    });
                }
            }
            
            // Trier par numéro
            uniqueVolumes.sort((a, b) => a.numero - b.numero);
            console.log(`📖 ${uniqueVolumes.length} volume(s) détecté(s)`);

            // 15. RÉCUPÉRATION DES DÉTAILS DE CHAQUE TOME
            const volumes = [];
            if (uniqueVolumes.length > 0) {
                console.log('🔄 Récupération des détails des tomes...');
                
                // Récupérer tous les détails
                const allTomeDetails = [];
                for (const vol of uniqueVolumes) {
                    const tomeDetails = await fetchTomeDetails(vol.url, vol.numero);
                    
                    // Si le prix n'est pas trouvé sur la page du tome, utiliser le prix par défaut
                    if (!tomeDetails.prix && prix_defaut) {
                        tomeDetails.prix = prix_defaut;
                    }
                    
                    allTomeDetails.push(tomeDetails);
                    
                    // Délai optimisé adaptatif (commence à 350ms, augmente si nécessaire)
                    const baseDelay = 350;
                    const progressiveDelay = allTomeDetails.length * 30; // +30ms par tome
                    const delay = Math.min(baseDelay + progressiveDelay, 1500); // Max 1.5s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                // Dédupliquer intelligemment : garder le meilleur tome pour chaque numéro
                const tomesByNumber = {};
                for (const tome of allTomeDetails) {
                    const num = tome.numero;
                    
                    if (!tomesByNumber[num]) {
                        tomesByNumber[num] = tome;
                    } else {
                        const existing = tomesByNumber[num];
                        
                        // Priorités de sélection :
                        // 1. Celui avec une date VF (édition française)
                        // 2. Celui avec une image
                        // 3. Le premier trouvé
                        
                        const shouldReplace = 
                            (!existing.date_sortie && tome.date_sortie) || // Le nouveau a une date VF
                            (!existing.couverture_url && tome.couverture_url) || // Le nouveau a une image
                            (tome.date_sortie && !existing.date_sortie); // Le nouveau a une date et pas l'ancien
                        
                        if (shouldReplace) {
                            tomesByNumber[num] = tome;
                        }
                    }
                }
                
                // Convertir en tableau et trier par numéro
                volumes.push(...Object.values(tomesByNumber).sort((a, b) => a.numero - b.numero));
                
                console.log(`✅ ${volumes.length} tome(s) unique(s) récupéré(s) (${allTomeDetails.length - volumes.length} doublon(s) éliminé(s))`);
            }

            // Déterminer le type_volume automatiquement
            let type_volume = 'Broché'; // Défaut pour les mangas classiques
            
            if (type_contenu === 'chapitre') {
                // Pour les scans en ligne → toujours Numérique
                type_volume = 'Numérique';
            } else if (type_demographie === 'Manhwa' || type_demographie === 'Manhua') {
                // Pour les Manhwa/Manhua
                if (volumes.length > 0) {
                    type_volume = 'Webtoon Physique'; // Éditions physiques disponibles
                } else {
                    type_volume = 'Webtoon'; // En ligne uniquement
                }
            }
            // Sinon reste 'Broché' pour les mangas japonais classiques
            
            console.log(`📦 Type de volume détecté: ${type_volume} (démographie: ${type_demographie}, ${volumes.length} volume(s))`);

            // Construire l'objet de données
            const mangaData = {
                titre: titre.trim(),
                titre_alternatif: titre_alternatif,
                statut: statut,
                type_volume: type_volume,
                type_contenu: type_contenu, // 'volume' ou 'chapitre'
                couverture_url: couverture_url,
                description: description || null,
                statut_publication: statut,
                genres: genres,
                nb_chapitres: nb_chapitres,
                annee_publication: annee_publication,
                langue_originale: 'ja', // Par défaut japonais pour Nautiljon
                demographie: type_demographie,
                
                // Métadonnées
                _source: 'Nautiljon',
                _url: window.location.href,
                _themes: themes,
                _auteurs: auteurs,
                _editeur: editeur,
                _prix_defaut: prix_defaut,
                
                // Volumes avec détails (même pour les chapitres, pour compatibilité)
                volumes: volumes
            };
            
            console.log('📦 Données extraites:', mangaData);
            console.log(`📚 ${volumes.length} volume(s) avec images et prix`);
            return mangaData;
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'extraction:', error);
            throw error;
        }
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
            console.error('❌ Erreur connexion avec Le Nexus:', error);
            throw error;
        }
    };

    // Créer l'interface utilisateur
    const createUI = () => {
        // Conteneur pour les 2 boutons
        // Créer le conteneur du menu
        const container = document.createElement('div');
        container.id = 'nautiljon-menu';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
        `;

        // Créer le menu déroulant (initialement caché)
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

        // Empêcher la fermeture lors du clic sur le menu
        menu.onclick = (e) => e.stopPropagation();

        // Renommer les variables pour correspondre au reste du code
        const buttonFull = optionFull;
        const buttonTomes = optionTomes;
        
        // Click handler pour l'import complet
        buttonFull.onclick = async () => {
            // Fermer le menu
            menuOpen = false;
            menu.style.display = 'none';
            menuButton.style.transform = 'rotate(0deg)';
            
            // Animation de chargement
            buttonFull.innerHTML = '⏳ Import...';
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
                // Extraire les données (async)
                const data = await extractMangaData();
                
                // Vérifier que le titre existe (champ obligatoire)
                if (!data.titre) {
                    throw new Error('Impossible de trouver le titre de la série');
                }
                
                // Envoyer à Electron (import complet)
                const result = await sendToElectron(data, false);
                
                // Animation de succès
                buttonFull.innerHTML = '✅';
                buttonFull.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                // Notification de succès enrichie
                const tomesInfo = result.tomesCreated 
                    ? `<br><small>${result.tomesCreated} tome(s) créé(s)${result.volumesIgnored > 0 ? ` (${result.volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                    : '';
                showNotification(`✅ <strong>${data.titre}</strong> ajoutée !<br><small>Source: Nautiljon</small>${tomesInfo}`, 'success');
                
                // Reset après 2 secondes
                setTimeout(() => {
                    buttonFull.innerHTML = '📚 Import complet';
                    buttonFull.disabled = false;
                    buttonFull.style.cursor = 'pointer';
                    buttonFull.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                // Animation d'erreur
                buttonFull.innerHTML = '❌ Erreur';
                buttonFull.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                
                // Notification d'erreur
                const errorMsg = error.message.includes('Failed to fetch') 
                    ? '❌ Le Nexus n\'est pas démarré' 
                    : `❌ Erreur: ${error.message}`;
                showNotification(errorMsg, 'error');
                
                // Reset après 3 secondes
                setTimeout(() => {
                    buttonFull.innerHTML = '📚 Import complet';
                    buttonFull.disabled = false;
                    buttonFull.style.cursor = 'pointer';
                    buttonFull.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                }, 3000);
            }
        };
        
        // Click handler pour l'import tomes uniquement
        buttonTomes.onclick = async () => {
            // Fermer le menu
            menuOpen = false;
            menu.style.display = 'none';
            menuButton.style.transform = 'rotate(0deg)';
            
            // Animation de chargement
            buttonTomes.innerHTML = '⏳ Import...';
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
                // Extraire les données (async)
                const data = await extractMangaData();
                
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
                    showNotification(`✅ ${tomesCreated} tome(s) ajouté(s) à <strong>${data.titre}</strong>${ignoredInfo}<br><small>Source: Nautiljon</small>`, 'success');
                } else {
                    const infoMsg = volumesIgnored > 0 
                        ? `Tous les tomes sont déjà présents (${volumesIgnored} ignoré(s) sans date VF)` 
                        : message || 'Tous les tomes sont déjà présents';
                    showNotification(`ℹ️ ${infoMsg}<br><small>${data.titre}</small>`, 'info');
                }
                
                // Reset après 2 secondes
                setTimeout(() => {
                    buttonTomes.innerHTML = '📖 Import tomes';
                    buttonTomes.disabled = false;
                    buttonTomes.style.cursor = 'pointer';
                    buttonTomes.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                // Animation d'erreur
                buttonTomes.innerHTML = '❌ Erreur';
                buttonTomes.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                
                // Notification d'erreur
                const errorMsg = error.message.includes('Failed to fetch') 
                    ? '❌ LE Nexus n\'est pas démarré' 
                    : `❌ Erreur: ${error.message}`;
                showNotification(errorMsg, 'error');
                
                // Reset après 3 secondes
                setTimeout(() => {
                    buttonTomes.innerHTML = '📖 Import tomes';
                    buttonTomes.disabled = false;
                    buttonTomes.style.cursor = 'pointer';
                    buttonTomes.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                }, 3000);
            }
        };
        
        // Ajouter les options au menu
        menu.appendChild(optionFull);
        menu.appendChild(optionTomes);
        
        // Ajouter le menu et le bouton au conteneur
        container.appendChild(menu);
        container.appendChild(menuButton);
        document.body.appendChild(container);
    };

    // Afficher une notification
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 175px;
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
        console.log('🚀 Initialisation du script Nautiljon → Le Nexus');
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
