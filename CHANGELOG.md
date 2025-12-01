# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.4-Fix] - 2025-12-01

### 🐛 Corrigé
- **Erreur SQLite `no such column: b.prix_suggere`**
  - Ajout des colonnes `prix_suggere` et `devise` à la table `books` dans le schéma de base de données
  - Migration automatique pour les bases de données existantes
  - Ajout d'une fonction de sécurité `ensureBookColumns` pour garantir la présence des colonnes
- **Incohérence des compteurs entre sidebar et pages de collection**
  - Correction du compteur total dans l'en-tête des pages (affichage du nombre d'items filtrés au lieu du total brut)
  - Exclusion des séries masquées dans les compteurs de la sidebar pour cohérence avec l'affichage
  - Correction de la catégorisation des séries avec `media_type` NULL (comptées comme "Manga" au lieu de "Non classé")
- **Catégorie "Non classé" pour les séries sans media_type**
  - Création d'une nouvelle catégorie "Non classé" pour les séries avec `media_type` NULL ou vide
  - Ajout du lien "Non classé" dans la sidebar sous la section Lectures
  - Support du filtre "Non classé" dans les pages Lectures et Mangas
  - Comptage correct des séries non classées (131 entrées identifiées)

### 🔧 Amélioré
- **Champ `media_type` transformé en select**
  - Remplacement du champ texte par un menu déroulant avec options prédéfinies
  - Options disponibles : Non classé, Manga, Manhwa, Manhua, Light Novel, Novel, Webtoon, Comic, BD
  - Réduction des erreurs de saisie et standardisation des valeurs
  - Interface plus intuitive pour classer les séries non classées

### 🧹 Nettoyage
- **Suppression des modals non utilisés**
  - Suppression de `EditSerieForm.tsx` (remplacé par `EditSerieModal` avec `EditMalItemModal`)
  - Suppression de `ImportAdulteGameJsonModal.tsx` (non utilisé)
  - Suppression de `MalSyncOverlay.tsx` (non utilisé)

## [1.0.4] - 2025-11-30

### ✨ Ajouté
- **Fonction d'aide pour le système de recherche par page**
  - Modal d'aide explicative pour comprendre le fonctionnement du système de recherche par page
  - Accessible depuis toutes les pages de collections (Animes, Mangas, Films, Séries, Jeux Adultes)
  - Explications détaillées sur les fonctionnalités de recherche et de filtrage
- **Intégration Google Books pour BD et Comics**
  - Remplacement de l'API Comic Vine par Google Books pour les comics
  - Recherche unifiée BD et Comics via Google Books API
  - Filtrage automatique par langue (français uniquement) pour les comics
  - Détection intelligente des BD et Comics basée sur les catégories, éditeurs et mots-clés
  - Support des métadonnées complètes (auteurs, éditeurs, ISBN, descriptions)
  - Images de couverture fonctionnelles depuis Google Books
- **Pages dédiées pour BD et Comics**
  - Création de pages de collection dédiées `/bd` et `/comics`
  - Filtrage automatique par type de média (BD, Comic)
  - Interface cohérente avec les autres collections (Mangas, Livres)
  - Modales d'import dédiées avec recherche Google Books intégrée
  - Support complet des statuts de lecture, favoris et masquage
- **Recherche globale étendue**
  - Support de tous les types de contenu dans la recherche globale (Livres, Films, Séries)
  - Navigation directe vers les pages de détails depuis les résultats
  - Groupement des résultats par type avec compteurs
  - Icônes et labels spécifiques pour chaque type de contenu

### 🔧 Amélioré
- **Navigation et organisation des pages Lectures**
  - Regroupement de toutes les pages Lectures en sous-catégorie dans la navigation
  - Menu expandable "Lectures" avec sous-menus pour chaque type (Tout, Manga, Manhwa, Manhua, BD, Comics, Livres)
  - Navigation plus claire et organisée avec hiérarchie visuelle
  - Expansion automatique du menu "Lectures" lorsque l'utilisateur est sur une page de cette section
- **Compteurs d'entrées dans la navigation**
  - Affichage du nombre total d'entrées pour chaque collection dans la navigation
  - Compteur sur "Lectures" (parent) et "Tout" affichant le total de toutes les entrées Lectures
  - Compteurs individuels pour chaque sous-catégorie (Manga, Manhwa, Manhua, BD, Comics, Livres)
  - Compteurs pour les autres collections principales (Animes, Films, Séries, Jeux Adultes)
  - Rechargement automatique des compteurs lors de la navigation
  - Cohérence visuelle avec affichage entre parenthèses pour toutes les collections
- **Modales d'import BD et Comics**
  - Design harmonisé avec le reste de l'application
  - Affichage structuré des résultats (couverture, titre, auteurs, éditeur, année)
  - Indication visuelle des items déjà dans la collection
  - Badge indiquant la source (BnF ou Google Books) pour les BD
  - Gestion améliorée des descriptions HTML avec nettoyage et troncature
  - Feedback utilisateur amélioré avec messages d'erreur explicites
- **Gestion de la visibilité des contenus**
  - Consolidation de la visibilité "Lectures" : un seul toggle masque/affiche toute la section (Mangas, Manhua, Manhwa, BD, Comics, Livres)
  - Suppression du toggle séparé pour les Livres
  - Synchronisation automatique de `showBooks` avec `showMangas`
  - Cohérence dans l'onboarding et les paramètres

### 🐛 Corrigé
- Corrections multiples d'erreurs TypeScript dans les composants React
- Correction de la syntaxe JavaScript dans le serveur d'import (accolade manquante)
- Correction des types pour les composants de cartes (BookCard, etc.)
- Harmonisation des types SearchResult dans la recherche globale
- Correction des handlers d'import BD et Comics (gestion correcte des retours de création)
- Correction de l'affichage des images de couverture (conversion null → undefined)

### 🔄 Migration de base de données
- Migration automatique pour les colonnes `source_id` et `source_donnees` dans la table `manga_series`
- Nécessaire pour le support des BD et Comics (stockage des identifiants BNF et Google Books)
- Migration appliquée automatiquement au démarrage pour toutes les bases de données existantes

## [1.0.3] - 2025-11-29

### ✨ Ajouté
- **Scanner d'exécutables pour les jeux adultes**
  - Scan récursif d'un dossier pour détecter tous les fichiers .exe
  - Interface modale avec deux colonnes : exécutables trouvés et attribution au jeu
  - Recherche de jeux dans la base de données avec barre de recherche
  - Attribution en masse avec actions "Remplacer" ou "Ajouter"
  - Gestion des conflits lorsque plusieurs exécutables pointent vers le même jeu
  - Label personnalisé pour chaque exécutable (modifiable avant attribution)
  - Affichage du label personnalisé dans le dropdown de lancement du jeu (au lieu de "Version scanned-...")
  - Détection et affichage des doublons d'exécutables

### 🔧 Amélioré
- **Système de pagination amélioré**
  - Remontée automatique en haut de la liste lors du changement de page manuel
  - Préservation de la restauration du scroll lors du retour depuis une page de détails
  - Effacement automatique de la position de scroll sauvegardée lors des changements de page
  - Ajout de la pagination en haut de la page Animes (cohérence avec les autres collections)

## [1.0.2] - 2025-11-27

### ✨ Ajouté
- **Traduction automatique des genres et thèmes**
  - Traduction automatique de tous les genres et thèmes de l'anglais vers le français
  - Support de 179 traductions de genres et 54 traductions de thèmes
  - Gestion des variantes d'écriture (majuscules, espaces, tirets)
  - Déduplication automatique des genres et thèmes après traduction
  - Traduction appliquée dans les pages de détails des Animes et Mangas
  - Traduction des genres et thèmes dans les filtres de recherche des collections Animes et Mangas
  - Les valeurs originales (anglais) sont conservées en base de données pour la recherche, seul l'affichage est traduit
- **Traduction automatique des tags jeux adultes**
  - Dictionnaire complet de 95 traductions de tags jeux adultes
  - Support de toutes les catégories : graphismes, types de jeux, personnages, thèmes, actes sexuels
  - Traduction des tags dans les filtres de recherche de la collection Jeux Adultes
  - Traduction des tags dans les pages de détails des jeux adultes
  - Les valeurs originales (anglais) sont conservées en base de données pour la recherche, seul l'affichage est traduit
- **Traduction automatique des démographies**
  - Normalisation et traduction des démographies (Shounen → Shōnen, Shoujo → Shōjo, etc.)
  - Support de toutes les variantes d'écriture (avec/sans accent, majuscules/minuscules)
  - Traduction appliquée dans les pages de détails des Animes et Mangas

### 🐛 Corrigé
- **Erreur `isFieldUserModified is not defined` dans la synchronisation MAL**
  - Ajout de l'import manquant de `isFieldUserModified` dans `mal-sync-core.js`
  - Correction des erreurs lors de la synchronisation des mangas depuis MAL
- **Erreur `getPathManager is not defined` dans le scheduler de traductions**
  - Ajout du paramètre `getPathManager` manquant dans `adulte-game-traduction-scheduler.js`
  - Mise à jour de l'appel dans les handlers pour passer correctement le paramètre
- **Erreur SQLite dans `checkAnimeUpdates` du scheduler de notifications**
  - Correction de la requête SQL utilisant des tables inexistantes (`anime_episodes_vus`, `anime_statut_utilisateur`)
  - Remplacement par l'utilisation correcte de `anime_user_data` et du champ `episodes_vus`
  - Correction de la valeur de statut (`'watching'` → `'En cours'`)
- **Exclusion automatique des équipes de scanlation des genres et thèmes**
  - Exclusion automatique des noms d'équipes de scanlation dans les filtres de genres et thèmes
  - Filtrage appliqué pour les Animes et les Mangas (genres et thèmes)
  - Exclusion basée sur une liste complète de 200+ équipes de scanlation
  - Comparaison insensible à la casse, aux accents et aux espaces
  - Exclusion effectuée avant et après traduction pour garantir la propreté des listes
  - Exclusion également des ratings (Content rating: Suggestive, etc.) qui peuvent être stockés par erreur dans les genres

## [1.0.1] - 2025-11-26

### ✨ Ajouté
- **Système de filtres par genres et thèmes pour toutes les collections**
  - Filtres par genres et thèmes pour les Mangas (depuis Nautiljon, MAL)
  - Filtres par genres et thèmes pour les Animes (depuis MAL, Nautiljon)
  - Filtres par genres pour les Films et Séries TV (depuis TMDB)
  - Interface de sélection unifiée avec boutons toggle pour chaque genre/thème
  - Filtrage côté backend avec recherche dans les données (texte pour mangas/animes, JSON pour films/séries)
  - Compteur de genres/thèmes sélectionnés dans l'interface
  - Persistance des filtres sélectionnés en session
  - Intégration complète avec le système de filtres existant (recherche, statut, favoris, etc.)

### 🔧 Amélioré
- **Système de rapports unifié pour tous les imports, synchronisations et enrichissements**
  - Format standardisé basé sur le rapport Mihon
  - Sections détaillées : créés, mis à jour, ignorés, erreurs, matchs, correspondances potentielles
  - Rapport unique même pour les opérations multi-étapes (ex: Google Sheet + Scraping)
  - Rapports précis pour : Import Mihon, Sync MAL, Sync Nautiljon, Enrichissement, Jeux adultes
- **Gestion des titres alternatifs améliorée**
  - Fusion automatique intelligente des titres depuis différentes sources (Mihon, MAL, Nautiljon)
  - Déduplication avancée avec normalisation Unicode pour éviter les doublons
  - Conservation automatique de l'ancien titre principal dans les titres alternatifs lors d'un changement
  - Support correct des caractères asiatiques (japonais, coréen, chinois) dans la normalisation
  - Affichage séparé des titres romaji et anglais dans les pages de détails des mangas
- **Normalisation des données**
  - Normalisation des tags (genres et thèmes) depuis Nautiljon : séparateur " - " remplacé par ", " pour une meilleure cohérence
  - Normalisation appliquée également aux animes importés depuis Nautiljon

### 🐛 Corrigé
- Priorité des données Nautiljon : les données Nautiljon prévalent désormais sur MAL, Mihon et l'enrichissement automatique
- Correction du handler "posseder-tous-les-tomes" pour marquer tous les tomes comme possédés
- Mise à jour du lien de traduction pour les jeux adultes depuis Google Sheets
- Respect des champs modifiés par l'utilisateur pour les jeux adultes (titre, version, statut, etc.)

## [1.0.0] - 2025-11-26

### ✨ Ajouté
- **Gestion complète des Mangas**
  - Suivi détaillé des séries avec volumes et chapitres
  - Import automatique depuis Nautiljon via script Tampermonkey
  - Support de 9 types de volumes (Broché, Collector, Coffret, Kindle, Webtoon, etc.)
  - Gestion multi-propriétaires avec calcul automatique des coûts
  - Masquage de séries (conserve les données pour les autres utilisateurs)
  - Recherche et filtres avancés
  - Filtres avancés avec select multi-options : Tout, Mihon, Pas sur Mihon, My Anime List, Pas sur MyAnimeList, Nautiljon, Pas sur Nautiljon
  - Filtres combinés pour afficher plusieurs sources simultanément

- **Système de labels personnalisés pour Mangas et Animes**
  - Création et gestion de labels personnalisés avec couleurs
  - Labels partagés entre tous les éléments d'une même collection
  - Filtrage par labels dans les collections Mangas et Animes
  - Affichage des labels dans les pages de détails
  - Labels intégrés sous la section "Mon statut" pour les animes
  - Labels intégrés à droite de la section "Relations" pour les mangas

- **Gestion complète des Animes**
  - Architecture MyAnimeList pure avec import XML et synchronisation OAuth
  - Gestion complète des épisodes (TV, Movie, OVA, ONA, Special)
  - Progression de visionnage avec timestamps précis
  - 28 champs enrichis (titres multiples, genres, thèmes, studios, etc.)
  - Traduction automatique des synopsis via Groq AI
  - Liens de streaming depuis AniList
  - Amélioration de l'affichage des liens de streaming
    - Affichage uniquement de l'icône SVG pour les plateformes reconnues (Netflix, Crunchyroll, Disney+, etc.)
    - Icônes agrandies (48x48px) et directement cliquables
    - Affichage texte + icône pour les plateformes sans icône SVG
    - Section "Où regarder" intégrée dans la colonne de couverture

- **Gestion des Jeux Adultes**
  - Scraping automatique F95Zone et LewdCorner
  - Recherche par ID avec extraction complète (titre, version, statut, moteur, tags)
  - Authentification OAuth intégrée pour F95Zone & LewdCorner
  - Vérification automatique des mises à jour
  - Import JSON depuis scripts Tampermonkey (F95 Extractor, LC Extractor)
  - Données utilisateur-spécifiques (chemin exécutable, notes privées, statut personnel)
  - Lancement direct des jeux depuis l'application
  - Protection des images locales lors des mises à jour

- **Gestion des Films et Séries TV**
  - Import depuis TMDb avec métadonnées complètes
  - Gestion des saisons et épisodes pour les séries
  - Suivi de visionnage personnalisé
  - Distribution, genres, et informations détaillées

- **Système Multi-utilisateurs**
  - Onboarding guidé au premier lancement
  - Gestion dynamique des utilisateurs depuis les Paramètres
  - Profils personnalisés avec avatar (image ou emoji) et couleur
  - Données de lecture individuelles par utilisateur
  - Partage de l'achat avec calcul automatique des coûts

- **Fonctionnalités Avancées**
  - Synchronisation automatique avec MyAnimeList (OAuth)
  - Enrichissement automatique des données (Jikan API, AniList)
  - Propagation logique bidirectionnelle des relations entre entrées
  - Système de fusion avancé pour les entrées dupliquées
  - Thèmes clair/sombre
  - Personnalisation complète de l'affichage des fiches
  - Export des données en JSON
  - Sauvegarde automatique de la base de données
  - Scripts Tampermonkey pour l'import depuis Nautiljon, MyAnimeList, F95Zone

- **Interface Utilisateur**
  - Design moderne et responsive
  - Recherche globale avec raccourci clavier (Ctrl+K)
  - Tableaux de bord avec statistiques détaillées
  - Navigation intuitive entre les différentes sections
  - Modales de configuration et d'édition avancées

### 🔧 Amélioré
- Interface des pages de détails mieux organisée
- Optimisation de l'espace dans la colonne de couverture
- Meilleure intégration visuelle des sections personnalisables

### 🔧 Technique
- Architecture Electron + React + TypeScript
- Base de données SQLite avec migrations automatiques
- Système de logging backend vers frontend
- Gestion des erreurs avec ErrorBoundary
- Protection du contenu sensible (jeux adultes) avec mot de passe
- Support des chemins personnalisés pour la base de données (cloud sync)
- Optimisation des performances avec lazy loading et pagination

### 📝 Documentation
- README complet avec guide d'installation
- Documentation des scripts Tampermonkey
- Guide de configuration Discord pour les notifications de release

---

[1.0.4-Fix]: https://github.com/Rory-Mercury-91/Le-Nexus/releases/tag/v1.0.4-Fix
[1.0.4]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.4
[1.0.3]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.3
[1.0.2]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.2
[1.0.1]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.1
[1.0.0]: https://github.com/Rory-Mercury-91/le-nexus/releases/tag/v1.0.0
