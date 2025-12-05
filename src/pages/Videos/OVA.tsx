import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'OVA',
  storageKey: 'videos.ova',
  title: 'Collection Anime - OVA',
  icon: '💿',
  searchPlaceholder: 'Rechercher un anime OVA (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun animé OVA dans votre collection',
  emptyIconEmoji: '💿'
};

export default function OVA() {
  return <AnimeCollectionPage config={config} />;
}
