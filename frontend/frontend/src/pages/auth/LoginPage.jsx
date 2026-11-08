import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE, saveSession } from '../../api';
import { accueilDuRole } from '../admin/roles';
import './login.css';

const MESSAGE_SERVEUR_INJOIGNABLE = 'Serveur injoignable. Vérifiez votre connexion et réessayez.';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Session en attente : le mot de passe est trop faible et doit d'abord être changé
  const [pendingSession, setPendingSession] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const openSession = (user, token) => {
    saveSession(user, token);
    navigate(accueilDuRole(user));
  };

  // Connexion
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifiant.trim()) {
      setErrorMessage("Veuillez renseigner votre nom d'utilisateur.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.must_change_password) {
          setPendingSession({ user: data.user, token: data.token });
        } else {
          openSession(data.user, data.token);
        }
      } else {
        setErrorMessage(data.message || data.detail || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (err) {
      console.warn("Connexion via l'API échouée :", err);
      setErrorMessage(MESSAGE_SERVEUR_INJOIGNABLE);
    } finally {
      setLoading(false);
    }
  };

  // Changement obligatoire d'un mot de passe trop faible
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pendingSession.token}`
        },
        body: JSON.stringify({ ancien_mot_de_passe: password, nouveau_mot_de_passe: newPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        openSession(pendingSession.user, data.token);
      } else {
        setErrorMessage(data.message || data.detail || 'Ce mot de passe a été refusé.');
      }
    } catch (err) {
      console.warn('Changement de mot de passe échoué :', err);
      setErrorMessage(MESSAGE_SERVEUR_INJOIGNABLE);
    } finally {
      setLoading(false);
    }
  };

  if (pendingSession) {
    return (
      <div className="login-page-wrapper">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          <div className="login-header">
            <div className="login-brand-badge">H</div>
            <h1 className="login-title">Nouveau mot de passe</h1>
            <p className="login-subtitle">
              Votre mot de passe actuel est trop simple.<br />
              Choisissez-en un nouveau pour continuer (8 caractères minimum, pas uniquement des chiffres).
            </p>
          </div>

          {errorMessage && (
            <div className="login-error-alert">
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="login-form-group">
              <label className="login-label" htmlFor="nouveau-mot-de-passe">
                <span>Nouveau mot de passe</span>
              </label>
              <div className="login-input-wrapper">
                <input
                  id="nouveau-mot-de-passe"
                  type="password"
                  required
                  className="login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label" htmlFor="confirmation-mot-de-passe">
                <span>Confirmez le mot de passe</span>
              </label>
              <div className="login-input-wrapper">
                <input
                  id="confirmation-mot-de-passe"
                  type="password"
                  required
                  className="login-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading}>
              <span>{loading ? 'Enregistrement...' : 'Enregistrer et continuer'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      {/* Background ambient orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      <div className="login-card">
        {/* Header with Logo */}
        <div className="login-header">
          <div className="login-brand-badge">H</div>
          <h1 className="login-title">Espace Collaborateur</h1>
          <p className="login-subtitle">
            La Boutique Heistal Togo • Lomé<br />
            Portail de gestion & Point de vente
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-alert">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Nom d'utilisateur */}
          <div className="login-form-group">
            <label className="login-label">
              <span>Nom d'utilisateur</span>
            </label>
            <div className="login-input-wrapper">
              <input
                type="text"
                required
                className="login-input"
                placeholder="Votre nom d'utilisateur"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Mot de passe simple */}
          <div className="login-form-group">
            <label className="login-label">
              <span>Mot de passe</span>
            </label>
            <div className="login-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="login-input"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {/* Se souvenir de moi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#007a3d' }}
              />
              <span>Se souvenir de moi</span>
            </label>
            <span 
              style={{ color: '#ffd000', fontSize: '0.8rem', cursor: 'pointer' }} 
              onClick={() => alert("Pour réinitialiser votre mot de passe, contactez l'administrateur informatique ou le DAF.")}
            >
              Mot de passe oublié ?
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-login-submit"
            disabled={loading}
          >
            {loading ? (
              <span>Connexion en cours...</span>
            ) : (
              <>
                <span>Se connecter</span>
                <span style={{ fontSize: '1.1rem' }}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="login-footer-link">
          <Link to="/">
            <span>← Revenir au site vitrine Heistal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
