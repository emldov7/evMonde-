/**
 * Tickets - Page de gestion des billets et tickets
 *
 * Permet de gérer tous les types de billets créés pour les événements
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaShoppingCart } from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import '../../styles/admin.css';

function Tickets() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEventsWithTickets();
  }, []);

  const fetchEventsWithTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/events/my/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Erreur lors du chargement des billets');
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

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Gestion des Billets</h1>
            <p className="admin-page-subtitle">Gérez les types de billets pour vos événements</p>
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

      {/* Stats */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card purple">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaTicketAlt />
            </div>
          </div>
          <p className="admin-stat-card-label">Types de Billets</p>
          <p className="admin-stat-card-value">
            {events.reduce((sum, e) => sum + (e.tickets?.length || 0), 0)}
          </p>
        </div>

        <div className="admin-stat-card blue">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCalendarAlt />
            </div>
          </div>
          <p className="admin-stat-card-label">Événements</p>
          <p className="admin-stat-card-value">{events.length}</p>
        </div>

        <div className="admin-stat-card green">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaShoppingCart />
            </div>
          </div>
          <p className="admin-stat-card-label">Billets Vendus</p>
          <p className="admin-stat-card-value">
            {events.reduce((sum, e) => sum + (e.total_registrations || 0), 0)}
          </p>
        </div>
      </div>

      {/* Events with Tickets */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Billets par Événement</h3>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <FaTicketAlt />
              </div>
              <h3>Aucun billet</h3>
              <p>Créez un événement pour configurer des billets</p>
              <button
                onClick={() => navigate('/admin/events/create')}
                className="admin-btn admin-btn-primary"
              >
                <FaPlus />
                Créer un événement
              </button>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.map(event => (
              <div key={event.id} className="admin-event-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)', borderRadius: '12px 12px 0 0' }}>
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="admin-event-image" style={{ width: '56px', height: '56px' }} />
                  ) : (
                    <div className="admin-event-placeholder" style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}>
                      {event.title?.[0] || 'E'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>{event.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FaCalendarAlt style={{ color: '#7c3aed' }} />
                        {new Date(event.start_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span>•</span>
                      <span>{event.location || 'En ligne'}</span>
                      <span>•</span>
                      <span className="admin-badge admin-badge-primary">
                        {event.tickets?.length || 0} type(s)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <FaEdit />
                    Modifier
                  </button>
                </div>

                {/* Tickets Table */}
                <div style={{ padding: '1rem' }}>
                  {event.tickets && event.tickets.length > 0 ? (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Prix</th>
                            <th>Quantité</th>
                            <th>Vendus</th>
                            <th>Disponibles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.tickets.map((ticket, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{ticket.name}</td>
                              <td>{formatCurrency(ticket.price, ticket.currency)}</td>
                              <td>{ticket.quantity_available}</td>
                              <td style={{ color: '#3b82f6', fontWeight: 600 }}>{ticket.quantity_sold || 0}</td>
                              <td style={{ color: '#10b981', fontWeight: 600 }}>
                                {ticket.quantity_available - (ticket.quantity_sold || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      Aucun billet configuré pour cet événement
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default Tickets;
