/**
 * ================================================
 * PAGE : LOGIN SUPERADMIN
 * ================================================
 *
 * Cette page permet au SuperAdmin de se connecter.
 *
 * FLUX COMPLET :
 * 1. SuperAdmin saisit email + password
 * 2. Clic sur "Se connecter"
 * 3. Frontend envoie les données au backend
 * 4. Backend vérifie dans PostgreSQL
 * 5. Si OK : Backend retourne token JWT + infos user
 * 6. Frontend stocke le token dans localStorage
 * 7. Frontend redirige vers /superadmin/dashboard
 * 8. Si erreur : Affiche message d'erreur
 *
 * COMMUNICATION AVEC LE BACKEND :
 * POST /api/v1/auth/login
 * Body: { username: email, password: password }
 * Response: { access_token: "eyJ...", user: {...} }
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUserShield } from 'react-icons/fa';

// Importer nos composants
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';

// Importer la fonction de login
import { login } from '../../api/auth';

// Importer le système de toast amélioré
import { showSuccess, showError } from '../../utils/toast';

function LoginSuperAdmin() {

  /**
   * ================================================
   * ÉTAT DU COMPOSANT (useState)
   * ================================================
   *
   * L'état permet de stocker des données qui peuvent changer.
   * Quand l'état change, React met à jour l'interface automatiquement.
   */

  // Données du formulaire
  const [email, setEmail] = useState('');           // Email saisi
  const [password, setPassword] = useState('');     // Mot de passe saisi

  // État du chargement
  const [loading, setLoading] = useState(false);    // true pendant l'appel API

  // Erreurs de validation
  const [errors, setErrors] = useState({});         // { email: "...", password: "..." }

  /**
   * ================================================
   * HOOKS REACT ROUTER
   * ================================================
   *
   * useNavigate permet de rediriger vers une autre page.
   */
  const navigate = useNavigate();

  /**
   * ================================================
   * FONCTION : VALIDER LE FORMULAIRE
   * ================================================
   *
   * Vérifie que les champs sont correctement remplis
   * AVANT d'envoyer au backend.
   *
   * Pourquoi valider côté frontend ?
   * - Réponse immédiate pour l'utilisateur
   * - Évite des appels inutiles au backend
   * - Meilleure expérience utilisateur
   *
   * @returns {boolean} - true si valide, false sinon
   */
  const validateForm = () => {
    const newErrors = {};

    // Validation de l'email
    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      // Regex pour vérifier le format email
      newErrors.email = 'Email invalide';
    }

    // Validation du mot de passe
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    // Mettre à jour l'état des erreurs
    setErrors(newErrors);

    // Retourner true si aucune erreur
    return Object.keys(newErrors).length === 0;
  };

  /**
   * ================================================
   * FONCTION : GÉRER LA SOUMISSION DU FORMULAIRE
   * ================================================
   *
   * Cette fonction est appelée quand l'utilisateur clique sur
   * "Se connecter" ou appuie sur Entrée.
   *
   * ÉTAPES :
   * 1. Empêcher le rechargement de la page (e.preventDefault)
   * 2. Valider le formulaire
   * 3. Appeler le backend (POST /auth/login)
   * 4. Si succès : Stocker le token et rediriger
   * 5. Si erreur : Afficher un message d'erreur
   *
   * @param {Event} e - Événement de soumission du formulaire
   */
  const handleSubmit = async (e) => {
    // ÉTAPE 1 : Empêcher le rechargement de la page
    e.preventDefault();

    // ÉTAPE 2 : Valider le formulaire
    if (!validateForm()) {
      // Si invalide, arrêter ici
      showError('Veuillez corriger les erreurs');
      return;
    }

    // ÉTAPE 3 : Activer le loading
    setLoading(true);

    try {
      // ÉTAPE 4 : Appeler le backend
      console.log('🔄 Envoi requête login...', { email });

      const data = await login(email, password);

      console.log('✅ Réponse reçue:', data);
      console.log('🔍 Rôle de l\'utilisateur:', data.user.role);
      console.log('🔍 Type du rôle:', typeof data.user.role);

      // ÉTAPE 5 : Vérifier le rôle
      // ⚠️ Le backend peut retourner "ADMIN" en majuscules ou avec un format différent
      const userRole = typeof data.user.role === 'string' ? data.user.role.toUpperCase() : data.user.role;

      if (userRole !== 'ADMIN') {
        showError('Accès refusé. Vous devez être SuperAdmin.');
        setLoading(false);
        return;
      }

      // ÉTAPE 6 : Stocker le token et les infos user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('💾 Token stocké dans localStorage');

      // ÉTAPE 7 : Notification de succès
      showSuccess(`Bienvenue ${data.user.first_name || 'Admin'} !`);

      // ÉTAPE 8 : Rediriger vers le dashboard
      console.log('➡️ Redirection vers /superadmin/dashboard');
      navigate('/superadmin/dashboard');

    } catch (error) {
      // ÉTAPE 9 : Gérer les erreurs
      console.error('❌ Erreur login:', error);

      // Afficher un message d'erreur clair
      if (error.message.includes('401')) {
        showError('Email ou mot de passe incorrect');
      } else if (error.message.includes('connexion')) {
        showError('Impossible de se connecter au serveur. Vérifiez que le backend est lancé.');
      } else {
        showError(error.message || 'Une erreur est survenue');
      }

    } finally {
      // ÉTAPE 10 : Désactiver le loading
      setLoading(false);
    }
  };

  /**
   * ================================================
   * RENDU DU COMPOSANT (JSX)
   * ================================================
   *
   * Le JSX est comme du HTML, mais avec du JavaScript dedans.
   * C'est ce qui est affiché à l'écran.
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      {/* CARTE DE LOGIN */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* EN-TÊTE */}
        <div className="text-center mb-8">
          {/* Icône SuperAdmin */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <FaUserShield className="text-4xl text-blue-600" />
          </div>

          {/* Titre */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            SuperAdmin
          </h1>

          {/* Sous-titre */}
          <p className="text-gray-600">
            Connectez-vous pour accéder au panneau d'administration
          </p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* CHAMP EMAIL */}
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            icon={<FaEnvelope />}
            error={errors.email}
            required
            disabled={loading}
          />

          {/* CHAMP MOT DE PASSE */}
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<FaLock />}
            error={errors.password}
            required
            disabled={loading}
          />

          {/* BOUTON DE SOUMISSION */}
          <Button
            text="Se connecter"
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          />
        </form>

        {/* INFORMATIONS DE TEST */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-semibold mb-2">
              💡 Environnement de développement
            </p>
            <p className="text-xs text-yellow-700">
              Créez un compte SuperAdmin dans PostgreSQL ou utilisez un compte existant avec role = 'ADMIN'
            </p>
          </div>
        )}
      </div>

      {/* LOADER PLEIN ÉCRAN (si loading) */}
      {loading && (
        <Loader fullPage text="Connexion en cours..." />
      )}
    </div>
  );
}

export default LoginSuperAdmin;

/**
 * ================================================
 * RÉSUMÉ DU FLUX DE DONNÉES
 * ================================================
 *
 * 1. USER SAISIT EMAIL + PASSWORD
 *    ↓
 * 2. CLIC SUR "SE CONNECTER"
 *    ↓
 * 3. handleSubmit() est appelé
 *    ↓
 * 4. validateForm() vérifie les champs
 *    ↓
 * 5. login(email, password) appelle le backend
 *    ↓
 * 6. BACKEND (FastAPI) vérifie dans PostgreSQL
 *    ↓
 * 7. BACKEND retourne { token, user }
 *    ↓
 * 8. FRONTEND stocke dans localStorage
 *    ↓
 * 9. FRONTEND redirige vers /superadmin/dashboard
 *
 * ================================================
 * GESTION DES ERREURS
 * ================================================
 *
 * - Email vide → "L'email est requis"
 * - Email invalide → "Email invalide"
 * - Password vide → "Le mot de passe est requis"
 * - Password < 6 chars → "Au moins 6 caractères"
 * - Mauvais credentials → "Email ou mot de passe incorrect"
 * - Backend down → "Impossible de se connecter au serveur"
 * - Rôle != ADMIN → "Accès refusé. Vous devez être SuperAdmin"
 */
