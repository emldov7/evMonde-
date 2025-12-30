/**
 * EventsList - Page de gestion de tous les événements de l'organisateur
 *
 * Affiche tous les événements avec:
 * - Filtres par statut (DRAFT, PUBLISHED, CANCELLED, COMPLETED)
 * - Actions: Voir, Modifier, Publier, Annuler, Supprimer
 * - Statistiques par événement (inscriptions, revenus, places disponibles)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaBan,
  FaClock,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaDollarSign,
  FaCalendarAlt,
  FaFilter,
  FaRocket
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/admin.css';

function EventsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Appliquer les filtres
    if (statusFilter === 'ALL') {
      setFilteredEvents(events);
    } else {
      // Le backend retourne le status en minuscules (draft, published, etc.)
      setFilteredEvents(events.filter(e => e.status?.toUpperCase() === statusFilter));
    }
  }, [statusFilter, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/events/my/events');
      setEvents(response.data);
      setFilteredEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (eventId) => {
    const toastId = showLoading('Publication en cours...');
    try {
      await api.post(`/api/v1/events/${eventId}/publish`);
      updateToSuccess(toastId, 'Événement publié avec succès !');
      fetchEvents();
    } catch (error) {
      console.error('Error publishing event:', error);
      updateToError(toastId, 'Erreur lors de la publication');
    }
  };

  const handleCancel = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) return;

    const toastId = showLoading('Annulation en cours...');
    try {
      await api.post(`/api/v1/events/${eventId}/cancel`);
      updateToSuccess(toastId, 'Événement annulé avec succès');
      fetchEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      updateToError(toastId, 'Erreur lors de l\'annulation');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet événement ?')) return;

    const toastId = showLoading('Suppression en cours...');
    try {
      await api.delete(`/api/v1/events/${eventId}`);
      updateToSuccess(toastId, 'Événement supprimé avec succès');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      updateToError(toastId, 'Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[statusUpper] || styles.DRAFT}`}>
        {labels[statusUpper] || status}
      </span>
    );
  };

  const getFormatBadge = (format) => {
    const styles = {
      physical: 'bg-purple-100 text-purple-700',
      virtual: 'bg-blue-100 text-blue-700',
      hybrid: 'bg-pink-100 text-pink-700'
    };

    const labels = {
      physical: 'Physique',
      virtual: 'Virtuel',
      hybrid: 'Hybride'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[format] || styles.physical}`}>
        {labels[format] || format}
      </span>
    );
  };

  const statsData = {
    total: events.length,
    draft: events.filter(e => e.status?.toLowerCase() === 'draft').length,
    published: events.filter(e => e.status?.toLowerCase() === 'published').length,
    cancelled: events.filter(e => e.status?.toLowerCase() === 'cancelled').length
  };

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Mes Événements</h1>
            <p className="admin-page-subtitle">Gérez tous vos événements en un seul endroit</p>
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

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card purple">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCalendarAlt />
            </div>
          </div>
          <p className="admin-stat-card-label">Total</p>
          <p className="admin-stat-card-value">{statsData.total}</p>
        </div>
        <div className="admin-stat-card" style={{ '--admin-stat-color': '#64748b' }}>
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b' }}>
              <FaEdit />
            </div>
          </div>
          <p className="admin-stat-card-label">Brouillons</p>
          <p className="admin-stat-card-value">{statsData.draft}</p>
        </div>
        <div className="admin-stat-card green">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCheckCircle />
            </div>
          </div>
          <p className="admin-stat-card-label">Publiés</p>
          <p className="admin-stat-card-value">{statsData.published}</p>
        </div>
        <div className="admin-stat-card" style={{ '--admin-stat-color': '#ef4444' }}>
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <FaBan />
            </div>
          </div>
          <p className="admin-stat-card-label">Annulés</p>
          <p className="admin-stat-card-value">{statsData.cancelled}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-label">
          <FaFilter />
          <span>Filtrer par statut:</span>
        </div>
        <div className="admin-filter-buttons">
          {['ALL', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`admin-filter-btn ${statusFilter === status ? 'active' : ''}`}
            >
              {status === 'ALL' ? 'Tous' :
               status === 'DRAFT' ? 'Brouillons' :
               status === 'PUBLISHED' ? 'Publiés' :
               status === 'CANCELLED' ? 'Annulés' : 'Terminés'}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <FaCalendarAlt />
            </div>
            <h3>
              {statusFilter === 'ALL'
                ? "Aucun événement"
                : `Aucun événement ${statusFilter.toLowerCase()}`}
            </h3>
            <p>
              {statusFilter === 'ALL'
                ? "Vous n'avez pas encore créé d'événement"
                : `Aucun événement avec ce statut`}
            </p>
            {statusFilter === 'ALL' && (
              <button
                onClick={() => navigate('/admin/events/create')}
                className="admin-btn admin-btn-primary"
              >
                <FaRocket />
                Créer mon premier événement
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Date & Lieu</th>
                  <th>Statistiques</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="admin-event-image"
                            style={{ width: '56px', height: '56px' }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        ) : (
                          <div className="admin-event-placeholder" style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}>
                            {event.title?.[0] || 'E'}
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>{event.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {getFormatBadge(event.event_format)}
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {event.event_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span className="admin-event-meta-item">
                          <FaClock />
                          {formatDate(event.start_date)}
                        </span>
                        <span className="admin-event-meta-item">
                          <FaMapMarkerAlt />
                          {event.location || 'En ligne'}
                          {event.city && `, ${event.city}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <span className="admin-event-meta-item">
                          <FaTicketAlt />
                          {event.total_registrations || 0} / {event.capacity || 0} places
                        </span>
                        <span className="admin-event-meta-item">
                          <FaDollarSign />
                          {formatCurrency(event.total_revenue || 0, event.currency || 'USD')}
                        </span>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(event.status)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => navigate(`/admin/events/${event.id}`)}
                          className="admin-event-action-btn view"
                          title="Voir les détails"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                          className="admin-event-action-btn edit"
                          title="Modifier"
                        >
                          <FaEdit />
                        </button>
                        {event.status?.toLowerCase() === 'draft' && (
                          <button
                            onClick={() => handlePublish(event.id)}
                            className="admin-event-action-btn"
                            style={{ color: '#10b981' }}
                            title="Publier"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        {event.status?.toLowerCase() === 'published' && (
                          <button
                            onClick={() => handleCancel(event.id)}
                            className="admin-event-action-btn"
                            style={{ color: '#f59e0b' }}
                            title="Annuler"
                          >
                            <FaBan />
                          </button>
                        )}
                        {(event.status?.toLowerCase() === 'draft' || event.status?.toLowerCase() === 'cancelled') && (
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="admin-event-action-btn delete"
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LayoutAdmin>
  );
}

export default EventsList;
