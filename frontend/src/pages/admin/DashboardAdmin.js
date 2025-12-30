/**
 * Dashboard Organisateur - Vue d'ensemble de l'activité
 * Design moderne avec statistiques et actions rapides
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaUsers,
  FaDollarSign,
  FaMoneyBillWave,
  FaPlus,
  FaEye,
  FaEdit,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaRocket
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import '../../styles/admin.css';

function DashboardAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    availableBalance: 0,
    pendingBalance: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer les événements de l'organisateur (utiliser la route correcte)
      const eventsResponse = await api.get('/api/v1/events/my/events');
      const events = eventsResponse.data;

      // Calculer les statistiques
      const activeEvents = events.filter(e => e.status?.toLowerCase() === 'published').length;
      const totalRegistrations = events.reduce((sum, e) => sum + (e.total_registrations || 0), 0);
      const totalRevenue = events.reduce((sum, e) => sum + (e.total_revenue || 0), 0);

      // Récupérer le solde (si l'endpoint existe)
      let balanceData = { available: 0, pending: 0 };
      try {
        const balanceResponse = await api.get('/api/v1/marketplace/my-balance');
        balanceData = balanceResponse.data;
      } catch (err) {
        console.log('Balance endpoint not available');
      }

      setStats({
        totalEvents: events.length,
        activeEvents,
        totalRegistrations,
        totalRevenue,
        availableBalance: balanceData.available || 0,
        pendingBalance: balanceData.pending || 0
      });

      // Prendre les 5 événements les plus récents
      setRecentEvents(events.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PUBLISHED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-blue-100 text-blue-700'
    };

    const labels = {
      DRAFT: 'Brouillon',
      PUBLISHED: 'Publié',
      CANCELLED: 'Annulé',
      COMPLETED: 'Terminé'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.DRAFT}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Tableau de Bord</h1>
            <p className="admin-page-subtitle">Bienvenue ! Voici un aperçu de votre activité.</p>
          </div>
          <div className="admin-page-actions">
            <button
              onClick={() => navigate('/admin/events/create')}
              className="admin-btn admin-btn-primary"
            >
              <FaPlus />
              Créer un événement
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="admin-stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="admin-card" style={{ padding: '1.5rem' }}>
              <div className="admin-skeleton" style={{ height: '20px', width: '60%', marginBottom: '1rem' }}></div>
              <div className="admin-skeleton" style={{ height: '40px', width: '80%' }}></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            {/* Total Événements */}
            <div
              className="admin-stat-card purple"
              onClick={() => navigate('/admin/events')}
            >
              <div className="admin-stat-card-header">
                <div className="admin-stat-card-icon">
                  <FaCalendarAlt />
                </div>
                <div className="admin-stat-card-badge up">
                  <FaArrowUp />
                  {stats.activeEvents} actifs
                </div>
              </div>
              <p className="admin-stat-card-label">Mes Événements</p>
              <p className="admin-stat-card-value">{stats.totalEvents}</p>
            </div>

            {/* Total Inscriptions */}
            <div
              className="admin-stat-card blue"
              onClick={() => navigate('/admin/inscriptions')}
            >
              <div className="admin-stat-card-header">
                <div className="admin-stat-card-icon">
                  <FaUsers />
                </div>
                <div className="admin-stat-card-badge">Total</div>
              </div>
              <p className="admin-stat-card-label">Inscriptions</p>
              <p className="admin-stat-card-value">{stats.totalRegistrations}</p>
            </div>

            {/* Revenus Totaux */}
            <div
              className="admin-stat-card green"
              onClick={() => navigate('/admin/stats')}
            >
              <div className="admin-stat-card-header">
                <div className="admin-stat-card-icon">
                  <FaDollarSign />
                </div>
                <div className="admin-stat-card-badge">
                  <FaChartLine />
                  Brut
                </div>
              </div>
              <p className="admin-stat-card-label">Revenus Totaux</p>
              <p className="admin-stat-card-value">{formatCurrency(stats.totalRevenue)}</p>
            </div>

            {/* Solde Disponible */}
            <div
              className="admin-stat-card orange"
              onClick={() => navigate('/admin/balance')}
            >
              <div className="admin-stat-card-header">
                <div className="admin-stat-card-icon">
                  <FaMoneyBillWave />
                </div>
                <div className="admin-stat-card-badge">Disponible</div>
              </div>
              <p className="admin-stat-card-label">Mon Solde</p>
              <p className="admin-stat-card-value">{formatCurrency(stats.availableBalance)}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-card" style={{ marginBottom: '2rem' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">Actions Rapides</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-quick-actions">
                <button
                  onClick={() => navigate('/admin/events/create')}
                  className="admin-quick-action purple"
                >
                  <div className="admin-quick-action-icon">
                    <FaPlus />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Créer un Événement</h4>
                    <p>Nouveau projet</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/balance')}
                  className="admin-quick-action green"
                >
                  <div className="admin-quick-action-icon">
                    <FaMoneyBillWave />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Demander un Payout</h4>
                    <p>Retirer mes gains</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/stats')}
                  className="admin-quick-action blue"
                >
                  <div className="admin-quick-action-icon">
                    <FaChartLine />
                  </div>
                  <div className="admin-quick-action-text">
                    <h4>Voir les Stats</h4>
                    <p>Analyse détaillée</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Mes Événements Récents</h3>
              <button
                onClick={() => navigate('/admin/events')}
                className="admin-btn admin-btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Voir tout
                <FaArrowUp style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="admin-card-body">
              {recentEvents.length === 0 ? (
                <div className="admin-empty-state">
                  <div className="admin-empty-state-icon">
                    <FaCalendarAlt />
                  </div>
                  <h3>Aucun événement</h3>
                  <p>Vous n'avez pas encore créé d'événement</p>
                  <button
                    onClick={() => navigate('/admin/events/create')}
                    className="admin-btn admin-btn-primary"
                  >
                    <FaRocket />
                    Créer mon premier événement
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentEvents.map(event => (
                    <div
                      key={event.id}
                      className="admin-event-item"
                      onClick={() => navigate(`/admin/events/${event.id}`)}
                    >
                      {/* Event Image */}
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="admin-event-image"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="admin-event-placeholder">
                          {event.title?.[0] || 'E'}
                        </div>
                      )}

                      {/* Event Info */}
                      <div className="admin-event-info">
                        <h4 className="admin-event-title">{event.title}</h4>
                        <div className="admin-event-meta">
                          <span className="admin-event-meta-item">
                            <FaClock />
                            {formatDate(event.start_date)}
                          </span>
                          <span className="admin-event-meta-item">
                            <FaMapMarkerAlt />
                            {event.location || 'En ligne'}
                          </span>
                          <span className="admin-event-meta-item">
                            <FaTicketAlt />
                            {event.total_registrations || 0} inscrits
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {getStatusBadge(event.status)}
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatCurrency(event.total_revenue || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="admin-event-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/events/${event.id}`);
                          }}
                          className="admin-event-action-btn view"
                          title="Voir"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/events/${event.id}/edit`);
                          }}
                          className="admin-event-action-btn edit"
                          title="Modifier"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </LayoutAdmin>
  );
}

export default DashboardAdmin;
