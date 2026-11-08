import React, { useState } from 'react';
import { API_BASE, apiFetch } from '../../api';
import { comparerNoms, compter } from './catalogue';
import { Fenetre, MessageErreur } from './CatalogueUi';

export function FenetreTypeStock({ type, onFermer, onEnregistre }) {
  const estModification = Boolean(type);
  const [form, setForm] = useState({ nom: type?.nom ?? '', description: type?.description ?? '' });
  const [erreurs, setErreurs] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);

  const modifier = (champ, valeur) => {
    setForm((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreurs(({ [champ]: _corrige, ...autres }) => autres);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      setErreurs({ nom: 'Saisissez le nom du type de stock.' });
      return;
    }

    setEnregistrement(true);
    try {
      const reponse = await apiFetch(estModification ? `${API_BASE}/types-stock/${type.id}/` : `${API_BASE}/types-stock/`, {
        method: estModification ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: form.nom.trim(), description: form.description.trim() }),
      });
      if (reponse.ok) {
        onEnregistre(await reponse.json(), estModification);
        return;
      }

      const donnees = await reponse.json().catch(() => ({}));
      const texte = (valeur) => (Array.isArray(valeur) ? valeur.join(' ') : valeur);
      setErreurs({
        nom: texte(donnees.nom),
        description: texte(donnees.description),
        general: donnees.nom || donnees.description ? undefined : donnees.detail || "L'enregistrement a échoué. Réessayez.",
      });
    } catch (err) {
      console.warn('Enregistrement du type de stock impossible :', err);
      setErreurs({ general: "Serveur injoignable : le type de stock n'a pas été enregistré." });
    }
    setEnregistrement(false);
  };

  return (
    <Fenetre titre={estModification ? 'Modifier le type de stock' : 'Nouveau type de stock'} sousTitre={type?.nom} onFermer={onFermer}>
      <form className="pr-dialog-form" onSubmit={enregistrer} noValidate>
        <div className="pr-dialog-body">
          <div className="pf-field">
            <label htmlFor="type-nom">Nom *</label>
            <input
              id="type-nom"
              type="text"
              className="pf-input"
              placeholder="Ex : Chambre froide"
              value={form.nom}
              onChange={(e) => modifier('nom', e.target.value)}
              aria-invalid={Boolean(erreurs.nom)}
            />
            <MessageErreur>{erreurs.nom}</MessageErreur>
          </div>
          <div className="pf-field">
            <label htmlFor="type-description">Description</label>
            <textarea
              id="type-description"
              rows="3"
              className="pf-input"
              placeholder="À quoi sert ce stock ?"
              value={form.description}
              onChange={(e) => modifier('description', e.target.value)}
            />
            <MessageErreur>{erreurs.description}</MessageErreur>
          </div>
          <MessageErreur>{erreurs.general}</MessageErreur>
        </div>
        <footer className="pr-dialog-foot">
          <button type="button" className="btn btn-outline" onClick={onFermer} disabled={enregistrement}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={enregistrement}>
            {enregistrement ? 'Enregistrement…' : estModification ? 'Enregistrer' : 'Créer'}
          </button>
        </footer>
      </form>
    </Fenetre>
  );
}

export default function AdminStockTypes({ typesStock, produits, lectureSeule, onNouveau, onModifier, onSupprimer, onVoirProduits }) {
  const nombreDeProduits = (type) => produits.filter((produit) => produit.type_stock === type.id).length;

  return (
    <>
      <div className="pr-section-head">
        <p className="pr-hint">Facultatif : le type de stock indique où un produit est conservé, par exemple en chambre froide ou en réserve.</p>
        {!lectureSeule && <button type="button" className="pr-btn" onClick={onNouveau}>+ Nouveau type de stock</button>}
      </div>

      {typesStock.length === 0 ? (
        <div className="pr-state-box"><p>Aucun type de stock pour le moment.</p></div>
      ) : (
        <ul className="pr-rows pr-types">
          {[...typesStock].sort(comparerNoms).map((type) => {
            const nombre = nombreDeProduits(type);
            return (
              <li key={type.id} className="pr-type-row">
                <div className="pr-type-names">
                  <h2 className="pr-row-name">{type.nom}</h2>
                  {type.description && <p className="pr-row-ref">{type.description}</p>}
                </div>
                <span className="pr-group-count">{nombre > 0 ? compter(nombre, 'produit') : 'Aucun produit'}</span>
                <div className="pr-row-actions">
                  {nombre > 0 && <button type="button" className="pr-btn" onClick={() => onVoirProduits(type)}>Voir les produits</button>}
                  {!lectureSeule && <button type="button" className="pr-btn" onClick={() => onModifier(type)} aria-label={`Modifier ${type.nom}`}>Modifier</button>}
                  {!lectureSeule && (
                    <button
                      type="button"
                      className="pr-btn pr-btn-danger pr-btn-icon"
                      onClick={() => onSupprimer(type, nombre)}
                      aria-label={`Supprimer ${type.nom}`}
                      title="Supprimer ce type de stock"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
