/**
 * ================================================
 * UTILITAIRE : FORMATAGE DES MONTANTS
 * ================================================
 *
 * Ce fichier contient des fonctions pour afficher les montants
 * d'argent dans le bon format selon la devise.
 *
 * Exemples :
 * - 15000 XOF → "15 000 FCFA"
 * - 50 CAD → "50,00 $"
 * - 25 EUR → "25,00 €"
 */

import { CURRENCY_SYMBOLS } from './constants';

/**
 * Formate un montant selon la devise
 *
 * @param {number} amount - Le montant à formater
 * @param {string} currency - La devise (XOF, CAD, EUR)
 * @returns {string} - Montant formaté avec symbole
 *
 * Exemple d'utilisation :
 * formatCurrency(15000, 'XOF') → "15 000 FCFA"
 * formatCurrency(50, 'CAD') → "50,00 $"
 * formatCurrency(25.5, 'EUR') → "25,50 €"
 */
export const formatCurrency = (amount, currency) => {
  // Si pas de montant, retourner "0"
  if (!amount && amount !== 0) return '0';

  // Convertir en nombre si c'est une chaîne
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  const code = (currency || 'XOF').toUpperCase();

  // Récupérer le symbole de la devise
  const symbol = CURRENCY_SYMBOLS[code] || code;

  // Formater selon la devise
  switch (code) {
    case 'XOF':
      // XOF : Pas de décimales, espace tous les 3 chiffres
      // Exemple : 15000 → "15 000 FCFA"
      return `${numAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })} ${symbol}`;

    case 'CAD':
      // CAD : 2 décimales, symbole après
      // Exemple : 50 → "50,00 $"
      return `${numAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} ${symbol}`;

    case 'EUR':
      // EUR : 2 décimales, symbole après
      // Exemple : 25.5 → "25,50 €"
      return `${numAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} ${symbol}`;

    case 'USD':
      // USD : 2 décimales
      return `${numAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} ${symbol}`;

    default:
      // Devise inconnue : Afficher avec 2 décimales
      return `${numAmount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} ${code}`;
  }
};

/**
 * Formate un montant en format compact (pour les graphiques)
 *
 * @param {number} amount - Le montant à formater
 * @param {string} currency - La devise
 * @returns {string} - Montant formaté compact
 *
 * Exemple d'utilisation :
 * formatCurrencyCompact(15000, 'XOF') → "15K FCFA"
 * formatCurrencyCompact(1500000, 'XOF') → "1,5M FCFA"
 */
export const formatCurrencyCompact = (amount, currency) => {
  if (!amount && amount !== 0) return '0';

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  let code = (currency || 'USD').toUpperCase();
  // Mode temporaire: afficher en USD même si la donnée arrive en XOF
  if (code === 'XOF') code = 'USD';
  const symbol = CURRENCY_SYMBOLS[code] || code;

  // Si moins de 1000, afficher tel quel
  if (numAmount < 1000) {
    return formatCurrency(numAmount, code);
  }

  // Si entre 1000 et 1 million, afficher en K (milliers)
  if (numAmount < 1000000) {
    const thousands = numAmount / 1000;
    return `${thousands.toFixed(1)}K ${symbol}`;
  }

  // Si 1 million ou plus, afficher en M (millions)
  const millions = numAmount / 1000000;
  return `${millions.toFixed(1)}M ${symbol}`;
};

/**
 * Calcule le pourcentage d'un montant
 *
 * @param {number} amount - Montant de base
 * @param {number} percentage - Pourcentage (ex: 3 pour 3%)
 * @returns {number} - Montant calculé
 *
 * Exemple d'utilisation :
 * calculatePercentage(1000, 3) → 30
 * calculatePercentage(15000, 3) → 450
 */
export const calculatePercentage = (amount, percentage) => {
  if (!amount || !percentage) return 0;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;

  return (numAmount * numPercentage) / 100;
};

/**
 * Formate un pourcentage
 *
 * @param {number} value - La valeur du pourcentage
 * @returns {string} - Pourcentage formaté
 *
 * Exemple d'utilisation :
 * formatPercentage(3) → "3%"
 * formatPercentage(3.5) → "3,5%"
 */
export const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return `${numValue.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}%`;
};

/**
 * Calcule la commission sur un montant
 *
 * @param {number} amount - Montant de base
 * @param {number} commissionRate - Taux de commission (ex: 3 pour 3%)
 * @returns {object} - { commissionAmount, netAmount }
 *
 * Exemple d'utilisation :
 * calculateCommission(1000, 3) → { commissionAmount: 30, netAmount: 970 }
 */
export const calculateCommission = (amount, commissionRate) => {
  if (!amount || !commissionRate) {
    return { commissionAmount: 0, netAmount: amount || 0 };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numRate = typeof commissionRate === 'string' ? parseFloat(commissionRate) : commissionRate;

  const commissionAmount = (numAmount * numRate) / 100;
  const netAmount = numAmount - commissionAmount;

  return {
    commissionAmount: Math.round(commissionAmount * 100) / 100,  // Arrondir à 2 décimales
    netAmount: Math.round(netAmount * 100) / 100
  };
};

/**
 * Vérifie si un montant est valide
 *
 * @param {any} amount - Le montant à vérifier
 * @returns {boolean} - true si valide
 *
 * Exemple d'utilisation :
 * isValidAmount(100) → true
 * isValidAmount("abc") → false
 * isValidAmount(-50) → false
 */
export const isValidAmount = (amount) => {
  if (!amount && amount !== 0) return false;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Vérifier que c'est un nombre et qu'il est positif
  return !isNaN(numAmount) && numAmount >= 0;
};
