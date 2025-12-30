/**
 * ================================================
 * API : GESTION DES COMMISSIONS
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour gérer la configuration
 * des commissions de la plateforme. Ces fonctions sont utilisées par :
 * - SuperAdmin : Configuration et consultation
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * FONCTIONS DE CONFIGURATION
 * ================================================
 */

/**
 * GET COMMISSION SETTINGS : Récupérer la configuration actuelle des commissions
 *
 * @returns {Promise<object>} - Configuration des commissions
 *
 * Exemple de réponse :
 * {
 *   id: 1,
 *   default_commission_rate: 5.0,
 *   minimum_commission_amount: 0.0,
 *   is_active: true,
 *   notes: "Commission standard de la plateforme",
 *   updated_at: "2025-01-15T10:00:00"
 * }
 */
export const getCommissionSettings = async () => {
  try {
    const response = await axiosInstance.get('/marketplace/commission/settings');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * UPDATE COMMISSION SETTINGS : Mettre à jour la configuration des commissions (SuperAdmin)
 *
 * @param {object} settingsData - Les nouvelles données de configuration
 * @param {number} settingsData.default_commission_rate - Taux de commission par défaut (0-100)
 * @param {number} settingsData.minimum_commission_amount - Montant minimum de commission
 * @param {boolean} settingsData.is_active - Activer/Désactiver le système de commission
 * @param {string} settingsData.notes - Notes sur la stratégie de commission
 * @returns {Promise<object>} - Configuration mise à jour
 *
 * Exemple d'utilisation :
 * await updateCommissionSettings({
 *   default_commission_rate: 7.0,
 *   minimum_commission_amount: 1.0,
 *   is_active: true,
 *   notes: "Augmentation pour couvrir les frais"
 * });
 */
export const updateCommissionSettings = async (settingsData) => {
  try {
    const response = await axiosInstance.put('/marketplace/commission/settings', settingsData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * GET COMMISSION TRANSACTIONS : Récupérer l'historique des transactions de commission
 *
 * @param {number} skip - Nombre d'éléments à ignorer (pagination)
 * @param {number} limit - Nombre max d'éléments à retourner
 * @param {number} organizer_id - Filtrer par organisateur (optionnel)
 * @returns {Promise<Array>} - Liste des transactions de commission
 *
 * Exemple de réponse :
 * [
 *   {
 *     id: 1,
 *     registration_id: 42,
 *     event_id: 10,
 *     organizer_id: 5,
 *     ticket_amount: 10000,
 *     commission_rate: 5.0,
 *     commission_amount: 500,
 *     net_amount: 9500,
 *     currency: "USD",
 *     created_at: "2025-01-15T10:00:00"
 *   },
 *   ...
 * ]
 */
export const getCommissionTransactions = async (skip = 0, limit = 100, organizer_id = null) => {
  try {
    const params = { skip, limit };
    if (organizer_id) {
      params.organizer_id = organizer_id;
    }
    const response = await axiosInstance.get('/marketplace/commission/transactions', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * RÉSUMÉ DES FONCTIONS
 * ================================================
 *
 * CONFIGURATION :
 * 1. getCommissionSettings() - Récupère la configuration actuelle
 * 2. updateCommissionSettings() - Met à jour la configuration
 * 3. getCommissionTransactions() - Récupère l'historique des commissions prélevées
 */
