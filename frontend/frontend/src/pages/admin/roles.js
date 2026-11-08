// Les quatre rôles, et les pages que chacun peut ouvrir. Le serveur vérifie les mêmes règles de son côté.

export const SUPER_ADMIN = 'SUPER_ADMIN';
export const SERVICE_COMMERCIAL = 'SERVICE_COMMERCIAL';
export const CONTROLEUR = 'CONTROLEUR';
export const CAISSIERE = 'CAISSIERE';

export const ROLES = [
  { valeur: SUPER_ADMIN, libelle: 'Super admin', icone: '👑', description: 'Gère tout, y compris les comptes et les boutiques.' },
  { valeur: SERVICE_COMMERCIAL, libelle: 'Service commercial', icone: '📊', description: 'Gère les produits, le stock, les commandes et les clients.' },
  { valeur: CONTROLEUR, libelle: 'Contrôleur', icone: '🔍', description: 'Consulte les produits et les mouvements, sans rien modifier.' },
  { valeur: CAISSIERE, libelle: 'Caissière', icone: '🧾', description: 'Vend dans sa boutique, et seulement dans celle-ci.' },
];

const PAGES_PAR_ROLE = {
  [SERVICE_COMMERCIAL]: ['/admin', '/admin/dashboard', '/admin/pos', '/admin/products', '/admin/commandes', '/admin/orders', '/admin/clients', '/admin/mouvements'],
  [CONTROLEUR]: ['/admin', '/admin/dashboard', '/admin/products', '/admin/mouvements'],
  [CAISSIERE]: ['/admin/pos'],
};

// Sans règle pour ce rôle (super admin, ou session pas encore actualisée), la page s'ouvre : le serveur reste juge.
export function peutOuvrir(role, chemin) {
  const pages = PAGES_PAR_ROLE[role];
  if (!pages) return true;
  const adresse = chemin.replace(/\/+$/, '');
  return pages.some((page) => adresse === page || (page !== '/admin' && adresse.startsWith(`${page}/`)));
}

// Une caissière arrive directement dans sa boutique.
export function accueilDuRole(utilisateur) {
  if (utilisateur?.role !== CAISSIERE) return '/admin/dashboard';
  return utilisateur.boutique ? `/admin/pos/${utilisateur.boutique}` : '/admin/pos';
}

export const catalogueEnLecture = (role) => role === CONTROLEUR;
