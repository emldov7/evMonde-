/**
 * Registrations - Page de gestion des inscriptions et participants
 *
 * Affiche tous les participants inscrits aux événements de l'organisateur
 */

import { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaDownload, FaEnvelope, FaCheckCircle, FaChevronDown, FaChevronUp, FaCalendarAlt } from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import '../../styles/admin.css';

function Registrations() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [eventRegistrations, setEventRegistrations] = useState({});
  const [loadingRegistrations, setLoadingRegistrations] = useState({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/events/my/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Erreur lors du chargement des inscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventRegistrations = async (eventId) => {
    if (eventRegistrations[eventId]) {
      // Déjà chargé
      return;
    }

    setLoadingRegistrations(prev => ({ ...prev, [eventId]: true }));
    try {
      const response = await api.get(`/api/v1/registrations/events/${eventId}/registrations`);
      console.log('🔍 Participants reçus pour event', eventId, ':', response.data);
      if (response.data.length > 0) {
        console.log('📋 Premier participant:', response.data[0]);
        console.log('📋 Champs utilisateur:', {
          user_first_name: response.data[0].user_first_name,
          user_last_name: response.data[0].user_last_name,
          user_email: response.data[0].user_email,
          user_phone: response.data[0].user_phone,
          guest_first_name: response.data[0].guest_first_name,
          guest_email: response.data[0].guest_email
        });
      }
      setEventRegistrations(prev => ({ ...prev, [eventId]: response.data }));
    } catch (error) {
      console.error('Error fetching registrations:', error);
      showError('Erreur lors du chargement des participants');
    } finally {
      setLoadingRegistrations(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const toggleEventExpanded = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
      fetchEventRegistrations(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const totalRegistrations = events.reduce((sum, e) => sum + (e.total_registrations || 0), 0);

  // Fonction pour filtrer les participants selon la recherche
  const filterRegistrations = (registrations) => {
    if (!searchTerm.trim()) {
      return registrations;
    }

    const search = searchTerm.toLowerCase();
    return registrations.filter(reg => {
      const name = reg.user_first_name && reg.user_last_name
        ? `${reg.user_first_name} ${reg.user_last_name}`.toLowerCase()
        : reg.guest_first_name && reg.guest_last_name
        ? `${reg.guest_first_name} ${reg.guest_last_name}`.toLowerCase()
        : '';

      const email = (reg.user_email || reg.guest_email || '').toLowerCase();
      const phone = (reg.user_phone || reg.guest_phone || '').toLowerCase();

      return name.includes(search) || email.includes(search) || phone.includes(search);
    });
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

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700'
    };

    const labels = {
      confirmed: 'Confirmé',
      pending: 'En attente',
      cancelled: 'Annulé'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Fonction pour exporter tous les participants en CSV
  const exportToCSV = () => {
    // Collecter tous les participants de tous les événements
    let allRegistrations = [];

    events.forEach(event => {
      const regs = eventRegistrations[event.id] || [];
      regs.forEach(reg => {
        allRegistrations.push({
          event: event.title,
          date_event: new Date(event.start_date).toLocaleDateString('fr-FR'),
          participant: reg.user_first_name && reg.user_last_name
            ? `${reg.user_first_name} ${reg.user_last_name}`
            : reg.guest_first_name && reg.guest_last_name
            ? `${reg.guest_first_name} ${reg.guest_last_name}`
            : 'N/A',
          email: reg.user_email || reg.guest_email || 'N/A',
          telephone: reg.user_phone || reg.guest_phone || 'N/A',
          date_inscription: formatDate(reg.registered_at),
          statut: reg.status,
          type: reg.registration_type === 'USER' ? 'Compte' : 'Invité'
        });
      });
    });

    // Si aucun participant, afficher un message
    if (allRegistrations.length === 0) {
      showError('Aucun participant à exporter. Développez les événements pour charger les participants.');
      return;
    }

    // Créer le contenu CSV
    const headers = ['Événement', 'Date Événement', 'Participant', 'Email', 'Téléphone', 'Date Inscription', 'Statut', 'Type'];
    const csvContent = [
      headers.join(','),
      ...allRegistrations.map(reg => [
        `"${reg.event}"`,
        `"${reg.date_event}"`,
        `"${reg.participant}"`,
        `"${reg.email}"`,
        `"${reg.telephone}"`,
        `"${reg.date_inscription}"`,
        `"${reg.statut}"`,
        `"${reg.type}"`
      ].join(','))
    ].join('\n');

    // Créer et télécharger le fichier
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Inscriptions & Participants</h1>
            <p className="admin-page-subtitle">Gérez tous les participants à vos événements</p>
          </div>
          <div className="admin-page-actions">
            <button onClick={exportToCSV} className="admin-btn admin-btn-primary">
              <FaDownload />
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card blue">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaUsers />
            </div>
          </div>
          <p className="admin-stat-card-label">Total Participants</p>
          <p className="admin-stat-card-value">{totalRegistrations}</p>
        </div>

        <div className="admin-stat-card green">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCheckCircle />
            </div>
          </div>
          <p className="admin-stat-card-label">Confirmés</p>
          <p className="admin-stat-card-value">{totalRegistrations}</p>
        </div>

        <div className="admin-stat-card purple">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaCalendarAlt />
            </div>
          </div>
          <p className="admin-stat-card-label">Événements</p>
          <p className="admin-stat-card-value">{events.length}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-filters" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-search">
          <FaSearch className="admin-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un participant par nom, email..."
            className="admin-search-input"
          />
        </div>
      </div>

      {/* Events & Participants List */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Participants par Événement</h3>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <FaUsers />
              </div>
              <h3>Aucune inscription</h3>
              <p>Aucun participant inscrit pour le moment</p>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.map(event => {
                const isExpanded = expandedEvents.has(event.id);
                const registrations = eventRegistrations[event.id] || [];
                const filteredRegistrations = filterRegistrations(registrations);
                const isLoadingRegs = loadingRegistrations[event.id];

                return (
                  <div key={event.id} className="admin-event-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'default', padding: 0 }}>
                    {/* Event Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                        cursor: event.total_registrations > 0 ? 'pointer' : 'default',
                        borderRadius: isExpanded ? '12px 12px 0 0' : '12px'
                      }}
                      onClick={() => event.total_registrations > 0 && toggleEventExpanded(event.id)}
                    >
                      <div>
                        <h4 style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>{event.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {new Date(event.start_date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="admin-badge admin-badge-primary" style={{ padding: '0.5rem 1rem' }}>
                          {event.total_registrations || 0} participant{event.total_registrations > 1 ? 's' : ''}
                        </span>
                        {event.total_registrations > 0 && (
                          <span style={{ color: '#7c3aed', fontSize: '1.25rem' }}>
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participants List */}
                    {isExpanded && (
                      <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
                        {isLoadingRegs ? (
                          <div className="admin-loading" style={{ padding: '2rem' }}>
                            <div className="admin-spinner"></div>
                          </div>
                        ) : filteredRegistrations.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                            {searchTerm ? 'Aucun participant ne correspond à votre recherche' : 'Aucune inscription'}
                          </p>
                        ) : (
                          <div className="admin-table-container">
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th>Participant</th>
                                  <th>Email</th>
                                  <th>Téléphone</th>
                                  <th>Date</th>
                                  <th>Statut</th>
                                  <th>Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRegistrations.map((reg) => (
                                  <tr key={reg.id}>
                                    <td style={{ fontWeight: 600 }}>
                                      {reg.user_first_name && reg.user_last_name
                                        ? `${reg.user_first_name} ${reg.user_last_name}`
                                        : reg.guest_first_name && reg.guest_last_name
                                        ? `${reg.guest_first_name} ${reg.guest_last_name}`
                                        : 'N/A'}
                                    </td>
                                    <td>{reg.user_email || reg.guest_email || 'N/A'}</td>
                                    <td>{reg.user_phone || reg.guest_phone || 'N/A'}</td>
                                    <td>{formatDate(reg.registration_date || reg.created_at)}</td>
                                    <td>{getStatusBadge(reg.status)}</td>
                                    <td>
                                      <span className={`admin-badge ${reg.registration_type === 'user' ? 'admin-badge-primary' : 'admin-badge-gray'}`}>
                                        {reg.registration_type === 'user' ? 'Compte' : 'Invité'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No registrations message */}
                    {!isExpanded && event.total_registrations === 0 && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                        Aucune inscription pour cet événement
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default Registrations;
