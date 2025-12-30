import { useEffect, useState } from 'react';
import { FaUser, FaLock, FaBell, FaSave } from 'react-icons/fa';
import api from '../../api/api';
import PublicNavbar from '../../components/PublicNavbar';
import { showError, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/components.css';

function ParticipantSettings() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [notificationsData, setNotificationsData] = useState({
    new_registration: true,
    event_reminder: true,
    payout_update: true,
    new_message: true,
    weekly_report: true
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
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de la mise à jour');
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
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors du changement');
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
      updateToError(toastId, 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="ev-container" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
        <div className="admin-page-header" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div className="admin-page-header-top">
            <div>
              <h1 className="admin-page-title">Paramètres</h1>
              <p className="admin-page-subtitle">Profil, sécurité et notifications</p>
            </div>
          </div>
        </div>

        <div className="participant-settings-layout">
          <div className="admin-card">
            <div className="participant-settings-sidebar">
              <div className="participant-settings-tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`participant-settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                >
                  <FaUser />
                  <span>Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`participant-settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                >
                  <FaBell />
                  <span>Notifications</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`participant-settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                >
                  <FaLock />
                  <span>Sécurité</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            {activeTab === 'profile' && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title"><FaUser /> Profil</h3>
                </div>
                <div className="admin-card-body">
                  <div className="ev-form-grid">
                    <div className="ev-input-group">
                      <label className="ev-input-label">Prénom</label>
                      <input className="ev-input" value={profileData.first_name} onChange={(e) => setProfileData(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="ev-input-group">
                      <label className="ev-input-label">Nom</label>
                      <input className="ev-input" value={profileData.last_name} onChange={(e) => setProfileData(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                    <div className="ev-input-group">
                      <label className="ev-input-label">Email</label>
                      <input className="ev-input" value={profileData.email} disabled />
                    </div>
                    <div className="ev-input-group">
                      <label className="ev-input-label">Téléphone</label>
                      <input className="ev-input" value={profileData.phone} onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>

                  <button className="ev-btn ev-btn-primary" onClick={handleSaveProfile} disabled={loading} style={{ marginTop: '1rem' }}>
                    <FaSave />
                    Enregistrer le profil
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title"><FaBell /> Notifications</h3>
                </div>
                <div className="admin-card-body">
                  <div className="participant-settings-notifs-grid">
                    {[
                      { key: 'event_reminder', label: 'Rappels d\'événement' },
                      { key: 'new_message', label: 'Nouveaux messages' },
                      { key: 'weekly_report', label: 'Rapport hebdomadaire' }
                    ].map(item => (
                      <label key={item.key} className="participant-settings-notifs-item">
                        <input
                          type="checkbox"
                          checked={Boolean(notificationsData[item.key])}
                          onChange={(e) => setNotificationsData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>

                  <button className="ev-btn ev-btn-primary" onClick={handleSaveNotificationPreferences} disabled={loading} style={{ marginTop: '1rem' }}>
                    <FaSave />
                    Enregistrer les préférences
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title"><FaLock /> Sécurité</h3>
                </div>
                <div className="admin-card-body">
                  <div className="ev-form-grid">
                    <div className="ev-input-group">
                      <label className="ev-input-label">Mot de passe actuel</label>
                      <input type="password" className="ev-input" value={passwordData.current_password} onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))} />
                    </div>
                    <div className="ev-input-group">
                      <label className="ev-input-label">Nouveau mot de passe</label>
                      <input type="password" className="ev-input" value={passwordData.new_password} onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))} />
                    </div>
                    <div className="ev-input-group">
                      <label className="ev-input-label">Confirmer</label>
                      <input type="password" className="ev-input" value={passwordData.confirm_password} onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))} />
                    </div>
                  </div>

                  <button className="ev-btn ev-btn-primary" onClick={handleChangePassword} disabled={loading} style={{ marginTop: '1rem' }}>
                    <FaSave />
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ParticipantSettings;
