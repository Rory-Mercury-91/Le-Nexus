# 🎭 Scripts Tampermonkey - Ma Mangathèque

Scripts d'intégration navigateur pour **Ma Mangathèque**.

---

## 📦 Installation

### 1. Installer Tampermonkey

Installez l'extension Tampermonkey pour votre navigateur :
- **Chrome** : [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox** : [Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/tampermonkey/)
- **Edge** : [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Safari** : [App Store](https://apps.apple.com/app/tampermonkey/id1482490089)

### 2. Installer un script

1. Ouvrez le fichier `.user.js` dans un éditeur de texte
2. **Copiez tout le contenu** du script
3. Ouvrez le **tableau de bord Tampermonkey** (icône → Dashboard)
4. Cliquez sur l'onglet **"Utilitaires"**
5. Collez le code dans la zone de texte
6. Cliquez sur **"Installer"**

**OU**

1. Glissez-déposez le fichier `.user.js` dans votre navigateur
2. Tampermonkey détectera automatiquement le script
3. Cliquez sur **"Installer"**

---

## 🎬 Scripts Animes

### MyAnimeList Quick Add

**Fichier** : `animes/MyAnimeList Quick Add.user.js`

**Fonction** : Ajoute un bouton sur les pages d'anime MyAnimeList pour importer directement dans Ma Mangathèque.

**Pages compatibles** : `https://myanimelist.net/anime/*`

#### 📋 Fonctionnalités
- ✅ Bouton "Ajouter à Ma Mangathèque" avec design moderne
- ✅ Import complet automatique (Jikan + AniList + Groq)
- ✅ 28 champs enrichis récupérés (cover HD, synopsis traduit, genres, themes, etc.)
- ✅ Feedback visuel (succès/erreur)
- ✅ Détection automatique du MAL ID depuis l'URL

#### 🎯 Utilisation
1. Naviguez vers une page d'anime sur MyAnimeList
   - Exemple : `https://myanimelist.net/anime/59027/Spy_x_Family_Season_3`
2. Un bouton violet apparaît sous le titre
3. Cliquez sur **"Ajouter à Ma Mangathèque"**
4. ✅ L'anime est ajouté automatiquement !

#### ⚠️ Prérequis
- **Ma Mangathèque doit être lancé** (serveur d'import sur port 51234)
- Connexion Internet pour les API (Jikan, AniList, Groq)

---

## 📚 Scripts Mangas

*(Pas encore disponibles - scripts ADKami/Crunchyroll archivés)*

---

## 🛠️ Configuration

### Port du serveur d'import

Par défaut, les scripts communiquent avec **Ma Mangathèque** via :
```
http://localhost:51234
```

Si vous avez modifié le port dans l'application, éditez la variable dans le script :
```javascript
fetch('http://localhost:VOTRE_PORT/add-anime', {
  // ...
})
```

### Désactiver un script temporairement

1. Ouvrez le **tableau de bord Tampermonkey**
2. Cliquez sur l'**interrupteur** à côté du script
3. Le script sera désactivé sans être supprimé

---

## 🐛 Dépannage

### Le bouton n'apparaît pas

**Solutions** :
1. Vérifiez que Tampermonkey est activé (icône dans la barre du navigateur)
2. Vérifiez que le script est **activé** dans le tableau de bord
3. Actualisez la page MyAnimeList (`F5` ou `Ctrl+R`)
4. Vérifiez les logs de la console développeur (`F12`)

### Erreur "Vérifiez que l'app est lancée"

**Solutions** :
1. **Lancez Ma Mangathèque** (`npm start`)
2. Vérifiez que le serveur d'import est démarré :
   - Ouvrez l'application
   - Regardez les logs : `🌐 Serveur d'import démarré sur http://localhost:51234`
3. Testez manuellement : http://localhost:51234 dans le navigateur
   - Doit afficher : `{"status":"ok","message":"Ma Mangathèque Import Server"}`

### L'anime est ajouté plusieurs fois

**Solution** : Attendez que le bouton affiche "✅ Ajouté avec succès !" avant de recliquer.

Le script empêche les doubles clics, mais un clic pendant le chargement créera un doublon.

---

## 🔒 Sécurité

### Pourquoi localhost ?

Les scripts communiquent uniquement avec **votre machine locale** (`localhost:51234`). Aucune donnée n'est envoyée à un serveur externe.

### Code source ouvert

Tous les scripts sont **open source**. Vous pouvez les consulter et les modifier librement. Le code est commenté et lisible.

### Permissions

Les scripts Tampermonkey demandent uniquement :
- 🌐 **Accès aux pages spécifiées** (ex: `myanimelist.net/anime/*`)
- 🔌 **Accès à localhost** pour communiquer avec l'application

---

## 📝 Développement

### Créer un nouveau script

1. Créez un fichier `.user.js` dans le dossier approprié
2. Ajoutez l'en-tête Tampermonkey :
```javascript
// ==UserScript==
// @name         Mon Script
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Description du script
// @author       Votre nom
// @match        https://exemple.com/*
// @grant        none
// ==/UserScript==
```

3. Développez votre logique
4. Testez en l'installant dans Tampermonkey
5. Committez le fichier dans le dépôt

### Structure recommandée

```javascript
(function() {
    'use strict';
    
    // Extraire les données de la page
    const data = extractPageData();
    
    // Créer l'interface
    const button = createButton();
    
    // Gérer l'action
    button.onclick = async () => {
        const result = await sendToApp(data);
        showFeedback(result);
    };
    
    // Injecter dans la page
    injectButton(button);
})();
```

---

## 📚 Ressources

- [Documentation Tampermonkey](https://www.tampermonkey.net/documentation.php)
- [Jikan API (MyAnimeList)](https://jikan.moe/)
- [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [Ma Mangathèque GitHub](https://github.com/votre-repo)

---

## 🆘 Support

Problème avec un script ? Ouvrez une issue sur GitHub avec :
- 📝 Nom du script
- 🌐 Navigateur utilisé
- ❌ Message d'erreur (console F12)
- 📸 Capture d'écran (si pertinent)

---

**Dernière mise à jour** : Octobre 2024  
**Version** : 2.0
