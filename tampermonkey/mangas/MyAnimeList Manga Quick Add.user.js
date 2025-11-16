// ==UserScript==
// @name         MyAnimeList Manga → Le Nexus
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Ajoute un bouton "Ajouter à Le Nexus" sur les pages manga MyAnimeList
// @author       Votre nom
// @match        https://myanimelist.net/manga/*
// @icon         https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // Extraire l'ID du manga depuis l'URL
    const malId = window.location.pathname.match(/\/manga\/(\d+)/)?.[1];
    if (!malId) return;

    // Créer le bouton
    const button = document.createElement('button');
    button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Ajouter à Le Nexus
    `;
    button.style.cssText = `
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);
        margin: 10px 0;
    `;

    // Effet hover
    button.onmouseenter = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 12px rgba(245, 158, 11, 0.4)';
    };
    button.onmouseleave = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.3)';
    };

    // Action du bouton
    button.onclick = () => {
        // Envoyer à l'application via le serveur local
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'http://localhost:40000/add-manga',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                mal_id: parseInt(malId),
                source: 'myanimelist'
            }),
            onload: (response) => {
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
                        button.disabled = true;

                        // Réinitialiser après 3 secondes
                        setTimeout(() => {
                            button.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter à Le Nexus
                            `;
                            button.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                            button.disabled = false;
                        }, 3000);
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

                    // Réinitialiser après 5 secondes
                    setTimeout(() => {
                        button.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Ajouter à Le Nexus
                        `;
                        button.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
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

                // Réinitialiser après 5 secondes
                setTimeout(() => {
                    button.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 6px; vertical-align: middle;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter à Le Nexus
                    `;
                    button.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
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

    console.log('📚 Le Nexus - Bouton Manga Quick Add injecté (MAL ID:', malId, ')');
})();
