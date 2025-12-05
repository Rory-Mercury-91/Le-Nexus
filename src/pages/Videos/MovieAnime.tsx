import AnimeCollectionPage from './common/components/AnimeCollectionPage';
import { AnimeCollectionPageConfig } from './common/utils/anime-page-config';

const config: AnimeCollectionPageConfig = {
  animeType: 'Movie',
  storageKey: 'videos.movie-anime',
  title: 'Collection Anime - Films animé',
  icon: '🎞️',
  searchPlaceholder: 'Rechercher un film animé (titre, MAL ID ou AniList ID)...',
  emptyMessage: 'Aucun film animé dans votre collection',
  emptyIconEmoji: '🎞️'
};

export default function MovieAnime() {
  return <AnimeCollectionPage config={config} />;
}
