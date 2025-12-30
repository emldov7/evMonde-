/**
 * ================================================
 * PAGE : GESTION CATÉGORIES & TAGS (SUPERADMIN)
 * ================================================
 *
 * Design ultra premium pour impressionner les clients
 * Gestion complète des catégories et tags d'événements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaTags,
  FaFolder,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaBan,
  FaPalette,
  FaSave,
  FaTimes,
  FaPercent
} from 'react-icons/fa';

// Composants
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import '../../styles/superadmin.css';

// API
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllTags,
  createTag,
  updateTag,
  deleteTag
} from '../../api/categories';

function CategoriesManagement() {
  const navigate = useNavigate();

  // État
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' ou 'tags'

  // Catégories
  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '📁',
    custom_commission_rate: null
  });

  // Tags
  const [tags, setTags] = useState([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    color: '#3B82F6'
  });

  /**
   * Charger les données au montage
   */
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [categoriesData, tagsData] = await Promise.all([
        getAllCategories(),
        getAllTags()
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      toast.error('Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ================================================
   * GESTION DES CATÉGORIES
   * ================================================
   */

  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '📁',
        custom_commission_rate: category.custom_commission_rate || null
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: '📁', custom_commission_rate: null });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('✅ Catégorie mise à jour');
      } else {
        await createCategory(categoryForm);
        toast.success('✅ Catégorie créée');
      }
      setIsCategoryModalOpen(false);
      loadAllData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde catégorie:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ?\n\n⚠️ Attention : Cette action est irréversible !`)) {
      return;
    }

    try {
      await deleteCategory(category.id);
      toast.success('🗑️ Catégorie supprimée');
      loadAllData();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  /**
   * ================================================
   * GESTION DES TAGS
   * ================================================
   */

  const handleOpenTagModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({
        name: tag.name,
        color: tag.color || '#3B82F6'
      });
    } else {
      setEditingTag(null);
      setTagForm({ name: '', color: '#3B82F6' });
    }
    setIsTagModalOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) {
      toast.error('Le nom du tag est requis');
      return;
    }

    try {
      if (editingTag) {
        await updateTag(editingTag.id, tagForm);
        toast.success('✅ Tag mis à jour');
      } else {
        await createTag(tagForm);
        toast.success('✅ Tag créé');
      }
      setIsTagModalOpen(false);
      loadAllData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde tag:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Supprimer le tag "${tag.name}" ?\n\n⚠️ Attention : Cette action est irréversible !`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      toast.success('🗑️ Tag supprimé');
      loadAllData();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  /**
   * Palette de couleurs prédéfinies pour les tags
   */
  const colorPalette = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  if (loading) {
    return (
      <div className="sa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-loading">
          <div className="sa-spinner"></div>
          <span className="sa-loading-text">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">

      {/* HEADER */}
      <header className="sa-header">
        <div className="sa-container">
          <div className="sa-header-content">
            <div className="sa-header-left">
              <button
                className="sa-back-btn"
                onClick={() => navigate('/superadmin/dashboard')}
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <FaArrowLeft style={{ color: 'white' }} />
              </button>
              <div>
                <h1 className="sa-header-title">🏷️ Catégories & Tags</h1>
                <p className="sa-header-subtitle">Organisez vos événements avec des catégories et tags</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="sa-container" style={{ padding: '2rem 1.5rem' }}>

        {/* TABS */}
        <div className="sa-card" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: activeTab === 'categories' ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' : 'transparent',
              color: activeTab === 'categories' ? 'white' : '#64748b',
              boxShadow: activeTab === 'categories' ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
            }}
          >
            <FaFolder style={{ fontSize: '1.25rem' }} />
            Catégories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: activeTab === 'tags' ? 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' : 'transparent',
              color: activeTab === 'tags' ? 'white' : '#64748b',
              boxShadow: activeTab === 'tags' ? '0 4px 15px rgba(249, 115, 22, 0.4)' : 'none'
            }}
          >
            <FaTags style={{ fontSize: '1.25rem' }} />
            Tags ({tags.length})
          </button>
        </div>

        {/* SECTION CATÉGORIES */}
        {activeTab === 'categories' && (
          <div>
            {/* BOUTON AJOUTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button
                className="sa-btn sa-btn-primary"
                onClick={() => handleOpenCategoryModal()}
              >
                <FaPlus />
                Nouvelle Catégorie
              </button>
            </div>

            {/* GRILLE DE CATÉGORIES */}
            <div className="sa-quick-grid">
              {categories.map((category) => (
                <div key={category.id} className="sa-quick-card purple" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2.5rem' }}>{category.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{category.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>/{category.slug}</p>
                      </div>
                    </div>
                    {category.is_active ? (
                      <span className="sa-badge sa-badge-success"><FaCheckCircle /> Actif</span>
                    ) : (
                      <span className="sa-badge sa-badge-danger"><FaBan /> Inactif</span>
                    )}
                  </div>

                  {category.description && (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>{category.description}</p>
                  )}

                  {category.custom_commission_rate !== null && category.custom_commission_rate !== undefined && (
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="sa-badge sa-badge-success">
                        <FaPercent /> Commission: {category.custom_commission_rate}%
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => handleOpenCategoryModal(category)}
                      className="sa-btn sa-btn-secondary"
                      style={{ flex: 1, padding: '0.5rem' }}
                    >
                      <FaEdit /> Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="sa-btn sa-btn-danger"
                      style={{ flex: 1, padding: '0.5rem' }}
                    >
                      <FaTrash /> Supprimer
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }} className="sa-empty">
                  <div className="sa-empty-icon"><FaFolder /></div>
                  <h3 className="sa-empty-title">Aucune catégorie pour le moment</h3>
                  <p className="sa-empty-text">Créez votre première catégorie pour commencer</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION TAGS */}
        {activeTab === 'tags' && (
          <div>
            {/* BOUTON AJOUTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button
                className="sa-btn"
                onClick={() => handleOpenTagModal()}
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', color: 'white' }}
              >
                <FaPlus />
                Nouveau Tag
              </button>
            </div>

            {/* GRILLE DE TAGS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="sa-card"
                  style={{ padding: '1rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: tag.color,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{tag.name}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenTagModal(tag)}
                      className="sa-btn-icon blue"
                      style={{ flex: 1 }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag)}
                      className="sa-btn-icon red"
                      style={{ flex: 1 }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}

              {tags.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }} className="sa-empty">
                  <div className="sa-empty-icon"><FaTags /></div>
                  <h3 className="sa-empty-title">Aucun tag pour le moment</h3>
                  <p className="sa-empty-text">Créez votre premier tag pour commencer</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODAL CATÉGORIE */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? '✏️ Modifier la catégorie' : '➕ Nouvelle catégorie'}
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Icône (Emoji)
            </label>
            <input
              type="text"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              className="w-full px-4 py-3 text-4xl text-center border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="📁"
              maxLength={2}
            />
            <p className="text-xs text-gray-500 mt-1">Choisissez un emoji représentatif</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nom de la catégorie *
            </label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Ex: Musique, Sport, Tech..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              placeholder="Décrivez cette catégorie..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <FaPercent className="inline mr-2" />
              Commission personnalisée (%)
            </label>
            <input
              type="number"
              value={categoryForm.custom_commission_rate || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value);
                setCategoryForm({ ...categoryForm, custom_commission_rate: value });
              }}
              min="0"
              max="100"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Laisser vide pour utiliser la commission globale"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si vide, la commission globale sera appliquée. Sinon, cette commission remplacera la commission globale pour cette catégorie.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="sa-btn sa-btn-secondary"
              style={{ flex: 1 }}
            >
              <FaTimes />
              Annuler
            </button>
            <button
              onClick={handleSaveCategory}
              className="sa-btn sa-btn-primary"
              style={{ flex: 1 }}
              disabled={!categoryForm?.name?.trim()}
            >
              <FaSave />
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL TAG */}
      <Modal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        title={editingTag ? '✏️ Modifier le tag' : '➕ Nouveau tag'}
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nom du tag *
            </label>
            <input
              type="text"
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Ex: Innovation, Startup, AI..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              <FaPalette className="inline mr-2" />
              Couleur du tag
            </label>

            {/* Palette de couleurs */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => setTagForm({ ...tagForm, color })}
                  className={`w-full h-12 rounded-xl transition-all ${
                    tagForm.color === color
                      ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Input couleur personnalisée */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={tagForm.color}
                onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300"
              />
              <input
                type="text"
                value={tagForm.color}
                onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-mono"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-2">Aperçu :</p>
            <span
              className="inline-block px-4 py-2 rounded-full text-white font-bold shadow-lg"
              style={{ backgroundColor: tagForm.color }}
            >
              {tagForm.name || 'Nom du tag'}
            </span>
          </div>

          <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
            <button
              onClick={() => setIsTagModalOpen(false)}
              className="sa-btn sa-btn-secondary"
              style={{ flex: 1 }}
            >
              <FaTimes />
              Annuler
            </button>
            <button
              onClick={handleSaveTag}
              className="sa-btn"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                color: 'white',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.25)'
              }}
              disabled={!tagForm.name?.trim()}
            >
              <FaSave />
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default CategoriesManagement;
