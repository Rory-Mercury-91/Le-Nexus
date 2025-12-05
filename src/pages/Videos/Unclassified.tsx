import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'Unclassified',
  storageKey: 'videos.unclassified',
  title: 'Collection Anime - Non classé',
  icon: '❓',
  searchPlaceholder: 'Rechercher un anime non classé (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun animé non classé dans votre collection',
  emptyIconEmoji: '❓'
};

export default function Unclassified() {
  return <AnimeCollectionPage config={config} />;
}
