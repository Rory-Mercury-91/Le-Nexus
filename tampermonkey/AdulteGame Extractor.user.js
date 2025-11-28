// ==UserScript==
// @name         AdulteGame Extractor → Le Nexus
// @namespace    http://tampermonkey.net/
// @version      2.0.4
// @description  Extrait les données des jeux pour adultes depuis F95Zone et LewdCorner pour Le Nexus
// @author       Rory Mercury 91
// @match        https://f95zone.to/threads/*
// @match        https://*.f95zone.to/threads/*
// @match        https://lewdcorner.com/threads/*
// @match        https://*.lewdcorner.com/threads/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=f95zone.to
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    const PORT = 40000;
    const SERVER_URL = `http://localhost:${PORT}/import-adulte-game`;
    const isF95Zone = window.location.hostname.includes('f95zone');
    const isLewdCorner = window.location.hostname.includes('lewdcorner');

    // ========================================
    // EXTRACTION F95ZONE
    // ========================================

    function extractF95Data() {
        const title = document.querySelector("title")?.textContent ?? "";
        const imageElement =
            document.querySelector("img.bbImage[data-src]") ||
            document.querySelector("img.bbImage[src]") ||
            document.querySelector("[data-lb-id] img");

        const container = imageElement?.closest(".lbContainer");
        const zoomer = container?.querySelector(".lbContainer-zoomer");

        const rawImage =
            zoomer?.getAttribute("data-src") ??
            imageElement?.getAttribute("data-src") ??
            imageElement?.getAttribute("src") ??
            "";

        const id = Number(window.location.pathname.split(".")[1]?.split("/")[0]);
        let image = rawImage || document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

        if (image) {
            try {
                const url = new URL(image, window.location.href);
                image = url.href;
            } catch (error) {
                // ignore invalid URL, keep raw string
            }
        }

        if (image.includes("preview.f95zone.to/")) {
            image = image.replace("preview.f95zone.to/", "attachments.f95zone.to/");
        }

        const regName = /.*-\s(.*?)\s\[/i;
        const regTitle = /([\w\\']+)(?=\s-)/gi;

        const titleMatch = title.match(regTitle) ?? [];
        const nameMatch = title.match(regName) ?? [];

        const titleElement = document.querySelector('.p-title-value');
        let rawTitleText = '';

        if (titleElement) {
            rawTitleText = Array.from(titleElement.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent.trim())
                .filter(Boolean)
                .join(' ');
        }

        if (!rawTitleText) {
            rawTitleText = title.replace(/\s+/g, ' ').trim();
        }

        const structuredMatch = rawTitleText.match(/(.*?)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*$/);

        let gameTitle = (nameMatch?.[1] ?? "").trim();
        let gameVersion = '';
        let gameDeveloper = '';

        if (structuredMatch) {
            gameTitle = structuredMatch[1].trim();
            gameVersion = structuredMatch[2].trim();
            gameDeveloper = structuredMatch[3].trim();
        } else {
            const versionFallback = rawTitleText.match(/\[([^\]]+)\]/);
            const developerFallback = rawTitleText.match(/\[([^\]]+)\]\s*$/);

            if (versionFallback) {
                gameVersion = versionFallback[1].trim();
            }

            if (developerFallback) {
                gameDeveloper = developerFallback[1].trim();
            }

            if (!gameTitle) {
                gameTitle = rawTitleText.replace(/\s*\[[^\]]+\]\s*/g, ' ').trim();
            }
        }

        if (!gameTitle) {
            gameTitle = rawTitleText || title.trim();
        }

        const status = extractF95Status();
        const engine = extractF95Engine(titleMatch);
        const tags = extractF95Tags();

        const missingFields = [];
        if (!gameVersion) {
            missingFields.push("la version");
        }
        if (!gameDeveloper) {
            missingFields.push("le développeur");
        }

        if (missingFields.length && isF95Zone) {
            showInfoOverlay(
                `⚠️ ${missingFields.join(" et ")} ${missingFields.length > 1 ? "ne sont pas renseignés" : "n'est pas renseigné"}.<br/>
                Merci de compléter ces informations dans la page détails après l'import.`
            );
        }

        return {
            id: id,
            name: gameTitle,
            version: gameVersion,
            developer: gameDeveloper,
            status: status,
            tags: tags,
            type: engine,
            plateforme: "F95Zone",
            link: id ? `https://f95zone.to/threads/${id}` : "",
            image: image
        };
    }

    function parseF95Title(data) {
        let type = "";

        for (const e of data) {
            switch (e) {
                case "Ren'Py":
                    type = "RenPy";
                    break;
                case "RPGM":
                    type = "RPGM";
                    break;
                case "Unity":
                    type = "Unity";
                    break;
                case "Unreal Engine":
                    type = "Unreal";
                    break;
                case "Flash":
                    type = "Flash";
                    break;
                case "HTML":
                    type = "HTML";
                    break;
                case "QSP":
                    type = "QSP";
                    break;
                case "Others":
                    type = "Autre";
                    break;
            }
        }

        return { type };
    }

    function extractF95Tags() {
        const tags = document.querySelectorAll(".tagItem") ?? [];
        return Array.from(tags).map((tag) => tag.textContent).join(", ");
    }

    // ========================================
    // EXTRACTION LEWDCORNER
    // ========================================

    function getLewdCornerJsonLD() {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const merged = {};
        
        for (const { textContent } of scripts) {
            try {
                const json = textContent ? JSON.parse(textContent) : {};
                Object.assign(merged, json);
            } catch (error) {
                console.error("Erreur lors du parsing JSON:", error);
            }
        }
        
        return merged.mainEntity || {};
    }

    function extractLewdCornerData() {
        const jsonLD = getLewdCornerJsonLD();
        const pageTitle = document.querySelector(".p-title-value")?.innerText ?? "";
        const id = Number(jsonLD?.url?.split(".")[2]?.split("/")[0]);
        const image = document.querySelector("img.bbImage")?.getAttribute("src") ?? "";
        const version = document.querySelector("dl[data-field='version'] > dd")?.textContent ?? "";
        const name = jsonLD?.headline?.match(/([^\[]*) /)?.[1] ?? "";
        const tags = jsonLD?.keywords ?? "";

        const { status, type } = parseLewdCornerTitle(pageTitle);

        return {
            id: id,
            name: name,
            version: version,
            status: status,
            tags: tags,
            type: type,
            plateforme: "LewdCorner",
            link: id ? `https://lewdcorner.com/threads/${id}` : "",
            image: image
        };
    }

    function parseLewdCornerTitle(title) {
        let status = "";
        let type = "";

        if (title.includes("Abandoned")) {
            status = "ABANDONNÉ";
        } else if (title.includes("Complete")) {
            status = "TERMINÉ";
        } else {
            status = "EN COURS";
        }

        if (title.includes("Ren'Py")) {
            type = "RenPy";
        } else if (title.includes("RPGM")) {
            type = "RPGM";
        } else if (title.includes("Unity")) {
            type = "Unity";
        } else if (title.includes("Unreal Engine")) {
            type = "Unreal";
        } else if (title.includes("Flash")) {
            type = "Flash";
        } else if (title.includes("HTML")) {
            type = "HTML";
        } else if (title.includes("QSP")) {
            type = "QSP";
        } else if (title.includes("Other")) {
            type = "Autre";
        }

        return { status, type };
    }

    // ========================================
    // UTILITAIRES
    // ========================================

    // Créer un overlay pour bloquer l'interaction pendant le scraping
    function createScrapingOverlay() {
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
    }
    
    // Retirer l'overlay
    function removeScrapingOverlay() {
        const overlay = document.getElementById('lenexus-scraping-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    function extractF95Status() {
        const labelSpans = document.querySelectorAll('.p-title-value .labelLink span');
        for (const span of labelSpans) {
            const text = span.textContent?.trim();
            if (!text) continue;

            switch (text.toLowerCase()) {
                case 'completed':
                    return 'TERMINÉ';
                case 'abandoned':
                    return 'ABANDONNÉ';
                case 'onhold':
                    return 'EN ATTENTE';
            }
        }
        return 'EN COURS';
    }

    function extractF95Engine(titleTokens = []) {
        const ENGINE_MAP = {
            "adrift": "ADRIFT",
            "flash": "Flash",
            "html": "HTML",
            "java": "Java",
            "others": "Autre",
            "autre": "Autre",
            "qsp": "QSP",
            "rags": "RAGS",
            "rpgm": "RPGM",
            "ren'py": "RenPy",
            "ren`py": "RenPy",
            "renpy": "RenPy",
            "tads": "Tads",
            "unity": "Unity",
            "unreal engine": "Unreal",
            "webgl": "WebGL",
            "wolf rpg": "Wolf RPG"
        };

        const labelSpans = document.querySelectorAll('.p-title-value .labelLink span');
        for (const span of labelSpans) {
            const text = span.textContent?.trim();
            if (!text) continue;

            const normalized = text.toLowerCase();
            if (ENGINE_MAP[normalized]) {
                return ENGINE_MAP[normalized];
            }
        }

        for (const token of titleTokens) {
            const normalized = token?.trim().toLowerCase();
            if (normalized && ENGINE_MAP[normalized]) {
                return ENGINE_MAP[normalized];
            }
        }

        const { type } = parseF95Title(titleTokens);
        return type || 'Autre';
    }

    function showInfoOverlay(message) {
        if (document.getElementById('lenexus-info-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'lenexus-info-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.85);
            backdrop-filter: blur(6px);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            max-width: 520px;
            width: 100%;
            background: rgba(30, 41, 59, 0.95);
            border-radius: 18px;
            padding: 28px 28px 24px;
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.35);
            border: 1px solid rgba(99, 102, 241, 0.4);
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
        `;

        const icon = document.createElement('div');
        icon.innerHTML = 'ℹ️';
        icon.style.cssText = `
            font-size: 42px;
            margin-bottom: 12px;
        `;

        const text = document.createElement('div');
        text.innerHTML = message;
        text.style.cssText = `
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Compris';
        closeButton.style.cssText = `
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 22px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        `;

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.transform = 'translateY(-1px)';
            closeButton.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.45)';
        });

        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.transform = 'translateY(0)';
            closeButton.style.boxShadow = 'none';
        });

        closeButton.addEventListener('click', () => {
            overlay.remove();
        });

        container.appendChild(icon);
        container.appendChild(text);
        container.appendChild(closeButton);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    function extractGameData() {
        if (isF95Zone) {
            return extractF95Data();
        } else if (isLewdCorner) {
            return extractLewdCornerData();
        }
        return null;
    }

    function sendToLeNexus(gameData) {
        return new Promise((resolve, reject) => {
            console.info('%c[Le Nexus Extractor]', 'color:#6366f1;font-weight:bold;', 'Données envoyées au Nexus :', JSON.parse(JSON.stringify(gameData)));
            GM_xmlhttpRequest({
                method: 'POST',
                url: SERVER_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(gameData),
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        console.info(
                            '%c[Le Nexus Extractor]',
                            'color:#16a34a;font-weight:bold;',
                            `Réponse (${response.status}) :`,
                            result
                        );
                        if (result.success) {
                            showNotification(`✅ ${result.action === 'created' ? 'Ajouté' : 'Mis à jour'}: ${gameData.name}`, 'success');
                            resolve(result);
                        } else {
                            showNotification(`❌ Erreur: ${result.error || 'Inconnu'}`, 'error');
                            reject(new Error(result.error || 'Erreur inconnue'));
                        }
                    } catch (error) {
                        console.error('❌ Erreur parsing réponse:', error);
                        showNotification(`❌ Erreur: Réponse invalide`, 'error');
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error('%c[Le Nexus Extractor]', 'color:#dc2626;font-weight:bold;', 'Erreur connexion avec Le Nexus:', error);
                    showNotification(`❌ Impossible de se connecter à Le Nexus. Assurez-vous que l'application est ouverte.`, 'error');
                    reject(error);
                }
            });
        });
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('📋 JSON copié dans le presse-papiers', 'success');
        }).catch((error) => {
            console.error('Erreur copie:', error);
            showNotification('❌ Erreur lors de la copie', 'error');
        });
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 175px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ========================================
    // INTERFACE UTILISATEUR
    // ========================================

    let menuVisible = false;

    function createMenu() {
        const menu = document.createElement('div');
        menu.id = 'lenexus-menu';
        menu.style.cssText = `
            position: fixed;
            bottom: 180px;
            right: 20px;
            background: #1e2022;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            z-index: 999999;
            display: none;
            flex-direction: column;
            gap: 8px;
            min-width: 200px;
        `;

        // Bouton "Importer vers Le Nexus" (F95Zone uniquement)
        if (isF95Zone) {
            const importBtn = createMenuButton('📥 Importer vers Le Nexus', async () => {
                hideMenu();
                
                // Afficher l'overlay de blocage
                const overlay = createScrapingOverlay();
                
                try {
                    const gameData = extractGameData();
                    await sendToLeNexus(gameData);
                    // Retirer l'overlay après l'envoi
                    removeScrapingOverlay();
                } catch (error) {
                    // Retirer l'overlay en cas d'erreur
                    removeScrapingOverlay();
                    throw error;
                }
            });
            menu.appendChild(importBtn);
        }

        // Bouton "Copier JSON"
        const copyBtn = createMenuButton('📋 Copier JSON', () => {
            hideMenu();
            const gameData = extractGameData();
            copyToClipboard(JSON.stringify(gameData, null, 2));
        });
        menu.appendChild(copyBtn);

        document.body.appendChild(menu);
        return menu;
    }

    function createMenuButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: #37383a;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
        `;

        button.addEventListener('mouseover', () => {
            button.style.background = '#4a4b4d';
        });

        button.addEventListener('mouseout', () => {
            button.style.background = '#37383a';
        });

        button.addEventListener('click', onClick);

        return button;
    }

    function createMainButton() {
        console.log('🔘 Création du bouton principal...');
        const button = document.createElement('button');
        button.textContent = '🎮 Le Nexus';
        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 14px 20px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            z-index: 999998;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        button.addEventListener('mouseover', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
        });

        button.addEventListener('mouseout', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
        });

        button.addEventListener('click', () => {
            toggleMenu();
        });

        document.body.appendChild(button);
        console.log('✅ Bouton principal ajouté au DOM');
    }

    function toggleMenu() {
        const menu = document.getElementById('lenexus-menu');
        menuVisible = !menuVisible;
        menu.style.display = menuVisible ? 'flex' : 'none';
    }

    function hideMenu() {
        const menu = document.getElementById('lenexus-menu');
        menuVisible = false;
        menu.style.display = 'none';
    }

    // Fermer le menu si on clique ailleurs
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('lenexus-menu');
        const button = e.target.closest('button');
        
        if (menuVisible && menu && !menu.contains(e.target) && button?.textContent !== '🎮 Le Nexus') {
            hideMenu();
        }
    });

    // ========================================
    // STYLES
    // ========================================

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
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
    }

    // ========================================
    // INITIALISATION
    // ========================================

    console.log('═══════════════════════════════════════════════════');
    console.log('🎮 ADULTE-GAME EXTRACTOR → LE NEXUS v2.0.1');
    console.log('🔧 Compatibilité Chrome/Chromium + CSP');
    console.log('📍 URL:', window.location.href);
    console.log('🌐 User Agent:', navigator.userAgent);
    console.log('⏰ Chargé à:', new Date().toISOString());
    console.log(`🏢 Plateforme: ${isF95Zone ? 'F95Zone' : 'LewdCorner'}`);
    console.log('═══════════════════════════════════════════════════');

    const initScript = () => {
        console.log('🔧 Initialisation du script jeux adultes...');
        addStyles();
        console.log('✅ Styles ajoutés');
        createMenu();
        console.log('✅ Menu créé');
        createMainButton();
        console.log('✅ Bouton principal créé');
        console.log(`🎮 Extractor Jeux adulte - Le Nexus activé (${isF95Zone ? 'F95Zone' : 'LewdCorner'})`);
    };

    if (document.readyState === 'loading') {
        console.log('⏳ DOM en chargement, attente de DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ DOMContentLoaded déclenché');
            initScript();
        });
    } else {
        console.log('✅ DOM déjà chargé');
        initScript();
    }
})();
