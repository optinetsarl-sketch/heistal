// Données et calculs partagés par les écrans du catalogue.

export const CATALOGUE_URL = '/admin/products';

export const UNITES = [
  { valeur: 'kg', libelle: 'Kilo (kg)', court: 'kg', icone: '⚖️' },
  { valeur: 'carton', libelle: 'Carton', court: 'carton', icone: '📦' },
  { valeur: 'sachet', libelle: 'Sachet', court: 'sachet', icone: '🛍️' },
  { valeur: 'piece', libelle: 'Pièce', court: 'pièce', icone: '🧊' },
  { valeur: 'boite', libelle: 'Boîte', court: 'boîte', icone: '🥫' },
];

// Clés : valeurs de `statut_stock` renvoyées par l'API, calculées avec le seuil d'alerte de chaque produit.
export const ETATS_STOCK = {
  Normal: { libelle: 'En stock', classe: 'ok' },
  Faible: { libelle: 'Stock faible', classe: 'faible' },
  Rupture: { libelle: 'Rupture', classe: 'rupture' },
};

// Sur téléphone, on tape souvent sans accents : « boeuf » doit trouver « Bœuf ».
export function normaliser(texte = '') {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/gi, 'oe').toLowerCase();
}

export const comparerNoms = (a, b) => a.nom.localeCompare(b.nom, 'fr');

// Seules les boutiques actives reçoivent du stock et encaissent des ventes.
export const boutiquesActives = (boutiques) => boutiques.filter((boutique) => boutique.statut === 'Active').sort(comparerNoms);

// À l'écran, « Tokoin Wuiti » suffit : le mot « Boutique » n'apporte rien.
export const nomBoutique = (nom = '') => nom.replace(/^boutique\s+/i, '');

// L'espace fine du format français est presque invisible à petite taille : 2641000 au lieu de 2 641 000.
export const formaterNombre = (nombre) => Number(nombre || 0).toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0');

export const formaterPrix = (prix) => `${formaterNombre(prix)} FCFA`;

export const uniteCourte = (unite) => UNITES.find((u) => u.valeur === unite)?.court ?? unite;

export function uniteAuPluriel(unite) {
  const connue = UNITES.find((u) => u.valeur === unite);
  if (!connue) return unite;
  return unite === 'kg' ? connue.court : `${connue.court}s`;
}

export const quantiteAvecUnite = (quantite, unite) => (
  `${quantite} ${quantite > 1 ? uniteAuPluriel(unite) : uniteCourte(unite)}`.trim()
);

export const compter = (nombre, singulier, pluriel = `${singulier}s`) => `${nombre} ${nombre > 1 ? pluriel : singulier}`;

export const estEntierPositif = (valeur) => valeur !== '' && Number.isInteger(Number(valeur)) && Number(valeur) >= 0;
