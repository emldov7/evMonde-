/**
 * ================================================
 * PAGE : GESTION DES UTILISATEURS (SUPERADMIN)
 * ================================================
 *
 * Cette page permet au SuperAdmin de gérer tous les utilisateurs.
 *
 * FONCTIONNALITÉS :
 * 1. Voir la liste de tous les utilisateurs ✅
 * 2. Rechercher un utilisateur par nom ou email ✅
 * 3. Filtrer par rôle (Participant, Organizer, Admin) ✅
 * 4. Filtrer par statut (Actif, Suspendu) ✅
 * 5. Créer un nouvel utilisateur ✅ NOUVEAU !
 * 6. Suspendre / Réactiver un utilisateur ✅
 * 7. Promouvoir un utilisateur (changer son rôle) ✅
 * 8. Supprimer un utilisateur ✅ NOUVEAU !
 *
 * FLUX DE DONNÉES :
 * 1. La page se charge
 * 2. On récupère la liste des utilisateurs depuis le backend
 * 3. On affiche les utilisateurs dans un tableau
 * 4. L'utilisateur peut filtrer, rechercher, créer, suspendre, supprimer, etc.
 * 5. Chaque action envoie une requête au backend
 * 6. Le backend met à jour PostgreSQL
 * 7. On rafraîchit la liste
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUsers, FaSearch, FaFilter, FaBan, FaCheck,
  FaUserShield, FaArrowLeft, FaUserCircle, FaPlus, FaTrash
} from 'react-icons/fa';

// Importer les composants
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import '../../styles/superadmin.css';

// Importer les fonctions API
import {
  getAllUsers,
  suspendUser,
  unsuspendUser,
  promoteUser,
  createUser,
  deleteUser
} from '../../api/users';
import { getUserFromStorage } from '../../api/auth';

// Importer les utilitaires
import { formatDate } from '../../utils/formatDate';

function UsersManagement() {

  /**
   * ================================================
   * ÉTAT DU COMPOSANT (useState)
   * ================================================
   */

  const navigate = useNavigate();

  // Liste des utilisateurs
  const [users, setUsers] = useState([]);

  // État de chargement
  const [loading, setLoading] = useState(true);

  // Recherche
  const [searchTerm, setSearchTerm] = useState('');

  // Filtres
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Utilisateur connecté
  const [currentUser, setCurrentUser] = useState(null);

  // Modal de création d'utilisateur
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Données du formulaire de création
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    country_code: 'TG',
    phone: '',
    role: 'participant',
    preferred_language: 'fr'
  });

  // Erreurs du formulaire
  const [formErrors, setFormErrors] = useState({});

  /**
   * ================================================
   * useEffect : Chargement initial
   * ================================================
   */
  useEffect(() => {
    const user = getUserFromStorage();
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      toast.error('Accès refusé. Vous devez être SuperAdmin.');
      navigate('/superadmin/login');
      return;
    }

    setCurrentUser(user);
    loadUsers();
  }, []);

  /**
   * ================================================
   * FONCTION : Charger les utilisateurs
   * ================================================
   */
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('📥 Chargement des utilisateurs...');

      const data = await getAllUsers();
      console.log('✅ Utilisateurs reçus:', data);

      setUsers(data);
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ================================================
   * FONCTION : Valider le formulaire de création
   * ================================================
   */
  const validateForm = () => {
    const errors = {};

    if (!newUserData.email) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(newUserData.email)) {
      errors.email = 'Email invalide';
    }

    if (!newUserData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (newUserData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!newUserData.first_name) {
      errors.first_name = 'Le prénom est requis';
    }

    if (!newUserData.last_name) {
      errors.last_name = 'Le nom est requis';
    }

    if (!newUserData.phone) {
      errors.phone = 'Le téléphone est requis';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * ================================================
   * FONCTION : Créer un utilisateur
   * ================================================
   */
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    setIsCreating(true);

    try {
      console.log('👤 Création d\'un nouvel utilisateur...');

      await createUser(newUserData);

      toast.success('Utilisateur créé avec succès !');

      // Fermer le modal
      setIsCreateModalOpen(false);

      // Réinitialiser le formulaire
      setNewUserData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        country_code: 'TG',
        phone: '',
        role: 'participant',
        preferred_language: 'fr'
      });

      // Recharger la liste
      loadUsers();

    } catch (error) {
      console.error('❌ Erreur création utilisateur:', error);
      toast.error(error.message || 'Impossible de créer l\'utilisateur');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * ================================================
   * FONCTION : Supprimer un utilisateur
   * ================================================
   */
  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `⚠️ ATTENTION !\n\nÊtes-vous ABSOLUMENT sûr de vouloir SUPPRIMER ${userName} ?\n\nCette action est IRRÉVERSIBLE !\n\n- Tous les événements créés par cet utilisateur seront affectés\n- Toutes les inscriptions seront perdues\n- Cette action ne peut PAS être annulée\n\nConfirmer la suppression ?`
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = window.prompt(
      `Pour confirmer, tapez : DELETE\n\n(en majuscules)`
    );

    if (doubleConfirm !== 'DELETE') {
      toast.error('Suppression annulée');
      return;
    }

    try {
      console.log(`🗑️ Suppression de l'utilisateur ${userId}...`);

      await deleteUser(userId);

      toast.success(`${userName} a été supprimé définitivement`);

      loadUsers();

    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Impossible de supprimer l\'utilisateur');
    }
  };

  /**
   * ================================================
   * FONCTION : Suspendre un utilisateur
   * ================================================
   */
  const handleSuspendUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir suspendre ${userName} ?\n\nL'utilisateur ne pourra plus se connecter.`
    );

    if (!confirmed) return;

    const reason = window.prompt('Raison de la suspension :');
    if (!reason) {
      toast.error('Vous devez fournir une raison');
      return;
    }

    try {
      console.log(`🚫 Suspension de l'utilisateur ${userId}...`);

      await suspendUser(userId, reason);

      toast.success(`${userName} a été suspendu`);

      loadUsers();

    } catch (error) {
      console.error('❌ Erreur suspension:', error);
      toast.error('Impossible de suspendre l\'utilisateur');
    }
  };

  /**
   * ================================================
   * FONCTION : Réactiver un utilisateur
   * ================================================
   */
  const handleUnsuspendUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir réactiver ${userName} ?`
    );

    if (!confirmed) return;

    try {
      console.log(`✅ Réactivation de l'utilisateur ${userId}...`);

      await unsuspendUser(userId);

      toast.success(`${userName} a été réactivé`);

      loadUsers();

    } catch (error) {
      console.error('❌ Erreur réactivation:', error);
      toast.error('Impossible de réactiver l\'utilisateur');
    }
  };

  /**
   * ================================================
   * FONCTION : Promouvoir un utilisateur
   * ================================================
   */
  const handlePromoteUser = async (userId, userName, currentRole) => {
    const roles = {
      'participant': 'Participant',
      'organizer': 'Organizer',
      'admin': 'Admin'
    };

    const newRole = window.prompt(
      `Changer le rôle de ${userName}\n\nRôle actuel : ${roles[currentRole.toLowerCase()]}\n\nEntrez le nouveau rôle :\n- participant\n- organizer\n- admin`
    );

    if (!newRole) return;

    if (!['participant', 'organizer', 'admin'].includes(newRole.toLowerCase())) {
      toast.error('Rôle invalide');
      return;
    }

    const confirmed = window.confirm(
      `Confirmer le changement de rôle de ${userName} :\n${roles[currentRole.toLowerCase()]} → ${roles[newRole.toLowerCase()]}`
    );

    if (!confirmed) return;

    try {
      console.log(`👑 Promotion de l'utilisateur ${userId} vers ${newRole}...`);

      await promoteUser(userId, newRole.toLowerCase());

      toast.success(`${userName} est maintenant ${roles[newRole.toLowerCase()]}`);

      loadUsers();

    } catch (error) {
      console.error('❌ Erreur promotion:', error);
      toast.error('Impossible de changer le rôle');
    }
  };

  /**
   * ================================================
   * FONCTION : Filtrer les utilisateurs
   * ================================================
   */
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch =
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (roleFilter !== 'all' && user.role.toLowerCase() !== roleFilter) {
        return false;
      }

      if (statusFilter === 'active' && user.is_suspended) return false;
      if (statusFilter === 'suspended' && !user.is_suspended) return false;

      return true;
    });
  };

  const filteredUsers = getFilteredUsers();

  /**
   * ================================================
   * RENDU : Affichage du composant
   * ================================================
   */

  if (loading) {
    return (
      <div className="sa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-loading">
          <div className="sa-spinner"></div>
          <span className="sa-loading-text">Chargement des utilisateurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">

      {/* ===== EN-TÊTE ===== */}
      <div className="sa-page-header">
        <div className="sa-container">
          <div className="sa-page-header-content">
            <div className="sa-page-header-left">
              <button
                className="sa-back-btn"
                onClick={() => navigate('/superadmin/dashboard')}
              >
                <FaArrowLeft />
              </button>
              <div>
                <h1 className="sa-page-title">Gestion des Utilisateurs</h1>
                <p className="sa-page-subtitle">Gérer tous les utilisateurs de la plateforme</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaUserCircle style={{ fontSize: '1.5rem', color: '#64748b' }} />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{currentUser?.first_name || 'Admin'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="sa-container" style={{ padding: '2rem 1.5rem' }}>

        {/* ===== STATISTIQUES ===== */}
        <div className="sa-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="sa-stat-card gradient-blue">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaUsers /></div>
            </div>
            <p className="sa-stat-label">Total Utilisateurs</p>
            <p className="sa-stat-value">{users.length}</p>
          </div>

          <div className="sa-stat-card gradient-green">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaUserCircle /></div>
            </div>
            <p className="sa-stat-label">Participants</p>
            <p className="sa-stat-value">{users.filter(u => u.role.toLowerCase() === 'participant').length}</p>
          </div>

          <div className="sa-stat-card gradient-purple">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaUserShield /></div>
            </div>
            <p className="sa-stat-label">Organizers</p>
            <p className="sa-stat-value">{users.filter(u => u.role.toLowerCase() === 'organizer').length}</p>
          </div>

          <div className="sa-stat-card gradient-pink">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaBan /></div>
            </div>
            <p className="sa-stat-label">Suspendus</p>
            <p className="sa-stat-value">{users.filter(u => u.is_suspended).length}</p>
          </div>
        </div>

        {/* ===== BOUTON CRÉER UTILISATEUR ===== */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="sa-btn sa-btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FaPlus />
            Créer un utilisateur
          </button>
        </div>

        {/* ===== FILTRES ET RECHERCHE ===== */}
        <div className="sa-filters">
          <div className="sa-filters-grid">
            <div className="sa-search">
              <FaSearch className="sa-search-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sa-search-input"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="sa-select"
            >
              <option value="all">Tous les rôles</option>
              <option value="participant">Participant</option>
              <option value="organizer">Organizer</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sa-select"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>

          <p className="sa-filter-count">
            {filteredUsers.length} utilisateur(s) trouvé(s)
          </p>
        </div>

        {/* ===== TABLEAU DES UTILISATEURS ===== */}
        <div className="sa-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>#{user.id}</td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{user.first_name} {user.last_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.country_name}</div>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span className={`sa-badge ${
                        user.role.toLowerCase() === 'admin' ? 'sa-badge-danger' :
                        user.role.toLowerCase() === 'organizer' ? 'sa-badge-purple' :
                        'sa-badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    <td>
                      {user.is_suspended ? (
                        <span className="sa-badge sa-badge-danger">Suspendu</span>
                      ) : (
                        <span className="sa-badge sa-badge-success">Actif</span>
                      )}
                    </td>

                    <td style={{ color: '#64748b' }}>{formatDate(user.created_at)}</td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        {user.is_suspended ? (
                          <button
                            onClick={() => handleUnsuspendUser(user.id, `${user.first_name} ${user.last_name}`)}
                            className="sa-btn-icon green"
                            title="Réactiver"
                          >
                            <FaCheck />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspendUser(user.id, `${user.first_name} ${user.last_name}`)}
                            className="sa-btn-icon red"
                            title="Suspendre"
                            disabled={user.role.toLowerCase() === 'admin'}
                          >
                            <FaBan />
                          </button>
                        )}

                        <button
                          onClick={() => handlePromoteUser(user.id, `${user.first_name} ${user.last_name}`, user.role)}
                          className="sa-btn-icon blue"
                          title="Changer le rôle"
                          disabled={user.role.toLowerCase() === 'admin' && user.id === currentUser?.id}
                        >
                          <FaUserShield />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="sa-btn-icon red"
                          title="Supprimer définitivement"
                          disabled={user.role.toLowerCase() === 'admin' || user.id === currentUser?.id}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="sa-empty">
                <div className="sa-empty-icon"><FaUsers /></div>
                <h3 className="sa-empty-title">Aucun utilisateur trouvé</h3>
                <p className="sa-empty-text">Essayez de modifier vos filtres de recherche</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODAL CRÉATION UTILISATEUR ===== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un nouvel utilisateur"
        size="large"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Prénom */}
            <Input
              label="Prénom"
              value={newUserData.first_name}
              onChange={(e) => setNewUserData({...newUserData, first_name: e.target.value})}
              error={formErrors.first_name}
              required
            />

            {/* Nom */}
            <Input
              label="Nom"
              value={newUserData.last_name}
              onChange={(e) => setNewUserData({...newUserData, last_name: e.target.value})}
              error={formErrors.last_name}
              required
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
              error={formErrors.email}
              required
            />

            {/* Mot de passe */}
            <Input
              label="Mot de passe"
              type="password"
              value={newUserData.password}
              onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
              error={formErrors.password}
              required
            />

            {/* Pays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays <span className="text-red-500">*</span>
              </label>
              <select
                value={newUserData.country_code}
                onChange={(e) => setNewUserData({...newUserData, country_code: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="TG">Togo</option>
                <option value="BJ">Bénin</option>
                <option value="FR">France</option>
                <option value="CA">Canada</option>
                <option value="CI">Côte d'Ivoire</option>
                <option value="SN">Sénégal</option>
              </select>
            </div>

            {/* Téléphone */}
            <Input
              label="Téléphone"
              value={newUserData.phone}
              onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
              placeholder="90000000"
              error={formErrors.phone}
              required
            />

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle <span className="text-red-500">*</span>
              </label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Langue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Langue préférée <span className="text-red-500">*</span>
              </label>
              <select
                value={newUserData.preferred_language}
                onChange={(e) => setNewUserData({...newUserData, preferred_language: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-4 justify-end mt-6">
            <Button
              text="Annuler"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            />
            <Button
              text="Créer l'utilisateur"
              variant="primary"
              type="submit"
              loading={isCreating}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default UsersManagement;

/**
 * ================================================
 * RÉSUMÉ DU FONCTIONNEMENT
 * ================================================
 *
 * 1. CHARGEMENT DE LA PAGE
 *    → useEffect() s'exécute
 *    → Vérifie que l'utilisateur est SuperAdmin
 *    → Appelle loadUsers() pour récupérer les utilisateurs
 *
 * 2. AFFICHAGE DES DONNÉES
 *    → Les utilisateurs sont stockés dans l'état "users"
 *    → getFilteredUsers() filtre selon la recherche et les filtres
 *    → Le tableau affiche les utilisateurs filtrés
 *
 * 3. CRÉER UN UTILISATEUR
 *    → Clic sur "+ Créer un utilisateur"
 *    → Modal s'ouvre avec le formulaire
 *    → Remplir le formulaire
 *    → Validation des champs
 *    → Appel createUser() → Backend → PostgreSQL
 *    → Recharge la liste
 *
 * 4. SUSPENDRE / RÉACTIVER
 *    → handleSuspendUser() → suspendUser() → recharge
 *    → handleUnsuspendUser() → unsuspendUser() → recharge
 *
 * 5. PROMOUVOIR
 *    → handlePromoteUser() → promoteUser() → recharge
 *
 * 6. SUPPRIMER
 *    → Double confirmation pour sécurité
 *    → handleDeleteUser() → deleteUser() → recharge
 *
 * 7. RECHERCHE ET FILTRES
 *    → Tape dans recherche → setSearchTerm() → re-render
 *    → Change filtre → setRoleFilter() → re-render
 *    → getFilteredUsers() recalcule automatiquement
 */
