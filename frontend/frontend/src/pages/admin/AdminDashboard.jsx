import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ onNavigateToUsers }) {
  const navigate = useNavigate();
  const kpis = [
    {
      label: "Chiffre d'affaires",
      value: "14 850 000 FCFA",
      trend: "+12.5%",
      isUp: true,
      iconClass: "kpi-icon-green",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      )
    },
    {
      label: "Utilisateurs Inscrits",
      value: "2 480",
      trend: "+8.2%",
      isUp: true,
      iconClass: "kpi-icon-blue",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      label: "Dossiers Traités",
      value: "942",
      trend: "+24.1%",
      isUp: true,
      iconClass: "kpi-icon-purple",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      )
    },
    {
      label: "Taux de Conversion",
      value: "4.8%",
      trend: "-0.4%",
      isUp: false,
      iconClass: "kpi-icon-amber",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      )
    }
  ];

  const recentTransactions = [
    { id: "TX-9021", client: "Adjoa Mensah", type: "Paiement Service", amount: "45 000 FCFA", status: "Validé", statusClass: "status-active", date: "Il y a 10 min" },
    { id: "TX-9020", client: "Koffi Amegan", type: "Abonnement Pro", amount: "120 000 FCFA", status: "Validé", statusClass: "status-active", date: "Il y a 35 min" },
    { id: "TX-9019", client: "Société Togolaise SARL", type: "Intégration API", amount: "350 000 FCFA", status: "En attente", statusClass: "status-pending", date: "Il y a 2 h" },
    { id: "TX-9018", client: "Emmanuel Lawson", type: "Renouvellement", amount: "25 000 FCFA", status: "Validé", statusClass: "status-active", date: "Il y a 5 h" },
    { id: "TX-9017", client: "Afiya Dosseh", type: "Remboursement", amount: "15 000 FCFA", status: "Inactif", statusClass: "status-inactive", date: "Hier" },
  ];

  const activities = [
    { title: "Nouveau compte administrateur créé", time: "Il y a 25 minutes", user: "Admin Système" },
    { title: "Mise à jour de la base de données Django terminée", time: "Il y a 1 heure", user: "Serveur API" },
    { title: "Exportation des rapports mensuels Lomé", time: "Il y a 3 heures", user: "Koffi A." },
    { title: "Nouvelle règle de sécurité appliquée", time: "Hier à 18:42", user: "Sécurité" },
  ];

  return (
    <>
      {/* Quick Access Commerce Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>🏬 Opérations Magasin & Rayons Heistal</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tokoin Wuiti • Adidogomé — Surgelé garanti -18°C</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/admin/pos')}
            style={{ background: '#007a3d', borderColor: '#007a3d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <span>🛒</span>
            <span>Ouvrir la Caisse (Ventes)</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/products')}
            style={{ borderColor: '#ffd000', color: '#ffd000', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <span>📦</span>
            <span>Enregistrer un Produit / Rayon</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="admin-kpi-card">
            <div className="admin-kpi-top">
              <span className="admin-kpi-label">{kpi.label}</span>
              <div className={`admin-kpi-icon ${kpi.iconClass}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="admin-kpi-value">{kpi.value}</div>
            <div className={`admin-kpi-trend ${kpi.isUp ? 'trend-up' : 'trend-down'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {kpi.isUp ? (
                  <path d="M18 15l-6-6-6 6" />
                ) : (
                  <path d="M6 9l6 6 6-6" />
                )}
              </svg>
              <span>{kpi.trend} vs le mois dernier</span>
            </div>
          </div>
        ))}
      </div>

      {/* Split Grid: Chart + Recent Activities */}
      <div className="admin-split-grid">
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Activité et Fréquentation (Derniers 7 Jours)</h3>
            <span className="badge badge-info">+18% ce cycle</span>
          </div>

          {/* Clean SVG Area Chart */}
          <div className="chart-container">
            <svg viewBox="0 0 600 180" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              
              {/* Area fill */}
              <polygon
                points="0,150 70,120 160,135 250,70 340,95 430,35 520,50 600,20 600,180 0,180"
                fill="url(#chartGradient)"
              />
              {/* Curve path */}
              <polyline
                points="0,150 70,120 160,135 250,70 340,95 430,35 520,50 600,20"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Points */}
              {[[70,120], [160,135], [250,70], [340,95], [430,35], [520,50], [600,20]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#818cf8" stroke="#111827" strokeWidth="2" />
              ))}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', marginTop: '0.5rem' }}>
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Journal d'Événements</h3>
            <span style={{ fontSize: '0.8rem', color: '#818cf8', cursor: 'pointer' }}>Voir tout</span>
          </div>

          <div className="activity-list">
            {activities.map((act, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-details">
                  <div className="activity-title">{act.title}</div>
                  <div className="activity-time">{act.time} • par {act.user}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="admin-panel-card">
        <div className="admin-panel-header">
          <div>
            <h3 className="admin-panel-title">Dernières Opérations Récentes</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Aperçu en direct des transactions enregistrées sur La Boutique Heistal</p>
          </div>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
            onClick={() => onNavigateToUsers ? onNavigateToUsers() : navigate('/admin/users')}
          >
            Gérer les utilisateurs
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Type d'Opération</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ fontWeight: 600, color: '#818cf8' }}>{tx.id}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-mini-avatar">
                        {tx.client.charAt(0)}
                      </div>
                      <span>{tx.client}</span>
                    </div>
                  </td>
                  <td>{tx.type}</td>
                  <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                  <td>
                    <span className={`badge-admin-status ${tx.statusClass}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
