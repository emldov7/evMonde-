/**
 * ================================================
 * API : GESTION DES PAYOUTS
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour gérer les payouts
 * (demandes de paiement des organisateurs). Ces fonctions sont utilisées par :
 * - SuperAdmin : Voir et approuver/rejeter les demandes
 * - Organisateurs : Demander des payouts et voir leur historique
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * FONCTIONS SUPERADMIN
 * ================================================
 */

/**
 * GET ALL PAYOUTS : Récupérer toutes les demandes de payout (SuperAdmin)
 *
 * @param {string} status - Filtre par statut (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)
 * @param {number} skip - Nombre d'éléments à ignorer (pagination)
 * @param {number} limit - Nombre max d'éléments à retourner
 * @returns {Promise<Array>} - Liste des payouts
 *
 * Exemple de réponse :
 * [
 *   {
 *     id: 1,
 *     organizer_id: 5,
 *     organizer_name: "John Doe",
 *     organizer_email: "john@example.com",
 *     amount: 50000,
 *     currency: "USD",
 *     status: "PENDING",
 *     payout_method: "Bank Transfer",
 *     account_details: "BIC: 123456, IBAN: FR...",
 *     organizer_message: "Merci de traiter rapidement",
 *     admin_notes: null,
 *     requested_at: "2025-01-15T10:00:00",
 *     approved_at: null,
 *     completed_at: null,
 *     rejected_at: null
 *   },
 *   ...
 * ]
 */
export const getAllPayouts = async (status = null, skip = 0, limit = 100) => {
  try {
    const params = { skip, limit };
    if (status) {
      params.status = status;
    }
    const response = await axiosInstance.get('/marketplace/payouts', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * PROCESS PAYOUT : Approuver ou rejeter une demande de payout (SuperAdmin)
 *
 * @param {number} payoutId - L'ID du payout
 * @param {object} actionData - Les données de l'action
 * @param {string} actionData.status - Nouveau statut (APPROVED, REJECTED, COMPLETED, CANCELLED)
 * @param {string} actionData.admin_notes - Notes privées de l'admin
 * @param {string} actionData.stripe_payout_id - ID du payout Stripe (optionnel)
 * @returns {Promise<object>} - Payout mis à jour
 *
 * Exemple d'utilisation :
 * await processPayout(1, {
 *   status: 'APPROVED',
 *   admin_notes: 'Approuvé après vérification',
 *   stripe_payout_id: 'po_123456789'
 * });
 */
export const processPayout = async (payoutId, actionData) => {
  try {
    const response = await axiosInstance.put(`/marketplace/payouts/${payoutId}`, actionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * FONCTIONS ORGANISATEUR (pour référence)
 * ================================================
 */

/**
 * GET MY BALANCE : Récupérer le solde disponible de l'organisateur connecté
 *
 * @returns {Promise<object>} - Solde de l'organisateur
 *
 * Exemple de réponse :
 * {
 *   total_revenue: 100000,
 *   total_commissions: 5000,
 *   total_payouts: 50000,
 *   pending_payouts: 20000,
 *   available_balance: 25000,
 *   currency: "USD"
 * }
 */
export const getMyBalance = async () => {
  try {
    const response = await axiosInstance.get('/marketplace/my-balance');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * REQUEST PAYOUT : Demander un payout (Organisateur)
 *
 * @param {object} payoutData - Les données de la demande
 * @param {number} payoutData.amount - Montant demandé
 * @param {string} payoutData.payout_method - Méthode de paiement
 * @param {string} payoutData.account_details - Détails du compte (cryptés côté backend)
 * @param {string} payoutData.message - Message pour l'admin (optionnel)
 * @returns {Promise<object>} - Payout créé
 */
export const requestPayout = async (payoutData) => {
  try {
    const response = await axiosInstance.post('/marketplace/payouts/request', payoutData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * GET MY PAYOUTS : Récupérer l'historique des payouts de l'organisateur connecté
 *
 * @returns {Promise<Array>} - Liste des payouts
 */
export const getMyPayouts = async () => {
  try {
    const response = await axiosInstance.get('/marketplace/my-payouts');
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
 * SUPERADMIN :
 * 1. getAllPayouts() - Récupère toutes les demandes de payout
 * 2. processPayout() - Approuve/Rejette une demande
 *
 * ORGANISATEUR :
 * 1. getMyBalance() - Récupère le solde disponible
 * 2. requestPayout() - Demande un payout
 * 3. getMyPayouts() - Récupère l'historique des payouts
 */
