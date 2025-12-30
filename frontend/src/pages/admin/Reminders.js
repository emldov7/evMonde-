import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaTrash, FaEye } from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/admin.css';

function Reminders() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [includeSent, setIncludeSent] = useState(false);

  const fetchReminders = async (include = false) => {
    setLoading(true);
    try {
      const resp = await api.get('/api/v1/events/reminders/my', { params: { include_sent: include } });
      setItems(Array.isArray(resp.data) ? resp.data : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders(includeSent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeSent]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleDelete = async (eventId, reminderId) => {
    if (!window.confirm('Supprimer ce rappel ?')) return;

    const toastId = showLoading('Suppression...');
    try {
      await api.delete(`/api/v1/events/${eventId}/reminders/${reminderId}`);
      updateToSuccess(toastId, 'Rappel supprimé');
      fetchReminders(includeSent);
    } catch (error) {
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  return (
    <LayoutAdmin>
      <div className="admin-page-header">
        <div className="admin-page-header-top">
          <div>
            <h1 className="admin-page-title">Mes rappels</h1>
            <p className="admin-page-subtitle">Gérez les rappels programmés sur vos événements</p>
          </div>
        </div>
      </div>

      <div className="admin-filters" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`admin-btn ${includeSent ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
            onClick={() => setIncludeSent(false)}
            style={{ height: 42 }}
          >
            À venir
          </button>
          <button
            className={`admin-btn ${includeSent ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setIncludeSent(true)}
            style={{ height: 42 }}
          >
            Inclure envoyés
          </button>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <FaBell />
            </div>
            <h3>Aucun rappel</h3>
            <p>Programmez des rappels depuis l’édition d’un événement.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Date événement</th>
                  <th>Date rappel</th>
                  <th>Message</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.event_title}</td>
                    <td>{formatDate(r.event_start_date)}</td>
                    <td>{formatDate(r.scheduled_at)}</td>
                    <td style={{ color: '#64748b' }}>{r.message || '—'}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${r.sent ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.sent ? 'Envoyé' : 'À venir'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="admin-event-action-btn view"
                          title="Voir l’événement"
                          onClick={() => navigate(`/admin/events/${r.event_id}`)}
                        >
                          <FaEye />
                        </button>
                        <button
                          className="admin-event-action-btn delete"
                          title="Supprimer"
                          onClick={() => handleDelete(r.event_id, r.id)}
                        >
                          <FaTrash />
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
    </LayoutAdmin>
  );
}

export default Reminders;
