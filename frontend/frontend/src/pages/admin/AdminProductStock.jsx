import React, { useState } from 'react';
import { API_BASE, apiErrorMessage, apiFetch } from '../../api';
import { boutiquesActives, comparerNoms, estEntierPositif, nomBoutique, quantiteAvecUnite } from './catalogue';
import { Fenetre, MessageErreur } from './CatalogueUi';

// Toutes les boutiques actives, plus une boutique fermée où il resterait du stock à retirer.
function lignesDeStock(produit, boutiques) {
  const enStock = produit.stocks.map(({ boutique, boutique_nom, quantite }) => ({ id: boutique, nom: boutique_nom, avant: quantite }));
  const autres = boutiquesActives(boutiques)
    .filter(({ id }) => !enStock.some((ligne) => ligne.id === id))
    .map(({ id, nom }) => ({ id, nom, avant: 0 }));
  return [...enStock, ...autres].sort(comparerNoms);
}

export default function FenetreStock({ produit, boutiques, onFermer, onEnregistre }) {
  const [lignes] = useState(() => lignesDeStock(produit, boutiques));
  const [quantites, setQuantites] = useState(() => Object.fromEntries(lignes.map(({ id, avant }) => [id, avant])));
  const [erreur, setErreur] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  const saisieValide = lignes.every(({ id }) => estEntierPositif(quantites[id]));
  const variation = ({ id, avant }) => Number(quantites[id]) - avant;
  const aChange = lignes.some((ligne) => variation(ligne) !== 0);
  const total = lignes.reduce((somme, { id }) => somme + (Number(quantites[id]) || 0), 0);

  const modifier = (id, valeur) => {
    setErreur('');
    setQuantites((actuelles) => ({ ...actuelles, [id]: valeur }));
  };

  const ajouter = (id, pas) => modifier(id, Math.max(0, (Number(quantites[id]) || 0) + pas));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!saisieValide) {
      setErreur('Saisissez un nombre entier, sans virgule, égal ou supérieur à 0.');
      return;
    }

    setEnregistrement(true);
    try {
      // Le serveur reçoit la différence : une vente passée pendant la saisie reste comptée.
      const stocks = lignes.filter((ligne) => variation(ligne) !== 0).map((ligne) => ({ boutique: ligne.id, variation: variation(ligne) }));
      const reponse = await apiFetch(`${API_BASE}/products/${produit.id}/adjust_stock/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocks }),
      });
      if (reponse.ok) {
        onEnregistre(await reponse.json());
        return;
      }
      setErreur(await apiErrorMessage(reponse, "Le stock n'a pas été modifié."));
    } catch (err) {
      console.warn('Ajustement du stock impossible :', err);
      setErreur("Serveur injoignable : le stock n'a pas été modifié.");
    }
    setEnregistrement(false);
  };

  return (
    <Fenetre titre="Ajuster le stock" sousTitre={produit.nom} onFermer={onFermer}>
      <form className="pr-dialog-form" onSubmit={enregistrer} noValidate>
        <div className="pr-dialog-body">
          {lignes.map((ligne) => {
            const { id, nom, avant } = ligne;
            const court = nomBoutique(nom);
            const difference = variation(ligne);
            return (
              <div key={id} className="pr-stepper">
                <div className="pr-stepper-label">
                  <label htmlFor={`stock-${id}`}>{court}</label>
                  {difference !== 0 && estEntierPositif(quantites[id]) && (
                    <span>Avant : {avant} ({difference > 0 ? '+' : ''}{difference})</span>
                  )}
                </div>
                <div className="pr-stepper-control">
                  <button type="button" onClick={() => ajouter(id, -1)} aria-label={`Retirer 1 à ${court}`}>−</button>
                  <input
                    id={`stock-${id}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={quantites[id]}
                    onChange={(e) => modifier(id, e.target.value)}
                  />
                  <button type="button" onClick={() => ajouter(id, 1)} aria-label={`Ajouter 1 à ${court}`}>+</button>
                </div>
              </div>
            );
          })}
          <p className="pr-stepper-total">Total : <strong>{quantiteAvecUnite(total, produit.unite)}</strong></p>
          <MessageErreur>{erreur}</MessageErreur>
        </div>
        <footer className="pr-dialog-foot">
          <button type="button" className="btn btn-outline" onClick={onFermer} disabled={enregistrement}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={enregistrement || !aChange}>
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </footer>
      </form>
    </Fenetre>
  );
}
