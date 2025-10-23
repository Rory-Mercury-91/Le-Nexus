interface PlatformLogoProps {
  platform: string;
  height?: number;
}

export default function PlatformLogo({ platform, height = 28 }: PlatformLogoProps) {
  if (platform === 'adn') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120.48 43.05" height={height} style={{ width: 'auto' }}>
        <g data-name="Calque 2">
          <path 
            d="M104.25 0v13.65L96.7 0H79v13.33A22.19 22.19 0 0059.44 0H41.77l3.69 17.67H58.8a4.14 4.14 0 014.33 3.85 4.14 4.14 0 01-4.33 3.86H47.23l3.69 17.67h7.88a22.14 22.14 0 0020.4-13.33v13.33h16.06V30.2l6.42 12.85h18.8V0zM30.48 19.38a2.09 2.09 0 11-2.1 2.09 2.13 2.13 0 012.1-2.09zm-10.79 0a2.09 2.09 0 11-2.09 2.09 2.12 2.12 0 012.09-2.09zm21.68-1.7H9.56L16.21 0h18.51zm9.55 25.37H32.09L31 39.82H20l-1.18 3.23H0l6.47-17.67h37.8z" 
            fill="#fff" 
            data-name="Calque 1"
          />
        </g>
      </svg>
    );
  }

  if (platform === 'adkami') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 40" height={height} style={{ width: 'auto' }}>
        {/* Fond violet */}
        <rect width="140" height="40" rx="6" fill="#8B5CF6"/>
        
        {/* Texte ADKami en blanc, légèrement incliné */}
        <text 
          x="12" 
          y="26" 
          fontFamily="Arial, Helvetica, sans-serif" 
          fontSize="17" 
          fontWeight="bold" 
          fontStyle="italic"
          fill="white"
        >
          ADKami
        </text>
        
        {/* Étoile/éclat stylisé jaune-doré à droite */}
        <g transform="translate(120, 20)">
          {/* Étoile principale */}
          <path d="M 0,-8 L 1.5,-2 L 7,-1 L 2,2 L 3,8 L 0,4 L -3,8 L -2,2 L -7,-1 L -1.5,-2 Z" fill="#FCD34D"/>
          {/* Petits éclats autour */}
          <circle cx="8" cy="-4" r="1.5" fill="#FCD34D" opacity="0.8"/>
          <circle cx="6" cy="6" r="1" fill="#FCD34D" opacity="0.8"/>
          <circle cx="-7" cy="3" r="1" fill="#FCD34D" opacity="0.8"/>
        </g>
      </svg>
    );
  }

  if (platform === 'crunchyroll') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 615 116.9" height={height} style={{ width: 'auto' }}>
        <path fill="white" d="M601.3,90.5V21.7h12.1v68.9H601.3z"/>
        <path fill="white" d="M575.2,90.5V21.7h12.1v68.9H575.2z"/>
        <path fill="white" d="M565,65.7c0,16.6-8.3,25.5-23.6,25.5c-15.3,0-23.6-8.9-23.6-25.5s8.3-25.5,23.6-25.5
          C556.7,40.2,565,49.1,565,65.7z M553.5,65.7c0-13.4-4.5-15.9-11.5-15.9c-7,0-11.5,2.5-11.5,15.9S535,81.6,542,81.6
          C548.4,81.6,553.5,79.1,553.5,65.7z"/>
        <path fill="white" d="M512.7,40.2v10.2c-6.4,0-14,0-14,3.2v37h-12.1v-44C487.2,38.9,512.7,40.2,512.7,40.2z"/>
        <path fill="white" d="M440,110.3C449,88,448.3,89.9,449,88l-17.9-47.2h12.8l11.5,34.4l10.8-34.4h12.8l-19.1,51l-7,18.5H440z"/>
        <path fill="white" d="M424.1,60.6v30H412V59.9c0-4.5-1.3-8.9-12.1-8.9c-2.8,0.1-5.6,0.5-8.3,1.3v38.3h-12.1V21.7h12.1v19.8
          c3.2-1.4,6.7-2,10.2-1.9C416.4,40.2,424.1,47.8,424.1,60.6z"/>
        <path fill="white" d="M357.2,81c4.4-0.2,8.7-1,12.8-2.6v10.2c-4.7,1.9-9.6,2.7-14.7,2.5c-15.3,0-23.6-8.9-23.6-25.5
          s8.3-26.1,23.6-26.1c5,0.2,9.9,1,14.7,2.6v10.2c-4.1-1.6-8.4-2.4-12.8-2.5c-8.3,0-13.4,2.5-13.4,15.3C343.8,78.4,348.9,81,357.2,81z"/>
        <path fill="white" d="M324,59.3v31.2h-11.5V59.3c0-4.5,0-8.9-10.2-8.9c-3.2,0-9.6,0.6-9.6,2.5v37.6h-11.5V49.1
          c0-8.3,10.2-9.6,22.9-9.6C317,40.2,324,45.3,324,59.3z"/>
        <path fill="white" d="M269.8,40.8v27.4c0,14.7-5.1,23.6-22.3,23.6s-21.7-8.9-21.7-23.6V40.8h11.5v28.7c0,8.3,3.2,10.8,10.2,10.8
          c7,0,10.2-2.5,10.2-10.8V40.8H269.8z"/>
        <path fill="white" d="M216.3,40.2v10.2c-6.4,0-14,0-14,3.2v37h-12.1v-44C190.8,38.9,216.3,40.2,216.3,40.2z"/>
        <path fill="white" d="M166.5,81c4.2-0.1,8.3-1,12.1-2.6v10.2c-4.7,1.9-9.6,2.7-14.7,2.5c-15.3,0-23.6-8.9-23.6-25.5
          s8.3-26.1,23.6-26.1c5,0.2,9.9,1,14.7,2.6v10.2c-3.9-1.5-8-2.4-12.1-2.5c-8.3,0-13.4,2.5-13.4,15.3C152.5,78.4,158.3,81,166.5,81z"/>
        <path fill="white" d="M15.5,65.7C15.5,37.8,38.1,15.3,66,15.3c26.3,0.1,48.1,20.3,50.2,46.5v-3.2c0-31.7-25.7-57.4-57.4-57.4
          S1.4,27,1.4,58.7S27.1,116,58.8,116h3.8C36.2,114.2,15.6,92.2,15.5,65.7z"/>
        <path fill="white" d="M93.2,68.2c-10.2,0-18.4-8.2-18.5-18.3c0-7.8,4.8-14.7,12.1-17.4c-5.7-3-12-4.6-18.5-4.5
          c-22.2,0-40.2,18-40.2,40.2s18,40.2,40.2,40.2s40.2-18,40.2-40.2c0,0,0,0,0,0c0.1-2.6-0.1-5.1-0.6-7.7
          C104.8,65.6,99.1,68.5,93.2,68.2z"/>
      </svg>
    );
  }

  // Badges API de recherche
  if (platform === 'anilist') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" height={height} style={{ width: 'auto' }}>
        <rect width="120" height="40" rx="4" fill="#02A9FF"/>
        <text x="10" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white">
          AniList
        </text>
      </svg>
    );
  }

  if (platform === 'myanimelist') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" height={height} style={{ width: 'auto' }}>
        <rect width="120" height="40" rx="4" fill="#2E51A2"/>
        <text x="10" y="26" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="bold" fill="white">
          MyAnimeList
        </text>
      </svg>
    );
  }

  if (platform === 'kitsu') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" height={height} style={{ width: 'auto' }}>
        <rect width="100" height="40" rx="4" fill="#F75239"/>
        <text x="10" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white">
          Kitsu
        </text>
      </svg>
    );
  }

  return null;
}
