import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE, apiFetch } from '../../api';
import { compter, formaterNombre, formaterPrix, nomBoutique } from './catalogue';
import './products.css';
import './productForm.css';
import './movements.css';

const PERIODES = [
  { valeur: '0', libelle: "Aujourd'hui" },
  { valeur: '7', libelle: '7 jours' },
  { valeur: '30', libelle: '30 jours' },
  { valeur: 'tout', libelle: 'Tout' },
];

const TYPES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'VENTE', libelle: 'Ventes' },
  { valeur: 'ENTREE', libelle: 'Entrées' },
  { valeur: 'SORTIE', libelle: 'Sorties' },
  { valeur: 'STOCK_DEPART', libelle: 'Stock de départ' },
  { valeur: 'PRODUIT', libelle: 'Produits' },
  { valeur: 'COMPTE', libelle: 'Comptes' },
  { valeur: 'CONNEXION', libelle: 'Connexions' },
];

const CLASSES_TYPE = {
  VENTE: 'vente', ENTREE: 'entree', STOCK_DEPART: 'entree', SORTIE: 'sortie', PRODUIT: 'neutre', COMPTE: 'neutre', CONNEXION: 'neutre',
};

function dateDepuis(periode) {
  if (periode === 'tout') return '';
  const date = new Date();
  date.setDate(date.getDate() - Number(periode));
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

const dateLisible = (date) => new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function LigneMouvement({ mouvement }) {
  const { type, type_libelle: libelle, date, produit_nom: produit, description, reference, quantite, stock_apres: stockApres, montant, boutique_nom: boutique, utilisateur_nom: utilisateur } = mouvement;
  return (
    <li className="mv-ligne">
      <time className="mv-date" dateTime={date}>{dateLisible(date)}</time>
      <span className={`mv-type mv-type-${CLASSES_TYPE[type] ?? 'neutre'}`}>{libelle}</span>
      <div className="mv-objet">
        {produit && <p className="pr-row-name">{produit}</p>}
        {description && <p className="mv-description">{description}</p>}
        {reference && <p className="pr-row-ref">Ticket {reference}</p>}
      </div>
      <div className="mv-chiffres">
        {quantite !== null && <strong className={quantite > 0 ? 'mv-plus' : 'mv-moins'}>{quantite > 0 ? '+' : ''}{quantite}</strong>}
        {stockApres !== null && <span>Reste {stockApres}</span>}
        {montant !== null && <span className="mv-montant">{formaterPrix(montant)}</span>}
      </div>
      <div className="mv-qui">
        {boutique && <span>{nomBoutique(boutique)}</span>}
        {utilisateur && <span className="mv-utilisateur">{utilisateur}</span>}
      </div>
    </li>
  );
}

export default function AdminMovements() {
  const [parametres, setParametres] = useSearchParams();
  const [choix, setChoix] = useState({ boutiques: [], utilisateurs: [] });
  const [donnees, setDonnees] = useState(null);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState(false);
  const derniereDemande = useRef(0);

  const boutique = parametres.get('boutique') ?? '';
  const utilisateur = parametres.get('utilisateur') ?? '';
  const type = parametres.get('type') ?? '';
  const periode = parametres.get('periode') ?? '7';

  const changerFiltre = (champ, valeur) => {
    setPage(1);
    setParametres((actuels) => {
      const suivants = new URLSearchParams(actuels);
      if (valeur) suivants.set(champ, valeur);
      else suivants.delete(champ);
      return suivants;
    }, { replace: true });
  };

  useEffect(() => {
    let annule = false;
    apiFetch(`${API_BASE}/mouvements/filtres/`)
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((resultat) => {
        if (resultat && !annule) setChoix(resultat);
      })
      .catch((err) => console.warn('Chargement des filtres impossible :', err));
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    // Seule la réponse à la dernière demande compte : un filtre plus ancien ne doit pas l'écraser.
    derniereDemande.current += 1;
    const demande = derniereDemande.current;
    const requete = new URLSearchParams({ page: String(page) });
    if (boutique) requete.set('boutique', boutique);
    if (utilisateur) requete.set('utilisateur', utilisateur);
    if (type) requete.set('type', type);
    const depuis = dateDepuis(periode);
    if (depuis) requete.set('depuis', depuis);

    setChargement(true);
    setPanne(false);
    apiFetch(`${API_BASE}/mouvements/?${requete}`)
      .then((reponse) => {
        if (!reponse.ok) throw new Error('Réponse refusée par le serveur');
        return reponse.json();
      })
      .then((resultat) => {
        if (demande !== derniereDemande.current) return;
        setDonnees((actuelles) => (
          page > 1 && actuelles ? { ...resultat, resultats: [...actuelles.resultats, ...resultat.resultats] } : resultat
        ));
      })
      .catch((err) => {
        console.warn('Chargement des mouvements impossible :', err);
        if (demande === derniereDemande.current) setPanne(true);
      })
      .finally(() => {
        if (demande === derniereDemande.current) setChargement(false);
      });
  }, [boutique, utilisateur, type, periode, page]);

  const filtreActif = Boolean(boutique || utilisateur || type || periode !== '7');

  return (
    <div className="mv-page">
      <div className="mv-filtres">
        <select className="pf-input" aria-label="Filtrer par boutique" value={boutique} onChange={(e) => changerFiltre('boutique', e.target.value)}>
          <option value="">Toutes les boutiques</option>
          {choix.boutiques.map(({ id, nom }) => <option key={id} value={id}>{nomBoutique(nom)}</option>)}
        </select>
        <select className="pf-input" aria-label="Filtrer par utilisateur" value={utilisateur} onChange={(e) => changerFiltre('utilisateur', e.target.value)}>
          <option value="">Tous les utilisateurs</option>
          {choix.utilisateurs.map(({ id, nom }) => <option key={id} value={id}>{nom}</option>)}
        </select>
        <div className="pr-chips" role="group" aria-label="Période">
          {PERIODES.map(({ valeur, libelle }) => (
            <button key={valeur} type="button" className={`pr-chip ${periode === valeur ? 'active' : ''}`} aria-pressed={periode === valeur} onClick={() => changerFiltre('periode', valeur)}>{libelle}</button>
          ))}
        </div>
      </div>

      <div className="pr-chips mv-types" role="group" aria-label="Type de mouvement">
        {TYPES.map(({ valeur, libelle }) => (
          <button key={libelle} type="button" className={`pr-chip ${type === valeur ? 'active' : ''}`} aria-pressed={type === valeur} onClick={() => changerFiltre('type', valeur)}>{libelle}</button>
        ))}
      </div>

      {panne && (
        <div className="ev-message" role="alert">
          <p className="ev-message-titre">Impossible de charger les mouvements</p>
          <p>Vérifiez votre connexion, puis réessayez.</p>
        </div>
      )}

      {!panne && donnees && (
        <>
          <dl className="mv-resume">
            <div><dt>Ventes</dt><dd className="mv-montant">{formaterPrix(donnees.resume.ventes)}</dd></div>
            <div><dt>Entrées de stock</dt><dd>{formaterNombre(donnees.resume.entrees)}</dd></div>
            <div><dt>Sorties de stock</dt><dd>{formaterNombre(donnees.resume.sorties)}</dd></div>
            <div><dt>Mouvements</dt><dd>{formaterNombre(donnees.total)}</dd></div>
          </dl>

          {donnees.resultats.length === 0 ? (
            <div className="pr-state-box">
              <p className="pr-state-title">Aucun mouvement</p>
              <p>{filtreActif ? 'Essayez une autre période ou un autre filtre.' : 'Rien sur les 7 derniers jours.'}</p>
            </div>
          ) : (
            <div className="mv-liste">
              <ul className="pr-rows">
                {donnees.resultats.map((mouvement) => <LigneMouvement key={mouvement.id} mouvement={mouvement} />)}
              </ul>
              {donnees.suite && (
                <button type="button" className="pr-btn mv-plus-de" onClick={() => setPage((actuelle) => actuelle + 1)} disabled={chargement}>
                  {chargement ? 'Chargement…' : `Afficher plus (${compter(donnees.total - donnees.resultats.length, 'restant')})`}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {!panne && !donnees && <div className="ev-message"><p>Chargement des mouvements…</p></div>}
    </div>
  );
}
