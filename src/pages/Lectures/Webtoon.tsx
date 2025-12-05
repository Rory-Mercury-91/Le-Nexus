import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'webtoon',
  storageKey: 'lectures.webtoon',
  title: 'Collection Webtoon',
  icon: '📱',
  searchPlaceholder: 'Rechercher un webtoon (titre ou MAL ID)...',
  emptyMessage: 'Aucun webtoon dans votre collection',
  emptyIconEmoji: '📱'
};

export default function Webtoon() {
  return <LectureCollectionPage config={config} />;
}
