import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'TV',
  storageKey: 'videos.tv',
  title: 'Collection Anime - TV',
  icon: '📺',
  searchPlaceholder: 'Rechercher un anime TV (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun animé TV dans votre collection',
  emptyIconEmoji: '📺'
};

export default function TV() {
  return <AnimeCollectionPage config={config} />;
}
