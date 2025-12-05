import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'comics',
  storageKey: 'lectures.comics',
  title: 'Collection Comics',
  icon: '🦸',
  searchPlaceholder: 'Rechercher un comic...',
  emptyMessage: 'Aucun comic dans votre collection',
  emptyIconEmoji: '🦸'
};

export default function Comics() {
  return <LectureCollectionPage config={config} />;
}
