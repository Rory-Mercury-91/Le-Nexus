import logoMihon from '../../../../build-assets/mihon.png';

interface MihonBadgeProps {
  show: boolean;
}

export default function MihonBadge({ show }: MihonBadgeProps) {
  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '8px',
      left: '8px',
      padding: '0',
      borderRadius: '8px',
      background: 'transparent',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Forme de tablette (rectangulaire avec coins arrondis)
      width: '40px',
      height: '40px'
    }}>
      <img
        src={logoMihon}
        alt="Mihon"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '4px'
        }}
      />
    </div>
  );
}
