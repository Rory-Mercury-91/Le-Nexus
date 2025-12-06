import GameCollectionPage from './common/components/GameCollectionPage';
import { GameCollectionPageConfig } from './common/utils/game-page-config';

const config: GameCollectionPageConfig = {
  filterType: 'rawg',
  storageKey: 'games.video',
  title: 'Collection Jeux - Jeux Vidéo',
  icon: '🎮',
  searchPlaceholder: 'Rechercher un jeu vidéo (titre, ID RAWG ou URL)...',
  emptyMessage: 'Aucun jeu vidéo dans votre collection',
  emptyIconEmoji: '🎮'
};

export default function VideoGames() {
  return <GameCollectionPage config={config} />;
}
