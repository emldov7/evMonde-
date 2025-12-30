/**
 * ScanQRCode - Page de scan QR code pour valider l'entrée des participants
 *
 * Permet aux organisateurs de scanner les QR codes des participants
 * et voir les informations de validation (nombre de scans, infos client, etc.)
 */

import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaQrcode, FaCamera, FaUpload, FaCheckCircle, FaExclamationTriangle, FaBan, FaUser, FaEnvelope, FaCalendarAlt, FaClock } from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showError, showSuccess } from '../../utils/toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../../styles/admin.css';

function ScanQRCode() {
  const location = useLocation();
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerMode, setScannerMode] = useState('camera'); // 'camera' ou 'upload'
  const [scannerInstance, setScannerInstance] = useState(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const eventIdParam = searchParams.get('eventId');
  const eventId = eventIdParam ? Number(eventIdParam) : null;

  // Démarrer le scanner de caméra
  const startCameraScanner = () => {
    if (scannerInstance) {
      scannerInstance.clear();
    }

    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });

    scanner.render(onScanSuccess, onScanError);
    setScannerInstance(scanner);
  };

  // Arrêter le scanner
  const stopScanner = () => {
    if (scannerInstance) {
      scannerInstance.clear();
      setScannerInstance(null);
    }
  };

  // Callback quand un QR est scanné avec succès
  const onScanSuccess = (decodedText) => {
    console.log('✅ QR Code scanné:', decodedText);
    stopScanner();
    verifyQRCode(decodedText);
  };

  // Callback en cas d'erreur de scan
  const onScanError = (error) => {
    // On ignore les erreurs de scan continues (normal quand aucun QR détecté)
    // console.warn('Scan error:', error);
  };

  // Vérifier le QR code via l'API
  const verifyQRCode = async (qrCodeData) => {
    try {
      setLoading(true);
      const response = await api.post('/api/v1/registrations/organizer/verify-qr', {
        qr_code_data: qrCodeData,
        event_id: Number.isFinite(eventId) ? eventId : null
      });

      console.log('🔍 Résultat vérification:', response.data);
      setScanResult(response.data);

      // Afficher un toast selon le résultat
      if (response.data.valid) {
        showSuccess(response.data.message);
      } else {
        showError(response.data.message);
      }
    } catch (error) {
      console.error('Error verifying QR code:', error);
      showError('Erreur lors de la vérification du QR code');
      setScanResult({
        valid: false,
        message: 'Erreur de connexion au serveur'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'upload d'une image QR
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');

      const decodedText = await html5QrCode.scanFile(file, true);
      console.log('✅ QR Code détecté dans l\'image:', decodedText);
      verifyQRCode(decodedText);
    } catch (error) {
      console.error('Error reading QR from file:', error);
      showError('Impossible de lire le QR code dans cette image');
      setLoading(false);
    }
  };

  // Changer le mode de scan
  const switchMode = (mode) => {
    stopScanner();
    setScanResult(null);
    setScannerMode(mode);
    if (mode === 'camera') {
      setTimeout(startCameraScanner, 100);
    }
  };

  // Réinitialiser pour un nouveau scan
  const resetScanner = () => {
    setScanResult(null);
    if (scannerMode === 'camera') {
      startCameraScanner();
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir le style du badge de résultat
  const getResultBadgeStyle = () => {
    if (!scanResult) return null;

    if (scanResult.valid) {
      return {
        icon: FaCheckCircle,
        variant: 'success'
      };
    }

    // Vérifier si c'est une alerte (2ème scan) ou fraude (3+ scans)
    if (scanResult.message?.includes('ALERTE')) {
      return {
        icon: FaExclamationTriangle,
        variant: 'warning'
      };
    }

    return {
      icon: FaBan,
      variant: 'danger'
    };
  };

  const resultStyle = getResultBadgeStyle();

  return (
    <LayoutAdmin>
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Scanner QR Code</h1>
            <p className="admin-page-subtitle">Validez l'entrée des participants en scannant leur billet.</p>
            {Number.isFinite(eventId) && (
              <p className="admin-page-subtitle">Mode événement : #{eventId}</p>
            )}
          </div>
          <div className="admin-page-actions">
            <button
              onClick={() => switchMode('camera')}
              className={`admin-btn ${scannerMode === 'camera' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              style={{ padding: '0.6rem 1rem' }}
            >
              <FaCamera /> Caméra
            </button>
            <button
              onClick={() => switchMode('upload')}
              className={`admin-btn ${scannerMode === 'upload' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              style={{ padding: '0.6rem 1rem' }}
            >
              <FaUpload /> Image
            </button>
          </div>
        </div>
      </div>

      <div className="admin-scan-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Scanner</h2>
          </div>
          <div className="admin-card-body">
            {!scanResult && (
              <div>
                {scannerMode === 'camera' ? (
                  <div>
                    <div id="qr-reader" ref={scannerRef} className="admin-scan-reader"></div>
                    <button
                      onClick={startCameraScanner}
                      className="admin-btn admin-btn-primary"
                      style={{ width: '100%', marginTop: '1rem' }}
                    >
                      Démarrer la caméra
                    </button>
                  </div>
                ) : (
                  <div className="admin-scan-dropzone">
                    <FaUpload className="admin-scan-dropzone-icon" />
                    <div className="admin-scan-dropzone-title">Télécharger une image</div>
                    <div className="admin-scan-dropzone-subtitle">Choisissez une image contenant un QR code.</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="admin-btn admin-btn-primary"
                      style={{ padding: '0.6rem 1rem' }}
                    >
                      {loading ? 'Analyse en cours...' : 'Choisir une image'}
                    </button>
                    <div id="qr-reader" className="hidden"></div>
                  </div>
                )}
              </div>
            )}

            {scanResult && resultStyle && (
              <div className={`admin-scan-result ${resultStyle.variant}`}>
                <div className="admin-scan-result-row">
                  <div className="admin-scan-result-icon">
                    <resultStyle.icon />
                  </div>
                  <div>
                    <div className="admin-scan-result-title">{scanResult.valid ? 'Accès autorisé' : 'Accès refusé'}</div>
                    <div className="admin-scan-result-message">{scanResult.message}</div>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="admin-btn admin-btn-secondary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Scanner un autre billet
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Informations</h2>
          </div>
          <div className="admin-card-body">
            {!scanResult ? (
              <div className="admin-empty-state" style={{ padding: '2.5rem 1rem' }}>
                <div className="admin-empty-state-icon">
                  <FaQrcode />
                </div>
                <h3>En attente d’un scan</h3>
                <p>Scannez un billet pour afficher les informations du participant.</p>
              </div>
            ) : (
              <div className="admin-scan-info-grid">
                {scanResult.participant_name && (
                  <div className="admin-scan-info-card">
                    <div className="admin-scan-info-label"><FaUser /> Participant</div>
                    <div className="admin-scan-info-value">{scanResult.participant_name}</div>
                  </div>
                )}

                {scanResult.participant_email && (
                  <div className="admin-scan-info-card">
                    <div className="admin-scan-info-label"><FaEnvelope /> Email</div>
                    <div className="admin-scan-info-value">{scanResult.participant_email}</div>
                  </div>
                )}

                {scanResult.event_title && (
                  <div className="admin-scan-info-card">
                    <div className="admin-scan-info-label"><FaCalendarAlt /> Événement</div>
                    <div className="admin-scan-info-value">{scanResult.event_title}</div>
                    {scanResult.event_date && (
                      <div className="admin-scan-info-sub">{formatDate(scanResult.event_date)}</div>
                    )}
                  </div>
                )}

                {scanResult.registration_status && (
                  <div className="admin-scan-info-card">
                    <div className="admin-scan-info-label"><FaClock /> Statut</div>
                    <div className="admin-scan-info-value" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {String(scanResult.registration_status)}
                    </div>

                    {String(scanResult.registration_status).includes('SCANNED') && (
                      <div className="admin-scan-info-alert warning">⚠️ Billet scanné plusieurs fois</div>
                    )}

                    {String(scanResult.registration_status).includes('FRAUD') && (
                      <div className="admin-scan-info-alert danger">🚨 Fraude détectée</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Comment utiliser le scanner</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-scan-steps">
            <div className="admin-scan-step"><span className="admin-scan-step-n">1</span> Choisis <strong>Caméra</strong> pour scanner en temps réel ou <strong>Image</strong> pour analyser une capture.</div>
            <div className="admin-scan-step"><span className="admin-scan-step-n">2</span> Pointe la caméra vers le QR code (ou télécharge l’image).</div>
            <div className="admin-scan-step"><span className="admin-scan-step-n">3</span> Le système valide automatiquement le billet.</div>
            <div className="admin-scan-step"><span className="admin-scan-step-n">4</span> <strong>Vert</strong> = 1er scan • <strong>Jaune</strong> = 2e scan (alerte) • <strong>Rouge</strong> = 3+ scans (fraude)</div>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}

export default ScanQRCode;
