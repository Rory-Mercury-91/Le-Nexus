import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'ONA',
  storageKey: 'videos.ona',
  title: 'Collection Anime - ONA',
  icon: '🌐',
  searchPlaceholder: 'Rechercher un anime ONA (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun animé ONA dans votre collection',
  emptyIconEmoji: '🌐'
};

export default function ONA() {
  return <AnimeCollectionPage config={config} />;
}
