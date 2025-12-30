/**
 * ================================================
 * CONSTANTES DU PROJET
 * ================================================
 *
 * Ce fichier contient toutes les constantes utilisées dans le projet.
 * Si quelque chose doit changer (URL backend, etc.), on modifie ICI.
 */

// URL du backend FastAPI
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Préfixe des routes API
export const API_V1_PREFIX = '/api/v1';

// URL complète de base pour les appels API
export const API_URL = `${API_BASE_URL}${API_V1_PREFIX}`;

// Rôles utilisateurs
export const USER_ROLES = {
  PARTICIPANT: 'PARTICIPANT',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN'
};

// Statuts d'événement
export const EVENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

// Formats d'événement
export const EVENT_FORMATS = {
  IN_PERSON: 'in_person',
  VIRTUAL: 'virtual',
  HYBRID: 'hybrid'
};

// Statuts d'inscription
export const REGISTRATION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED'
};

// Statuts de paiement
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

// Devises supportées
export const CURRENCIES = {
  XOF: 'XOF',  // Franc CFA
  CAD: 'CAD',  // Dollar canadien
  EUR: 'EUR',  // Euro
  USD: 'USD'   // Dollar américain
};

// Symboles de devises
export const CURRENCY_SYMBOLS = {
  XOF: '$US',
  CAD: '$',
  EUR: '€',
  USD: '$US'
};
