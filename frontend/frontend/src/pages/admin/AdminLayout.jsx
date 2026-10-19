import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import './admin.css';

export default function AdminLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar automatically upon navigation
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/admin/pos') || path.includes('/admin/ventes')) {
      return 'Point de Vente & Caisse';
    }
    if (path.includes('/admin/products') || path.includes('/admin/produits')) {
      return 'Produits, Rayons & Bacs';
    }
    if (path.includes('/admin/users')) {
      return 'Gestion des Utilisateurs';
    }
    if (path.includes('/admin/settings')) {
      return 'Paramètres & Configurations';
    }
    return 'Tableau de Bord Administratif';
  };

  return (
    <div className={`admin-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="admin-mobile-backdrop active" 
          onClick={() => setIsMobileMenuOpen(false)} 
          title="Fermer le menu"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div>
          <div className="admin-sidebar-header">
            <Link to="/admin" className="admin-brand" style={{ textDecoration: 'none' }} title="La Boutique Heistal">
              <div className="admin-brand-icon" style={{ background: '#ffd000', color: '#00361a', fontWeight: 900 }}>H</div>
              <div className="admin-brand-text">
                <div style={{ fontWeight: 800 }}>La Boutique Heistal</div>
                <div style={{ fontSize: '0.72rem', color: '#ffd000', fontWeight: 600 }}>Portail Admin • Lomé</div>
              </div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="admin-badge-role">Admin</span>
              <button
                type="button"
                className="btn-toggle-sidebar"
                onClick={() => {
                  if (window.innerWidth <= 992) {
                    setIsMobileMenuOpen(false);
                  } else {
                    setIsSidebarCollapsed(prev => !prev);
                  }
                }}
                title={isSidebarCollapsed ? "Déplier le menu latéral" : "Réduire le menu"}
              >
                {window.innerWidth <= 992 ? '✕' : (isSidebarCollapsed ? '▶' : '◀')}
              </button>
            </div>
          </div>

          <div className="admin-nav-group">
            <span className="admin-nav-title">Commerce & Rayons</span>

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
              <span className="nav-text">Point de Vente (Caisse)</span>
            </NavLink>

            <NavLink
              to="/admin/products"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Produits & Rayons"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span className="nav-text">Produits & Rayons</span>
            </NavLink>

            <span className="admin-nav-title">Pilotage & Système</span>

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

            <NavLink
              to="/admin/users"
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Utilisateurs"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="nav-text">Utilisateurs</span>
            </NavLink>

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

          <div className="admin-user-card" title="Hugues Wilson (Super Admin)">
            <div className="admin-avatar">HW</div>
            <div className="admin-user-info">
              <span className="admin-user-name">Hugues Wilson</span>
              <span className="admin-user-email">Super Administrateur</span>
            </div>
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
                if (window.innerWidth <= 992) {
                  setIsMobileMenuOpen(prev => !prev);
                } else {
                  setIsSidebarCollapsed(prev => !prev);
                }
              }}
              title="Menu de navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="admin-page-heading">{getPageTitle()}</h1>
          </div>

          <div className="admin-header-actions">
            <div className="admin-search-wrapper">
              <span className="admin-search-icon">🔍</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Recherche rapide dans l'admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button type="button" className="admin-icon-btn" title="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-dot"></span>
            </button>

            <Link 
              to="/" 
              className="btn btn-outline" 
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', textDecoration: 'none' }}
            >
              Voir la page d'accueil
            </Link>
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
