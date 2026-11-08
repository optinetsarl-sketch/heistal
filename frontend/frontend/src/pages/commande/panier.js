import { useSyncExternalStore } from 'react';

// Un seul panier pour tout le site : l'accueil et la page des familles y ajoutent, « Commander » le lit.
// Il reste dans le navigateur du client jusqu'à la commande. Les prix affichés sont indicatifs :
// le serveur recalcule toujours le total avec le catalogue.
const CLE_PANIER = 'heistal_panier';
const CLE_CODES = 'heistal_mes_commandes';
const CODES_RETENUS_MAX = 20;
export const QUANTITE_MAX = 999;

const abonnes = new Set();

function lire(cle, defaut) {
  try {
    const valeur = JSON.parse(localStorage.getItem(cle));
    return Array.isArray(valeur) ? valeur : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Navigation privée ou stockage plein : le panier vit le temps de la page.
  }
}

let lignes = lire(CLE_PANIER, []).filter((ligne) => Number.isInteger(ligne?.id) && ligne.quantite > 0);

function publier(nouvelles) {
  lignes = nouvelles;
  ecrire(CLE_PANIER, lignes);
  abonnes.forEach((rappel) => rappel());
}

function sAbonner(rappel) {
  abonnes.add(rappel);
  // Un autre onglet a changé le panier : on le relit.
  const surStockage = (e) => {
    if (e.key === CLE_PANIER) {
      lignes = lire(CLE_PANIER, []);
      rappel();
    }
  };
  window.addEventListener('storage', surStockage);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener('storage', surStockage);
  };
}

export function usePanier() {
  return useSyncExternalStore(sAbonner, () => lignes, () => lignes);
}

// Accepte un produit de l'API (nom, prix_vente) comme un produit déjà mis en forme (name, price).
export function versLigne(produit) {
  return {
    id: produit.id,
    nom: produit.nom ?? produit.name,
    prix: produit.prix_vente ?? produit.price ?? 0,
    unite: produit.unite ?? produit.unit ?? '',
    image: produit.image || produit.famille_image || '',
  };
}

export function ajouterAuPanier(produit, quantite = 1) {
  const ligne = versLigne(produit);
  const existante = lignes.find((l) => l.id === ligne.id);
  publier(
    existante
      ? lignes.map((l) => (l.id === ligne.id ? { ...l, ...ligne, quantite: Math.min(QUANTITE_MAX, l.quantite + quantite) } : l))
      : [...lignes, { ...ligne, quantite: Math.min(QUANTITE_MAX, quantite) }]
  );
}

export function changerQuantite(id, quantite) {
  publier(quantite > 0 ? lignes.map((l) => (l.id === id ? { ...l, quantite: Math.min(QUANTITE_MAX, quantite) } : l)) : lignes.filter((l) => l.id !== id));
}

export function retirerDuPanier(id) {
  publier(lignes.filter((l) => l.id !== id));
}

export function viderPanier() {
  publier([]);
}

// Met à jour nom, prix et image avec le catalogue du moment ; retire ce qui n'est plus vendu.
export function actualiserPanier(produits) {
  const parId = new Map(produits.map((p) => [p.id, p]));
  const retires = lignes.filter((l) => !parId.has(l.id));
  publier(lignes.filter((l) => parId.has(l.id)).map((l) => ({ ...l, ...versLigne(parId.get(l.id)) })));
  return retires;
}

export const nombreArticles = (panier) => panier.reduce((total, l) => total + l.quantite, 0);
export const totalPanier = (panier) => panier.reduce((total, l) => total + l.prix * l.quantite, 0);

// Les commandes passées sans compte sur cet appareil : le client les retrouve sans retaper le code.
export function codesRetenus() {
  return lire(CLE_CODES, []).filter((code) => typeof code === 'string');
}

export function retenirCode(code) {
  ecrire(CLE_CODES, [code, ...codesRetenus().filter((c) => c !== code)].slice(0, CODES_RETENUS_MAX));
}

export function oublierCode(code) {
  ecrire(CLE_CODES, codesRetenus().filter((c) => c !== code));
}
