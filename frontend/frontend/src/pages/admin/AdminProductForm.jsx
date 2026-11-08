import React, { useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, apiFetch, getImageUrl } from '../../api';
import { EtapeFamille, EtapePhotos, GrilleChoix, LigneResume, OptionsProduit, PaveNumerique } from './AdminProductSteps';
import { UNITES, boutiquesActives, estEntierPositif, formaterPrix, nomBoutique, quantiteAvecUnite, uniteAuPluriel } from './catalogue';
import { MessageErreur, Vignette } from './CatalogueUi';
import { preparerPhoto } from './photos';

const PHOTOS_MAX = 5;
const SEUIL_PAR_DEFAUT = 10;
const CLE_BROUILLON = 'heistal_brouillon_produit';
const QUESTION_DEPART = 'Quitter sans enregistrer ? Les informations saisies seront perdues.';
const ETAPES_A_CHOIX_DIRECT = ['famille', 'unite'];
const CHAMPS_OPTIONS = ['description', 'prix_gros', 'seuil_alerte', 'reference', 'type_stock'];
const CHAMPS_DU_FORMULAIRE = ['famille', 'nom', 'prix_vente', 'unite', 'stocks', 'image', ...CHAMPS_OPTIONS];

function formulaireDepart(produit, familleInitiale) {
  return {
    famille: produit?.famille ?? familleInitiale ?? '',
    nom: produit?.nom ?? '',
    prix_vente: String(produit?.prix_vente ?? ''),
    unite: produit?.unite ?? '',
    boutiques: [],
    stocks: {},
    description: produit?.description ?? '',
    prix_gros: produit?.prix_gros ?? '',
    seuil_alerte: produit?.seuil_alerte ?? SEUIL_PAR_DEFAUT,
    reference: produit?.reference ?? '',
    type_stock: produit?.type_stock ?? '',
  };
}

function lireBrouillon() {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_BROUILLON));
  } catch {
    return null;
  }
}

function ecrireBrouillon(form) {
  try {
    if (form) sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(form));
    else sessionStorage.removeItem(CLE_BROUILLON);
  } catch {
    // Sans stockage disponible, seul le rechargement de la page perd la saisie.
  }
}

// Le stock d'un produit existant se change avec « Ajuster le stock », qui tient compte des ventes en cours.
function parcoursDuFormulaire(actives, choisies, estModification) {
  if (estModification) return ['famille', 'nom', 'prix', 'unite', 'photos', 'resume'];
  const stock = actives.length > 0 ? ['boutique', ...choisies.map(({ id }) => `stock-${id}`)] : [];
  return ['famille', 'nom', 'prix', 'unite', ...stock, 'photos', 'resume'];
}

function erreurEtape(cle, form) {
  if (cle === 'famille' && !form.famille) return 'Choisissez la famille du produit.';
  if (cle === 'nom' && !form.nom.trim()) return 'Saisissez le nom du produit.';
  if (cle === 'prix' && !(Number(form.prix_vente) > 0)) return 'Saisissez un prix supérieur à 0.';
  if (cle === 'unite' && !form.unite) return 'Choisissez comment ce produit est vendu.';
  if (cle === 'boutique' && form.boutiques.length === 0) return 'Choisissez au moins une boutique.';
  return null;
}

function controlerOptions(form) {
  const erreurs = {};
  if (form.prix_gros !== '' && (!(Number(form.prix_gros) > 0) || !Number.isInteger(Number(form.prix_gros)))) {
    erreurs.prix_gros = 'Saisissez un prix en nombre entier, ou laissez vide.';
  }
  if (!estEntierPositif(form.seuil_alerte)) erreurs.seuil_alerte = 'Saisissez un nombre entier, égal ou supérieur à 0.';
  return erreurs;
}

// Une adresse ne permet pas de sauter une question : on revient à la première restée sans réponse.
function etapeAffichee(demandee, parcours, form, depart, estModification) {
  // Une quantité d'une boutique qui n'est plus choisie renvoie au choix de la boutique.
  const repli = demandee?.startsWith('stock-') ? 'boutique' : depart;
  const etape = parcours.includes(demandee) ? demandee : repli;
  if (estModification) return etape;
  const manquante = parcours.find((cle) => erreurEtape(cle, form));
  return manquante && parcours.indexOf(etape) > parcours.indexOf(manquante) ? manquante : etape;
}

export default function AdminProductForm({
  familles,
  typesStock,
  boutiques,
  produit,
  familleInitiale,
  onAnnuler,
  onEnregistre,
  onCreerFamille,
  onCreerTypeStock,
}) {
  const estModification = Boolean(produit);
  const navigate = useNavigate();
  const location = useLocation();
  const [parametres, setParametres] = useSearchParams();

  // Un brouillon ne sert qu'après un rechargement en plein parcours : un nouvel ajout repart de zéro.
  const [brouillon] = useState(() => (estModification || !parametres.get('etape') ? null : lireBrouillon()));
  const [form, setForm] = useState(() => brouillon ?? formulaireDepart(produit, familleInitiale));
  const [optionsOuvertes, setOptionsOuvertes] = useState(false);
  const [photos, setPhotos] = useState(
    (produit?.photos ?? []).map((photo) => ({ cle: `photo-${photo.id}`, id: photo.id, url: getImageUrl(photo.image) }))
  );
  const [photosASupprimer, setPhotosASupprimer] = useState([]);
  const [preparationPhotos, setPreparationPhotos] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [refusEtape, setRefusEtape] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const zoneEtape = useRef(null);
  const titre = useRef(null);
  const urlsTemporaires = useRef([]);
  const compteurPhotos = useRef(0);
  const montrerPremiereErreur = useRef(false);
  const saisieEnCours = useRef(Boolean(brouillon));

  const actives = boutiquesActives(boutiques);
  const choisies = actives.filter(({ id }) => form.boutiques.includes(id));
  const parcours = parcoursDuFormulaire(actives, choisies, estModification);
  const depart = estModification ? 'resume' : familleInitiale ? 'nom' : 'famille';
  const etape = etapeAffichee(parametres.get('etape'), parcours, form, depart, estModification);
  const indexEtape = parcours.indexOf(etape);
  const depuisResume = estModification || parametres.get('depuis') === 'resume';
  const boutiqueEtape = choisies.find(({ id }) => etape === `stock-${id}`);
  const familleChoisie = familles.find((f) => String(f.id) === String(form.famille));
  // Tant que la boutique n'est pas choisie, on compte déjà l'écran de quantité qui suivra.
  const nombreEtapes = parcours.length + (choisies.length > 0 || actives.length === 0 || estModification ? 0 : 1);
  const unites = !form.unite || UNITES.some((u) => u.valeur === form.unite)
    ? UNITES
    : [...UNITES, { valeur: form.unite, libelle: form.unite, icone: '📏' }];

  // Protège la saisie partout : menu de gauche et bouton retour du téléphone, depuis la première question.
  const blocage = useBlocker(({ currentLocation, nextLocation }) => (
    saisieEnCours.current && currentLocation.pathname !== nextLocation.pathname
  ));

  useEffect(() => {
    if (blocage.state !== 'blocked') return;
    if (window.confirm(QUESTION_DEPART)) blocage.proceed();
    else blocage.reset();
  }, [blocage]);

  // Fermeture de l'onglet ou rechargement : seul le navigateur peut poser la question.
  useEffect(() => {
    const avertir = (e) => {
      if (saisieEnCours.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, []);

  useEffect(() => () => urlsTemporaires.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // Le brouillon survit à un rechargement, pas à un départ de la page.
  useEffect(() => {
    if (!estModification && saisieEnCours.current) ecrireBrouillon(form);
  }, [form, estModification]);

  useEffect(() => () => ecrireBrouillon(null), []);

  // Chaque question s'ouvre en haut de l'écran, avec son champ prêt à recevoir la saisie.
  useEffect(() => {
    document.querySelector('.admin-main')?.scrollTo(0, 0);
    (zoneEtape.current?.querySelector('[data-saisie]') ?? titre.current)?.focus({ preventScroll: true });
  }, [etape]);

  useEffect(() => {
    if (!montrerPremiereErreur.current) return;
    montrerPremiereErreur.current = false;
    zoneEtape.current?.querySelector('.pf-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [erreurs]);

  const signalerErreurs = (nouvellesErreurs) => {
    montrerPremiereErreur.current = Object.keys(nouvellesErreurs).length > 0;
    setErreurs(nouvellesErreurs);
  };

  const modifier = (champ, valeur) => {
    saisieEnCours.current = true;
    setForm((actuel) => ({ ...actuel, [champ]: valeur }));
    setErreurs(({ [champ]: _corrige, ...autres }) => autres);
    setRefusEtape(null);
  };

  const aller = (cle, { retourResume = false, remplacer = false } = {}) => {
    const suivants = new URLSearchParams(parametres);
    suivants.set('etape', cle);
    if (retourResume) suivants.set('depuis', 'resume');
    else suivants.delete('depuis');
    setParametres(suivants, { replace: remplacer, state: { interne: true } });
    setRefusEtape(null);
  };

  // Depuis le résumé, on y revient dès la réponse donnée, sauf s'il reste des quantités à saisir.
  const avancer = (cle) => {
    const suivante = parcours[parcours.indexOf(cle) + 1];
    if (depuisResume && !suivante.startsWith('stock-')) aller('resume');
    else aller(suivante, { retourResume: depuisResume });
  };

  const reculer = () => {
    if (location.state?.interne) navigate(-1);
    else aller(depuisResume ? 'resume' : parcours[indexEtape - 1], { remplacer: true });
  };

  const choisirFamille = (id) => {
    modifier('famille', id);
    avancer('famille');
  };

  const choisirUnite = (unite) => {
    modifier('unite', unite);
    avancer('unite');
  };

  const basculerBoutique = (id) => {
    modifier('boutiques', form.boutiques.includes(id) ? form.boutiques.filter((choisie) => choisie !== id) : [...form.boutiques, id]);
  };

  const ajouterPhotos = async (fichiers) => {
    const liste = Array.from(fichiers);
    if (liste.length === 0) return;
    saisieEnCours.current = true;

    const places = PHOTOS_MAX - photos.length;
    const choisis = liste.slice(0, places);
    let probleme = liste.length > places ? `${PHOTOS_MAX} images maximum par produit.` : '';

    setPreparationPhotos(true);
    const pretes = [];
    for (const fichier of choisis) {
      try {
        const photo = await preparerPhoto(fichier);
        const url = URL.createObjectURL(photo);
        urlsTemporaires.current.push(url);
        compteurPhotos.current += 1;
        pretes.push({ cle: `nouvelle-${compteurPhotos.current}`, fichier: photo, url });
      } catch (err) {
        console.warn('Image illisible :', fichier.name, err);
        probleme = `« ${fichier.name} » n'a pas pu être lue. Choisissez une image JPEG ou PNG.`;
      }
    }
    setPreparationPhotos(false);

    setPhotos((actuelles) => [...actuelles, ...pretes]);
    setErreurs(({ image: _ancienne, ...autres }) => (probleme ? { ...autres, image: probleme } : autres));
  };

  const retirerPhoto = (photo) => {
    saisieEnCours.current = true;
    if (photo.id) setPhotosASupprimer((ids) => [...ids, photo.id]);
    setPhotos((actuelles) => actuelles.filter((p) => p.cle !== photo.cle));
    setErreurs(({ image: _ancienne, ...autres }) => autres);
  };

  const enregistrer = async () => {
    const problemes = controlerOptions(form);
    if (Object.keys(problemes).length > 0) {
      setOptionsOuvertes(true);
      signalerErreurs(problemes);
      return;
    }

    const corps = new FormData();
    corps.append('nom', form.nom.trim());
    corps.append('famille', form.famille);
    corps.append('prix_vente', form.prix_vente);
    corps.append('unite', form.unite);
    corps.append('description', form.description.trim());
    corps.append('prix_gros', form.prix_gros);
    corps.append('seuil_alerte', form.seuil_alerte);
    corps.append('reference', form.reference.trim());
    corps.append('type_stock', form.type_stock);
    if (!estModification) {
      corps.append('stocks', JSON.stringify(choisies.map(({ id }) => ({ boutique: id, quantite: Number(form.stocks[id]) || 0 }))));
    }
    photos.filter((photo) => photo.fichier).forEach((photo) => corps.append('nouvelles_photos', photo.fichier));
    photosASupprimer.forEach((id) => corps.append('photos_a_supprimer', id));

    setEnregistrement(true);
    try {
      const res = await apiFetch(estModification ? `${API_BASE}/products/${produit.id}/` : `${API_BASE}/products/`, {
        method: estModification ? 'PATCH' : 'POST',
        body: corps,
      });

      if (res.ok) {
        saisieEnCours.current = false;
        onEnregistre(await res.json(), estModification);
        return;
      }

      const donnees = await res.json().catch(() => ({}));
      const refus = Object.fromEntries(
        Object.entries(donnees).map(([champ, valeur]) => [champ, Array.isArray(valeur) ? valeur.join(' ') : String(valeur)])
      );
      if (CHAMPS_OPTIONS.some((champ) => refus[champ])) setOptionsOuvertes(true);
      if (!CHAMPS_DU_FORMULAIRE.some((champ) => refus[champ])) {
        refus.general = refus.detail || "L'enregistrement a échoué. Vérifiez les informations et réessayez.";
      }
      signalerErreurs(refus);
    } catch (err) {
      console.warn('Enregistrement du produit impossible :', err);
      signalerErreurs({ general: "Serveur injoignable : le produit n'a pas été enregistré. Vos informations sont conservées, réessayez." });
    } finally {
      setEnregistrement(false);
    }
  };

  const soumettre = (e) => {
    e.preventDefault();
    if (etape === 'resume') {
      enregistrer();
      return;
    }
    const refus = erreurEtape(etape, form);
    if (refus) setRefusEtape(refus);
    else avancer(etape);
  };

  const question = {
    famille: 'Choisissez la famille du produit',
    nom: 'Quel est le nom du produit ?',
    prix: 'Quel est le prix de vente ?',
    unite: 'Ce produit est vendu par…',
    boutique: 'Dans quelles boutiques mettre le stock ?',
    photos: "Choisissez l'image du produit",
    resume: estModification ? `Modifier « ${produit.nom} »` : 'Vérifiez, puis enregistrez',
  }[etape] ?? `Combien de ${uniteAuPluriel(form.unite)} à ${nomBoutique(boutiqueEtape?.nom)} ?`;

  const precision = {
    prix: form.nom.trim(),
    unite: form.prix_vente && `${form.nom.trim()} · ${formaterPrix(form.prix_vente)}`,
    boutique: 'Touchez une ou plusieurs boutiques, puis Suivant.',
    photos: photos.length > 0 ? "La première image est celle qui s'affiche en premier sur le site." : "Sans image, le site affichera celle de la famille.",
    resume: estModification ? 'Touchez ce que vous voulez changer.' : 'Touchez une ligne pour la corriger.',
  }[etape] ?? (boutiqueEtape ? "Laissez 0 si le produit n'y est pas encore." : '');

  const boutonPrincipal = () => {
    if (etape === 'resume') {
      if (enregistrement) return 'Enregistrement…';
      return estModification ? 'Enregistrer les modifications' : 'Enregistrer le produit';
    }
    if (depuisResume) return 'Valider';
    return etape === 'photos' && photos.length === 0 ? 'Passer cette étape →' : 'Suivant →';
  };

  const peutReculer = etape === 'resume' ? !estModification : depuisResume || indexEtape > 0;

  return (
    <form className="pf-page" onSubmit={soumettre} noValidate>
      <button type="button" className="pf-back" onClick={onAnnuler}>
        {estModification ? '← Retour aux produits' : '✕ Annuler'}
      </button>

      {!estModification && (
        <div className="pf-progression">
          <p>{etape === 'resume' ? 'Dernière étape' : `Étape ${indexEtape + 1} sur ${nombreEtapes}`}</p>
          <div
            className="pf-barre"
            role="progressbar"
            aria-label="Progression"
            aria-valuemin={0}
            aria-valuemax={nombreEtapes}
            aria-valuenow={indexEtape + 1}
          >
            <span style={{ width: `${((indexEtape + 1) / nombreEtapes) * 100}%` }} />
          </div>
        </div>
      )}

      {/* La clé relance la courte pause d'arrivée : un double-clic ne répond pas à la question suivante. */}
      <div key={etape} ref={zoneEtape} className="pf-etape">
        <section className="pf-step">
          <header>
            <h2 ref={titre} tabIndex={-1} className="pf-question">{question}</h2>
            {precision && <p className="pf-precision">{precision}</p>}
          </header>

          {etape === 'famille' && (
            <EtapeFamille
              familles={familles}
              choisie={form.famille}
              onChoisir={choisirFamille}
              onCreer={() => onCreerFamille((famille) => choisirFamille(famille.id))}
            />
          )}

          {etape === 'nom' && (
            <input
              data-saisie
              type="text"
              className="pf-input pf-input-grand"
              aria-label="Nom du produit"
              placeholder="Ex : Tilapia entier surgelé"
              value={form.nom}
              onChange={(e) => modifier('nom', e.target.value)}
              aria-invalid={Boolean(refusEtape)}
            />
          )}

          {etape === 'prix' && (
            <PaveNumerique
              libelle="Prix de vente"
              suffixe="FCFA"
              valeur={form.prix_vente}
              onChange={(valeur) => modifier('prix_vente', valeur)}
            />
          )}

          {etape === 'unite' && <GrilleChoix choix={unites} estChoisi={(unite) => form.unite === unite} onChoisir={choisirUnite} />}

          {etape === 'boutique' && (
            <GrilleChoix
              choix={actives.map(({ id, nom, is_siege: estSiege }) => ({ valeur: id, libelle: nomBoutique(nom), icone: estSiege ? '🏢' : '🏪' }))}
              estChoisi={(id) => form.boutiques.includes(id)}
              onChoisir={basculerBoutique}
            />
          )}

          {boutiqueEtape && (
            <PaveNumerique
              libelle={`Stock à ${nomBoutique(boutiqueEtape.nom)}`}
              suffixe={uniteAuPluriel(form.unite)}
              valeur={form.stocks[boutiqueEtape.id] ?? ''}
              onChange={(valeur) => modifier('stocks', { ...form.stocks, [boutiqueEtape.id]: valeur })}
            />
          )}

          {etape === 'photos' && (
            <>
              <EtapePhotos
                photos={photos}
                photosMax={PHOTOS_MAX}
                preparation={preparationPhotos}
                onAjouter={ajouterPhotos}
                onRetirer={retirerPhoto}
              />
              <MessageErreur>{erreurs.image}</MessageErreur>
            </>
          )}

          {etape === 'resume' && (
            <>
              <ul className="pf-resume">
                <LigneResume titre="Famille" erreur={erreurs.famille} onModifier={() => aller('famille', { retourResume: true })}>
                  {familleChoisie && <Vignette image={familleChoisie.image} icone={familleChoisie.icone} className="pf-resume-image" />}
                  {familleChoisie?.nom ?? 'À choisir'}
                </LigneResume>
                <LigneResume titre="Nom" erreur={erreurs.nom} onModifier={() => aller('nom', { retourResume: true })}>
                  {form.nom.trim()}
                </LigneResume>
                <LigneResume titre="Prix" erreur={erreurs.prix_vente} onModifier={() => aller('prix', { retourResume: true })}>
                  {formaterPrix(form.prix_vente)}
                </LigneResume>
                <LigneResume titre="Vendu par" erreur={erreurs.unite} onModifier={() => aller('unite', { retourResume: true })}>
                  {unites.find((unite) => unite.valeur === form.unite)?.libelle ?? 'Non précisé'}
                </LigneResume>
                {estModification ? (
                  <LigneResume titre="Stock">
                    {produit.stocks.length === 0 && <span className="pf-resume-bloc">Aucun stock</span>}
                    {produit.stocks.map(({ boutique, boutique_nom, quantite }) => (
                      <span key={boutique} className="pf-resume-bloc">{nomBoutique(boutique_nom)} : {quantiteAvecUnite(quantite, produit.unite)}</span>
                    ))}
                    <small>Pour le changer, utilisez « Ajuster le stock » dans la liste.</small>
                  </LigneResume>
                ) : (
                  <LigneResume
                    titre="Stock"
                    erreur={erreurs.stocks}
                    onModifier={actives.length > 0 ? () => aller('boutique', { retourResume: true }) : undefined}
                  >
                    {choisies.length === 0 && 'Aucune boutique active'}
                    {choisies.map(({ id, nom }) => (
                      <span key={id} className="pf-resume-bloc">{nomBoutique(nom)} : {quantiteAvecUnite(Number(form.stocks[id]) || 0, form.unite)}</span>
                    ))}
                  </LigneResume>
                )}
                <LigneResume titre="Image" erreur={erreurs.image} onModifier={() => aller('photos', { retourResume: true })}>
                  {photos.length > 0
                    ? photos.map((photo) => <img key={photo.cle} className="pf-resume-image" src={photo.url} alt="" />)
                    : "Aucune : l'image de la famille sera affichée"}
                </LigneResume>
              </ul>

              <OptionsProduit
                form={form}
                erreurs={erreurs}
                typesStock={typesStock}
                ouvertes={optionsOuvertes}
                onOuvrir={setOptionsOuvertes}
                onModifier={modifier}
                onCreerTypeStock={() => onCreerTypeStock((type) => modifier('type_stock', type.id))}
              />
            </>
          )}

          <MessageErreur>{refusEtape}</MessageErreur>
          <MessageErreur>{erreurs.general}</MessageErreur>
        </section>

        <div className="pf-actions">
          {peutReculer && (
            <button type="button" className="btn btn-outline" onClick={reculer} disabled={enregistrement}>← Précédent</button>
          )}
          {!ETAPES_A_CHOIX_DIRECT.includes(etape) && (
            <button type="submit" className="btn btn-primary" disabled={enregistrement || preparationPhotos}>
              {boutonPrincipal()}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
