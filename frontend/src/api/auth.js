/**
 * ================================================
 * API : AUTHENTIFICATION
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour :
 * - Se connecter (login)
 * - S'inscrire (register)
 * - Se déconnecter (logout)
 * - Récupérer les infos de l'utilisateur connecté
 *
 * Ces fonctions appellent le backend FastAPI.
 */

import axiosInstance from './axios';

/**
 * ================================================
 * LOGIN : Connexion utilisateur
 * ================================================
 *
 * Cette fonction envoie l'email et le mot de passe au backend.
 * Si correct, le backend retourne un token JWT + les infos utilisateur.
 *
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<object>} - { token, user }
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /auth/login { email, password }
 * 2. Backend vérifie dans PostgreSQL
 * 3. Backend retourne : { token: "eyJ...", user: {...} }
 * 4. Frontend stocke le token dans localStorage
 *
 * Exemple d'utilisation :
 * const data = await login('admin@example.com', 'password123');
 * localStorage.setItem('token', data.token);
 * localStorage.setItem('user', JSON.stringify(data.user));
 */
export const login = async (email, password) => {
  try {
    // ÉTAPE 1 : Envoyer la requête de login au backend
    const response = await axiosInstance.post('/auth/login', {
      username: email,  // ⚠️ FastAPI OAuth2 utilise "username" au lieu de "email"
      password: password
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'  // Format requis par FastAPI OAuth2
      },
      // Transformer les données en format x-www-form-urlencoded
      transformRequest: [(data) => {
        return `username=${encodeURIComponent(data.username)}&password=${encodeURIComponent(data.password)}`;
      }]
    });

    // ÉTAPE 2 : Récupérer le token
    const token = response.data.access_token;

    // ÉTAPE 3 : Stocker temporairement le token pour la prochaine requête
    // (l'interceptor Axios l'utilisera automatiquement)
    localStorage.setItem('token', token);

    // ÉTAPE 4 : Récupérer les données complètes de l'utilisateur
    const userResponse = await axiosInstance.get('/users/me');

    // ÉTAPE 5 : Retourner les données
    return {
      token: token,
      user: userResponse.data
    };

  } catch (error) {
    // En cas d'erreur, supprimer le token qui pourrait être stocké
    localStorage.removeItem('token');
    // Si erreur (mauvais email/password, serveur down, etc.)
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    if (status) {
      throw new Error(`${status}${detail ? `: ${detail}` : ''}`);
    }

    throw new Error(error?.message || 'Erreur de connexion');
  }
};

/**
 * ================================================
 * REGISTER : Inscription utilisateur
 * ================================================
 *
 * Cette fonction crée un nouveau compte utilisateur.
 *
 * @param {object} userData - Données du nouvel utilisateur
 * @param {string} userData.email - Email
 * @param {string} userData.password - Mot de passe
 * @param {string} userData.first_name - Prénom
 * @param {string} userData.last_name - Nom
 * @param {string} userData.country_code - Code pays (ex: "TG")
 * @returns {Promise<object>} - { token, user }
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /auth/register { email, password, ... }
 * 2. Backend crée l'utilisateur dans PostgreSQL
 * 3. Backend retourne : { access_token, user }
 * 4. Frontend stocke le token
 *
 * Exemple d'utilisation :
 * const data = await register({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   first_name: 'Jean',
 *   last_name: 'Dupont',
 *   country_code: 'TG'
 * });
 */
export const register = async (userData) => {
  try {
    const response = await axiosInstance.post('/auth/register', userData);

    return {
      token: response.data.access_token,
      user: response.data
    };

  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * LOGOUT : Déconnexion
 * ================================================
 *
 * Cette fonction déconnecte l'utilisateur en supprimant
 * le token et les données du localStorage.
 *
 * ⚠️ IMPORTANT : Cette fonction ne fait PAS d'appel au backend.
 * Elle nettoie simplement les données locales.
 *
 * Pourquoi ?
 * - Le JWT est stocké côté client (localStorage)
 * - Le backend ne "stocke" pas les sessions
 * - Il suffit de supprimer le token pour déconnecter
 *
 * Exemple d'utilisation :
 * logout();
 * navigate('/login');
 */
export const logout = () => {
  // Supprimer le token JWT
  localStorage.removeItem('token');

  // Supprimer les infos utilisateur
  localStorage.removeItem('user');

  // Optionnel : Supprimer d'autres données
  localStorage.removeItem('cart');
  localStorage.removeItem('favorites');
};

/**
 * ================================================
 * GET CURRENT USER : Récupérer l'utilisateur connecté
 * ================================================
 *
 * Cette fonction récupère les infos à jour de l'utilisateur
 * connecté depuis le backend.
 *
 * @returns {Promise<object>} - Infos utilisateur
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /users/me (avec token dans headers)
 * 2. Backend lit le token JWT
 * 3. Backend retourne : { id, email, first_name, ... }
 *
 * Exemple d'utilisation :
 * const user = await getCurrentUser();
 * console.log(user.email, user.role);
 */
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/users/me');
    return response.data;

  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * CHECK AUTH : Vérifier si l'utilisateur est connecté
 * ================================================
 *
 * Cette fonction vérifie si un token existe dans localStorage
 * et s'il est encore valide.
 *
 * @returns {boolean} - true si connecté, false sinon
 *
 * Utilisation :
 * const isAuthenticated = checkAuth();
 * if (!isAuthenticated) {
 *   navigate('/login');
 * }
 */
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  return !!token;  // Convertit en boolean (true si token existe)
};

/**
 * ================================================
 * GET USER FROM STORAGE : Récupérer l'utilisateur du localStorage
 * ================================================
 *
 * Cette fonction récupère les infos utilisateur stockées
 * dans localStorage (sans appel au backend).
 *
 * @returns {object|null} - Infos utilisateur ou null
 *
 * Utilisation :
 * const user = getUserFromStorage();
 * if (user?.role === 'ADMIN') {
 *   // Afficher le menu admin
 * }
 */
export const getUserFromStorage = () => {
  const userStr = localStorage.getItem('user');

  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Erreur parsing user:', error);
    return null;
  }
};

/**
 * ================================================
 * CHECK ROLE : Vérifier le rôle de l'utilisateur
 * ================================================
 *
 * Cette fonction vérifie si l'utilisateur a un rôle spécifique.
 *
 * @param {string} requiredRole - Rôle requis (PARTICIPANT, ORGANIZER, ADMIN)
 * @returns {boolean} - true si l'utilisateur a ce rôle
 *
 * Utilisation :
 * const isAdmin = checkRole('ADMIN');
 * if (!isAdmin) {
 *   toast.error('Accès refusé');
 *   navigate('/');
 * }
 */
export const checkRole = (requiredRole) => {
  const user = getUserFromStorage();

  if (!user) return false;

  return user.role === requiredRole;
};
