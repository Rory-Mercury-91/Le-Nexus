import { useEffect, useState } from 'react';

export type ViewMode = 'grid' | 'list' | 'images';

/**
 * Hook pour gérer le mode d'affichage d'une collection avec persistance dans localStorage
 * @param collectionType - Type de collection ('animes', 'mangas', 'adulte-game', 'series', 'movies')
 * @returns [viewMode, handleViewModeChange]
 */
export function useCollectionViewMode(collectionType: 'animes' | 'mangas' | 'adulte-game' | 'series' | 'movies') {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const savedMode = localStorage.getItem(`${collectionType}ViewMode`) as ViewMode;
    if (savedMode) {
      setViewMode(savedMode);
    }
  }, [collectionType]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(`${collectionType}ViewMode`, mode);
  };

  return [viewMode, handleViewModeChange] as const;
}
