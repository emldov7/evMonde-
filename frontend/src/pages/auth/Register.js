/**
 * REGISTER - Page d'inscription
 *
 * Permet aux utilisateurs de créer un compte :
 * - ORGANIZER : Pour créer et gérer des événements
 * - PARTICIPANT : Pour s'inscrire aux événements
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCalendarAlt,
  FaArrowRight,
  FaUser,
  FaPhone,
  FaGlobe,
  FaUserTie,
  FaUsers,
  FaCheck
} from 'react-icons/fa';
import { showSuccess, showError } from '../../utils/toast';
import { register as registerUser } from '../../api/auth';
import PublicNavbar from '../../components/PublicNavbar';
import './Register.css';

// Liste des pays supportés
const COUNTRIES = [
  { code: 'TG', name: 'Togo', phoneCode: '+228', flag: '🇹🇬' },
  { code: 'CA', name: 'Canada', phoneCode: '+1', flag: '🇨🇦' },
  { code: 'FR', name: 'France', phoneCode: '+33', flag: '🇫🇷' },
  { code: 'BJ', name: 'Bénin', phoneCode: '+229', flag: '🇧🇯' },
  { code: 'CI', name: "Côte d'Ivoire", phoneCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', phoneCode: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroun', phoneCode: '+237', flag: '🇨🇲' },
  { code: 'BE', name: 'Belgique', phoneCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', phoneCode: '+41', flag: '🇨🇭' },
  { code: 'US', name: 'États-Unis', phoneCode: '+1', flag: '🇺🇸' },
];

function Register() {
  const [step, setStep] = useState(1); // 1: Role, 2: Info, 3: Account
  const [formData, setFormData] = useState({
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    countryCode: 'TG',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const selectedCountry = COUNTRIES.find(c => c.code === formData.countryCode) || COUNTRIES[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
    setStep(2);
  };

  const validateStep2 = () => {
    if (!formData.firstName.trim()) {
      showError('Veuillez entrer votre prénom');
      return false;
    }
    if (!formData.lastName.trim()) {
      showError('Veuillez entrer votre nom');
      return false;
    }
    if (!formData.phone.trim()) {
      showError('Veuillez entrer votre numéro de téléphone');
      return false;
    }
    if (formData.phone.replace(/\D/g, '').length < 8) {
      showError('Le numéro de téléphone doit contenir au moins 8 chiffres');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const { email, password, confirmPassword } = formData;

    if (!email.trim()) {
      showError('Veuillez entrer votre email');
      return false;
    }
    if (!password) {
      showError('Veuillez entrer un mot de passe');
      return false;
    }
    if (password.length < 8) {
      showError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      showError('Le mot de passe doit contenir au moins une majuscule');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      showError('Le mot de passe doit contenir au moins une minuscule');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      showError('Le mot de passe doit contenir au moins un chiffre');
      return false;
    }
    if (password !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep3()) return;

    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        country_code: formData.countryCode,
        // le backend attend le numéro SANS indicatif, on enlève les espaces
        phone: formData.phone.replace(/\D/g, ''),
        // le backend attend les valeurs d'Enum en minuscules : "admin", "organizer", "participant"
        role: (formData.role || 'PARTICIPANT').toLowerCase(),
        preferred_language: 'fr',
      };

      await registerUser(payload);

      showSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      navigate('/login');

    } catch (error) {
      console.error('Error:', error);

      // Essayer de décoder les erreurs de validation FastAPI
      const msg = error.message || '';
      if (msg.includes('email')) {
        showError('Cet email est déjà utilisé ou invalide');
      } else if (msg.includes('téléphone') || msg.includes('phone')) {
        showError('Ce numéro de téléphone est déjà utilisé ou invalide');
      } else {
        showError(msg || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="register-container">
        {/* Left Panel - Branding */}
        <div className="register-left-panel">
        <div className="register-left-content">
          {/* Logo */}
          <div className="register-brand">
            <div className="register-logo">
              <FaCalendarAlt />
            </div>
            <h1 className="register-brand-name">evMonde</h1>
            <p className="register-brand-tagline">Rejoignez notre communauté</p>
          </div>

          {/* Benefits */}
          <div className="register-benefits">
            <div className="register-benefit">
              <FaCheck className="benefit-icon" />
              <span>Créez et gérez vos événements facilement</span>
            </div>
            <div className="register-benefit">
              <FaCheck className="benefit-icon" />
              <span>Inscrivez-vous aux événements en un clic</span>
            </div>
            <div className="register-benefit">
              <FaCheck className="benefit-icon" />
              <span>Recevez vos billets par email et SMS</span>
            </div>
            <div className="register-benefit">
              <FaCheck className="benefit-icon" />
              <span>Suivez vos statistiques en temps réel</span>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="register-decoration">
            <div className="register-circle register-circle-1"></div>
            <div className="register-circle register-circle-2"></div>
            <div className="register-circle register-circle-3"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="register-right-panel">
        <div className="register-form-container">
          {/* Mobile Logo */}
          <div className="register-mobile-logo">
            <div className="register-logo-small">
              <FaCalendarAlt />
            </div>
            <span>evMonde</span>
          </div>

          {/* Progress Steps */}
          <div className="register-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <span>Rôle</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <span>Infos</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <span>Compte</span>
            </div>
          </div>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="register-step">
              <div className="register-form-header">
                <h2>Choisissez votre rôle</h2>
                <p>Comment souhaitez-vous utiliser evMonde ?</p>
              </div>

              <div className="role-selection">
                <button
                  type="button"
                  className="role-card organizer"
                  onClick={() => handleRoleSelect('ORGANIZER')}
                >
                  <div className="role-icon">
                    <FaUserTie />
                  </div>
                  <h3>Organisateur</h3>
                  <p>Je veux créer et gérer des événements</p>
                  <ul className="role-features">
                    <li><FaCheck /> Créer des événements</li>
                    <li><FaCheck /> Gérer les inscriptions</li>
                    <li><FaCheck /> Recevoir des paiements</li>
                  </ul>
                </button>

                <button
                  type="button"
                  className="role-card participant"
                  onClick={() => handleRoleSelect('PARTICIPANT')}
                >
                  <div className="role-icon">
                    <FaUsers />
                  </div>
                  <h3>Participant</h3>
                  <p>Je veux m'inscrire à des événements</p>
                  <ul className="role-features">
                    <li><FaCheck /> Découvrir des événements</li>
                    <li><FaCheck /> S'inscrire facilement</li>
                    <li><FaCheck /> Recevoir mes billets</li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Info */}
          {step === 2 && (
            <div className="register-step">
              <div className="register-form-header">
                <h2>Vos informations</h2>
                <p>Dites-nous en plus sur vous</p>
              </div>

              <form className="register-form" onSubmit={(e) => { e.preventDefault(); if (validateStep2()) setStep(3); }}>
                {/* First Name */}
                <div className={`register-field ${focusedField === 'firstName' ? 'focused' : ''}`}>
                  <label htmlFor="firstName">
                    <FaUser className="field-icon" />
                    <span>Prénom</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Votre prénom"
                    required
                  />
                </div>

                {/* Last Name */}
                <div className={`register-field ${focusedField === 'lastName' ? 'focused' : ''}`}>
                  <label htmlFor="lastName">
                    <FaUser className="field-icon" />
                    <span>Nom</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Votre nom"
                    required
                  />
                </div>

                {/* Country */}
                <div className={`register-field ${focusedField === 'country' ? 'focused' : ''}`}>
                  <label htmlFor="countryCode">
                    <FaGlobe className="field-icon" />
                    <span>Pays</span>
                  </label>
                  <select
                    id="countryCode"
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('country')}
                    onBlur={() => setFocusedField(null)}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className={`register-field ${focusedField === 'phone' ? 'focused' : ''}`}>
                  <label htmlFor="phone">
                    <FaPhone className="field-icon" />
                    <span>Téléphone</span>
                  </label>
                  <div className="phone-input">
                    <span className="phone-code">{selectedCountry.phoneCode}</span>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="90 00 00 00"
                      required
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="register-nav-buttons">
                  <button type="button" className="btn-back" onClick={() => setStep(1)}>
                    Retour
                  </button>
                  <button type="submit" className="btn-next">
                    Continuer
                    <FaArrowRight />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Account Info */}
          {step === 3 && (
            <div className="register-step">
              <div className="register-form-header">
                <h2>Créez votre compte</h2>
                <p>Dernière étape avant de commencer</p>
              </div>

              <form className="register-form" onSubmit={handleSubmit}>
                {/* Email */}
                <div className={`register-field ${focusedField === 'email' ? 'focused' : ''}`}>
                  <label htmlFor="email">
                    <FaEnvelope className="field-icon" />
                    <span>Adresse email</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                {/* Password */}
                <div className={`register-field ${focusedField === 'password' ? 'focused' : ''}`}>
                  <label htmlFor="password">
                    <FaLock className="field-icon" />
                    <span>Mot de passe</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Minimum 8 caractères"
                    required
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

                {/* Confirm Password */}
                <div className={`register-field ${focusedField === 'confirmPassword' ? 'focused' : ''}`}>
                  <label htmlFor="confirmPassword">
                    <FaLock className="field-icon" />
                    <span>Confirmer le mot de passe</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Retapez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Navigation Buttons */}
                <div className="register-nav-buttons">
                  <button type="button" className="btn-back" onClick={() => setStep(2)}>
                    Retour
                  </button>
                  <button
                    type="submit"
                    className={`btn-submit ${loading ? 'loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="register-spinner"></span>
                    ) : (
                      <>
                        <span>Créer mon compte</span>
                        <FaArrowRight />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Login Link */}
          <div className="register-login">
            <p>
              Déjà un compte ?{' '}
              <Link to="/login">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default Register;
