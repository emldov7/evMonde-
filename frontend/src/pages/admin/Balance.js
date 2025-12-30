/**
 * Balance - Page de gestion du solde et demandes de payout
 *
 * Permet à l'organisateur de:
 * - Voir son solde disponible et en attente
 * - Demander un retrait (payout)
 * - Suivre l'historique des payouts
 */

import { useState, useEffect } from 'react';
import {
  FaMoneyBillWave,
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaWallet,
  FaHistory
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import { formatCurrency as formatAmount } from '../../utils/formatCurrency';
import '../../styles/admin.css';

function Balance() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    available: 0,
    pending: 0,
    total_revenue: 0,
    currency: 'USD'
  });
  const [payouts, setPayouts] = useState([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    fetchBalanceData();
  }, []);

  const fetchBalanceData = async () => {
    try {
      setLoading(true);

      const balanceRes = await api.get('/api/v1/marketplace/my-balance');
      const b = balanceRes.data;

      setBalance({
        available: b.available_balance || 0,
        pending: b.pending_payouts || 0,
        total_revenue: b.total_revenue || 0,
        currency: b.currency || 'USD'
      });

      const payoutsRes = await api.get('/api/v1/marketplace/my-payouts');
      setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);

    } catch (error) {
      console.error('Error fetching balance:', error);
      showError('Erreur lors du chargement du solde');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      showError('Veuillez entrer un montant valide');
      return;
    }

    if (parseFloat(payoutAmount) > balance.available) {
      showError('Montant supérieur au solde disponible');
      return;
    }

    const toastId = showLoading('Demande de retrait en cours...');

    try {
      await api.post('/api/v1/marketplace/payouts/request', {
        amount: parseFloat(payoutAmount),
        payout_method: 'manual',
        account_details: null,
        message: null
      });

      updateToSuccess(toastId, 'Demande de retrait envoyée avec succès !');
      setShowPayoutForm(false);
      setPayoutAmount('');
      fetchBalanceData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      updateToError(toastId, 'Erreur lors de la demande de retrait');
    }
  };

  const formatCurrency = (amount) => formatAmount(amount, balance.currency || 'USD');

  const formatPayoutDate = (payout) => {
    const raw = payout?.requested_at || payout?.created_at || payout?.approved_at || payout?.completed_at || payout?.rejected_at;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('fr-FR');
  };

  const getPayoutStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: FaClock, label: 'En attente' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: FaCheckCircle, label: 'Approuvé' },
      COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FaCheckCircle, label: 'Complété' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: FaTimesCircle, label: 'Rejeté' }
    };

    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} flex items-center gap-1`}>
        <Icon className="text-xs" />
        {style.label}
      </span>
    );
  };

  return (
    <LayoutAdmin>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Mon Solde & Payouts</h1>
            <p className="admin-page-subtitle">Gérez vos revenus et demandes de retrait</p>
          </div>
          <div className="admin-page-actions">
            <button
              onClick={() => setShowPayoutForm(true)}
              className="admin-btn admin-btn-primary"
            >
              <FaWallet />
              Demander un retrait
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card green">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaMoneyBillWave />
            </div>
            <div className="admin-stat-card-badge">Disponible</div>
          </div>
          <p className="admin-stat-card-label">Solde Disponible</p>
          <p className="admin-stat-card-value">{formatCurrency(balance.available)}</p>
        </div>

        <div className="admin-stat-card orange">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaClock />
            </div>
            <div className="admin-stat-card-badge">En cours</div>
          </div>
          <p className="admin-stat-card-label">En Attente</p>
          <p className="admin-stat-card-value">{formatCurrency(balance.pending)}</p>
        </div>

        <div className="admin-stat-card purple">
          <div className="admin-stat-card-header">
            <div className="admin-stat-card-icon">
              <FaDollarSign />
            </div>
            <div className="admin-stat-card-badge">Total</div>
          </div>
          <p className="admin-stat-card-label">Revenus Totaux</p>
          <p className="admin-stat-card-value">{formatCurrency(balance.total_revenue)}</p>
        </div>
      </div>

      {/* Payout Form Modal */}
      {showPayoutForm && (
        <div className="admin-card" style={{ marginBottom: '2rem' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Demander un retrait</h3>
          </div>
          <div className="admin-card-body">
            <div className="ev-input-group">
              <label className="ev-input-label">Montant à retirer ({balance.currency || 'USD'})</label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                max={balance.available}
                className="ev-input"
                placeholder={`Maximum: ${formatCurrency(balance.available)}`}
              />
            </div>
            <div style={{ marginTop: '0.75rem', color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
              Devise de paiement: <strong>{balance.currency || 'USD'}</strong> (pas de conversion automatique)
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleRequestPayout}
                className="admin-btn admin-btn-primary"
                style={{ flex: 1 }}
              >
                <FaCheckCircle />
                Confirmer la demande
              </button>
              <button
                onClick={() => setShowPayoutForm(false)}
                className="admin-btn admin-btn-secondary"
                style={{ flex: 1 }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Commission */}
      <div className="admin-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)' }}>
        <div className="admin-card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FaInfoCircle style={{ color: '#3b82f6', fontSize: '1.25rem' }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.25rem' }}>Commission de la plateforme</p>
            <p style={{ fontSize: '0.9rem', color: '#3b82f6' }}>
              La plateforme prélève une commission de 15% sur chaque vente.
              Le montant disponible représente 85% de vos revenus totaux.
            </p>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <FaHistory style={{ marginRight: '0.5rem' }} />
            Historique des Retraits
          </h3>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
            </div>
          ) : payouts.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <FaMoneyBillWave />
              </div>
              <h3>Aucun retrait</h3>
              <p>Vous n'avez pas encore effectué de demande de retrait</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout, idx) => (
                    <tr key={idx}>
                      <td>{formatPayoutDate(payout)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(payout.amount)}</td>
                      <td>{getPayoutStatusBadge(String(payout.status || '').toUpperCase())}</td>
                      <td style={{ color: '#64748b' }}>{payout.admin_notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default Balance;
