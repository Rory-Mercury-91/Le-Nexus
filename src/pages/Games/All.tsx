import GameCollectionPage from './common/components/GameCollectionPage';
import { GameCollectionPageConfig } from './common/utils/game-page-config';

const config: GameCollectionPageConfig = {
  engineType: 'all',
  storageKey: 'games.all',
  title: 'Collection Jeux',
  icon: '🎮',
  searchPlaceholder: 'Rechercher un jeu (titre, F95 ID, LewdCorner ID, RAWG ID/URL)...',
  emptyMessage: 'Aucun jeu dans votre collection',
  emptyIconEmoji: '🎮'
};

export default function All() {
  return <GameCollectionPage config={config} />;
}
