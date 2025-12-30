/**
 * ================================================
 * PAGE : CONFIGURATION DES COMMISSIONS (SUPERADMIN)
 * ================================================
 *
 * Cette page permet au SuperAdmin de :
 * - Voir la configuration actuelle des commissions
 * - Modifier le taux de commission globale
 * - Définir un montant minimum de commission
 * - Activer/Désactiver le système de commission
 * - Ajouter des notes sur la stratégie
 *
 * Design ultra premium avec animations et dégradés
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaPercent,
  FaSave,
  FaHistory,
  FaToggleOn,
  FaToggleOff,
  FaInfoCircle,
  FaCoins,
  FaChartLine,
  FaEdit,
  FaTimes,
  FaCheck
} from 'react-icons/fa';

// Composants
import Loader from '../../components/common/Loader';
import '../../styles/superadmin.css';

// API
import { getCommissionSettings, updateCommissionSettings } from '../../api/commission';

function CommissionSettings() {
  const navigate = useNavigate();

  // État
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Configuration actuelle
  const [currentSettings, setCurrentSettings] = useState(null);

  // Formulaire d'édition
  const [formData, setFormData] = useState({
    default_commission_rate: 5.0,
    minimum_commission_amount: 0.0,
    is_active: true,
    notes: ''
  });

  /**
   * Charger la configuration
   */
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getCommissionSettings();
      setCurrentSettings(data);
      setFormData({
        default_commission_rate: data.default_commission_rate,
        minimum_commission_amount: data.minimum_commission_amount,
        is_active: data.is_active,
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('❌ Erreur chargement configuration:', error);
      toast.error('Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Annuler l'édition
   */
  const handleCancelEdit = () => {
    setFormData({
      default_commission_rate: currentSettings.default_commission_rate,
      minimum_commission_amount: currentSettings.minimum_commission_amount,
      is_active: currentSettings.is_active,
      notes: currentSettings.notes || ''
    });
    setIsEditing(false);
  };

  /**
   * Sauvegarder les modifications
   */
  const handleSave = async () => {
    // Validations
    if (formData.default_commission_rate < 0 || formData.default_commission_rate > 100) {
      toast.error('Le taux de commission doit être entre 0 et 100%');
      return;
    }

    if (formData.minimum_commission_amount < 0) {
      toast.error('Le montant minimum ne peut pas être négatif');
      return;
    }

    try {
      setSaving(true);
      const updatedSettings = await updateCommissionSettings(formData);
      setCurrentSettings(updatedSettings);
      setIsEditing(false);
      toast.success('✅ Configuration mise à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
      <header className="sa-header">
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
                  <FaPercent />
                  Configuration des Commissions
                </h1>
                <p className="sa-header-subtitle">Gérer le taux de commission de la plateforme</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="sa-container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
        {/* CARTE D'INFORMATION */}
        <div className="sa-card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)', border: '2px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
              <FaInfoCircle style={{ fontSize: '1.5rem', color: '#3b82f6' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
                Comment fonctionnent les commissions ?
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#1e3a8a', lineHeight: 1.6 }}>
                La plateforme prélève un <strong>pourcentage sur chaque vente de billet</strong>.
                Cette commission est automatiquement calculée lors de chaque paiement et déduite du montant
                que l'organisateur reçoit. Vous pouvez définir un <strong>taux global</strong> pour toute la plateforme
                et des <strong>taux personnalisés par catégorie</strong> d'événement.
              </p>
            </div>
          </div>
        </div>

        {/* CARTE PRINCIPALE DE CONFIGURATION */}
        <div className="sa-card" style={{ overflow: 'hidden' }}>
          {/* Header de la carte */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                  <FaCoins style={{ fontSize: '1.75rem', color: 'white' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>
                    Configuration Actuelle
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.25rem' }}>
                    Dernière mise à jour : {formatDate(currentSettings?.updated_at)}
                  </p>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="sa-btn"
                  style={{ background: 'white', color: '#8b5cf6' }}
                >
                  <FaEdit />
                  Modifier
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="sa-btn"
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                  >
                    <FaTimes />
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="sa-btn"
                    style={{ background: 'white', color: '#8b5cf6' }}
                  >
                    {saving ? 'Sauvegarde...' : <><FaCheck /> Enregistrer</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Corps de la carte */}
          <div className="p-8 space-y-8">
            {/* Statut du système */}
            <div>
              <label className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-gray-800">Statut du système de commission</span>
                {formData.is_active ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold border-2 border-green-300">
                    ✓ ACTIF
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold border-2 border-red-300">
                    ✗ INACTIF
                  </span>
                )}
              </label>

              {isEditing && (
                <button
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all ${
                    formData.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-300'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-300'
                  }`}
                >
                  {formData.is_active ? (
                    <>
                      <FaToggleOn className="text-3xl" />
                      <div className="text-left">
                        <p className="font-bold">Système activé</p>
                        <p className="text-sm font-normal">Les commissions sont prélevées sur chaque vente</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FaToggleOff className="text-3xl" />
                      <div className="text-left">
                        <p className="font-bold">Système désactivé</p>
                        <p className="text-sm font-normal">Aucune commission n'est prélevée</p>
                      </div>
                    </>
                  )}
                </button>
              )}

              {!isEditing && !formData.is_active && (
                <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200 mt-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Attention:</strong> Le système de commission est actuellement désactivé.
                    Aucune commission ne sera prélevée sur les ventes.
                  </p>
                </div>
              )}
            </div>

            {/* Grille des paramètres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Taux de commission */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                <label className="block text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <FaPercent className="text-purple-600" />
                  Taux de Commission Global (%)
                </label>

                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.default_commission_rate}
                      onChange={(e) => setFormData({ ...formData, default_commission_rate: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-4 text-3xl font-black text-purple-600 border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-purple-400">%</span>
                  </div>
                ) : (
                  <div className="text-5xl font-black text-purple-600 flex items-center gap-2">
                    {formData.default_commission_rate}
                    <span className="text-3xl">%</span>
                  </div>
                )}

                <p className="text-xs text-purple-700 mt-3">
                  Ce taux s'applique à tous les événements par défaut
                </p>
              </div>

              {/* Montant minimum */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
                <label className="block text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <FaCoins className="text-orange-600" />
                  Montant Minimum de Commission
                </label>

                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.minimum_commission_amount}
                      onChange={(e) => setFormData({ ...formData, minimum_commission_amount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-4 text-2xl font-black text-orange-600 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-orange-400">USD</span>
                  </div>
                ) : (
                  <div className="text-4xl font-black text-orange-600">
                    {new Intl.NumberFormat('fr-FR').format(formData.minimum_commission_amount)} USD
                  </div>
                )}

                <p className="text-xs text-orange-700 mt-3">
                  Commission minimale garantie, même pour les petits montants
                </p>
              </div>
            </div>

            {/* Notes stratégiques */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Notes Stratégiques
              </label>

              {isEditing ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Ajoutez des notes sur la stratégie de commission, les raisons des changements, etc."
                />
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 min-h-[120px]">
                  {formData.notes ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
                  ) : (
                    <p className="text-gray-400 italic">Aucune note ajoutée</p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Ces notes sont privées et visibles uniquement par les SuperAdmins
              </p>
            </div>
          </div>
        </div>

        {/* EXEMPLE DE CALCUL */}
        <div
          className="sa-card"
          style={{
            marginTop: '2rem',
            overflow: 'hidden',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.10) 0%, rgba(6, 182, 212, 0.10) 100%)'
          }}
        >
          <div
            style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaChartLine style={{ fontSize: '1.25rem' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Exemple de Calcul</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                Simulez le prélèvement sur une vente
              </p>
            </div>
          </div>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem'
              }}
            >
              <div className="sa-card" style={{ padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Prix du billet</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
                  10 000 <span style={{ fontSize: '1rem', fontWeight: 800, color: '#475569' }}>USD</span>
                </p>
              </div>

              <div className="sa-card" style={{ padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Commission ({formData.default_commission_rate}%)
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 900, color: '#d97706' }}>
                  {Math.max(
                    (10000 * formData.default_commission_rate / 100),
                    formData.minimum_commission_amount
                  ).toFixed(0)}{' '}
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#92400e' }}>USD</span>
                </p>
              </div>

              <div className="sa-card" style={{ padding: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Montant organisateur</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 900, color: '#059669' }}>
                  {(10000 - Math.max(
                    (10000 * formData.default_commission_rate / 100),
                    formData.minimum_commission_amount
                  )).toFixed(0)}{' '}
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>USD</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIQUE DES MODIFICATIONS */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8 border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <FaHistory className="text-3xl text-gray-600" />
            <h3 className="text-2xl font-bold text-gray-900">Historique des Modifications</h3>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <p className="text-blue-800 text-sm">
              <FaInfoCircle className="inline mr-2" />
              L'historique détaillé des modifications sera disponible prochainement
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CommissionSettings;
