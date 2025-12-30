/**
 * PublicNavbar - Barre de navigation moderne pour les pages publiques
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaTicketAlt, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes,
  FaTachometerAlt,
  FaGlobeAmericas,
  FaCog
} from 'react-icons/fa';
import '../styles/components.css';

function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
    {mobileMenuOpen && (
      <div
        className="ev-navbar-overlay"
        onClick={() => setMobileMenuOpen(false)}
      />
    )}
    <nav className="ev-navbar">
      <div className="ev-navbar-container">
        {/* Brand */}
        <div className="ev-navbar-brand" onClick={() => navigate('/events')}>
          <div className="ev-navbar-logo">
            <FaCalendarAlt />
          </div>
          <span className="ev-navbar-title">evMonde</span>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="ev-navbar-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation */}
        <div className={`ev-navbar-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <button
            onClick={() => { navigate('/events'); setMobileMenuOpen(false); }}
            className={`ev-navbar-link ${isActive('/events') ? 'active' : ''}`}
          >
            <FaGlobeAmericas />
            Événements
          </button>

          {token ? (
            <>
              <button
                onClick={() => { navigate('/mes-inscriptions'); setMobileMenuOpen(false); }}
                className={`ev-navbar-link ${isActive('/mes-inscriptions') ? 'active' : ''}`}
              >
                <FaTicketAlt />
                Mes Inscriptions
              </button>

              {user.role === 'participant' && (
                <button
                  onClick={() => { navigate('/participant/settings'); setMobileMenuOpen(false); }}
                  className={`ev-navbar-link ${isActive('/participant/settings') ? 'active' : ''}`}
                >
                  <FaCog />
                  Paramètres
                </button>
              )}

              {(user.role === 'organizer' || user.role === 'admin') && (
                <button
                  onClick={() => { navigate('/admin/dashboard'); setMobileMenuOpen(false); }}
                  className="ev-btn ev-btn-primary ev-btn-sm"
                >
                  <FaTachometerAlt />
                  Dashboard
                </button>
              )}

              <div className="ev-navbar-user">
                <div className="ev-navbar-avatar">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <span className="ev-navbar-username">
                  {user.first_name || 'Utilisateur'}
                </span>
                <button
                  onClick={handleLogout}
                  className="ev-navbar-logout"
                  title="Déconnexion"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
              className="ev-btn ev-btn-primary"
            >
              Connexion
            </button>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}

export default PublicNavbar;
