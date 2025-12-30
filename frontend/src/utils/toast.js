/**
 * ================================================
 * TOAST NOTIFICATIONS UTILITY
 * ================================================
 *
 * Système de notifications toast cohérent et réutilisable
 * Wrapper autour de react-toastify avec styles personnalisés
 *
 * Usage:
 * import { showSuccess, showError, showWarning, showInfo } from './utils/toast';
 *
 * showSuccess('Utilisateur créé avec succès !');
 * showError('Une erreur est survenue');
 * showWarning('Attention, cette action est irréversible');
 * showInfo('Nouvelle mise à jour disponible');
 */

import { toast } from 'react-toastify';

// ================================================
// CONFIGURATION PAR DÉFAUT
// ================================================

const defaultOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// ================================================
// NOTIFICATIONS DE SUCCÈS
// ================================================

/**
 * Affiche une notification de succès (verte)
 * @param {string} message - Message à afficher
 * @param {object} options - Options react-toastify optionnelles
 */
export const showSuccess = (message, options = {}) => {
  toast.success(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-success',
    progressClassName: 'toast-progress-success',
  });
};

// ================================================
// NOTIFICATIONS D'ERREUR
// ================================================

/**
 * Affiche une notification d'erreur (rouge)
 * @param {string} message - Message à afficher
 * @param {object} options - Options react-toastify optionnelles
 */
export const showError = (message, options = {}) => {
  toast.error(message, {
    ...defaultOptions,
    autoClose: 5000, // Erreurs restent plus longtemps
    ...options,
    className: 'toast-error',
    progressClassName: 'toast-progress-error',
  });
};

// ================================================
// NOTIFICATIONS D'AVERTISSEMENT
// ================================================

/**
 * Affiche une notification d'avertissement (orange/jaune)
 * @param {string} message - Message à afficher
 * @param {object} options - Options react-toastify optionnelles
 */
export const showWarning = (message, options = {}) => {
  toast.warning(message, {
    ...defaultOptions,
    autoClose: 5000, // Avertissements restent plus longtemps
    ...options,
    className: 'toast-warning',
    progressClassName: 'toast-progress-warning',
  });
};

// ================================================
// NOTIFICATIONS INFORMATIVES
// ================================================

/**
 * Affiche une notification informative (bleue)
 * @param {string} message - Message à afficher
 * @param {object} options - Options react-toastify optionnelles
 */
export const showInfo = (message, options = {}) => {
  toast.info(message, {
    ...defaultOptions,
    ...options,
    className: 'toast-info',
    progressClassName: 'toast-progress-info',
  });
};

// ================================================
// NOTIFICATIONS DE CHARGEMENT
// ================================================

/**
 * Affiche une notification de chargement persistante
 * Retourne l'ID du toast pour pouvoir le mettre à jour
 * @param {string} message - Message à afficher
 */
export const showLoading = (message = 'Chargement en cours...') => {
  return toast.loading(message, {
    position: 'top-right',
    className: 'toast-loading',
  });
};

/**
 * Met à jour une notification de chargement en succès
 * @param {string|number} toastId - ID du toast à mettre à jour
 * @param {string} message - Nouveau message
 */
export const updateToSuccess = (toastId, message) => {
  toast.update(toastId, {
    render: message,
    type: 'success',
    isLoading: false,
    autoClose: 4000,
    className: 'toast-success',
    progressClassName: 'toast-progress-success',
  });
};

/**
 * Met à jour une notification de chargement en erreur
 * @param {string|number} toastId - ID du toast à mettre à jour
 * @param {string} message - Nouveau message
 */
export const updateToError = (toastId, message) => {
  toast.update(toastId, {
    render: message,
    type: 'error',
    isLoading: false,
    autoClose: 5000,
    className: 'toast-error',
    progressClassName: 'toast-progress-error',
  });
};

// ================================================
// NOTIFICATIONS PROMETTEUSES
// ================================================

/**
 * Affiche une notification qui se met à jour automatiquement
 * selon le statut d'une Promise
 * @param {Promise} promise - Promise à surveiller
 * @param {object} messages - Messages pour chaque état
 */
export const showPromise = (promise, messages = {}) => {
  return toast.promise(
    promise,
    {
      pending: messages.pending || 'Opération en cours...',
      success: messages.success || 'Opération réussie !',
      error: messages.error || 'Une erreur est survenue',
    },
    {
      position: 'top-right',
      autoClose: 4000,
    }
  );
};

// ================================================
// UTILITAIRES
// ================================================

/**
 * Ferme toutes les notifications
 */
export const dismissAll = () => {
  toast.dismiss();
};

/**
 * Ferme une notification spécifique
 * @param {string|number} toastId - ID du toast à fermer
 */
export const dismiss = (toastId) => {
  toast.dismiss(toastId);
};

// ================================================
// EXEMPLES D'UTILISATION
// ================================================

/*
// 1. Simple success
showSuccess('Utilisateur créé avec succès !');

// 2. Error avec durée personnalisée
showError('Email déjà utilisé', { autoClose: 8000 });

// 3. Loading + Update
const toastId = showLoading('Création en cours...');
try {
  await createUser(data);
  updateToSuccess(toastId, 'Utilisateur créé !');
} catch (error) {
  updateToError(toastId, error.message);
}

// 4. Promise automatique
showPromise(
  api.deleteUser(userId),
  {
    pending: 'Suppression en cours...',
    success: 'Utilisateur supprimé !',
    error: 'Erreur lors de la suppression'
  }
);

// 5. Warning important
showWarning('Cette action est irréversible !', { autoClose: false });

// 6. Info temporaire
showInfo('Nouvelle version disponible', { autoClose: 3000 });
*/
