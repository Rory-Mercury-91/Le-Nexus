import LectureCollectionPage from './common/components/LectureCollectionPage';
import { LectureCollectionPageConfig } from './common/utils/lecture-page-config';

const config: LectureCollectionPageConfig = {
  contentType: 'unclassified',
  storageKey: 'lectures.unclassified',
  title: 'Collection Non classé',
  icon: '❓',
  searchPlaceholder: 'Rechercher une œuvre non classée...',
  emptyMessage: 'Aucune œuvre non classée dans votre collection',
  emptyIconEmoji: '❓'
};

export default function Unclassified() {
  return <LectureCollectionPage config={config} />;
}
