/**
 * ================================================
 * PAGE : DASHBOARD SUPERADMIN ULTRA-PREMIUM
 * ================================================
 *
 * Dashboard avec statistiques en temps réel et design moderne
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserShield, FaSignOutAlt, FaUsers, FaCalendarAlt,
  FaDollarSign, FaTags, FaChartLine, FaCog, FaMoneyBillWave,
  FaArrowUp, FaClock, FaCheckCircle
} from 'react-icons/fa';
import { logout, getUserFromStorage } from '../../api/auth';
import { toast } from 'react-toastify';
import { getDashboardStats } from '../../api/stats';
import { getCommissionSettings } from '../../api/commission';
import '../../styles/superadmin.css';

function DashboardSuperAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [commissionRate, setCommissionRate] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    pendingPayouts: 0,
    activeCategories: 0,
    recentRegistrations: 0,
    growthRate: 0
  });
  const [loading, setLoading] = useState(true);

  /**
   * Charger les infos utilisateur et statistiques
   */
  useEffect(() => {
    const userData = getUserFromStorage();

    if (!userData) {
      navigate('/superadmin/login');
      return;
    }

    setUser(userData);
    loadDashboardStats();
  }, [navigate]);

  /**
   * Charger les statistiques du dashboard
   */
  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      const [data, commission] = await Promise.all([
        getDashboardStats(),
        getCommissionSettings()
      ]);

      setStats({
        totalUsers: data.total_users || 0,
        totalEvents: data.active_events || 0,
        totalRevenue: data.total_revenue || 0,
        totalCommissions: data.commission_revenue || 0,
        pendingPayouts: data.pending_payouts || 0,
        activeCategories: data.active_categories || 0,
        recentRegistrations: data.total_registrations || 0,
        growthRate: data.growth_rate || 0
      });

      setCommissionRate(
        typeof commission?.default_commission_rate === 'number'
          ? commission.default_commission_rate
          : null
      );
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fonction de déconnexion
   */
  const handleLogout = () => {
    logout();
    toast.info('Déconnexion réussie');
    navigate('/superadmin/login');
  };

  /**
   * Formater les montants
   */
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  const pluralize = (value, singular, plural) => {
    if (value === 1) return singular;
    return plural;
  };

  if (!user) {
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
              <div className="sa-header-icon">
                <FaUserShield />
              </div>
              <div>
                <h1 className="sa-header-title">Dashboard SuperAdmin</h1>
                <p className="sa-header-subtitle">Bienvenue, {user.first_name || 'Admin'}</p>
              </div>
            </div>

            <div className="sa-header-actions">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="sa-btn-header"
                >
                  <FaArrowUp />
                  Dashboard Admin
                </button>
              )}
              <button onClick={handleLogout} className="sa-btn-logout">
                <FaSignOutAlt />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="sa-container" style={{ padding: '2rem 1.5rem' }}>

        {/* STATISTIQUES EN TEMPS RÉEL */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="sa-section-title">
            <FaChartLine />
            Statistiques en Temps Réel
          </h2>

          {loading ? (
            <div className="sa-stats-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="sa-stat-card" style={{ opacity: 0.5 }}>
                  <div className="sa-loading">
                    <div className="sa-spinner" style={{ width: 32, height: 32 }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sa-stats-grid">
              {/* Carte 1 : Utilisateurs */}
              <div 
                className="sa-stat-card gradient-blue"
                onClick={() => navigate('/superadmin/users')}
              >
                <div className="sa-stat-header">
                  <div className="sa-stat-icon">
                    <FaUsers />
                  </div>
                  <div className="sa-stat-badge">
                    <FaArrowUp />
                    +12%
                  </div>
                </div>
                <p className="sa-stat-label">Utilisateurs Totaux</p>
                <p className="sa-stat-value">{stats.totalUsers}</p>
              </div>

              {/* Carte 2 : Événements */}
              <div 
                className="sa-stat-card gradient-purple"
                onClick={() => navigate('/superadmin/events')}
              >
                <div className="sa-stat-header">
                  <div className="sa-stat-icon">
                    <FaCalendarAlt />
                  </div>
                  <div className="sa-stat-badge">
                    <FaArrowUp />
                    +8%
                  </div>
                </div>
                <p className="sa-stat-label">Événements Actifs</p>
                <p className="sa-stat-value">{stats.totalEvents}</p>
              </div>

              {/* Carte 3 : Revenus */}
              <div 
                className="sa-stat-card gradient-green"
                onClick={() => navigate('/superadmin/stats')}
              >
                <div className="sa-stat-header">
                  <div className="sa-stat-icon">
                    <FaDollarSign />
                  </div>
                  <div className="sa-stat-badge">
                    <FaArrowUp />
                    +{stats.growthRate}%
                  </div>
                </div>
                <p className="sa-stat-label">Revenus Totaux</p>
                <p className="sa-stat-value" style={{ fontSize: '1.5rem' }}>{formatAmount(stats.totalRevenue)} USD</p>
              </div>

              {/* Carte 4 : Commissions */}
              <div 
                className="sa-stat-card gradient-orange"
                onClick={() => navigate('/superadmin/commission')}
              >
                <div className="sa-stat-header">
                  <div className="sa-stat-icon">
                    <FaMoneyBillWave />
                  </div>
                  <div className="sa-stat-badge">
                    <FaCheckCircle />
                    5.8%
                  </div>
                </div>
                <p className="sa-stat-label">Commissions</p>
                <p className="sa-stat-value" style={{ fontSize: '1.5rem' }}>{formatAmount(stats.totalCommissions)} USD</p>
              </div>
            </div>
          )}
        </div>

        {/* STATISTIQUES SECONDAIRES */}
        <div className="sa-secondary-stats">
          {/* Inscriptions Récentes */}
          <div className="sa-secondary-card blue">
            <div className="sa-secondary-icon">
              <FaCheckCircle />
            </div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Inscriptions Totales</p>
              <p className="sa-secondary-value">{stats.recentRegistrations}</p>
            </div>
          </div>

          {/* Payouts en Attente */}
          <div className="sa-secondary-card yellow">
            <div className="sa-secondary-icon">
              <FaClock />
            </div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Payouts en Attente</p>
              <p className="sa-secondary-value">{stats.pendingPayouts}</p>
              <span 
                className="sa-secondary-link"
                onClick={() => navigate('/superadmin/payouts')}
              >
                Voir les demandes →
              </span>
            </div>
          </div>

          {/* Catégories Actives */}
          <div className="sa-secondary-card purple">
            <div className="sa-secondary-icon">
              <FaTags />
            </div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Catégories Actives</p>
              <p className="sa-secondary-value">{stats.activeCategories}</p>
            </div>
          </div>
        </div>

        {/* MENU RAPIDE - GRILLE DE CARTES */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="sa-section-title">
            <FaCog />
            Accès Rapide
          </h2>

          <div className="sa-quick-grid">
            {/* Carte 1 : Utilisateurs */}
            <div
              onClick={() => navigate('/superadmin/users')}
              className="sa-quick-card blue"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaUsers />
                </div>
                <div>
                  <h3 className="sa-quick-title">Gestion Utilisateurs</h3>
                  <p className="sa-quick-count">
                    {stats.totalUsers} {pluralize(stats.totalUsers, 'utilisateur', 'utilisateurs')}
                  </p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Gérer, suspendre et promouvoir les utilisateurs
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>

            {/* Carte 2 : Événements */}
            <div
              onClick={() => navigate('/superadmin/events')}
              className="sa-quick-card purple"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaCalendarAlt />
                </div>
                <div>
                  <h3 className="sa-quick-title">Gestion Événements</h3>
                  <p className="sa-quick-count">
                    {stats.totalEvents} {pluralize(stats.totalEvents, 'événement', 'événements')}
                  </p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Modérer et mettre en vedette les événements
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>

            {/* Carte 3 : Catégories */}
            <div
              onClick={() => navigate('/superadmin/categories')}
              className="sa-quick-card pink"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaTags />
                </div>
                <div>
                  <h3 className="sa-quick-title">Catégories & Tags</h3>
                  <p className="sa-quick-count">
                    {stats.activeCategories} {pluralize(stats.activeCategories, 'catégorie', 'catégories')}
                  </p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Gérer les catégories d'événements
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>

            {/* Carte 4 : Payouts */}
            <div
              onClick={() => navigate('/superadmin/payouts')}
              className="sa-quick-card yellow"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaMoneyBillWave />
                </div>
                <div>
                  <h3 className="sa-quick-title">Gestion Payouts</h3>
                  <p className="sa-quick-count">{stats.pendingPayouts} en attente</p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Approuver les demandes de paiement
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>

            {/* Carte 5 : Commissions */}
            <div
              onClick={() => navigate('/superadmin/commission')}
              className="sa-quick-card orange"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaCog />
                </div>
                <div>
                  <h3 className="sa-quick-title">Configuration Commission</h3>
                  <p className="sa-quick-count">
                    Taux actuel : {commissionRate ?? '—'}%
                  </p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Modifier le taux de commission
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>

            {/* Carte 6 : Stats */}
            <div
              onClick={() => navigate('/superadmin/stats')}
              className="sa-quick-card green"
            >
              <div className="sa-quick-header">
                <div className="sa-quick-icon">
                  <FaChartLine />
                </div>
                <div>
                  <h3 className="sa-quick-title">Statistiques Plateforme</h3>
                  <p className="sa-quick-count">
                    Croissance {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
                  </p>
                </div>
              </div>
              <p className="sa-quick-desc">
                Voir les statistiques globales
              </p>
              <span className="sa-quick-link">Accéder →</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default DashboardSuperAdmin;
