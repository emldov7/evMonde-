/**
 * ================================================
 * API : GESTION DES UTILISATEURS
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour gérer les utilisateurs.
 * Ces fonctions sont utilisées par le SuperAdmin pour :
 * - Voir la liste des utilisateurs
 * - Suspendre un utilisateur
 * - Promouvoir un utilisateur (changer son rôle)
 * - Voir les détails d'un utilisateur
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI qui est sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * GET ALL USERS : Récupérer tous les utilisateurs
 * ================================================
 *
 * Cette fonction récupère la liste de TOUS les utilisateurs de la plateforme.
 *
 * @param {object} params - Paramètres de filtrage (optionnels)
 * @param {string} params.role - Filtrer par rôle (participant, organizer, admin)
 * @param {string} params.search - Rechercher par nom ou email
 * @param {boolean} params.is_suspended - Filtrer par statut (true/false)
 * @param {number} params.skip - Nombre d'utilisateurs à sauter (pagination)
 * @param {number} params.limit - Nombre max d'utilisateurs à retourner
 * @returns {Promise<Array>} - Liste des utilisateurs
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /admin/users?role=participant&search=john
 * 2. Backend cherche dans PostgreSQL
 * 3. Backend retourne : [{ id, email, first_name, role, ... }, ...]
 *
 * Exemple d'utilisation :
 * const users = await getAllUsers({ role: 'participant', search: 'john' });
 * console.log(users); // [{ id: 1, email: 'john@example.com', ... }]
 */
export const getAllUsers = async (params = {}) => {
  try {
    // Construire les paramètres de requête
    // Exemple : ?role=participant&search=john&skip=0&limit=100
    const queryParams = new URLSearchParams();

    if (params.role) queryParams.append('role', params.role);
    if (params.search) queryParams.append('search', params.search);
    if (params.is_suspended !== undefined) queryParams.append('is_suspended', params.is_suspended);
    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);

    // Appeler le backend
    const response = await axiosInstance.get(`/superadmin/users?${queryParams.toString()}`);

    // Retourner la liste des utilisateurs
    return response.data;

  } catch (error) {
    // En cas d'erreur, on propage l'erreur
    throw error;
  }
};

/**
 * ================================================
 * GET USER BY ID : Récupérer un utilisateur par son ID
 * ================================================
 *
 * Cette fonction récupère les détails complets d'un utilisateur.
 *
 * @param {number} userId - L'ID de l'utilisateur
 * @returns {Promise<object>} - Détails de l'utilisateur
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /admin/users/123
 * 2. Backend cherche l'utilisateur dans PostgreSQL
 * 3. Backend retourne : { id: 123, email: '...', events: [...], ... }
 *
 * Exemple d'utilisation :
 * const user = await getUserById(123);
 * console.log(user.email); // 'john@example.com'
 */
export const getUserById = async (userId) => {
  try {
    const response = await axiosInstance.get(`/superadmin/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * SUSPEND USER : Suspendre un utilisateur
 * ================================================
 *
 * Cette fonction suspend un utilisateur.
 * Un utilisateur suspendu ne peut plus se connecter.
 *
 * @param {number} userId - L'ID de l'utilisateur à suspendre
 * @param {string} reason - La raison de la suspension
 * @returns {Promise<object>} - Utilisateur mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : PUT /admin/users/123/suspend { reason: "Spam" }
 * 2. Backend met à jour dans PostgreSQL : is_suspended = true
 * 3. Backend retourne : { id: 123, is_suspended: true, ... }
 *
 * Exemple d'utilisation :
 * await suspendUser(123, 'Comportement inapproprié');
 */
export const suspendUser = async (userId, reason) => {
  try {
    const response = await axiosInstance.post(`/superadmin/users/${userId}/suspend`, {
      reason: reason
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * UNSUSPEND USER : Réactiver un utilisateur
 * ================================================
 *
 * Cette fonction réactive un utilisateur suspendu.
 *
 * @param {number} userId - L'ID de l'utilisateur à réactiver
 * @returns {Promise<object>} - Utilisateur mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : PUT /admin/users/123/unsuspend
 * 2. Backend met à jour dans PostgreSQL : is_suspended = false
 * 3. Backend retourne : { id: 123, is_suspended: false, ... }
 *
 * Exemple d'utilisation :
 * await unsuspendUser(123);
 */
export const unsuspendUser = async (userId) => {
  try {
    const response = await axiosInstance.post(`/superadmin/users/${userId}/unsuspend`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * PROMOTE USER : Promouvoir un utilisateur
 * ================================================
 *
 * Cette fonction change le rôle d'un utilisateur.
 *
 * Exemples :
 * - Participant → Organizer (promouvoir)
 * - Organizer → Admin (promouvoir)
 * - Organizer → Participant (rétrograder)
 *
 * @param {number} userId - L'ID de l'utilisateur
 * @param {string} newRole - Le nouveau rôle (participant, organizer, admin)
 * @returns {Promise<object>} - Utilisateur mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : PUT /admin/users/123/role { role: "organizer" }
 * 2. Backend met à jour dans PostgreSQL : role = "organizer"
 * 3. Backend retourne : { id: 123, role: "organizer", ... }
 *
 * Exemple d'utilisation :
 * await promoteUser(123, 'organizer');
 */
export const promoteUser = async (userId, newRole) => {
  try {
    const response = await axiosInstance.post(`/superadmin/users/${userId}/promote`, {
      role: newRole
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * CREATE USER : Créer un nouvel utilisateur
 * ================================================
 *
 * Cette fonction crée un nouvel utilisateur (Participant, Organizer ou Admin).
 *
 * @param {object} userData - Les données du nouvel utilisateur
 * @param {string} userData.email - Email
 * @param {string} userData.password - Mot de passe
 * @param {string} userData.first_name - Prénom
 * @param {string} userData.last_name - Nom
 * @param {string} userData.country_code - Code pays (ex: "TG", "FR")
 * @param {string} userData.phone - Numéro de téléphone
 * @param {string} userData.role - Rôle (participant, organizer, admin)
 * @param {string} userData.preferred_language - Langue préférée (fr, en)
 * @returns {Promise<object>} - Utilisateur créé
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /auth/register { email, password, ... }
 * 2. Backend crée l'utilisateur dans PostgreSQL
 * 3. Backend retourne : { id, email, role, ... }
 *
 * Exemple d'utilisation :
 * await createUser({
 *   email: 'john@example.com',
 *   password: 'Password123!',
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   country_code: 'TG',
 *   phone: '90000000',
 *   role: 'participant',
 *   preferred_language: 'fr'
 * });
 */
export const createUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * DELETE USER : Supprimer un utilisateur
 * ================================================
 *
 * Cette fonction supprime définitivement un utilisateur.
 * ⚠️ ATTENTION : Cette action est IRRÉVERSIBLE !
 *
 * @param {number} userId - L'ID de l'utilisateur à supprimer
 * @returns {Promise<object>} - Confirmation de suppression
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : DELETE /superadmin/users/123
 * 2. Backend supprime l'utilisateur de PostgreSQL
 * 3. Backend retourne : { message: "User deleted successfully" }
 *
 * Exemple d'utilisation :
 * await deleteUser(123);
 */
export const deleteUser = async (userId) => {
  try {
    const response = await axiosInstance.delete(`/superadmin/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * GET USER STATISTICS : Récupérer les statistiques utilisateur
 * ================================================
 *
 * Cette fonction récupère les statistiques globales sur les utilisateurs.
 *
 * @returns {Promise<object>} - Statistiques
 *
 * Exemple de réponse :
 * {
 *   total_users: 1523,
 *   participants: 1200,
 *   organizers: 300,
 *   admins: 23,
 *   suspended_users: 15,
 *   new_users_this_month: 45
 * }
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /admin/users/statistics
 * 2. Backend calcule depuis PostgreSQL
 * 3. Backend retourne : { total_users: 1523, ... }
 */
export const getUserStatistics = async () => {
  try {
    const response = await axiosInstance.get('/superadmin/stats');
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
 * Ce fichier contient 8 fonctions principales :
 *
 * 1. getAllUsers() - Récupère la liste de tous les utilisateurs
 * 2. getUserById() - Récupère les détails d'un utilisateur
 * 3. suspendUser() - Suspend un utilisateur
 * 4. unsuspendUser() - Réactive un utilisateur
 * 5. promoteUser() - Change le rôle d'un utilisateur
 * 6. createUser() - Crée un nouvel utilisateur
 * 7. deleteUser() - Supprime un utilisateur
 * 8. getUserStatistics() - Récupère les statistiques
 *
 * Toutes ces fonctions utilisent axiosInstance qui :
 * - Ajoute automatiquement le token JWT dans les headers
 * - Gère automatiquement les erreurs 401 (non autorisé)
 * - Retourne directement response.data
 */
