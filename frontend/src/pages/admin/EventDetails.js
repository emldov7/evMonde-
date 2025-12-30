/**
 * EventDetails - Page de détails d'un événement pour l'organisateur
 *
 * Affiche:
 * - Toutes les informations de l'événement
 * - Liste des participants avec export CSV/Excel
 * - Statistiques
 * - Actions: Publier, S'inscrire (si terminé), etc.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaUsers,
  FaArrowLeft,
  FaQrcode,
  FaEye,
  FaEdit,
  FaCheckCircle,
  FaBan,
  FaShare,
  FaHeart,
  FaBookmark,
  FaEnvelope,
  FaFileExport,
  FaFileDownload
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/admin.css';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const [isPinned, setIsPinned] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    fetchRegistrations();
  }, [id]);

  useEffect(() => {
    try {
      const pinned = JSON.parse(localStorage.getItem('pinned_event_ids') || '[]');
      const liked = JSON.parse(localStorage.getItem('liked_event_ids') || '[]');
      setIsPinned(Array.isArray(pinned) && pinned.includes(Number(id)));
      setIsLiked(Array.isArray(liked) && liked.includes(Number(id)));
    } catch {
      setIsPinned(false);
      setIsLiked(false);
    }
  }, [id]);

  const handleShare = async () => {
    if (!event) return;

    const url = `${window.location.origin}/events/${event.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: event.description || '', url });
        showSuccess('Lien partagé');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showSuccess('Lien copié dans le presse-papier');
        return;
      }

      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showSuccess('Lien copié dans le presse-papier');
    } catch (e) {
      showError('Impossible de partager le lien');
    }
  };

  const handleTogglePinned = () => {
    try {
      const key = 'pinned_event_ids';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const ids = Array.isArray(list) ? list : [];
      const eid = Number(id);
      const next = ids.includes(eid) ? ids.filter((x) => x !== eid) : [...ids, eid];
      localStorage.setItem(key, JSON.stringify(next));
      const pinnedNow = next.includes(eid);
      setIsPinned(pinnedNow);
      showSuccess(pinnedNow ? 'Événement épinglé' : 'Épinglage retiré');
    } catch {
      showError('Impossible de modifier l’épinglage');
    }
  };

  const handleToggleLiked = () => {
    try {
      const key = 'liked_event_ids';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const ids = Array.isArray(list) ? list : [];
      const eid = Number(id);
      const next = ids.includes(eid) ? ids.filter((x) => x !== eid) : [...ids, eid];
      localStorage.setItem(key, JSON.stringify(next));
      const likedNow = next.includes(eid);
      setIsLiked(likedNow);
      showSuccess(likedNow ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
      showError('Impossible de modifier les favoris');
    }
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/events/my/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
      showError('Erreur lors du chargement de l\'événement');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoadingRegistrations(true);
      const response = await api.get(`/api/v1/registrations/events/${id}/registrations`);
      setRegistrations(response.data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      // Ne pas afficher d'erreur si pas de registrations
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handlePublish = async () => {
    const toastId = showLoading('Publication en cours...');
    try {
      await api.post(`/api/v1/events/${id}/publish`);
      updateToSuccess(toastId, 'Événement publié avec succès !');
      fetchEventDetails();
    } catch (error) {
      console.error('Error publishing event:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de la publication');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cet événement ?')) return;

    const toastId = showLoading('Annulation en cours...');
    try {
      await api.post(`/api/v1/events/${id}/cancel`);
      updateToSuccess(toastId, 'Événement annulé avec succès');
      fetchEventDetails();
    } catch (error) {
      console.error('Error cancelling event:', error);
      updateToError(toastId, 'Erreur lors de l\'annulation');
    }
  };

  const exportToCSV = () => {
    if (registrations.length === 0) {
      showError('Aucune inscription à exporter');
      return;
    }

    const headers = ['Nom', 'Email', 'Type de billet', 'Prix', 'Statut'];
    const rows = registrations.map(reg => [
      reg.user ? `${reg.user.first_name} ${reg.user.last_name}` : reg.guest_name || 'Invité',
      reg.user?.email || reg.guest_email || '',
      reg.ticket?.name || 'Par défaut',
      `${reg.amount_paid || 0} ${reg.currency || event.currency || 'USD'}`,
      reg.status || 'confirmed'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participants_${event.title.replace(/\s+/g, '_')}.csv`;
    link.click();

    showSuccess('Export CSV réussi !');
  };

  const exportToExcel = () => {
    if (registrations.length === 0) {
      showError('Aucune inscription à exporter');
      return;
    }

    // Pour Excel, on utilise le même format CSV mais avec extension .xls
    const headers = ['Nom', 'Email', 'Type de billet', 'Prix', 'Statut'];
    const rows = registrations.map(reg => [
      reg.user ? `${reg.user.first_name} ${reg.user.last_name}` : reg.guest_name || 'Invité',
      reg.user?.email || reg.guest_email || '',
      reg.ticket?.name || 'Par défaut',
      `${reg.amount_paid || 0} ${reg.currency || event.currency || 'USD'}`,
      reg.status || 'confirmed'
    ]);

    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participants_${event.title.replace(/\s+/g, '_')}.xls`;
    link.click();

    showSuccess('Export Excel réussi !');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
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

  const getStatusButton = () => {
    if (!event) return null;

    const status = event.status?.toLowerCase();
    const now = new Date();
    const eventEnd = new Date(event.end_date || event.start_date);
    const isFinished = eventEnd < now;

    // Si l'événement est terminé
    if (isFinished || status === 'completed') {
      return (
        <button
          disabled
          className="admin-btn admin-btn-secondary"
          style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
        >
          Événement terminé
        </button>
      );
    }

    // Si l'événement est annulé
    if (status === 'cancelled') {
      return (
        <button
          disabled
          className="admin-btn admin-btn-secondary"
          style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
        >
          Événement annulé
        </button>
      );
    }

    // Si l'événement est en brouillon (pas encore publié)
    if (status === 'draft') {
      return (
        <button
          onClick={handlePublish}
          className="admin-btn admin-btn-success"
          style={{ width: '100%' }}
        >
          <FaCheckCircle />
          Publier l'événement
        </button>
      );
    }

    // Si l'événement est publié, afficher le statut sold out ou disponible
    const availableSeats = event.available_seats || 0;
    const capacity = event.capacity || 0;
    const isSoldOut = availableSeats === 0 && capacity > 0;

    if (isSoldOut) {
      return (
        <button
          disabled
          className="admin-btn admin-btn-secondary"
          style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
        >
          Sold out
        </button>
      );
    }

    // L'organisateur peut voir l'événement mais il est déjà publié
    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <button
          disabled
          className="admin-btn admin-btn-secondary"
          style={{ width: '100%', opacity: 0.85, cursor: 'not-allowed' }}
        >
          <FaCheckCircle className="inline mr-2" />
          Événement publié
        </button>
        <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--admin-text-muted)', margin: 0 }}>
          Places illimitées
        </p>
      </div>
    );
  };

  const getStatusBadge = () => {
    if (!event) return null;

    const status = event.status?.toLowerCase();

    if (status === 'published') {
      return <span className="admin-badge admin-badge-published">Publié</span>;
    }
    if (status === 'draft') {
      return <span className="admin-badge admin-badge-draft">Brouillon</span>;
    }
    if (status === 'cancelled') {
      return <span className="admin-badge admin-badge-cancelled">Annulé</span>;
    }
    if (status === 'completed') {
      return <span className="admin-badge admin-badge-completed">Terminé</span>;
    }

    return null;
  };

  const getFreeBadge = () => {
    if (!event) return null;

    if (event.is_free) {
      return <span className="admin-badge admin-badge-published">Gratuit</span>;
    }

    return null;
  };

  if (loading) {
    return (
      <LayoutAdmin>
        <div className="admin-loading">
          <div className="admin-spinner"></div>
        </div>
      </LayoutAdmin>
    );
  }

  if (!event) {
    return (
      <LayoutAdmin>
        <div className="admin-empty-state">
          <div className="admin-empty-state-icon">
            <FaCalendarAlt />
          </div>
          <h3>Événement non trouvé</h3>
          <p>L’événement demandé est introuvable.</p>
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin>
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <button
              onClick={() => navigate('/admin/events')}
              className="admin-btn admin-btn-secondary"
              style={{ padding: '0.6rem 1rem', marginBottom: '1rem' }}
            >
              <FaArrowLeft />
              Retour à mes événements
            </button>
            <h1 className="admin-page-title">{event.title}</h1>
            <p className="admin-page-subtitle">Détails, statut et gestion des participants</p>
          </div>

          <div className="admin-page-actions">
            <button
              onClick={() => navigate(`/admin/events/${event.id}/edit`)}
              className="admin-btn admin-btn-primary"
            >
              <FaEdit />
              Modifier
            </button>

            <button
              onClick={() => navigate(`/admin/scan-qr?eventId=${event.id}`)}
              className="admin-btn admin-btn-secondary"
            >
              <FaQrcode />
              Scanner billets
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card admin-detail-hero">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="admin-detail-cover"
          />
        ) : (
          <div className="admin-detail-cover admin-detail-cover-placeholder">
            <FaCalendarAlt />
          </div>
        )}
        <div className="admin-card-body">
          <div className="admin-detail-title-row">
            <div className="admin-detail-badges">
              {getStatusBadge()}
              {getFreeBadge()}
            </div>

            <div className="admin-detail-actions">
              <button onClick={handleShare} className="admin-btn admin-btn-secondary admin-btn-icon" title="Partager">
                <FaShare />
              </button>
              <button
                onClick={handleTogglePinned}
                className="admin-btn admin-btn-secondary admin-btn-icon"
                title={isPinned ? 'Épinglé' : 'Épingler'}
                style={isPinned ? { background: 'rgba(124, 58, 237, 0.12)', borderColor: 'rgba(124, 58, 237, 0.35)' } : undefined}
              >
                <FaBookmark />
              </button>
              <button
                onClick={handleToggleLiked}
                className="admin-btn admin-btn-secondary admin-btn-icon"
                title={isLiked ? 'Dans les favoris' : 'Ajouter aux favoris'}
                style={isLiked ? { background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)' } : undefined}
              >
                <FaHeart />
              </button>
            </div>
          </div>

          <div style={{ color: 'var(--admin-text-muted)', lineHeight: 1.7 }}>
            {event.description}
          </div>
        </div>
      </div>

      <div className="admin-detail-grid">
        {/* Colonne principale */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Date et heure */}
          <div className="admin-card">
            <div className="admin-card-body">
              <div className="admin-detail-kpis">
                <div className="admin-detail-kpi">
                  <div className="admin-detail-kpi-icon">
                    <FaCalendarAlt />
                  </div>
                  <div>
                    <div className="admin-detail-kpi-label">Date et heure</div>
                    <div className="admin-detail-kpi-value">
                      {formatDate(event.start_date)} à {formatTime(event.start_date)}
                    </div>
                    {event.end_date && (
                      <div className="admin-detail-kpi-sub">
                        <FaClock /> Fin: {formatDate(event.end_date)} à {formatTime(event.end_date)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-detail-kpi">
                  <div className="admin-detail-kpi-icon">
                    <FaTicketAlt />
                  </div>
                  <div>
                    <div className="admin-detail-kpi-label">Tarif</div>
                    <div className="admin-detail-kpi-value">
                      {event.is_free ? 'Gratuit' : formatCurrency(event.price, event.currency)}
                    </div>
                  </div>
                </div>

                <div className="admin-detail-kpi">
                  <div className="admin-detail-kpi-icon">
                    <FaUsers />
                  </div>
                  <div>
                    <div className="admin-detail-kpi-label">Inscriptions</div>
                    <div className="admin-detail-kpi-value">{registrations.length} inscrits</div>
                  </div>
                </div>

                <div className="admin-detail-kpi">
                  <div className="admin-detail-kpi-icon">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <div className="admin-detail-kpi-label">Localisation</div>
                    <div className="admin-detail-kpi-value">
                      {event.event_format === 'virtual' ? 'Événement virtuel' : event.location || 'En ligne'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Description</h2>
            </div>
            <div className="admin-card-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--admin-text)' }}>
              {event.full_description || event.description}
            </div>
          </div>

          {/* Organisateur */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Organisateur</h2>
            </div>
            <div className="admin-card-body">
              <div className="admin-detail-organizer">
                <div className="admin-detail-organizer-avatar">
                  {event.organizer?.first_name?.[0]}{event.organizer?.last_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--admin-text)' }}>
                    {event.organizer?.first_name} {event.organizer?.last_name}
                  </div>
                  <div style={{ color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <FaEnvelope /> {event.organizer?.email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des participants */}
          {registrations.length > 0 && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Participants ({registrations.length})</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={exportToCSV} className="admin-btn admin-btn-secondary" style={{ padding: '0.6rem 1rem' }}>
                    <FaFileDownload /> Export CSV
                  </button>
                  <button onClick={exportToExcel} className="admin-btn admin-btn-secondary" style={{ padding: '0.6rem 1rem' }}>
                    <FaFileExport /> Export Excel
                  </button>
                </div>
              </div>

              <div className="admin-card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                {registrations.slice(0, 6).map((reg, index) => (
                  <div key={index} className="admin-event-item" style={{ cursor: 'default' }}>
                    <div className="admin-event-placeholder" style={{ width: 44, height: 44, fontSize: '0.95rem' }}>
                      {reg.user?.first_name?.[0] || reg.guest_name?.[0] || 'I'}
                    </div>
                    <div className="admin-event-info">
                      <div className="admin-event-title" style={{ marginBottom: 4 }}>
                        {reg.user ? `${reg.user.first_name} ${reg.user.last_name}` : reg.guest_name || 'Invité'}
                      </div>
                      <div className="admin-event-meta" style={{ marginBottom: 0 }}>
                        <span className="admin-event-meta-item">{reg.user?.email || reg.guest_email || ''}</span>
                        <span className="admin-event-meta-item">{reg.ticket?.name || 'Par défaut'}</span>
                        <span className="admin-event-meta-item">{formatCurrency(reg.amount_paid || 0, reg.currency || event.currency || 'USD')}</span>
                      </div>
                    </div>
                    <span className="admin-badge admin-badge-published">Confirmé</span>
                  </div>
                ))}

                {registrations.length > 6 && (
                  <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
                    + {registrations.length - 6} autres participants
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Inscription/Statut */}
          <div className="admin-card admin-detail-sticky">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Statut & Actions</h3>
            </div>
            <div className="admin-card-body">
              <div style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem' }}>
                {event.is_free ? 'Inscription gratuite' : 'Événement payant'} • Places illimitées
              </div>
            {getStatusButton()}

            {event.status?.toLowerCase() === 'published' && (
              <button
                onClick={handleCancel}
                className="admin-btn admin-btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem', border: '2px solid var(--admin-danger)', color: 'var(--admin-danger)' }}
              >
                <FaBan />
                Annuler l'événement
              </button>
            )}
            </div>
          </div>

          {/* Localisation */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Localisation</h3>
            </div>
            <div className="admin-card-body" style={{ color: 'var(--admin-text-muted)' }}>
              <div style={{ color: 'var(--admin-text)', fontWeight: 700, marginBottom: '0.75rem' }}>
                {event.event_format === 'virtual' ? 'Événement virtuel' : event.location || 'En ligne'}
              </div>

            {event.event_format === 'virtual' && event.virtual_meeting_url && (
              <a
                href={event.virtual_meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <FaMapMarkerAlt />
                Rejoindre en ligne
              </a>
            )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Actions</h3>
            </div>
            <div className="admin-card-body">
              <button
                onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                className="admin-btn admin-btn-secondary"
                style={{ width: '100%' }}
              >
                <FaEdit /> Modifier l'événement
              </button>
            </div>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default EventDetails;
