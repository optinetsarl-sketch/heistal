import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE, getToken } from './api';

// Compte les visiteurs du site public pour le tableau de bord. Aucune donnée personnelle :
// chaque navigateur tire au hasard un identifiant qu'il garde, et le serveur le compte une fois par jour.
const CLE = 'heistal_visiteur';
const FORMAT = /^[A-Za-z0-9-]{8,64}$/;
const PAGES_DU_PERSONNEL = /^\/(admin|connexion|login)(\/|$)/;

function nouvelIdentifiant() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Site servi sans HTTPS : randomUUID n'existe pas, getRandomValues si.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (octet) => octet.toString(16).padStart(2, '0')).join('');
}

function identifiant() {
  try {
    let id = localStorage.getItem(CLE);
    if (!id || !FORMAT.test(id)) {
      id = nouvelIdentifiant();
      localStorage.setItem(CLE, id);
    }
    return id;
  } catch {
    return null; // stockage bloqué : on ne compte pas plutôt que de compter chaque page comme un nouveau visiteur
  }
}

export function useCompterVisites() {
  const { pathname } = useLocation();

  useEffect(() => {
    // L'équipe ne se compte pas elle-même : ni les pages de gestion, ni un employé connecté.
    if (PAGES_DU_PERSONNEL.test(pathname) || getToken()) return;
    const visiteur = identifiant();
    if (!visiteur) return;
    fetch(`${API_BASE}/visites/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visiteur }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
}
