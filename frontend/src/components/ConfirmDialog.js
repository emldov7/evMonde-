/**
 * ConfirmDialog - Composant dialog de confirmation avec design moderne
 */

import { useEffect } from 'react';
import { FaExclamationTriangle, FaTimes, FaCheck, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import '../styles/components.css';

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer l\'action',
  message = 'Êtes-vous sûr de vouloir effectuer cette action ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger', // 'danger', 'warning', 'info', 'success'
  loading = false
}) {
  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
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
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const icons = {
    danger: <FaExclamationTriangle />,
    warning: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
    success: <FaCheckCircle />
  };

  const buttonVariants = {
    danger: 'ev-btn-danger',
    warning: 'ev-btn-warning',
    info: 'ev-btn-primary',
    success: 'ev-btn-success'
  };

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="ev-modal-overlay" onClick={!loading ? onClose : undefined}>
      <div 
        className="ev-modal ev-modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ev-modal-body">
          <div className="ev-confirm-dialog">
            {/* Icon */}
            <div className={`ev-confirm-icon ${type}`}>
              {icons[type] || icons.danger}
            </div>

            {/* Title */}
            <h3 className="ev-confirm-title">{title}</h3>

            {/* Message */}
            <p className="ev-confirm-message">{message}</p>

            {/* Actions */}
            <div className="ev-confirm-actions">
              <button
                type="button"
                className="ev-btn ev-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                <FaTimes />
                {cancelText}
              </button>
              <button
                type="button"
                className={`ev-btn ${buttonVariants[type] || buttonVariants.danger}`}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <span className="ev-loader-spinner sm" style={{ borderTopColor: 'currentColor' }}></span>
                ) : (
                  <FaCheck />
                )}
                {loading ? 'Chargement...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
