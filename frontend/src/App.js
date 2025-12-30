/**
 * ================================================
 * APP.JS - COMPOSANT PRINCIPAL
 * ================================================
 *
 * Ce fichier est le CŒUR de l'application React.
 * Il définit toutes les routes (URLs) de l'application.
 *
 * ROUTES = PAGES de l'application
 * Chaque route associe une URL à une page.
 *
 * Exemple :
 * URL : /login → Page : LoginSuperAdmin
 * URL : /superadmin/dashboard → Page : DashboardSuperAdmin
 *
 * REACT ROUTER :
 * C'est comme un GPS pour l'application.
 * Il affiche la bonne page selon l'URL.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importer les pages d'authentification
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Importer les pages SuperAdmin
import DashboardSuperAdmin from './pages/superadmin/DashboardSuperAdmin';
import UsersManagement from './pages/superadmin/UsersManagement';
import EventsManagement from './pages/superadmin/EventsManagement';
import PlatformStats from './pages/superadmin/PlatformStats';
import CategoriesManagement from './pages/superadmin/CategoriesManagement';
import PayoutsManagement from './pages/superadmin/PayoutsManagement';
import CommissionSettings from './pages/superadmin/CommissionSettings';

// Importer les pages Organisateur (Admin)
import DashboardAdmin from './pages/admin/DashboardAdmin';
import CreateEvent from './pages/admin/CreateEvent';
import EventsListAdmin from './pages/admin/EventsList';
import EventDetailsAdmin from './pages/admin/EventDetails';
import Tickets from './pages/admin/Tickets';
import Registrations from './pages/admin/Registrations';
import ScanQRCode from './pages/admin/ScanQRCode';
import Balance from './pages/admin/Balance';
import Statistics from './pages/admin/Statistics';
import Settings from './pages/admin/Settings';
import Reminders from './pages/admin/Reminders';

// Importer les pages Publiques
import EventsList from './pages/public/EventsList';
import EventDetails from './pages/public/EventDetails';
import MyRegistrations from './pages/public/MyRegistrations';
import PaymentSuccess from './pages/public/PaymentSuccess';

// Importer les pages Participant
import ParticipantDashboard from './pages/participant/Dashboard';
import ParticipantSettings from './pages/participant/Settings';

// Importer le composant de transition
import PageTransition from './components/PageTransition';
import { getUserFromStorage } from './api/auth';

function ProtectedSuperAdminRoute({ children }) {
  const user = getUserFromStorage();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProtectedParticipantRoute({ children }) {
  const user = getUserFromStorage();
  if (!user || user.role !== 'participant') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    /**
     * ================================================
     * BROWSER ROUTER
     * ================================================
     *
     * BrowserRouter active la navigation dans l'application.
     * Il permet d'utiliser les URLs (ex: /login, /dashboard, etc.)
     */
    <BrowserRouter>

      {/**
       * ================================================
       * ROUTES
       * ================================================
       *
       * Routes contient la liste de toutes les pages.
       * Chaque Route associe un chemin (path) à un composant (element).
       *
       * Fonctionnement :
       * Si URL = /login → Affiche <LoginSuperAdmin />
       * Si URL = /dashboard → Affiche <DashboardSuperAdmin />
       * Si URL = / → Redirige vers /login
       */}
      <Routes>

        {/* ================================================
            ROUTE LOGIN UNIVERSELLE
            ================================================ */}

        {/* ROUTE PAR DÉFAUT : Redirige vers login */}
        <Route
          path="/"
          element={<Navigate to="/events" replace />}
        />

        {/* ROUTE LOGIN UNIVERSELLE (pour tous les rôles) */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ROUTE INSCRIPTION */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* ================================================
            ROUTES PARTICIPANT
            ================================================ */}

        <Route
          path="/participant/dashboard"
          element={
            <ProtectedParticipantRoute>
              <PageTransition>
                <ParticipantDashboard />
              </PageTransition>
            </ProtectedParticipantRoute>
          }
        />

        <Route
          path="/participant/settings"
          element={
            <ProtectedParticipantRoute>
              <PageTransition>
                <ParticipantSettings />
              </PageTransition>
            </ProtectedParticipantRoute>
          }
        />

        {/* Anciennes routes de login - Redirigent vers /login */}
        <Route path="/superadmin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/participant/login" element={<Navigate to="/login" replace />} />

        {/* ================================================
            ROUTES SUPERADMIN
            ================================================ */}

        {/* ROUTE DASHBOARD SUPERADMIN */}
        <Route
          path="/superadmin/dashboard"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <DashboardSuperAdmin />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE GESTION UTILISATEURS */}
        <Route
          path="/superadmin/users"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <UsersManagement />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE GESTION ÉVÉNEMENTS */}
        <Route
          path="/superadmin/events"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <EventsManagement />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE CRÉER UN ÉVÉNEMENT */}
        <Route
          path="/superadmin/events/create"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <CreateEvent />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE MODIFIER UN ÉVÉNEMENT */}
        <Route
          path="/superadmin/events/:id/edit"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <CreateEvent />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE STATISTIQUES PLATEFORME */}
        <Route
          path="/superadmin/stats"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <PlatformStats />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE GESTION CATÉGORIES & TAGS */}
        <Route
          path="/superadmin/categories"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <CategoriesManagement />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE GESTION PAYOUTS */}
        <Route
          path="/superadmin/payouts"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <PayoutsManagement />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ROUTE CONFIGURATION COMMISSION */}
        <Route
          path="/superadmin/commission"
          element={
            <ProtectedSuperAdminRoute>
              <PageTransition>
                <CommissionSettings />
              </PageTransition>
            </ProtectedSuperAdminRoute>
          }
        />

        {/* ================================================
            ROUTES ORGANISATEUR (ADMIN)
            ================================================ */}

        {/* ROUTE DASHBOARD ORGANISATEUR */}
        <Route
          path="/admin/dashboard"
          element={
            <PageTransition>
              <DashboardAdmin />
            </PageTransition>
          }
        />

        {/* ROUTE LISTE DES ÉVÉNEMENTS */}
        <Route
          path="/admin/events"
          element={
            <PageTransition>
              <EventsListAdmin />
            </PageTransition>
          }
        />

        {/* ROUTE CRÉER UN ÉVÉNEMENT */}
        <Route
          path="/admin/events/create"
          element={
            <PageTransition>
              <CreateEvent />
            </PageTransition>
          }
        />

        {/* ROUTE VOIR DÉTAILS D'UN ÉVÉNEMENT */}
        <Route
          path="/admin/events/:id"
          element={
            <PageTransition>
              <EventDetailsAdmin />
            </PageTransition>
          }
        />

        {/* ROUTE MODIFIER UN ÉVÉNEMENT */}
        <Route
          path="/admin/events/:id/edit"
          element={
            <PageTransition>
              <CreateEvent />
            </PageTransition>
          }
        />

        {/* ROUTE BILLETS */}
        <Route
          path="/admin/billets"
          element={
            <PageTransition>
              <Tickets />
            </PageTransition>
          }
        />

        {/* ROUTE INSCRIPTIONS */}
        <Route
          path="/admin/inscriptions"
          element={
            <PageTransition>
              <Registrations />
            </PageTransition>
          }
        />

        {/* ROUTE SCANNER QR CODE */}
        <Route
          path="/admin/scan-qr"
          element={
            <PageTransition>
              <ScanQRCode />
            </PageTransition>
          }
        />

        {/* ROUTE SOLDE & PAYOUTS */}
        <Route
          path="/admin/balance"
          element={
            <PageTransition>
              <Balance />
            </PageTransition>
          }
        />

        {/* ROUTE STATISTIQUES */}
        <Route
          path="/admin/stats"
          element={
            <PageTransition>
              <Statistics />
            </PageTransition>
          }
        />

        {/* ROUTE PARAMÈTRES */}
        <Route
          path="/admin/parametres"
          element={
            <PageTransition>
              <Settings />
            </PageTransition>
          }
        />

        {/* ROUTE MES RAPPELS */}
        <Route
          path="/admin/reminders"
          element={
            <PageTransition>
              <Reminders />
            </PageTransition>
          }
        />

        {/* ================================================
            ROUTES PUBLIQUES
            ================================================ */}

        {/* ROUTE LISTE DES ÉVÉNEMENTS PUBLICS */}
        <Route
          path="/events"
          element={
            <PageTransition>
              <EventsList />
            </PageTransition>
          }
        />

        {/* ROUTE DÉTAILS D'UN ÉVÉNEMENT PUBLIC */}
        <Route
          path="/events/:id"
          element={
            <PageTransition>
              <EventDetails />
            </PageTransition>
          }
        />

        {/* ROUTE MES INSCRIPTIONS */}
        <Route
          path="/mes-inscriptions"
          element={
            <PageTransition>
              <MyRegistrations />
            </PageTransition>
          }
        />

        {/* ROUTE SUCCÈS PAIEMENT */}
        <Route
          path="/events/:id/payment/success"
          element={
            <PageTransition>
              <PaymentSuccess />
            </PageTransition>
          }
        />

        {/* ROUTE 404 : Page non trouvée */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Page non trouvée</p>
                <a
                  href="/superadmin/login"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Retour à l'accueil
                </a>
              </div>
            </div>
          }
        />

      </Routes>

      {/**
       * ================================================
       * TOAST CONTAINER
       * ================================================
       *
       * ToastContainer affiche les notifications (succès, erreur).
       *
       * Configuration :
       * - position : Où afficher (top-right, bottom-center, etc.)
       * - autoClose : Fermeture automatique après X ms
       * - hideProgressBar : Cacher la barre de progression
       * - closeOnClick : Fermer au clic
       * - pauseOnHover : Pause au survol
       */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

    </BrowserRouter>
  );
}

export default App;

/**
 * ================================================
 * EXPLICATION DES ROUTES
 * ================================================
 *
 * 1. ROUTE PAR DÉFAUT (/)
 *    Quand l'utilisateur va sur http://localhost:3000/
 *    → Redirige automatiquement vers /superadmin/login
 *
 * 2. ROUTE LOGIN (/superadmin/login)
 *    Quand l'utilisateur va sur http://localhost:3000/superadmin/login
 *    → Affiche la page LoginSuperAdmin
 *
 * 3. ROUTE 404 (*)
 *    Si l'utilisateur tape une URL qui n'existe pas
 *    → Affiche "Page non trouvée"
 *
 * ================================================
 * NAVIGATION DANS L'APPLICATION
 * ================================================
 *
 * Pour naviguer d'une page à l'autre, on utilise :
 *
 * 1. DANS UN COMPOSANT :
 *    import { useNavigate } from 'react-router-dom';
 *    const navigate = useNavigate();
 *    navigate('/superadmin/dashboard');
 *
 * 2. DANS UN LIEN :
 *    import { Link } from 'react-router-dom';
 *    <Link to="/superadmin/dashboard">Dashboard</Link>
 *
 * ================================================
 * ROUTES PROTÉGÉES (À AJOUTER PLUS TARD)
 * ================================================
 *
 * Pour protéger une route (accessible seulement si connecté) :
 *
 * <Route
 *   path="/superadmin/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <DashboardSuperAdmin />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * Le composant ProtectedRoute vérifie si l'utilisateur
 * a un token valide. Sinon, redirige vers /login.
 */
