import React, { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FenetreStock from './AdminProductStock';
import { CATALOGUE_URL, ETATS_STOCK, comparerNoms, compter, formaterPrix, nomBoutique, normaliser, uniteCourte } from './catalogue';
import { Vignette } from './CatalogueUi';

const FILTRES_ETAT = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'Faible', libelle: 'Stock faible' },
  { valeur: 'Rupture', libelle: 'En rupture' },
];

function correspond(produit, { recherche, famille, typeStock }) {
  const texte = normaliser(recherche.trim());
  return (
    (!famille || String(produit.famille) === famille) &&
    (!typeStock || String(produit.type_stock) === typeStock) &&
    (!texte || normaliser(`${produit.nom} ${produit.reference}`).includes(texte))
  );
}

function grouperParFamille(produits) {
  const groupes = new Map();
  for (const produit of produits) {
    const cle = produit.famille ?? 'aucune';
    if (!groupes.has(cle)) {
      groupes.set(cle, {
        cle,
        id: produit.famille,
        nom: produit.famille_nom || 'Sans famille',
        image: produit.famille_image,
        icone: produit.famille_icone,
        produits: [],
      });
    }
    groupes.get(cle).produits.push(produit);
  }
  return [...groupes.values()].sort(comparerNoms);
}

function LigneProduit({ produit, lectureSeule, onStock, onSupprimer }) {
  const etat = ETATS_STOCK[produit.statut_stock] ?? ETATS_STOCK.Normal;

  return (
    <li className="pr-row">
      <div className="pr-row-product">
        <Vignette image={produit.image || produit.famille_image} icone={produit.famille_icone} className="pr-thumb" />
        <div className="pr-row-names">
          <p className="pr-row-name">{produit.nom}</p>
          <p className="pr-row-ref">Réf. {produit.reference}</p>
        </div>
      </div>

      <p className="pr-row-price">
        <strong>{formaterPrix(produit.prix_vente)}</strong>
        {produit.unite && <span> / {uniteCourte(produit.unite)}</span>}
      </p>

      {produit.stocks.length > 0 ? (
        <dl className="pr-row-stock">
          {produit.stocks.map(({ boutique, boutique_nom, quantite }) => (
            <div key={boutique}>
              <dt>{nomBoutique(boutique_nom)}</dt>
              <dd className={quantite <= 0 ? 'pr-stock-vide' : ''}>{quantite}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="pr-row-stock pr-stock-aucun">Aucun stock</p>
      )}

      <span className={`pr-badge pr-badge-${etat.classe}`}>{etat.libelle}</span>

      {!lectureSeule && <div className="pr-row-actions">
        <button type="button" className="pr-btn" onClick={() => onStock(produit)}>Ajuster le stock</button>
        <Link className="pr-btn" to={`${CATALOGUE_URL}/${produit.id}/modifier`}>Modifier</Link>
        <button
          type="button"
          className="pr-btn pr-btn-danger pr-btn-icon"
          onClick={() => onSupprimer(produit)}
          aria-label={`Supprimer ${produit.nom}`}
          title="Supprimer ce produit"
        >
          🗑️
        </button>
      </div>}
    </li>
  );
}

export default function AdminProductList({
  produits,
  familles,
  typesStock,
  boutiques,
  filtres,
  onFiltres,
  filtresVides,
  positionListe,
  lectureSeule,
  onStockModifie,
  onSupprimer,
}) {
  const [produitStock, setProduitStock] = useState(null);

  // Après une modification, on retrouve la liste à l'endroit où on l'avait laissée.
  // La position se retient au défilement : au départ de la page, les onglets sont déjà retirés et la faussent.
  useLayoutEffect(() => {
    const zone = document.querySelector('.admin-main');
    if (!zone) return undefined;
    zone.scrollTo(0, positionListe.current);
    const retenirPosition = () => {
      positionListe.current = zone.scrollTop;
    };
    zone.addEventListener('scroll', retenirPosition, { passive: true });
    return () => zone.removeEventListener('scroll', retenirPosition);
  }, [positionListe]);

  const modifierFiltre = (champ, valeur) => onFiltres({ ...filtres, [champ]: valeur });

  const trouves = produits.filter((produit) => correspond(produit, filtres));
  const visibles = filtres.etat ? trouves.filter((produit) => produit.statut_stock === filtres.etat) : trouves;
  const groupes = grouperParFamille(visibles);
  const valeurStock = visibles.reduce((total, produit) => total + produit.stock_total * produit.prix_vente, 0);
  const nombreDansFamille = (famille) => produits.filter((produit) => produit.famille === famille.id).length;
  const typeFiltre = typesStock.find((type) => String(type.id) === filtres.typeStock);
  const filtreActif = Object.values(filtres).some(Boolean);
  const familleFiltree = familles.find((famille) => String(famille.id) === filtres.famille);

  if (produits.length === 0) {
    return (
      <div className="pr-state-box">
        <p className="pr-state-title">Aucun produit pour le moment</p>
        {!lectureSeule && <p>Ajoutez votre premier produit pour commencer votre catalogue.</p>}
        {!lectureSeule && <Link to={`${CATALOGUE_URL}/nouveau`} className="btn btn-primary">+ Ajouter un produit</Link>}
      </div>
    );
  }

  return (
    <>
      <div className="pr-filters">
        <label className="pr-search">
          <span className="pf-visually-hidden">Rechercher un produit</span>
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            className="pr-search-input"
            placeholder="Nom ou référence du produit"
            value={filtres.recherche}
            onChange={(e) => modifierFiltre('recherche', e.target.value)}
          />
        </label>

        <select
          className="pf-input pr-select"
          aria-label="Filtrer par famille"
          value={filtres.famille}
          onChange={(e) => modifierFiltre('famille', e.target.value)}
        >
          <option value="">Toutes les familles</option>
          {[...familles].sort(comparerNoms).map((famille) => (
            <option key={famille.id} value={famille.id}>{famille.nom} ({nombreDansFamille(famille)})</option>
          ))}
        </select>

        <div className="pr-chips" role="group" aria-label="Filtrer par état du stock">
          {FILTRES_ETAT.map(({ valeur, libelle }) => (
            <button
              key={libelle}
              type="button"
              className={`pr-chip ${filtres.etat === valeur ? 'active' : ''}`}
              aria-pressed={filtres.etat === valeur}
              onClick={() => modifierFiltre('etat', valeur)}
            >
              {libelle} <span>{valeur ? trouves.filter((produit) => produit.statut_stock === valeur).length : trouves.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pr-summary">
        <p aria-live="polite">
          <strong>{compter(visibles.length, 'produit')}</strong>
          {' · '}Valeur du stock : <strong>{formaterPrix(valeurStock)}</strong>
        </p>
        {typeFiltre && (
          <button type="button" className="pr-tag" onClick={() => modifierFiltre('typeStock', '')} aria-label={`Retirer le filtre ${typeFiltre.nom}`}>
            {typeFiltre.nom} <span aria-hidden="true">✕</span>
          </button>
        )}
        {filtreActif && (
          <button type="button" className="pf-link" onClick={() => onFiltres(filtresVides)}>Effacer les filtres</button>
        )}
      </div>

      {groupes.length === 0 ? (
        <div className="pr-state-box">
          <p className="pr-state-title">Aucun produit trouvé</p>
          <p>
            {familleFiltree && !filtres.recherche && !filtres.etat && !filtres.typeStock
              ? `La famille ${familleFiltree.nom} ne contient encore aucun produit.`
              : 'Essayez un autre mot ou effacez les filtres.'}
          </p>
        </div>
      ) : (
        <div className="pr-list">
          {groupes.map((groupe) => (
            <section key={groupe.cle} className="pr-group" aria-label={groupe.nom}>
              <header className="pr-group-head">
                <Vignette image={groupe.image} icone={groupe.icone} className="pr-group-image" />
                <h2 className="pr-group-title">{groupe.nom}</h2>
                <span className="pr-group-count">{compter(groupe.produits.length, 'produit')}</span>
                {groupe.id && !lectureSeule && (
                  <Link className="pf-link pr-group-add" to={`${CATALOGUE_URL}/nouveau?famille=${groupe.id}`}>+ Ajouter ici</Link>
                )}
              </header>
              <ul className="pr-rows">
                {[...groupe.produits].sort(comparerNoms).map((produit) => (
                  <LigneProduit key={produit.id} produit={produit} lectureSeule={lectureSeule} onStock={setProduitStock} onSupprimer={onSupprimer} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {produitStock && (
        <FenetreStock
          produit={produitStock}
          boutiques={boutiques}
          onFermer={() => setProduitStock(null)}
          onEnregistre={(produit) => {
            setProduitStock(null);
            onStockModifie(produit);
          }}
        />
      )}
    </>
  );
}
