/**
 * Modal - Composant fenêtre modale avec design moderne
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import '../../styles/components.css';

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  footer,
  className = ''
}) {
  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'ev-modal-sm',
    md: 'ev-modal-md',
    lg: 'ev-modal-lg',
    xl: 'ev-modal-xl',
    full: 'ev-modal-full'
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="ev-modal-overlay" onClick={handleBackdropClick}>
      <div className={`ev-modal ${sizeClasses[size] || sizeClasses.md} ${className}`}>
        {(title || showClose) && (
          <div className="ev-modal-header">
            <h2 className="ev-modal-title">{title}</h2>
            {showClose && (
              <button
                type="button"
                className="ev-modal-close"
                onClick={onClose}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}

        <div className="ev-modal-body">
          {children}
        </div>

        {footer && (
          <div className="ev-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
