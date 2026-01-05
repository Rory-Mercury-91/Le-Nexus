import { useLocation } from 'react-router-dom';
import SubNavigationTabs from '../../../../components/common/SubNavigationTabs';

interface VideoNavigationTabsProps {
  videoCounts: {
    movies: number;
    series: number;
    total: number;
  };
  animeTypeCounts: {
    TV: number;
    OVA: number;
    ONA: number;
    Movie: number;
    Special: number;
    Unclassified: number;
  };
}

export default function VideoNavigationTabs({ videoCounts, animeTypeCounts }: VideoNavigationTabsProps) {
  const location = useLocation();

  return (
    <SubNavigationTabs
      currentPath={location.pathname}
      tabs={[
        {
          path: '/videos/all',
          icon: '🎬',
          label: 'Tout',
          count: videoCounts.total
        },
        {
          path: '/videos/movies',
          icon: '🎞️',
          label: 'Films',
          count: videoCounts.movies
        },
        {
          path: '/videos/series',
          icon: '📺',
          label: 'Séries',
          count: videoCounts.series
        },
        {
          path: '/videos/tv',
          icon: '📺',
          label: 'TV',
          count: animeTypeCounts.TV
        },
        {
          path: '/videos/ona',
          icon: '🌐',
          label: 'ONA',
          count: animeTypeCounts.ONA
        },
        {
          path: '/videos/ova',
          icon: '💿',
          label: 'OVA',
          count: animeTypeCounts.OVA
        },
        {
          path: '/videos/special',
          icon: '⭐',
          label: 'Spécial',
          count: animeTypeCounts.Special
        },
        {
          path: '/videos/movie-anime',
          icon: '🎞️',
          label: 'Films animé',
          count: animeTypeCounts.Movie
        },
        {
          path: '/videos/unclassified',
          icon: '❓',
          label: 'Non classé',
          count: animeTypeCounts.Unclassified,
          condition: animeTypeCounts.Unclassified > 0
        }
      ]}
    />
  );
}
