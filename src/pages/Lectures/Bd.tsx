import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'bd',
  storageKey: 'lectures.bd',
  title: 'Collection BD',
  icon: '📗',
  searchPlaceholder: 'Rechercher une BD...',
  emptyMessage: 'Aucune BD dans votre collection',
  emptyIconEmoji: '📗'
};

export default function Bd() {
  return <LectureCollectionPage config={config} />;
}
