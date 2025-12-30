/**
 * ================================================
 * PAGE : GESTION DES ÉVÉNEMENTS (SUPERADMIN)
 * ================================================
 *
 * Design professionnel moderne pour la gestion des événements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCalendar,
  FaSearch,
  FaEye,
  FaBan,
  FaCheckCircle,
  FaTrash,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaVideo,
  FaUsers,
  FaChartLine,
  FaClock,
  FaMoneyBillWave,
  FaStar
} from 'react-icons/fa';

// Composants
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import '../../styles/superadmin.css';

// API
import {
  getAllEvents,
  getEventById,
  suspendEvent,
  unsuspendEvent,
  deleteEvent,
  featureEvent,
  unfeatureEvent,
  updateAdminNotes
} from '../../api/events';

function EventsManagement() {
  const navigate = useNavigate();

  // État
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    cancelled: 0,
    suspended: 0
  });

  // État pour la modal de notes admin
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [currentEventForNotes, setCurrentEventForNotes] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const canSaveNotes =
    !!currentEventForNotes &&
    adminNotes.trim().length > 0 &&
    adminNotes.trim() !== (currentEventForNotes.admin_notes || '').trim();

  /**
   * Charger les événements
   */
  useEffect(() => {
    loadEvents();
  }, [searchTerm, statusFilter, formatFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      const params = {
        limit: 100,
        admin: true
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter.toUpperCase();
      if (formatFilter !== 'all') params.format = formatFilter;

      const data = await getAllEvents(params);
      const eventsList = Array.isArray(data) ? data : (data.items || []);

      setEvents(eventsList);
      calculateStats(eventsList);

    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      toast.error('Impossible de charger les événements');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculer les statistiques
   */
  const calculateStats = (eventsList) => {
    setStats({
      total: eventsList.length,
      published: eventsList.filter(e => e.status?.toUpperCase() === 'PUBLISHED').length,
      draft: eventsList.filter(e => e.status?.toUpperCase() === 'DRAFT').length,
      cancelled: eventsList.filter(e => e.status?.toUpperCase() === 'CANCELLED').length,
      suspended: eventsList.filter(e => e.is_flagged).length
    });
  };

  /**
   * Voir détails d'un événement
   */
  const handleViewDetails = async (eventId) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);

      const data = await getEventById(eventId);
      setSelectedEvent(data);

    } catch (error) {
      console.error('❌ Erreur chargement détails:', error);
      toast.error('Impossible de charger les détails');
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * Suspendre un événement
   */
  const handleSuspend = async (event) => {
    const reason = prompt(`Veuillez indiquer la raison de la suspension de "${event.title}" :`);

    if (!reason || reason.trim() === '') {
      toast.warning('Suspension annulée');
      return;
    }

    try {
      await suspendEvent(event.id, reason);
      toast.success('Événement suspendu avec succès');
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur suspension:', error);
      toast.error('Erreur lors de la suspension');
    }
  };

  /**
   * Réactiver un événement
   */
  const handleUnsuspend = async (event) => {
    if (!window.confirm(`Réactiver l'événement "${event.title}" ?`)) {
      return;
    }

    try {
      await unsuspendEvent(event.id);
      toast.success('Événement réactivé avec succès');
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur réactivation:', error);
      toast.error('Erreur lors de la réactivation');
    }
  };

  /**
   * Supprimer un événement
   */
  const handleDelete = async (event) => {
    if (!window.confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer "${event.title}" ?\n\nCette action est IRRÉVERSIBLE !`)) {
      return;
    }

    if (!window.confirm(`Confirmer la suppression définitive de "${event.title}" ?`)) {
      return;
    }

    try {
      await deleteEvent(event.id);
      toast.success('Événement supprimé');
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  /**
   * ================================================
   * METTRE EN AVANT / RETIRER DE LA UNE
   * ================================================
   *
   * Ces fonctions permettent de mettre un événement en avant (featured)
   * ou de le retirer de la une. Les événements mis en avant ont un badge
   * spécial et apparaissent en haut des listes publiques.
   */
  const handleFeature = async (event) => {
    if (!window.confirm(`Mettre en avant l'événement "${event.title}" ?\n\nCet événement apparaîtra en haut de la liste publique.`)) {
      return;
    }

    try {
      await featureEvent(event.id);
      toast.success('⭐ Événement mis en avant');
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur mise en avant:', error);
      toast.error('Erreur lors de la mise en avant');
    }
  };

  const handleUnfeature = async (event) => {
    if (!window.confirm(`Retirer "${event.title}" de la une ?`)) {
      return;
    }

    try {
      await unfeatureEvent(event.id);
      toast.success('Événement retiré de la une');
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur retrait de la une:', error);
      toast.error('Erreur lors du retrait');
    }
  };

  /**
   * ================================================
   * GESTION DES NOTES ADMIN
   * ================================================
   *
   * Ces fonctions permettent au SuperAdmin d'ajouter des notes privées
   * sur un événement. Ces notes sont visibles uniquement par les admins
   * et permettent de garder des informations importantes sur l'événement.
   */
  const handleOpenNotesModal = (event) => {
    setCurrentEventForNotes(event);
    setAdminNotes(event.admin_notes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!currentEventForNotes) return;

    try {
      await updateAdminNotes(currentEventForNotes.id, adminNotes);
      toast.success('📝 Notes mises à jour');
      setIsNotesModalOpen(false);
      loadEvents();
    } catch (error) {
      console.error('❌ Erreur mise à jour notes:', error);
      toast.error('Erreur lors de la mise à jour des notes');
    }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  /**
   * Badge de statut avec le badge suspendu prioritaire
   */
  const getStatusBadge = (status, isFlagged) => {
    // Badge suspendu a la priorité
    if (isFlagged) {
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
          🚫 Suspendu
        </span>
      );
    }

    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
            ✅ Publié
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
            📝 Brouillon
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300">
            ❌ Annulé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-300">
            {status || 'N/A'}
          </span>
        );
    }
  };

  /**
   * Badge de format
   */
  const getFormatBadge = (format) => {
    const normalizedFormat = format?.toLowerCase();

    switch (normalizedFormat) {
      case 'physical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
            <FaMapMarkerAlt /> Présentiel
          </span>
        );
      case 'virtual':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 border border-purple-200">
            <FaVideo /> Virtuel
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FaUsers /> Hybride
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-50 text-gray-600 border border-gray-200">
            {format || 'N/A'}
          </span>
        );
    }
  };

  return (
    <div className="sa-page">

      {/* HEADER */}
      <div className="sa-page-header">
        <div className="sa-container">
          <div className="sa-page-header-content">
            <div className="sa-page-header-left">
              <button
                className="sa-back-btn"
                onClick={() => navigate('/superadmin/dashboard')}
              >
                <FaArrowLeft />
              </button>
              <div>
                <h1 className="sa-page-title">Gestion des Événements</h1>
                <p className="sa-page-subtitle">Gérer et modérer tous les événements de la plateforme</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="sa-btn sa-btn-primary"
                onClick={() => navigate('/superadmin/events/create')}
              >
                <FaCalendar />
                Créer un événement
              </button>
              <FaCalendar style={{ fontSize: '1.75rem', color: '#8b5cf6' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="sa-container" style={{ padding: '2rem 1.5rem' }}>

        {/* STATISTIQUES */}
        <div className="sa-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '2rem' }}>
          <div className="sa-stat-card">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaChartLine /></div>
            </div>
            <p className="sa-stat-label">Total</p>
            <p className="sa-stat-value">{stats.total}</p>
          </div>

          <div className="sa-stat-card gradient-green">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaCheckCircle /></div>
            </div>
            <p className="sa-stat-label">Publiés</p>
            <p className="sa-stat-value">{stats.published}</p>
          </div>

          <div className="sa-stat-card gradient-orange">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaClock /></div>
            </div>
            <p className="sa-stat-label">Brouillons</p>
            <p className="sa-stat-value">{stats.draft}</p>
          </div>

          <div className="sa-stat-card">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaBan /></div>
            </div>
            <p className="sa-stat-label">Annulés</p>
            <p className="sa-stat-value">{stats.cancelled}</p>
          </div>

          <div className="sa-stat-card gradient-pink">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaBan /></div>
            </div>
            <p className="sa-stat-label">Suspendus</p>
            <p className="sa-stat-value">{stats.suspended}</p>
          </div>
        </div>

        {/* FILTRES */}
        <div className="sa-filters">
          <div className="sa-filters-grid">
            <div className="sa-search">
              <FaSearch className="sa-search-icon" />
              <input
                type="text"
                placeholder="Rechercher un événement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sa-search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sa-select"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
              <option value="cancelled">Annulés</option>
            </select>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="sa-select"
            >
              <option value="all">Tous les formats</option>
              <option value="physical">Présentiel</option>
              <option value="virtual">Virtuel</option>
              <option value="hybrid">Hybride</option>
            </select>
          </div>
        </div>

        {/* TABLEAU */}
        <div className="sa-card" style={{ marginTop: '1.5rem' }}>
          {loading ? (
            <div className="sa-loading">
              <div className="sa-spinner"></div>
              <span className="sa-loading-text">Chargement des événements...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="sa-empty">
              <div className="sa-empty-icon"><FaCalendar /></div>
              <h3 className="sa-empty-title">Aucun événement trouvé</h3>
              <p className="sa-empty-text">Aucun événement ne correspond à vos critères de recherche.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Événement</th>
                    <th>Organisateur</th>
                    <th>Format</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Inscriptions</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{event.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{event.city}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500 }}>{event.organizer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{event.organizer_email}</div>
                      </td>

                      <td>{getFormatBadge(event.event_format)}</td>

                      <td style={{ color: '#64748b' }}>{formatDate(event.start_date)}</td>

                      <td>{getStatusBadge(event.status, event.is_flagged)}</td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaUsers style={{ color: '#94a3b8' }} />
                          <span style={{ fontWeight: 600 }}>
                            {event.total_registrations || 0} / {event.capacity}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleViewDetails(event.id)}
                            className="sa-btn-icon blue"
                            title="Voir détails"
                          >
                            <FaEye />
                          </button>

                          {event.is_flagged ? (
                            <button
                              onClick={() => handleUnsuspend(event)}
                              className="sa-btn-icon green"
                              title="Réactiver"
                            >
                              <FaCheckCircle />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(event)}
                              className="sa-btn-icon orange"
                              title="Suspendre"
                            >
                              <FaBan />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(event)}
                            className="sa-btn-icon red"
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>

                          {event.is_featured ? (
                            <button
                              onClick={() => handleUnfeature(event)}
                              className="sa-btn-icon"
                              title="Retirer de la une"
                              style={{ color: '#eab308' }}
                            >
                              <FaStar />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFeature(event)}
                              className="sa-btn-icon"
                              title="Mettre en avant"
                              style={{ color: '#cbd5e1' }}
                            >
                              <FaStar />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenNotesModal(event)}
                            className="sa-btn-icon purple"
                            title="Notes admin"
                          >
                            📝
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DÉTAILS */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Détails de l'événement"
        size="large"
      >
        {loadingDetails ? (
          <Loader text="Chargement des détails..." />
        ) : selectedEvent ? (
          <div className="space-y-6">

            {/* Image */}
            {selectedEvent.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Informations générales */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Informations générales</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Titre</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedEvent.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Format</p>
                  <div className="mt-1">{getFormatBadge(selectedEvent.event_format)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Statut</p>
                  <div className="mt-1">{getStatusBadge(selectedEvent.status, selectedEvent.is_flagged)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Inscriptions</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {selectedEvent.total_registrations || 0} / {selectedEvent.capacity}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Places disponibles</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedEvent.available_seats}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Tarif</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {selectedEvent.is_free ? '🆓 Gratuit' : `💰 ${selectedEvent.price} ${selectedEvent.currency}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenu total</p>
                  <p className="text-base font-semibold text-green-600 mt-1">
                    <FaMoneyBillWave className="inline mr-1" />
                    {selectedEvent.total_revenue || 0} {selectedEvent.currency || 'USD'}
                  </p>
                </div>
                {selectedEvent.is_featured && (
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                      ⭐ Mis en avant
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {/* Dates et lieu */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dates et lieu</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Date de début</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{formatDate(selectedEvent.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Date de fin</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{formatDate(selectedEvent.end_date)}</p>
                </div>
                {selectedEvent.location && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Lieu</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">
                      <FaMapMarkerAlt className="inline mr-2 text-blue-600" />
                      {selectedEvent.location}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Ville / Pays</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {selectedEvent.city}, {selectedEvent.country_code}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations virtuelles */}
            {(selectedEvent.event_format === 'virtual' || selectedEvent.event_format === 'VIRTUAL' ||
              selectedEvent.event_format === 'hybrid' || selectedEvent.event_format === 'HYBRID') && (
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  <FaVideo className="inline mr-2 text-purple-600" />
                  Connexion virtuelle
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {selectedEvent.virtual_platform && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Plateforme</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{selectedEvent.virtual_platform}</p>
                    </div>
                  )}
                  {selectedEvent.virtual_meeting_url && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-600">Lien de connexion</p>
                      <a
                        href={selectedEvent.virtual_meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-blue-600 hover:underline mt-1 block"
                      >
                        Rejoindre la réunion →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organisateur */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                <FaUsers className="inline mr-2 text-green-600" />
                Organisateur
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nom</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedEvent.organizer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedEvent.organizer_email}</p>
                </div>
              </div>
            </div>

            {/* Notes admin */}
            {selectedEvent.admin_notes && (
              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">📝 Notes administratives</h3>
                <p className="text-gray-800">{selectedEvent.admin_notes}</p>
              </div>
            )}

            {/* Raison signalement */}
            {selectedEvent.is_flagged && selectedEvent.flag_reason && (
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <h3 className="text-lg font-bold text-red-900 mb-3">🚫 Raison de la suspension</h3>
                <p className="text-red-800 font-medium">{selectedEvent.flag_reason}</p>
              </div>
            )}

            {/* Dates système */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p><FaClock className="inline mr-1" /> Créé le : {formatDate(selectedEvent.created_at)}</p>
                </div>
                {selectedEvent.updated_at && (
                  <div>
                    <p><FaClock className="inline mr-1" /> Modifié le : {formatDate(selectedEvent.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-center text-gray-600">Aucun détail disponible</p>
        )}
      </Modal>

      {/* MODAL NOTES ADMIN */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="📝 Notes administratives"
        size="medium"
        footer={(
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
            <button
              onClick={() => setIsNotesModalOpen(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              type="button"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={!canSaveNotes}
              style={
                canSaveNotes
                  ? { background: '#7c3aed', color: '#ffffff' }
                  : { background: '#e2e8f0', color: '#475569', cursor: 'not-allowed' }
              }
              className="px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
              type="button"
            >
              💾 Enregistrer les notes
            </button>
          </div>
        )}
      >
        <div className="space-y-4">

          {/* Informations sur l'événement */}
          {currentEventForNotes && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">{currentEventForNotes.title}</h3>
              <p className="text-sm text-gray-600">
                Organisé par : {currentEventForNotes.organizer_name}
              </p>
              <p className="text-sm text-gray-600">
                Date : {formatDate(currentEventForNotes.start_date)}
              </p>
            </div>
          )}

          {/* Explication */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>À quoi servent les notes admin ?</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Les notes administratives sont visibles <strong>uniquement par les SuperAdmins</strong>.
              Utilisez-les pour :
            </p>
            <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
              <li>Garder des informations importantes sur l'événement</li>
              <li>Noter des observations sur l'organisateur</li>
              <li>Suivre l'historique des actions administratives</li>
              <li>Partager des informations avec les autres admins</li>
            </ul>
          </div>

          {/* Textarea pour les notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes privées (visibles uniquement par les admins)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ajoutez vos notes ici..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {adminNotes.length} caractères
            </p>
          </div>

        </div>
      </Modal>

    </div>
  );
}

export default EventsManagement;
