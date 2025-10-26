# 📋 TODO LIST - Le Nexus

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
✅ **Interface moderne** : Dark/Light mode, 3 vues (grille, liste, images uniquement)  
✅ **Statistiques avancées** : Graphiques Recharts avec évolution temporelle  
✅ **Performance optimisée** : Import 26 animes/min, anti-gel UI, rate limiting intelligent  
✅ **Fusion intelligente Nautiljon** : Matching avec distance Levenshtein + merge conditionnel

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
- [x] **Vues collection** : Grille, Liste, Images uniquement
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
- [x] **Rechargement production** : Détection fenêtre principale localhost OU index.html
- [x] **Extraction images haute résolution** : Priorité lien parent sur miniature
- [x] **Fallback URL distante** : Si téléchargement échoue, stockage URL pour copie manuelle
- [x] **Filtre AVN par tags** : Sélection multiple, filtre ET logique, UI moderne avec pills
- [x] **Titres pages avec émojis** : 📚 Collection Mangas, 🎬 Collection Animés, 🎮 Collection AVN
- [x] **Icônes empty state** : Émojis cohérents avec sidebar (📚🎬🎮)

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
- [ ] **Téléchargement images LewdCorner** : Contournement protection anti-scraping 403 Forbidden

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

## 🎯 ROADMAP

### Court terme (1-2 mois)

1. **Visualiseur images plein écran** (lightbox)
2. **Import automatique trackers anime optimisé**
3. **Support Kitsu API complet**
4. **Prévisions coût séries en cours**

### Moyen terme (3-6 mois)

1. **Application mobile Android** (APK)
2. **Mode hors-ligne complet** (PWA)
3. **Synchronisation bidirectionnelle** MAL/AniList
4. **Notifications desktop**

### Long terme (6+ mois)

1. **Gestion éditions manga**
2. **Liens directs plateformes streaming**
3. **Import CSV personnalisé**
4. **Enrichissement auto métadonnées**

---

**💜 Le Nexus - Votre hub de collections multimédias**

**Développeur** : Rory Mercury 91  
**Version actuelle** : 3.0.2  
**Dernière mise à jour** : 26 octobre 2025  
**Licence** : Propriétaire

---
