// Accès à l'API pour l'espace collaborateur : chaque appel porte le jeton de session.
const TOKEN_KEY = 'heistal_token';
const USER_KEY = 'heistal_user';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000/api' : '/api');

// Adresse complète d'une image : en développement, les fichiers envoyés sont servis par Django.
export const getImageUrl = (img) => {
  if (!img) return '/familles/volaille.jpg';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
  if (img.startsWith('/media/')) {
    const backendHost = (typeof window !== 'undefined' && window.location.port === '5173') ? 'http://127.0.0.1:8000' : '';
    return `${backendHost}${img}`;
  }
  return img;
};

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveSession(user, token) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    // Session expirée ou révoquée : retour à la page de connexion.
    clearSession();
    window.location.assign('/connexion');
  }
  return response;
}

// Extrait le message d'une réponse d'erreur de l'API (detail, message ou erreurs par champ).
export async function apiErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (data.detail || data.message) {
      return data.detail || data.message;
    }
    const erreurs = Object.values(data).flat().filter((valeur) => typeof valeur === 'string');
    return erreurs.length ? erreurs.join(' ') : fallback;
  } catch {
    return fallback;
  }
}
