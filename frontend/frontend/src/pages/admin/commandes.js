// Commandes du site vues par le personnel : statuts, paiements, code tapé, délai restant.

export const STATUTS_COMMANDE = {
  EN_ATTENTE: { libelle: 'À préparer', classe: 'attente' },
  PRETE: { libelle: 'Prête', classe: 'prete' },
  RECUPEREE: { libelle: 'Remise au client', classe: 'remise' },
  EXPIREE: { libelle: 'Expirée', classe: 'expiree' },
  ANNULEE: { libelle: 'Annulée', classe: 'annulee' },
};

export const MODES_PAIEMENT = [
  { valeur: 'Espèces', libelle: 'Espèces', icone: '💵' },
  { valeur: 'TMoney', libelle: 'TMoney', icone: '📱' },
  { valeur: 'Flooz', libelle: 'Flooz', icone: '📱' },
  { valeur: 'Carte', libelle: 'Carte', icone: '💳' },
];

export const ENCAISSABLES = ['EN_ATTENTE', 'PRETE', 'EXPIREE'];

export const dateCourte = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// « k7m 4qx » ou « K7M4QX » s'écrit « K7M-4QX », comme sur le ticket du client.
export function codeTape(texte) {
  const brut = texte.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return brut.length === 6 ? `${brut.slice(0, 3)}-${brut.slice(3)}` : texte.trim().toUpperCase();
}

export function tempsRestant(commande) {
  if (!['EN_ATTENTE', 'PRETE'].includes(commande.statut) || !commande.date_expiration) return null;
  const minutes = Math.floor((new Date(commande.date_expiration).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return { texte: 'Délai dépassé', urgent: true };
  const heures = Math.floor(minutes / 60);
  return { texte: heures > 0 ? `Reste ${heures} h ${String(minutes % 60).padStart(2, '0')}` : `Reste ${minutes} min`, urgent: heures < 2 };
}
