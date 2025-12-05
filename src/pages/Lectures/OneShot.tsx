import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'oneShot',
  storageKey: 'lectures.oneshot',
  title: 'Collection One-shot',
  icon: '📄',
  searchPlaceholder: 'Rechercher un one-shot (titre ou MAL ID)...',
  emptyMessage: 'Aucun one-shot dans votre collection',
  emptyIconEmoji: '📄'
};

export default function OneShot() {
  return <LectureCollectionPage config={config} />;
}
