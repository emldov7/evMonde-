/**
 * MyRegistrations - Page pour voir ses propres inscriptions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaTicketAlt,
  FaQrcode,
  FaArrowLeft,
  FaCheckCircle,
  FaClock as FaPending,
  FaTimesCircle
} from 'react-icons/fa';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import PublicNavbar from '../../components/PublicNavbar';
import '../../styles/components.css';

function MyRegistrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMyRegistrations();
  }, []);

  const fetchMyRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/registrations/my');
      console.log('🔍 Inscriptions reçues:', response.data.length);
      console.log('📋 Détails:', response.data);
      setRegistrations(response.data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      showError('Erreur lors du chargement de vos inscriptions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      confirmed: { icon: FaCheckCircle, badge: 'ev-badge-success', label: 'Confirmé' },
      pending: { icon: FaPending, badge: 'ev-badge-warning', label: 'En attente' },
      cancelled: { icon: FaTimesCircle, badge: 'ev-badge-danger', label: 'Annulé' }
    };

    const { icon: Icon, badge, label } = config[(status || '').toLowerCase()] || config.pending;

    return (
      <span className={`ev-badge ${badge}`}>
        <Icon /> {label}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <PublicNavbar />

      {/* Header */}
      <div className="ev-hero" style={{ padding: '3.25rem 0' }}>
        <div className="ev-hero-container">
          <button
            onClick={() => navigate('/events')}
            className="ev-btn ev-btn-secondary ev-btn-sm"
            style={{ marginBottom: '1rem' }}
          >
            <FaArrowLeft />
            Retour aux événements
          </button>
          <h1 className="ev-hero-title" style={{ marginBottom: '0.5rem' }}>Mes Inscriptions</h1>
          <p className="ev-hero-subtitle">Consultez vos inscriptions et vos billets</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="ev-events-container">
        {loading ? (
          <div className="ev-loader" style={{ padding: '5rem 0' }}>
            <div className="ev-loader-spinner lg"></div>
            <span className="ev-loader-text">Chargement de vos inscriptions...</span>
          </div>
        ) : registrations.filter(r => {
          const status = String(r.status || '').toLowerCase();
          const paid = Number(r.amount_paid || 0) > 0;
          // Ne pas afficher une inscription payante non payée (pending + 0)
          if (status === 'pending' && !paid) return false;
          return true;
        }).length === 0 ? (
          <div className="ev-empty">
            <div className="ev-empty-icon">
              <FaTicketAlt />
            </div>
            <h3 className="ev-empty-title">Aucune inscription pour le moment</h3>
            <p className="ev-empty-text">Parcourez les événements et réservez votre place en quelques clics.</p>
            <button
              onClick={() => navigate('/events')}
              className="ev-btn ev-btn-primary"
            >
              Découvrir les événements
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {registrations
              .filter(r => {
                const status = String(r.status || '').toLowerCase();
                const paid = Number(r.amount_paid || 0) > 0;
                if (status === 'pending' && !paid) return false;
                return true;
              })
              .map(reg => (
              <div key={reg.id} className="ev-card" style={{ overflow: 'hidden' }}>
                <div className="ev-reg-row">
                  {/* Image */}
                  <div className="ev-reg-image" style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.85) 0%, rgba(236, 72, 153, 0.85) 100%)' }}>
                    {reg.event?.image_url ? (
                      <img
                        src={reg.event.image_url}
                        alt={reg.event?.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCalendarAlt style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.65)' }} />
                      </div>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="ev-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          {reg.event?.title}
                        </h3>
                        <div style={{ marginTop: '0.5rem' }}>
                          {getStatusBadge(reg.status)}
                        </div>
                      </div>

                      <button
                        className="ev-btn ev-btn-secondary ev-btn-sm"
                        onClick={() => navigate(`/events/${reg.event?.id}`)}
                        disabled={!reg.event?.id}
                      >
                        Voir l’événement
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                      <div className="ev-badge ev-badge-gray">
                        <FaClock /> {formatDate(reg.event?.start_date)}
                      </div>

                      <div className="ev-badge ev-badge-gray">
                        <FaMapMarkerAlt />
                        {reg.event?.event_format === 'virtual'
                          ? 'En ligne'
                          : reg.event?.location || 'Lieu à confirmer'}
                      </div>

                      {reg.ticket && (
                        <div className="ev-badge ev-badge-info">
                          <FaTicketAlt /> {reg.ticket.name}
                        </div>
                      )}

                      <div className="ev-badge ev-badge-primary">
                        {reg.amount_paid > 0
                          ? new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: reg.currency || 'USD',
                            minimumFractionDigits: 0
                          }).format(reg.amount_paid)
                          : 'Gratuit'}
                      </div>
                    </div>

                    {/* QR Code */}
                    {((reg.status || '').toLowerCase() === 'confirmed') && reg.qr_code_url && (
                      <div style={{ marginTop: '1rem' }} className="ev-card" >
                        <div className="ev-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="ev-badge ev-badge-primary" style={{ borderRadius: 14 }}>
                              <FaQrcode /> Billet
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>Votre billet électronique</div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Présentez ce QR code à l'entrée</div>
                            </div>
                          </div>
                          <a
                            href={reg.qr_code_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ev-btn ev-btn-primary ev-btn-sm"
                          >
                            Voir le QR Code
                          </a>
                        </div>
                      </div>
                    )}

                    {((reg.status || '').toLowerCase() === 'pending') && (
                      <div style={{ marginTop: '1rem' }} className="ev-card">
                        <div className="ev-card-body">
                          <div className="ev-badge ev-badge-warning">
                            <FaPending /> Paiement en attente
                          </div>
                          <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                            Vérifiez votre email pour finaliser votre inscription.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyRegistrations;
