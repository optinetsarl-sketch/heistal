import React, { useState } from 'react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'La Boutique Heistal',
    adminEmail: 'contact@heistal.com',
    maintenanceMode: false,
    emailAlerts: true,
    backendApiUrl: 'http://127.0.0.1:8000/api/',
    currency: 'XOF (FCFA)',
    twoFactorAuth: true
  });

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {saved && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          ✓ Les configurations ont été enregistrées avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* General Settings */}
        <div className="admin-panel-card">
          <h3 className="admin-panel-title">Paramètres Généraux de la Plateforme</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Identité du site et coordonnées principales de l'administration</p>

          <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Nom de l'application</label>
              <input 
                type="text" 
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
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
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Email de contact / support</label>
              <input 
                type="email" 
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
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
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>Devise active</label>
              <input 
                type="text" 
                value={settings.currency}
                disabled
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 1rem',
                  color: '#94a3b8'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.825rem', marginBottom: '0.4rem' }}>URL API Django Backend</label>
              <input 
                type="text" 
                value={settings.backendApiUrl}
                onChange={(e) => setSettings({ ...settings, backendApiUrl: e.target.value })}
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
          </div>
        </div>

        {/* Security & Maintenance */}
        <div className="admin-panel-card">
          <h3 className="admin-panel-title">Sécurité et Exploitation</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>Mode Maintenance</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Rend la plateforme temporairement inaccessible aux utilisateurs réguliers</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>Authentification à deux facteurs (2FA)</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Exiger une validation par code pour toutes les connexions administrateurs</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.twoFactorAuth}
                onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>Alertes et Notifications par Email</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Recevoir un email lors de la détection d'une activité critique</div>
              </div>
              <input 
                type="checkbox" 
                checked={settings.emailAlerts}
                onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
