import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, apiFetch, getUser } from '../../api';
import { compter, formaterNombre, formaterPrix, nomBoutique, uniteAuPluriel, uniteCourte } from './catalogue';
import { CONTROLEUR } from './roles';
import './products.css';
import './dashboard.css';

const ACTUALISATION = 60000;
const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const PERIODES = [
  { valeur: 'jour', libelle: "Aujourd'hui" },
  { valeur: 'semaine', libelle: 'Cette semaine' },
  { valeur: 'mois', libelle: 'Ce mois-ci' },
];

// « 2026-11-08 » se lit comme un jour du calendrier, sans décalage d'heure.
const enDate = (iso) => {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return new Date(annee, mois - 1, jour);
};
const dateLongue = (iso) => enDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const dateCourte = (iso) => enDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const quantite = formaterNombre;

// Un plafond rond pour l'axe, dont la moitié est un nombre entier : 3 → 4, 7 → 8, 23 → 50, 140 → 200.
function plafondRond(maximum) {
  if (maximum <= 10) return Math.max(2, Math.ceil(maximum / 2) * 2);
  const puissance = 10 ** Math.floor(Math.log10(maximum));
  return [1, 2, 5, 10].map((pas) => pas * puissance).find((valeur) => valeur >= maximum);
}

function useDonnees(adresse) {
  const [etat, setEtat] = useState({ donnees: null, erreur: false, chargement: true });
  const derniere = useRef(adresse);

  const charger = useCallback(async () => {
    derniere.current = adresse;
    setEtat((actuel) => ({ ...actuel, chargement: true }));
    try {
      const reponse = await apiFetch(`${API_BASE}${adresse}`);
      if (!reponse.ok) throw new Error('Réponse refusée par le serveur');
      const donnees = await reponse.json();
      if (derniere.current === adresse) setEtat({ donnees, erreur: false, chargement: false });
    } catch (err) {
      console.warn('Chargement du tableau de bord impossible :', err);
      // Les derniers chiffres reçus restent affichés ; un message signale la panne.
      if (derniere.current === adresse) setEtat((actuel) => ({ ...actuel, erreur: true, chargement: false }));
    }
  }, [adresse]);

  useEffect(() => {
    charger();
    const minuteur = setInterval(() => {
      if (document.visibilityState === 'visible') charger();
    }, ACTUALISATION);
    return () => clearInterval(minuteur);
  }, [charger]);

  return { ...etat, recharger: charger };
}

function Tuile({ libelle, valeur, comparaison, lien }) {
  return (
    <div className="tb-tuile">
      <p className="tb-tuile-libelle">{libelle}</p>
      <p className="tb-tuile-valeur">{valeur}</p>
      {comparaison && <p className="tb-tuile-comparaison">{comparaison}</p>}
      {lien}
    </div>
  );
}

// Une colonne par jour ou par semaine. Survol ou focus : la valeur exacte. « Voir les chiffres » : le tableau.
function Histogramme({ titre, sousTitre, colonnes, unite, couleur }) {
  const maximum = Math.max(0, ...colonnes.map((c) => c.valeur));
  const plafond = plafondRond(maximum);
  const indexMax = colonnes.findIndex((c) => c.valeur === maximum);
  const derniere = colonnes.length - 1;
  const libelleValeur = (valeur) => compter(valeur, unite);

  return (
    <figure className={`tb-graphique tb-couleur-${couleur}`}>
      <figcaption className="tb-graphique-tete">
        <h3 className="tb-graphique-titre">{titre}</h3>
        <p className="tb-graphique-sous-titre">{sousTitre}</p>
      </figcaption>

      <div className="tb-histo">
        <div className="tb-histo-axe" aria-hidden="true">
          <span>{formaterNombre(plafond)}</span>
          <span>{formaterNombre(plafond / 2)}</span>
          <span>0</span>
        </div>
        <ol className="tb-histo-colonnes" style={{ '--colonnes': colonnes.length }}>
          {colonnes.map((colonne, index) => {
            const etiquette = colonne.valeur > 0 && (index === derniere || index === indexMax);
            return (
              <li
                key={colonne.cle}
                className="tb-histo-colonne"
                tabIndex={0}
                aria-label={`${colonne.libelleLong} : ${libelleValeur(colonne.valeur)}`}
              >
                <span className="tb-histo-zone">
                  {colonne.valeur > 0 && <span className="tb-histo-barre" style={{ height: `${(colonne.valeur / plafond) * 100}%` }} />}
                  {etiquette && (
                    <span className="tb-histo-etiquette" style={{ bottom: `${(colonne.valeur / plafond) * 100}%` }}>{formaterNombre(colonne.valeur)}</span>
                  )}
                  <span className="tb-histo-bulle" role="tooltip">
                    <strong>{libelleValeur(colonne.valeur)}</strong>
                    <span>{colonne.libelleLong}</span>
                  </span>
                </span>
                <span className="tb-histo-x" aria-hidden="true">
                  <span>{colonne.haut}</span>
                  <span>{colonne.bas}</span>
                </span>
              </li>
            );
          })}
        </ol>
        {maximum === 0 && <p className="tb-histo-vide">Aucun {unite} sur cette période.</p>}
      </div>

      <details className="tb-tableau">
        <summary>Voir les chiffres</summary>
        <table>
          <thead><tr><th scope="col">{sousTitre.startsWith('Par semaine') ? 'Semaine' : 'Jour'}</th><th scope="col">{titre}</th></tr></thead>
          <tbody>
            {[...colonnes].reverse().map((c) => (
              <tr key={c.cle}><th scope="row">{c.libelleLong}</th><td>{formaterNombre(c.valeur)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function colonnesDuJour(jours, champ) {
  return jours.map((jour) => {
    const date = enDate(jour.date);
    return {
      cle: jour.date,
      valeur: jour[champ],
      haut: JOURS_COURTS[date.getDay()],
      bas: date.getDate(),
      libelleLong: dateLongue(jour.date),
    };
  });
}

function colonnesDeLaSemaine(semaines, champ) {
  return semaines.map((semaine) => ({
    cle: semaine.debut,
    valeur: semaine[champ],
    haut: enDate(semaine.debut).getDate(),
    bas: enDate(semaine.debut).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    libelleLong: `Semaine du ${dateCourte(semaine.debut)} au ${dateCourte(semaine.fin)}`,
  }));
}

function Frequentation() {
  const { donnees, erreur, chargement, recharger } = useDonnees('/statistiques/frequentation/');
  const [vue, setVue] = useState('jour');
  const peutVoirCommandes = getUser()?.role !== CONTROLEUR;

  if (!donnees) {
    return erreur ? (
      <div className="tb-message" role="alert">
        <p>Impossible de charger les visiteurs et les commandes.</p>
        <button type="button" className="btn btn-primary" onClick={recharger}>Réessayer</button>
      </div>
    ) : (
      <div className="tb-message"><p>Chargement des chiffres…</p></div>
    );
  }

  const { visiteurs, commandes } = donnees;
  const parJour = vue === 'jour';
  const colonnes = (champ) => (parJour ? colonnesDuJour(donnees.jours, champ) : colonnesDeLaSemaine(donnees.semaines, champ));
  const sousTitre = parJour ? `Par jour, ${donnees.jours.length} derniers jours` : `Par semaine, ${donnees.semaines.length} dernières semaines`;

  return (
    <div className={`tb-bloc ${chargement ? 'tb-actualisation' : ''}`}>
      {erreur && <p className="tb-panne" role="alert">Les chiffres ne se sont pas actualisés. Vérifiez la connexion.</p>}
      <div className="tb-tuiles">
        <Tuile libelle="Visiteurs aujourd'hui" valeur={formaterNombre(visiteurs.aujourdhui)} comparaison={`Hier : ${formaterNombre(visiteurs.hier)}`} />
        <Tuile libelle="Visiteurs cette semaine" valeur={formaterNombre(visiteurs.semaine)} comparaison={`Semaine dernière : ${formaterNombre(visiteurs.semaine_derniere)}`} />
        <Tuile libelle="Commandes aujourd'hui" valeur={formaterNombre(commandes.aujourdhui)} comparaison={`Hier : ${formaterNombre(commandes.hier)}`} />
        <Tuile
          libelle="Commandes cette semaine"
          valeur={formaterNombre(commandes.semaine)}
          comparaison={`Semaine dernière : ${formaterNombre(commandes.semaine_derniere)}`}
          lien={commandes.a_retirer > 0 && (peutVoirCommandes
            ? <Link to="/admin/commandes" className="tb-tuile-lien">{compter(commandes.a_retirer, 'commande')} à retirer →</Link>
            : <p className="tb-tuile-comparaison">{compter(commandes.a_retirer, 'commande')} à retirer</p>)}
        />
      </div>

      <div className="tb-filtres" role="group" aria-label="Afficher les graphiques">
        <button type="button" className={`pr-chip ${parJour ? 'active' : ''}`} aria-pressed={parJour} onClick={() => setVue('jour')}>Par jour</button>
        <button type="button" className={`pr-chip ${!parJour ? 'active' : ''}`} aria-pressed={!parJour} onClick={() => setVue('semaine')}>Par semaine</button>
      </div>

      <div className="tb-graphiques">
        <Histogramme titre="Visiteurs du site" sousTitre={sousTitre} colonnes={colonnes('visiteurs')} unite="visiteur" couleur="visiteurs" />
        <Histogramme titre="Commandes du site" sousTitre={sousTitre} colonnes={colonnes('commandes')} unite="commande" couleur="commandes" />
      </div>
      <p className="tb-note">
        Un visiteur est un téléphone ou un ordinateur différent : il compte une fois par jour, et une fois par semaine même s'il revient.
        Votre équipe connectée n'est pas comptée.
      </p>
    </div>
  );
}

function VentesParProduit({ boutique }) {
  const vendus = boutique.produits.filter((p) => p.quantite > 0 || p.montant > 0);
  const nonVendus = boutique.produits.filter((p) => p.quantite === 0 && p.montant === 0);
  const maximum = Math.max(1, ...vendus.map((p) => p.montant));

  return (
    <>
      <h3 className="tb-sous-titre">Ventes par produit</h3>
      {vendus.length === 0 ? (
        <p className="tb-vide">Aucune vente sur cette période.</p>
      ) : (
        <ol className="tb-classement">
          {vendus.map((produit) => (
            <li key={`${produit.produit ?? produit.nom}`} className="tb-classement-ligne">
              <div className="tb-classement-tete">
                <span className="tb-classement-nom">{produit.nom}</span>
                <strong className="tb-classement-montant">{formaterPrix(produit.montant)}</strong>
              </div>
              <div className="tb-classement-piste" aria-hidden="true">
                <span className="tb-classement-barre" style={{ width: `${(produit.montant / maximum) * 100}%` }} />
              </div>
              <p className="tb-classement-detail">
                {quantite(produit.quantite)} {produit.unite ? (produit.quantite > 1 ? uniteAuPluriel(produit.unite) : uniteCourte(produit.unite)) : ''} vendu{produit.quantite > 1 ? 's' : ''}
                {produit.stock !== null && <> · reste {quantite(produit.stock)} en stock</>}
              </p>
            </li>
          ))}
        </ol>
      )}

      {nonVendus.length > 0 && (
        <>
          <h3 className="tb-sous-titre">En stock, pas vendus sur la période</h3>
          <ul className="tb-non-vendus">
            {nonVendus.map((produit) => (
              <li key={produit.produit ?? produit.nom}>
                <span>{produit.nom}</span>
                <span className="tb-non-vendus-stock">{quantite(produit.stock)} {produit.unite ? (produit.stock > 1 ? uniteAuPluriel(produit.unite) : uniteCourte(produit.unite)) : ''}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function VentesDesBoutiques() {
  const [periode, setPeriode] = useState('semaine');
  const { donnees, erreur, chargement, recharger } = useDonnees(`/statistiques/boutiques/?periode=${periode}`);
  const [choisie, setChoisie] = useState(null);
  const peutVoirCommandes = getUser()?.role !== CONTROLEUR;

  const filtres = (
    <div className="tb-filtres" role="group" aria-label="Période">
      {PERIODES.map(({ valeur, libelle }) => (
        <button key={valeur} type="button" className={`pr-chip ${periode === valeur ? 'active' : ''}`} aria-pressed={periode === valeur} onClick={() => setPeriode(valeur)}>
          {libelle}
        </button>
      ))}
    </div>
  );

  if (!donnees) {
    return (
      <>
        {filtres}
        {erreur ? (
          <div className="tb-message" role="alert">
            <p>Impossible de charger les ventes des boutiques.</p>
            <button type="button" className="btn btn-primary" onClick={recharger}>Réessayer</button>
          </div>
        ) : <div className="tb-message"><p>Chargement des ventes…</p></div>}
      </>
    );
  }

  const boutiques = donnees.boutiques;
  if (boutiques.length === 0) return <>{filtres}<div className="tb-message"><p>Aucune boutique ouverte.</p></div></>;
  // Par défaut, la boutique qui a le plus vendu ; un choix fait à la main est gardé d'une période à l'autre.
  const boutique = boutiques.find((b) => b.id === choisie) ?? [...boutiques].sort((a, b) => b.ventes - a.ventes)[0];
  const totalVentes = boutiques.reduce((total, b) => total + b.ventes, 0);
  const periodeTexte = donnees.debut === donnees.fin ? dateLongue(donnees.fin) : `du ${dateCourte(donnees.debut)} au ${dateCourte(donnees.fin)}`;

  return (
    <div className={`tb-bloc ${chargement ? 'tb-actualisation' : ''}`}>
      {filtres}
      {erreur && <p className="tb-panne" role="alert">Les ventes ne se sont pas actualisées. Vérifiez la connexion.</p>}
      <p className="tb-note">Toutes les boutiques, {periodeTexte} : <strong>{formaterPrix(totalVentes)}</strong></p>

      <div className="tb-boutiques" role="tablist" aria-label="Boutique">
        {boutiques.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            id={`tb-onglet-${b.id}`}
            aria-selected={b.id === boutique.id}
            aria-controls="tb-panneau-boutique"
            className="tb-boutique"
            onClick={() => setChoisie(b.id)}
          >
            <span className="tb-boutique-nom">{nomBoutique(b.nom)}</span>
            <span className="tb-boutique-ventes">{formaterPrix(b.ventes)}</span>
          </button>
        ))}
      </div>

      <section id="tb-panneau-boutique" role="tabpanel" aria-labelledby={`tb-onglet-${boutique.id}`} className="tb-panneau">
        <div className="tb-tuiles tb-tuiles-boutique">
          <Tuile libelle="Ventes" valeur={formaterPrix(boutique.ventes)} />
          <Tuile libelle="Tickets de caisse" valeur={formaterNombre(boutique.tickets)} />
          <Tuile libelle="Commandes du site" valeur={formaterNombre(boutique.commandes)} comparaison="passées sur la période" />
          <Tuile
            libelle="Commandes à retirer"
            valeur={formaterNombre(boutique.commandes_a_retirer)}
            comparaison="en ce moment"
            lien={boutique.commandes_a_retirer > 0 && peutVoirCommandes && <Link to="/admin/commandes" className="tb-tuile-lien">Voir →</Link>}
          />
        </div>
        <VentesParProduit boutique={boutique} />
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const utilisateur = getUser();
  const controleur = utilisateur?.role === CONTROLEUR;

  return (
    <div className="tb-page">
      <header className="tb-entete">
        <div>
          <h2 className="tb-titre">Bonjour {utilisateur?.nom_complet?.split(' ')[0] ?? ''}</h2>
          <p className="tb-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <nav className="tb-raccourcis" aria-label="Raccourcis">
          {!controleur && <Link to="/admin/pos" className="btn btn-primary">Ouvrir une caisse</Link>}
          {!controleur && <Link to="/admin/commandes" className="btn btn-outline">Commandes</Link>}
          <Link to="/admin/products" className="btn btn-outline">Produits</Link>
        </nav>
      </header>

      <section className="tb-section" aria-labelledby="tb-titre-frequentation">
        <h2 id="tb-titre-frequentation" className="tb-section-titre">Visiteurs et commandes du site</h2>
        <Frequentation />
      </section>

      <section className="tb-section" aria-labelledby="tb-titre-boutiques">
        <h2 id="tb-titre-boutiques" className="tb-section-titre">Ventes de chaque boutique</h2>
        <VentesDesBoutiques />
      </section>
    </div>
  );
}
