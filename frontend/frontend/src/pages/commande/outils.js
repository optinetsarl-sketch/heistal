// Outils partagés des pages client (commander, mes commandes).

export const TELEPHONE_BOUTIQUE = '+228 22 26 42 29';
export const WHATSAPP_BOUTIQUE = '22896373842';

export const STATUTS = {
  EN_ATTENTE: { libelle: 'Reçue', classe: 'attente' },
  PRETE: { libelle: 'Prête', classe: 'prete' },
  RECUPEREE: { libelle: 'Récupérée', classe: 'recuperee' },
  EXPIREE: { libelle: 'Expirée', classe: 'expiree' },
  ANNULEE: { libelle: 'Annulée', classe: 'annulee' },
};

export const formaterPrix = (montant) => `${Number(montant || 0).toLocaleString('fr-FR')} FCFA`;

export function formaterDate(iso, avecHeure = true) {
  if (!iso) return '';
  const date = new Date(iso);
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return avecHeure ? `${jour} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : jour;
}

// Les chiffres seuls, sans l'indicatif du Togo : la même règle que le serveur.
export function chiffresDuTelephone(valeur) {
  let chiffres = String(valeur || '').replace(/\D/g, '');
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);
  if (chiffres.startsWith('228') && chiffres.length === 11) chiffres = chiffres.slice(3);
  return chiffres;
}

export const telephoneValide = (valeur) => {
  const longueur = chiffresDuTelephone(valeur).length;
  return longueur >= 8 && longueur <= 15;
};

export const pluriel = (nombre, mot) => `${nombre} ${mot}${nombre > 1 ? 's' : ''}`;
