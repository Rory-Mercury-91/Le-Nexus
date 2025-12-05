import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'all',
  storageKey: 'lectures.all',
  title: 'Collection Lectures',
  icon: '📚',
  searchPlaceholder: 'Rechercher une série (titre ou MAL ID)...',
  emptyMessage: 'Aucune œuvre dans votre collection',
  emptyIconEmoji: '📚'
};

export default function All() {
  return <LectureCollectionPage config={config} />;
}
