import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { API_BASE, apiErrorMessage, apiFetch, getUser } from '../../api';
import AdminFamilies, { FenetreFamille } from './AdminFamilies';
import AdminProductForm from './AdminProductForm';
import AdminProductList from './AdminProductList';
import AdminStockTypes, { FenetreTypeStock } from './AdminStockTypes';
import { CATALOGUE_URL } from './catalogue';
import { catalogueEnLecture } from './roles';
import './admin.css';
import './productForm.css';
import './products.css';

const FILTRES_VIDES = { recherche: '', famille: '', etat: '', typeStock: '' };
const DUREE_MESSAGE = 3500;
const DUREE_ERREUR = 8000;

function Onglets({ produits, familles, typesStock, familleFiltree, lectureSeule }) {
  const lienAjout = familleFiltree ? `${CATALOGUE_URL}/nouveau?famille=${familleFiltree}` : `${CATALOGUE_URL}/nouveau`;

  return (
    <>
      <div className="pr-top">
        <nav className="pr-tabs" aria-label="Sections du catalogue">
          <NavLink end to={CATALOGUE_URL} className="pr-tab">
            Produits <span className="pr-tab-count">{produits.length}</span>
          </NavLink>
          <NavLink to={`${CATALOGUE_URL}/familles`} className="pr-tab">
            Familles <span className="pr-tab-count">{familles.length}</span>
          </NavLink>
          <NavLink to={`${CATALOGUE_URL}/types-stock`} className="pr-tab">
            Types de stock <span className="pr-tab-count">{typesStock.length}</span>
          </NavLink>
        </nav>
        {!lectureSeule && <Link to={lienAjout} className="btn btn-primary pr-add">+ Ajouter un produit</Link>}
      </div>
      <Outlet />
    </>
  );
}

function PageFormulaire({ produits, familles, ...reste }) {
  const { id } = useParams();
  const [parametres] = useSearchParams();
  const produit = id ? produits.find((p) => String(p.id) === id) : null;

  if (id && !produit) {
    return (
      <div className="pr-state-box">
        <p>Ce produit n'existe plus.</p>
        <Link to={CATALOGUE_URL} className="btn btn-primary">Retour aux produits</Link>
      </div>
    );
  }

  const familleDemandee = familles.find((f) => String(f.id) === parametres.get('famille'));
  return <AdminProductForm key={id ?? 'nouveau'} produit={produit} familles={familles} familleInitiale={familleDemandee?.id} {...reste} />;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const lectureSeule = catalogueEnLecture(getUser()?.role);

  const [catalogue, setCatalogue] = useState({ produits: [], familles: [], typesStock: [], boutiques: [] });
  const [chargement, setChargement] = useState('en-cours');
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [notification, setNotification] = useState(null);
  const [fenetreFamille, setFenetreFamille] = useState(null);
  const [fenetreType, setFenetreType] = useState(null);

  const minuteurNotification = useRef(null);
  const positionListe = useRef(0);
  const dejaCharge = useRef(false);

  const notifier = useCallback((message, erreur = false) => {
    clearTimeout(minuteurNotification.current);
    setNotification({ message, erreur });
    minuteurNotification.current = setTimeout(() => setNotification(null), erreur ? DUREE_ERREUR : DUREE_MESSAGE);
  }, []);

  useEffect(() => () => clearTimeout(minuteurNotification.current), []);

  // En cas de panne, le message d'erreur s'affiche : jamais de produits inventés à la place des vrais.
  const charger = useCallback(async () => {
    try {
      const reponses = await Promise.all(['products', 'familles', 'types-stock', 'boutiques'].map((liste) => apiFetch(`${API_BASE}/${liste}/`)));
      if (reponses.some((reponse) => !reponse.ok)) throw new Error('Réponse refusée par le serveur');
      const [produits, familles, typesStock, boutiques] = await Promise.all(reponses.map((reponse) => reponse.json()));
      setCatalogue({ produits, familles, typesStock, boutiques });
      setChargement('pret');
      dejaCharge.current = true;
    } catch (err) {
      console.warn('Chargement du catalogue impossible :', err);
      if (dejaCharge.current) notifier("Impossible d'actualiser la liste. Vérifiez votre connexion.", true);
      else setChargement('erreur');
    }
  }, [notifier]);

  useEffect(() => {
    charger();
  }, [charger]);

  // La liste retrouve sa position au retour ; les autres écrans s'ouvrent en haut de page.
  useEffect(() => {
    if (pathname !== CATALOGUE_URL) document.querySelector('.admin-main')?.scrollTo(0, 0);
  }, [pathname]);

  const reessayer = () => {
    setChargement('en-cours');
    charger();
  };

  const voirProduits = (filtre) => {
    setFiltres({ ...FILTRES_VIDES, ...filtre });
    positionListe.current = 0;
    navigate(CATALOGUE_URL);
  };

  const remplacerProduit = (produit) => {
    setCatalogue((actuel) => ({
      ...actuel,
      produits: actuel.produits.map((p) => (p.id === produit.id ? produit : p)),
    }));
  };

  const produitEnregistre = (produit, modification) => {
    if (modification) {
      remplacerProduit(produit);
    } else {
      setCatalogue((actuel) => ({ ...actuel, produits: [...actuel.produits, produit] }));
    }
    notifier(`« ${produit.nom} » a bien été ${modification ? 'modifié' : 'ajouté'}.`);
    navigate(CATALOGUE_URL);
  };

  const supprimer = async ({ adresse, question, confirmation, refus }) => {
    if (!window.confirm(question)) return false;
    try {
      const reponse = await apiFetch(adresse, { method: 'DELETE' });
      if (!reponse.ok) {
        notifier(await apiErrorMessage(reponse, refus), true);
        return false;
      }
    } catch (err) {
      console.warn('Suppression impossible :', err);
      notifier(`${refus} Le serveur est injoignable.`, true);
      return false;
    }
    notifier(confirmation);
    await charger();
    return true;
  };

  const supprimerProduit = (produit) => supprimer({
    adresse: `${API_BASE}/products/${produit.id}/`,
    question: `Supprimer définitivement « ${produit.nom} » ?`,
    confirmation: `« ${produit.nom} » a été supprimé.`,
    refus: "Le produit n'a pas été supprimé.",
  });

  const supprimerFamille = async (famille) => {
    const supprimee = await supprimer({
      adresse: `${API_BASE}/familles/${famille.id}/`,
      question: `Supprimer la famille « ${famille.nom} » ?`,
      confirmation: `La famille « ${famille.nom} » a été supprimée.`,
      refus: "La famille n'a pas été supprimée.",
    });
    if (supprimee) setFiltres((actuels) => (actuels.famille === String(famille.id) ? { ...actuels, famille: '' } : actuels));
  };

  const supprimerType = async (type, nombreProduits) => {
    const supprime = await supprimer({
      adresse: `${API_BASE}/types-stock/${type.id}/`,
      question: nombreProduits > 0
        ? `Supprimer « ${type.nom} » ? Les produits rattachés (${nombreProduits}) resteront au catalogue, sans type de stock.`
        : `Supprimer « ${type.nom} » ?`,
      confirmation: `« ${type.nom} » a été supprimé.`,
      refus: "Le type de stock n'a pas été supprimé.",
    });
    if (supprime) setFiltres((actuels) => (actuels.typeStock === String(type.id) ? { ...actuels, typeStock: '' } : actuels));
  };

  const familleEnregistree = async (famille, modification) => {
    const { surEnregistrement } = fenetreFamille;
    setFenetreFamille(null);
    notifier(`La famille « ${famille.nom} » a bien été ${modification ? 'modifiée' : 'créée'}.`);
    await charger();
    surEnregistrement?.(famille);
  };

  const typeEnregistre = async (type, modification) => {
    const { surEnregistrement } = fenetreType;
    setFenetreType(null);
    notifier(`« ${type.nom} » a bien été ${modification ? 'modifié' : 'créé'}.`);
    await charger();
    surEnregistrement?.(type);
  };

  const proprietesFormulaire = {
    produits: catalogue.produits,
    familles: catalogue.familles,
    typesStock: catalogue.typesStock,
    boutiques: catalogue.boutiques,
    onAnnuler: () => navigate(CATALOGUE_URL),
    onEnregistre: produitEnregistre,
    onCreerFamille: (surEnregistrement) => setFenetreFamille({ surEnregistrement }),
    onCreerTypeStock: (surEnregistrement) => setFenetreType({ surEnregistrement }),
  };

  return (
    <div className="pr-page">
      {chargement === 'en-cours' && <div className="pr-state-box"><p>Chargement du catalogue…</p></div>}

      {chargement === 'erreur' && (
        <div className="pr-state-box" role="alert">
          <p className="pr-state-title">Impossible de charger le catalogue</p>
          <p>Vérifiez votre connexion, puis réessayez.</p>
          <button type="button" className="btn btn-primary" onClick={reessayer}>Réessayer</button>
        </div>
      )}

      {chargement === 'pret' && (
        <Routes>
          <Route
            element={(
              <Onglets
                produits={catalogue.produits}
                familles={catalogue.familles}
                typesStock={catalogue.typesStock}
                familleFiltree={filtres.famille}
                lectureSeule={lectureSeule}
              />
            )}
          >
            <Route
              index
              element={(
                <AdminProductList
                  produits={catalogue.produits}
                  familles={catalogue.familles}
                  typesStock={catalogue.typesStock}
                  boutiques={catalogue.boutiques}
                  filtres={filtres}
                  onFiltres={setFiltres}
                  filtresVides={FILTRES_VIDES}
                  positionListe={positionListe}
                  lectureSeule={lectureSeule}
                  onStockModifie={(produit) => {
                    remplacerProduit(produit);
                    notifier(`Stock de « ${produit.nom} » mis à jour.`);
                  }}
                  onSupprimer={supprimerProduit}
                />
              )}
            />
            <Route
              path="familles"
              element={(
                <AdminFamilies
                  familles={catalogue.familles}
                  produits={catalogue.produits}
                  lectureSeule={lectureSeule}
                  onNouvelle={() => setFenetreFamille({})}
                  onModifier={(famille) => setFenetreFamille({ famille })}
                  onSupprimer={supprimerFamille}
                  onVoirProduits={(famille) => voirProduits({ famille: String(famille.id) })}
                />
              )}
            />
            <Route
              path="types-stock"
              element={(
                <AdminStockTypes
                  typesStock={catalogue.typesStock}
                  produits={catalogue.produits}
                  lectureSeule={lectureSeule}
                  onNouveau={() => setFenetreType({})}
                  onModifier={(type) => setFenetreType({ type })}
                  onSupprimer={supprimerType}
                  onVoirProduits={(type) => voirProduits({ typeStock: String(type.id) })}
                />
              )}
            />
          </Route>
          <Route path="nouveau" element={lectureSeule ? <Navigate to={CATALOGUE_URL} replace /> : <PageFormulaire {...proprietesFormulaire} />} />
          <Route path=":id/modifier" element={lectureSeule ? <Navigate to={CATALOGUE_URL} replace /> : <PageFormulaire {...proprietesFormulaire} />} />
          <Route path="*" element={<Navigate to={CATALOGUE_URL} replace />} />
        </Routes>
      )}

      {fenetreFamille && (
        <FenetreFamille famille={fenetreFamille.famille} onFermer={() => setFenetreFamille(null)} onEnregistre={familleEnregistree} />
      )}

      {fenetreType && (
        <FenetreTypeStock type={fenetreType.type} onFermer={() => setFenetreType(null)} onEnregistre={typeEnregistre} />
      )}

      {notification && (
        <div className={`pr-toast ${notification.erreur ? 'pr-toast-erreur' : ''}`} role="status">
          {notification.message}
        </div>
      )}
    </div>
  );
}
