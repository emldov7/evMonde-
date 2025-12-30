/**
 * MobileMenu - Menu hamburger responsive moderne pour mobile
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaUsers,
  FaCalendarAlt,
  FaChartLine,
  FaTags,
  FaMoneyBillWave,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import '../styles/components.css';

function MobileMenu({ currentUser, onLogout, menuItems: customMenuItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fermer le menu quand on change de page
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Bloquer le scroll quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const defaultMenuItems = [
    { icon: FaHome, label: 'Dashboard', path: '/superadmin/dashboard' },
    { icon: FaUsers, label: 'Utilisateurs', path: '/superadmin/users' },
    { icon: FaCalendarAlt, label: 'Événements', path: '/superadmin/events' },
    { icon: FaChartLine, label: 'Statistiques', path: '/superadmin/stats' },
    { icon: FaTags, label: 'Catégories', path: '/superadmin/categories' },
    { icon: FaMoneyBillWave, label: 'Payouts', path: '/superadmin/payouts' },
    { icon: FaCog, label: 'Commissions', path: '/superadmin/commission' },
  ];

  const menuItems = customMenuItems || defaultMenuItems;

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ev-btn ev-btn-primary ev-btn-icon"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1001,
          display: 'none'
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="ev-modal-overlay"
          style={{ zIndex: 999 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: '300px',
          maxWidth: '85vw',
          background: 'white',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1000,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
            padding: '1.5rem',
            color: 'white'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {currentUser?.first_name?.[0]}{currentUser?.last_name?.[0]}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0, textTransform: 'capitalize' }}>
                {currentUser?.role}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>
            {currentUser?.email}
          </p>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '1rem' }}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.path)}
                className={`admin-sidebar-item ${active ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <Icon />
                <span className="admin-sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={handleLogout}
            className="admin-sidebar-logout"
            style={{ width: '100%' }}
          >
            <FaSignOutAlt />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem', 
          textAlign: 'center', 
          fontSize: '0.75rem', 
          color: '#64748b',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{ margin: 0 }}>evMonde</p>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.7 }}>Version 1.0.0</p>
        </div>
      </div>

      {/* CSS pour afficher sur mobile uniquement */}
      <style>{`
        @media (max-width: 1024px) {
          .ev-btn.ev-btn-icon[aria-label="Toggle menu"] {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}

export default MobileMenu;
