import { useLocation, useNavigate } from 'react-router-dom';

interface VideoNavigationTabsProps {
  videoCounts: {
    movies: number;
    series: number;
    total: number;
  };
  animeTypeCounts: {
    TV: number;
    OVA: number;
    ONA: number;
    Movie: number;
    Special: number;
    Unclassified: number;
  };
}

export default function VideoNavigationTabs({ videoCounts, animeTypeCounts }: VideoNavigationTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const TabButton = ({ path, icon, label, count }: {
    path: string;
    icon: string;
    label: string;
    count?: number;
  }) => {
    const isActive = location.pathname === path || (path === '/videos/all' && location.pathname === '/videos');

    return (
      <button
        onClick={() => navigate(path)}
        style={{
          padding: '10px 20px',
          border: 'none',
          background: isActive ? 'var(--surface-light)' : 'transparent',
          borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
          color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
          fontWeight: isActive ? '600' : '400',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'all 0.2s ease',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.background = 'var(--surface-light)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span>{icon}</span>
        {label} {count !== undefined && `(${count})`}
      </button>
    );
  };

  return (
    <div style={{
      display: 'flex',
      marginBottom: '20px',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
      <TabButton
        path="/videos/all"
        icon="🎬"
        label="Tout"
        count={videoCounts.total}
      />
      <TabButton
        path="/videos/movies"
        icon="🎞️"
        label="Films"
        count={videoCounts.movies}
      />
      <TabButton
        path="/videos/series"
        icon="📺"
        label="Séries"
        count={videoCounts.series}
      />
      <TabButton
        path="/videos/tv"
        icon="📺"
        label="TV"
        count={animeTypeCounts.TV}
      />
      <TabButton
        path="/videos/ona"
        icon="🌐"
        label="ONA"
        count={animeTypeCounts.ONA}
      />
      <TabButton
        path="/videos/ova"
        icon="💿"
        label="OVA"
        count={animeTypeCounts.OVA}
      />
      <TabButton
        path="/videos/special"
        icon="⭐"
        label="Spécial"
        count={animeTypeCounts.Special}
      />
      <TabButton
        path="/videos/movie-anime"
        icon="🎞️"
        label="Films animé"
        count={animeTypeCounts.Movie}
      />
      {animeTypeCounts.Unclassified > 0 && (
        <TabButton
          path="/videos/unclassified"
          icon="❓"
          label="Non classé"
          count={animeTypeCounts.Unclassified}
        />
      )}
    </div>
  );
}
