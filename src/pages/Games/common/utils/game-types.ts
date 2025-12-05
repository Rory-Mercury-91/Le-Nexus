import { AdulteGame } from '../../../../types';

/**
 * Types de moteurs de jeu disponibles
 */
export type GameEngineType = 
  | 'all'
  | 'ADRIFT'
  | 'Flash'
  | 'HTML'
  | 'Java'
  | 'Others'
  | 'QSP'
  | 'RAGS'
  | 'RPGM'
  | 'RenPy'
  | 'Ren\'Py'
  | 'Tads'
  | 'Unity'
  | 'Unreal Engine'
  | 'Unreal'
  | 'WebGL'
  | 'WolfRPG'
  | 'Wolf RPG'
  | 'Autre'
  | 'rawg';

/**
 * Type union pour les items de jeux
 */
export type GameItem = AdulteGame;

/**
 * Type de filtre pour les pages de jeux
 */
export type GameFilterType = 'all' | 'rawg' | 'adulte';

/**
 * Configuration pour les pages de collection de jeux
 */
export interface GameCollectionPageConfig {
  /** Type de moteur à filtrer (pour compatibilité) */
  engineType?: GameEngineType;
  /** Type de filtre par site (RAWG vs F95Zone/LewdCorner) */
  filterType?: GameFilterType;
  /** Clé de stockage pour la persistance (ex: 'games.all', 'games.rawg') */
  storageKey: string;
  /** Titre de la page (ex: 'Collection Jeux - RAWG') */
  title: string;
  /** Icône de la page (ex: '🎮') */
  icon: string;
  /** Placeholder pour la barre de recherche */
  searchPlaceholder: string;
  /** Message vide par défaut (ex: 'Aucun jeu RAWG dans votre collection') */
  emptyMessage: string;
  /** Emoji pour l'icône vide (ex: '🎮') */
  emptyIconEmoji: string;
}
