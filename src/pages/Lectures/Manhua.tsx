import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'manhua',
  storageKey: 'lectures.manhua',
  title: 'Collection Manhua',
  icon: '📕',
  searchPlaceholder: 'Rechercher un manhua (titre ou MAL ID)...',
  emptyMessage: 'Aucun manhua dans votre collection',
  emptyIconEmoji: '📕'
};

export default function Manhua() {
  return <LectureCollectionPage config={config} />;
}
