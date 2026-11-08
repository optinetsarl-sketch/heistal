import React, { useState } from 'react';
import { API_BASE, apiErrorMessage, apiFetch } from '../../api';
import { formaterPrix } from './catalogue';
import { MessageErreur } from './CatalogueUi';
import { ENCAISSABLES, MODES_PAIEMENT, STATUTS_COMMANDE, codeTape, dateCourte, tempsRestant } from './commandes';
import './orders.css';

export function PastilleCommande({ statut }) {
  const infos = STATUTS_COMMANDE[statut] ?? { libelle: statut, classe: 'attente' };
  return <span className={`co-statut co-statut-${infos.classe}`}>{infos.libelle}</span>;
}

// Toute la commande, et ce que la personne à la caisse peut en faire.
export function FicheCommande({ commande, boutiqueCaisse, peutVendre, peutGerer, onModifiee, onStatut }) {
  const [mode, setMode] = useState('Espèces');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const ailleurs = boutiqueCaisse != null && commande.boutique !== Number(boutiqueCaisse);
  const encaissable = peutVendre && ENCAISSABLES.includes(commande.statut) && commande.boutique && !ailleurs;
  const nomBoutique = commande.boutique_info?.nom ?? commande.boutique_retrait;
  const reste = tempsRestant(commande);

  const encaisser = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      const reponse = await apiFetch(`${API_BASE}/commandes/${commande.id}/encaisser/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode_paiement: mode }),
      });
      if (reponse.ok) {
        onModifiee(await reponse.json(), `Commande ${commande.code} encaissée : ${formaterPrix(commande.total)}. Remettez les produits au client.`);
      } else {
        setErreur(await apiErrorMessage(reponse, "La commande n'a pas été encaissée."));
      }
    } catch (err) {
      console.warn('Encaissement impossible :', err);
      setErreur("Serveur injoignable : la commande n'a pas été encaissée. Réessayez.");
    }
    setEnvoi(false);
  };

  return (
    <article className="co-fiche" aria-label={`Commande ${commande.code}`}>
      <header className="co-fiche-haut">
        <p className="co-code">{commande.code}</p>
        <PastilleCommande statut={commande.statut} />
      </header>

      <dl className="co-infos">
        <div><dt>Client</dt><dd>{commande.client_nom}</dd></div>
        <div>
          <dt>Téléphone</dt>
          <dd>{commande.client_telephone ? <a href={`tel:${commande.client_telephone.replace(/\s/g, '')}`}>{commande.client_telephone}</a> : '—'}</dd>
        </div>
        <div><dt>À retirer à</dt><dd>{nomBoutique || '—'}</dd></div>
        <div><dt>Commandée</dt><dd>{dateCourte(commande.date_commande)}</dd></div>
        {reste && <div><dt>Délai</dt><dd className={reste.urgent ? 'co-urgent' : ''}>{reste.texte} (avant {dateCourte(commande.date_expiration)})</dd></div>}
      </dl>

      <ul className="co-lignes">
        {commande.items.map((ligne) => (
          <li key={ligne.id}>
            <span className="co-ligne-quantite">{ligne.quantite} ×</span>
            <span className="co-ligne-nom">{ligne.nom_produit}{ligne.unite ? <small> ({ligne.unite})</small> : null}</span>
            <span className="co-ligne-prix">{formaterPrix(ligne.total_ligne)}</span>
          </li>
        ))}
      </ul>
      <p className="co-total">Total à encaisser <strong>{formaterPrix(commande.total)}</strong></p>

      {commande.statut === 'RECUPEREE' && (
        <p className="co-info co-info-ok">
          Déjà remise au client{commande.date_retrait ? ` ${dateCourte(commande.date_retrait)}` : ''}{commande.vente_reference ? ` · ticket ${commande.vente_reference}` : ''}.
        </p>
      )}
      {commande.statut === 'ANNULEE' && <p className="co-info co-info-alerte">Commande annulée : ne remettez pas les produits.</p>}
      {ailleurs && ENCAISSABLES.includes(commande.statut) && (
        <p className="co-info co-info-alerte">Cette commande est à retirer à la boutique {nomBoutique}. Indiquez-lui l'adresse.</p>
      )}
      {encaissable && commande.statut === 'EXPIREE' && (
        <p className="co-info">Le délai de 24 heures est dépassé : vérifiez que les produits sont bien là avant d'encaisser.</p>
      )}

      {encaissable && (
        <div className="co-encaissement">
          <p className="co-encaissement-titre" id={`co-mode-${commande.id}`}>Le client paie en :</p>
          <div className="co-modes" role="radiogroup" aria-labelledby={`co-mode-${commande.id}`}>
            {MODES_PAIEMENT.map((m) => (
              <button
                key={m.valeur}
                type="button"
                role="radio"
                aria-checked={mode === m.valeur}
                className={`co-mode ${mode === m.valeur ? 'co-mode-choisi' : ''}`}
                onClick={() => setMode(m.valeur)}
              >
                <span aria-hidden="true">{m.icone}</span> {m.libelle}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary co-encaisser" onClick={encaisser} disabled={envoi}>
            {envoi ? 'Encaissement…' : `Encaisser ${formaterPrix(commande.total)} et remettre`}
          </button>
          <p className="co-aide">La vente est enregistrée dans la caisse de {nomBoutique} et le stock est mis à jour.</p>
        </div>
      )}

      {peutGerer && ['EN_ATTENTE', 'EXPIREE'].includes(commande.statut) && (
        <div className="co-gestion">
          <button type="button" className="pr-btn" onClick={() => onStatut(commande, 'PRETE')}>Marquer prête</button>
          <button type="button" className="pr-btn pr-btn-danger" onClick={() => onStatut(commande, 'ANNULEE')}>Annuler la commande</button>
        </div>
      )}
      {peutGerer && commande.statut === 'PRETE' && (
        <div className="co-gestion">
          <button type="button" className="pr-btn pr-btn-danger" onClick={() => onStatut(commande, 'ANNULEE')}>Annuler la commande</button>
        </div>
      )}

      <MessageErreur>{erreur}</MessageErreur>
    </article>
  );
}

// En boutique : on tape le code donné par le client, toute la commande s'affiche.
export default function RetraitCommande({ boutiqueCaisse = null, peutVendre, peutGerer = false, onStatut, onEncaissee, autoFocus = true }) {
  const [code, setCode] = useState('');
  const [commande, setCommande] = useState(null);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [recherche, setRecherche] = useState(false);

  const chercher = async (e) => {
    e.preventDefault();
    setSucces('');
    if (code.replace(/[^A-Za-z0-9]/g, '').length < 6) {
      setErreur('Le code a 6 lettres et chiffres, par exemple K7M-4QX.');
      return;
    }
    setRecherche(true);
    setErreur('');
    setCommande(null);
    try {
      const reponse = await apiFetch(`${API_BASE}/commandes/code/${encodeURIComponent(codeTape(code))}/`);
      if (reponse.ok) setCommande(await reponse.json());
      else setErreur(await apiErrorMessage(reponse, 'Commande introuvable.'));
    } catch (err) {
      console.warn('Recherche de commande impossible :', err);
      setErreur('Serveur injoignable. Vérifiez la connexion, puis réessayez.');
    }
    setRecherche(false);
  };

  const modifiee = (nouvelle, message) => {
    setCommande(nouvelle);
    setSucces(message);
    onEncaissee?.(nouvelle);
  };

  return (
    <div className="co-retrait">
      <form className="co-recherche" onSubmit={chercher} noValidate>
        <label htmlFor="co-code-saisi">Code donné par le client</label>
        <div className="co-recherche-ligne">
          <input
            id="co-code-saisi"
            type="text"
            className="pf-input co-champ-code"
            placeholder="Ex : K7M-4QX"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            autoFocus={autoFocus}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setErreur('');
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={recherche}>{recherche ? 'Recherche…' : 'Afficher'}</button>
        </div>
      </form>
      <MessageErreur>{erreur}</MessageErreur>
      {succes && <p className="co-info co-info-ok" role="status">✓ {succes}</p>}
      {commande && (
        <FicheCommande
          key={`${commande.id}-${commande.statut}`}
          commande={commande}
          boutiqueCaisse={boutiqueCaisse}
          peutVendre={peutVendre}
          peutGerer={peutGerer}
          onModifiee={modifiee}
          onStatut={async (c, statut) => {
            const nouvelle = await onStatut?.(c, statut);
            if (nouvelle) setCommande(nouvelle);
          }}
        />
      )}
    </div>
  );
}
