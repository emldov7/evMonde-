/**
 * LayoutAdmin - Layout principal pour les pages Organisateur
 * Design moderne avec sidebar et navbar améliorés
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaHome,
  FaCalendarPlus,
  FaCalendarAlt,
  FaList,
  FaTicketAlt,
  FaUsers,
  FaQrcode,
  FaMoneyBillWave,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartLine,
  FaSearch,
  FaGlobeAmericas,
  FaBell,
  FaChevronDown
} from 'react-icons/fa';
import api from '../../api/api';
import { showSuccess } from '../../utils/toast';
import '../../styles/admin.css';

function LayoutAdmin({ children }) {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/api/v1/notifications/unread-count');
        setUnreadCount(Number(response.data?.unread_count) || 0);
      } catch (error) {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Fermer la sidebar mobile quand on change de page
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showSuccess('Déconnexion réussie');
    navigate('/login');
  };

  // Menu principal
  const mainMenuItems = [
    { icon: FaHome, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: FaGlobeAmericas, label: 'Découvrir', path: '/events' },
  ];

  // Menu événements
  const eventMenuItems = [
    { icon: FaCalendarPlus, label: 'Créer un Événement', path: '/admin/events/create' },
    { icon: FaList, label: 'Mes Événements', path: '/admin/events' },
    { icon: FaTicketAlt, label: 'Billets & Tickets', path: '/admin/billets' },
    { icon: FaUsers, label: 'Inscriptions', path: '/admin/inscriptions' },
    { icon: FaQrcode, label: 'Scanner Billets', path: '/admin/scan-qr' },
  ];

  // Menu finances
  const financeMenuItems = [
    { icon: FaMoneyBillWave, label: 'Mon Solde', path: '/admin/balance' },
    { icon: FaChartLine, label: 'Statistiques', path: '/admin/stats' },
  ];

  // Menu paramètres
  const settingsMenuItems = [
    { icon: FaCog, label: 'Paramètres', path: '/admin/parametres' },
    { icon: FaBell, label: 'Mes rappels', path: '/admin/reminders' },
  ];

  const isActive = (path) => location.pathname === path;

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`admin-sidebar-item ${active ? 'active' : ''}`}
      >
        <Icon />
        <span className="admin-sidebar-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="admin-layout">
      {/* NAVBAR */}
      <nav className="admin-navbar">
        <div className="admin-navbar-brand">
          {/* Toggle Button */}
          <button
            className="admin-navbar-toggle"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
          >
            {isMobileSidebarOpen || isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>

          {/* Logo */}
          <Link to="/admin/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="admin-navbar-logo">
                <FaCalendarAlt />
              </div>
              <div className="admin-navbar-title">
                <h1>evMonde</h1>
                <span>Espace Organisateur</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="admin-navbar-search">
          <FaSearch />
          <input type="text" placeholder="Rechercher..." />
        </div>

        {/* Actions */}
        <div className="admin-navbar-actions">
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => navigate('/admin/dashboard')}
            style={{ padding: '0.6rem 1rem', height: 44 }}
          >
            <FaHome />
            Dashboard
          </button>

          {user?.role === 'admin' && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => navigate('/superadmin/dashboard')}
              style={{ padding: '0.6rem 1rem', height: 44 }}
            >
              <FaHome />
              SuperAdmin
            </button>
          )}

          {/* Notifications */}
          <button className="admin-navbar-notifications">
            <FaBell />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {/* Profile */}
          <div className="admin-navbar-profile">
            <div className="admin-navbar-profile-info">
              <h4>{user?.first_name} {user?.last_name}</h4>
              <span>Organisateur</span>
            </div>
            <div className="admin-navbar-avatar">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${!isSidebarOpen ? 'collapsed' : ''} ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-nav">
          {/* Main Menu */}
          <div className="admin-sidebar-section">
            <p className="admin-sidebar-section-title">Principal</p>
            {mainMenuItems.map(renderMenuItem)}
          </div>

          {/* Events Menu */}
          <div className="admin-sidebar-section">
            <p className="admin-sidebar-section-title">Événements</p>
            {eventMenuItems.map(renderMenuItem)}
          </div>

          {/* Finance Menu */}
          <div className="admin-sidebar-section">
            <p className="admin-sidebar-section-title">Finances</p>
            {financeMenuItems.map(renderMenuItem)}
          </div>

          {/* Settings Menu */}
          <div className="admin-sidebar-section">
            <p className="admin-sidebar-section-title">Autres</p>
            {settingsMenuItems.map(renderMenuItem)}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-user-avatar">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="admin-sidebar-user-info">
              <h4>{user?.first_name} {user?.last_name}</h4>
              <span>{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="admin-sidebar-logout">
            <FaSignOutAlt />
            <span className="admin-sidebar-label">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 80
          }}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <main className={`admin-main ${!isSidebarOpen ? 'expanded' : ''}`}>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default LayoutAdmin;
