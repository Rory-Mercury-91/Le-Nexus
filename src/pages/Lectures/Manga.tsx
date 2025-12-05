import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'manga',
  storageKey: 'lectures.manga',
  title: 'Collection Manga',
  icon: '📘',
  searchPlaceholder: 'Rechercher un manga (titre ou MAL ID)...',
  emptyMessage: 'Aucun manga dans votre collection',
  emptyIconEmoji: '📘'
};

export default function Manga() {
  return <LectureCollectionPage config={config} />;
}
