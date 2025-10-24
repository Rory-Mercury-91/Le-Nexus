// ==UserScript==
// @name         Booknode → Ma Mangathèque
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Import automatique depuis Booknode vers Ma Mangathèque
// @author       You
// @match        https://booknode.com/serie/*
// @match        https://www.booknode.com/serie/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    const PORT = 51234; // Port du serveur local Electron (identique aux autres scripts)
    
    // Convertir une date en format ISO (YYYY-MM-DD)
    const convertToISO = (dateStr) => {
        if (!dateStr) return null;
        
        // Si déjà en format ISO (YYYY-MM-DD), retourner tel quel
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
            return dateStr.trim();
        }
        
        // Sinon, convertir depuis le format français "16 juin 2021"
        const moisFR = {
            'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
            'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
            'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
        };
        
        const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
        if (!match) return null;
        
        const [, jour, mois, annee] = match;
        const moisNum = moisFR[mois.toLowerCase()];
        if (!moisNum) return null;
        
        return `${annee}-${moisNum}-${jour.padStart(2, '0')}`;
    };

    // Forcer le chargement de toutes les images (lazy loading)
    const scrollToLoadAllImages = () => {
        return new Promise((resolve) => {
            console.log('📜 Scroll progressif pour charger toutes les images...');
            
            let scrollStep = 0;
            const totalHeight = document.body.scrollHeight;
            const viewportHeight = window.innerHeight;
            const steps = Math.ceil(totalHeight / viewportHeight);
            
            console.log(`📏 Page de ${totalHeight}px → ${steps} étapes de scroll`);
            
            // Fonction de scroll progressif
            const scrollNext = () => {
                if (scrollStep <= steps) {
                    const scrollPosition = scrollStep * viewportHeight;
                    window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                    scrollStep++;
                    setTimeout(scrollNext, 500); // 500ms entre chaque étape
                } else {
                    // Scroll terminé, revenir en haut
                    setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        console.log('✅ Toutes les images devraient être chargées');
                        setTimeout(resolve, 500);
                    }, 500);
                }
            };
            
            scrollNext();
        });
    };

    // Extraction des données depuis la page série de Booknode
    const extractMangaData = async () => {
        try {
            console.log('🔍 Extraction depuis Booknode...');
            
            // 1. TITRE * (obligatoire)
            // Format attendu : "Le Huitième fils - La série"
            const titreElement = 
                document.querySelector('h1') ||
                document.querySelector('.serie-title') ||
                document.querySelector('[class*="title"]');
            
            let titre = titreElement?.textContent?.trim() || '';
            
            // Nettoyer le titre (enlever "- La série" ou "- Série" + boutons/liens)
            titre = titre
                .replace(/\s*-\s*(La\s+)?[Ss]érie\s*$/i, '') // "- La série" à la fin
                .replace(/^\s*(Modifier|Supprimer|Ajouter|Éditer)\s*/gi, '') // Boutons au début
                .replace(/\s*(Modifier|Supprimer|Ajouter|Éditer)\s*$/gi, '') // Boutons à la fin
                .trim();
            
            if (!titre) {
                throw new Error('Impossible de trouver le titre de la série');
            }
            
            console.log('✅ Titre:', titre);

            // 2. AUTEUR(S)
            // Chercher "Auteur : Hiroki Kusumoto"
            const pageText = document.body.textContent;
            let auteurs = '';
            
            const auteurElements = document.querySelectorAll('a[href*="/auteur/"], .author, .auteur');
            if (auteurElements.length > 0) {
                auteurs = Array.from(auteurElements)
                    .map(el => el.textContent?.trim())
                    .filter(a => a && a.length > 2 && a.length < 50)
                    .join(', ');
            }
            
            // Fallback : chercher dans le texte "Auteur : XXX"
            if (!auteurs) {
                const auteurMatch = pageText.match(/Auteur\s*:\s*([^\n]+)/i);
                if (auteurMatch) {
                    auteurs = auteurMatch[1].trim().split(/\s+et\s+|,\s*/).join(', ');
                }
            }
            
            console.log('✍️ Auteur(s):', auteurs);

            // 3. THÈMES (GENRES)
            // Sur Booknode, les thèmes sont dans la structure: <li>Thèmes :</li> suivi de <li><a href="/theme/...">
            let genres = '';
            
            console.log('🔍 Recherche des thèmes...');
            
            // Chercher tous les liens vers /theme/
            const themeLinks = document.querySelectorAll('a[href*="/theme/"]');
            console.log(`📌 ${themeLinks.length} lien(s) vers /theme/ trouvé(s)`);
            
            if (themeLinks.length > 0) {
                const detectedThemes = [];
                
                for (const link of themeLinks) {
                    const theme = link.textContent?.trim();
                    if (theme && theme.length > 1 && theme.length < 50) {
                        // Vérifier que le lien est dans un bloc "Thèmes :" (optionnel mais plus propre)
                        const parentUl = link.closest('ul.bloc-info-listing');
                        if (parentUl) {
                            // Vérifier que l'ul contient "Thèmes :"
                            const hasThemesLabel = Array.from(parentUl.querySelectorAll('li'))
                                .some(li => li.textContent?.trim().toLowerCase() === 'thèmes :');
                            
                            if (hasThemesLabel) {
                                detectedThemes.push(theme);
                            }
                        }
                    }
                }
                
                // Si aucun thème trouvé avec la validation stricte, prendre tous les /theme/
                if (detectedThemes.length === 0) {
                    console.log('⚠️ Aucun thème dans bloc "Thèmes :", tentative sans filtre...');
                    for (const link of themeLinks) {
                        const theme = link.textContent?.trim();
                        if (theme && theme.length > 1 && theme.length < 50) {
                            detectedThemes.push(theme);
                        }
                    }
                }
                
                // Dédupliquer
                const uniqueThemes = [...new Set(detectedThemes)];
                genres = uniqueThemes.join(', ');
                console.log(`✅ ${uniqueThemes.length} thème(s) détecté(s):`, genres);
            }
            
            console.log('🎭 Genres finaux:', genres || 'Aucun');

            // 4. DÉMOGRAPHIE (extraire de genres si présent)
            let demographie = null;
            const demographieKeywords = ['Shōnen', 'Seinen', 'Shōjo', 'Josei', 'Kodomo'];
            for (const demo of demographieKeywords) {
                if (genres.includes(demo)) {
                    demographie = demo;
                    break;
                }
            }
            
            console.log('👥 Démographie:', demographie);

            // 5. NOMBRE DE TOMES
            let nb_chapitres = null;
            const nbTomesMatch = pageText.match(/Nombre\s+de\s+tomes?\s*:\s*(\d+)/i);
            if (nbTomesMatch) {
                nb_chapitres = parseInt(nbTomesMatch[1]);
            }
            
            console.log('📚 Nombre de tomes:', nb_chapitres);

            // 6. TYPE (Manga / Light Novel / Manhwa / etc.)
            // "Type : Mangas"
            let type = 'Manga'; // Par défaut
            const typeMatch = pageText.match(/Type\s*:\s*([^\n]+)/i);
            if (typeMatch) {
                const typeText = typeMatch[1].trim();
                if (typeText.includes('Light Novel') || typeText.includes('Roman')) {
                    type = 'Light Novel';
                } else if (typeText.includes('Manhwa')) {
                    type = 'Manhwa';
                } else if (typeText.includes('Manhua')) {
                    type = 'Manhua';
                } else if (typeText.includes('Webtoon')) {
                    type = 'Webtoon';
                } else if (typeText.includes('Manga')) {
                    type = 'Manga';
                }
            }
            
            console.log('📖 Type:', type);

            // 7. STATUT (En cours / Terminée)
            let statut = 'En cours'; // Par défaut
            const statutElement = document.querySelector('.status, .statut');
            if (statutElement) {
                const statutText = statutElement.textContent.toLowerCase();
                if (statutText.includes('terminé') || statutText.includes('fini') || statutText.includes('complet')) {
                    statut = 'Terminée';
                } else if (statutText.includes('abandonné')) {
                    statut = 'Abandonnée';
                }
            }
            
            console.log('📊 Statut:', statut);

            // 8. COUVERTURE (image de la série ou du tome 1)
            const couverture_url = 
                document.querySelector('.serie-cover img')?.src ||
                document.querySelector('img[alt*="' + titre + '"]')?.src ||
                document.querySelector('img[src*="book_cover"]')?.src ||
                document.querySelector('.cover img')?.src ||
                document.querySelector('img[itemprop="image"]')?.src ||
                '';
            
            console.log('🖼️ Couverture:', couverture_url ? 'Trouvée' : 'Non trouvée');

            // 9. ÉDITEUR (pas disponible sur page série, sera récupéré depuis le tome 1)
            let editeur = '';
            console.log('🏢 Éditeur: (sera récupéré depuis le tome 1)');

            // 10. DESCRIPTION (synopsis)
            // Le synopsis n'est PAS sur la page série, mais sur la page du tome 1
            // On le récupère plus bas via fetch()
            let description = '';
            
            // Description temporaire (sera remplacée par le synopsis du tome 1)
            if (auteurs) description += `Par ${auteurs}. `;
            console.log('📝 Description temporaire:', description);

            // 11. LANGUE ORIGINALE
            const langue_originale = 
                type === 'Manhwa' ? 'ko' : 
                type === 'Manhua' ? 'zh' : 'ja';

            // 12. LISTE DES TOMES (via images sur la page série)
            const volumes = [];
            
            // Sur Booknode, les images des tomes sont séparées des liens texte
            // On utilise directement la recherche via images
            console.log('🔍 Recherche des tomes via leurs images...');
            const allImages = document.querySelectorAll('img[src*="book_cover"], img[data-src*="book_cover"]');
            console.log(`🖼️ ${allImages.length} image(s) de couverture trouvée(s)`);
            
            for (const img of allImages) {
                // Récupérer l'URL (src ou data-src pour lazy loading)
                let imgSrc = img.src || img.dataset.src || img.getAttribute('data-src') || '';
                const imgAlt = img.alt || '';
                
                // Nettoyer les URLs transparentes (placeholders)
                if (imgSrc.includes('transparent') || imgSrc.includes('placeholder')) {
                    imgSrc = img.dataset.src || img.getAttribute('data-src') || '';
                }
                
                // Chercher le numéro du tome dans l'URL ou l'alt de l'image
                const numeroMatch = imgSrc.match(/tome[_\s](\d+)/i) || 
                                   imgAlt.match(/tome[_\s](\d+)/i);
                
                if (numeroMatch && imgSrc) {
                    const numero = parseInt(numeroMatch[1]);
                    
                    // Chercher le lien parent <a> pour récupérer l'URL du tome
                    const parentLink = img.closest('a[href*="/le_"]') || 
                                     img.closest('a[href*="/_"]') ||
                                     img.closest('a[href*="_tome_"]') ||
                                     img.closest('a');
                    const tomeUrl = parentLink?.href || '';
                    
                    volumes.push({
                        numero: numero,
                        couverture_url: imgSrc,
                        date_sortie: null,
                        isbn: null,
                        url: tomeUrl // ✨ URL du tome pour fetch ultérieur
                    });
                }
            }
            
            // Dédupliquer (au cas où)
            const uniqueVolumes = [];
            const seenNumeros = new Set();
            for (const vol of volumes) {
                if (!seenNumeros.has(vol.numero)) {
                    seenNumeros.add(vol.numero);
                    uniqueVolumes.push(vol);
                }
            }
            
            // Trier par numéro
            uniqueVolumes.sort((a, b) => a.numero - b.numero);
            
            console.log(`📚 ${uniqueVolumes.length} tome(s) trouvé(s) après déduplication`);
            
            // Afficher le détail des volumes trouvés
            if (uniqueVolumes.length > 0) {
                const volumesWithImages = uniqueVolumes.filter(v => v.couverture_url).length;
                console.log(`📖 ${volumesWithImages}/${uniqueVolumes.length} volume(s) avec images`);
                console.log('📖 Détail des volumes:', uniqueVolumes);
            }
            
            // Récupérer l'éditeur, le synopsis ET les dates de sortie depuis les pages de tomes
            if (uniqueVolumes.length > 0) {
                console.log(`🌐 Fetch des données depuis ${uniqueVolumes.length} tome(s)...`);
                
                // Fetch du tome 1 pour éditeur + synopsis
                if (uniqueVolumes[0].url) {
                    try {
                        console.log('📖 Tome 1: récupération éditeur + synopsis...');
                        const response = await fetch(uniqueVolumes[0].url);
                        const html = await response.text();
                        
                        // Parser le HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        // Extraire l'éditeur
                        const editeurLink = doc.querySelector('a[title*="Editeur"]');
                        if (editeurLink) {
                            editeur = editeurLink.textContent?.trim() || '';
                            console.log('✅ Éditeur:', editeur);
                        }
                        
                        // Extraire le synopsis
                        const synopsisElement = doc.querySelector('.actual-text');
                        if (synopsisElement) {
                            const synopsisText = synopsisElement.textContent?.trim() || '';
                            description = synopsisText.replace(/^Résumé\s*/i, '').trim();
                            console.log('✅ Synopsis:', description.substring(0, 80) + '...');
                        }
                        
                        // Extraire la date de sortie du tome 1
                        const dateElement = doc.querySelector('.momentjs-format[data-format="LL"]');
                        if (dateElement) {
                            const dateText = dateElement.textContent?.trim();
                            if (dateText) {
                                const dateISO = convertToISO(dateText);
                                uniqueVolumes[0].date_sortie = dateISO;
                                console.log(`✅ Date tome 1: ${dateText} → ${dateISO}`);
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Erreur tome 1:', error.message);
                    }
                }
                
                // Fetch des tomes 2-N pour leurs dates de sortie
                for (let i = 1; i < uniqueVolumes.length; i++) {
                    const volume = uniqueVolumes[i];
                    
                    if (!volume.url) continue;
                    
                    try {
                        console.log(`📖 Tome ${volume.numero}: récupération date...`);
                        
                        // Délai de 200ms entre chaque requête pour ne pas surcharger le serveur
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        const response = await fetch(volume.url);
                        const html = await response.text();
                        
                        // Parser le HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        // Extraire la date de sortie
                        const dateElement = doc.querySelector('.momentjs-format[data-format="LL"]');
                        if (dateElement) {
                            const dateText = dateElement.textContent?.trim();
                            if (dateText) {
                                const dateISO = convertToISO(dateText);
                                volume.date_sortie = dateISO;
                                console.log(`✅ Tome ${volume.numero}: ${dateText} → ${dateISO}`);
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Erreur tome ${volume.numero}:`, error.message);
                    }
                }
                
                const volumesWithDates = uniqueVolumes.filter(v => v.date_sortie).length;
                console.log(`📅 ${volumesWithDates}/${uniqueVolumes.length} tome(s) avec dates de sortie`);
            }

            // Construire l'objet de données
            const mangaData = {
                titre: titre.trim(),
                statut: statut,
                type_volume: type === 'Light Novel' ? 'Roman' : 'Broché',
                couverture_url: couverture_url || null,
                description: description || null,
                statut_publication: statut,
                annee_publication: null, // Booknode ne fournit pas toujours l'année
                genres: genres || null,
                nb_chapitres: nb_chapitres,
                langue_originale: langue_originale,
                demographie: demographie,
                rating: null,
                
                // Métadonnées
                _source: 'Booknode',
                _url: window.location.href,
                _type: type,
                _auteurs: auteurs,
                _editeur: editeur,
                
                // Liste des volumes (nettoyer les URLs internes avant envoi)
                volumes: uniqueVolumes.map(v => ({
                    numero: v.numero,
                    couverture_url: v.couverture_url,
                    date_sortie: v.date_sortie,
                    isbn: v.isbn
                }))
            };
            
            console.log('📦 Données extraites:', mangaData);
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
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        buttonFull.onmouseenter = () => {
            buttonFull.style.transform = 'scale(1.1) rotate(5deg)';
            buttonFull.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.7)';
        };
        
        buttonFull.onmouseleave = () => {
            buttonFull.style.transform = 'scale(1) rotate(0deg)';
            buttonFull.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.5)';
        };

        // Bouton 2: Import tomes uniquement
        const buttonTomes = document.createElement('button');
        buttonTomes.innerHTML = '📖';
        buttonTomes.title = 'Import tomes uniquement (série doit exister)';
        buttonTomes.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
        
        buttonTomes.onmouseenter = () => {
            buttonTomes.style.transform = 'scale(1.1) rotate(5deg)';
            buttonTomes.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.7)';
        };
        
        buttonTomes.onmouseleave = () => {
            buttonTomes.style.transform = 'scale(1) rotate(0deg)';
            buttonTomes.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
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
                // Forcer le chargement de toutes les images (lazy loading)
                await scrollToLoadAllImages();
                
                // Extraire les données (avec fetch de l'éditeur)
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
                
                // Notification enrichie
                const tomesDetected = data.volumes?.length || 0;
                const tomesCreated = result.tomesCreated || 0;
                const volumesIgnored = result.volumesIgnored || 0;
                const tomesInfo = tomesCreated > 0 
                    ? `<br><small>📚 ${tomesCreated} tome(s) créé(s)${volumesIgnored > 0 ? ` (${volumesIgnored} ignoré(s) sans date VF)` : ''}</small>` 
                    : tomesDetected > 0 
                    ? `<br><small>📚 ${tomesDetected} tome(s) détecté(s)</small>`
                    : '';
                const typeInfo = data._type !== 'Manga' ? `<br><small>Type: ${data._type}</small>` : '';
                showNotification(`✅ <strong>${data.titre}</strong> ajoutée !<br><small>Source: Booknode</small>${tomesInfo}${typeInfo}`, 'success');
                
                // Reset après 2 secondes
                setTimeout(() => {
                    buttonFull.innerHTML = '📚';
                    buttonFull.disabled = false;
                    buttonFull.style.cursor = 'pointer';
                    buttonFull.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
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
                    buttonFull.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
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
                // Forcer le chargement de toutes les images (lazy loading)
                await scrollToLoadAllImages();
                
                // Extraire les données (avec fetch de l'éditeur)
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
                    showNotification(`✅ ${tomesCreated} tome(s) ajouté(s) à <strong>${data.titre}</strong>${ignoredInfo}<br><small>Source: Booknode</small>`, 'success');
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
                    buttonTomes.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
                    buttonTomes.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
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
                    buttonTomes.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
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
        notification.innerHTML = message;
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

    // Initialisation
    const init = () => {
        console.log('🚀 Initialisation du script Booknode → Ma Mangathèque');
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
