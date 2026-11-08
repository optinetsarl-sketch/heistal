import React, { useState } from 'react';
import { API_BASE } from '../../api';
import { ouvrirSessionClient } from './compteClient';
import { Erreur } from './CommandeUi';
import { telephoneValide } from './outils';

async function envoyer(adresse, corps) {
  const reponse = await fetch(`${API_BASE}/clients/${adresse}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  const donnees = await reponse.json().catch(() => ({}));
  return { reponse, donnees };
}

const MESSAGE_RESEAU = 'Connexion impossible. Vérifiez votre connexion internet, puis réessayez.';
const MESSAGE_ESSAIS = 'Trop d\'essais. Patientez une minute, puis réessayez.';

export default function FormulaireConnexion({ onConnecte }) {
  const [form, setForm] = useState({ telephone: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const seConnecter = async (e) => {
    e.preventDefault();
    if (!form.telephone.trim() || !form.motDePasse) {
      setErreur('Saisissez votre numéro de téléphone et votre mot de passe.');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      const { reponse, donnees } = await envoyer('login', { telephone: form.telephone.trim(), password: form.motDePasse });
      if (reponse.ok) {
        ouvrirSessionClient(donnees.client, donnees.token);
        onConnecte?.(donnees.client);
        return;
      }
      setErreur(reponse.status === 429 ? MESSAGE_ESSAIS : donnees.message || 'Connexion refusée. Réessayez.');
    } catch {
      setErreur(MESSAGE_RESEAU);
    }
    setEnvoi(false);
  };

  return (
    <form className="cm-formulaire" onSubmit={seConnecter} noValidate>
      <div className="cm-champ">
        <label htmlFor="cm-connexion-telephone">Numéro de téléphone</label>
        <input
          id="cm-connexion-telephone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="Ex : 90 12 34 56"
          value={form.telephone}
          onChange={(e) => setForm({ ...form, telephone: e.target.value })}
        />
      </div>
      <div className="cm-champ">
        <label htmlFor="cm-connexion-mot-de-passe">Mot de passe</label>
        <input
          id="cm-connexion-mot-de-passe"
          type="password"
          autoComplete="current-password"
          value={form.motDePasse}
          onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
        />
      </div>
      <Erreur>{erreur}</Erreur>
      <button type="submit" className="cm-bouton" disabled={envoi}>{envoi ? 'Connexion…' : 'Me connecter'}</button>
    </form>
  );
}

export function FormulaireInscription({ initial, onConnecte }) {
  const [form, setForm] = useState({
    nom: initial?.nom ?? '',
    telephone: initial?.telephone ?? '',
    motDePasse: '',
    code: initial?.code ?? '',
  });
  const [besoinCode, setBesoinCode] = useState(Boolean(initial?.code));
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);

  const modifier = (champ, valeur) => {
    setForm((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreurs(({ [champ]: _corrige, general: _general, ...autres }) => autres);
  };

  const creer = async (e) => {
    e.preventDefault();
    const refus = {};
    if (!form.nom.trim()) refus.nom = 'Saisissez votre nom.';
    if (!telephoneValide(form.telephone)) refus.telephone = 'Saisissez votre numéro de téléphone (8 chiffres).';
    if (form.motDePasse.length < 8) refus.motDePasse = 'Choisissez un mot de passe d\'au moins 8 caractères.';
    if (besoinCode && !form.code.trim()) refus.code = 'Tapez le code d\'une de vos commandes.';
    setErreurs(refus);
    if (Object.keys(refus).length) return;

    setEnvoi(true);
    try {
      const { reponse, donnees } = await envoyer('register', {
        nom_complet: form.nom.trim(),
        telephone: form.telephone.trim(),
        mot_de_passe: form.motDePasse,
        code_commande: form.code.trim(),
      });
      if (reponse.ok) {
        ouvrirSessionClient(donnees.client, donnees.token);
        onConnecte?.(donnees.client);
        return;
      }
      if (donnees.besoin_code) {
        setBesoinCode(true);
        setErreurs({ code: donnees.message });
      } else {
        setErreurs({ general: reponse.status === 429 ? MESSAGE_ESSAIS : donnees.message || 'Le compte n\'a pas été créé. Réessayez.' });
      }
    } catch {
      setErreurs({ general: MESSAGE_RESEAU });
    }
    setEnvoi(false);
  };

  return (
    <form className="cm-formulaire" onSubmit={creer} noValidate>
      <div className="cm-champ">
        <label htmlFor="cm-inscription-nom">Votre nom</label>
        <input id="cm-inscription-nom" type="text" autoComplete="name" maxLength={150} value={form.nom} onChange={(e) => modifier('nom', e.target.value)} aria-invalid={Boolean(erreurs.nom)} />
        <Erreur>{erreurs.nom}</Erreur>
      </div>
      <div className="cm-champ">
        <label htmlFor="cm-inscription-telephone">Numéro de téléphone</label>
        <input
          id="cm-inscription-telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ex : 90 12 34 56"
          value={form.telephone}
          onChange={(e) => modifier('telephone', e.target.value)}
          aria-invalid={Boolean(erreurs.telephone)}
        />
        <Erreur>{erreurs.telephone}</Erreur>
      </div>
      <div className="cm-champ">
        <label htmlFor="cm-inscription-mot-de-passe">Choisissez un mot de passe</label>
        <input
          id="cm-inscription-mot-de-passe"
          type="password"
          autoComplete="new-password"
          value={form.motDePasse}
          onChange={(e) => modifier('motDePasse', e.target.value)}
          aria-invalid={Boolean(erreurs.motDePasse)}
          aria-describedby="cm-inscription-aide"
        />
        <p id="cm-inscription-aide" className="cm-aide">Au moins 8 caractères, pas seulement des chiffres.</p>
        <Erreur>{erreurs.motDePasse}</Erreur>
      </div>
      {besoinCode && (
        <div className="cm-champ">
          <label htmlFor="cm-inscription-code">Code d'une de vos commandes</label>
          <input
            id="cm-inscription-code"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex : K7M-4QX"
            className="cm-champ-code"
            value={form.code}
            onChange={(e) => modifier('code', e.target.value.toUpperCase())}
            aria-invalid={Boolean(erreurs.code)}
          />
          <p className="cm-aide">Ce numéro a déjà commandé chez nous : le code prouve que c'est bien vous.</p>
          <Erreur>{erreurs.code}</Erreur>
        </div>
      )}
      <Erreur>{erreurs.general}</Erreur>
      <button type="submit" className="cm-bouton" disabled={envoi}>{envoi ? 'Création…' : 'Créer mon compte'}</button>
    </form>
  );
}
