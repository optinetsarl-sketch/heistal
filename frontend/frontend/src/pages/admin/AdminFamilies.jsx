import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, apiFetch, getImageUrl } from '../../api';
import { CATALOGUE_URL, comparerNoms, compter } from './catalogue';
import { Fenetre, MessageErreur, Vignette } from './CatalogueUi';
import { preparerPhoto } from './photos';

const IMAGES_DE_FAMILLES = [
  { libelle: 'Volaille', image: '/familles/volaille.jpg', icone: '🍗' },
  { libelle: 'Volaille locale', image: '/familles/volaille_locale.jpg', icone: '🐓' },
  { libelle: 'Charcuterie', image: '/familles/charcuterie.jpg', icone: '🥓' },
  { libelle: 'Viande', image: '/familles/viande.jpg', icone: '🥩' },
  { libelle: 'Poisson', image: '/familles/poisson.jpg', icone: '🐟' },
  { libelle: 'Légumes', image: '/familles/legumes.jpg', icone: '🥦' },
  { libelle: 'Crustacés', image: '/familles/crustaces.jpg', icone: '🦐' },
  { libelle: 'Viennoiserie', image: '/familles/viennoiserie.jpg', icone: '🥐' },
  { libelle: 'Boisson', image: '/familles/boisson.jpg', icone: '🍹' },
  { libelle: 'Produits laitiers', image: '/familles/laitiers.jpg', icone: '🧀' },
  { libelle: 'Confiserie', image: '/familles/confiserie.jpg', icone: '🍫' },
  { libelle: 'Produits élaborés', image: '/familles/elabores.jpg', icone: '🥟' },
  { libelle: 'Riz local', image: '/familles/riz_local.jpg', icone: '🌾' },
  { libelle: 'Riz', image: '/familles/riz.jpg', icone: '🍚' },
  { libelle: 'Glaces', image: '/familles/glaces.jpg', icone: '🍦' },
  { libelle: 'Emballage', image: '/familles/emballage.jpg', icone: '📦' },
  { libelle: 'Coupe poisson', image: '/familles/coupe_poisson.jpg', icone: '🔪' },
];

const CHAMPS_DU_FORMULAIRE = ['nom', 'code', 'description', 'image'];

export function FenetreFamille({ famille, onFermer, onEnregistre }) {
  const estModification = Boolean(famille);
  const [form, setForm] = useState({
    nom: famille?.nom ?? '',
    code: famille?.code ?? '',
    description: famille?.description ?? '',
    icone: famille?.icone || '📦',
    image: famille?.image ?? '',
  });
  const [photo, setPhoto] = useState(null);
  const [preparation, setPreparation] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [optionsOuvertes, setOptionsOuvertes] = useState(false);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const modifier = (champ, valeur) => {
    setForm((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreurs(({ [champ]: _corrige, ...autres }) => autres);
  };

  const choisirFichier = async (fichier) => {
    if (!fichier) return;
    setPreparation(true);
    try {
      const preparee = await preparerPhoto(fichier);
      setPhoto({ fichier: preparee, url: URL.createObjectURL(preparee) });
      setErreurs(({ image: _ancienne, ...autres }) => autres);
    } catch (err) {
      console.warn('Photo de famille illisible :', err);
      setErreurs((actuelles) => ({ ...actuelles, image: `« ${fichier.name} » n'a pas pu être lue. Choisissez une image JPEG ou PNG.` }));
    }
    setPreparation(false);
  };

  const choisirDansLaGalerie = ({ image, icone }) => {
    setPhoto(null);
    setForm((actuel) => ({ ...actuel, image, icone }));
    setErreurs(({ image: _ancienne, ...autres }) => autres);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      setErreurs({ nom: 'Saisissez le nom de la famille.' });
      return;
    }

    const corps = new FormData();
    corps.append('nom', form.nom.trim());
    corps.append('code', form.code.trim());
    corps.append('description', form.description.trim());
    corps.append('icone', form.icone);
    corps.append('image', photo?.fichier ?? form.image);

    setEnregistrement(true);
    try {
      const reponse = await apiFetch(estModification ? `${API_BASE}/familles/${famille.id}/` : `${API_BASE}/familles/`, {
        method: estModification ? 'PATCH' : 'POST',
        body: corps,
      });
      if (reponse.ok) {
        onEnregistre(await reponse.json(), estModification);
        return;
      }

      const donnees = await reponse.json().catch(() => ({}));
      const refus = Object.fromEntries(
        Object.entries(donnees).map(([champ, valeur]) => [champ, Array.isArray(valeur) ? valeur.join(' ') : String(valeur)])
      );
      if (refus.code || refus.description) setOptionsOuvertes(true);
      if (!CHAMPS_DU_FORMULAIRE.some((champ) => refus[champ])) {
        refus.general = refus.detail || "L'enregistrement a échoué. Réessayez.";
      }
      setErreurs(refus);
    } catch (err) {
      console.warn('Enregistrement de la famille impossible :', err);
      setErreurs({ general: "Serveur injoignable : la famille n'a pas été enregistrée." });
    }
    setEnregistrement(false);
  };

  const apercu = photo?.url ?? form.image;

  return (
    <Fenetre titre={estModification ? 'Modifier la famille' : 'Nouvelle famille'} sousTitre={famille?.nom} onFermer={onFermer}>
      <form className="pr-dialog-form" onSubmit={enregistrer} noValidate>
        <div className="pr-dialog-body">
          <div className="pf-field">
            <label htmlFor="famille-nom">Nom de la famille *</label>
            <input
              id="famille-nom"
              type="text"
              className="pf-input"
              placeholder="Ex : Épices"
              value={form.nom}
              onChange={(e) => modifier('nom', e.target.value)}
              aria-invalid={Boolean(erreurs.nom)}
            />
            <MessageErreur>{erreurs.nom}</MessageErreur>
          </div>

          <div className="pf-field">
            <span className="pr-field-label">Image de la famille</span>
            <div className="pr-family-photo">
              <Vignette image={apercu} icone={form.icone} className="pr-family-preview" />
              <label className="pr-btn">
                {preparation ? 'Préparation…' : apercu ? "Changer l'image" : 'Choisir une image'}
                <input
                  type="file"
                  accept="image/*"
                  className="pf-visually-hidden"
                  onChange={(e) => {
                    choisirFichier(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <MessageErreur>{erreurs.image}</MessageErreur>
          </div>

          <details className="pf-options">
            <summary>Ou prendre une image de la galerie</summary>
            <ul className="pr-gallery">
              {IMAGES_DE_FAMILLES.map((modele) => (
                <li key={modele.image}>
                  <button
                    type="button"
                    className={`pr-gallery-item ${!photo && form.image === modele.image ? 'active' : ''}`}
                    onClick={() => choisirDansLaGalerie(modele)}
                    aria-pressed={!photo && form.image === modele.image}
                  >
                    <img src={getImageUrl(modele.image)} alt="" loading="lazy" />
                    <span>{modele.libelle}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>

          <details className="pf-options" open={optionsOuvertes} onToggle={(e) => setOptionsOuvertes(e.currentTarget.open)}>
            <summary>Plus d'options (code, description)</summary>
            <div className="pf-options-content">
              <div className="pf-field">
                <label htmlFor="famille-code">Code</label>
                <input
                  id="famille-code"
                  type="text"
                  className="pf-input"
                  placeholder="Créé automatiquement si vide"
                  value={form.code}
                  onChange={(e) => modifier('code', e.target.value)}
                  aria-invalid={Boolean(erreurs.code)}
                />
                <MessageErreur>{erreurs.code}</MessageErreur>
              </div>
              <div className="pf-field">
                <label htmlFor="famille-description">Description affichée sur le site</label>
                <textarea
                  id="famille-description"
                  rows="3"
                  className="pf-input"
                  value={form.description}
                  onChange={(e) => modifier('description', e.target.value)}
                />
                <MessageErreur>{erreurs.description}</MessageErreur>
              </div>
            </div>
          </details>

          <MessageErreur>{erreurs.general}</MessageErreur>
        </div>

        <footer className="pr-dialog-foot">
          <button type="button" className="btn btn-outline" onClick={onFermer} disabled={enregistrement}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={enregistrement || preparation}>
            {enregistrement ? 'Enregistrement…' : estModification ? 'Enregistrer' : 'Créer la famille'}
          </button>
        </footer>
      </form>
    </Fenetre>
  );
}

export default function AdminFamilies({ familles, produits, lectureSeule, onNouvelle, onModifier, onSupprimer, onVoirProduits }) {
  const nombreDeProduits = (famille) => produits.filter((produit) => produit.famille === famille.id).length;

  return (
    <>
      <div className="pr-section-head">
        <p className="pr-hint">Chaque produit appartient à une famille. Seule une famille vide peut être supprimée.</p>
        {!lectureSeule && <button type="button" className="pr-btn" onClick={onNouvelle}>+ Nouvelle famille</button>}
      </div>

      <ul className="pr-family-grid">
        {[...familles].sort(comparerNoms).map((famille) => {
          const nombre = nombreDeProduits(famille);
          return (
            <li key={famille.id} className="pr-family-card">
              <Vignette image={famille.image} icone={famille.icone} className="pr-family-image" />
              <div className="pr-family-body">
                <h2 className="pr-family-name">{famille.nom}</h2>
                <p className="pr-family-count">{nombre > 0 ? compter(nombre, 'produit') : 'Aucun produit'}</p>
                <div className="pr-family-actions">
                  {nombre > 0 && <button type="button" className="pr-btn" onClick={() => onVoirProduits(famille)}>Voir les produits</button>}
                  {nombre === 0 && !lectureSeule && (
                    <Link
                      className="pr-btn"
                      to={`${CATALOGUE_URL}/nouveau?famille=${famille.id}`}
                      aria-label={`Ajouter un produit dans la famille ${famille.nom}`}
                      title="Ajouter un produit dans cette famille"
                    >
                      + Ajouter
                    </Link>
                  )}
                  {!lectureSeule && (
                    <button
                      type="button"
                      className="pr-btn"
                      onClick={() => onModifier(famille)}
                      aria-label={`Modifier la famille ${famille.nom}`}
                    >
                      Modifier
                    </button>
                  )}
                  {nombre === 0 && !lectureSeule && (
                    <button
                      type="button"
                      className="pr-btn pr-btn-danger pr-btn-icon"
                      onClick={() => onSupprimer(famille)}
                      aria-label={`Supprimer la famille ${famille.nom}`}
                      title="Supprimer cette famille"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
