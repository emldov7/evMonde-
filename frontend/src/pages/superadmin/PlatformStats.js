/**
 * ================================================
 * PAGE : STATISTIQUES PLATEFORME (SUPERADMIN)
 * ================================================
 *
 * Dashboard ultra professionnel avec statistiques en temps réel
 * Design moderne et impactant pour impressionner les clients
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaUsers,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTicketAlt,
  FaUserTie,
  FaChartLine,
  FaTrophy,
  FaStar,
  FaBan,
  FaExclamationTriangle,
  FaCrown,
  FaFire
} from 'react-icons/fa';

// Composants
import Loader from '../../components/common/Loader';
import '../../styles/superadmin.css';

// API
import {
  getPlatformStats,
  getTopOrganizers,
  getTopEvents
} from '../../api/stats';

function PlatformStats() {
  const navigate = useNavigate();

  // État
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topOrganizers, setTopOrganizers] = useState([]);
  const [topEvents, setTopEvents] = useState([]);

  /**
   * Charger toutes les statistiques au montage
   */
  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      setLoading(true);

      // Charger en parallèle pour plus de rapidité
      const [statsData, organizersData, eventsData] = await Promise.all([
        getPlatformStats(),
        getTopOrganizers(5),
        getTopEvents(5)
      ]);

      // DEBUG: Afficher les données reçues du backend
      console.log('📊 STATS REÇUES DU BACKEND:', statsData);
      console.log('👥 TOP ORGANIZERS:', organizersData);
      console.log('⭐ TOP EVENTS:', eventsData);

      setStats(statsData);
      setTopOrganizers(organizersData);
      setTopEvents(eventsData);

    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formater un nombre avec séparateurs de milliers
   */
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  /**
   * Formater un grand nombre en K, M, etc.
   * Exemple: 1500 -> "1.5K", 1000000 -> "1M"
   */
  const formatLargeNumber = (num) => {
    if (!num && num !== 0) return '0';

    // Si moins de 1000, afficher tel quel
    if (num < 1000) {
      return formatNumber(num);
    }

    // Si entre 1K et 1M, afficher en K
    if (num < 1000000) {
      const k = num / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }

    // Si plus d'1M, afficher en M
    const m = num / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  };

  /**
   * Formater une devise
   */
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return `0 ${currency}`;
    return `${formatNumber(amount)} ${currency}`;
  };

  /**
   * Formater une date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  /**
   * Obtenir la couleur de la médaille
   */
  const getMedalColor = (rank) => {
    switch (rank) {
      case 0:
        return 'text-yellow-500'; // Or
      case 1:
        return 'text-gray-400'; // Argent
      case 2:
        return 'text-orange-600'; // Bronze
      default:
        return 'text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="sa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-loading">
          <div className="sa-spinner"></div>
          <span className="sa-loading-text">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="sa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-empty">
          <div className="sa-empty-icon"><FaChartLine /></div>
          <h3 className="sa-empty-title">Aucune statistique disponible</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">

      {/* HEADER */}
      <header className="sa-header" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)' }}>
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
                <h1 className="sa-header-title">📊 Statistiques Plateforme</h1>
                <p className="sa-header-subtitle">Vue d'ensemble en temps réel de votre écosystème événementiel</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '0.75rem 1.25rem' }}>
              <FaChartLine style={{ fontSize: '1.5rem', color: 'white' }} />
              <div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Dernière mise à jour</p>
                <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 700 }}>Maintenant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="sa-container" style={{ padding: '2rem 1.5rem' }}>

        {/* CARTES KPI PRINCIPALES */}
        <div className="sa-stats-grid" style={{ marginBottom: '2rem' }}>
          {/* Total Utilisateurs */}
          <div className="sa-stat-card gradient-blue">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaUsers /></div>
            </div>
            <p className="sa-stat-label">Utilisateurs</p>
            <p className="sa-stat-value">{formatNumber(stats.total_users)}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaUserTie /> {formatNumber(stats.total_organizers)} organisateurs
            </p>
          </div>

          {/* Total Événements */}
          <div className="sa-stat-card gradient-purple">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaCalendarAlt /></div>
            </div>
            <p className="sa-stat-label">Événements</p>
            <p className="sa-stat-value">{formatNumber(stats.total_events)}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaStar style={{ color: '#fde047' }} /> {formatNumber(stats.published_events)} publiés
            </p>
          </div>

          {/* Total Inscriptions */}
          <div className="sa-stat-card gradient-green">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaTicketAlt /></div>
            </div>
            <p className="sa-stat-label">Inscriptions</p>
            <p className="sa-stat-value">{formatNumber(stats.total_registrations)}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.5rem' }}>Toutes plateformes</p>
          </div>

          {/* Revenus Totaux */}
          <div className="sa-stat-card gradient-orange">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaMoneyBillWave /></div>
            </div>
            <p className="sa-stat-label">Revenus</p>
            <p className="sa-stat-value" style={{ fontSize: '1.75rem' }}>{formatLargeNumber(stats.total_revenue)} USD</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaFire style={{ color: '#fde047' }} /> {formatLargeNumber(stats.commission_revenue)} commissions
            </p>
          </div>
        </div>

        {/* STATS SECONDAIRES */}
        <div className="sa-secondary-stats" style={{ marginBottom: '2rem' }}>
          <div className="sa-secondary-card yellow">
            <div className="sa-secondary-icon"><FaExclamationTriangle /></div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Brouillons</p>
              <p className="sa-secondary-value">{formatNumber(stats.draft_events)}</p>
            </div>
          </div>

          <div className="sa-secondary-card red">
            <div className="sa-secondary-icon"><FaBan /></div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Événements suspendus</p>
              <p className="sa-secondary-value">{formatNumber(stats.suspended_events)}</p>
            </div>
          </div>

          <div className="sa-secondary-card purple">
            <div className="sa-secondary-icon"><FaBan /></div>
            <div className="sa-secondary-info">
              <p className="sa-secondary-label">Utilisateurs suspendus</p>
              <p className="sa-secondary-value">{formatNumber(stats.suspended_users)}</p>
            </div>
          </div>
        </div>

        {/* CLASSEMENTS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

          {/* TOP ORGANISATEURS */}
          <div className="sa-card" style={{ overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaTrophy style={{ fontSize: '2rem', color: '#fde047' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: 0 }}>Top Organisateurs</h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Les meilleurs de la plateforme</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {topOrganizers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Aucune donnée disponible</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topOrganizers.map((organizer, index) => (
                    <div
                      key={organizer.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {index < 3 ? (
                          <FaCrown className={getMedalColor(index)} style={{ fontSize: '2rem' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#64748b' }}>#{index + 1}</div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', margin: 0 }}>{organizer.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0' }}>{organizer.email}</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <FaCalendarAlt style={{ color: '#8b5cf6' }} />
                            <strong>{formatNumber(organizer.total_events)}</strong> événements
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <FaTicketAlt style={{ color: '#10b981' }} />
                            <strong>{formatNumber(organizer.total_registrations)}</strong> inscrits
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Revenu</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>{formatLargeNumber(organizer.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TOP ÉVÉNEMENTS */}
          <div className="sa-card" style={{ overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaStar style={{ fontSize: '2rem', color: '#fde047' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: 0 }}>Top Événements</h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Les plus populaires</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {topEvents.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Aucune donnée disponible</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topEvents.map((event, index) => (
                    <div
                      key={event.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {index < 3 ? (
                          <FaCrown className={getMedalColor(index)} style={{ fontSize: '2rem' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#64748b' }}>#{index + 1}</div>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', margin: 0 }}>{event.title}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0' }}>Par {event.organizer_name}</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <FaTicketAlt style={{ color: '#10b981' }} />
                            <strong>{formatNumber(event.total_registrations)}</strong> / {formatNumber(event.capacity)}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b' }}>
                            <FaCalendarAlt style={{ color: '#3b82f6' }} />
                            {formatDate(event.start_date)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Revenu</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: 0 }}>{formatLargeNumber(event.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="sa-status-banner" style={{ marginTop: '2rem' }}>
          <div className="sa-status-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
            <FaChartLine />
          </div>
          <div className="sa-status-content">
            <h3 style={{ color: '#1e40af' }}>Statistiques en temps réel</h3>
            <p style={{ color: '#1e3a8a' }}>
              Ces données sont calculées automatiquement depuis la base de données PostgreSQL.
              Actualisez la page pour obtenir les dernières données.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default PlatformStats;
