import { ChevronDown } from 'lucide-react';
import { SerieFilters } from '../../types';
import { translateGenre, translateTheme } from '../../utils/translations';
import { COMMON_STATUSES, formatStatusLabel } from '../../utils/status';
import { MANGA_VOLUME_TYPE_OPTIONS, LectureSortOption } from '../../pages/Lectures/common/utils/constants';
import CollectionSearchBar from './CollectionSearchBar';
import FilterToggle from './FilterToggle';

export type { LectureSortOption } from '../../pages/Lectures/common/utils/constants';

export interface LectureCollectionFiltersProps {
  // Barre de recherche
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenHelp?: () => void;

  // Filtres de tri
  sortBy: LectureSortOption;
  onSortChange: (value: LectureSortOption) => void;

  // Filtre de statut de lecture (completion utilisateur)
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;

  // Filtres spécifiques aux séries
  filters: SerieFilters;
  onFilterChange: (key: string, value: string) => void;

  // Filtre Mihon/Source
  mihonFilter: string;
  onMihonFilterChange: (value: string) => void;

  // Sites disponibles pour le filtre source_id
  availableSites?: Array<{ id: string; name: string; baseUrl: string }>;

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

  availableLabels?: Array<{ label: string; color: string }>;
  selectedLabels?: string[];
  onLabelToggle?: (label: string) => void;
  showLabelsFilter?: boolean;
  onToggleLabelsFilter?: () => void;
}

const SORT_LABELS: Record<LectureSortOption, string> = {
  'title-asc': '📖 Titre (A → Z)',
  'title-desc': '📖 Titre (Z → A)',
  'date-desc': '🆕 Ajout récent',
  'date-asc': '🕐 Ajout ancien',
  'cost-desc': '💰 Coût total (décroissant)',
  'cost-asc': '💰 Coût total (croissant)'
};

export default function LectureCollectionFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  onOpenHelp,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  filters,
  onFilterChange,
  mihonFilter,
  onMihonFilterChange,
  availableSites = [],
  showFavoriteOnly,
  onShowFavoriteOnlyChange,
  showHidden,
  onShowHiddenChange,
  showMajOnly,
  onShowMajOnlyChange,
  hasActiveFilters = false,
  onClearFilters,
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
}: LectureCollectionFiltersProps) {
  const hasAdditionalFilters = availableGenres.length > 0 || availableThemes.length > 0 || availableLabels.length > 0;

  const statusOptions = [
    { value: '', label: '🔍 Tous les statuts' },
    ...COMMON_STATUSES.MANGA.map(status => ({
      value: status,
      label: formatStatusLabel(status, { category: 'manga' })
    }))
  ];

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Barre de recherche */}
      <CollectionSearchBar
        placeholder={searchPlaceholder || 'Rechercher une série (titre ou MAL ID)...'}
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
          onChange={(e) => onSortChange(e.target.value as LectureSortOption)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Filtre de statut de lecture */}
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Filtre de statut de publication */}
        <select
          className="select"
          value={filters.statut || ''}
          onChange={(e) => onFilterChange('statut', e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          <option value="">🔍 Tous les statuts de publication</option>
          <option value="En cours">🔵 En cours</option>
          <option value="Terminée">✅ Terminée</option>
          <option value="Abandonnée">🚫 Abandonnée</option>
        </select>

        {/* Filtre type de volume */}
        <select
          className="select"
          value={filters.type_volume || ''}
          onChange={(e) => onFilterChange('type_volume', e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          <option value="">🔍 Tous les types</option>
          {MANGA_VOLUME_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Filtre Mihon/Source */}
        <select
          className="select"
          value={mihonFilter}
          onChange={(e) => onMihonFilterChange(e.target.value)}
          style={{ width: 'auto', flex: '0 0 auto' }}
        >
          <option value="all">🔍 Tout</option>
          <option value="mihon">Mihon</option>
          <option value="not_mihon">Pas sur Mihon</option>
          <option value="mal">My Anime List</option>
          <option value="not_mal">Pas sur MyAnimeList</option>
          <option value="anilist">AniList</option>
          <option value="not_anilist">Pas sur AniList</option>
          <option value="nautiljon">Nautiljon</option>
          <option value="not_nautiljon">Pas sur Nautiljon</option>
        </select>

        {/* Filtre source_id (sites) */}
        {availableSites.length > 0 && (
          <select
            className="select"
            value={filters.source_id || ''}
            onChange={(e) => onFilterChange('source_id', e.target.value)}
            style={{ width: 'auto', flex: '0 0 auto' }}
          >
            <option value="">🔍 Tous les sites</option>
            {availableSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Ligne 2 : Toggles */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', alignItems: 'center', marginTop: '12px' }}>
        <FilterToggle
          checked={showMajOnly}
          onChange={onShowMajOnlyChange}
          label="🔔 MAJ"
          icon="🔔"
          activeColor="#22c55e"
        />

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
          label="👁️ Lectures masquées"
          icon="👁️"
          activeColor="#f59e0b"
        />
      </div>

      {/* Filtres additionnels (genres, thèmes, labels) */}
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
                        {labelObj.label}
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
