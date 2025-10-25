// ==UserScript==
// @name         F95Zone AVN Extractor - Ma Mangathèque
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Extrait les données F95Zone et les envoie vers Ma Mangathèque
// @author       Rory Mercury 91
// @match        https://f95zone.to/threads/*
// @match        https://*.f95zone.to/threads/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=f95zone.to
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const PORT = 51234; // Port du serveur local Electron
    const SERVER_URL = `http://localhost:${PORT}/import-avn`;

    /**
     * Extrait les données du jeu depuis la page F95Zone
     */
    function extractGameData() {
        const title = document.querySelector("title")?.textContent ?? "";
        const img = document.querySelector("img.bbImage")?.getAttribute("src") ?? "";

        const id = Number(window.location.pathname.split(".")[1]?.split("/")[0]);
        const image = img?.replace("attachments.", "preview.") ?? "";

        const regName = /.*-\s(.*?)\s\[/i;
        const regTitle = /([\w\\']+)(?=\s-)/gi;
        const regVersion = /\[([^\]]+)\]/gi;

        const titleMatch = title.match(regTitle) ?? [];
        const nameMatch = title.match(regName) ?? [];
        const versionMatch = title.match(regVersion) ?? [];

        const name = nameMatch?.[1] ?? "";
        const { status, type } = parseTitle(titleMatch);
        const version = versionMatch?.[0] ?? "";

        const tags = extractTags();

        return {
            id: id,
            name: name,
            version: version,
            status: status,
            tags: tags,
            type: type,
            link: id ? `https://f95zone.to/threads/${id}` : "",
            image: image
        };
    }

    /**
     * Parse le titre pour extraire le statut et le moteur
     */
    function parseTitle(data) {
        let status = "";
        let type = "";

        for (const e of data) {
            switch (e) {
                case "Abandoned":
                    status = "ABANDONNÉ";
                    break;
                case "Completed":
                    status = "TERMINÉ";
                    break;
                default:
                    status = "EN COURS";
                    break;
            }
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

        return { status, type };
    }

    /**
     * Extrait les tags du jeu
     */
    function extractTags() {
        const tags = document.querySelectorAll(".tagItem") ?? [];
        return Array.from(tags).map((tag) => tag.textContent).join(", ");
    }

    /**
     * Envoie les données vers Ma Mangathèque
     */
    async function sendToMaMangatheque(gameData) {
        try {
            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gameData)
            });

            const result = await response.json();

            if (result.success) {
                showNotification(`✅ ${result.action === 'created' ? 'Ajouté' : 'Mis à jour'}: ${gameData.name}`, 'success');
            } else {
                showNotification(`❌ Erreur: ${result.error || 'Inconnu'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Erreur connexion avec Ma Mangathèque:', error);
            showNotification(`❌ Impossible de se connecter à Ma Mangathèque. Assurez-vous que l'application est ouverte.`, 'error');
        }
    }

    /**
     * Affiche une notification
     */
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

    /**
     * Crée le bouton d'extraction
     */
    function createButton() {
        const button = document.createElement('button');
        button.textContent = '📥 Ma Manga';
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

        button.addEventListener('click', async () => {
            button.disabled = true;
            button.textContent = '⏳ Envoi...';
            button.style.opacity = '0.6';

            const gameData = extractGameData();
            await sendToMaMangatheque(gameData);

            button.disabled = false;
            button.textContent = '📥 Ma Manga';
            button.style.opacity = '1';
        });

        document.body.appendChild(button);
    }

    /**
     * Ajoute les styles d'animation
     */
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

    // Initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addStyles();
            createButton();
        });
    } else {
        addStyles();
        createButton();
    }

    console.log('🎮 F95Zone AVN Extractor - Ma Mangathèque activé');
})();

