import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const BackToBottomButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Calculer la position par rapport au bas de la page
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      
      // Afficher le bouton si on est proche du haut (plus de 300px du haut)
      // et qu'il y a du contenu en dessous
      if (scrollTop > 300 && distanceFromBottom > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToBottom}
      aria-label="Aller en bas"
      style={{
        position: 'fixed',
        bottom: '24px', // En bas, au-dessus du bouton "Retour en haut"
        right: '24px',
        zIndex: 1000,
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'var(--primary)',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1.1)';
        e.currentTarget.style.background = 'var(--primary-dark)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.background = 'var(--primary)';
      }}
    >
      <ChevronDown size={24} />
    </button>
  );
};

export default BackToBottomButton;
