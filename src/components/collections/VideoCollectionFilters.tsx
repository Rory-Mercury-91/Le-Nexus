import { ChevronDown } from 'lucide-react';
import { translateGenre, translateTheme } from '../../utils/translations';
import CollectionSearchBar from './CollectionSearchBar';
import FilterToggle from './FilterToggle';

export type VideoSortOption = 'title-asc' | 'title-desc' | 'date-desc' | 'date-asc' | 'score-desc' | 'popularite-desc';

export interface VideoCollectionFiltersProps {
  // Type de contenu (pour les labels)
  contentType: 'anime' | 'movie' | 'series' | 'video';

  // Barre de recherche
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenHelp?: () => void;

  // Filtres de tri
  sortBy: VideoSortOption;
  onSortChange: (value: VideoSortOption) => void;
  sortOptions?: VideoSortOption[]; // Options personnalisées si nécessaire

  // Filtre de statut de visionnage (completion utilisateur)
  completionFilter: string;
  onCompletionFilterChange: (value: string) => void;
  completionOptions: Array<{ value: string; label: string }>;

  // Filtre de statut de l'œuvre (publication/diffusion)
  workStatusFilter: string;
  onWorkStatusFilterChange: (value: string) => void;
  workStatusOptions: Array<{ value: string; label: string }>;

  // Toggles
  showFavoriteOnly: boolean;
  onShowFavoriteOnlyChange: (value: boolean) => void;
  showHidden: boolean;
  onShowHiddenChange: (value: boolean) => void;
  showMajOnly: boolean;
  onShowMajOnlyChange: (value: boolean) => void;

  // Actions
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;

  // Filtres additionnels (genres, thèmes, labels)
  availableGenres?: string[];
  selectedGenres?: string[];
  onGenreToggle?: (genre: string) => void;
  showGenresFilter?: boolean;
  onToggleGenresFilter?: () => void;

  availableThemes?: string[];
  selectedThemes?: string[];
  onThemeToggle?: (theme: string) => void;
  showThemesFilter?: boolean;
  onToggleThemesFilter?: () => void;

  availableLabels?: Array<{ label: string; count?: number; color?: string }>;
  selectedLabels?: string[];
  onLabelToggle?: (label: string) => void;
  showLabelsFilter?: boolean;
  onToggleLabelsFilter?: () => void;
}

const DEFAULT_SORT_OPTIONS: VideoSortOption[] = [
  'title-asc',
  'title-desc',
  'date-desc',
  'date-asc',
  'score-desc',
  'popularite-desc'
];

const SORT_LABELS: Record<VideoSortOption, string> = {
  'title-asc': '📖 Titre (A → Z)',
  'title-desc': '📖 Titre (Z → A)',
  'date-desc': '🆕 Ajout récent',
  'date-asc': '🕐 Ajout ancien',
  'score-desc': '⭐ Score ↓',
  'popularite-desc': '🔥 Popularité ↓'
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  anime: 'Animés',
  movie: 'Films',
  series: 'Séries',
  video: 'Vidéos'
};

export default function VideoCollectionFilters({
  contentType,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  onOpenHelp,
  sortBy,
  onSortChange,
  sortOptions = DEFAULT_SORT_OPTIONS,
  completionFilter,
  onCompletionFilterChange,
  completionOptions,
  workStatusFilter,
  onWorkStatusFilterChange,
  workStatusOptions,
  showFavoriteOnly,
  onShowFavoriteOnlyChange,
  showHidden,
  onShowHiddenChange,
  showMajOnly,
  onShowMajOnlyChange,
  hasActiveFilters = false,
  onClearFilters,
  // Filtres additionnels
  availableGenres = [],
  selectedGenres = [],
  onGenreToggle,
  showGenresFilter = false,
  onToggleGenresFilter,
  availableThemes = [],
  selectedThemes = [],
  onThemeToggle,
  showThemesFilter = false,
  onToggleThemesFilter,
  availableLabels = [],
  selectedLabels = [],
  onLabelToggle,
  showLabelsFilter = false,
  onToggleLabelsFilter
}: VideoCollectionFiltersProps) {
  const hiddenLabel = `👁️ ${CONTENT_TYPE_LABELS[contentType] || 'Éléments'} masqués`;
  const hasAdditionalFilters = availableGenres.length > 0 || availableThemes.length > 0 || availableLabels.length > 0;

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Barre de recherche avec aide */}
      <CollectionSearchBar
        placeholder={searchPlaceholder || `Rechercher un ${contentType}...`}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onSubmit={() => undefined}
        showSubmitButton={false}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        onOpenHelp={onOpenHelp}
      />

      {/* Ligne 1 : Filtres de tri et statuts */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto', marginBottom: '12px', marginTop: '16px' }}>
        {/* Filtre de tri */}
        <select
          className="select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as VideoSortOption)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          {sortOptions.map(option => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>

        {/* Filtre de statut de visionnage (completion utilisateur) */}
        <select
          className="select"
          value={completionFilter}
          onChange={(e) => onCompletionFilterChange(e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          {completionOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Filtre de statut de l'œuvre (publication/diffusion) */}
        <select
          className="select"
          value={workStatusFilter}
          onChange={(e) => onWorkStatusFilterChange(e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          {workStatusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ligne 2 : Toggles */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
        <FilterToggle
          checked={showFavoriteOnly}
          onChange={onShowFavoriteOnlyChange}
          label="❤️ Favoris"
          icon="❤️"
          activeColor="var(--error)"
        />

        <FilterToggle
          checked={showHidden}
          onChange={onShowHiddenChange}
          label={hiddenLabel}
          icon="👁️"
          activeColor="#fb923c"
        />

        <FilterToggle
          checked={showMajOnly}
          onChange={onShowMajOnlyChange}
          label="🔄 MAJ disponibles"
          icon="🔄"
          activeColor="#10b981"
        />
      </div>

      {/* Filtres additionnels (genres, thèmes, labels) - intégrés dans la même section */}
      {hasAdditionalFilters && (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          {/* Filtre par genres */}
          {availableGenres.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={onToggleGenresFilter}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: showGenresFilter ? '12px' : '0'
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  🎭 Filtrer par genres
                  {selectedGenres.length > 0 && (
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                      {selectedGenres.length}
                    </span>
                  )}
                </h3>
                <ChevronDown
                  size={20}
                  style={{
                    color: 'var(--text-secondary)',
                    transform: showGenresFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>
              {showGenresFilter && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {availableGenres.map(genre => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => onGenreToggle?.(genre)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: isSelected ? '600' : '500',
                          border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(34, 197, 94, 0.3)',
                          background: isSelected ? 'var(--primary)' : 'rgba(34, 197, 94, 0.15)',
                          color: isSelected ? 'white' : '#86efac',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {translateGenre(genre)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filtre par thèmes */}
          {availableThemes.length > 0 && (
            <div style={{ marginBottom: '20px', paddingTop: availableGenres.length > 0 ? '20px' : '0', borderTop: availableGenres.length > 0 ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={onToggleThemesFilter}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: showThemesFilter ? '12px' : '0'
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  🎨 Filtrer par thèmes
                  {selectedThemes.length > 0 && (
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                      {selectedThemes.length}
                    </span>
                  )}
                </h3>
                <ChevronDown
                  size={20}
                  style={{
                    color: 'var(--text-secondary)',
                    transform: showThemesFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>
              {showThemesFilter && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {availableThemes.map(theme => {
                    const isSelected = selectedThemes.includes(theme);
                    return (
                      <button
                        key={theme}
                        onClick={() => onThemeToggle?.(theme)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: isSelected ? '600' : '500',
                          border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(168, 85, 247, 0.3)',
                          background: isSelected ? 'var(--primary)' : 'rgba(168, 85, 247, 0.15)',
                          color: isSelected ? 'white' : '#c4b5fd',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {translateTheme(theme)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Filtre par labels */}
          {availableLabels.length > 0 && (
            <div style={{ marginTop: (availableGenres.length > 0 || availableThemes.length > 0) ? '20px' : '0', paddingTop: (availableGenres.length > 0 || availableThemes.length > 0) ? '20px' : '0', borderTop: (availableGenres.length > 0 || availableThemes.length > 0) ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={onToggleLabelsFilter}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: showLabelsFilter ? '12px' : '0'
                }}
              >
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  🏷️ Filtrer par labels
                  {selectedLabels.length > 0 && (
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: '600' }}>
                      {selectedLabels.length}
                    </span>
                  )}
                </h3>
                <ChevronDown
                  size={20}
                  style={{
                    color: 'var(--text-secondary)',
                    transform: showLabelsFilter ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </button>
              {showLabelsFilter && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                  {availableLabels.map(labelObj => {
                    const isSelected = selectedLabels.includes(labelObj.label);
                    const labelColor = labelObj.color || '#3b82f6';
                    return (
                      <button
                        key={labelObj.label}
                        onClick={() => onLabelToggle?.(labelObj.label)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '600',
                          border: isSelected ? `2px solid ${labelColor}` : `2px solid ${labelColor}40`,
                          background: isSelected ? labelColor : `${labelColor}20`,
                          color: isSelected ? 'white' : labelColor,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {labelObj.label}{labelObj.count !== undefined ? ` (${labelObj.count})` : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
