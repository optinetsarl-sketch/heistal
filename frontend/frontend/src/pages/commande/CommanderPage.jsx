import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api';
import { clientFetch, fermerSessionClient, useClientConnecte } from './compteClient';
import FormulaireConnexion from './FormulaireConnexion';
import {
  QUANTITE_MAX, actualiserPanier, changerQuantite, nombreArticles, retenirCode, retirerDuPanier, totalPanier, usePanier, viderPanier,
} from './panier';
import { CarteBoutique, CodeCommande, EnTeteSite, Erreur, ImageProduit, LignesCommande, PiedSite } from './CommandeUi';
import { formaterDate, formaterPrix, pluriel, telephoneValide } from './outils';

const ETAPES = ['Panier', 'Boutique', 'Vos coordonnées', 'Confirmer'];

// Tous les messages d'une réponse d'erreur de l'API, même rangés par champ ou par ligne.
function messagesDe(valeur) {
  if (!valeur) return [];
  if (typeof valeur === 'string') return [valeur];
  if (Array.isArray(valeur)) return valeur.flatMap(messagesDe);
  if (typeof valeur === 'object') return Object.values(valeur).flatMap(messagesDe);
  return [];
}
const texteErreur = (valeur) => [...new Set(messagesDe(valeur))].join(' ');

function manquesDans(boutique, panier, produits) {
  return panier
    .map((ligne) => {
      const produit = produits.find((p) => p.id === ligne.id);
      const enStock = produit?.stocks?.find((s) => s.boutique === boutique.id)?.quantite ?? 0;
      return enStock < ligne.quantite ? { nom: ligne.nom, enStock } : null;
    })
    .filter(Boolean);
}

function Etapes({ etape, onAller }) {
  return (
    <ol className="cm-etapes" aria-label="Étapes de la commande">
      {ETAPES.map((libelle, index) => {
        const etat = index < etape ? 'faite' : index === etape ? 'active' : 'a-venir';
        return (
          <li key={libelle} className={`cm-etape cm-etape-${etat}`} aria-current={index === etape ? 'step' : undefined}>
            {index < etape ? (
              <button type="button" onClick={() => onAller(index)} aria-label={`Revenir à l'étape ${index + 1} : ${libelle}`}>
                <span className="cm-etape-numero">✓</span>
                <span className="cm-etape-libelle">{libelle}</span>
              </button>
            ) : (
              <span>
                <span className="cm-etape-numero">{index + 1}</span>
                <span className="cm-etape-libelle">{libelle}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function LignePanier({ ligne }) {
  const [saisie, setSaisie] = useState(String(ligne.quantite));
  useEffect(() => setSaisie(String(ligne.quantite)), [ligne.quantite]);

  const valider = () => {
    const nombre = Number.parseInt(saisie, 10);
    if (Number.isInteger(nombre) && nombre > 0) changerQuantite(ligne.id, Math.min(QUANTITE_MAX, nombre));
    else setSaisie(String(ligne.quantite));
  };

  return (
    <li className="cm-panier-ligne">
      <ImageProduit image={ligne.image} className="cm-panier-image" />
      <div className="cm-panier-infos">
        <p className="cm-panier-nom">{ligne.nom}</p>
        <p className="cm-panier-prix">{formaterPrix(ligne.prix)}{ligne.unite ? ` / ${ligne.unite}` : ''}</p>
      </div>
      <div className="cm-quantite">
        <button type="button" onClick={() => changerQuantite(ligne.id, ligne.quantite - 1)} aria-label={`Enlever 1 ${ligne.nom}`}>−</button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantité de ${ligne.nom}`}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={valider}
          onKeyDown={(e) => e.key === 'Enter' && valider()}
        />
        <button type="button" onClick={() => changerQuantite(ligne.id, ligne.quantite + 1)} disabled={ligne.quantite >= QUANTITE_MAX} aria-label={`Ajouter 1 ${ligne.nom}`}>+</button>
      </div>
      <p className="cm-panier-total">{formaterPrix(ligne.prix * ligne.quantite)}</p>
      <button type="button" className="cm-lien-discret cm-panier-retirer" onClick={() => retirerDuPanier(ligne.id)}>Retirer</button>
    </li>
  );
}

function Confirmation({ commande, client, refTitre }) {
  const navigate = useNavigate();
  const [copie, setCopie] = useState(false);
  const message = `Ma commande La Boutique Heistal : code ${commande.code}, à retirer à ${commande.boutique?.nom ?? commande.boutique_retrait}.`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(commande.code);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };

  return (
    <section className="cm-carte cm-confirmation" aria-labelledby="cm-titre-confirmation">
      <p className="cm-confirmation-icone" aria-hidden="true">✓</p>
      <h1 id="cm-titre-confirmation" className="cm-titre" ref={refTitre} tabIndex={-1}>Merci, votre commande est envoyée !</h1>
      <CodeCommande code={commande.code} grand />
      <p className="cm-confirmation-texte">
        Notez ce code. À la caisse de <strong>{commande.boutique?.nom ?? commande.boutique_retrait}</strong>, donnez-le simplement : toute votre commande s'affiche.
      </p>
      <p className="cm-confirmation-texte">
        À récupérer avant <strong>{formaterDate(commande.date_expiration)}</strong>. Vous payez <strong>{formaterPrix(commande.total)}</strong> en boutique.
      </p>

      <div className="cm-actions">
        <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={copier}>{copie ? 'Code copié ✓' : 'Copier le code'}</button>
        <a className="cm-bouton cm-bouton-secondaire" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Envoyer sur WhatsApp</a>
        <Link className="cm-bouton" to={`/mes-commandes/${commande.code}`}>Voir ma commande</Link>
      </div>

      {!client && (
        <div className="cm-encart">
          <p><strong>Envie de retrouver toutes vos commandes ?</strong> Créez votre compte en un instant, avec ce code.</p>
          <button
            type="button"
            className="cm-bouton cm-bouton-secondaire"
            onClick={() => navigate('/mes-commandes', { state: { inscription: { code: commande.code, nom: commande.client_nom, telephone: commande.client_telephone } } })}
          >
            Créer mon compte
          </button>
        </div>
      )}
      <Link to="/familles" className="cm-lien">Continuer mes achats</Link>
    </section>
  );
}

export default function CommanderPage() {
  const panier = usePanier();
  const client = useClientConnecte();
  const [etape, setEtape] = useState(0);
  const [catalogue, setCatalogue] = useState({ etat: 'chargement', produits: [], boutiques: [] });
  const [boutiqueId, setBoutiqueId] = useState(null);
  const [coordonnees, setCoordonnees] = useState({ nom: '', telephone: '' });
  const [erreurs, setErreurs] = useState({});
  const [retires, setRetires] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [commande, setCommande] = useState(null);
  const [connexionOuverte, setConnexionOuverte] = useState(false);
  const titre = useRef(null);
  const premierAffichage = useRef(true);

  const charger = useCallback(async () => {
    try {
      const [reponseProduits, reponseBoutiques] = await Promise.all([fetch(`${API_BASE}/products/`), fetch(`${API_BASE}/boutiques/retrait/`)]);
      if (!reponseProduits.ok || !reponseBoutiques.ok) throw new Error('Réponse refusée');
      const [produits, boutiques] = await Promise.all([reponseProduits.json(), reponseBoutiques.json()]);
      const enVente = produits.filter((p) => p.is_active && p.prix_vente > 0);
      const partis = actualiserPanier(enVente);
      if (partis.length) setRetires((avant) => [...avant, ...partis.map((l) => l.nom)]);
      setCatalogue({ etat: 'pret', produits: enVente, boutiques });
      if (boutiques.length === 1) setBoutiqueId((actuel) => actuel ?? boutiques[0].id);
    } catch (err) {
      console.warn('Chargement du catalogue impossible :', err);
      setCatalogue((actuel) => (actuel.etat === 'pret' ? actuel : { ...actuel, etat: 'erreur' }));
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // Une session client périmée se ferme dès l'arrivée, avant d'en avoir besoin.
  useEffect(() => {
    if (client) clientFetch(`${API_BASE}/clients/moi/`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chaque nouvel écran s'ouvre en haut, avec son titre annoncé.
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false;
      return;
    }
    window.scrollTo(0, 0);
    titre.current?.focus();
  }, [etape, commande]);

  const aller = (index) => {
    setErreurs({});
    setEtape(index);
  };

  const boutique = catalogue.boutiques.find((b) => b.id === boutiqueId);
  const total = totalPanier(panier);

  const choisirBoutique = (id) => {
    setBoutiqueId(id);
    aller(2);
  };

  const validerCoordonnees = (e) => {
    e.preventDefault();
    if (client) {
      aller(3);
      return;
    }
    const refus = {};
    if (!coordonnees.nom.trim()) refus.nom = 'Saisissez votre nom.';
    if (!telephoneValide(coordonnees.telephone)) refus.telephone = 'Saisissez votre numéro de téléphone (8 chiffres).';
    setErreurs(refus);
    if (!Object.keys(refus).length) setEtape(3);
  };

  const envoyer = async () => {
    setEnvoi(true);
    setErreurs({});
    const corps = { boutique: boutiqueId, items: panier.map((ligne) => ({ produit: ligne.id, quantite: ligne.quantite })) };
    if (!client) {
      corps.client_nom = coordonnees.nom.trim();
      corps.client_telephone = coordonnees.telephone.trim();
    }
    try {
      const reponse = await clientFetch(`${API_BASE}/commandes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      });
      if (reponse.status === 201) {
        const envoyee = await reponse.json();
        retenirCode(envoyee.code);
        viderPanier();
        setCommande(envoyee);
        return;
      }
      if (reponse.status === 401) {
        setEtape(2);
        setErreurs({ general: 'Votre session a expiré. Indiquez votre nom et votre numéro, puis envoyez à nouveau.' });
        return;
      }
      if (reponse.status === 429) {
        setErreurs({ general: 'Trop de commandes envoyées depuis cette connexion. Patientez une minute, puis réessayez.' });
        return;
      }
      const refus = await reponse.json().catch(() => ({}));
      if (refus.client_nom || refus.client_telephone) {
        setEtape(2);
        setErreurs({ nom: texteErreur(refus.client_nom), telephone: texteErreur(refus.client_telephone) });
      } else if (refus.boutique) {
        setEtape(1);
        setErreurs({ boutique: texteErreur(refus.boutique) });
      } else {
        setErreurs({ general: texteErreur(refus.items ?? refus) || "La commande n'a pas pu être envoyée. Réessayez." });
      }
      charger(); // le stock a pu changer : les disponibilités se mettent à jour
    } catch (err) {
      console.warn('Envoi de la commande impossible :', err);
      setErreurs({ general: "Connexion impossible : votre commande n'est pas envoyée. Vérifiez votre connexion internet, puis réessayez." });
    } finally {
      setEnvoi(false);
    }
  };

  let contenu;
  if (commande) {
    contenu = <Confirmation commande={commande} client={client} refTitre={titre} />;
  } else if (panier.length === 0) {
    contenu = (
      <section className="cm-carte cm-vide">
        <h1 className="cm-titre" ref={titre} tabIndex={-1}>Votre panier est vide</h1>
        {retires.length > 0 && <p>{retires.join(', ')} {retires.length > 1 ? "ne sont plus en vente et ont été retirés" : "n'est plus en vente et a été retiré"} de votre panier.</p>}
        <p>Choisissez vos produits, puis revenez ici pour commander. Pas besoin de compte.</p>
        <div className="cm-actions">
          <Link to="/familles" className="cm-bouton">Voir les produits</Link>
          <Link to="/mes-commandes" className="cm-bouton cm-bouton-secondaire">Mes commandes</Link>
        </div>
      </section>
    );
  } else {
    contenu = (
      <>
        <Etapes etape={etape} onAller={aller} />

        {etape === 0 && (
          <section className="cm-carte" aria-labelledby="cm-titre-etape">
            <h1 id="cm-titre-etape" className="cm-titre" ref={titre} tabIndex={-1}>Votre panier</h1>
            {retires.length > 0 && (
              <p className="cm-avertissement">
                {retires.join(', ')} {retires.length > 1 ? "ne sont plus en vente et ont été retirés" : "n'est plus en vente et a été retiré"} de votre panier.
              </p>
            )}
            <ul className="cm-panier">{panier.map((ligne) => <LignePanier key={ligne.id} ligne={ligne} />)}</ul>
            <p className="cm-total">{pluriel(nombreArticles(panier), 'article')} · Total <strong>{formaterPrix(total)}</strong></p>
            <p className="cm-note">Pas de paiement en ligne : vous payez en boutique, au moment de récupérer votre commande.</p>
            <div className="cm-navigation">
              <Link to="/familles" className="cm-lien">+ Ajouter des produits</Link>
              <button type="button" className="cm-bouton" onClick={() => aller(1)}>Continuer</button>
            </div>
          </section>
        )}

        {etape === 1 && (
          <section className="cm-carte" aria-labelledby="cm-titre-etape">
            <h1 id="cm-titre-etape" className="cm-titre" ref={titre} tabIndex={-1}>Où venez-vous chercher votre commande ?</h1>
            <p className="cm-note">Votre commande vous attend 24 heures dans la boutique choisie.</p>
            <Erreur>{erreurs.boutique}</Erreur>
            {catalogue.etat === 'chargement' && <p className="cm-etat">Chargement des boutiques…</p>}
            {catalogue.etat === 'erreur' && (
              <div className="cm-etat">
                <Erreur>Impossible de charger les boutiques. Vérifiez votre connexion.</Erreur>
                <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={charger}>Réessayer</button>
              </div>
            )}
            {catalogue.etat === 'pret' && (
              <ul className="cm-tuiles">
                {catalogue.boutiques.map((b) => {
                  const manques = manquesDans(b, panier, catalogue.produits);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        className={`cm-tuile ${b.id === boutiqueId ? 'cm-tuile-choisie' : ''}`}
                        onClick={() => choisirBoutique(b.id)}
                        disabled={manques.length > 0}
                        aria-pressed={b.id === boutiqueId}
                      >
                        <span className="cm-tuile-nom">{b.nom}</span>
                        {b.localisation && <span className="cm-tuile-detail">{b.localisation}</span>}
                        {b.horaires && <span className="cm-tuile-detail">{b.horaires}</span>}
                        {manques.length === 0 ? (
                          <span className="cm-dispo cm-dispo-oui">✓ Tout est disponible</span>
                        ) : (
                          <span className="cm-dispo cm-dispo-non">
                            Pas assez de stock : {manques.map((m) => `${m.nom} (il en reste ${m.enStock})`).join(', ')}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {catalogue.etat === 'pret' && catalogue.boutiques.length > 0 && catalogue.boutiques.every((b) => manquesDans(b, panier, catalogue.produits).length > 0) && (
              <p className="cm-avertissement">Aucune boutique n'a tout votre panier en ce moment. Réduisez les quantités, ou appelez-nous : nous vous dirons quand ce sera disponible.</p>
            )}
            {catalogue.etat === 'pret' && catalogue.boutiques.length === 0 && (
              <p className="cm-avertissement">Aucune boutique ne prend de commandes en ce moment. Appelez-nous pour commander.</p>
            )}
            <div className="cm-navigation">
              <button type="button" className="cm-lien" onClick={() => aller(0)}>← Retour au panier</button>
            </div>
          </section>
        )}

        {etape === 2 && (
          <section className="cm-carte" aria-labelledby="cm-titre-etape">
            <h1 id="cm-titre-etape" className="cm-titre" ref={titre} tabIndex={-1}>À quel nom est la commande ?</h1>
            <Erreur>{erreurs.general}</Erreur>
            <form onSubmit={validerCoordonnees} noValidate>
              {client ? (
                <div className="cm-encart">
                  <p>Commande au nom de <strong>{client.nom_complet}</strong> · {client.telephone}</p>
                  <button type="button" className="cm-lien-discret" onClick={fermerSessionClient}>Ce n'est pas vous ? Se déconnecter</button>
                </div>
              ) : (
                <>
                  <p className="cm-note">Pas besoin de compte : votre nom et votre numéro suffisent.</p>
                  <div className="cm-champ">
                    <label htmlFor="cm-nom">Votre nom</label>
                    <input
                      id="cm-nom"
                      type="text"
                      autoComplete="name"
                      maxLength={150}
                      value={coordonnees.nom}
                      onChange={(e) => setCoordonnees({ ...coordonnees, nom: e.target.value })}
                      aria-invalid={Boolean(erreurs.nom)}
                      aria-describedby={erreurs.nom ? 'cm-nom-erreur' : undefined}
                    />
                    {erreurs.nom && <p id="cm-nom-erreur" className="cm-erreur">{erreurs.nom}</p>}
                  </div>
                  <div className="cm-champ">
                    <label htmlFor="cm-telephone">Votre numéro de téléphone</label>
                    <input
                      id="cm-telephone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ex : 90 12 34 56"
                      maxLength={30}
                      value={coordonnees.telephone}
                      onChange={(e) => setCoordonnees({ ...coordonnees, telephone: e.target.value })}
                      aria-invalid={Boolean(erreurs.telephone)}
                      aria-describedby={erreurs.telephone ? 'cm-telephone-erreur' : 'cm-telephone-aide'}
                    />
                    {erreurs.telephone
                      ? <p id="cm-telephone-erreur" className="cm-erreur">{erreurs.telephone}</p>
                      : <p id="cm-telephone-aide" className="cm-aide">La boutique vous appelle à ce numéro si besoin.</p>}
                  </div>
                </>
              )}
              <div className="cm-navigation">
                <button type="button" className="cm-lien" onClick={() => aller(1)}>← Retour</button>
                <button type="submit" className="cm-bouton">Continuer</button>
              </div>
            </form>

            {!client && (
              <div className="cm-encart cm-encart-compte">
                {connexionOuverte ? (
                  <FormulaireConnexion onConnecte={() => setConnexionOuverte(false)} />
                ) : (
                  <>
                    <p>Vous avez un compte ? Connectez-vous pour retrouver cette commande dans votre espace.</p>
                    <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={() => setConnexionOuverte(true)}>Me connecter</button>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {etape === 3 && (
          <section className="cm-carte" aria-labelledby="cm-titre-etape">
            <h1 id="cm-titre-etape" className="cm-titre" ref={titre} tabIndex={-1}>Vérifiez, puis envoyez</h1>

            <div className="cm-recap">
              <div className="cm-recap-titre">
                <h2 className="cm-sous-titre">Votre commande</h2>
                <button type="button" className="cm-lien-discret" onClick={() => aller(0)}>Modifier</button>
              </div>
              <LignesCommande
                lignes={panier.map((l) => ({ id: l.id, nom_produit: l.nom, quantite: l.quantite, prix_unitaire: l.prix, unite: l.unite, total_ligne: l.prix * l.quantite }))}
                total={total}
              />
            </div>

            <div className="cm-recap">
              <div className="cm-recap-titre">
                <h2 className="cm-sous-titre">À récupérer à</h2>
                <button type="button" className="cm-lien-discret" onClick={() => aller(1)}>Modifier</button>
              </div>
              <CarteBoutique boutique={boutique} />
            </div>

            <div className="cm-recap">
              <div className="cm-recap-titre">
                <h2 className="cm-sous-titre">Au nom de</h2>
                <button type="button" className="cm-lien-discret" onClick={() => aller(2)}>Modifier</button>
              </div>
              <p>{client ? `${client.nom_complet} · ${client.telephone}` : `${coordonnees.nom.trim()} · ${coordonnees.telephone.trim()}`}</p>
            </div>

            <p className="cm-note">Vous recevrez un code de commande. Venez dans les 24 heures et payez en boutique.</p>
            <Erreur>{erreurs.general}</Erreur>
            <div className="cm-navigation">
              <button type="button" className="cm-lien" onClick={() => aller(2)}>← Retour</button>
              <button type="button" className="cm-bouton cm-bouton-principal" onClick={envoyer} disabled={envoi || !boutique}>
                {envoi ? 'Envoi en cours…' : `Envoyer ma commande · ${formaterPrix(total)}`}
              </button>
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <div className="cm-page">
      <EnTeteSite />
      <main className="cm-contenu">{contenu}</main>
      <PiedSite />
    </div>
  );
}
