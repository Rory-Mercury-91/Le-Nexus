import GameCollectionPage from './common/components/GameCollectionPage';
import { GameCollectionPageConfig } from './common/utils/game-page-config';

const config: GameCollectionPageConfig = {
  filterType: 'adulte',
  storageKey: 'games.adulte',
  title: 'Collection Jeux - Jeux Adulte',
  icon: '🎮',
  searchPlaceholder: 'Rechercher un jeu adulte (titre, F95 ID, LewdCorner ID)...',
  emptyMessage: 'Aucun jeu adulte dans votre collection',
  emptyIconEmoji: '🎮'
};

export default function AdulteGames() {
  return <GameCollectionPage config={config} />;
}
