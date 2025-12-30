/**
 * ================================================
 * API : GESTION DES ÉVÉNEMENTS
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour gérer les événements.
 * Ces fonctions sont utilisées par :
 * - SuperAdmin : Voir TOUS les événements, suspendre, supprimer
 * - Organisateur : Créer, modifier, gérer ses propres événements
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI qui est sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * GET ALL EVENTS : Récupérer tous les événements
 * ================================================
 *
 * Cette fonction récupère la liste de TOUS les événements de la plateforme.
 *
 * @param {object} params - Paramètres de filtrage (optionnels)
 * @param {string} params.search - Rechercher par titre
 * @param {string} params.status - Filtrer par statut (draft, published, cancelled)
 * @param {string} params.format - Filtrer par format (physical, virtual, hybrid)
 * @param {string} params.category_id - Filtrer par catégorie
 * @param {number} params.skip - Nombre d'événements à sauter (pagination)
 * @param {number} params.limit - Nombre max d'événements à retourner
 * @returns {Promise<Array>} - Liste des événements
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /events?search=concert&status=published
 * 2. Backend cherche dans PostgreSQL
 * 3. Backend retourne : [{ id, title, organizer, status, ... }, ...]
 *
 * Exemple d'utilisation :
 * const events = await getAllEvents({ status: 'published', search: 'concert' });
 */
export const getAllEvents = async (params = {}) => {
  try {
    // Construire les paramètres de requête
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.format) queryParams.append('format', params.format);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.skip !== undefined) queryParams.append('skip', params.skip);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);

    // Pour le SuperAdmin, utiliser l'endpoint /superadmin/events pour voir TOUS les événements
    // Sinon, /events retourne seulement les événements publiés
    const endpoint = params.admin ? '/superadmin/events' : '/events/';

    // Appeler le backend
    const response = await axiosInstance.get(`${endpoint}?${queryParams.toString()}`);

    // Retourner la liste des événements
    return response.data;

  } catch (error) {
    // En cas d'erreur, on propage l'erreur
    throw error;
  }
};

/**
 * ================================================
 * GET EVENT BY ID : Récupérer un événement par son ID
 * ================================================
 *
 * Cette fonction récupère les détails complets d'un événement.
 *
 * @param {number} eventId - L'ID de l'événement
 * @returns {Promise<object>} - Détails de l'événement
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /events/123
 * 2. Backend cherche l'événement dans PostgreSQL
 * 3. Backend retourne : { id: 123, title: '...', organizer: {...}, tickets: [...], ... }
 *
 * Exemple d'utilisation :
 * const event = await getEventById(123);
 */
export const getEventById = async (eventId) => {
  try {
    const response = await axiosInstance.get(`/superadmin/events/${eventId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * CREATE EVENT : Créer un nouvel événement
 * ================================================
 *
 * Cette fonction crée un nouvel événement (Organizer only).
 *
 * @param {object} eventData - Les données du nouvel événement
 * @param {string} eventData.title - Titre
 * @param {string} eventData.description - Description
 * @param {string} eventData.event_format - Format (physical, virtual, hybrid)
 * @param {string} eventData.start_date - Date de début (ISO format)
 * @param {string} eventData.end_date - Date de fin (ISO format)
 * @param {string} eventData.location - Lieu (si physical/hybrid)
 * @param {string} eventData.city - Ville
 * @param {string} eventData.country - Pays
 * @param {string} eventData.virtual_link - Lien visio (si virtual/hybrid)
 * @param {number} eventData.category_id - ID de la catégorie
 * @param {array} eventData.tags - Liste des IDs de tags
 * @param {string} eventData.status - Statut (draft, published)
 * @returns {Promise<object>} - Événement créé
 *
 * Exemple d'utilisation :
 * await createEvent({
 *   title: 'Concert Live',
 *   description: 'Un super concert',
 *   event_format: 'physical',
 *   start_date: '2024-12-31T20:00:00',
 *   end_date: '2024-12-31T23:00:00',
 *   location: 'Stade Omnisports',
 *   city: 'Lomé',
 *   country: 'Togo',
 *   category_id: 1,
 *   tags: [1, 2, 3],
 *   status: 'published'
 * });
 */
export const createEvent = async (eventData) => {
  try {
    const response = await axiosInstance.post('/events', eventData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * UPDATE EVENT : Mettre à jour un événement
 * ================================================
 *
 * Cette fonction met à jour un événement existant.
 *
 * @param {number} eventId - L'ID de l'événement
 * @param {object} eventData - Les nouvelles données
 * @returns {Promise<object>} - Événement mis à jour
 *
 * Exemple d'utilisation :
 * await updateEvent(123, { title: 'Nouveau titre', status: 'published' });
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const response = await axiosInstance.put(`/events/${eventId}`, eventData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * DELETE EVENT : Supprimer un événement
 * ================================================
 *
 * Cette fonction supprime définitivement un événement.
 * ⚠️ ATTENTION : Cette action est IRRÉVERSIBLE !
 *
 * @param {number} eventId - L'ID de l'événement à supprimer
 * @returns {Promise<object>} - Confirmation de suppression
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : DELETE /superadmin/events/123
 * 2. Backend supprime l'événement de PostgreSQL
 * 3. Backend retourne : { message: "Event deleted successfully" }
 *
 * Exemple d'utilisation :
 * await deleteEvent(123);
 */
export const deleteEvent = async (eventId) => {
  try {
    const response = await axiosInstance.delete(`/superadmin/events/${eventId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * CANCEL EVENT : Annuler un événement
 * ================================================
 *
 * Cette fonction annule un événement (change le statut à "cancelled").
 *
 * @param {number} eventId - L'ID de l'événement
 * @param {string} reason - La raison de l'annulation
 * @returns {Promise<object>} - Événement mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /events/123/cancel { reason: "Mauvais temps" }
 * 2. Backend met à jour dans PostgreSQL : status = "cancelled"
 * 3. Backend envoie des emails aux participants
 * 4. Backend retourne : { id: 123, status: "cancelled", ... }
 *
 * Exemple d'utilisation :
 * await cancelEvent(123, 'Conditions météo défavorables');
 */
export const cancelEvent = async (eventId, reason) => {
  try {
    const response = await axiosInstance.post(`/events/${eventId}/cancel`, {
      reason: reason
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * SUSPEND EVENT : Suspendre un événement (SuperAdmin)
 * ================================================
 *
 * Cette fonction suspend un événement.
 * Un événement suspendu n'est plus visible publiquement.
 *
 * @param {number} eventId - L'ID de l'événement
 * @param {string} reason - La raison de la suspension
 * @returns {Promise<object>} - Événement mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /superadmin/events/123/suspend { reason: "Contenu inapproprié" }
 * 2. Backend met à jour dans PostgreSQL : is_suspended = true
 * 3. Backend retourne : { id: 123, is_suspended: true, ... }
 *
 * Exemple d'utilisation :
 * await suspendEvent(123, 'Contenu inapproprié');
 */
export const suspendEvent = async (eventId, reason) => {
  try {
    const response = await axiosInstance.post(`/superadmin/events/${eventId}/flag`, {
      reason: reason
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * UNSUSPEND EVENT : Réactiver un événement (SuperAdmin)
 * ================================================
 *
 * Cette fonction réactive un événement suspendu.
 *
 * @param {number} eventId - L'ID de l'événement
 * @returns {Promise<object>} - Événement mis à jour
 *
 * Exemple d'utilisation :
 * await unsuspendEvent(123);
 */
export const unsuspendEvent = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/superadmin/events/${eventId}/unflag`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * FEATURE EVENT : Mettre un événement en avant
 * ================================================
 *
 * Cette fonction met un événement en avant (à la une).
 * Les événements mis en avant apparaissent en haut de la liste
 * sur le frontend avec un badge "Featured" / "À la une".
 *
 * @param {number} eventId - L'ID de l'événement
 * @returns {Promise<object>} - Événement mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /superadmin/events/123/feature
 * 2. Backend met à jour dans PostgreSQL : is_featured = true
 * 3. Backend retourne : { message: "Événement mis en avant", event_id: 123 }
 *
 * Exemple d'utilisation :
 * await featureEvent(123);
 */
export const featureEvent = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/superadmin/events/${eventId}/feature`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * UNFEATURE EVENT : Retirer un événement de la une
 * ================================================
 *
 * Cette fonction retire un événement de la une.
 *
 * @param {number} eventId - L'ID de l'événement
 * @returns {Promise<object>} - Événement mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : POST /superadmin/events/123/unfeature
 * 2. Backend met à jour dans PostgreSQL : is_featured = false
 * 3. Backend retourne : { message: "Événement retiré de la une", event_id: 123 }
 *
 * Exemple d'utilisation :
 * await unfeatureEvent(123);
 */
export const unfeatureEvent = async (eventId) => {
  try {
    const response = await axiosInstance.post(`/superadmin/events/${eventId}/unfeature`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * UPDATE ADMIN NOTES : Ajouter/Modifier les notes admin
 * ================================================
 *
 * Cette fonction permet au SuperAdmin d'ajouter ou modifier
 * des notes privées sur un événement (visibles seulement par les admins).
 *
 * @param {number} eventId - L'ID de l'événement
 * @param {string} notes - Les notes à ajouter
 * @returns {Promise<object>} - Événement mis à jour
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : PUT /superadmin/events/123/notes { notes: "..." }
 * 2. Backend met à jour dans PostgreSQL : admin_notes = "..."
 * 3. Backend retourne : { message: "Notes mises à jour", event_id: 123 }
 *
 * Exemple d'utilisation :
 * await updateAdminNotes(123, 'Événement à surveiller de près');
 */
export const updateAdminNotes = async (eventId, notes) => {
  try {
    const response = await axiosInstance.put(`/superadmin/events/${eventId}/notes`, {
      notes: notes
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * GET EVENT STATISTICS : Récupérer les statistiques événements
 * ================================================
 *
 * Cette fonction récupère les statistiques globales sur les événements.
 *
 * @returns {Promise<object>} - Statistiques
 *
 * Exemple de réponse :
 * {
 *   total_events: 523,
 *   published_events: 450,
 *   draft_events: 50,
 *   cancelled_events: 23,
 *   suspended_events: 5,
 *   total_registrations: 12500,
 *   upcoming_events: 120
 * }
 *
 * FLUX DE COMMUNICATION :
 * 1. Frontend envoie : GET /superadmin/events/statistics
 * 2. Backend calcule depuis PostgreSQL
 * 3. Backend retourne : { total_events: 523, ... }
 */
export const getEventStatistics = async () => {
  try {
    const response = await axiosInstance.get('/superadmin/events/statistics');
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
 * Ce fichier contient 10 fonctions principales :
 *
 * 1. getAllEvents() - Récupère la liste de tous les événements
 * 2. getEventById() - Récupère les détails d'un événement
 * 3. createEvent() - Crée un nouvel événement
 * 4. updateEvent() - Met à jour un événement
 * 5. deleteEvent() - Supprime un événement (SuperAdmin)
 * 6. cancelEvent() - Annule un événement
 * 7. suspendEvent() - Suspend un événement (SuperAdmin)
 * 8. unsuspendEvent() - Réactive un événement (SuperAdmin)
 * 9. getEventStatistics() - Récupère les statistiques
 *
 * Toutes ces fonctions utilisent axiosInstance qui :
 * - Ajoute automatiquement le token JWT dans les headers
 * - Gère automatiquement les erreurs 401 (non autorisé)
 * - Retourne directement response.data
 */
