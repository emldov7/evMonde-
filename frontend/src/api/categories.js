/**
 * ================================================
 * API : GESTION DES CATÉGORIES ET TAGS
 * ================================================
 *
 * Ce fichier contient toutes les fonctions pour gérer les catégories
 * et les tags des événements. Ces fonctions sont utilisées par :
 * - SuperAdmin : CRUD complet sur catégories et tags
 * - Public : Lecture des catégories et tags
 *
 * COMMUNICATION AVEC LE BACKEND :
 * Toutes ces fonctions appellent le backend FastAPI sur http://localhost:8000
 */

import axiosInstance from './axios';

/**
 * ================================================
 * CATÉGORIES
 * ================================================
 */

/**
 * GET ALL CATEGORIES : Récupérer toutes les catégories
 *
 * @returns {Promise<Array>} - Liste des catégories
 *
 * Exemple de réponse :
 * [
 *   {
 *     id: 1,
 *     name: "Musique",
 *     slug: "musique",
 *     description: "Concerts, festivals...",
 *     icon: "🎵",
 *     is_active: true
 *   },
 *   ...
 * ]
 */
export const getAllCategories = async () => {
  try {
    const response = await axiosInstance.get('/marketplace/categories');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * CREATE CATEGORY : Créer une nouvelle catégorie (SuperAdmin)
 *
 * @param {object} categoryData - Les données de la catégorie
 * @param {string} categoryData.name - Nom de la catégorie
 * @param {string} categoryData.description - Description
 * @param {string} categoryData.icon - Emoji/icône
 * @returns {Promise<object>} - Catégorie créée
 */
export const createCategory = async (categoryData) => {
  try {
    const response = await axiosInstance.post('/marketplace/categories', categoryData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * UPDATE CATEGORY : Mettre à jour une catégorie (SuperAdmin)
 *
 * @param {number} categoryId - L'ID de la catégorie
 * @param {object} categoryData - Les nouvelles données
 * @returns {Promise<object>} - Catégorie mise à jour
 */
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const response = await axiosInstance.put(`/marketplace/categories/${categoryId}`, categoryData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * DELETE CATEGORY : Supprimer une catégorie (SuperAdmin)
 *
 * @param {number} categoryId - L'ID de la catégorie à supprimer
 * @returns {Promise<object>} - Confirmation de suppression
 */
export const deleteCategory = async (categoryId) => {
  try {
    const response = await axiosInstance.delete(`/marketplace/categories/${categoryId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * ================================================
 * TAGS
 * ================================================
 */

/**
 * GET ALL TAGS : Récupérer tous les tags
 *
 * @returns {Promise<Array>} - Liste des tags
 *
 * Exemple de réponse :
 * [
 *   {
 *     id: 1,
 *     name: "Tech",
 *     slug: "tech",
 *     color: "#3B82F6",
 *     is_active: true
 *   },
 *   ...
 * ]
 */
export const getAllTags = async () => {
  try {
    const response = await axiosInstance.get('/marketplace/tags');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * CREATE TAG : Créer un nouveau tag (SuperAdmin)
 *
 * @param {object} tagData - Les données du tag
 * @param {string} tagData.name - Nom du tag
 * @param {string} tagData.color - Couleur hexadécimale
 * @returns {Promise<object>} - Tag créé
 */
export const createTag = async (tagData) => {
  try {
    const response = await axiosInstance.post('/marketplace/tags', tagData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * UPDATE TAG : Mettre à jour un tag (SuperAdmin)
 *
 * @param {number} tagId - L'ID du tag
 * @param {object} tagData - Les nouvelles données
 * @returns {Promise<object>} - Tag mis à jour
 */
export const updateTag = async (tagId, tagData) => {
  try {
    const response = await axiosInstance.put(`/marketplace/tags/${tagId}`, tagData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * DELETE TAG : Supprimer un tag (SuperAdmin)
 *
 * @param {number} tagId - L'ID du tag à supprimer
 * @returns {Promise<object>} - Confirmation de suppression
 */
export const deleteTag = async (tagId) => {
  try {
    const response = await axiosInstance.delete(`/marketplace/tags/${tagId}`);
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
 * CATÉGORIES :
 * 1. getAllCategories() - Récupère toutes les catégories
 * 2. createCategory() - Crée une nouvelle catégorie
 * 3. updateCategory() - Met à jour une catégorie
 * 4. deleteCategory() - Supprime une catégorie
 *
 * TAGS :
 * 1. getAllTags() - Récupère tous les tags
 * 2. createTag() - Crée un nouveau tag
 * 3. updateTag() - Met à jour un tag
 * 4. deleteTag() - Supprime un tag
 */
