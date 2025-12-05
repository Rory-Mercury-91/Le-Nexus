import { CSSProperties } from 'react';

interface NexusLogoProps {
  height?: number | string;
  width?: number | string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Logo Nexus avec le N stylisé et le texte "exus"
 * Style audacieux avec dégradé horizontal et contour blanc épais
 */
export default function NexusLogo({ 
  height = 36, 
  width = 'auto',
  style,
  className
}: NexusLogoProps) {
  // Calculer la largeur proportionnelle si auto
  // Ratio du viewBox : 240 / 60 = 4:1
  const aspectRatio = 4;
  const calculatedWidth = width === 'auto' 
    ? typeof height === 'number' 
      ? height * aspectRatio 
      : `calc(${height} * ${aspectRatio})`
    : width;

  return (
    <img
      src="/assets/nexus-logo.svg"
      alt="Nexus"
      width={calculatedWidth}
      height={height}
      style={{
        display: 'block',
        ...style
      }}
      className={className}
    />
  );
}
