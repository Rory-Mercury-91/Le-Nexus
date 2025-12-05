import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'Special',
  storageKey: 'videos.special',
  title: 'Collection Anime - Spécial',
  icon: '⭐',
  searchPlaceholder: 'Rechercher un anime spécial (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun animé spécial dans votre collection',
  emptyIconEmoji: '⭐'
};

export default function Special() {
  return <AnimeCollectionPage config={config} />;
}
