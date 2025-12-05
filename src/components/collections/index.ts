export { default as BackToTopButton } from './BackToTopButton';
export { default as BackToBottomButton } from './BackToBottomButton';
export { default as CollectionFiltersBar } from './CollectionFiltersBar';
export { default as CollectionHeader } from './CollectionHeader';
export { default as CollectionSearchBar } from './CollectionSearchBar';
export { default as FilterToggle } from './FilterToggle';
export { default as Pagination } from './Pagination';
export { default as ProgressionHeader } from './ProgressionHeader';
export { default as VideoCollectionFilters } from './VideoCollectionFilters';
export { default as LectureCollectionFilters } from './LectureCollectionFilters';

export type { ProgressionStats } from './ProgressionHeader';
export type { VideoCollectionFiltersProps, VideoSortOption } from './VideoCollectionFilters';
export type { LectureCollectionFiltersProps, LectureSortOption } from './LectureCollectionFilters';

// Type pour le tri (utilisé dans les pages)
export type SortOption =
  | 'title-asc'
  | 'title-desc'
  | 'date-asc'
  | 'date-desc'
  | 'cost-asc'
  | 'cost-desc'
  | 'platform-asc'
  | 'platform-desc';
