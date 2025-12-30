/**
 * PageTransition - Composant wrapper pour animations de transition entre pages
 */

import { useEffect, useState } from 'react';
import '../styles/components.css';

function PageTransition({ children, type = 'fade-up' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour permettre au DOM de se mettre à jour
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      cancelAnimationFrame(timer);
      setIsVisible(false);
    };
  }, []);

  const transitionStyles = {
    'fade-up': {
      initial: { opacity: 0, transform: 'translateY(20px)' },
      visible: { opacity: 1, transform: 'translateY(0)' }
    },
    'fade': {
      initial: { opacity: 0 },
      visible: { opacity: 1 }
    },
    'slide-left': {
      initial: { opacity: 0, transform: 'translateX(20px)' },
      visible: { opacity: 1, transform: 'translateX(0)' }
    },
    'scale': {
      initial: { opacity: 0, transform: 'scale(0.95)' },
      visible: { opacity: 1, transform: 'scale(1)' }
    }
  };

  const style = transitionStyles[type] || transitionStyles['fade-up'];

  return (
    <div
      style={{
        ...style.initial,
        ...(isVisible ? style.visible : {}),
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
      }}
    >
      {children}
    </div>
  );
}

export default PageTransition;
