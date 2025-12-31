/**
 * LOGIN UNIVERSEL - Une seule page de connexion pour tous les rôles
 *
 * Redirige automatiquement selon le rôle :
 * - ADMIN (SuperAdmin) → /superadmin/dashboard
 * - ORGANIZER → /admin/dashboard
 * - PARTICIPANT → /participant/dashboard
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCalendarAlt, FaArrowRight, FaUsers, FaGlobe, FaShieldAlt } from 'react-icons/fa';
import { login } from '../../api/auth';
import { showSuccess, showError } from '../../utils/toast';
import PublicNavbar from '../../components/PublicNavbar';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const showTestAccounts = false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);

      // Stocker le token et les infos utilisateur
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Récupérer le rôle de l'utilisateur
      const userRole = typeof data.user.role === 'string'
        ? data.user.role.toUpperCase()
        : data.user.role;

      showSuccess(`Bienvenue ${data.user.first_name} !`);

      // Redirection selon le rôle
      switch (userRole) {
        case 'ADMIN':
          navigate('/superadmin/dashboard');
          break;

        case 'ORGANIZER':
          navigate('/admin/dashboard');
          break;

        case 'PARTICIPANT':
          navigate('/participant/dashboard');
          break;

        default:
          showError('Rôle utilisateur non reconnu');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          break;
      }

    } catch (error) {
      console.error('Error:', error);
      const msg = (error?.message || '').toLowerCase();
      if (msg.startsWith('401')) {
        showError('Email ou mot de passe incorrect');
      } else if (msg.startsWith('403')) {
        showError(error.message.replace(/^403:\s*/i, '') || 'Accès refusé');
      } else if (msg.includes('connexion') || msg.includes('network')) {
        showError('Impossible de se connecter au serveur');
      } else {
        showError(error.message || 'Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="login-container">
        {/* Left Panel - Branding & Features */}
        <div className="login-left-panel">
        <div className="login-left-content">
          {/* Logo */}
          <div className="login-brand">
            <div className="login-logo">
              <FaCalendarAlt />
            </div>
            <h1 className="login-brand-name">evMonde</h1>
            <p className="login-brand-tagline">Plateforme de Gestion d'Événements</p>
          </div>

          {/* Features */}
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <FaUsers />
              </div>
              <div className="login-feature-text">
                <h3>Gestion simplifiée</h3>
                <p>Gérez vos événements et participants en quelques clics</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <FaGlobe />
              </div>
              <div className="login-feature-text">
                <h3>Accessible partout</h3>
                <p>Accédez à votre tableau de bord depuis n'importe où</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <FaShieldAlt />
              </div>
              <div className="login-feature-text">
                <h3>Sécurisé</h3>
                <p>Vos données sont protégées avec les meilleurs standards</p>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="login-decoration">
            <div className="login-circle login-circle-1"></div>
            <div className="login-circle login-circle-2"></div>
            <div className="login-circle login-circle-3"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right-panel">
        <div className="login-form-container">
          {/* Mobile Logo */}
          <div className="login-mobile-logo">
            <div className="login-logo-small">
              <FaCalendarAlt />
            </div>
            <span>evMonde</span>
          </div>

          {/* Form Header */}
          <div className="login-form-header">
            <h2>Bon retour parmi nous !</h2>
            <p>Connectez-vous pour accéder à votre espace</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Field */}
            <div className={`login-field ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
              <label htmlFor="email">
                <FaEnvelope className="field-icon" />
                <span>Adresse email</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className={`login-field ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
              <label htmlFor="password">
                <FaLock className="field-icon" />
                <span>Mot de passe</span>
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="login-forgot">
              <Link to="/forgot-password">Mot de passe oublié ?</Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`login-submit ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <span className="login-spinner"></span>
              ) : (
                <>
                  <span>Se connecter</span>
                  <FaArrowRight className="submit-arrow" />
                </>
              )}
            </button>
          </form>

          {showTestAccounts && (
            <>
              {/* Divider */}
              <div className="login-divider">
                <span>Comptes de test</span>
              </div>

              {/* Test Credentials */}
              <div className="login-test-accounts">
                <button
                  type="button"
                  className="test-account superadmin"
                  onClick={() => {
                    setEmail('admin@evmonde.com');
                    setPassword('Admin123!');
                  }}
                >
                  <span className="test-role">👑 SuperAdmin</span>
                  <span className="test-email">admin@evmonde.com</span>
                </button>

                <button
                  type="button"
                  className="test-account organizer"
                  onClick={() => {
                    setEmail('jean.dupont@evmonde.com');
                    setPassword('password123');
                  }}
                >
                  <span className="test-role">👨‍💼 Organisateur</span>
                  <span className="test-email">jean.dupont@evmonde.com</span>
                </button>

                <button
                  type="button"
                  className="test-account participant"
                  onClick={() => {
                    setEmail('pierre.dubois@email.com');
                    setPassword('password123');
                  }}
                >
                  <span className="test-role">🎟️ Participant</span>
                  <span className="test-email">pierre.dubois@email.com</span>
                </button>
              </div>
            </>
          )}

          {/* Register Link */}
          <div className="login-register">
            <p>
              Pas encore de compte ?{' '}
              <Link to="/register">Créer un compte</Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default Login;
