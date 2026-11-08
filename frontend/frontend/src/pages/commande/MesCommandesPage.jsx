import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../../api';
import { clientFetch, fermerSessionClient, useClientConnecte } from './compteClient';
import FormulaireConnexion, { FormulaireInscription } from './FormulaireConnexion';
import { codesRetenus } from './panier';
import { DetailCommande, EnTeteSite, Erreur, PiedSite, ResumeCommande } from './CommandeUi';

const MESSAGE_RESEAU = 'Impossible de charger vos commandes. Vérifiez votre connexion internet, puis réessayez.';

// « k7m 4qx » ou « K7M4QX » : on l'affiche comme le serveur l'écrit, « K7M-4QX ».
function codeTape(texte) {
  const brut = texte.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return brut.length === 6 ? `${brut.slice(0, 3)}-${brut.slice(3)}` : texte.trim().toUpperCase();
}

async function suivre(codes) {
  const reponse = await fetch(`${API_BASE}/commandes/suivi/?codes=${encodeURIComponent(codes.join(','))}`);
  if (reponse.status === 429) throw new Error('trop');
  if (!reponse.ok) throw new Error('refus');
  return reponse.json();
}

function RechercheCode({ autoFocus = false, valeurInitiale = '' }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(valeurInitiale);
  const [erreur, setErreur] = useState('');

  const chercher = (e) => {
    e.preventDefault();
    if (code.replace(/[^A-Za-z0-9]/g, '').length < 6) {
      setErreur('Le code a 6 lettres et chiffres, par exemple K7M-4QX.');
      return;
    }
    navigate(`/mes-commandes/${encodeURIComponent(codeTape(code))}`);
  };

  return (
    <form className="cm-recherche" onSubmit={chercher} noValidate>
      <label htmlFor="cm-code-recherche">Code de la commande</label>
      <div className="cm-recherche-ligne">
        <input
          id="cm-code-recherche"
          type="text"
          className="cm-champ-code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Ex : K7M-4QX"
          maxLength={20}
          autoFocus={autoFocus}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setErreur('');
          }}
        />
        <button type="submit" className="cm-bouton">Afficher</button>
      </div>
      <Erreur>{erreur}</Erreur>
    </form>
  );
}

function ListeCommandes({ commandes }) {
  return (
    <ul className="cm-liste">
      {commandes.map((commande) => <li key={commande.code}><ResumeCommande commande={commande} /></li>)}
    </ul>
  );
}

function EspaceConnecte({ client }) {
  const [etat, setEtat] = useState({ chargement: true, commandes: [], erreur: '' });

  const charger = useCallback(async () => {
    setEtat((actuel) => ({ ...actuel, chargement: true, erreur: '' }));
    try {
      const reponse = await clientFetch(`${API_BASE}/clients/moi/`);
      if (reponse.status === 401) return; // session fermée : la page repasse en mode visiteur
      if (!reponse.ok) throw new Error('refus');
      const donnees = await reponse.json();
      setEtat({ chargement: false, commandes: donnees.commandes, erreur: '' });
    } catch {
      setEtat((actuel) => ({ ...actuel, chargement: false, erreur: MESSAGE_RESEAU }));
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const enCours = etat.commandes.filter((c) => ['EN_ATTENTE', 'PRETE'].includes(c.statut));
  const passees = etat.commandes.filter((c) => !['EN_ATTENTE', 'PRETE'].includes(c.statut));

  return (
    <>
      <section className="cm-carte cm-bonjour">
        <div>
          <h1 className="cm-titre">Bonjour {client.nom_complet}</h1>
          <p className="cm-note">Toutes les commandes passées avec le {client.telephone}.</p>
        </div>
        <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={fermerSessionClient}>Me déconnecter</button>
      </section>

      {etat.chargement && <p className="cm-etat">Chargement de vos commandes…</p>}
      {etat.erreur && (
        <div className="cm-etat">
          <Erreur>{etat.erreur}</Erreur>
          <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={charger}>Réessayer</button>
        </div>
      )}
      {!etat.chargement && !etat.erreur && etat.commandes.length === 0 && (
        <section className="cm-carte cm-vide">
          <p>Vous n'avez pas encore commandé.</p>
          <Link to="/familles" className="cm-bouton">Voir les produits</Link>
        </section>
      )}
      {enCours.length > 0 && (
        <section aria-labelledby="cm-en-cours">
          <h2 id="cm-en-cours" className="cm-section-titre">À récupérer</h2>
          <ListeCommandes commandes={enCours} />
        </section>
      )}
      {passees.length > 0 && (
        <section aria-labelledby="cm-passees">
          <h2 id="cm-passees" className="cm-section-titre">Commandes passées</h2>
          <ListeCommandes commandes={passees} />
        </section>
      )}
    </>
  );
}

function EspaceVisiteur() {
  const location = useLocation();
  const inscription = location.state?.inscription;
  const [onglet, setOnglet] = useState(inscription ? 'inscription' : 'connexion');
  const [surAppareil, setSurAppareil] = useState({ chargement: true, commandes: [], erreur: '' });

  const charger = useCallback(async () => {
    const codes = codesRetenus();
    if (!codes.length) {
      setSurAppareil({ chargement: false, commandes: [], erreur: '' });
      return;
    }
    try {
      setSurAppareil({ chargement: false, commandes: await suivre(codes), erreur: '' });
    } catch {
      setSurAppareil({ chargement: false, commandes: [], erreur: MESSAGE_RESEAU });
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <>
      <section className="cm-carte">
        <h1 className="cm-titre">Mes commandes</h1>
        <p className="cm-note">Tapez le code reçu au moment de commander, avec ou sans compte.</p>
        <RechercheCode />
      </section>

      {surAppareil.commandes.length > 0 && (
        <section aria-labelledby="cm-sur-appareil">
          <h2 id="cm-sur-appareil" className="cm-section-titre">Commandées depuis ce téléphone</h2>
          <ListeCommandes commandes={surAppareil.commandes} />
        </section>
      )}
      {surAppareil.erreur && (
        <div className="cm-etat">
          <Erreur>{surAppareil.erreur}</Erreur>
          <button type="button" className="cm-bouton cm-bouton-secondaire" onClick={charger}>Réessayer</button>
        </div>
      )}

      <section className="cm-carte" aria-labelledby="cm-compte">
        <h2 id="cm-compte" className="cm-sous-titre">Mon compte client</h2>
        <p className="cm-note">Facultatif : avec un compte, toutes vos commandes sont réunies ici, sur n'importe quel téléphone.</p>
        <div className="cm-onglets" role="tablist" aria-label="Compte client">
          <button type="button" role="tab" id="cm-onglet-connexion" aria-selected={onglet === 'connexion'} aria-controls="cm-panneau-compte" className="cm-onglet" onClick={() => setOnglet('connexion')}>
            J'ai un compte
          </button>
          <button type="button" role="tab" id="cm-onglet-inscription" aria-selected={onglet === 'inscription'} aria-controls="cm-panneau-compte" className="cm-onglet" onClick={() => setOnglet('inscription')}>
            Créer un compte
          </button>
        </div>
        <div id="cm-panneau-compte" role="tabpanel" aria-labelledby={onglet === 'connexion' ? 'cm-onglet-connexion' : 'cm-onglet-inscription'}>
          {onglet === 'connexion' ? <FormulaireConnexion /> : <FormulaireInscription initial={inscription} />}
        </div>
      </section>
    </>
  );
}

function PageUneCommande({ code, client }) {
  const [etat, setEtat] = useState({ chargement: true, commande: null, erreur: '' });

  useEffect(() => {
    let annule = false;
    (async () => {
      setEtat({ chargement: true, commande: null, erreur: '' });
      try {
        // Dans son compte, le client voit sa commande en entier ; sinon, le code suffit pour la suivre.
        let commande = null;
        if (client) {
          const reponse = await clientFetch(`${API_BASE}/clients/moi/`);
          if (reponse.ok) commande = (await reponse.json()).commandes.find((c) => c.code === code) ?? null;
        }
        if (!commande) [commande = null] = await suivre([code]);
        if (!annule) setEtat({ chargement: false, commande, erreur: '' });
      } catch (err) {
        if (!annule) {
          setEtat({
            chargement: false,
            commande: null,
            erreur: err.message === 'trop' ? 'Trop de recherches. Patientez une minute, puis réessayez.' : MESSAGE_RESEAU,
          });
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, [code, client]);

  return (
    <>
      <Link to="/mes-commandes" className="cm-lien cm-retour">← Mes commandes</Link>
      {etat.chargement && <p className="cm-etat">Recherche de la commande…</p>}
      {etat.erreur && <Erreur>{etat.erreur}</Erreur>}
      {!etat.chargement && !etat.erreur && !etat.commande && (
        <section className="cm-carte">
          <h1 className="cm-titre">Aucune commande avec ce code</h1>
          <p className="cm-note">Vérifiez les lettres et les chiffres du code « {code} », puis réessayez.</p>
          <RechercheCode autoFocus valeurInitiale={code} key={code} />
        </section>
      )}
      {etat.commande && <DetailCommande commande={etat.commande} />}
    </>
  );
}

export default function MesCommandesPage() {
  const { code } = useParams();
  const client = useClientConnecte();

  let contenu;
  if (code) contenu = <PageUneCommande code={codeTape(code)} client={client} />;
  else if (client) contenu = <EspaceConnecte client={client} />;
  else contenu = <EspaceVisiteur />;

  return (
    <div className="cm-page">
      <EnTeteSite />
      <main className="cm-contenu">{contenu}</main>
      <PiedSite />
    </div>
  );
}
