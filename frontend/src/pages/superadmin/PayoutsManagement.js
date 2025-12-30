/**
 * ================================================
 * PAGE : GESTION DES PAYOUTS (SUPERADMIN)
 * ================================================
 *
 * Cette page permet au SuperAdmin de :
 * - Voir toutes les demandes de payout des organisateurs
 * - Approuver ou rejeter les demandes
 * - Voir l'historique complet
 * - Filtrer par statut
 *
 * Design ultra premium avec animations et dégradés
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFilter,
  FaEye,
  FaCheck,
  FaTimes,
  FaStickyNote,
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaExclamationTriangle
} from 'react-icons/fa';

// Composants
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import '../../styles/superadmin.css';

// API
import { getAllPayouts, processPayout } from '../../api/payouts';

function PayoutsManagement() {
  const navigate = useNavigate();

  // État
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(''); // '', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'

  // Modal de détails
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);

  // Modal d'action (Approuver/Rejeter)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'APPROVED', 'REJECTED', 'COMPLETED'
  const [adminNotes, setAdminNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState(false);

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  /**
   * Charger les payouts
   */
  useEffect(() => {
    loadPayouts();
  }, [statusFilter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      // Convertir le statut en minuscules pour correspondre au backend
      const statusParam = statusFilter ? statusFilter.toLowerCase() : null;
      const data = await getAllPayouts(statusParam);
      setPayouts(data);
      calculateStats(data);
    } catch (error) {
      console.error('❌ Erreur chargement payouts:', error);
      toast.error('Impossible de charger les payouts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculer les statistiques
   */
  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(p => p.status === 'pending').length,
      approved: data.filter(p => p.status === 'approved').length,
      rejected: data.filter(p => p.status === 'rejected').length,
      completed: data.filter(p => p.status === 'completed').length,
      totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: data.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
    };
    setStats(stats);
  };

  /**
   * Ouvrir la modal de détails
   */
  const handleViewDetails = (payout) => {
    setSelectedPayout(payout);
    setIsDetailsModalOpen(true);
  };

  /**
   * Ouvrir la modal d'action (Approuver/Rejeter)
   */
  const handleOpenAction = (payout, type) => {
    setSelectedPayout(payout);
    setActionType(type);
    setAdminNotes('');
    setConfirmAction(false);
    setIsActionModalOpen(true);
  };

  /**
   * Traiter l'action (Approuver/Rejeter)
   */
  const handleProcessAction = async () => {
    if (!selectedPayout) return;

    if (!confirmAction) {
      toast.error('Veuillez confirmer l\'action avant de continuer');
      return;
    }

    if (actionType === 'REJECTED' && !String(adminNotes || '').trim()) {
      toast.error('Veuillez indiquer une note (raison) pour le rejet');
      return;
    }

    try {
      await processPayout(selectedPayout.id, {
        status: actionType.toLowerCase(), // Convertir en minuscules pour le backend
        admin_notes: adminNotes || null
      });

      toast.success(
        actionType === 'APPROVED'
          ? '✅ Demande approuvée avec succès'
          : actionType === 'COMPLETED'
            ? '✅ Payout marqué comme complété'
            : '❌ Demande rejetée'
      );

      setIsActionModalOpen(false);
      setConfirmAction(false);
      loadPayouts();
    } catch (error) {
      console.error('❌ Erreur traitement payout:', error);
      toast.error('Erreur lors du traitement');
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
   * Formater un montant
   */
  const formatAmount = (amount, currency = 'USD') => {
    const code = String(currency || 'USD').toUpperCase() === 'XOF' ? 'USD' : (currency || 'USD');
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${code}`;
  };

  /**
   * Obtenir le badge de statut
   */
  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: FaClock, text: 'En attente' },
      approved: { color: 'bg-green-100 text-green-800 border-green-300', icon: FaCheckCircle, text: 'Approuvé' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-300', icon: FaTimesCircle, text: 'Rejeté' },
      completed: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: FaCheckCircle, text: 'Complété' },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: FaTimes, text: 'Annulé' },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: FaClock, text: 'En traitement' },
      failed: { color: 'bg-red-100 text-red-800 border-red-300', icon: FaTimesCircle, text: 'Échoué' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${badge.color} font-bold text-sm`}>
        <Icon />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="sa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-loading">
          <div className="sa-spinner"></div>
          <span className="sa-loading-text">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">
      {/* HEADER */}
      <header className="sa-header" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)' }}>
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
                <h1 className="sa-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FaMoneyBillWave />
                  Gestion des Payouts
                </h1>
                <p className="sa-header-subtitle">Gérer les demandes de paiement des organisateurs</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="sa-container" style={{ padding: '2rem 1.5rem' }}>
        {/* STATISTIQUES */}
        <div className="sa-stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="sa-stat-card">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaMoneyBillWave /></div>
            </div>
            <p className="sa-stat-label">Total Demandes</p>
            <p className="sa-stat-value">{stats.total}</p>
          </div>

          <div className="sa-stat-card gradient-orange">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaClock /></div>
            </div>
            <p className="sa-stat-label">En Attente</p>
            <p className="sa-stat-value">{stats.pending}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.25rem' }}>{formatAmount(stats.pendingAmount)}</p>
          </div>

          <div className="sa-stat-card gradient-green">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaCheckCircle /></div>
            </div>
            <p className="sa-stat-label">Approuvés</p>
            <p className="sa-stat-value">{stats.approved}</p>
          </div>

          <div className="sa-stat-card gradient-pink">
            <div className="sa-stat-header">
              <div className="sa-stat-icon"><FaTimesCircle /></div>
            </div>
            <p className="sa-stat-label">Rejetés</p>
            <p className="sa-stat-value">{stats.rejected}</p>
          </div>
        </div>

        {/* FILTRES */}
        <div className="sa-filters" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <FaFilter style={{ fontSize: '1.25rem', color: '#94a3b8' }} />
            {[
              { value: '', label: 'Tous', gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
              { value: 'PENDING', label: 'En attente', gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' },
              { value: 'APPROVED', label: 'Approuvés', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
              { value: 'REJECTED', label: 'Rejetés', gradient: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)' },
              { value: 'COMPLETED', label: 'Complétés', gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: statusFilter === filter.value ? filter.gradient : '#f1f5f9',
                  color: statusFilter === filter.value ? 'white' : '#64748b',
                  boxShadow: statusFilter === filter.value ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLEAU DES PAYOUTS */}
        <div className="sa-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Organisateur</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Statut</th>
                  <th>Date demande</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="sa-empty">
                        <div className="sa-empty-icon"><FaMoneyBillWave /></div>
                        <h3 className="sa-empty-title">Aucune demande de payout</h3>
                        <p className="sa-empty-text">
                          {statusFilter ? 'Aucun résultat pour ce filtre' : 'Les demandes apparaîtront ici'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{payout.organizer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{payout.organizer_email}</div>
                      </td>

                      <td>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                          {formatAmount(payout.amount, payout.currency)}
                        </span>
                      </td>

                      <td style={{ fontWeight: 500 }}>{payout.payout_method}</td>

                      <td>{getStatusBadge(payout.status)}</td>

                      <td style={{ color: '#64748b' }}>{formatDate(payout.requested_at)}</td>

                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleViewDetails(payout)}
                            className="sa-btn-icon blue"
                            title="Voir détails"
                          >
                            <FaEye />
                          </button>

                          {payout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleOpenAction(payout, 'APPROVED')}
                                className="sa-btn-icon green"
                                title="Approuver"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => handleOpenAction(payout, 'REJECTED')}
                                className="sa-btn-icon red"
                                title="Rejeter"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}

                          {payout.status === 'approved' && (
                            <button
                              onClick={() => handleOpenAction(payout, 'COMPLETED')}
                              className="sa-btn-icon"
                              title="Marquer comme complété"
                              style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DÉTAILS */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="💰 Détails du Payout"
        size="large"
      >
        {selectedPayout && (
          <div className="space-y-6">
            {/* Statut */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Statut actuel</h3>
              {getStatusBadge(selectedPayout.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations organisateur */}
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <FaUser />
                  Organisateur
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-blue-800">
                    <strong>Nom:</strong> {selectedPayout.organizer_name}
                  </p>
                  <p className="text-blue-800">
                    <strong>Email:</strong> {selectedPayout.organizer_email}
                  </p>
                  <p className="text-blue-800">
                    <strong>ID:</strong> #{selectedPayout.organizer_id}
                  </p>
                </div>
              </div>

              {/* Informations paiement */}
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <FaMoneyBillWave />
                  Paiement
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-green-800">
                    <strong>Montant:</strong> {formatAmount(selectedPayout.amount, selectedPayout.currency)}
                  </p>
                  <p className="text-green-800">
                    <strong>Méthode:</strong> {selectedPayout.payout_method}
                  </p>
                  <p className="text-green-800">
                    <strong>Devise:</strong> {selectedPayout.currency}
                  </p>
                </div>
              </div>
            </div>

            {/* Détails du compte */}
            {selectedPayout.account_details && (
              <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <FaExclamationTriangle />
                  Détails du compte (Confidentiel)
                </h4>
                <p className="text-sm text-yellow-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-yellow-300">
                  {selectedPayout.account_details}
                </p>
              </div>
            )}

            {/* Message organisateur */}
            {selectedPayout.organizer_message && (
              <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <FaEnvelope />
                  Message de l'organisateur
                </h4>
                <p className="text-sm text-purple-800 whitespace-pre-wrap">
                  {selectedPayout.organizer_message}
                </p>
              </div>
            )}

            {/* Notes admin */}
            {selectedPayout.admin_notes && (
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <FaStickyNote />
                  Notes admin
                </h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedPayout.admin_notes}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FaCalendar />
                Historique
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <strong>Demandé le:</strong> {formatDate(selectedPayout.requested_at)}
                </p>
                {selectedPayout.approved_at && (
                  <p className="text-green-700">
                    <strong>Approuvé le:</strong> {formatDate(selectedPayout.approved_at)}
                  </p>
                )}
                {selectedPayout.rejected_at && (
                  <p className="text-red-700">
                    <strong>Rejeté le:</strong> {formatDate(selectedPayout.rejected_at)}
                  </p>
                )}
                {selectedPayout.completed_at && (
                  <p className="text-blue-700">
                    <strong>Complété le:</strong> {formatDate(selectedPayout.completed_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL ACTION (Approuver/Rejeter) */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setConfirmAction(false);
        }}
        title={
          actionType === 'APPROVED'
            ? '✅ Approuver la demande'
            : actionType === 'COMPLETED'
              ? '✅ Marquer comme complété'
              : '❌ Rejeter la demande'
        }
        size="medium"
      >
        {selectedPayout && (
          <div className="space-y-4">
            {/* Récapitulatif */}
            <div className={`rounded-xl p-4 border-2 ${
              (actionType === 'APPROVED' || actionType === 'COMPLETED')
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-bold mb-2 ${
                (actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-900' : 'text-red-900'
              }`}>
                Récapitulatif
              </h4>
              <div className="space-y-1 text-sm">
                <p className={(actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-800' : 'text-red-800'}>
                  <strong>Organisateur:</strong> {selectedPayout.organizer_name}
                </p>
                <p className={(actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-800' : 'text-red-800'}>
                  <strong>Email:</strong> {selectedPayout.organizer_email}
                </p>
                <p className={(actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-800' : 'text-red-800'}>
                  <strong>Montant:</strong> {formatAmount(selectedPayout.amount, selectedPayout.currency)}
                </p>
                <p className={(actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-800' : 'text-red-800'}>
                  <strong>Méthode:</strong> {selectedPayout.payout_method}
                </p>
                <p className={(actionType === 'APPROVED' || actionType === 'COMPLETED') ? 'text-green-800' : 'text-red-800'}>
                  <strong>Demandé le:</strong> {formatDate(selectedPayout.requested_at)}
                </p>
              </div>
            </div>

            {/* Notes admin */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Notes administratives {actionType === 'REJECTED' ? '(obligatoire)' : '(optionnel)'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                placeholder={
                  actionType === 'APPROVED'
                    ? "Ex: Approuvé après vérification du compte bancaire"
                    : "Ex: Informations bancaires incorrectes"
                }
              />
              {actionType === 'REJECTED' && !String(adminNotes || '').trim() && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 700 }}>
                  Veuillez renseigner une raison de rejet.
                </div>
              )}
            </div>

            <label
              className={`flex items-start gap-3 rounded-xl p-4 border-2 cursor-pointer ${
                (actionType === 'APPROVED' || actionType === 'COMPLETED')
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <input
                type="checkbox"
                checked={confirmAction}
                onChange={(e) => setConfirmAction(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <div style={{ fontSize: '0.92rem', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 800, color: (actionType === 'APPROVED' || actionType === 'COMPLETED') ? '#065f46' : '#991b1b' }}>
                  Je confirme {
                    actionType === 'APPROVED'
                      ? "l'approbation"
                      : actionType === 'COMPLETED'
                        ? 'la complétion'
                        : 'le rejet'
                  } de cette demande.
                </div>
                <div style={{ color: (actionType === 'APPROVED' || actionType === 'COMPLETED') ? '#047857' : '#b91c1c', opacity: 0.9 }}>
                  {actionType === 'COMPLETED'
                    ? 'Vous confirmez que le paiement a été effectué et que le retrait est terminé.'
                    : 'Action irréversible.'}
                </div>
              </div>
            </label>

            {/* Avertissement */}
            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
              <p className="text-sm text-yellow-800">
                <FaExclamationTriangle className="inline mr-2" />
                <strong>Attention:</strong> Cette action est irréversible.
                {actionType === 'APPROVED' && ' Une fois approuvé, le payout devra être traité manuellement via Stripe.'}
                {actionType === 'COMPLETED' && ' Marquez comme complété uniquement après avoir envoyé l\'argent à l\'organisateur.'}
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="flex-1 px-6 py-3 rounded-xl transition-all font-extrabold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleProcessAction}
                disabled={!confirmAction || (actionType === 'REJECTED' && !String(adminNotes || '').trim())}
                className={`flex-1 px-6 py-3 rounded-xl transition-all font-extrabold text-white shadow-xl focus:outline-none focus:ring-4 ${
                  (actionType === 'APPROVED' || actionType === 'COMPLETED')
                    ? 'bg-green-700 hover:bg-green-800 focus:ring-green-200'
                    : 'bg-red-700 hover:bg-red-800 focus:ring-red-200'
                }`}
                style={(() => {
                  const disabled = (!confirmAction || (actionType === 'REJECTED' && !String(adminNotes || '').trim()));
                  if (!disabled) return undefined;
                  return {
                    background: '#cbd5e1',
                    color: '#475569',
                    boxShadow: 'none',
                    cursor: 'not-allowed'
                  };
                })()}
              >
                {actionType === 'APPROVED'
                  ? '✅ Confirmer l\'approbation'
                  : actionType === 'COMPLETED'
                    ? '✅ Marquer comme complété'
                    : '❌ Confirmer le rejet'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PayoutsManagement;
