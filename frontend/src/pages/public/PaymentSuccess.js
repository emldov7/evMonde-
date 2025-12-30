/**
 * PaymentSuccess - Page de confirmation après paiement réussi
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaEnvelope, FaHome, FaTicketAlt } from 'react-icons/fa';
import PublicNavbar from '../../components/PublicNavbar';
import api from '../../api/api';
import { showError, showSuccess } from '../../utils/toast';

function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);

  const redirectSeconds = useMemo(() => 5, []);

  useEffect(() => {
    setSecondsLeft(redirectSeconds);
  }, [redirectSeconds]);

  useEffect(() => {
    if (!sessionId) return;

    const confirm = async () => {
      try {
        const res = await api.post('/api/v1/registrations/confirm-payment', {
          session_id: sessionId
        });

        if (res.data?.success) {
          if (res.data.email_sent) {
            showSuccess('Inscription confirmée. Email envoyé !');
          } else {
            showSuccess('Inscription confirmée.');
          }
        } else {
          showError(res.data?.message || 'Impossible de confirmer le paiement');
        }
      } catch (e) {
        showError(e.response?.data?.detail || 'Erreur lors de la confirmation du paiement');
      }
    };

    confirm();
  }, [sessionId]);

  useEffect(() => {
    if (!autoRedirect) return undefined;
    if (secondsLeft <= 0) {
      navigate('/mes-inscriptions');
      return undefined;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoRedirect, navigate, secondsLeft]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <PublicNavbar />

      <div style={{ padding: '3rem 1rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="ev-card" style={{ boxShadow: 'var(--shadow-xl)' }}>
            <div className="ev-card-body" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-xl)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}
                >
                  <FaCheckCircle />
                </div>
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>Paiement réussi</h1>
                    <span className="ev-badge ev-badge-success">Confirmé</span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-muted)' }}>
                    Ton inscription est confirmée. Tu peux maintenant récupérer ton billet et ton QR code.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }} className="ev-card" >
                <div className="ev-card-body" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ color: 'var(--color-info)', marginTop: 2 }}>
                      <FaEnvelope />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>Email envoyé</div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Un email de confirmation a été envoyé avec ton billet électronique et ton QR code.
                        Pense à vérifier les spams si tu ne le vois pas.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {sessionId && (
                <div style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  Session: <span style={{ fontFamily: 'monospace' }}>{sessionId}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <button
                  onClick={() => navigate('/mes-inscriptions')}
                  className="ev-btn ev-btn-primary"
                >
                  <FaTicketAlt />
                  Voir mes inscriptions
                </button>

                <button
                  onClick={() => navigate('/events')}
                  className="ev-btn ev-btn-secondary"
                >
                  <FaHome />
                  Retour aux événements
                </button>

                {autoRedirect ? (
                  <button
                    onClick={() => setAutoRedirect(false)}
                    className="ev-btn ev-btn-ghost"
                  >
                    Annuler la redirection
                  </button>
                ) : (
                  <button
                    onClick={() => setAutoRedirect(true)}
                    className="ev-btn ev-btn-ghost"
                  >
                    Réactiver la redirection
                  </button>
                )}
              </div>

              {autoRedirect && (
                <div style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Redirection automatique vers tes inscriptions dans <strong>{Math.max(0, secondsLeft)}s</strong>…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
