import React, { useState, useSyncExternalStore } from 'react';
import { NavLink, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_BASE, apiFetch, clearSession, getToken, getUser, saveUser } from '../../api';
import { accueilDuRole, peutOuvrir } from './roles';
import './admin.css';

// Même seuil que le media query du menu latéral dans admin.css.
const COMPACT_QUERY = '(max-width: 992px)';

function subscribeToCompact(onChange) {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const isCompactScreen = () => window.matchMedia(COMPACT_QUERY).matches;

const PAGE_TITLES = [
  { paths: ['/admin/commandes', '/admin/orders'], title: 'Commandes directes' },
  { paths: ['/admin/pos', '/admin/ventes'], title: 'Point de vente' },
  { paths: ['/admin/products', '/admin/produits'], title: 'Produits & familles' },
  { paths: ['/admin/boutiques', '/admin/stores'], title: 'Boutiques' },
  { paths: ['/admin/users'], title: 'Utilisateurs' },
  { paths: ['/admin/clients'], title: 'Clients' },
  { paths: ['/admin/mouvements'], title: 'Mouvements' },
  { paths: ['/admin/settings'], title: 'Paramètres' },
];

export default function AdminLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isCompact = useSyncExternalStore(subscribeToCompact, isCompactScreen);

  // Sur petit écran, le menu est un tiroir : l'état « replié » du bureau ne s'y applique pas.
  const isCollapsed = isSidebarCollapsed && !isCompact;
  const isDrawerOpen = isMobileMenuOpen && isCompact;

  const [currentUser, setCurrentUser] = useState(getUser);

  const handleLogout = async () => {
    try {
      await apiFetch(`${API_BASE}/logout/`, { method: 'POST' });
    } catch (e) {
      console.warn('Déconnexion côté serveur impossible :', e);
    }
    clearSession();
    window.location.href = '/connexion';
  };

  // Un jeton périmé ou inventé est écarté dès l'ouverture : apiFetch renvoie alors à la connexion.
  // La réponse actualise aussi le rôle, s'il a changé depuis la dernière connexion.
  React.useEffect(() => {
    if (!getToken()) return;
    apiFetch(`${API_BASE}/session/`)
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((session) => {
        if (session) {
          saveUser(session.user);
          setCurrentUser(session.user);
        }
      })
      .catch((e) => console.warn('Vérification de session impossible :', e));
  }, []);

  // Close mobile sidebar automatically upon navigation
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // La touche Échap ferme le tiroir de navigation.
  React.useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isDrawerOpen]);

  const pageTitle = PAGE_TITLES.find(({ paths }) => paths.some((path) => location.pathname.includes(path)))?.title || 'Tableau de bord';

  // Sans session, retour à la connexion. L'API refuse de toute façon les données aux non-connectés.
  if (!getToken()) {
    return <Navigate to="/connexion" replace />;
  }

  // Une page hors de son rôle ramène chacun à son écran : le menu ne la propose d'ailleurs pas.
  if (!peutOuvrir(currentUser?.role, location.pathname)) {
    return <Navigate to={accueilDuRole(currentUser)} replace />;
  }

  const voir = (chemin) => peutOuvrir(currentUser?.role, chemin);

  return (
    <div className="admin-wrapper">
      {/* Mobile Backdrop Overlay */}
      {isDrawerOpen && (
        <div
          className="admin-mobile-backdrop active"
          onClick={() => setIsMobileMenuOpen(false)}
          title="Fermer le menu"
        />
      )}

      {/* Sidebar Navigation */}
      <aside id="admin-sidebar" className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isDrawerOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-header">
            <Link to="/admin" className="admin-brand" style={{ textDecoration: 'none' }} title="La Boutique Heistal - Espace Gestion">
              <div className="pro-brand-signboard" style={{ padding: '0.2rem 0.55rem 0.25rem', minWidth: 'auto', borderRadius: '8px' }}>
                <div className="sign-text-container">
                  <span className="sign-la-boutique" style={{ fontSize: '0.62rem' }}>La Boutique</span>
                  <span className="sign-heistal" style={{ fontSize: '1.45rem', marginTop: '-2px' }}>Heistal</span>
                </div>
              </div>
              <div className="admin-brand-icon" aria-hidden="true">H</div>
              <div className="admin-brand-text">
                <div className="admin-brand-name">Espace Gestion</div>
                <div className="admin-brand-tagline">Portail Admin • Lomé</div>
              </div>
            </Link>
            {isCompact && (
              <button
                type="button"
                className="btn-toggle-sidebar"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Fermer le menu"
                title="Fermer le menu"
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-nav-group">
            <span className="admin-nav-title">Commerce & Familles</span>

            {voir('/admin/pos') && (
            <NavLink
              to="/admin/pos"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Point de Vente (Caisse)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span className="nav-text">Point de Vente</span>
            </NavLink>
            )}

            {voir('/admin/products') && (
            <NavLink
              to="/admin/products"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Produits & Familles"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span className="nav-text">Produits & Familles</span>
            </NavLink>
            )}

            {voir('/admin/commandes') && (
            <NavLink
              to="/admin/commandes"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Commandes Directes du Site Web (Retrait 24h)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span className="nav-text">Commandes</span>
              <span className="admin-nav-badge">24h</span>
            </NavLink>
            )}

            {voir('/admin/clients') && (
            <NavLink
              to="/admin/clients"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Clients"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="nav-text">Clients</span>
            </NavLink>
            )}

            {voir('/admin/boutiques') && (
            <NavLink
              to="/admin/boutiques"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Boutiques & Points de Vente"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span className="nav-text">Boutiques & Map</span>
            </NavLink>
            )}

            {voir('/admin/mouvements') && <span className="admin-nav-title">Pilotage & Système</span>}

            {voir('/admin') && (
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Tableau de bord"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span className="nav-text">Tableau de bord</span>
            </NavLink>
            )}

            {voir('/admin/mouvements') && (
            <NavLink
              to="/admin/mouvements"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Mouvements des boutiques et des utilisateurs"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span className="nav-text">Mouvements</span>
            </NavLink>
            )}

            {voir('/admin/users') && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Utilisateurs & Postes"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="nav-text">Utilisateurs & Postes</span>
            </NavLink>
            )}

            {voir('/admin/settings') && (
            <NavLink
              to="/admin/settings"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Paramètres"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="nav-text">Paramètres</span>
            </NavLink>
            )}
          </div>
        </div>

        {/* Sidebar Footer with user info & back to site button */}
        <div className="admin-sidebar-footer">
          <Link
            to="/"
            className="btn-return-site"
            title="Revenir sur la page principale"
            style={{ textDecoration: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="return-text">Retour au site public</span>
          </Link>

          <div className="admin-user-card">
            <div className="admin-user-identity">
              <div className="admin-avatar">
                {currentUser?.avatar}
              </div>
              <div className="admin-user-info">
                <span className="admin-user-name">
                  {currentUser?.nom_complet}
                </span>
                <span className="admin-user-email">
                  {currentUser?.role_label}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="admin-logout-btn"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="logout-text">Quitter</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Header bar */}
        <header className="admin-header">
          <div className="admin-header-title">
            <button
              type="button"
              className="btn-header-sidebar-toggle"
              onClick={() => {
                if (isCompact) {
                  setIsMobileMenuOpen(prev => !prev);
                } else {
                  setIsSidebarCollapsed(prev => !prev);
                }
              }}
              aria-label="Menu de navigation"
              aria-controls="admin-sidebar"
              aria-expanded={isCompact ? isDrawerOpen : !isCollapsed}
              title="Menu de navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="admin-page-heading">{pageTitle}</h1>
          </div>

          <div className="admin-header-actions">
            {/* La page Produits a sa propre recherche, juste en dessous : deux champs prêteraient à confusion. */}
            {!location.pathname.startsWith('/admin/products') && (
              <div className="admin-search-wrapper admin-header-search">
                <span className="admin-search-icon">🔍</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Recherche rapide dans l'admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            <button type="button" className="admin-icon-btn" aria-label="Notifications" title="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Outlet for active admin route */}
        <div className="admin-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
