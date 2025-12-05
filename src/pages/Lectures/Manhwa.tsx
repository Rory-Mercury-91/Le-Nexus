import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'manhwa',
  storageKey: 'lectures.manhwa',
  title: 'Collection Manhwa',
  icon: '📙',
  searchPlaceholder: 'Rechercher un manhwa (titre ou MAL ID)...',
  emptyMessage: 'Aucun manhwa dans votre collection',
  emptyIconEmoji: '📙'
};

export default function Manhwa() {
  return <LectureCollectionPage config={config} />;
}
