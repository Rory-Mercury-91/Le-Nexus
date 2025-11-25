import GradientTitle from '../../common/GradientTitle';

export default function WelcomeStep() {
  return (
    <div>
      <div style={{
        fontSize: '72px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: '700'
      }}>
        📚
      </div>
      <GradientTitle marginBottom="16px">
        Bienvenue dans Nexus
      </GradientTitle>
      <p style={{
        fontSize: '18px',
        color: 'var(--text-secondary)',
        lineHeight: '1.7',
        marginBottom: '32px',
        maxWidth: '480px',
        margin: '0 auto 32px'
      }}>
        Gérez votre collection de mangas, animes, films, séries et jeux adultes de manière simple et élégante.
        Nous allons configurer votre espace personnel en quelques étapes.
      </p>
    </div>
  );
}
