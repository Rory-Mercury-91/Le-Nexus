import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'lightNovel',
  storageKey: 'lectures.lightNovel',
  title: 'Collection Light Novel',
  icon: '📓',
  searchPlaceholder: 'Rechercher un light novel (titre ou MAL ID)...',
  emptyMessage: 'Aucun light novel dans votre collection',
  emptyIconEmoji: '📓'
};

export default function LightNovel() {
  return <LectureCollectionPage config={config} />;
}
