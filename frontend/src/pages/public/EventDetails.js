/**
 * EventDetails - Page publique de détails d'un événement avec inscription
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaUsers,
  FaTicketAlt,
  FaArrowLeft,
  FaVideo,
  FaMapPin,
  FaEnvelope,
  FaPhone,
  FaUser
} from 'react-icons/fa';
import api from '../../api/api';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import PublicNavbar from '../../components/PublicNavbar';
import '../../styles/components.css';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);

  const [timeTick, setTimeTick] = useState(0);

  // Formulaire d'inscription invité
  const [guestData, setGuestData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    country_code: 'TG',
    phone_country_code: '+228',
    phone: ''
  });

  useEffect(() => {
    fetchEvent();
    checkAuth();
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setTimeTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAlreadyRegistered(false);
      setPendingRegistration(null);
      return;
    }

    const check = async () => {
      try {
        const res = await api.get('/api/v1/registrations/my');
        const regs = Array.isArray(res.data) ? res.data : [];
        const reg = regs.find((r) => String(r.event_id) === String(id));
        const status = String(reg?.status || '').toLowerCase();
        setAlreadyRegistered(status === 'confirmed');
        setPendingRegistration(status === 'pending' ? reg : null);
      } catch (e) {
        setAlreadyRegistered(false);
        setPendingRegistration(null);
      }
    };

    check();
  }, [id, isAuthenticated]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/marketplace/events/${id}`);
      setEvent(response.data);

      // Sélectionner automatiquement le premier ticket si disponible
      if (response.data.tickets && response.data.tickets.length > 0) {
        setSelectedTicket(response.data.tickets[0]);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      showError('Événement introuvable');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  };

  const handleRegister = async () => {
    const hasTickets = Array.isArray(event?.tickets) && event.tickets.length > 0;
    if (hasTickets && !selectedTicket) {
      showError('Veuillez sélectionner un type de billet');
      return;
    }

    if (isAuthenticated) {
      // Inscription utilisateur connecté
      await registerAuthenticatedUser();
    } else {
      // Afficher le formulaire d'inscription invité
      setShowRegistrationForm(true);
    }
  };

  const registerAuthenticatedUser = async () => {
    const toastId = showLoading('Inscription en cours...');

    try {
      if (event.is_free) {
        // Événement gratuit
        const payload = {};
        if (selectedTicket?.id) payload.ticket_id = selectedTicket.id;
        const response = await api.post(`/api/v1/registrations/events/${id}/register`, payload);

        updateToSuccess(toastId, 'Inscription confirmée ! Consultez votre email.');

        // Afficher le QR code
        if (response.data.qr_code_url) {
          showSuccess(`QR Code généré : ${response.data.qr_code_url}`);
        }

        // Rediriger vers la page "Mes inscriptions"
        setTimeout(() => {
          navigate('/mes-inscriptions');
        }, 2000);
      } else {
        // Événement payant - Redirection Stripe
        if (!selectedTicket?.id) {
          updateToError(toastId, 'Veuillez sélectionner un type de billet');
          return;
        }

        const response = await api.post(`/api/v1/registrations/events/${id}/register/payment`, {
          ticket_id: selectedTicket.id
        });

        updateToSuccess(toastId, 'Redirection vers le paiement...');

        // Rediriger vers Stripe
        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error('Error registering:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de l\'inscription');
    }
  };

  const continuePayment = async () => {
    if (!isAuthenticated) {
      showError('Veuillez vous connecter pour continuer le paiement');
      navigate('/login');
      return;
    }

    const ticketId = pendingRegistration?.ticket_id || selectedTicket?.id;
    if (!ticketId) {
      showError('Impossible de reprendre le paiement (billet manquant)');
      return;
    }

    const toastId = showLoading('Redirection vers le paiement...');
    try {
      const response = await api.post(`/api/v1/registrations/events/${id}/register/payment`, {
        ticket_id: ticketId
      });

      updateToSuccess(toastId, 'Redirection vers le paiement...');
      window.location.href = response.data.payment_url;
    } catch (error) {
      console.error('Error continuing payment:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de la reprise du paiement');
    }
  };

  const registerGuest = async () => {
    // Validation
    if (!guestData.first_name || !guestData.last_name || !guestData.email) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const toastId = showLoading('Inscription en cours...');

    try {
      if (event.is_free) {
        // Événement gratuit
        const payload = { ...guestData };
        if (selectedTicket?.id) payload.ticket_id = selectedTicket.id;
        const response = await api.post(`/api/v1/registrations/events/${id}/register/guest`, payload);

        updateToSuccess(toastId, 'Inscription confirmée ! Consultez votre email.');

        // Afficher le QR code
        if (response.data.qr_code_url) {
          showSuccess('Un email avec votre QR code vous a été envoyé !');
        }

        // Réinitialiser le formulaire
        setGuestData({
          first_name: '',
          last_name: '',
          email: '',
          country_code: 'TG',
          phone_country_code: '+228',
          phone: ''
        });
        setShowRegistrationForm(false);
      } else {
        // Événement payant - Redirection Stripe
        if (!selectedTicket?.id) {
          updateToError(toastId, 'Veuillez sélectionner un type de billet');
          return;
        }

        const response = await api.post(`/api/v1/registrations/events/${id}/register/guest/payment`, {
          ...guestData,
          ticket_id: selectedTicket.id
        });

        updateToSuccess(toastId, 'Redirection vers le paiement...');

        // Rediriger vers Stripe
        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error('Error registering guest:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de l\'inscription');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Gratuit';
    const currencyToUse = currency || event?.currency || 'USD';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyToUse,
      minimumFractionDigits: 0
    }).format(price);
  };

  const eventHasStarted = (() => {
    void timeTick;
    const start = event?.start_date ? new Date(event.start_date) : null;
    if (!start || Number.isNaN(start.getTime())) return false;
    return start.getTime() <= Date.now();
  })();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <PublicNavbar />
        <div className="ev-loader" style={{ padding: '6rem 0' }}>
          <div className="ev-loader-spinner lg"></div>
          <span className="ev-loader-text">Chargement de l’événement...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <PublicNavbar />

      {/* Header avec image */}
      <div className="ev-detail-hero">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="ev-detail-hero-image"
          />
        ) : (
          <div className="ev-detail-hero-placeholder">
            <FaCalendarAlt />
          </div>
        )}
        <div className="ev-detail-hero-overlay"></div>

        <div className="ev-events-container" style={{ paddingBottom: 0 }}>
          <button
            onClick={() => navigate('/events')}
            className="ev-btn ev-btn-secondary ev-btn-sm"
            style={{ position: 'relative', zIndex: 2 }}
          >
            <FaArrowLeft />
            Retour aux événements
          </button>
        </div>
      </div>

      <div className="ev-events-container" style={{ paddingTop: 0 }}>
        <div className="ev-detail-grid">
          {/* Colonne gauche - Détails */}
          <div className="ev-detail-main">
            {/* Carte principale */}
            <div className="ev-card">
              <div className="ev-card-body">
                <h1 className="ev-detail-title">{event.title}</h1>

                {/* Badges */}
                <div className="ev-detail-badges">
                  <span className={`ev-badge ${event.is_free ? 'ev-badge-success' : 'ev-badge-info'}`}>
                    {event.is_free ? 'GRATUIT' : formatPrice(event.price, event.currency)}
                  </span>

                  {event.category && (
                    <span className="ev-badge ev-badge-primary">{event.category.name}</span>
                  )}
                </div>

                {/* Informations clés */}
                <div className="ev-detail-kpis">
                  <div className="ev-detail-kpi">
                    <div className="ev-detail-kpi-icon">
                      <FaClock />
                    </div>
                    <div>
                      <div className="ev-detail-kpi-label">Date et heure</div>
                      <div className="ev-detail-kpi-value">{formatDate(event.start_date)}</div>
                    </div>
                  </div>

                  <div className="ev-detail-kpi">
                    <div className="ev-detail-kpi-icon">
                      {event.event_format === 'virtual' ? <FaVideo /> : <FaMapPin />}
                    </div>
                    <div>
                      <div className="ev-detail-kpi-label">{event.event_format === 'virtual' ? 'Format' : 'Lieu'}</div>
                      <div className="ev-detail-kpi-value">
                        {event.event_format === 'virtual'
                          ? 'Événement en ligne'
                          : event.location || 'Lieu à confirmer'}
                      </div>
                      {event.address && (
                        <div className="ev-detail-kpi-sub">{event.address}</div>
                      )}
                    </div>
                  </div>

                  {event.available_seats !== null && (
                    <div className="ev-detail-kpi">
                      <div className="ev-detail-kpi-icon">
                        <FaUsers />
                      </div>
                      <div>
                        <div className="ev-detail-kpi-label">Places disponibles</div>
                        <div className="ev-detail-kpi-value">{event.available_seats} places</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginTop: '1.25rem' }}>
                  <h2 className="ev-detail-section-title">À propos de l'événement</h2>
                  <p className="ev-detail-description">
                    {event.full_description || event.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - Inscription */}
          <div className="ev-detail-sidebar">
            <div className="ev-card ev-detail-sticky">
              <div className="ev-card-body">
                <h3 className="ev-detail-sidebar-title">S'inscrire</h3>

              {/* Sélection du billet */}
              {event.tickets && event.tickets.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="ev-input-label" style={{ marginBottom: '0.5rem' }}>Type de billet</div>
                  <div className="ev-ticket-list">
                    {event.tickets.map(ticket => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`ev-ticket-option ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                      >
                        <div className="ev-ticket-option-row">
                          <div className="ev-ticket-option-left">
                            <div className="ev-ticket-option-title">{ticket.name}</div>
                            {ticket.description && (
                              <div className="ev-ticket-option-desc">{ticket.description}</div>
                            )}
                          </div>
                          <div className="ev-ticket-option-price">{formatPrice(ticket.price, ticket.currency)}</div>
                        </div>
                        <div className="ev-ticket-option-meta">
                          {ticket.quantity_available - (ticket.quantity_sold || 0)} places restantes
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulaire inscription invité */}
              {showRegistrationForm && !isAuthenticated && (
                <div className="ev-detail-guest-form">
                  <div style={{ fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.75rem' }}>Vos informations</div>

                  <div className="ev-input-group">
                    <div className="ev-input-label">
                      <FaUser /> Prénom <span className="required">*</span>
                    </div>
                    <div className="ev-input-wrapper">
                      <input
                        type="text"
                        value={guestData.first_name}
                        onChange={(e) => setGuestData({ ...guestData, first_name: e.target.value })}
                        className="ev-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="ev-input-group">
                    <div className="ev-input-label">
                      <FaUser /> Nom <span className="required">*</span>
                    </div>
                    <div className="ev-input-wrapper">
                      <input
                        type="text"
                        value={guestData.last_name}
                        onChange={(e) => setGuestData({ ...guestData, last_name: e.target.value })}
                        className="ev-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="ev-input-group">
                    <div className="ev-input-label">
                      <FaEnvelope /> Email <span className="required">*</span>
                    </div>
                    <div className="ev-input-wrapper">
                      <input
                        type="email"
                        value={guestData.email}
                        onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                        className="ev-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="ev-input-group">
                    <div className="ev-input-label">
                      <FaPhone /> Téléphone
                    </div>
                    <div className="ev-input-wrapper">
                      <input
                        type="tel"
                        value={guestData.phone}
                        onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                        className="ev-input"
                        placeholder="90123456"
                      />
                    </div>
                  </div>

                  <button onClick={registerGuest} className="ev-btn ev-btn-primary ev-btn-full">
                    Confirmer l'inscription
                  </button>

                  <button
                    onClick={() => setShowRegistrationForm(false)}
                    className="ev-btn ev-btn-secondary ev-btn-full"
                    style={{ marginTop: '0.75rem' }}
                  >
                    Annuler
                  </button>
                </div>
              )}

              {/* Bouton d'inscription */}
              {!showRegistrationForm && (
                <>
                  <button
                    onClick={handleRegister}
                    disabled={eventHasStarted || alreadyRegistered || ((Array.isArray(event?.tickets) && event.tickets.length > 0) && !selectedTicket) || (event.available_seats !== null && event.available_seats === 0)}
                    className="ev-btn ev-btn-primary ev-btn-full"
                  >
                    <FaTicketAlt />
                    {eventHasStarted ? 'Événement déjà débuté' : (alreadyRegistered ? 'Déjà inscrit' : (event.available_seats === 0 ? 'Complet' : 'S\'inscrire maintenant'))}
                  </button>

                  {eventHasStarted && (
                    <div style={{ marginTop: '0.75rem', color: '#b45309', fontWeight: 600, fontSize: '0.9rem' }}>
                      Événement déjà débuté. Les inscriptions sont fermées.
                    </div>
                  )}

                  {isAuthenticated && pendingRegistration && !alreadyRegistered && !eventHasStarted && !event?.is_free && (
                    <button
                      onClick={continuePayment}
                      className="ev-btn ev-btn-secondary ev-btn-full"
                      style={{ marginTop: '0.75rem' }}
                    >
                      <FaTicketAlt />
                      Continuer le paiement
                    </button>
                  )}

                  {!isAuthenticated && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Vous avez déjà un compte ?{' '}
                        <button
                          onClick={() => navigate('/login')}
                          className="ev-navbar-link"
                          style={{ display: 'inline-flex', padding: 0, background: 'transparent' }}
                        >
                          Se connecter
                        </button>
                      </p>
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetails;
