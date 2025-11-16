import CoverImage from '../../../components/common/CoverImage';

interface AnimeBannerProps {
  coverUrl?: string | null;
  title: string;
}

export default function AnimeBanner({ coverUrl, title }: AnimeBannerProps) {
  if (!coverUrl) return null;

  return (
    <div style={{
      width: '100%',
      maxHeight: '400px',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
      border: '2px solid var(--border)',
      background: 'var(--surface)'
    }}>
      <CoverImage
        src={coverUrl}
        alt={title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
