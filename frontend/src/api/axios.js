/**
 * ================================================
 * CONFIGURATION AXIOS
 * ================================================
 *
 * Ce fichier configure Axios pour communiquer avec le backend.
 *
 * AXIOS : C'est comme un facteur qui livre des messages entre
 * le frontend (React) et le backend (FastAPI).
 *
 * Pourquoi ce fichier ?
 * - Centralise l'URL du backend (si elle change, on modifie ICI seulement)
 * - Ajoute automatiquement le token JWT à chaque requête
 * - Gère les erreurs automatiquement
 */

import axios from 'axios';
import { API_URL } from '../utils/constants';

/**
 * ================================================
 * CRÉATION DE L'INSTANCE AXIOS
 * ================================================
 */

// Créer une instance Axios personnalisée
const axiosInstance = axios.create({
  baseURL: API_URL,  // http://localhost:8000/api/v1
  headers: {
    'Content-Type': 'application/json',  // On envoie du JSON
  },
  timeout: 30000,  // 30 secondes max par requête
});

/**
 * ================================================
 * INTERCEPTEUR DE REQUÊTE (Request Interceptor)
 * ================================================
 *
 * Cet intercepteur s'exécute AVANT chaque requête envoyée au backend.
 *
 * Son rôle :
 * 1. Récupérer le token JWT stocké dans localStorage
 * 2. Ajouter le token dans les headers de la requête
 * 3. Le backend pourra ainsi vérifier que l'utilisateur est bien connecté
 *
 * Fonctionnement :
 * Quand tu fais : axios.get('/superadmin/users')
 * L'intercepteur transforme en : axios.get('/superadmin/users', {
 *   headers: { Authorization: 'Bearer eyJ...' }
 * })
 */

axiosInstance.interceptors.request.use(
  (config) => {
    // ÉTAPE 1 : Récupérer le token du localStorage
    const token = localStorage.getItem('token');

    // ÉTAPE 2 : Si un token existe, l'ajouter aux headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Format : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }

    // ÉTAPE 3 : Retourner la config modifiée
    return config;
  },
  (error) => {
    // Si erreur avant même d'envoyer la requête
    return Promise.reject(error);
  }
);

/**
 * ================================================
 * INTERCEPTEUR DE RÉPONSE (Response Interceptor)
 * ================================================
 *
 * Cet intercepteur s'exécute APRÈS chaque réponse reçue du backend.
 *
 * Son rôle :
 * 1. Si réponse OK → Retourner les données
 * 2. Si erreur 401 (Non autorisé) → Déconnecter l'utilisateur
 * 3. Si autre erreur → Retourner un message d'erreur clair
 *
 * Cas d'usage :
 * - Token expiré → Redirige vers login
 * - Token invalide → Redirige vers login
 * - Erreur serveur → Affiche message d'erreur
 */

axiosInstance.interceptors.response.use(
  (response) => {
    // ✅ Réponse OK (status 200-299)
    // Retourner directement les données
    return response;
  },
  (error) => {
    // ❌ Erreur (status 400-599)

    // ERREUR 401 : Non autorisé (token expiré ou invalide)
    if (error.response && error.response.status === 401) {
      // Supprimer le token et les données utilisateur
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Rediriger vers la page de login
      const isSuperadminArea = window.location.pathname.startsWith('/superadmin');
      window.location.href = isSuperadminArea ? '/superadmin/login' : '/login';

      return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
    }

    // ERREUR 403 : Accès interdit (pas les permissions)
    if (error.response && error.response.status === 403) {
      return Promise.reject(new Error('Accès refusé. Vous n\'avez pas les permissions nécessaires.'));
    }

    // ERREUR 404 : Ressource non trouvée
    if (error.response && error.response.status === 404) {
      return Promise.reject(new Error('Ressource non trouvée.'));
    }

    // ERREUR 500 : Erreur serveur
    if (error.response && error.response.status >= 500) {
      return Promise.reject(new Error('Erreur serveur. Veuillez réessayer plus tard.'));
    }

    // Erreur réseau (pas de connexion)
    if (!error.response) {
      return Promise.reject(new Error('Erreur de connexion. Vérifiez votre connexion Internet.'));
    }

    // Autres erreurs : Retourner le message du backend
    const message = error.response?.data?.detail || error.message || 'Une erreur est survenue';
    return Promise.reject(new Error(message));
  }
);

/**
 * ================================================
 * EXPORT DE L'INSTANCE
 * ================================================
 */

export default axiosInstance;

/**
 * ================================================
 * EXEMPLES D'UTILISATION
 * ================================================
 *
 * Dans n'importe quel fichier API (auth.js, users.js, etc.) :
 *
 * import axiosInstance from './axios';
 *
 * // GET : Récupérer des données
 * const response = await axiosInstance.get('/superadmin/users');
 * console.log(response.data);
 *
 * // POST : Envoyer des données
 * const response = await axiosInstance.post('/auth/login', {
 *   email: 'admin@example.com',
 *   password: '123456'
 * });
 * console.log(response.data.token);
 *
 * // PUT : Modifier des données
 * const response = await axiosInstance.put('/superadmin/users/1', {
 *   first_name: 'Nouveau nom'
 * });
 *
 * // DELETE : Supprimer des données
 * await axiosInstance.delete('/superadmin/users/1');
 */
