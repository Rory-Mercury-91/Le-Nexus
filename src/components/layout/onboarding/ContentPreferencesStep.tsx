import { Palette } from 'lucide-react';
import Toggle from '../../common/Toggle';

interface ContentPreferencesStepProps {
  showMangas: boolean;
  showAnimes: boolean;
  showMovies: boolean;
  showSeries: boolean;
  showAdulteGame: boolean;
  onShowMangasChange: (show: boolean) => void;
  onShowAnimesChange: (show: boolean) => void;
  onShowMoviesChange: (show: boolean) => void;
  onShowSeriesChange: (show: boolean) => void;
  onShowAdulteGameChange: (show: boolean) => void;
  error?: string;
}

export default function ContentPreferencesStep({
  showMangas,
  showAnimes,
  showMovies,
  showSeries,
  showAdulteGame,
  onShowMangasChange,
  onShowAnimesChange,
  onShowMoviesChange,
  onShowSeriesChange,
  onShowAdulteGameChange,
  error
}: ContentPreferencesStepProps) {
  return (
    <div>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        border: '3px solid var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Palette size={40} style={{ color: 'var(--primary)' }} />
      </div>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        Personnalisez votre accueil
      </h2>
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
        lineHeight: '1.6',
        maxWidth: '500px',
        margin: '0 auto 32px'
      }}>
        Choisissez les types de contenu que vous souhaitez voir sur votre page d'accueil et dans la navigation. Vous pourrez modifier ce choix à tout moment dans les paramètres.
      </p>

      {/* Options de contenu */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '500px',
        margin: '0 auto',
        textAlign: 'left'
      }}>
        {/* Mangas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: showMangas ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
            border: showMangas ? '2px solid var(--primary)' : '2px solid var(--border)',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              📚 Mangas
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Afficher les nouveautés, suivis et recommandations de mangas
            </div>
          </div>
          <Toggle
            checked={showMangas}
            onChange={onShowMangasChange}
          />
        </div>

        {/* Animes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: showAnimes ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
            border: showAnimes ? '2px solid var(--primary)' : '2px solid var(--border)',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              🎬 Animes
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Afficher les nouveautés, suivis et recommandations d'animes
            </div>
          </div>
          <Toggle
            checked={showAnimes}
            onChange={onShowAnimesChange}
          />
        </div>

        {/* Films */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: showMovies ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
            border: showMovies ? '2px solid var(--primary)' : '2px solid var(--border)',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              🎞️ Films
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Activer la gestion et les recommandations de films
            </div>
          </div>
          <Toggle
            checked={showMovies}
            onChange={onShowMoviesChange}
          />
        </div>

        {/* Séries */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: showSeries ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
            border: showSeries ? '2px solid var(--primary)' : '2px solid var(--border)',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              📺 Séries
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Activer la gestion et le suivi des séries
            </div>
          </div>
          <Toggle
            checked={showSeries}
            onChange={onShowSeriesChange}
          />
        </div>

        {/* Jeux adultes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: showAdulteGame ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface)',
            border: showAdulteGame ? '2px solid var(--primary)' : '2px solid var(--border)',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              🎮 Jeux adulte
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Afficher les nouveautés, suivis et recommandations de jeux adulte
            </div>
          </div>
          <Toggle
            checked={showAdulteGame}
            onChange={onShowAdulteGameChange}
          />
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: '24px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
