# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

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

---

[1.0.1]: https://github.com/VOTRE_USERNAME/le-nexus/releases/tag/v1.0.1
[1.0.0]: https://github.com/VOTRE_USERNAME/le-nexus/releases/tag/v1.0.0
