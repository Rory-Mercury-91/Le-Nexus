# 📋 TODO LIST & CHANGELOG - Le Nexus

**Version actuelle** : 3.0.2  
**Date** : 26 octobre 2025  
**Application** : Le Nexus (anciennement Ma Mangathèque)

---

## 📚 À PROPOS

**Le Nexus** est une application de gestion complète pour vos collections multimédias :
- 📚 **Mangas** : Séries, tomes, progression de lecture
- 🎬 **Animes** : Séries, épisodes, films, OVA avec architecture MyAnimeList pure
- 🎮 **AVN** (Adult Visual Novels) : Jeux F95Zone/LewdCorner avec scraping automatique

### Caractéristiques principales

✅ **Multi-utilisateurs** avec avatars et couleurs personnalisées  
✅ **Base de données SQLite locale** avec support cloud (Proton Drive, OneDrive, Google Drive)  
✅ **Synchronisation MyAnimeList** : OAuth 2.0 + sync auto périodique  
✅ **Traduction IA** : Groq AI pour synopsis anglais → français  
✅ **Import automatique** : Scripts Tampermonkey pour 6 sources  
✅ **Scraping F95Zone/LewdCorner** : Extraction automatique données AVN  
✅ **Interface moderne** : Dark/Light mode, 4 vues (grille, liste, carrousel 3D, présentation)  
✅ **Statistiques avancées** : Graphiques Recharts avec évolution temporelle  
✅ **Performance optimisée** : Import 26 animes/min, anti-gel UI, rate limiting intelligent  
✅ **Fusion intelligente Nautiljon** : Matching avec distance Levenshtein + merge conditionnel

---

## 📜 CHANGELOG

### 🚀 VERSION 3.0.2 - CORRECTIONS PRODUCTION LEWDCORNER (26 octobre 2025)

#### 🛠️ Corrections critiques

**1. 🔄 Rechargement fenêtre principale en production**
- **Problème** : En production, cookies LewdCorner/F95Zone non partagés après connexion
- **Cause** : Détection fenêtre principale cherchait uniquement `localhost` (dev uniquement)
- **Solution** : Détection élargie `localhost` OU `index.html` (production)
- **Fichiers** : `lewdcorner-handlers.js`, `f95zone-handlers.js`
- **Résultat** : Rechargement automatique fonctionne en `.exe` ✅

**2. 📥 Désactivation téléchargement images LewdCorner**
- **Problème** : Protection anti-scraping LewdCorner (403 Forbidden persistant)
- **Tentatives** :
  - Session persistante `persist:lenexus` ❌
  - Intercepteur `webRequest` avec cookies ❌
  - Electron `net.request` avec `Referer` ❌
  - Extraction lien parent haute résolution ❌
- **Solution finale** : Désactivation téléchargement automatique
- **Images F95Zone** : Continue de fonctionner normalement ✅
- **Alternative utilisateur** : Upload manuel via formulaire édition
- **Fichiers** : `avn-handlers.js` (scraping + import JSON)

**3. 🖼️ Extraction images haute résolution**
- **Problème** : Images LewdCorner en miniature (360x150) au lieu de pleine résolution
- **Cause** : Extraction prioritaire de `src` (thumbnail) au lieu de `<a href>` (full)
- **Solution** :
  - Inversion priorité : `<a href>` → `data-url` → `src` (fallback)
  - Complétion URLs relatives (`/attachments/xxx` → `https://lewdcorner.com/attachments/xxx`)
  - Debug logs améliorés (extrait HTML complet `<a><img>`)
- **Impact F95Zone** : Amélioration également pour F95 (même logique)
- **Résultat** : Extraction optimale même si téléchargement échoue

**4. 🛡️ Fallback URL directe**
- **Implémentation** : Si téléchargement échoue → stockage URL distante
- **Log explicite** : "Fallback: utilisation URL directe"
- **Bénéfice** : Pas de jeu sans image, URL disponible pour copie manuelle

#### 📊 Métriques

| Métrique | Avant | Après | Statut |
|----------|-------|-------|--------|
| **Rechargement prod après connexion** | ❌ (localhost only) | ✅ (prod + dev) | **Fixé** |
| **Images LewdCorner téléchargées** | 403 Forbidden | Désactivé (manuel) | **Pragmatique** |
| **Images F95Zone téléchargées** | ✅ | ✅ | **Maintenu** |
| **Extraction haute résolution** | ❌ (src miniature) | ✅ (lien parent) | **Amélioré** |
| **Fallback URL si échec** | ❌ | ✅ | **Nouveau** |

#### 💡 Logs informatifs ajoutés

**LewdCorner (scraping + JSON)** :
```
ℹ️ Image détectée: https://lewdcorner.com/attachments/cover-png.355202/
⚠️ Téléchargement automatique désactivé pour LewdCorner (protection anti-scraping)
💡 Ajoutez l'image manuellement via l'édition du jeu si nécessaire
```

**Rechargement production** :
```
✅ Connexion réussie détectée
🔄 Rechargement de la fenêtre principale pour appliquer les cookies...
```
ou
```
⚠️ Fenêtre principale introuvable pour rechargement
```

---

### 🚀 VERSION 3.0.1 - FUSION INTELLIGENTE NAUTILJON (26 octobre 2025)

#### ✨ Nouveautés

**1. 🔗 Matching intelligent titres Nautiljon**
- **Normalisation avancée** : Suppression accents, tirets, espaces, ponctuation
- **Distance Levenshtein** : Tolérance 1-3 caractères selon longueur titre
- **4 critères matching** :
  - Titre Nautiljon ↔ Titre DB
  - Titre Nautiljon ↔ Alternatif DB
  - Alternatif Nautiljon ↔ Titre DB
  - Alternatif Nautiljon ↔ Alternatif DB
- **Logs détaillés** : Affichage complet données reçues + comparaisons

**2. 🔀 Fusion conditionnelle données**
- **Merge intelligent** : Nautiljon écrase UNIQUEMENT si valeur présente
- **Conservation MAL** : Rating, genres, etc. préservés si Nautiljon n'a pas l'info
- **Logs fusion** : Affichage source de chaque champ (Nautiljon/conservé)
- **Titre alternatif** : Nouvelle colonne `titre_alternatif` dans table series
- **Migration auto** : Ajout colonne pour bases existantes

**3. 🎨 Harmonisation complète Settings**
- **Style unifié** : Classes CSS `.settings-section`, `.settings-header`, `.settings-content`
- **7 sections harmonisées** :
  - UserManagement : Gestion utilisateurs
  - AppearanceSettings : Thème + contenu
  - AISettings : Groq API
  - MALSettings : MyAnimeList sync
  - AVNSettings : LewdCorner/F95Zone auth
  - DatabaseSettings : Emplacement DB
  - DangerZone : Actions destructives
- **Suppression cartes** : Utilisation uniquement quand nécessaire

**4. 📦 Scripts Tampermonkey améliorés**
- **Page installation guidée** : INSTALLATION.html avec design moderne
- **Icônes standardisés** : 📥 Import, ✅ Marquage
- **Positionnement uniforme** : Coin inférieur gauche (évite conflits)
- **Menu Nautiljon** : ⋮ avec 📚 Import complet + 📖 Import tomes
- **Bouton Settings** : Ouvrir guide depuis Paramètres app
- **Build intégré** : Dossier tampermonkey inclus dans package

**5. 🔐 Authentification F95Zone**
- **Système complet** : Identique à LewdCorner
- **Section unifiée** : F95Zone + LewdCorner dans même panel
- **Intercepteur cookies** : Injection automatique
- **Statut connexion** : Badges visuels temps réel

**6. 🔔 Notifications toast unifiées**
- **Suppression alert()** : Remplacement complet par toast
- **Cohérence UI** : Notifications intégrées partout
- **Types** : Success, error, warning, info

**7. 📊 Dashboard carousel unifié**
- **Vue consolidée** : Mangas + Animes en un seul carousel
- **Badges type** : 🎬 Anime / 📚 Manga
- **Tri chronologique** : Progression récente
- **2 cartes séparées** : Progression Mangas + Progression Animes

#### 🛠️ Améliorations techniques

- **Migration database** : Ajout `titre_alternatif` avec ALTER TABLE
- **Normalisation Unicode** : `.normalize('NFD')` pour décomposition accents
- **Algorithme Levenshtein** : Implémentation complète avec seuil adaptatif
- **Logs debugging** : Affichage complet données reçues/comparées
- **CSS vendor prefixes** : `-moz-background-clip` pour compatibilité
- **Build configuration** : `asarUnpack` pour dossier tampermonkey

---

### 🚀 VERSION 3.0.0 - INTÉGRATION LEWDCORNER & REFONTE AVN (25 octobre 2025)

#### ✨ Nouveautés majeures

**1. 🌐 Authentification LewdCorner**
- **Système OAuth personnalisé** : Fenêtre de connexion dédiée avec session partagée
- **Gestion cookies automatique** : Intercepteur webRequest pour injection cookies
- **Vérification session** : Check automatique au démarrage des paramètres
- **UI intégrée** : Section complète dans Paramètres AVN
  - Badge statut connexion (✅ Connecté / ⚠️ Non connecté)
  - Boutons Se connecter / Se déconnecter
  - Section aide "Pourquoi me connecter ?"
- **Affichage images LewdCorner** : Fix complet du 403 Forbidden
- **Reload automatique** : Rechargement fenêtre principale après connexion

**2. 🔄 Vérification MAJ LewdCorner**
- **Support complet LewdCorner** : Vérif MAJ pour jeux LewdCorner si connecté
- **Détection session automatique** : Check cookies au début du processus
- **Exclusion intelligente** : Jeux LewdCorner ignorés si non connecté
- **URL dynamique** : F95Zone (95zone.to) ou LewdCorner (lewdcorner.com)
- **Délai adapté** : 1s pour LewdCorner, 500ms pour F95Zone
- **Message erreur explicite** : "Vous devez être connecté" si 403

**3. 🖼️ Protection images locales**
- **Détection chemin local** : Ne pas écraser les images déjà téléchargées
- **Conservation automatique** : Images locales préservées lors des MAJ
- **Log explicite** : "Image locale conservée (non écrasée)"
- **Formulaire édition amélioré** : Accepte chemins locaux (type=text)
- **Extension automatique** : Détection magic bytes + ajout extension (.png, .jpg, .webp, .avif)

**4. 📥 Import JSON AVN**
- **Modal ImportAvnJsonModal** : Interface dédiée pour import JSON
- **Support LC Extractor** : Format JSON depuis script Tampermonkey LewdCorner
- **Support F95 Extractor** : Format JSON depuis script Tampermonkey F95Zone
- **Téléchargement images local** : Tentative download avec fallback URL
- **Création/MAJ automatique** : Détection doublon par 95_thread_id ou titre
- **Instructions intégrées** : Lien vers installation script dans modal

**5. 👤 Données AVN utilisateur-spécifiques**
- **Table vn_user_games** : Sépare données globales vs user-specific
- **Champs utilisateur** :
  - chemin_executable : Chemin .exe du jeu (par utilisateur)
  - notes_privees : Notes personnelles privées
  - statut_perso : Statut personnel (À jouer, En cours, Complété, Abandonné)
  - derniere_session : Date dernière session de jeu
- **Queries jointes** : JOIN automatique pour récupérer données user
- **Handlers séparés** : Update global vs update user-specific

**6. 🏠 Préférences de contenu personnalisées**
- **Customisation Home Boarding** : Choix contenus affichés (Mangas, Animes, AVN)
- **Configuration onboarding** : Étape dédiée lors première configuration
- **Édition post-config** : Modifiable depuis Paramètres → Apparence
- **Sidebar dynamique** : Liens navigation affichés selon préférences
- **Dashboard adaptatif** : Sections affichées selon choix utilisateur
- **Real-time update** : Changements reflétés immédiatement sans refresh
- **Storage electron-store** : Sauvegarde par utilisateur
- **Event emitter** : Communication changes entre processus

**7. ⚙️ Refonte complète Paramètres**
- **Modularisation** : 7 composants séparés au lieu d'un fichier monolithique
  - UserManagement.tsx : Gestion utilisateurs (ajouter, éditer, supprimer)
  - AppearanceSettings.tsx : Thème, auto-launch, préférences contenu
  - AISettings.tsx : Configuration Groq API
  - MALSettings.tsx : MyAnimeList OAuth + sync + traduction
  - AVNSettings.tsx : Vérif MAJ + LewdCorner auth
  - DatabaseSettings.tsx : Emplacement DB + Import/Export
  - DangerZone.tsx : Actions destructives
- **Layout amélioré** :
  - Sections pleine largeur pour meilleure lisibilité
  - Grid 2 colonnes dans AppearanceSettings (Thème+Launch / Contenu)
  - Sections collapsibles pour "Comment ça fonctionne ?"
- **Textes clarifiés** :
  - "Démarrer automatiquement Le Nexus avec Windows"
  - "AVN - Vérification automatique" : scraping direct au lieu d'API
  - "Emplacement de la base de données" : texte simplifié

**8. 🎨 Renommage application : Le Nexus**
- **Nom complet** : "Le Nexus" (anciennement "Ma Mangathèque")
- **Description** : "Application de gestion de collections multimédias (Mangas, Animés, AVN)"
- **package.json** :
  - name: "le-nexus"
  - productName: "Le Nexus"
  - appId: "com.lenexus.app"
  - author: "Le Nexus Team"
- **UI complète** : Tous les textes interface mis à jour
- **Sidebar** : "Le Nexus" au lieu de "Ma Mangathèque"
- **Splash screen** : "Bienvenue dans Le Nexus"
- **Onboarding** : "Bienvenue dans Le Nexus"
- **Tray** : "Le Nexus" dans tooltip et menu

**9. 🗂️ Améliorations architecture**
- **Intercepteur LewdCorner** : electron/apis/lewdcorner-interceptor.js
- **Auth LewdCorner** : electron/apis/lewdcorner-auth.js
- **Handlers LewdCorner** : electron/handlers/lewdcorner-handlers.js
- **Magic bytes detection** : Identification format image automatique
- **Slug utility** : electron/utils/slug.js pour chemins images
- **Clear cache script** : scripts/clear-cache.js pour nettoyage

#### 🛠️ Corrections

**Images LewdCorner 403 Forbidden** :
- **Problème** : Images protégées non accessibles sans session active
- **Solution triple** :
  1. Auth LewdCorner avec fenêtre dédiée + session partagée
  2. Reload mainWindow après connexion pour appliquer cookies
  3. Intercepteur webRequest pour injection automatique cookies
- **Résultat** : Images LewdCorner s'affichent correctement ✅

**Images locales écrasées lors MAJ** :
- **Problème** : Vérif MAJ remplaçait chemins locaux par URLs distantes
- **Solution** : Détection chemin local + conservation automatique
- **Résultat** : Images HD locales jamais perdues ✅

**Validation formulaire AVN** :
- **Problème** : type="url" refusait chemins locaux
- **Solution** : type="text" avec placeholder "https://... ou chemin local"
- **Résultat** : Édition flexible sans contraintes ✅

**Extension fichiers images manquante** :
- **Problème** : URLs sans extension (LewdCorner : image.24203/)
- **Solution** : Magic bytes + ajout auto extension (.png, .jpg, .webp, .avif)
- **Résultat** : Tous les fichiers ont extension correcte ✅

**Données AVN partagées entre users** :
- **Problème** : chemin_executable, notes_privees globaux
- **Solution** : Table vn_user_games séparée
- **Résultat** : Chaque user a ses propres données ✅

**Base de données non fusionnée** :
- **Problème** : Changement emplacement DB → écrasement données
- **Solution** : mergeDatabases() avec INSERT OR IGNORE
- **Résultat** : Données conservées lors déplacement ✅

**Profil recréé après move DB** :
- **Problème** : Double copie DB + DB ouverte pendant copie
- **Solution** : Close DB avant copy + reopen après + pas de double call
- **Résultat** : Profil persistant après changement emplacement ✅

#### 📊 Métriques

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Images LewdCorner fonctionnelles** | 0% (403) | 100% (auth) | **∞** |
| **Images locales préservées MAJ** | 0% (écrasées) | 100% (détection) | **∞** |
| **Support LewdCorner vérif MAJ** | ❌ | ✅ | **Nouveau** |
| **Import JSON AVN** | ❌ | ✅ | **Nouveau** |
| **Données AVN user-specific** | ❌ | ✅ | **Nouveau** |
| **Préférences contenu customisées** | ❌ | ✅ | **Nouveau** |
| **Fichiers Paramètres (Settings)** | 1 (2296 lignes) | 7 modules | **-67% lignes/fichier** |

---

### 🎮 VERSION 2.3.1 - SCRAPING F95ZONE & HARMONISATION AVN (24 octobre 2025)

#### ✨ Nouveautés

**Scraping direct F95Zone** :
- Abandon API Google Apps Script défaillante (404)
- HTML parsing robuste avec regex
- Support complet métadonnées (titre, version, statut, moteur, tags, image)
- Décodage HTML entities (&#039; → ')

**Téléchargement images optimisé** :
- Electron.net.request (moteur Chromium)
- Contournement CORS (headers User-Agent, Referer, Accept)
- Validation magic bytes (JPEG, PNG, WEBP, AVIF)
- Stockage local covers/avn/{slug}/cover.jpg
- Fallback URL distante si échec

**Harmonisation UI AVN** :
- Style cohérent avec pages Anime
- Suppression popups redondantes
- Composant CoverImage avec support chemins vn/

#### 🛠️ Corrections

- API F95List 404 → Scraping direct ✅
- Statut mal mappé → Anglais (Completed, Abandoned, Ongoing) ✅
- Images miniatures → Pleine résolution (suppression /thumb/) ✅
- ERR_BLOCKED_BY_CLIENT → Electron.net au lieu de node-fetch ✅
- PathManager undefined → Passage fonction getter ✅

---

### 🚀 VERSION 2.3.0 - SYNCHRONISATION MAL & IA (24 octobre 2025)

#### ✨ Nouveautés

**Synchronisation automatique MyAnimeList** :
- OAuth 2.0 PKCE sécurisé
- Sync unidirectionnelle (MAL → App)
- Import/MAJ automatique mangas + animes
- Scheduler périodique configurable (ex: 6h)
- Progression temps réel (X/Y)
- Interface dédiée Paramètres

**Traduction automatique synopsis** :
- Groq AI (llama-3.3-70b-versatile)
- Background non-bloquant post-sync
- Rate limiting intelligent (3.5s, retry 10s/20s)
- Progression détaillée (compteurs, ETA, durée)
- Quota gratuit : 14 400 trad/jour

**18 nouveaux champs manga MAL** :
- mal_id, source_donnees
- Titres : romaji, anglais, alternatifs (JSON)
- Métadonnées : type média, thèmes, auteurs, nb_volumes
- Dates : début, fin
- Progression : volumes lus, statut lecture, score
- Suivi : dates lecture, tags (JSON)
- Relations : prequels, sequels (JSON)

**Système hybride MAL + Nautiljon** :
- Import MAL complet
- Couvertures Nautiljon prioritaires (écrasement auto)
- Matching intelligent (titre + alternatifs)
- Badges visuels 📊 MAL, 🇫🇷 Nautiljon, 📊🇫🇷 Hybride

**Section MAL dans SerieDetail** :
- Affichage conditionnel (si mal_id)
- 3 colonnes (titres alternatifs, publication, stats user)
- Lien direct vers fiche MAL
- Badge bleu cohérent

#### 🛠️ Corrections

- Rate limit Groq 429 → Délai 3.5s + retry ✅
- Duplicate key "display" AnimeEditModal → Supprimé ✅
- Carrousel Dashboard non fonctionnel → Logs debug ✅

---

### 🎯 VERSION 2.2.0 - CAROUSEL UNIFIÉ (23 octobre 2025)

#### ✨ Nouveautés

**Carousel de progression unifié** :
- Fusion mangas/chapitres/animes en un seul
- Affichage intelligent selon type :
  - Mangas : "Titre - Tome 5"
  - Scans : "Titre - 18/118 ch."
  - Animes : "Titre - 12/24 ep."
- Tri chronologique (récents en premier)
- Jusqu'à 10 éléments
- Handler get-recent-progress centralisé

**Dashboard épuré** :
- Suppression carousels redondants (tomes lus, animes visionnés)
- Remplacement par "📖 Progression récente" universel
- -95 lignes dans Dashboard.tsx

#### 🛠️ Corrections

- Erreur no such column: a.episodes_vus → Sous-requête COUNT ✅

---

### 🎨 VERSION 2.1.0 - OPTIMISATION & I18N (23 octobre 2025)

#### ⚡ Optimisations

**Parallélisation requêtes API** :
- Jikan + AniList + Groq en parallèle (Promise.all())
- Wait unique 800ms après toutes requêtes
- Traduction arrière-plan pendant traitement franchise
- **Performance : +118%** (11-12 → 26.2 animes/min)

**Chronomètre temps réel** :
- Temps écoulé (MM:SS)
- ETA calculé dynamiquement
- Vitesse import (animes/min)
- Stats finales (temps total + vitesse moyenne)
- Compteurs : importés, mis à jour, ignorés, erreurs

#### 🇫🇷 Internationalisation

**Dictionnaire traductions** (src/utils/translations.ts) :
- 150+ traductions françaises auto
- Genres (21) : Comedy → Comédie, Fantasy → Fantastique
- Thèmes (60+) : School → École, Reincarnation → Réincarnation
- Demographics : Shounen → Shōnen, Seinen, Josei
   - Sources : Game → Jeu vidéo, Original → Œuvre originale
   - Statuts : Finished Airing → Terminé
   - Ratings : PG-13 → PG-13 - Adolescents 13 ans et +
   - Saisons : Summer → Été, Winter → Hiver

#### 🎨 Améliorations UI

**Logo MyAnimeList** :
- Zone titre avec fond bleu (#2e51a2)
- Badge compact "MAL" à côté titre + favori
- Meilleure visibilité couverture

**Section Informations 2 colonnes** :
- Grid responsive
- Économise espace vertical
- Gap optimisé (16px vertical, 20px horizontal)

#### 🛠️ Corrections

- Erreur dragEvent is not defined → Cache Electron ✅
- Handler update-anime incomplet → 28 champs supportés ✅

---

### 🚀 VERSION 2.0.0 - REFONTE MYANIMELIST (22 octobre 2025)

#### ⚡ BREAKING CHANGES

- ❌ Supprimé : Table anime_saisons, groupement ADKami, extractBaseTitre()
- ✅ Ajouté : Architecture MAL pure, relations franchise natives
- ⚠️ Migration requise : Réinitialisation base animes

#### ✨ Nouveautés

**Nouveau schéma BDD** :
- 1 anime = 1 entrée distincte avec mal_id unique
- Relations : franchise_name, franchise_order, prequel_mal_id, sequel_mal_id
- Progression individuelle par anime

**Ajout anime par MAL ID/URL** :
- Handler addAnimeByMalId(59027) ou addAnimeByMalId('https://...')
- Fetch auto : Jikan + AniList + Groq
- Proposition import prequels/sequels

**Simplification code** :
- anime-handlers.js : 1100 → 900 lignes (-18%)
- Suppression logique groupement complexe
- Import XML : 1 entrée = 1 anime

#### 🛠️ Corrections

- Duplication épisodes (Chuunibyou) ✅
- Ordre inversé (Date A Live V avant IV) ✅
- Progression linéaire ADKami ✅

---

## 🚀 TODO LIST

### 🎯 Priorité Haute

#### ✅ Fonctionnalités actuellement implémentées

- [x] **Interface gestion utilisateurs** : Add/Edit/Delete dynamique
- [x] **Onboarding amélioré** : 4 étapes (Bienvenue, Profil, Emplacement DB, Finalisation)
- [x] **Traduction automatique synopsis** : Groq AI (animes + mangas)
- [x] **Couvertures HD** : AniList GraphQL API avec fallback Jikan
- [x] **Architecture MyAnimeList pure** : 1 anime = 1 MAL ID unique
- [x] **28 champs enrichis anime** : Titres, themes, demographics, producteurs, etc.
- [x] **Optimisation vitesse import** :
  - [x] Parallélisation Jikan + AniList + Groq
  - [x] Chronomètre temps réel avec ETA
  - [x] 26.2 animes/min (+118%)
- [x] **Support Tampermonkey** : 6 scripts (3 anime, 1 manga, 1 AVN, 1 MAL Quick Add)
- [x] **Badge plateforme streaming** : ADN, Crunchyroll, ADKami
- [x] **Mode sombre/clair** : Toggle Paramètres
- [x] **Page Paramètres dédiée** : 7 modules séparés
- [x] **Sidebar collapsible** : Réduction avec icônes uniquement
- [x] **Vues collection** : Grille, Carrousel 3D, Liste, Présentation
- [x] **Raccourcis clavier** : Échap (fermer modals), F12 (DevTools)
- [x] **Démarrage automatique** : Lancer au boot Windows
- [x] **Traductions françaises** : 150+ termes (genres, thèmes, demographics, etc.)
- [x] **Bannières diagonales** : Statuts avec couleurs (Terminé vert, En cours orange, Abandonné gris)
- [x] **Tags système** : Automatiques (en_cours, lu/terminé) + manuels (a_lire/a_regarder, abandonne)
- [x] **Favoris indépendants** : Flag séparé, combinable avec tags
- [x] **Horodatage précis** : Date + heure pour lectures/visionnages
- [x] **Carousel progression unifié** : Mangas + chapitres + animes en un
- [x] **Statistiques avancées** : Graphiques Recharts (évolution temporelle, répartition)
- [x] **Multi-propriétaires** : Dropdown multi-sélection + coûts partagés auto
- [x] **9 types volumes** : Broché, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon, Numérique
- [x] **Synchronisation MyAnimeList** : OAuth 2.0 + sync auto périodique
- [x] **18 champs MAL manga** : mal_id, titres alternatifs, relations, etc.
- [x] **Système hybride MAL+Nautiljon** : Matching intelligent + badges
- [x] **Téléchargement covers locales** : Séries, tomes, animes, AVN
- [x] **Anti-rate-limiting** : Délais adaptatifs (Groq 3.5s, AniList 800ms, F95Zone 500ms, Nautiljon 350-1500ms)
- [x] **Scraping F95Zone** : Extraction complète (titre, version, statut, moteur, tags, image)
- [x] **Téléchargement images Electron.net** : Contournement CORS pour F95Zone
- [x] **Système MAJ AVN automatique** : Vérif complète + notification badge
- [x] **Authentification LewdCorner** : OAuth + intercepteur cookies + UI complète
- [x] **Authentification F95Zone** : OAuth + intercepteur cookies + UI unifiée
- [x] **Vérification MAJ LewdCorner** : Support complet si connecté
- [x] **Protection images locales** : Conservation auto lors MAJ
- [x] **Import JSON AVN** : Support LC Extractor + F95 Extractor
- [x] **Données AVN user-specific** : Table séparée (chemin exe, notes, statut, session)
- [x] **Préférences contenu** : Customisation Home Boarding (Mangas/Animes/AVN)
- [x] **Renommage application** : "Le Nexus" avec branding complet
- [x] **Refonte Paramètres** : 7 modules au lieu de monolithe 2296 lignes
- [x] **Extension images automatique** : Magic bytes + ajout .png/.jpg/.webp/.avif
- [x] **Merge databases** : Fusion lors changement emplacement DB
- [x] **Notifications toast** : Remplacement complet alert() par système toast
- [x] **Tampermonkey installation** : Page HTML guidée + bouton Settings
- [x] **Harmonisation UI Settings** : Style uniforme toutes sections
- [x] **Matching Levenshtein** : Distance 1-3 caractères pour fusion Nautiljon
- [x] **Titre alternatif** : Colonne série + migration auto + fusion intelligente
- [x] **Fusion conditionnelle** : Nautiljon écrase uniquement si valeur présente

#### 📋 À faire

- [ ] **Visualiseur images plein écran** :
  - [ ] Lightbox modal avec fond semi-transparent
  - [ ] Navigation clavier (Échap, flèches)
  - [ ] Zoom et pan pour grandes images
  - [ ] Applicable sur toutes pages (Collection, Détails, Dashboard)
- [ ] **Import automatique depuis trackers anime** :
  - [ ] ADKami : Améliorer détection nombre réel épisodes
  - [ ] Crunchyroll : Optimiser détection multi-saisons
- [ ] **Support Kitsu API** : Source alternative métadonnées
- [ ] **Prévisions de coût** : Estimation pour séries en cours
- [ ] **Import JSON AVN amélioré** :
  - [ ] Support batch (plusieurs jeux à la fois)
  - [ ] Pré-visualisation avant import
- [ ] **Scraping LewdCorner direct** : Support extraction depuis pages LC (actuellement F95 uniquement)

---

### ⭐ Priorité Moyenne

#### ✅ Implémenté

- [x] **Graphiques progression** : Recharts avec évolution temporelle
- [x] **Comparaison multi-utilisateurs** : Répartition tomes + coûts
- [x] **Tags personnalisés** : Système complet avec auto + manuels
- [x] **Badges visuels compacts** : Bannières diagonales colorées
- [x] **Filtrage par tags** : Dans collections mangas + animes
- [x] **Marquer plusieurs tomes** : Bouton "Marquer comme lu" en masse
- [x] **Carrousel lectures récentes** : 10 derniers tomes/chapitres/épisodes

#### 📋 À faire

- [ ] **Gestion éditions manga** : Variantes (Collector, Deluxe, Intégrale)
- [ ] **Lien vers plateformes** : Ouvrir Crunchyroll/Netflix directement
- [ ] **Import CSV** : Format personnalisé pour mangas
- [ ] **Synchronisation bidirectionnelle** : MAL/AniList → App + App → MAL/AniList
- [ ] **Notifications desktop** : Nouveaux épisodes, MAJ AVN, sync MAL terminée

---

### 🔧 Priorité Basse

#### 📋 À faire

- [ ] **Application mobile** : Android APK
  - [ ] Interface tactile adaptée
  - [ ] Connexion DB cloud partagée
  - [ ] Fonctionnalités lecture simplifiées
- [ ] **Mode hors-ligne complet** : PWA-like
- [ ] **Migration BDD** : Outil migration entre versions
- [ ] **Logs d'activité** : Journal toutes actions
- [ ] **Import Anilist/Kitsu direct** : En complément MAL
- [ ] **Enrichissement auto métadonnées** : Refresh périodique données

---

## ⚙️ FONCTIONNALITÉS ACTUELLES

### 📚 Gestion Mangas

**Ajout séries** :
- Recherche MangaDex/Nautiljon avec récupération auto métadonnées
- Ajout manuel complet
- Import Tampermonkey (Nautiljon)
- Import MyAnimeList (OAuth sync)

**Informations supportées** :
- Titre, titre alternatif, auteur, éditeur, ISBN
- Type : Broché, Collector, Coffret, Kindle, Webtoon, Light Novel, Scan Manga, Scan Webtoon, Numérique
- Genre, statut publication, description
- Couverture (upload ou URL)
- Date sortie, notes privées
- Propriétaires multiples (coûts partagés)
- Source données : MAL, Nautiljon, Hybride (mal+nautiljon)

**Gestion tomes** :
- Ajout : numéro, titre, date, prix, couverture, notes
- Suivi lecture : marquer lu avec timestamp précis
- Marquer plusieurs tomes d'un coup
- Progression auto (X/Y lus)
- Historique chronologique

**Synchronisation MAL Manga** :
- OAuth 2.0 PKCE
- Import auto liste manga MAL
- 18 champs enrichis (mal_id, titres alternatifs, relations, etc.)
- Matching intelligent Nautiljon (titre + alternatifs + Levenshtein)
- Fusion conditionnelle (Nautiljon écrase uniquement si valeur présente)
- Écrasement auto covers MAL par Nautiljon
- Badge visuel source

**Tags & Organisation** :
- Tags auto : 🔵 En cours, ✅ Lu
- Tags manuels : 📚 À lire, 🚫 Abandonné
- Favoris : ⭐ Flag indépendant
- Bannières diagonales colorées
- Filtrage avancé

**Vues** :
- Grille responsive (2-6 colonnes)
- Carrousel 3D Cover Flow (rotation ±45°, effet parallaxe)
- Liste compacte (miniatures + progression inline)
- Présentation (zoom au survol)

**Chapitres-based series** :
- Support scans/webtoons (comptage chapitres au lieu tomes)
- Input "Nb de chapitres" + "Chapitres lus"
- Traduction IA descriptions (bouton "Traduire")
- Bannière "Tout lu" si 100% chapitres lus

---

### 🎬 Gestion Animes

**Architecture MAL pure** :
- 1 anime = 1 entrée distincte (mal_id unique)
- Relations franchise natives
- Plus de groupement saisons

**Ajout animes** :
- Par MAL ID/URL (fetch auto Jikan + AniList + Groq)
- Import XML MyAnimeList (en masse)
- Scripts Tampermonkey (ADKami, Crunchyroll, ADN)
- MyAnimeList Quick Add

**28 champs enrichis** :
- Titres multiples (romaji, natif, anglais, alternatifs)
- Type (TV, Movie, OVA, ONA, Special)
- Source (Manga, Light Novel, Jeu vidéo, Original)
- Nb épisodes, durée, année, saison diffusion
- Couverture HD (AniList prioritaire)
- Description (traduite en français)
- Statut (Terminé, En cours, À venir)
- Genres, thèmes, demographics (traduits en français)
- Studios, producteurs, diffuseurs
- Rating (PG-13, R+, etc.)
- Score MAL, dates diffusion
- Relations franchise (prequel, sequel)
- Liens externes
- Badge plateforme (ADN, Crunchyroll, ADKami)

**Suivi progression** :
- Toggle individuel par épisode
- Marquer tout vu d'un coup
- Timestamp précis (date + heure)
- Calcul auto progression (X/Y épisodes)

**Statuts personnels** :
- À regarder, En cours, Terminé, Abandonné
- Tags auto : en_cours, termine
- Tags manuels : a_regarder, abandonne
- Favoris indépendants

**Import optimisé** :
- Parallélisation Jikan + AniList + Groq
- 26.2 animes/min (+118%)
- Chronomètre temps réel (temps écoulé, ETA, vitesse)
- Traduction auto synopsis (Groq AI)
- Rate limiting intelligent

**Traductions françaises** :
- 150+ termes traduits automatiquement
- Genres, thèmes, demographics, sources, statuts, ratings, saisons
- Fallback termes originaux

**Vues** :
- Grille (cartes avec image + infos)
- Liste compacte (miniatures + progression)
- Vue Images (focus couvertures)
- Bannières diagonales (Terminé vert, En cours orange, Abandonné gris)

---

### 🎮 Gestion AVN

**Scraping F95Zone** :
- Recherche par ID F95Zone
- Scraping direct HTML
- Extraction : titre, version, statut, moteur, tags, image
- Téléchargement images Electron.net (contournement CORS)
- Validation magic bytes + extension auto

**Scraping LewdCorner** :
- Support pages LewdCorner
- Authentification requise (système OAuth intégré)
- Intercepteur cookies automatique
- Vérification session au démarrage

**Ajout jeux** :
- Par ID F95Zone/LewdCorner (scraping auto)
- Ajout manuel complet
- Import JSON (LC Extractor, F95 Extractor)

**Informations supportées** :
- Titre, version, moteur
- Statut jeu (EN COURS, TERMINÉ, ABANDONNÉ)
- Tags multiples
- Liens (F95Zone, LewdCorner, traduction, jeu, téléchargement)
- Couverture locale ou URL
- **Champs traduction** :
  - Version traduction
  - Statut traduction (Traduction, Traduction (Mod inclus), Traduction intégré)
  - Type traduction (Manuelle, Semi-automatique, Automatique, VO française)

**Données utilisateur-spécifiques** (table vn_user_games) :
- Chemin exécutable (par user)
- Notes privées (par user)
- Statut personnel (par user) : À jouer, En cours, Complété, Abandonné
- Dernière session (par user)
- Propriétaires multiples (partagé)

**Lancement jeux** :
- Bouton "À jouer" direct
- MAJ auto dernière session

**Système MAJ automatique** :
- Bouton "Vérifier MAJ" dans page AVN
- Support F95Zone + LewdCorner (si connecté)
- Scraping complet chaque jeu
- Comparaison intelligente données
- MAJ auto : version, statut, moteur, tags, image
- **Protection images locales** : Conserve chemins locaux lors MAJ
- Badge 🔄 "Mise à jour disponible !"
- Bouton "Marquer comme vu"
- Système silencieux (pas popups)

**Authentification LewdCorner & F95Zone** :
- Section dédiée Paramètres AVN
- Fenêtre connexion dédiée pour chaque site
- Session cookies partagée
- Intercepteur webRequest automatique
- Badge statut (✅ Connecté / ⚠️ Non connecté)
- Boutons Se connecter / Se déconnecter
- Section aide intégrée

**Protection données** :
- Images locales jamais écrasées
- Détection automatique chemin local
- Log explicite conservation

---

### 👥 Multi-Utilisateurs

**Gestion profils** :
- Création : nom, avatar/emoji, couleur (color picker)
- Modification : renommer (migration auto données), changer avatar, couleur
- Suppression : confirmation + réassignation données
- Aucune limite profils

**Multi-propriétaires** :
- Dropdown multi-sélection
- Calcul auto coûts partagés
- Statistiques individuelles
- Comparaison multi-users

**Onboarding** :
- 4 étapes (Bienvenue, Profil, Emplacement DB, Finalisation)
- Configuration Home Boarding (choix contenus affichés)
- Choix emplacement DB cloud-friendly

**Préférences contenu personnalisées** :
- Customisation contenus affichés (Mangas, Animes, AVN)
- Configuration onboarding + éditable Paramètres
- Sidebar dynamique selon choix
- Dashboard adaptatif
- Real-time update sans refresh
- Storage electron-store par user
- Event emitter changes

---

### 📊 Dashboard & Statistiques

**Dashboard** :
- KPIs visuels (Séries, Tomes, Investissement, Progression)
- 2 cartes progression séparées (Mangas + Animes)
- Carousel progression unifié (mangas + chapitres + animes)
- Badges type (🎬 Anime / 📚 Manga)
- Tri chronologique (10 récents)
- Affichage intelligent selon type

**Statistiques** :
- Graphique évolution temporelle (achats/mois, dépenses)
- Graphique répartition (Tomes + Coût par user)
- Filtrage année + type volume
- Graphiques collapsibles
- Statistiques par type volume

---

### 💾 Import & Export

**Import Mangas** :
- Tampermonkey Nautiljon
- Import XML MyAnimeList (OAuth sync)
- Serveur local port 51234
- Déduplication intelligente
- Attribution auto propriétaire actif
- Matching intelligent (titre + alternatifs + Levenshtein)
- Fusion conditionnelle données

**Import Animes** :
- XML MyAnimeList (export compte MAL)
- Tampermonkey (ADKami, Crunchyroll, ADN)
- MyAnimeList Quick Add
- Multi-saisons auto (Crunchyroll)
- Enrichissement auto (Jikan + AniList + traduction)

**Import AVN** :
- Tampermonkey F95Zone AVN Extractor
- Import JSON (LC Extractor, F95 Extractor)
- Serveur local port 51234

**Import BDD** :
- Import DB externe complète
- Fusion auto avec DB existante (INSERT OR IGNORE)

**Export** :
- Export SQLite complet
- Format : mangatheque_backup_YYYYMMDD_HHMMSS.db
- Transfert entre machines

---

### 🔄 Synchronisation MyAnimeList

**OAuth 2.0** :
- Client ID MAL requis
- PKCE sécurisé
- Tokens stockés localement
- Refresh auto

**Sync unidirectionnelle** :
- Liste manga complète
- Liste anime complète
- Progression user (chap lus, ep vus)
- Scores, dates, tags

**Création automatique** :
- Séries/animes manquants créés
- Métadonnées complètes MAL API v2
- 18 champs manga + 28 champs anime

**MAJ intelligente** :
- Compare local vs MAL
- MAJ uniquement changements
- Garde maximum infos
- Fusion conditionnelle Nautiljon

**Scheduler auto** :
- Périodique configurable (ex: 6h)
- Activable/désactivable
- Arrière-plan
- Affichage dernière sync

**Traduction auto synopsis** :
- Groq AI intégré
- Lancé auto après sync MAL
- Progression détaillée temps réel
- Rate limiting intelligent

---

### 🔧 Scripts Tampermonkey

**6 scripts actifs** :

**Anime (4)** :
1. ADKami Episode Tracker
2. Crunchyroll Episode Tracker
3. ADN Episode Tracker
4. MyAnimeList Quick Add

**Manga (1)** :
1. Nautiljon Extractor

**AVN (1)** :
1. F95Zone AVN Extractor

**Serveur import local** :
- Port 51234
- API REST réception imports
- Détection auto source (URL)
- Attribution propriétaire actif
- Overlay progression

**Installation guidée** :
- Page HTML moderne (INSTALLATION.html)
- Bouton depuis Paramètres app
- Ouverture navigateur par défaut
- Instructions pas-à-pas
- Liens directs scripts

---

### ⚙️ Paramètres & Configuration

**7 modules séparés** :

**1. UserManagement** :
- Liste utilisateurs existants
- Création formulaire dédié
- Modification (nom, emoji, couleur, avatar)
- Suppression avec confirmation

**2. AppearanceSettings** :
- Thème (Dark/Light)
- Démarrage auto Windows
- Préférences contenu (Mangas, Animes, AVN)
- Layout 2 colonnes (Thème+Launch / Contenu)

**3. AISettings** :
- Clé API Groq configurable
- Masquable/affichable
- Guide obtention inclus
- Validation clé

**4. MALSettings** :
- OAuth Client ID
- Connexion/déconnexion
- Sync maintenant + auto-sync périodique
- Traduction synopsis (bouton manuel)
- Import XML MyAnimeList
- Progression temps réel

**5. AVNSettings** :
- Authentification LewdCorner (Se connecter/Déconnecter)
- Authentification F95Zone (Se connecter/Déconnecter)
- Vérification MAJ (bouton "Vérifier maintenant")
- Badge statut connexion LC + F95
- Messages inline (pas popups)
- Section aide collapsible

**6. DatabaseSettings** :
- Affichage chemin actuel
- Changement emplacement (avec merge DB)
- Import/Export DB
- Support cloud

**7. DangerZone** :
- Suppression données utilisateur
- Suppression toutes données app
- Confirmations multiples

**8. TampermonkeySettings** :
- Tuiles visuelles (4 scripts)
- Bouton "Ouvrir le guide d'installation"
- Ouverture navigateur par défaut
- Design moderne cohérent

**Fenêtre** :
- Persistance taille/position/état
- Restauration démarrage
- Debounce 500ms

**Raccourcis** :
- Échap : Fermer modals
- F12 : Ouvrir/fermer DevTools

**Sidebar** :
- Collapsible (icônes uniquement)
- Animations fluides
- Bordure avatar couleur user
- Navigation dynamique selon préférences contenu

---

## 🛠️ Technologies

**Frontend** :
- React + TypeScript + Vite
- Lucide React (icônes SVG)
- Recharts (graphiques)
- React Router DOM

**Backend** :
- Electron
- better-sqlite3 (SQLite)
- electron-store (config)
- node-cron (scheduler)

**APIs Externes** :
- Jikan (MyAnimeList API v4)
- AniList GraphQL
- MangaDex API
- Kitsu API
- MangaUpdates
- Groq AI (traduction)
- MyAnimeList API v2 (OAuth)

**Scraping** :
- F95Zone (HTML parsing + regex)
- LewdCorner (HTML parsing + auth)
- Nautiljon (délai adaptatif)

**Services Internes** :
- PathManager (chemins covers/DB)
- CoverManager (téléchargement images)
- ImportServer (port 51234)
- MAL Sync Service
- AVN Update Scheduler
- LewdCorner Auth + Interceptor
- F95Zone Auth + Interceptor

---

## 📈 Performances

**Vitesse import** :
- Avant : 331 animes → 27-30 min (~11-12 animes/min)
- Après : 331 animes → ~12-13 min (**26.2 animes/min**)
- **+118% grâce parallélisation**

**Anti-gel UI** :
- setImmediate() dans toutes boucles
- Import XML anime : pause tous les 5
- Sync MAL : pause tous les 5
- Traduction : pause chaque itération
- Vérif MAJ AVN : pause tous les 3
- **Résultat** : App reste réactive

**Rate Limiting** :
- Groq AI : 3.5s + retry 10s/20s (99%+ succès)
- AniList : 800ms (limite 90 req/min)
- F95Zone : 500ms / LewdCorner : 1s
- Nautiljon : 350-1500ms adaptatif

**Stockage Local** :
- Mangas : covers/series/{slug}/
- Animes : covers/animes/{slug}/
- AVN : covers/avn/{slug}/
- Évite requêtes réseau répétées

**Matching intelligent** :
- Normalisation Unicode complète
- Distance Levenshtein (1-3 caractères)
- 4 critères matching simultanés
- Fusion conditionnelle (conservation données)

---

## 🔒 Sécurité & Vie Privée

✅ **Données 100% locales**  
✅ **Pas de tracking, pas de télémétrie**  
✅ **Tokens MAL stockés sécurisé**  
✅ **Clé API Groq masquable UI**  
✅ **Session LewdCorner cookies locaux**  
✅ **Session F95Zone cookies locaux**  
✅ **Cloud optionnel** (Proton Drive, OneDrive, Google Drive)

---

## 📝 Notes Développement

**Architecture** :
- Frontend : React + TypeScript + Vite
- Backend : Electron + better-sqlite3
- APIs : 7 sources (Jikan, AniList, MangaDex, Kitsu, MangaUpdates, Groq, MAL)
- Scripts : 6 Tampermonkey

**Fichiers clés** :
- electron/services/database.js : Schéma + migrations
- electron/services/import-server.js : API import Tampermonkey
- electron/handlers/ : 10 IPC handlers
- electron/apis/ : 11 modules API externes
- src/components/ : 30+ composants React
- tampermonkey/ : 6 scripts extraction

**Conventions** :
- Commits français
- Préfixes : feat:, fix:, docs:, refactor:, style:, test:
- Branche : main
- Pas de force push

---

## 🎯 Roadmap

**Court terme (1-2 mois)** :
1. Visualiseur images plein écran (lightbox)
2. Import automatique trackers anime optimisé
3. Support Kitsu API complet
4. Prévisions coût séries en cours

**Moyen terme (3-6 mois)** :
1. Application mobile Android (APK)
2. Mode hors-ligne complet (PWA)
3. Synchronisation bidirectionnelle MAL/AniList
4. Notifications desktop

**Long terme (6+ mois)** :
1. Gestion éditions manga
2. Liens directs plateformes streaming
3. Import CSV personnalisé
4. Enrichissement auto métadonnées

---

**💜 Le Nexus - Votre hub de collections multimédias**

**Développeur** : Rory Mercury 91  
**Version actuelle** : 3.0.2  
**Dernière mise à jour** : 26 octobre 2025  
**Licence** : Propriétaire

---
