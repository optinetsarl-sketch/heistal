import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, apiErrorMessage, apiFetch, getUser } from '../../api';
import { formaterPrix, nomBoutique, normaliser } from './catalogue';
import { Fenetre } from './CatalogueUi';
import { dateCourte, tempsRestant } from './commandes';
import RetraitCommande, { FicheCommande, PastilleCommande } from './RetraitCommande';
import { CONTROLEUR, SERVICE_COMMERCIAL, SUPER_ADMIN } from './roles';
import './productForm.css';
import './products.css';
import './salesSpaces.css';
import './orders.css';

const ACTUALISATION = 30000;

const FILTRES = [
  { valeur: 'a_retirer', libelle: 'À retirer', statuts: ['EN_ATTENTE', 'PRETE'] },
  { valeur: 'RECUPEREE', libelle: 'Remises', statuts: ['RECUPEREE'] },
  { valeur: 'EXPIREE', libelle: 'Expirées', statuts: ['EXPIREE'] },
  { valeur: 'ANNULEE', libelle: 'Annulées', statuts: ['ANNULEE'] },
  { valeur: '', libelle: 'Toutes', statuts: null },
];

const dansFiltre = (commande, filtre) => {
  const statuts = FILTRES.find((f) => f.valeur === filtre)?.statuts;
  return !statuts || statuts.includes(commande.statut);
};

const resumeArticles = (commande) => commande.items.map((ligne) => `${ligne.quantite} × ${ligne.nom_produit}`).join(', ');

export default function AdminOrders() {
  const role = getUser()?.role;
  const peutGerer = !role || [SUPER_ADMIN, SERVICE_COMMERCIAL].includes(role);
  const peutVendre = role !== CONTROLEUR;

  const [commandes, setCommandes] = useState(null);
  const [panne, setPanne] = useState(false);
  const [filtre, setFiltre] = useState('a_retirer');
  const [boutique, setBoutique] = useState('');
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState(null);
  const [message, setMessage] = useState(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(async () => {
    try {
      const reponse = await apiFetch(`${API_BASE}/commandes/`);
      if (!reponse.ok) throw new Error('Réponse refusée par le serveur');
      setCommandes(await reponse.json());
      setPanne(false);
      dejaCharge.current = true;
    } catch (err) {
      console.warn('Chargement des commandes impossible :', err);
      // Jamais de commandes inventées : un message, et la dernière liste reçue reste affichée.
      if (dejaCharge.current) setMessage({ texte: "Impossible d'actualiser les commandes. Vérifiez la connexion.", erreur: true });
      else setPanne(true);
    }
  }, []);

  useEffect(() => {
    charger();
    const minuteur = setInterval(() => {
      if (document.visibilityState === 'visible') charger();
    }, ACTUALISATION);
    return () => clearInterval(minuteur);
  }, [charger]);

  useEffect(() => {
    if (!message) return undefined;
    const minuteur = setTimeout(() => setMessage(null), message.erreur ? 8000 : 4000);
    return () => clearTimeout(minuteur);
  }, [message]);

  const remplacer = (nouvelle) => {
    setCommandes((actuelles) => actuelles?.map((c) => (c.id === nouvelle.id ? nouvelle : c)) ?? actuelles);
    setOuverte((actuelle) => (actuelle?.id === nouvelle.id ? nouvelle : actuelle));
  };

  const changerStatut = async (commande, statut) => {
    if (statut === 'ANNULEE' && !window.confirm(`Annuler la commande ${commande.code} de ${commande.client_nom} ?`)) return null;
    try {
      const reponse = await apiFetch(`${API_BASE}/commandes/${commande.id}/changer_statut/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!reponse.ok) {
        setMessage({ texte: await apiErrorMessage(reponse, "Le statut n'a pas changé."), erreur: true });
        return null;
      }
      const nouvelle = await reponse.json();
      remplacer(nouvelle);
      setMessage({ texte: statut === 'PRETE' ? `Commande ${commande.code} marquée prête.` : `Commande ${commande.code} annulée.` });
      return nouvelle;
    } catch (err) {
      console.warn('Changement de statut impossible :', err);
      setMessage({ texte: "Serveur injoignable : le statut n'a pas changé.", erreur: true });
      return null;
    }
  };

  const encaissee = (nouvelle) => {
    remplacer(nouvelle);
    charger();
  };

  if (panne) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Impossible de charger les commandes</p>
        <p>Vérifiez votre connexion, puis réessayez.</p>
        <button type="button" className="btn btn-primary" onClick={charger}>Réessayer</button>
      </div>
    );
  }

  const boutiques = commandes
    ? [...new Map(commandes.filter((c) => c.boutique).map((c) => [c.boutique, c.boutique_info?.nom ?? c.boutique_retrait])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
    : [];
  const texte = normaliser(recherche.trim());
  const trouvees = (commandes ?? []).filter(
    (c) =>
      (!boutique || String(c.boutique) === boutique) &&
      (!texte || normaliser(`${c.code} ${c.code.replace('-', '')} ${c.client_nom} ${c.client_telephone}`).includes(texte))
  );
  const visibles = trouvees.filter((c) => dansFiltre(c, filtre));

  return (
    <div className="co-page">
      <section className="co-carte-retrait" aria-labelledby="co-titre-retrait">
        <h2 id="co-titre-retrait" className="co-titre">Le client est là ?</h2>
        <p className="pr-hint">Tapez le code de sa commande : elle s'affiche en entier, prête à encaisser.</p>
        <RetraitCommande peutVendre={peutVendre} peutGerer={peutGerer} onStatut={changerStatut} onEncaissee={encaissee} autoFocus={false} />
      </section>

      <div className="pr-filters">
        <label className="pr-search">
          <span className="pf-visually-hidden">Rechercher une commande</span>
          <span aria-hidden="true">🔍</span>
          <input type="search" className="pr-search-input" placeholder="Code, nom ou téléphone" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </label>
        {boutiques.length > 1 && (
          <select className="pf-input pr-select" aria-label="Filtrer par boutique" value={boutique} onChange={(e) => setBoutique(e.target.value)}>
            <option value="">Toutes les boutiques</option>
            {boutiques.map(([id, nom]) => <option key={id} value={id}>{nomBoutique(nom)}</option>)}
          </select>
        )}
        <div className="pr-chips" role="group" aria-label="Filtrer par état">
          {FILTRES.map(({ valeur, libelle }) => (
            <button key={libelle} type="button" className={`pr-chip ${filtre === valeur ? 'active' : ''}`} aria-pressed={filtre === valeur} onClick={() => setFiltre(valeur)}>
              {libelle} <span>{trouvees.filter((c) => dansFiltre(c, valeur)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {!commandes && <div className="pr-state-box"><p>Chargement des commandes…</p></div>}
      {commandes && visibles.length === 0 && (
        <div className="pr-state-box">
          <p>{commandes.length === 0 ? 'Aucune commande passée sur le site pour le moment.' : 'Aucune commande ici.'}</p>
        </div>
      )}

      {visibles.length > 0 && (
        <ul className="co-liste">
          {visibles.map((commande) => {
            const reste = tempsRestant(commande);
            return (
              <li key={commande.id} className="co-ligne">
                <div className="co-ligne-haut">
                  <span className="co-ligne-code">{commande.code}</span>
                  <PastilleCommande statut={commande.statut} />
                  {reste && <span className={`co-reste ${reste.urgent ? 'co-urgent' : ''}`}>{reste.texte}</span>}
                </div>
                <div className="co-ligne-client">
                  <strong>{commande.client_nom}</strong>
                  {commande.client_telephone && <a href={`tel:${commande.client_telephone.replace(/\s/g, '')}`}>{commande.client_telephone}</a>}
                </div>
                <p className="co-ligne-articles">{resumeArticles(commande)}</p>
                <div className="co-ligne-bas">
                  <span>{nomBoutique(commande.boutique_info?.nom ?? commande.boutique_retrait)} · {dateCourte(commande.date_commande)}</span>
                  <strong>{formaterPrix(commande.total)}</strong>
                  <button type="button" className="pr-btn" onClick={() => setOuverte(commande)} aria-label={`Ouvrir la commande ${commande.code}`}>Ouvrir</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {ouverte && (
        <Fenetre titre={`Commande ${ouverte.code}`} sousTitre={ouverte.client_nom} onFermer={() => setOuverte(null)}>
          <div className="pr-dialog-body">
            <FicheCommande
              key={`${ouverte.id}-${ouverte.statut}`}
              commande={ouverte}
              peutVendre={peutVendre}
              peutGerer={peutGerer}
              onStatut={changerStatut}
              onModifiee={(nouvelle, texteSucces) => {
                encaissee(nouvelle);
                setMessage({ texte: texteSucces });
              }}
            />
          </div>
        </Fenetre>
      )}

      {message && (
        <div className={`pr-toast ${message.erreur ? 'pr-toast-erreur' : ''}`} role="status">{message.texte}</div>
      )}
    </div>
  );
}
