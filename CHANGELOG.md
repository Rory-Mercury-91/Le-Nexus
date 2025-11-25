# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2025-11-25

### ✨ Ajouté
- **Gestion complète des Mangas**
  - Suivi détaillé des séries avec volumes et chapitres
  - Import automatique depuis Nautiljon via script Tampermonkey
  - Support de 9 types de volumes (Broché, Collector, Coffret, Kindle, Webtoon, etc.)
  - Gestion multi-propriétaires avec calcul automatique des coûts
  - Masquage de séries (conserve les données pour les autres utilisateurs)
  - Recherche et filtres avancés

- **Gestion complète des Animes**
  - Architecture MyAnimeList pure avec import XML et synchronisation OAuth
  - Gestion complète des épisodes (TV, Movie, OVA, ONA, Special)
  - Progression de visionnage avec timestamps précis
  - 28 champs enrichis (titres multiples, genres, thèmes, studios, etc.)
  - Traduction automatique des synopsis via Groq AI
  - Liens de streaming depuis AniList

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

[1.0.0]: https://github.com/VOTRE_USERNAME/le-nexus/releases/tag/v1.0.0
