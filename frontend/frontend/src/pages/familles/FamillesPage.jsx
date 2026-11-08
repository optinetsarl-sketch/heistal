import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BandeDefilante from '../../composants/BandeDefilante';
import { ajouterAuPanier, changerQuantite, nombreArticles, totalPanier, usePanier } from '../commande/panier';
import './famillesPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000/api' : '/api');

export const getImageUrl = (img) => {
  if (!img) return '/familles/volaille.jpg';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
  if (img.startsWith('/media/')) {
    const backendHost = (typeof window !== 'undefined' && window.location.port === '5173') ? 'http://127.0.0.1:8000' : '';
    return `${backendHost}${img}`;
  }
  return img;
};

// Photo d'un produit, avec des points pour passer à la suivante quand il en a plusieurs.
// Sans photo, c'est l'image de la famille qui s'affiche.
function ProductPhotos({ product, famille }) {
  const [index, setIndex] = useState(0);
  const photos = product.photos?.length > 0
    ? product.photos.map((photo) => photo.image)
    : [product.image || famille.image || '/heistal_fish.jpg'];

  return (
    <>
      <img
        src={getImageUrl(photos[index])}
        alt={product.nom || product.name}
        className="product-card-img"
        onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl(famille.image); }}
      />
      {photos.length > 1 && (
        <div className="product-photo-dots">
          {photos.map((photo, i) => (
            <button
              key={photo}
              type="button"
              className={i === index ? 'active' : ''}
              onClick={() => setIndex(i)}
              aria-label={`Voir la photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

const defaultFamilles = [
  { id: 7, code: '31110', nom: 'VOLAILLE', couleur: '#f97316', image: '/familles/volaille.jpg', description: 'Poulets entiers surgelés, cuisses calibrées, ailerons et découpes de volaille de haute qualité.' },
  { id: 8, code: '31111', nom: 'VOLAILLE LOCALE', couleur: '#ea580c', image: '/familles/volaille_locale.jpg', description: 'Poulet bicyclette fermier local, pintades du Togo, découpes fraîches élevées au terroir.' },
  { id: 9, code: '31115', nom: 'CHARCUTERIE', couleur: '#be123c', image: '/familles/charcuterie.jpg', description: 'Jambons gourmets, saucissons, mortadelles, lardons, saucisses et charcuteries fines sélectionnées.' },
  { id: 10, code: '31120', nom: 'VIANDE', couleur: '#dc2626', image: '/familles/viande.jpg', description: 'Viandes bovines sélectionnées, filets de bœuf tendres, mouton, agneau et découpes bouchères.' },
  { id: 11, code: '31130', nom: 'POISSON', couleur: '#0284c7', image: '/familles/poisson.jpg', description: 'Poissons entiers et vidés de haute mer, capitaine, bar, tilapia, saumon et carpe fraîchement surgelés.' },
  { id: 12, code: '31140', nom: 'LEGUMES', couleur: '#16a34a', image: '/familles/legumes.jpg', description: 'Légumes surgelés croquants, petits pois, haricots verts, épinards hachés et frites croustillantes.' },
  { id: 13, code: '31150', nom: 'CRUTACES', couleur: '#0ea5e9', image: '/familles/crustaces.jpg', description: 'Crustacés de premier choix, crevettes tigrées jumbo, gambas royales, crabes et langoustes.' },
  { id: 14, code: '31155', nom: 'VIENNOISERIE', couleur: '#d97706', image: '/familles/viennoiserie.jpg', description: 'Croissants pur beurre croustillants, pains au chocolat feuilletés, brioches et viennoiseries dorées.' },
  { id: 15, code: '31160', nom: 'BOISSON', couleur: '#06b6d4', image: '/familles/boisson.jpg', description: 'Jus de fruits tropicaux naturels, sodas frais, boissons rafraîchissantes et eaux minérales.' },
  { id: 16, code: '31170', nom: 'PRODUITS LAITIERS', couleur: '#2563eb', image: '/familles/laitiers.jpg', description: 'Laits frais, beurres de table de tradition, yaourts onctueux et assortiment de fromages savoureux.' },
  { id: 17, code: '31180', nom: 'CONFISERIE', couleur: '#ec4899', image: '/familles/confiserie.jpg', description: 'Chocolats fins de dégustation, confiseries gourmandes, bonbons et douceurs sucrées d\'exception.' },
  { id: 18, code: '31190', nom: 'PRODUITS ELABORES', couleur: '#8b5cf6', image: '/familles/elabores.jpg', description: 'Préparations culinaires gourmandes, nuggets croustillants, samoussas dorés, nems et panés.' },
  { id: 19, code: '31194', nom: 'RIZ LOCAL', couleur: '#84cc16', image: '/familles/riz_local.jpg', description: 'Riz local parfumé du Togo, grains longs et naturels issus des meilleures récoltes locales.' },
  { id: 20, code: '31195', nom: 'RIZ', couleur: '#64748b', image: '/familles/riz.jpg', description: 'Riz blanc de qualité supérieure, riz jasmin parfumé et riz basmati pour un repas raffiné.' },
  { id: 21, code: '31196', nom: 'GLACES', couleur: '#f43f5e', image: '/familles/glaces.jpg', description: 'Crèmes glacées artisanales, sorbets aux fruits exotiques, cônes gaufrés et esquimaux rafraîchissants.' },
  { id: 22, code: '31197', nom: 'EMBALLAGE', couleur: '#6b7280', image: '/familles/emballage.jpg', description: 'Barquettes alimentaires, films étirables professionnels, sacs isothermes et solutions de conditionnement.' },
  { id: 23, code: '31198', nom: 'PRESTATION COUPE POISSON', couleur: '#0891b2', image: '/familles/coupe_poisson.jpg', description: 'Service traiteur et découpe professionnelle de poissons frais, écaillage, étêtage et filetage sur mesure.' },
];

export default function FamillesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || 'all';

  const [familles, setFamilles] = useState(defaultFamilles);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panne, setPanne] = useState(false);
  const [selectedCode, setSelectedCode] = useState(initialCode);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const cart = usePanier();
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    document.title = "Nos Grandes Familles de Produits • Contenance & Articles | La Boutique Heistal Togo";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Le catalogue vient du serveur. En cas de panne, un message : jamais de produits inventés,
  // car un produit ajouté au panier doit pouvoir être commandé.
  const fetchData = async () => {
    try {
      setLoading(true);
      setPanne(false);
      const [famRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/familles/`),
        fetch(`${API_BASE}/products/`)
      ]);
      if (!famRes.ok || !prodRes.ok) throw new Error('Réponse refusée par le serveur');
      const [famData, prodData] = await Promise.all([famRes.json(), prodRes.json()]);
      if (Array.isArray(famData) && famData.length > 0) setFamilles(famData);
      setProducts(prodData.filter((p) => p.is_active && p.prix_vente > 0));
    } catch (err) {
      console.warn("Chargement du catalogue impossible :", err);
      setPanne(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mise à jour du paramètre URL lors du changement de filtre
  const handleSelectFamille = (code) => {
    setSelectedCode(code);
    if (code === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ code });
    }
    const targetEl = document.getElementById(`famille-${code}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const addToCart = (product) => {
    ajouterAuPanier(product);
    showToast(`✓ "${product.nom || product.name}" ajouté à votre panier !`);
  };

  const updateQuantity = (id, delta) => {
    const ligne = cart.find((item) => item.id === id);
    if (ligne) changerQuantite(id, ligne.quantite + delta);
  };

  const cartTotal = totalPanier(cart);
  const cartItemCount = nombreArticles(cart);

  // Un produit appartient à la seule famille enregistrée avec lui, jamais à une famille devinée d'après son nom.
  const doesProductBelongToFamille = (product, famille) => {
    if (!product || !famille) return false;
    if (product.famille_code) return product.famille_code === famille.code;
    return String(product.famille) === String(famille.id);
  };

  // Filtrer les familles à afficher
  const visibleFamilles = familles.filter(fam => {
    if (selectedCode === 'all') return true;
    return fam.code === selectedCode || fam.nom.toLowerCase() === selectedCode.toLowerCase() || String(fam.id) === String(selectedCode);
  });

  return (
    <div className="familles-page-wrapper">
      {/* 1. Bandeau supérieur officiel */}
      <div className="familles-topbar">
        <div className="familles-topbar-inner">
          <div className="familles-topbar-left">
            <span>Direct Entrepôt Lomé • Tokoin Wuiti & Adidogomé</span>
            <span style={{ color: '#ffd000' }}>•</span>
            <span>Conservation Garantie -18°C</span>
          </div>
          <div className="familles-topbar-right">
            <span>Ouvert du Lundi au Samedi dès 07h30</span>
            <a 
              href="https://wa.me/22896373842" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="familles-topbar-link"
            >
              WhatsApp Commandes : (+228) 96 37 38 42
            </a>
          </div>
        </div>
      </div>

      {/* 2. En-tête de navigation */}
      <header className="familles-header">
        <div className="familles-header-inner">
          <Link to="/" className="pro-brand" title="La Boutique Heistal - Accueil">
            <div className="pro-brand-signboard">
              <div className="sign-text-container">
                <span className="sign-la-boutique">La Boutique</span>
                <span className="sign-heistal">Heistal</span>
              </div>
            </div>
            <div className="pro-brand-meta">
              <div className="pro-brand-tagline">Comptoir des Surgelés • Lomé</div>
            </div>
          </Link>

          <nav className="familles-nav-links">
            <Link to="/" className="familles-nav-link">
              Accueil
            </Link>
            <Link to="/familles" className="familles-nav-link active">
              Toutes les Familles
            </Link>
            <Link to="/a-propos" className="familles-nav-link">
              À Propos
            </Link>
            <Link to="/mes-commandes" className="familles-nav-link">
              Mes commandes
            </Link>
            <Link to="/admin" className="familles-nav-link admin-pill">
              Gestion Stocks
            </Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              type="button" 
              className="familles-cart-btn"
              onClick={() => setIsCartOpen(true)}
              title="Consulter mon panier"
            >
              <span>Mon Panier</span>
              <span className="cart-badge-pill">{cartItemCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Banner Dédié */}
      <section className="familles-hero-section">
        <div className="familles-hero-content">
          <div className="hero-breadcrumbs">
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Accueil</Link>
            <span>/</span>
            <span style={{ color: '#ffd000', fontWeight: 700 }}>Nos Grandes Familles & Contenance des Produits</span>
          </div>
          <span className="familles-hero-badge">Organisation Officielle du Catalogue Heistal</span>
          <h1 className="familles-hero-title">
            Nos {familles.length} familles de produits
          </h1>
          <p className="familles-hero-desc">
            Explorez ci-dessous chaque famille d'articles et découvrez l'ensemble 
            des produits de première qualité disponibles en stock immédiat et à la commande à Lomé.
          </p>

          <div className="familles-hero-stats">
            <div className="hero-stat-box">
              <span className="stat-number">{familles.length}</span>
              <span className="stat-label">Familles d'Articles</span>
            </div>
            <div className="hero-stat-box">
              <span className="stat-number">{products.length}</span>
              <span className="stat-label">Articles au Catalogue</span>
            </div>
            <div className="hero-stat-box">
              <span className="stat-number">-18°C</span>
              <span className="stat-label">Grand Froid Régulé</span>
            </div>
            <div className="hero-stat-box">
              <span className="stat-number">100%</span>
              <span className="stat-label">Traçabilité & Qualité</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Barre de sélection rapide des 17 Familles */}
      <section className="familles-filter-bar">
        <div className="filter-bar-header">
          <span className="filter-bar-title">Filtrer par Famille de Produits :</span>
          <div className="familles-search-box">
            <input 
              type="text" 
              placeholder="Rechercher un article…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        <BandeDefilante className="familles-pills-scroll" ton="clair">
          <button
            type="button"
            className={`famille-pill-btn ${selectedCode === 'all' ? 'active' : ''}`}
            onClick={() => handleSelectFamille('all')}
          >
            <span>Toutes les Familles ({familles.length})</span>
          </button>

          {familles.map(fam => (
            <button
              key={fam.id || fam.code}
              type="button"
              className={`famille-pill-btn ${selectedCode === fam.code ? 'active' : ''}`}
              onClick={() => handleSelectFamille(fam.code)}
            >
              <span style={{ fontWeight: 700 }}>{fam.nom}</span>
            </button>
          ))}
        </BandeDefilante>
      </section>

      {/* 5. Contenu Détaillé : Familles et Contenance des Produits */}
      <main className="familles-main-container">
        {panne ? (
          <div className="familles-empty-state" role="alert">
            <h3>Impossible de charger le catalogue</h3>
            <p>Vérifiez votre connexion internet, puis réessayez.</p>
            <button type="button" className="btn-primary" onClick={fetchData}>Réessayer</button>
          </div>
        ) : loading ? (
          <div className="familles-loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement des familles et des stocks Heistal Togo...</p>
          </div>
        ) : visibleFamilles.length === 0 ? (
          <div className="familles-empty-state">
            <h3>Aucune famille trouvée</h3>
            <button type="button" className="btn-primary" onClick={() => handleSelectFamille('all')}>
              Afficher toutes les familles
            </button>
          </div>
        ) : (
          visibleFamilles.map(famille => {
            // Filtrer les produits appartenant à cette famille
            const famProducts = products.filter(p => {
              const belongs = doesProductBelongToFamille(p, famille);
              if (!belongs) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const pName = (p.nom || p.name || '').toLowerCase();
                const pDesc = (p.description || p.desc || '').toLowerCase();
                const pRef = (p.reference || '').toLowerCase();
                return pName.includes(q) || pDesc.includes(q) || pRef.includes(q);
              }
              return true;
            });

            return (
              <section 
                key={famille.id || famille.code} 
                id={`famille-${famille.code}`}
                className="famille-section-card"
              >
                {/* En-tête de la Famille */}
                <div className="famille-header-banner">
                  <div className="famille-banner-media">
                    <img 
                      src={getImageUrl(famille.image)} 
                      alt={famille.nom} 
                      className="famille-banner-img"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/familles/volaille.jpg'; }}
                    />
                    <div className="famille-banner-overlay"></div>
                  </div>

                  <div className="famille-banner-info">
                    <div className="famille-title-row">
                      <div>
                        <h2 className="famille-name">{famille.nom}</h2>
                        <div className="famille-meta-sub">
                          <span>{famProducts.length === 0 ? 'Bientôt disponible' : `${famProducts.length} article${famProducts.length > 1 ? 's' : ''}`}</span>
                        </div>
                      </div>
                    </div>

                    <p className="famille-description">
                      {famille.description || "Gamme complète sélectionnée pour particuliers, traiteurs et restaurants de Lomé."}
                    </p>

                    <div className="famille-action-tags">
                      <span className="tag-pill">Conservation -18°C</span>
                      <span className="tag-pill">Livraison Lomé & Environs</span>
                      <span className="tag-pill">Vente au détail & en gros</span>
                    </div>
                  </div>
                </div>

                {/* Contenance des Produits de la Famille */}
                <div className="famille-products-container">
                  {famProducts.length > 0 && (
                    <div className="contenance-header">
                      <h3 className="contenance-title">Les articles</h3>
                      <span className="contenance-count">
                        {famProducts.length} article{famProducts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {famProducts.length === 0 ? (
                    <div className="famille-empty-box">
                      <div>
                        <h4>Bientôt en ligne</h4>
                        <p>Les articles de cette famille arrivent. Demandez-nous ce qui est disponible en boutique.</p>
                        <a
                          href={`https://wa.me/22896373842?text=${encodeURIComponent(`Bonjour La Boutique Heistal, je souhaite commander des articles de la famille ${famille.nom}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-whatsapp-preorder"
                        >
                          Demander sur WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="products-grid-contenance">
                      {famProducts.map(product => {
                        const prix = product.prix_vente || product.price || 0;
                        const unite = product.unite || product.unit || 'kg';
                        const enStock = (product.stock_total ?? 0) > 0;

                        return (
                          <div key={product.id} className="product-item-card">
                            <div className="product-media-wrap">
                              <ProductPhotos product={product} famille={famille} />
                              <span className={`product-stock-tag ${enStock ? '' : 'product-stock-epuise'}`}>{enStock ? 'En stock' : 'Épuisé'}</span>
                            </div>

                            <div className="product-card-details">
                              <h4 className="product-title">{product.nom || product.name}</h4>
                              <p className="product-desc-snippet">
                                {product.description || product.desc || "Article surgelé de première qualité contrôlé et conditionné avec soin."}
                              </p>

                              <div className="product-pricing-box">
                                <div>
                                  <span className="price-main">{prix.toLocaleString('fr-FR')} FCFA</span>
                                  <span className="price-unit"> / {unite}</span>
                                </div>
                                {product.prix_gros && (
                                  <div className="price-wholesale">
                                    Carton : {product.prix_gros.toLocaleString('fr-FR')} FCFA
                                  </div>
                                )}
                              </div>

                              <div className="product-card-actions">
                                <button
                                  type="button"
                                  className="btn-add-cart-action"
                                  onClick={() => addToCart(product)}
                                  disabled={!enStock}
                                >
                                  {enStock ? 'Ajouter au Panier' : 'Bientôt disponible'}
                                </button>
                                <a
                                  href={`https://wa.me/22896373842?text=${encodeURIComponent(`Bonjour La Boutique Heistal, je souhaite commander : ${product.nom || product.name} (${prix} FCFA / ${unite}).`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-wa-direct"
                                  title="Commander directement sur WhatsApp"
                                  aria-label={`Commander ${product.nom || product.name} sur WhatsApp`}
                                >
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm4.52 11.98c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7 2.46 1.06 2.46.71 2.9.66.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* 6. Panier coulissant latéral */}
      {isCartOpen && (
        <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Mon Panier Heistal</h3>
              </div>
              <button type="button" className="btn-close-drawer" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>

            <div className="cart-drawer-body">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <p style={{ fontWeight: 600 }}>Votre panier est vide pour le moment.</p>
                  <p style={{ fontSize: '0.85rem' }}>Ajoutez des articles depuis vos familles de produits préférées.</p>
                </div>
              ) : (
                <div className="cart-items-list">
                  {cart.map(item => (
                    <div key={item.id} className="cart-row-item">
                      <div className="cart-row-info">
                        <strong className="cart-row-title">{item.nom}</strong>
                        <div className="cart-row-price">
                          {item.prix.toLocaleString('fr-FR')} FCFA{item.unite ? ` / ${item.unite}` : ''}
                        </div>
                      </div>
                      <div className="cart-row-controls">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Enlever 1 ${item.nom}`}>-</button>
                        <span>{item.quantite}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Ajouter 1 ${item.nom}`}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="cart-footer-total">
                  <span>Total commande :</span>
                  <strong>{cartTotal.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <Link to="/commander" className="btn-checkout-wa" onClick={() => setIsCartOpen(false)}>
                  Commander ({cartTotal.toLocaleString('fr-FR')} FCFA)
                </Link>
                <p className="cart-footer-note">Pas besoin de compte. Vous recevez un code, et vous payez en boutique au retrait.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="familles-toast">
          {toastMessage}
        </div>
      )}

      {/* 7. Pied de page Heistal */}
      <footer className="familles-footer">
        <div className="familles-footer-inner">
          <div className="footer-col-brand">
            <div className="pro-brand-signboard" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
              <div className="sign-text-container">
                <span className="sign-la-boutique">La Boutique</span>
                <span className="sign-heistal">Heistal</span>
              </div>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Comptoir des produits surgelés de premier choix à Lomé. Poissons de mer, volailles halal, 
              viandes bovines, frites belges, viennoiseries et crèmes glacées.
            </p>
          </div>

          <div className="footer-col-links">
            <h4>Familles Populaires</h4>
            <Link to="/familles?code=31110">Volailles & Découpes</Link>
            <Link to="/familles?code=31130">Poissons & Mers</Link>
            <Link to="/familles?code=31120">Boucherie & Viandes</Link>
            <Link to="/familles?code=31140">Légumes & Frites</Link>
          </div>

          <div className="footer-col-contact">
            <h4>Boutiques à Lomé</h4>
            <p>Tokoin Wuiti (face CEG Tokoin)</p>
            <p>Adidogomé (carrefour douane)</p>
            <p>(+228) 96 37 38 42 / 90 22 11 00</p>
          </div>
        </div>

        <div className="footer-copyright">
          © {new Date().getFullYear()} La Boutique Heistal Togo • Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
