import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { getImageUrl } from '../../api';
import { nombreArticles, usePanier } from './panier';
import { STATUTS, TELEPHONE_BOUTIQUE, WHATSAPP_BOUTIQUE, formaterDate, formaterPrix, pluriel } from './outils';
import './commande.css';

export function EnTeteSite() {
  const panier = usePanier();
  const nombre = nombreArticles(panier);

  return (
    <header className="cm-entete">
      <div className="cm-entete-contenu">
        <Link to="/" className="cm-marque" aria-label="La Boutique Heistal, accueil">
          <span className="cm-marque-haut">La Boutique</span>
          <span className="cm-marque-nom">Heistal</span>
        </Link>
        <nav className="cm-entete-liens" aria-label="Navigation">
          <NavLink to="/familles" className="cm-entete-lien">Produits</NavLink>
          <NavLink to="/mes-commandes" className="cm-entete-lien">Mes commandes</NavLink>
          <NavLink to="/commander" className="cm-entete-lien cm-entete-panier" aria-label={`Mon panier : ${pluriel(nombre, 'article')}`}>
            <span aria-hidden="true">🛒</span>
            <span className="cm-entete-panier-texte">Panier</span>
            {nombre > 0 && <span className="cm-pastille">{nombre}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export function PiedSite() {
  return (
    <footer className="cm-pied">
      <p>Une question ? Appelez-nous au <a href={`tel:${TELEPHONE_BOUTIQUE.replace(/\s/g, '')}`}>{TELEPHONE_BOUTIQUE}</a> ou écrivez-nous sur <a href={`https://wa.me/${WHATSAPP_BOUTIQUE}`} target="_blank" rel="noreferrer">WhatsApp</a>.</p>
      <p>© {new Date().getFullYear()} La Boutique Heistal Togo</p>
    </footer>
  );
}

export function PastilleStatut({ statut }) {
  const infos = STATUTS[statut] ?? { libelle: statut, classe: 'attente' };
  return <span className={`cm-statut cm-statut-${infos.classe}`}>{infos.libelle}</span>;
}

function explicationStatut(commande) {
  switch (commande.statut) {
    case 'EN_ATTENTE':
      return `La boutique a bien reçu votre commande. Venez la chercher avant ${formaterDate(commande.date_expiration)}.`;
    case 'PRETE':
      return `Votre commande vous attend en boutique jusqu'au ${formaterDate(commande.date_expiration)}.`;
    case 'RECUPEREE':
      return commande.date_retrait ? `Vous avez récupéré cette commande ${formaterDate(commande.date_retrait)}.` : 'Vous avez récupéré cette commande.';
    case 'EXPIREE':
      return 'Le délai de 24 heures est dépassé. Appelez la boutique avant de vous déplacer.';
    case 'ANNULEE':
      return "Cette commande a été annulée. Appelez la boutique si vous ne savez pas pourquoi.";
    default:
      return '';
  }
}

export function CodeCommande({ code, grand = false }) {
  return (
    <p className={`cm-code ${grand ? 'cm-code-grand' : ''}`}>
      <span className="cm-code-libelle">Code de commande</span>
      <span className="cm-code-valeur">{code}</span>
    </p>
  );
}

export function LignesCommande({ lignes, total }) {
  return (
    <div className="cm-lignes">
      <ul>
        {lignes.map((ligne) => (
          <li key={ligne.id ?? ligne.nom_produit} className="cm-ligne">
            <span className="cm-ligne-quantite">{ligne.quantite} ×</span>
            <span className="cm-ligne-nom">
              {ligne.nom_produit}
              <small>{formaterPrix(ligne.prix_unitaire)}{ligne.unite ? ` / ${ligne.unite}` : ''}</small>
            </span>
            <span className="cm-ligne-prix">{formaterPrix(ligne.total_ligne)}</span>
          </li>
        ))}
      </ul>
      <p className="cm-total">Total à payer en boutique <strong>{formaterPrix(total)}</strong></p>
    </div>
  );
}

export function CarteBoutique({ boutique, nomSeul }) {
  if (!boutique) return <p className="cm-boutique"><strong>{nomSeul}</strong></p>;
  return (
    <div className="cm-boutique">
      <strong>{boutique.nom}</strong>
      {boutique.localisation && <span>{boutique.localisation}</span>}
      {boutique.horaires && <span>Horaires : {boutique.horaires}</span>}
      <span className="cm-boutique-liens">
        {boutique.telephone && <a href={`tel:${boutique.telephone.replace(/\s/g, '')}`}>📞 {boutique.telephone}</a>}
        {boutique.lien_map && <a href={boutique.lien_map} target="_blank" rel="noreferrer">📍 Voir sur la carte</a>}
      </span>
    </div>
  );
}

export function DetailCommande({ commande }) {
  return (
    <article className="cm-carte cm-detail">
      <div className="cm-detail-haut">
        <CodeCommande code={commande.code} grand />
        <PastilleStatut statut={commande.statut} />
      </div>
      <p className="cm-explication">{explicationStatut(commande)}</p>
      {['EN_ATTENTE', 'PRETE'].includes(commande.statut) && (
        <p className="cm-astuce">À la caisse, donnez simplement ce code : toute votre commande s'affiche.</p>
      )}

      <h2 className="cm-sous-titre">À récupérer à</h2>
      <CarteBoutique boutique={commande.boutique} nomSeul={commande.boutique_retrait} />

      <h2 className="cm-sous-titre">Votre commande</h2>
      <LignesCommande lignes={commande.items} total={commande.total} />

      <dl className="cm-infos">
        <div><dt>Au nom de</dt><dd>{commande.client_nom}</dd></div>
        {commande.client_telephone && <div><dt>Téléphone</dt><dd>{commande.client_telephone}</dd></div>}
        <div><dt>Passée</dt><dd>{formaterDate(commande.date_commande)}</dd></div>
      </dl>
    </article>
  );
}

export function ResumeCommande({ commande }) {
  const articles = commande.items.reduce((total, ligne) => total + ligne.quantite, 0);
  return (
    <Link to={`/mes-commandes/${commande.code}`} className="cm-carte cm-resume">
      <span className="cm-resume-haut">
        <span className="cm-resume-code">{commande.code}</span>
        <PastilleStatut statut={commande.statut} />
      </span>
      <span className="cm-resume-boutique">{commande.boutique?.nom ?? commande.boutique_retrait}</span>
      <span className="cm-resume-bas">
        <span>{formaterDate(commande.date_commande, false)} · {pluriel(articles, 'article')}</span>
        <strong>{formaterPrix(commande.total)}</strong>
      </span>
    </Link>
  );
}

export function ImageProduit({ image, className }) {
  return <img src={getImageUrl(image)} alt="" className={className} loading="lazy" />;
}

export function Erreur({ children }) {
  if (!children) return null;
  return <p className="cm-erreur" role="alert">{children}</p>;
}
