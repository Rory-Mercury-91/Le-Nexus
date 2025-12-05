import { AdulteGame } from '../../../../types';
import { GameEngineType } from './game-types';

/**
 * Normalise le nom du moteur pour gérer les variantes
 */
export function normalizeGameEngine(engine: string | null | undefined): string {
  if (!engine) return 'Autre';

  const trimmed = engine.trim();

  // Mapping des variantes vers les types standardisés
  const engineMap: Record<string, string> = {
    'renpy': 'RenPy',
    'ren\'py': 'RenPy',
    'ren`py': 'RenPy',
    'unity': 'Unity',
    'rpgm': 'RPGM',
    'unreal': 'Unreal',
    'unreal engine': 'Unreal Engine',
    'html': 'HTML',
    'flash': 'Flash',
    'qsp': 'QSP',
    'adrift': 'ADRIFT',
    'rags': 'RAGS',
    'tads': 'Tads',
    'java': 'Java',
    'webgl': 'WebGL',
    'wolfrpg': 'WolfRPG',
    'wolf rpg': 'WolfRPG',
    'others': 'Others',
    'autre': 'Autre'
  };

  const normalized = trimmed.toLowerCase().trim();
  return engineMap[normalized] || trimmed;
}

/**
 * Vérifie si un jeu correspond à un type de filtre (par site)
 */
export function matchesGameFilter(game: AdulteGame, filterType: 'all' | 'rawg' | 'adulte'): boolean {
  if (filterType === 'all') return true;

  const gameSite = game.game_site || game.plateforme || null;

  if (filterType === 'rawg') {
    return gameSite === 'RAWG';
  }

  if (filterType === 'adulte') {
    // Jeux adultes = tout sauf RAWG
    return gameSite !== 'RAWG';
  }

  return true;
}

/**
 * Vérifie si un jeu correspond à un type de moteur (pour compatibilité)
 */
export function matchesEngineType(game: AdulteGame, engineType: GameEngineType): boolean {
  if (engineType === 'all') return true;

  // Cas spécial pour RAWG : filtrer par game_site au lieu de game_engine
  if (engineType === 'rawg') {
    const gameSite = game.game_site || game.plateforme || null;
    return gameSite === 'RAWG';
  }

  const gameEngine = game.game_engine || game.moteur || null;
  if (!gameEngine) {
    // Si le moteur n'est pas défini, il correspond uniquement à "Autre" ou "all"
    // Mais exclure les jeux RAWG qui doivent aller sur leur propre page
    const gameSite = game.game_site || game.plateforme || null;
    if (gameSite === 'RAWG') {
      return false; // Les jeux RAWG ne vont pas dans "Autre"
    }
    return engineType === 'Autre';
  }

  const normalizedGameEngine = normalizeGameEngine(gameEngine);
  const normalizedEngineType = normalizeGameEngine(engineType);

  // Gérer les cas spéciaux
  if (normalizedEngineType === 'Unreal' && normalizedGameEngine === 'Unreal Engine') {
    return true;
  }
  if (normalizedEngineType === 'Unreal Engine' && normalizedGameEngine === 'Unreal') {
    return true;
  }
  if (normalizedEngineType === 'Ren\'Py' && normalizedGameEngine === 'RenPy') {
    return true;
  }
  if (normalizedEngineType === 'RenPy' && normalizedGameEngine === 'Ren\'Py') {
    return true;
  }
  if (normalizedEngineType === 'Wolf RPG' && normalizedGameEngine === 'WolfRPG') {
    return true;
  }
  if (normalizedEngineType === 'WolfRPG' && normalizedGameEngine === 'Wolf RPG') {
    return true;
  }

  return normalizedGameEngine === normalizedEngineType;
}

/**
 * Détecte et extrait l'ID depuis une URL F95Zone/LewdCorner ou un nombre
 */
export function detectGameUrlOrId(term: string): { type: 'f95' | 'lewdcorner' | 'id' | null; id: string | null } {
  // Détecter URL F95Zone
  const f95UrlMatch = term.match(/f95zone\.to\/threads\/([^\/]+)\.(\d+)/i);
  if (f95UrlMatch) {
    return { type: 'f95', id: f95UrlMatch[2] };
  }

  // Détecter URL LewdCorner
  const lcUrlMatch = term.match(/lewdcorner\.(?:com|net)\/games\/(\d+)/i);
  if (lcUrlMatch) {
    return { type: 'lewdcorner', id: lcUrlMatch[1] };
  }

  // Si c'est juste un nombre, on assume que c'est un ID F95Zone (plus commun)
  if (/^\d+$/.test(term.trim())) {
    return { type: 'id', id: term.trim() };
  }

  return { type: null, id: null };
}
