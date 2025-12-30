/**
 * Statistics - Page de statistiques détaillées
 *
 * Affiche des graphiques et statistiques avancées sur:
 * - Ventes par événement
 * - Évolution des inscriptions
 * - Revenus mensuels
 * - Top événements
 */

import { useState, useEffect } from 'react';
import {
  FaChartLine,
  FaCalendarAlt,
  FaUsers,
  FaDollarSign,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaChartBar,
  FaChartPie
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import { formatCurrency as formatAmount } from '../../utils/formatCurrency';
import '../../styles/admin.css';

function Statistics() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRevenue: 0,
    totalRegistrations: 0,
    averageTicketPrice: 0,
    currency: 'USD'
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/events/my/events');
      const eventsData = response.data;

      setEvents(eventsData);

      const totalRevenue = eventsData.reduce((sum, e) => sum + (e.total_revenue || 0), 0);
      const totalRegistrations = eventsData.reduce((sum, e) => sum + (e.total_registrations || 0), 0);

      const currencies = [...new Set(eventsData.map(e => e.currency).filter(Boolean))];
      const currency = currencies.length > 0 ? currencies[0] : 'USD';

      setStats({
        totalEvents: eventsData.length,
        totalRevenue,
        totalRegistrations,
        averageTicketPrice: totalRegistrations > 0 ? totalRevenue / totalRegistrations : 0,
        currency
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      showError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => formatAmount(amount, stats.currency || 'USD');

  const topEvents = [...events]
    .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
    .slice(0, 5);

  const normalizeEventStatus = (status) => String(status || '').toUpperCase();

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Statistiques Détaillées</h1>
            <p className="admin-page-subtitle">Analysez les performances de vos événements</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card purple">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCalendarAlt />
            </div>
            <div className="admin-stat-card-badge up">
              <FaArrowUp /> +12%
            </div>
          </div>
          <p className="admin-stat-card-label">Total Événements</p>
          <p className="admin-stat-card-value">{stats.totalEvents}</p>
        </div>

        <div className="admin-stat-card green">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaDollarSign />
            </div>
            <div className="admin-stat-card-badge up">
              <FaArrowUp /> +25%
            </div>
          </div>
          <p className="admin-stat-card-label">Revenus Totaux</p>
          <p className="admin-stat-card-value">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="admin-stat-card blue">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaUsers />
            </div>
            <div className="admin-stat-card-badge up">
              <FaArrowUp /> +18%
            </div>
          </div>
          <p className="admin-stat-card-label">Total Participants</p>
          <p className="admin-stat-card-value">{stats.totalRegistrations}</p>
        </div>

        <div className="admin-stat-card orange">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaChartLine />
            </div>
            <div className="admin-stat-card-badge down">
              <FaArrowDown /> -5%
            </div>
          </div>
          <p className="admin-stat-card-label">Prix Moyen Billet</p>
          <p className="admin-stat-card-value">{formatCurrency(stats.averageTicketPrice)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
        {/* Top 5 Événements */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaTrophy style={{ color: '#f59e0b' }} />
              Top 5 Événements (Revenus)
            </h3>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div className="admin-loading">
                <div className="admin-spinner"></div>
              </div>
            ) : topEvents.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Aucune donnée disponible</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {topEvents.map((event, idx) => (
                  <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'white',
                      background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#ea580c' : '#7c3aed'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1e293b' }}>{event.title}</p>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {event.total_registrations || 0} participants
                      </p>
                    </div>
                    <p style={{ fontWeight: 700, color: '#10b981' }}>
                      {formatCurrency(event.total_revenue || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Répartition par statut */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaChartPie style={{ color: '#7c3aed' }} />
              Événements par Statut
            </h3>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div className="admin-loading">
                <div className="admin-spinner"></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {['PUBLISHED', 'DRAFT', 'CANCELLED', 'COMPLETED'].map(status => {
                  const count = events.filter(e => normalizeEventStatus(e.status) === status).length;
                  const percentage = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
                  const colors = {
                    PUBLISHED: { bg: '#10b981', text: 'Publiés' },
                    DRAFT: { bg: '#64748b', text: 'Brouillons' },
                    CANCELLED: { bg: '#ef4444', text: 'Annulés' },
                    COMPLETED: { bg: '#3b82f6', text: 'Terminés' }
                  };

                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{colors[status].text}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{count}</span>
                      </div>
                      <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            background: colors[status].bg,
                            height: '100%',
                            borderRadius: '9999px',
                            width: `${percentage}%`,
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tendances */}
        <div className="admin-card" style={{ gridColumn: 'span 2' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaChartBar style={{ color: '#3b82f6' }} />
              Évolution des Revenus
            </h3>
          </div>
          <div className="admin-card-body">
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ color: '#64748b' }}>
                Graphique d'évolution des revenus à venir (Chart.js ou Recharts)
              </p>
            </div>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default Statistics;
