import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SubNavigationTabs from '../../../../components/common/SubNavigationTabs';

interface LectureNavigationTabsProps {
  availableContentTypes: {
    manga: number;
    manhwa: number;
    manhua: number;
    lightNovel: number;
    books: number;
    comics: number;
    bd: number;
    webtoon: number;
    oneShot?: number;
    unclassified?: number;
  } | null;
}

export default function LectureNavigationTabs({ availableContentTypes }: LectureNavigationTabsProps) {
  const location = useLocation();

  // Calculer le total de tous les types
  const total = useMemo(() => {
    if (!availableContentTypes) return 0;
    return (
      (availableContentTypes.manga || 0) +
      (availableContentTypes.manhwa || 0) +
      (availableContentTypes.manhua || 0) +
      (availableContentTypes.lightNovel || 0) +
      (availableContentTypes.webtoon || 0) +
      (availableContentTypes.comics || 0) +
      (availableContentTypes.bd || 0) +
      (availableContentTypes.books || 0) +
      (availableContentTypes.oneShot || 0) +
      (availableContentTypes.unclassified || 0)
    );
  }, [availableContentTypes]);

  return (
    <SubNavigationTabs
      currentPath={location.pathname}
      tabs={[
        {
          path: '/lectures',
          icon: '📚',
          label: 'Tout',
          count: total
        },
        {
          path: '/lectures/manga',
          icon: '📘',
          label: 'Manga',
          count: availableContentTypes?.manga || 0,
          condition: (availableContentTypes?.manga || 0) > 0
        },
        {
          path: '/lectures/manhwa',
          icon: '📙',
          label: 'Manhwa',
          count: availableContentTypes?.manhwa || 0,
          condition: (availableContentTypes?.manhwa || 0) > 0
        },
        {
          path: '/lectures/manhua',
          icon: '📕',
          label: 'Manhua',
          count: availableContentTypes?.manhua || 0,
          condition: (availableContentTypes?.manhua || 0) > 0
        },
        {
          path: '/lectures/light-novel',
          icon: '📓',
          label: 'Light Novel',
          count: availableContentTypes?.lightNovel || 0,
          condition: (availableContentTypes?.lightNovel || 0) > 0
        },
        {
          path: '/lectures/books',
          icon: '📖',
          label: 'Livres',
          count: availableContentTypes?.books || 0,
          condition: (availableContentTypes?.books || 0) > 0
        },
        {
          path: '/lectures/comics',
          icon: '🦸',
          label: 'Comics',
          count: availableContentTypes?.comics || 0,
          condition: (availableContentTypes?.comics || 0) > 0
        },
        {
          path: '/lectures/bd',
          icon: '📗',
          label: 'BD',
          count: availableContentTypes?.bd || 0,
          condition: (availableContentTypes?.bd || 0) > 0
        },
        {
          path: '/lectures/webtoon',
          icon: '📱',
          label: 'Webtoon',
          count: availableContentTypes?.webtoon || 0,
          condition: (availableContentTypes?.webtoon || 0) > 0
        },
        {
          path: '/lectures/one-shot',
          icon: '📄',
          label: 'One-shot',
          count: availableContentTypes?.oneShot || 0,
          condition: (availableContentTypes?.oneShot || 0) > 0
        },
        {
          path: '/lectures/unclassified',
          icon: '❓',
          label: 'Non classé',
          count: availableContentTypes?.unclassified || 0,
          condition: (availableContentTypes?.unclassified || 0) > 0
        }
      ]}
    />
  );
}
