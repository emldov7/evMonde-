/**
 * ================================================
 * UTILITAIRE : FORMATAGE DES DATES
 * ================================================
 *
 * Ce fichier contient des fonctions pour afficher les dates
 * dans un format lisible pour l'utilisateur.
 *
 * Exemples :
 * - "2025-11-23T10:30:00" → "23 novembre 2025"
 * - "2025-11-23T10:30:00" → "23/11/2025"
 * - "2025-11-23T10:30:00" → "23 nov. 2025 à 10:30"
 */

/**
 * Formate une date en français
 *
 * @param {string|Date} date - La date à formater
 * @returns {string} - Date formatée (ex: "23 novembre 2025")
 *
 * Exemple d'utilisation :
 * formatDate("2025-11-23T10:30:00") → "23 novembre 2025"
 */
export const formatDate = (date) => {
  // Si pas de date, retourner "N/A"
  if (!date) return 'N/A';

  // Convertir en objet Date si c'est une chaîne de caractères
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Options de formatage
  const options = {
    year: 'numeric',   // 2025
    month: 'long',     // novembre
    day: 'numeric'     // 23
  };

  // Formater en français
  return dateObj.toLocaleDateString('fr-FR', options);
};

/**
 * Formate une date en format court
 *
 * @param {string|Date} date - La date à formater
 * @returns {string} - Date formatée (ex: "23/11/2025")
 *
 * Exemple d'utilisation :
 * formatDateShort("2025-11-23T10:30:00") → "23/11/2025"
 */
export const formatDateShort = (date) => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options = {
    year: 'numeric',
    month: '2-digit',  // 11
    day: '2-digit'     // 23
  };

  return dateObj.toLocaleDateString('fr-FR', options);
};

/**
 * Formate une date avec l'heure
 *
 * @param {string|Date} date - La date à formater
 * @returns {string} - Date et heure formatées (ex: "23 nov. 2025 à 10:30")
 *
 * Exemple d'utilisation :
 * formatDateTime("2025-11-23T10:30:00") → "23 nov. 2025 à 10:30"
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const dateOptions = {
    year: 'numeric',
    month: 'short',    // nov.
    day: 'numeric'
  };

  const timeOptions = {
    hour: '2-digit',   // 10
    minute: '2-digit'  // 30
  };

  const datePart = dateObj.toLocaleDateString('fr-FR', dateOptions);
  const timePart = dateObj.toLocaleTimeString('fr-FR', timeOptions);

  return `${datePart} à ${timePart}`;
};

/**
 * Formate une plage de dates (début et fin)
 *
 * @param {string|Date} startDate - Date de début
 * @param {string|Date} endDate - Date de fin
 * @returns {string} - Plage formatée (ex: "Du 23 nov. au 25 nov. 2025")
 *
 * Exemple d'utilisation :
 * formatDateRange("2025-11-23", "2025-11-25") → "Du 23 nov. au 25 nov. 2025"
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const options = {
    day: 'numeric',
    month: 'short'
  };

  const startFormatted = start.toLocaleDateString('fr-FR', options);
  const endFormatted = end.toLocaleDateString('fr-FR', options);

  // Ajouter l'année à la fin
  const year = end.getFullYear();

  return `Du ${startFormatted} au ${endFormatted} ${year}`;
};

/**
 * Calcule le temps écoulé depuis une date
 *
 * @param {string|Date} date - La date de référence
 * @returns {string} - Temps écoulé (ex: "Il y a 2 heures", "Il y a 3 jours")
 *
 * Exemple d'utilisation :
 * getTimeAgo("2025-11-23T08:00:00") → "Il y a 2 heures"
 */
export const getTimeAgo = (date) => {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  // Différence en millisecondes
  const diffMs = now - dateObj;

  // Convertir en secondes, minutes, heures, jours
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Retourner le format approprié
  if (diffSeconds < 60) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

  // Si plus de 7 jours, afficher la date complète
  return formatDate(dateObj);
};

/**
 * Vérifie si une date est dans le futur
 *
 * @param {string|Date} date - La date à vérifier
 * @returns {boolean} - true si la date est dans le futur
 *
 * Exemple d'utilisation :
 * isFutureDate("2025-12-25") → true
 * isFutureDate("2020-01-01") → false
 */
export const isFutureDate = (date) => {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  return dateObj > now;
};

/**
 * Vérifie si une date est dans le passé
 *
 * @param {string|Date} date - La date à vérifier
 * @returns {boolean} - true si la date est dans le passé
 *
 * Exemple d'utilisation :
 * isPastDate("2020-01-01") → true
 * isPastDate("2025-12-25") → false
 */
export const isPastDate = (date) => {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  return dateObj < now;
};
