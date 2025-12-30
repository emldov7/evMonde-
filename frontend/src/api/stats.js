/**
 * ================================================
 * API : STATISTIQUES PLATEFORME
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour récupérer
 * les statistiques globales de la plateforme.
 *
 * Ces endpoints sont réservés aux SuperAdmins uniquement.
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * GET PLATFORM STATS : Récupérer les statistiques globales
 * ================================================
 *
 * Cette fonction récupère les statistiques globales de la plateforme :
 * - Nombre total d'utilisateurs (participants, organisateurs, admins)
 * - Nombre total d'événements (publiés, brouillons, annulés, suspendus)
 * - Revenus totaux de la plateforme
 * - Inscriptions totales aux événements
 *
 * @returns {Promise<object>} - Statistiques globales
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /superadmin/stats
 * 2. Backend calcule depuis PostgreSQL
 * 3. Backend retourne : { total_users, total_events, total_revenue, ... }
 *
 * Exemple de réponse :
 * {
 *   total_users: 1523,
 *   total_participants: 1200,
 *   total_organizers: 320,
 *   total_admins: 3,
 *   suspended_users: 15,
 *   total_events: 450,
 *   published_events: 380,
 *   draft_events: 50,
 *   cancelled_events: 20,
 *   suspended_events: 5,
 *   total_registrations: 12500,
 *   total_revenue: 2500000,
 *   commission_revenue: 250000
 * }
 *
 * Exemple d'utilisation :
 * const stats = await getPlatformStats();
 */
export const getPlatformStats = async () => {
  try {
    const response = await axiosInstance.get('/superadmin/stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getDashboardStats = async () => {
  try {
    const response = await axiosInstance.get('/superadmin/dashboard-stats');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * GET TOP ORGANIZERS : Récupérer le top des organisateurs
 * ================================================
 *
 * Cette fonction récupère le classement des meilleurs organisateurs
 * de la plateforme basé sur le nombre d'événements créés et le revenu généré.
 *
 * @param {number} limit - Nombre d'organisateurs à retourner (défaut: 10)
 * @returns {Promise<Array>} - Liste des top organisateurs
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /superadmin/stats/top-organizers?limit=10
 * 2. Backend calcule depuis PostgreSQL
 * 3. Backend retourne : [{ user_id, name, total_events, total_revenue, ... }, ...]
 *
 * Exemple de réponse :
 * [
 *   {
 *     user_id: 42,
 *     name: "Jean Dupont",
 *     email: "jean@example.com",
 *     total_events: 25,
 *     published_events: 20,
 *     total_registrations: 1500,
 *     total_revenue: 500000,
 *     avg_attendees: 60
 *   },
 *   ...
 * ]
 *
 * Exemple d'utilisation :
 * const topOrganizers = await getTopOrganizers(10);
 */
export const getTopOrganizers = async (limit = 10) => {
  try {
    const response = await axiosInstance.get(`/superadmin/stats/top-organizers?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * GET TOP EVENTS : Récupérer le top des événements
 * ================================================
 *
 * Cette fonction récupère le classement des événements les plus populaires
 * basé sur le nombre d'inscriptions et le revenu généré.
 *
 * @param {number} limit - Nombre d'événements à retourner (défaut: 10)
 * @returns {Promise<Array>} - Liste des top événements
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /superadmin/stats/top-events?limit=10
 * 2. Backend calcule depuis PostgreSQL
 * 3. Backend retourne : [{ event_id, title, total_registrations, revenue, ... }, ...]
 *
 * Exemple de réponse :
 * [
 *   {
 *     event_id: 15,
 *     title: "Festival Tech Lomé 2025",
 *     organizer_name: "Jean Dupont",
 *     total_registrations: 250,
 *     capacity: 300,
 *     revenue: 125000,
 *     start_date: "2025-12-15T09:00:00"
 *   },
 *   ...
 * ]
 *
 * Exemple d'utilisation :
 * const topEvents = await getTopEvents(10);
 */
export const getTopEvents = async (limit = 10) => {
  try {
    const response = await axiosInstance.get(`/superadmin/stats/top-events?limit=${limit}`);
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
 * Ce fichier contient 3 fonctions principales :
 *
 * 1. getPlatformStats() - Récupère les statistiques globales de la plateforme
 * 2. getTopOrganizers() - Récupère le classement des meilleurs organisateurs
 * 3. getTopEvents() - Récupère le classement des événements les plus populaires
 *
 * Toutes ces fonctions utilisent axiosInstance qui :
 * - Ajoute automatiquement le token JWT dans les headers
 * - Gère automatiquement les erreurs 401 (non autorisé)
 * - Retourne directement response.data
 *
 * CES ENDPOINTS SONT RÉSERVÉS AUX SUPERADMINS UNIQUEMENT
 */
