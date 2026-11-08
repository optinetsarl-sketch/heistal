import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { API_BASE, apiFetch, getUser } from '../../api';
import { comparerNoms, compter, formaterPrix, nomBoutique } from './catalogue';
import { CAISSIERE } from './roles';
import './products.css';
import './salesSpaces.css';

export default function AdminSalesSpaces() {
  const [espaces, setEspaces] = useState(null);
  const [panne, setPanne] = useState(false);

  const charger = useCallback(async () => {
    setPanne(false);
    try {
      const reponse = await apiFetch(`${API_BASE}/boutiques/espaces-de-vente/`);
      if (!reponse.ok) throw new Error('Réponse refusée par le serveur');
      setEspaces(await reponse.json());
    } catch (err) {
      console.warn('Chargement des espaces de vente impossible :', err);
      setPanne(true);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  if (panne) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Impossible de charger les boutiques</p>
        <p>Vérifiez votre connexion, puis réessayez.</p>
        <button type="button" className="btn btn-primary" onClick={charger}>Réessayer</button>
      </div>
    );
  }

  if (!espaces) return <div className="ev-message"><p>Chargement des boutiques…</p></div>;

  if (espaces.length === 0 && getUser()?.role === CAISSIERE) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Aucune boutique ne vous est affectée</p>
        <p>Demandez au super admin de vous affecter à une boutique.</p>
      </div>
    );
  }

  if (espaces.length === 0) {
    return (
      <div className="ev-message">
        <p className="ev-message-titre">Aucun espace de vente ouvert</p>
        <p>Une boutique doit avoir le statut « Active » pour vendre.</p>
        <Link to="/admin/boutiques" className="btn btn-primary">Voir les boutiques</Link>
      </div>
    );
  }

  // Une caissière n'a que sa boutique : elle y arrive directement.
  if (espaces.length === 1) return <Navigate to={`/admin/pos/${espaces[0].id}`} replace />;

  const recetteTotale = espaces.reduce((total, espace) => total + espace.ventes_du_jour, 0);

  return (
    <div className="ev-page">
      <header className="ev-entete">
        <div>
          <h2 className="ev-titre">Choisissez une boutique</h2>
          <p className="ev-sous-titre">Chaque boutique a sa caisse, son stock et ses ventes.</p>
        </div>
        <p className="ev-recette">Ventes du jour, toutes boutiques : <strong>{formaterPrix(recetteTotale)}</strong></p>
      </header>

      <table className="ev-table">
        <thead>
          <tr>
            <th scope="col">Boutique</th>
            <th scope="col">Ventes du jour</th>
            <th scope="col">Tickets</th>
            <th scope="col">Produits en stock</th>
            <th scope="col"><span className="pf-visually-hidden">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {[...espaces].sort(comparerNoms).map((espace) => (
            <tr key={espace.id}>
              <th scope="row">
                <span aria-hidden="true">{espace.is_siege ? '🏢' : '🏪'}</span> {nomBoutique(espace.nom)}
              </th>
              <td data-titre="Ventes du jour" className="ev-montant">{formaterPrix(espace.ventes_du_jour)}</td>
              <td data-titre="Tickets">{compter(espace.tickets_du_jour, 'ticket')}</td>
              <td data-titre="Produits en stock">{compter(espace.produits_en_stock, 'produit')}</td>
              <td className="ev-action">
                <Link to={`/admin/mouvements?boutique=${espace.id}`} className="pr-btn">Mouvements</Link>
                <Link to={`/admin/pos/${espace.id}`} className="btn btn-primary">Ouvrir la caisse</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
