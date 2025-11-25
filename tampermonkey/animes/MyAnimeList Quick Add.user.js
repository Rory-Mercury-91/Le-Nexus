// ==UserScript==
// @name         MyAnimeList → Le Nexus (Animes & Mangas)
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Ajoute un bouton "Ajouter à Le Nexus" sur les pages anime/manga MyAnimeList avec overlay de sélection pour fusion. Détecte automatiquement le type de page.
// @author       Votre nom
// @match        https://myanimelist.net/anime/*
// @match        https://myanimelist.net/manga/*
// @icon         https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // Détecter le type de page (anime ou manga) depuis l'URL
    const pathname = window.location.pathname;
    const isAnime = pathname.includes('/anime/');
    const isManga = pathname.includes('/manga/');
    const mediaType = isAnime ? 'anime' : (isManga ? 'manga' : null);
    
    if (!mediaType) return;

    // Extraire l'ID depuis l'URL
    const malIdMatch = pathname.match(/\/(anime|manga)\/(\d+)/);
    const malId = malIdMatch?.[2];
    if (!malId) return;

    // Configuration selon le type
    const config = {
        anime: {
            endpoint: '/add-anime',
            title: 'Anime',
            overlayTitle: '🔍 Anime similaire trouvé',
            candidateLabel: 'Anime existant :',
            colorPrimary: 'rgba(102, 126, 234, 0.5)',
            colorBg: 'rgba(102, 126, 234, 0.1)',
            colorBorder: 'rgba(102, 126, 234, 0.3)',
            colorHover: 'rgba(102, 126, 234, 0.2)',
            colorText: '#818cf8',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            gradientButton: 'linear-gradient(135deg, #667eea, #764ba2)',
            shadow: 'rgba(102, 126, 234, 0.3)',
            targetIdParam: '_targetAnimeId',
            typeField: 'type'
        },
        manga: {
            endpoint: '/add-manga',
            title: 'Manga',
            overlayTitle: '🔍 Série similaire trouvée',
            candidateLabel: 'Série existante :',
            colorPrimary: 'rgba(245, 158, 11, 0.5)',
            colorBg: 'rgba(245, 158, 11, 0.1)',
            colorBorder: 'rgba(245, 158, 11, 0.3)',
            colorHover: 'rgba(245, 158, 11, 0.2)',
            colorText: '#fbbf24',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            gradientButton: 'linear-gradient(135deg, #f59e0b, #d97706)',
            shadow: 'rgba(245, 158, 11, 0.3)',
            targetIdParam: '_targetSerieId',
            typeField: 'media_type'
        }
    };

    const cfg = config[mediaType];

    // Créer un overlay de sélection pour proposer la fusion
    const showSelectionOverlay = (malIdValue, candidates, itemTitle) => {
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
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
                border: 2px solid ${cfg.colorPrimary};
            `;
            
            const title = document.createElement('h2');
            title.textContent = cfg.overlayTitle;
            title.style.cssText = `
                font-size: 24px;
                font-weight: 700;
                margin: 0 0 20px 0;
                color: #fff;
            `;
            
            const message = document.createElement('p');
            const entityLabel = mediaType === 'anime' ? 'anime' : 'série';
            message.innerHTML = `Nous avons détecté ${candidates.length} entrée${candidates.length > 1 ? 's' : ''} existante${candidates.length > 1 ? 's' : ''} pouvant correspondre à cet${mediaType === 'anime' ? ' anime' : 'te série'}.<br><br>Que souhaitez-vous faire ?`;
            message.style.cssText = `
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 30px 0;
                color: #d1d5db;
            `;
            
            // Liste des candidats
            const candidatesDiv = document.createElement('div');
            candidatesDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 20px 0;
                max-height: 400px;
                overflow-y: auto;
            `;
            
            candidates.forEach((candidate, index) => {
                const candidateDiv = document.createElement('div');
                candidateDiv.style.cssText = `
                    background: ${cfg.colorBg};
                    border: 1px solid ${cfg.colorBorder};
                    border-radius: 12px;
                    padding: 16px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                
                candidateDiv.onmouseenter = () => {
                    candidateDiv.style.background = cfg.colorHover;
                    candidateDiv.style.borderColor = cfg.colorPrimary.replace('0.5', '0.5');
                };
                
                candidateDiv.onmouseleave = () => {
                    candidateDiv.style.background = cfg.colorBg;
                    candidateDiv.style.borderColor = cfg.colorBorder;
                };
                
                const candidateTitle = document.createElement('div');
                candidateTitle.innerHTML = `<strong style="color: ${cfg.colorText};">${cfg.candidateLabel}</strong> ${candidate.titre}`;
                candidateTitle.style.cssText = `
                    font-size: 16px;
                    margin-bottom: 8px;
                    color: #fff;
                `;
                
                const candidateInfo = document.createElement('div');
                candidateInfo.style.cssText = `
                    font-size: 13px;
                    color: #9ca3af;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 8px;
                `;
                
                const typeValue = candidate[cfg.typeField] || candidate.type || candidate.media_type;
                if (typeValue) {
                    const typeSpan = document.createElement('span');
                    typeSpan.textContent = `Type: ${typeValue}`;
                    typeSpan.style.cssText = `
                        background: ${cfg.colorBg};
                        color: ${cfg.colorText};
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                    `;
                    candidateInfo.appendChild(typeSpan);
                }
                
                if (candidate.source_donnees || candidate.source_import) {
                    const sourceSpan = document.createElement('span');
                    sourceSpan.textContent = `Source: ${candidate.source_donnees || candidate.source_import}`;
                    sourceSpan.style.cssText = `
                        background: rgba(107, 114, 128, 0.15);
                        color: #9ca3af;
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                    `;
                    candidateInfo.appendChild(sourceSpan);
                }
                
                if (candidate.similarity !== undefined) {
                    const similaritySpan = document.createElement('span');
                    similaritySpan.textContent = `Similarité: ${candidate.similarity.toFixed(1)}%`;
                    similaritySpan.style.cssText = `
                        background: rgba(59, 130, 246, 0.15);
                        color: #60a5fa;
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                    `;
                    candidateInfo.appendChild(similaritySpan);
                }
                
                candidateDiv.appendChild(candidateTitle);
                candidateDiv.appendChild(candidateInfo);
                
                candidateDiv.onclick = () => {
                    document.body.removeChild(overlay);
                    resolve({ action: 'merge', candidateId: candidate.id });
                };
                
                candidatesDiv.appendChild(candidateDiv);
            });
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 30px;
                flex-wrap: wrap;
            `;
            
            const createButton = document.createElement('button');
            createButton.textContent = '➕ Créer nouvelle';
            createButton.style.cssText = `
                padding: 12px 24px;
                background: ${cfg.gradientButton};
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
                createButton.style.boxShadow = `0 4px 12px ${cfg.shadow}`;
            };
            createButton.onmouseout = () => {
                createButton.style.transform = 'scale(1)';
                createButton.style.boxShadow = 'none';
            };
            createButton.onclick = () => {
                document.body.removeChild(overlay);
                resolve({ action: 'create' });
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
                resolve({ action: 'cancel' });
            };
            
            buttonsDiv.appendChild(createButton);
            buttonsDiv.appendChild(cancelButton);
            
            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(candidatesDiv);
            content.appendChild(buttonsDiv);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        });
    };

    // Créer le bouton
    const button = document.createElement('button');
    button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Ajouter à Le Nexus
    `;
    button.style.cssText = `
        background: ${cfg.gradient};
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px ${cfg.shadow};
        margin: 10px 0;
    `;

    // Effet hover
    button.onmouseenter = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = `0 6px 12px ${cfg.shadow.replace('0.3', '0.4')}`;
    };
    button.onmouseleave = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = `0 4px 6px ${cfg.shadow}`;
    };

    // Récupérer le titre depuis la page
    const getItemTitle = () => {
        const titleEl = document.querySelector('h1.title-name') || 
                       document.querySelector('.title-english') ||
                       document.querySelector('#contentWrapper h1');
        return titleEl ? titleEl.textContent.trim() : cfg.title;
    };

    // Action du bouton
    button.onclick = async () => {
        const itemTitle = getItemTitle();
        button.disabled = true;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Import...
        `;
        button.style.cursor = 'wait';
        
        // Envoyer à l'application via le serveur local
        GM_xmlhttpRequest({
            method: 'POST',
            url: `http://localhost:40000${cfg.endpoint}`,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                mal_id: parseInt(malId),
                source: 'myanimelist'
            }),
            onload: async (response) => {
                try {
                    const data = JSON.parse(response.responseText);
                    
                    if (data.success) {
                        button.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Ajouté avec succès !
                        `;
                        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                        
                        // Réinitialiser après 3 secondes
                        setTimeout(() => {
                            button.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter à Le Nexus
                            `;
                            button.style.background = cfg.gradient;
                            button.disabled = false;
                        }, 3000);
                    } else if (data.requiresSelection && Array.isArray(data.candidates)) {
                        // Afficher l'overlay de sélection
                        const userChoice = await showSelectionOverlay(malId, data.candidates, itemTitle);
                        
                        if (userChoice.action === 'cancel') {
                            button.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter à Le Nexus
                            `;
                            button.style.background = cfg.gradient;
                            button.disabled = false;
                            return;
                        } else if (userChoice.action === 'merge' && userChoice.candidateId) {
                            // Relancer l'import avec fusion
                            button.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Fusion en cours...
                            `;
                            
                            const mergePayload = {
                                mal_id: parseInt(malId),
                                source: 'myanimelist',
                                _confirmMerge: true
                            };
                            mergePayload[cfg.targetIdParam] = userChoice.candidateId;
                            
                            GM_xmlhttpRequest({
                                method: 'POST',
                                url: `http://localhost:40000${cfg.endpoint}`,
                                headers: { 'Content-Type': 'application/json' },
                                data: JSON.stringify(mergePayload),
                                onload: (mergeResponse) => {
                                    try {
                                        const mergeData = JSON.parse(mergeResponse.responseText);
                                        if (mergeData.success) {
                                            button.innerHTML = `
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Fusionné avec succès !
                                            `;
                                            button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                        } else {
                                            throw new Error(mergeData.error || 'Erreur lors de la fusion');
                                        }
                                    } catch (error) {
                                        console.error('Erreur fusion:', error);
                                        button.innerHTML = `
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Erreur fusion
                                        `;
                                        button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                                    }
                                    
                                    setTimeout(() => {
                                        button.innerHTML = `
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Ajouter à Le Nexus
                                        `;
                                        button.style.background = cfg.gradient;
                                        button.disabled = false;
                                    }, 3000);
                                }
                            });
                            return;
                        } else if (userChoice.action === 'create') {
                            // Créer un nouvel élément
                            button.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Création en cours...
                            `;
                            
                            GM_xmlhttpRequest({
                                method: 'POST',
                                url: `http://localhost:40000${cfg.endpoint}`,
                                headers: { 'Content-Type': 'application/json' },
                                data: JSON.stringify({
                                    mal_id: parseInt(malId),
                                    source: 'myanimelist',
                                    forceCreate: true
                                }),
                                onload: (createResponse) => {
                                    try {
                                        const createData = JSON.parse(createResponse.responseText);
                                        if (createData.success) {
                                            button.innerHTML = `
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Créé avec succès !
                                            `;
                                            button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                        } else {
                                            throw new Error(createData.error || 'Erreur lors de la création');
                                        }
                                    } catch (error) {
                                        console.error('Erreur création:', error);
                                        button.innerHTML = `
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Erreur création
                                        `;
                                        button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                                    }
                                    
                                    setTimeout(() => {
                                        button.innerHTML = `
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Ajouter à Le Nexus
                                        `;
                                        button.style.background = cfg.gradient;
                                        button.disabled = false;
                                    }, 3000);
                                }
                            });
                            return;
                        }
                    } else {
                        throw new Error(data.error || 'Erreur inconnue');
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    button.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Erreur - Vérifiez que l'app est lancée
                    `;
                    button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    button.disabled = false;

                    // Réinitialiser après 5 secondes
                    setTimeout(() => {
                        button.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Ajouter à Le Nexus
                        `;
                        button.style.background = cfg.gradient;
                    }, 5000);
                }
            },
            onerror: (error) => {
                console.error('Erreur:', error);
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Erreur - Vérifiez que l'app est lancée
                `;
                button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                button.disabled = false;

                // Réinitialiser après 5 secondes
                setTimeout(() => {
                    button.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter à Le Nexus
                    `;
                    button.style.background = cfg.gradient;
                }, 5000);
            }
        });
    };

    // Insérer le bouton dans la page
    // Chercher plusieurs emplacements possibles
    const targets = [
        document.querySelector('.title-english'),
        document.querySelector('h1.title-name'),
        document.querySelector('.h1'),
        document.querySelector('#contentWrapper h1')
    ];

    const target = targets.find(el => el !== null);
    if (target) {
        // Créer un conteneur pour le bouton
        const container = document.createElement('div');
        container.style.cssText = 'margin: 15px 0;';
        container.appendChild(button);

        // Insérer après le titre
        target.parentNode.insertBefore(container, target.nextSibling);
    } else {
        // Fallback : insérer en haut de la page
        const contentWrapper = document.querySelector('#contentWrapper') || document.body;
        const container = document.createElement('div');
        container.style.cssText = 'margin: 15px; text-align: center;';
        container.appendChild(button);
        contentWrapper.insertBefore(container, contentWrapper.firstChild);
    }

    const icon = mediaType === 'anime' ? '🎬' : '📚';
    console.log(`${icon} Le Nexus - Bouton Quick Add injecté (${mediaType.toUpperCase()}, MAL ID: ${malId})`);
})();
