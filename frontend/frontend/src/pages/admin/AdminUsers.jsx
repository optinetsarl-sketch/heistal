import React, { useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState([
    { id: 1, name: "Hugues Wilson", email: "hugues.wilson@heistal.com", role: "Super Admin", status: "Actif", joined: "12 Jan 2026", avatar: "HW" },
    { id: 2, name: "Adjoa Mensah", email: "adjoa.mensah@example.com", role: "Gestionnaire", status: "Actif", joined: "04 Fév 2026", avatar: "AM" },
    { id: 3, name: "Koffi Amegan", email: "koffi.amegan@gmail.com", role: "Client", status: "Actif", joined: "18 Fév 2026", avatar: "KA" },
    { id: 4, name: "Société Togolaise", email: "contact@societetogo.tg", role: "Entreprise", status: "En attente", joined: "01 Mar 2026", avatar: "ST" },
    { id: 5, name: "Emmanuel Lawson", email: "e.lawson@heistal.tg", role: "Modérateur", status: "Inactif", joined: "15 Mar 2026", avatar: "EL" },
    { id: 6, name: "Afiya Dosseh", email: "afiya.dosseh@yahoo.fr", role: "Client", status: "Actif", joined: "22 Mar 2026", avatar: "AD" },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tous');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Client' });

  const handleToggleStatus = (id) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Actif' ? 'Inactif' : 'Actif';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    const initials = newUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const created = {
      id: Date.now(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'Actif',
      joined: "Aujourd'hui",
      avatar: initials
    };
    setUsers([created, ...users]);
    setNewUser({ name: '', email: '', role: 'Client' });
    setShowAddModal(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'Tous' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="admin-search-wrapper" style={{ width: '280px' }}>
            <span className="admin-search-icon">🔍</span>
            <input 
              type="text" 
              className="admin-search-input" 
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              background: '#1f2937',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              padding: '0.55rem 1rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Tous">Tous les rôles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Gestionnaire">Gestionnaire</option>
            <option value="Modérateur">Modérateur</option>
            <option value="Client">Client</option>
            <option value="Entreprise">Entreprise</option>
          </select>
        </div>

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ gap: '0.4rem', padding: '0.6rem 1.25rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Ajouter un utilisateur
        </button>
      </div>

      {/* Users table card */}
      <div className="admin-panel-card">
        <div className="admin-panel-header">
          <div>
            <h3 className="admin-panel-title">Liste des Utilisateurs ({filteredUsers.length})</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Gérez les autorisations, statuts et profils des utilisateurs</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Inscrit le</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-mini-avatar" style={{ background: user.role === 'Super Admin' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#374151' }}>
                          {user.avatar}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{user.name}</span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-admin-status ${user.status === 'Actif' ? 'status-active' : user.status === 'En attente' ? 'status-pending' : 'status-inactive'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{user.joined}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        type="button" 
                        onClick={() => handleToggleStatus(user.id)}
                        style={{
                          fontSize: '0.78rem',
                          color: user.status === 'Actif' ? '#f87171' : '#34d399',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}
                      >
                        {user.status === 'Actif' ? 'Suspendre' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.25rem' }}>Créer un nouvel utilisateur</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Renseignez les détails pour donner accès à la plateforme.</p>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Nom complet</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Koffi Mensah"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 1rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Adresse email</label>
                <input 
                  type="email" 
                  required
                  placeholder="Ex: koffi@heistal.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 1rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Rôle attribué</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 1rem',
                    color: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="Client">Client</option>
                  <option value="Gestionnaire">Gestionnaire</option>
                  <option value="Modérateur">Modérateur</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Entreprise">Entreprise</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                  style={{ background: 'transparent', color: '#cbd5e1' }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
