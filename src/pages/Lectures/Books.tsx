import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'books',
  storageKey: 'lectures.books',
  title: 'Collection Livres',
  icon: '📖',
  searchPlaceholder: 'Rechercher un livre...',
  emptyMessage: 'Aucun livre dans votre collection',
  emptyIconEmoji: '📖'
};

export default function Books() {
  return <LectureCollectionPage config={config} />;
}
