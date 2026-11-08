import { useSyncExternalStore } from 'react';
import { API_BASE } from '../../api';

// Session de l'espace client, rangée à part de celle du personnel : un employé qui commande
// sur le site depuis le même navigateur reste un simple client pour cette commande.
const CLE_JETON = 'heistal_client_token';
const CLE_CLIENT = 'heistal_client';

const abonnes = new Set();

function lireClient() {
  try {
    return localStorage.getItem(CLE_JETON) ? JSON.parse(localStorage.getItem(CLE_CLIENT)) : null;
  } catch {
    return null;
  }
}

let client = lireClient();

function publier() {
  client = lireClient();
  abonnes.forEach((rappel) => rappel());
}

export function useClientConnecte() {
  return useSyncExternalStore(
    (rappel) => {
      abonnes.add(rappel);
      return () => abonnes.delete(rappel);
    },
    () => client,
    () => client
  );
}

function jeton() {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}

export function ouvrirSessionClient(fiche, cle) {
  try {
    localStorage.setItem(CLE_CLIENT, JSON.stringify(fiche));
    localStorage.setItem(CLE_JETON, cle);
  } catch {
    // Stockage indisponible : la session ne survivra pas au rechargement de la page.
  }
  publier();
}

export function fermerSessionClient() {
  const cle = jeton();
  try {
    localStorage.removeItem(CLE_CLIENT);
    localStorage.removeItem(CLE_JETON);
  } catch {
    // rien à effacer
  }
  publier();
  if (cle) {
    fetch(`${API_BASE}/logout/`, { method: 'POST', headers: { Authorization: `Bearer ${cle}` } }).catch(() => {});
  }
}

// Appel à l'API au nom du client connecté, s'il l'est. Une session expirée est simplement fermée.
export async function clientFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const cle = jeton();
  if (cle) headers.set('Authorization', `Bearer ${cle}`);
  const reponse = await fetch(url, { ...options, headers });
  if (reponse.status === 401 && cle) {
    try {
      localStorage.removeItem(CLE_CLIENT);
      localStorage.removeItem(CLE_JETON);
    } catch {
      // rien à effacer
    }
    publier();
  }
  return reponse;
}
