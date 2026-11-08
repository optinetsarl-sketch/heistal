import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, apiErrorMessage, apiFetch, getUser } from '../../api';
import { boutiquesActives, compter, nomBoutique, normaliser } from './catalogue';
import { Fenetre, MessageErreur } from './CatalogueUi';
import { CAISSIERE, ROLES } from './roles';
import './productForm.css';
import './products.css';
import './users.css';

const CHAMPS_DU_FORMULAIRE = ['nom_complet', 'username', 'telephone', 'email', 'role', 'boutique'];

// Le mot de passe provisoire ne s'affiche qu'une fois : le serveur n'en garde aucune trace lisible.
function FenetreMotDePasse({ compte, motDePasse, onFermer }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    await navigator.clipboard.writeText(motDePasse);
    setCopie(true);
  };

  return (
    <Fenetre titre="Mot de passe provisoire" sousTitre={compte.nom_complet} onFermer={onFermer}>
      <div className="pr-dialog-body">
        <p className="us-consigne">Notez-le maintenant et donnez-le à {compte.nom_complet} : <strong>il ne sera plus jamais affiché.</strong></p>
        <dl className="us-identifiants">
          <div><dt>Identifiant</dt><dd>{compte.username}</dd></div>
          <div><dt>Mot de passe provisoire</dt><dd data-mot-de-passe>{motDePasse}</dd></div>
        </dl>
        <p className="pf-help">À sa prochaine connexion, cette personne devra choisir son propre mot de passe.</p>
      </div>
      <footer className="pr-dialog-foot">
        {navigator.clipboard && (
          <button type="button" className="btn btn-outline" onClick={copier}>{copie ? 'Copié ✓' : 'Copier'}</button>
        )}
        <button type="button" className="btn btn-primary" onClick={onFermer}>J'ai noté le mot de passe</button>
      </footer>
    </Fenetre>
  );
}

function FenetreCompte({ compte, boutiques, onFermer, onEnregistre }) {
  const estModification = Boolean(compte);
  const [form, setForm] = useState({
    nom_complet: compte?.nom_complet ?? '',
    username: compte?.username ?? '',
    telephone: compte?.telephone ?? '',
    email: compte?.email ?? '',
    role: compte?.role ?? '',
    boutique: compte?.boutique ?? '',
  });
  const [erreurs, setErreurs] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);

  const actives = boutiquesActives(boutiques);
  // Une boutique fermée reste affichée pour la caissière qui y est encore affectée.
  const choixBoutiques = compte?.boutique && !actives.some(({ id }) => id === compte.boutique)
    ? [...actives, { id: compte.boutique, nom: compte.boutique_nom }]
    : actives;

  const modifier = (champ, valeur) => {
    setForm((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreurs(({ [champ]: _corrige, ...autres }) => autres);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    const problemes = {};
    if (!form.nom_complet.trim()) problemes.nom_complet = "Saisissez le nom de l'utilisateur.";
    if (!form.role) problemes.role = 'Choisissez le rôle.';
    if (form.role === CAISSIERE && !form.boutique) problemes.boutique = 'Choisissez la boutique de la caissière.';
    if (Object.keys(problemes).length > 0) {
      setErreurs(problemes);
      return;
    }

    setEnregistrement(true);
    try {
      const reponse = await apiFetch(estModification ? `${API_BASE}/profiles/${compte.id}/` : `${API_BASE}/profiles/`, {
        method: estModification ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_complet: form.nom_complet.trim(),
          username: form.username.trim(),
          telephone: form.telephone.trim(),
          email: form.email.trim(),
          role: form.role,
          boutique: form.role === CAISSIERE ? form.boutique : null,
        }),
      });
      if (reponse.ok) {
        onEnregistre(await reponse.json());
        return;
      }

      const donnees = await reponse.json().catch(() => ({}));
      const refus = Object.fromEntries(
        Object.entries(donnees).map(([champ, valeur]) => [champ, Array.isArray(valeur) ? valeur.join(' ') : String(valeur)])
      );
      if (!CHAMPS_DU_FORMULAIRE.some((champ) => refus[champ])) {
        refus.general = refus.detail || "L'enregistrement a échoué. Réessayez.";
      }
      setErreurs(refus);
    } catch (err) {
      console.warn('Enregistrement du compte impossible :', err);
      setErreurs({ general: "Serveur injoignable : le compte n'a pas été enregistré." });
    }
    setEnregistrement(false);
  };

  return (
    <Fenetre titre={estModification ? 'Modifier le compte' : 'Nouvel utilisateur'} sousTitre={compte?.nom_complet} onFermer={onFermer}>
      <form className="pr-dialog-form" onSubmit={enregistrer} noValidate>
        <div className="pr-dialog-body">
          <div className="pf-field">
            <label htmlFor="compte-nom">Nom complet *</label>
            <input id="compte-nom" type="text" className="pf-input" value={form.nom_complet} onChange={(e) => modifier('nom_complet', e.target.value)} aria-invalid={Boolean(erreurs.nom_complet)} />
            <MessageErreur>{erreurs.nom_complet}</MessageErreur>
          </div>

          <div className="pf-field">
            <span className="pr-field-label">Rôle *</span>
            <div className="us-roles">
              {ROLES.map(({ valeur, libelle, icone, description }) => (
                <button
                  key={valeur}
                  type="button"
                  className={`us-role ${form.role === valeur ? 'active' : ''}`}
                  aria-pressed={form.role === valeur}
                  onClick={() => modifier('role', valeur)}
                >
                  <span className="us-role-icone" aria-hidden="true">{icone}</span>
                  <span>
                    <strong>{libelle}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              ))}
            </div>
            <MessageErreur>{erreurs.role}</MessageErreur>
          </div>

          {form.role === CAISSIERE && (
            <div className="pf-field">
              <label htmlFor="compte-boutique">Boutique de la caissière *</label>
              <select id="compte-boutique" className="pf-input" value={form.boutique} onChange={(e) => modifier('boutique', Number(e.target.value) || '')} aria-invalid={Boolean(erreurs.boutique)}>
                <option value="">Choisir une boutique</option>
                {choixBoutiques.map(({ id, nom }) => <option key={id} value={id}>{nomBoutique(nom)}</option>)}
              </select>
              <MessageErreur>{erreurs.boutique}</MessageErreur>
            </div>
          )}

          <div className="pf-field">
            <label htmlFor="compte-identifiant">Identifiant de connexion</label>
            <input id="compte-identifiant" type="text" className="pf-input" placeholder="Créé automatiquement si vide" value={form.username} onChange={(e) => modifier('username', e.target.value)} aria-invalid={Boolean(erreurs.username)} />
            <MessageErreur>{erreurs.username}</MessageErreur>
          </div>

          <div className="pf-row">
            <div className="pf-field">
              <label htmlFor="compte-telephone">Téléphone</label>
              <input id="compte-telephone" type="tel" className="pf-input" value={form.telephone} onChange={(e) => modifier('telephone', e.target.value)} />
              <MessageErreur>{erreurs.telephone}</MessageErreur>
            </div>
            <div className="pf-field">
              <label htmlFor="compte-email">E-mail</label>
              <input id="compte-email" type="email" className="pf-input" value={form.email} onChange={(e) => modifier('email', e.target.value)} />
              <MessageErreur>{erreurs.email}</MessageErreur>
            </div>
          </div>

          {!estModification && <p className="pf-help">Un mot de passe provisoire sera créé et affiché une seule fois.</p>}
          <MessageErreur>{erreurs.general}</MessageErreur>
        </div>
        <footer className="pr-dialog-foot">
          <button type="button" className="btn btn-outline" onClick={onFermer} disabled={enregistrement}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={enregistrement}>
            {enregistrement ? 'Enregistrement…' : estModification ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </footer>
      </form>
    </Fenetre>
  );
}

function LigneCompte({ compte, moi, onModifier, onMotDePasse, onStatut }) {
  const actif = compte.statut === 'Actif';
  return (
    <li className={`us-ligne ${actif ? '' : 'us-ligne-inactive'}`}>
      <div className="us-identite">
        <span className="us-avatar" aria-hidden="true">{compte.initials}</span>
        <div className="us-noms">
          <p className="pr-row-name">{compte.nom_complet}{moi && <span className="us-moi"> (vous)</span>}</p>
          <p className="pr-row-ref">@{compte.username}{compte.telephone.trim().length > 4 ? ` · ${compte.telephone}` : ''}</p>
        </div>
      </div>
      <div className="us-poste">
        <strong>{compte.role_label}</strong>
        {compte.role === CAISSIERE && (
          <span className={compte.boutique ? '' : 'us-sans-boutique'}>{compte.boutique ? nomBoutique(compte.boutique_nom) : 'Aucune boutique'}</span>
        )}
      </div>
      <span className={`pr-badge ${actif ? 'pr-badge-ok' : 'pr-badge-rupture'}`}>{actif ? 'Actif' : 'Désactivé'}</span>
      <div className="us-actions">
        <button type="button" className="pr-btn" onClick={() => onModifier(compte)} aria-label={`Modifier le compte de ${compte.nom_complet}`}>Modifier</button>
        <button type="button" className="pr-btn" onClick={() => onMotDePasse(compte)} aria-label={`Réinitialiser le mot de passe de ${compte.nom_complet}`}>Mot de passe</button>
        <Link className="pr-btn" to={`/admin/mouvements?utilisateur=${compte.user}`} aria-label={`Mouvements de ${compte.nom_complet}`}>Mouvements</Link>
        {!moi && (
          <button
            type="button"
            className={`pr-btn ${actif ? 'pr-btn-danger' : ''}`}
            onClick={() => onStatut(compte)}
            aria-label={`${actif ? 'Désactiver' : 'Réactiver'} le compte de ${compte.nom_complet}`}
          >
            {actif ? 'Désactiver' : 'Réactiver'}
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminUsers() {
  const [comptes, setComptes] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  const [panne, setPanne] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [role, setRole] = useState('');
  const [fenetre, setFenetre] = useState(null);
  const [motDePasse, setMotDePasse] = useState(null);
  const [message, setMessage] = useState(null);

  const moi = getUser();

  const charger = useCallback(async () => {
    setPanne(false);
    try {
      const reponses = await Promise.all([apiFetch(`${API_BASE}/profiles/`), apiFetch(`${API_BASE}/boutiques/`)]);
      if (reponses.some((reponse) => !reponse.ok)) throw new Error('Réponse refusée par le serveur');
      const [listeComptes, listeBoutiques] = await Promise.all(reponses.map((reponse) => reponse.json()));
      setComptes(listeComptes);
      setBoutiques(listeBoutiques);
    } catch (err) {
      console.warn('Chargement des comptes impossible :', err);
      setPanne(true);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (!message) return undefined;
    const minuteur = setTimeout(() => setMessage(null), message.erreur ? 8000 : 3500);
    return () => clearTimeout(minuteur);
  }, [message]);

  const compteEnregistre = (compte) => {
    const creation = !fenetre.compte;
    setFenetre(null);
    if (creation) setMotDePasse({ compte, valeur: compte.mot_de_passe_temporaire });
    else setMessage({ texte: `Le compte de ${compte.nom_complet} a bien été modifié.` });
    charger();
  };

  const changerStatut = async (compte) => {
    const desactiver = compte.statut === 'Actif';
    if (desactiver && !window.confirm(`Désactiver le compte de ${compte.nom_complet} ? Cette personne ne pourra plus se connecter. Son historique est conservé.`)) return;
    try {
      const reponse = await apiFetch(`${API_BASE}/profiles/${compte.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: desactiver ? 'Inactif' : 'Actif' }),
      });
      if (!reponse.ok) {
        setMessage({ texte: await apiErrorMessage(reponse, "Le compte n'a pas été modifié."), erreur: true });
        return;
      }
      setMessage({ texte: `Le compte de ${compte.nom_complet} a été ${desactiver ? 'désactivé' : 'réactivé'}.` });
      charger();
    } catch (err) {
      console.warn('Changement de statut impossible :', err);
      setMessage({ texte: "Serveur injoignable : le compte n'a pas été modifié.", erreur: true });
    }
  };

  const reinitialiser = async (compte) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${compte.nom_complet} ? Ses sessions ouvertes seront fermées.`)) return;
    try {
      const reponse = await apiFetch(`${API_BASE}/profiles/${compte.id}/reinitialiser_mot_de_passe/`, { method: 'POST' });
      if (!reponse.ok) {
        setMessage({ texte: await apiErrorMessage(reponse, "Le mot de passe n'a pas été réinitialisé."), erreur: true });
        return;
      }
      const { mot_de_passe_temporaire: valeur } = await reponse.json();
      setMotDePasse({ compte, valeur });
      charger();
    } catch (err) {
      console.warn('Réinitialisation impossible :', err);
      setMessage({ texte: "Serveur injoignable : le mot de passe n'a pas été réinitialisé.", erreur: true });
    }
  };

  if (panne) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Impossible de charger les comptes</p>
        <p>Vérifiez votre connexion, puis réessayez.</p>
        <button type="button" className="btn btn-primary" onClick={charger}>Réessayer</button>
      </div>
    );
  }

  if (!comptes) return <div className="ev-message"><p>Chargement des comptes…</p></div>;

  const texte = normaliser(recherche.trim());
  const trouves = comptes.filter((compte) => !texte || normaliser(`${compte.nom_complet} ${compte.username}`).includes(texte));
  const visibles = role ? trouves.filter((compte) => compte.role === role) : trouves;

  return (
    <div className="us-page">
      <div className="pr-section-head">
        <p className="pr-hint">Un compte ne se supprime pas : désactivez-le pour fermer son accès en gardant son historique.</p>
        <button type="button" className="btn btn-primary pr-add" onClick={() => setFenetre({})}>+ Nouvel utilisateur</button>
      </div>

      <div className="pr-filters">
        <label className="pr-search">
          <span className="pf-visually-hidden">Rechercher un utilisateur</span>
          <span aria-hidden="true">🔍</span>
          <input type="search" className="pr-search-input" placeholder="Nom ou identifiant" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </label>
        <div className="pr-chips" role="group" aria-label="Filtrer par rôle">
          {[{ valeur: '', libelle: 'Tous' }, ...ROLES].map(({ valeur, libelle }) => (
            <button key={libelle} type="button" className={`pr-chip ${role === valeur ? 'active' : ''}`} aria-pressed={role === valeur} onClick={() => setRole(valeur)}>
              {libelle} <span>{valeur ? trouves.filter((compte) => compte.role === valeur).length : trouves.length}</span>
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="pr-state-box"><p>Aucun compte trouvé.</p></div>
      ) : (
        <div className="us-liste">
          <p className="pr-summary"><strong>{compter(visibles.length, 'compte')}</strong></p>
          <ul className="pr-rows">
            {visibles.map((compte) => (
              <LigneCompte
                key={compte.id}
                compte={compte}
                moi={compte.id === moi?.id}
                onModifier={(choisi) => setFenetre({ compte: choisi })}
                onMotDePasse={reinitialiser}
                onStatut={changerStatut}
              />
            ))}
          </ul>
        </div>
      )}

      {fenetre && <FenetreCompte compte={fenetre.compte} boutiques={boutiques} onFermer={() => setFenetre(null)} onEnregistre={compteEnregistre} />}
      {motDePasse && <FenetreMotDePasse compte={motDePasse.compte} motDePasse={motDePasse.valeur} onFermer={() => setMotDePasse(null)} />}
      {message && <div className={`pr-toast ${message.erreur ? 'pr-toast-erreur' : ''}`} role="status">{message.texte}</div>}
    </div>
  );
}
