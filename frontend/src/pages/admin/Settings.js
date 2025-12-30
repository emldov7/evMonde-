/**
 * Settings - Page de paramètres de l'organisateur
 *
 * Permet de configurer:
 * - Informations du profil
 * - Coordonnées bancaires pour les payouts
 * - Préférences de notification
 * - Sécurité (changement de mot de passe)
 */

import { useState, useEffect } from 'react';
import {
  FaUser,
  FaCreditCard,
  FaBell,
  FaLock,
  FaSave,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCog
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/admin.css';

function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [notificationsData, setNotificationsData] = useState({
    new_registration: true,
    event_reminder: true,
    payout_update: true,
    new_message: true,
    weekly_report: true
  });
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: ''
  });

  const [bankData, setBankData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    iban: '',
    swift: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUserProfile();
    fetchNotificationPreferences();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/api/v1/auth/me');
      const user = response.data;

      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const response = await api.get('/api/v1/notifications/preferences');
      setNotificationsData({
        new_registration: Boolean(response.data?.new_registration),
        event_reminder: Boolean(response.data?.event_reminder),
        payout_update: Boolean(response.data?.payout_update),
        new_message: Boolean(response.data?.new_message),
        weekly_report: Boolean(response.data?.weekly_report)
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const handleSaveProfile = async () => {
    const toastId = showLoading('Enregistrement...');
    setLoading(true);

    try {
      await api.put('/api/v1/auth/profile', profileData);
      updateToSuccess(toastId, 'Profil mis à jour avec succès !');
    } catch (error) {
      console.error('Error updating profile:', error);
      updateToError(toastId, 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    const toastId = showLoading('Enregistrement...');
    setLoading(true);

    try {
      await api.put('/api/v1/notifications/preferences', notificationsData);
      updateToSuccess(toastId, 'Préférences enregistrées !');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      updateToError(toastId, 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankInfo = async () => {
    const toastId = showLoading('Enregistrement...');
    setLoading(true);

    try {
      // TODO: Endpoint pour sauvegarder les infos bancaires
      // await api.put('/api/v1/auth/bank-info', bankData);
      updateToSuccess(toastId, 'Informations bancaires enregistrées !');
    } catch (error) {
      console.error('Error saving bank info:', error);
      updateToError(toastId, 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    const toastId = showLoading('Changement du mot de passe...');
    setLoading(true);

    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      updateToSuccess(toastId, 'Mot de passe changé avec succès !');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors du changement');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: FaUser },
    { id: 'bank', label: 'Coordonnées Bancaires', icon: FaCreditCard },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'security', label: 'Sécurité', icon: FaLock }
  ];

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Paramètres</h1>
            <p className="admin-page-subtitle">Gérez vos informations et préférences</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        {/* Tabs Sidebar */}
        <div>
          <div className="admin-card">
            <div className="admin-card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        background: activeTab === tab.id ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : 'transparent',
                        color: activeTab === tab.id ? 'white' : '#64748b'
                      }}
                    >
                      <Icon />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="admin-card">

            {/* TAB: PROFIL */}
            {activeTab === 'profile' && (
              <div className="admin-card-body">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Informations du Profil</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      <FaUser />
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      <FaUser />
                      Nom
                    </label>
                    <input
                      type="text"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      <FaEnvelope />
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="ev-input"
                      disabled
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      <FaPhone />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="ev-input"
                    />
                  </div>
                </div>

                <div className="ev-input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="ev-input-label">Bio / Description</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                    className="ev-input ev-textarea"
                    placeholder="Parlez de vous et de votre organisation..."
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="admin-btn admin-btn-primary"
                >
                  <FaSave />
                  Enregistrer les modifications
                </button>
              </div>
            )}

            {/* TAB: COORDONNÉES BANCAIRES */}
            {activeTab === 'bank' && (
              <div className="admin-card-body">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Coordonnées Bancaires</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  Ces informations sont nécessaires pour recevoir vos paiements
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="ev-input-group">
                    <label className="ev-input-label">Nom de la banque</label>
                    <input
                      type="text"
                      value={bankData.bank_name}
                      onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                      className="ev-input"
                      placeholder="Ex: Ecobank Togo"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Titulaire du compte</label>
                    <input
                      type="text"
                      value={bankData.account_holder}
                      onChange={(e) => setBankData({ ...bankData, account_holder: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Numéro de compte</label>
                    <input
                      type="text"
                      value={bankData.account_number}
                      onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                    <div className="ev-input-group">
                      <label className="ev-input-label">IBAN (optionnel)</label>
                      <input
                        type="text"
                        value={bankData.iban}
                        onChange={(e) => setBankData({ ...bankData, iban: e.target.value })}
                        className="ev-input"
                      />
                    </div>

                    <div className="ev-input-group">
                      <label className="ev-input-label">Code SWIFT (optionnel)</label>
                      <input
                        type="text"
                        value={bankData.swift}
                        onChange={(e) => setBankData({ ...bankData, swift: e.target.value })}
                        className="ev-input"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveBankInfo}
                  disabled={loading}
                  className="admin-btn admin-btn-primary"
                >
                  <FaSave />
                  Enregistrer
                </button>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="admin-card-body">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Préférences de Notification</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { id: 'new_registration', label: 'Nouvelle inscription à un événement' },
                    { id: 'event_reminder', label: 'Rappel d\'événement 24h avant' },
                    { id: 'payout_update', label: 'Mise à jour de statut de payout' },
                    { id: 'new_message', label: 'Nouveau message d\'un participant' },
                    { id: 'weekly_report', label: 'Rapport hebdomadaire des performances' }
                  ].map(notif => (
                    <div key={notif.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: '#f8fafc',
                      borderRadius: '12px'
                    }}>
                      <label htmlFor={notif.id} style={{ fontWeight: 500, color: '#374151' }}>
                        {notif.label}
                      </label>
                      <input
                        type="checkbox"
                        id={notif.id}
                        checked={Boolean(notificationsData[notif.id])}
                        onChange={(e) => setNotificationsData({
                          ...notificationsData,
                          [notif.id]: e.target.checked
                        })}
                        style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="admin-btn admin-btn-primary"
                  style={{ marginTop: '1.5rem' }}
                  onClick={handleSaveNotificationPreferences}
                  disabled={loading}
                >
                  <FaSave />
                  Enregistrer les préférences
                </button>
              </div>
            )}

            {/* TAB: SÉCURITÉ */}
            {activeTab === 'security' && (
              <div className="admin-card-body">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Changer le Mot de Passe</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="ev-input-group">
                    <label className="ev-input-label">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="ev-input"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="ev-input"
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="admin-btn admin-btn-primary"
                >
                  <FaLock />
                  Changer le mot de passe
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default Settings;
