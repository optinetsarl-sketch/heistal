import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BandeDefilante from '../../composants/BandeDefilante';
import { ajouterAuPanier, changerQuantite, nombreArticles, retirerDuPanier, totalPanier, usePanier } from '../commande/panier';
import './indexPage.css';

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

// Un produit du catalogue, dans la forme qu'utilise la vitrine.
function versProduitVitrine(produit) {
  const enStock = (produit.stock_total ?? 0) > 0;
  const image = produit.image || produit.famille_image || '';
  return {
    id: produit.id,
    name: produit.nom,
    price: produit.prix_vente,
    unit: produit.unite || 'pièce',
    unite: produit.unite,
    image: getImageUrl(image),
    imageBrute: image,
    category: produit.famille_code,
    categoryName: produit.famille_nom || 'Produits Heistal',
    famille: produit.famille,
    famille_code: produit.famille_code,
    famille_nom: produit.famille_nom,
    desc: produit.description || 'Article surgelé de première qualité, conservé à -18°C.',
    weight: produit.unite ? `Vendu par ${produit.unite}` : "Vendu à l'unité",
    stock: enStock ? 'En stock' : 'Épuisé pour le moment',
    enStock,
  };
}

export default function IndexPage() {
  const navigate = useNavigate();

  // Le catalogue vient du serveur : un produit ajouté au panier doit pouvoir être commandé.
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogueEtat, setCatalogueEtat] = useState('chargement');

  // Familles de produits synchronisées avec la base de données Django
  const [familles, setFamilles] = useState(defaultFamilles);
  const [loadingFamilles, setLoadingFamilles] = useState(true);

  // Synchronisation dynamique avec l'API /api/familles/
  useEffect(() => {
    const fetchFamilles = async () => {
      try {
        const res = await fetch(`${API_BASE}/familles/`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setFamilles(data);
          }
        }
      } catch (err) {
        console.warn("API Familles connectée en mode local:", err);
      } finally {
        setLoadingFamilles(false);
      }
    };
    const fetchProduits = async () => {
      try {
        const res = await fetch(`${API_BASE}/products/`);
        if (!res.ok) throw new Error('Réponse refusée par le serveur');
        const data = await res.json();
        setCatalogProducts(data.filter((p) => p.is_active && p.prix_vente > 0).map(versProduitVitrine));
        setCatalogueEtat('pret');
      } catch (err) {
        console.warn('Chargement du catalogue impossible :', err);
        setCatalogueEtat('erreur');
      }
    };
    fetchFamilles();
    fetchProduits();
  }, []);

  // Catégories vitrines rétrocompatibles
  const categoryHighlights = familles.slice(0, 4);

  // États de l'application
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilterSelect, setCategoryFilterSelect] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  
  // Le panier est commun à tout le site (accueil, familles, commande).
  const panier = usePanier();
  const cart = panier.map((ligne) => ({ id: ligne.id, name: ligne.nom, price: ligne.prix, quantity: ligne.quantite, image: getImageUrl(ligne.image), unit: ligne.unite }));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [activePage, setActivePage] = useState("accueil");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Le diaporama montre les vraies familles : celles qui ont au moins un produit en stock.
  const famillesEnVitrine = familles
    .map((fam) => ({ fam, enStock: catalogProducts.filter((p) => p.famille === fam.id && p.enStock).length }))
    .filter(({ enStock }) => enStock > 0);
  const articlesEnStock = catalogProducts.filter((p) => p.enStock).length;
  const heroSlides = [
    {
      id: 'general',
      tag: 'Toute la famille Heistal',
      title: 'Comptoir Fraîcheur & Froid -18°C',
      subtitle: 'Arrivages quotidiens • Particuliers & Pros',
      stars: 'Garantie Fraîcheur',
      badge: articlesEnStock > 0 ? `${articlesEnStock} article${articlesEnStock > 1 ? 's' : ''} en stock` : '',
      image: '/heistal_hero_banner.jpg',
      alt: 'Comptoir La Boutique Heistal Lomé',
    },
    ...famillesEnVitrine.map(({ fam, enStock }) => ({
      id: `famille-${fam.id}`,
      tag: 'Nos familles de produits',
      title: fam.nom,
      subtitle: fam.description || 'Produits surgelés sélectionnés par Heistal.',
      stars: 'Voir les produits →',
      badge: `${enStock} article${enStock > 1 ? 's' : ''} en stock`,
      image: getImageUrl(fam.image),
      alt: `Famille ${fam.nom}`,
      lien: `/familles?code=${encodeURIComponent(fam.code)}`,
    })),
  ];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  useEffect(() => {
    if (isSlidePaused) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isSlidePaused, heroSlides.length]);

  const diapo = heroSlides[currentSlideIndex % heroSlides.length];
  const plusieursDiapos = heroSlides.length > 1;
  // Au-delà de 7 diapositives, les points ne tiennent plus sur un téléphone : on affiche « 3 / 12 ».
  const pointsVisibles = heroSlides.length <= 7;
  const cartouche = (
    <>
      <div className="hero-glass-texte">
        <div className="hero-glass-titre">{diapo.title}</div>
        <div className="hero-glass-sous-titre">{diapo.subtitle}</div>
      </div>
      <div className="hero-floating-stats">
        <div className="hero-glass-action">{diapo.stars}</div>
        {diapo.badge && <div className="hero-glass-nombre">{diapo.badge}</div>}
      </div>
    </>
  );

  const nextHeroSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const navigateToSection = (sectionId, pageName) => {
    setActivePage(pageName);
    setIsCategoryDropdownOpen(false);
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const selectCategoryFromNav = (catId) => {
    setSelectedCategory(catId);
    setCategoryFilterSelect(catId);
    setActivePage('catalogue');
    setIsCategoryDropdownOpen(false);
    const el = document.getElementById('catalogue');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const addToCart = (product) => {
    if (!product.enStock) {
      showToast(`"${product.name}" est épuisé pour le moment.`);
      return;
    }
    ajouterAuPanier({ id: product.id, nom: product.name, prix_vente: product.price, unite: product.unite, image: product.imageBrute });
    showToast(`"${product.name}" ajouté au panier !`);
  };

  const updateQuantity = (id, delta) => {
    const ligne = panier.find((l) => l.id === id);
    if (ligne) changerQuantite(id, ligne.quantite + delta);
  };

  const removeFromCart = (id) => {
    retirerDuPanier(id);
  };

  // Calculs totaux (Pour le retrait direct en boutique 24h, aucun frais de livraison)
  const cartSubtotal = totalPanier(panier);
  const cartTotal = cartSubtotal;
  const totalItemCount = nombreArticles(panier);

  // Helper de filtrage universel par code, nom ou alias de famille
  const matchesFamilleOrCategory = (product, filterValue) => {
    if (!filterValue || filterValue === "all") return true;
    const filter = String(filterValue).toLowerCase().trim();
    const pCat = String(product.category || '').toLowerCase().trim();
    const pCatName = String(product.categoryName || '').toLowerCase().trim();
    const pFamNom = String(product.famille_nom || '').toLowerCase().trim();
    const pFamCode = String(product.famille_code || '').toLowerCase().trim();
    const pFamId = String(product.famille || product.famille_id || '');

    if (pCat === filter || pCatName === filter || pFamNom === filter || pFamCode === filter || pFamId === filter) return true;
    if (pFamNom.includes(filter) || filter.includes(pFamNom)) return true;
    if (pCatName.includes(filter) || filter.includes(pCatName)) return true;

    if (filter === 'poissons' || filter === '31130' || filter.includes('poiss')) {
      return pCat.includes('poiss') || pCatName.includes('poiss') || pFamNom.includes('poiss') || pFamCode === '31130';
    }
    if (filter === 'volailles' || filter === '31110' || filter === '31111' || filter.includes('volai')) {
      return pCat.includes('vol') || pCatName.includes('vol') || pFamNom.includes('vol') || pFamCode === '31110' || pFamCode === '31111';
    }
    if (filter === 'viandes' || filter === '31120' || filter.includes('vian')) {
      return pCat.includes('vian') || pCatName.includes('vian') || pFamNom.includes('vian') || pFamCode === '31120';
    }
    if (filter === 'legumes' || filter === '31140' || filter.includes('legum')) {
      return pCat.includes('leg') || pCatName.includes('leg') || pFamNom.includes('leg') || pFamCode === '31140';
    }
    if (filter === 'crustaces' || filter === 'crutaces' || filter === '31150') {
      return pCat.includes('crust') || pCatName.includes('crust') || pCatName.includes('crev') || pCat.includes('poiss');
    }
    return false;
  };

  // Filtrage et Tri
  const filteredProducts = catalogProducts
    .filter(p => {
      const matchCat = matchesFamilleOrCategory(p, selectedCategory) &&
                       matchesFamilleOrCategory(p, categoryFilterSelect);
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return a.name.localeCompare(b.name, 'fr'); // Par défaut : ordre alphabétique
    });
  // Les produits épuisés restent affichés, mais ne comptent pas parmi ceux en stock.
  const disponibles = filteredProducts.filter((p) => p.enStock).length;

  return (
    <div className="pro-ecommerce">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '25px',
          right: '25px',
          zIndex: 10000,
          background: '#07162c',
          color: '#ffffff',
          padding: '0.9rem 1.6rem',
          borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
          border: '1px solid #0284c7',
          fontWeight: 600,
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {toastMessage}
        </div>
      )}


      {/* 2. Main Navigation Header */}
      <header className="pro-header">
        <div className="pro-header-main">
          {/* Brand Logo - Enseigne Officielle La Boutique Heistal */}
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

          {/* Search Bar with category dropdown */}
          <div className="pro-search-container">
            <select 
              className="pro-search-category-select"
              value={categoryFilterSelect}
              onChange={(e) => setCategoryFilterSelect(e.target.value)}
            >
              <option value="all">Tous les rayons</option>
              <option value="poissons">Poissons & Fruits de mer</option>
              <option value="volailles">Volailles Halal</option>
              <option value="viandes">Boucherie & Viandes</option>
              <option value="legumes">Frites & Légumes</option>
            </select>

            <input 
              type="text" 
              className="pro-search-input"
              placeholder="Rechercher un produit surgelé (poisson, poulet, viande...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button type="button" className="pro-search-btn" title="Lancer la recherche">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>

          {/* Header Action Items */}
          <div className="pro-header-actions">
            <a 
              href="https://wa.me/22896373842?text=Bonjour%20La%20Boutique%20Heistal,%20je%20souhaite%20commander%20des%20produits%20surgel%C3%A9s"
              target="_blank"
              rel="noreferrer"
              className="pro-action-item pro-action-whatsapp"
              title="Discuter directement sur WhatsApp"
            >
              <div className="pro-action-icon-circle whatsapp-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.176 8.176 0 0 1-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7 2.46 1.06 2.46.71 2.9.66.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                </svg>
              </div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Assistance</div>
                <div style={{ fontWeight: 700, color: '#007a3d' }}>WhatsApp</div>
              </div>
            </a>

            <a 
              href="tel:+22822264229" 
              className="pro-action-item pro-action-phone"
              title="Appeler directement La Boutique Heistal"
            >
              <div className="pro-action-icon-circle phone-circle">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Appel Direct</div>
                <div style={{ fontWeight: 700 }}>22 26 42 29</div>
              </div>
            </a>

            <Link
              to="/mes-commandes"
              className="pro-action-item pro-action-user"
              title="Retrouver mes commandes avec leur code, ou mon compte client"
              style={{ textDecoration: 'none' }}
            >
              <div className="pro-action-icon-circle user-circle" aria-hidden="true">📋</div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Suivi & compte</div>
                <div style={{ fontWeight: 700 }}>Mes commandes</div>
              </div>
            </Link>

            <Link 
              to="/connexion" 
              className="pro-action-item pro-action-user"
              title="Accès Collaborateurs, Caisse & Administration"
              style={{ textDecoration: 'none' }}
            >
              <div className="pro-action-icon-circle user-circle">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Espace Pro</div>
                <div style={{ fontWeight: 700 }}>Connexion</div>
              </div>
            </Link>

            <button 
              type="button" 
              className="pro-cart-btn"
              onClick={() => setIsCartOpen(true)}
              title="Ouvrir mon panier"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <div className="pro-cart-text-group" style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Mon Panier</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{cartSubtotal.toLocaleString('fr-FR')} FCFA</div>
              </div>
              {totalItemCount > 0 && (
                <span className="pro-cart-badge">{totalItemCount}</span>
              )}
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              className="pro-mobile-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu principal"
              title="Menu de navigation"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isMobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Bande des Pages en haut de la page */}
        <nav className="heistal-pages-bar" aria-label="Bande des pages de navigation">
          <div className="heistal-pages-inner">
            <BandeDefilante className="pages-items-wrapper" ton="sombre">
              {/* 1. Page Accueil */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'accueil' ? 'active' : ''}`}
                onClick={() => navigateToSection('top', 'accueil')}
              >
                <span className="page-nav-label">Accueil</span>
              </button>

              {/* 2. Page Catalogue & Rayons avec menu déroulant */}
              <div 
                className="page-dropdown-container"
                onMouseEnter={() => setIsCategoryDropdownOpen(true)}
                onMouseLeave={() => setIsCategoryDropdownOpen(false)}
              >
                <button 
                  type="button" 
                  className={`page-nav-link ${activePage === 'catalogue' ? 'active' : ''}`}
                  onClick={(e) => {
                    if (window.innerWidth <= 768) {
                      navigateToSection('catalogue', 'catalogue');
                    } else {
                      e.stopPropagation();
                      setIsCategoryDropdownOpen(prev => !prev);
                    }
                  }}
                >
                  <span className="page-nav-label">Catalogue & Rayons</span>
                  <span className="page-badge-counter">{catalogProducts.length}</span>
                  <span className="page-chevron">▾</span>
                </button>

                {isCategoryDropdownOpen && (
                  <div className="pages-dropdown-menu" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    <div className="dropdown-menu-header">
                      Nos Grandes Familles de Produits ({familles.length})
                    </div>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'all' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('all')}
                    >
                      <span>Tous nos rayons</span>
                      <span className="dropdown-item-qty">{catalogProducts.length} articles</span>
                    </button>
                    {familles.map((fam) => (
                      <button 
                        key={fam.id || fam.code} 
                        type="button" 
                        className={`dropdown-item ${selectedCategory === fam.code ? 'selected' : ''}`}
                        onClick={() => selectCategoryFromNav(fam.code)}
                      >
                        <span>{fam.nom}</span>
                        <span className="dropdown-item-qty">{fam.produits_count ? `${fam.produits_count} articles` : 'En stock'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Page Grossistes B2B */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'b2b' ? 'active' : ''}`}
                onClick={() => navigateToSection('b2b', 'b2b')}
              >
                <span className="page-nav-label">Grossistes B2B</span>
                <span className="page-tag-pro">Pro</span>
              </button>

              {/* 5. Page Magasins Lomé */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'magasin' ? 'active' : ''}`}
                onClick={() => navigateToSection('magasin', 'magasin')}
              >
                <span className="page-nav-label">Nos Magasins</span>
              </button>

              {/* 6. Livraison & Froid */}
              <button 
                type="button" 
                className="page-nav-link"
                onClick={() => {
                  showToast("Froid -18°C Garanti : Livraison frigorifique express partout à Lomé !");
                }}
              >
                <span className="page-nav-label">Livraison Lomé</span>
                <span className="page-cold-chip">-18°C</span>
              </button>

              {/* 7. Page À Propos */}
              <Link 
                to="/a-propos" 
                className="page-nav-link"
              >
                <span className="page-nav-label">À Propos</span>
              </Link>
            </BandeDefilante>

            {/* Côté Droit : Horaires & Disponibilité Magasins */}
            <div className="heistal-pages-badge">
              <span className="pages-status-indicator"></span>
              <span className="pages-status-text">Magasins Ouverts • 07h30 - 17h30</span>
            </div>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="pro-mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="pro-mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-head">
                <div className="pro-brand-signboard" style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                  <div className="sign-text-container">
                    <span className="sign-la-boutique">La Boutique</span>
                    <span className="sign-heistal">Heistal</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="mobile-drawer-close"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Fermer le menu"
                >
                  ✕
                </button>
              </div>

              <div className="mobile-drawer-body">
                {/* Magasins status banner */}
                <div className="mobile-status-chip">
                  <span className="pages-status-indicator"></span>
                  <span>Magasins Lomé Ouverts • 07h30 - 17h30</span>
                </div>

                {/* Quick Contacts */}
                <div className="mobile-drawer-contacts">
                  <a 
                    href="https://wa.me/22896373842?text=Bonjour%20La%20Boutique%20Heistal,%20je%20souhaite%20commander%20des%20produits%20surgel%C3%A9s"
                    target="_blank" 
                    rel="noreferrer"
                    className="mobile-contact-pill whatsapp-pill"
                  >
                    <span>💬 WhatsApp (+228 96 37 38 42)</span>
                  </a>
                  <a href="tel:+22822264229" className="mobile-contact-pill phone-pill">
                    <span>📞 22 26 42 29</span>
                  </a>
                </div>

                {/* Navigation list */}
                <nav className="mobile-drawer-nav">
                  <div className="mobile-nav-group-title">Menu Principal</div>
                  <button 
                    type="button" 
                    className={`mobile-nav-item ${activePage === 'accueil' ? 'active' : ''}`}
                    onClick={() => { navigateToSection('top', 'accueil'); setIsMobileMenuOpen(false); }}
                  >
                    <span>🏠 Accueil</span>
                  </button>

                  <button 
                    type="button" 
                    className={`mobile-nav-item ${activePage === 'catalogue' ? 'active' : ''}`}
                    onClick={() => { navigateToSection('catalogue', 'catalogue'); setIsMobileMenuOpen(false); }}
                  >
                    <span>📦 Catalogue des Surgelés</span>
                    <span className="mobile-nav-count">{catalogProducts.length} articles</span>
                  </button>

                  <button 
                    type="button" 
                    className={`mobile-nav-item ${activePage === 'b2b' ? 'active' : ''}`}
                    onClick={() => { navigateToSection('b2b', 'b2b'); setIsMobileMenuOpen(false); }}
                  >
                    <span>🏢 Grossistes & Restauration</span>
                    <span className="page-tag-pro">Pro</span>
                  </button>

                  <button 
                    type="button" 
                    className={`mobile-nav-item ${activePage === 'magasin' ? 'active' : ''}`}
                    onClick={() => { navigateToSection('magasin', 'magasin'); setIsMobileMenuOpen(false); }}
                  >
                    <span>📍 Magasins Tokoin & Adidogomé</span>
                  </button>

                  <Link 
                    to="/familles" 
                    className="mobile-nav-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>🥩 Voir les {familles.length} familles et leurs produits</span>
                    <span className="mobile-nav-arrow">➔</span>
                  </Link>

                  <Link
                    to="/mes-commandes"
                    className="mobile-nav-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>📋 Mes commandes (code ou compte)</span>
                    <span className="mobile-nav-arrow">➔</span>
                  </Link>

                  <Link 
                    to="/a-propos" 
                    className="mobile-nav-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>ℹ️ À Propos de La Boutique Heistal</span>
                  </Link>

                  <Link 
                    to="/connexion" 
                    className="mobile-nav-item pro-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>🔐 Espace Collaborateurs / Caisse</span>
                  </Link>
                </nav>

                {/* Quick Category Jump */}
                <div className="mobile-nav-group-title" style={{ marginTop: '1.25rem' }}>
                  Nos Rayons Principaux
                </div>
                <div className="mobile-rayons-grid">
                  <button type="button" onClick={() => { selectCategoryFromNav('poissons'); setIsMobileMenuOpen(false); }}>
                    🐟 Poissons
                  </button>
                  <button type="button" onClick={() => { selectCategoryFromNav('volailles'); setIsMobileMenuOpen(false); }}>
                    🍗 Volailles
                  </button>
                  <button type="button" onClick={() => { selectCategoryFromNav('viandes'); setIsMobileMenuOpen(false); }}>
                    🥩 Viandes
                  </button>
                  <button type="button" onClick={() => { selectCategoryFromNav('legumes'); setIsMobileMenuOpen(false); }}>
                    🍟 Légumes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Retail Section */}
      <section className="pro-hero-section">
        <div className="pro-hero-container">
          <div>
            <div className="hero-pro-tag">
              FROID -18°C CERTIFIÉ • LA BOUTIQUE HEISTAL
            </div>

            <h1 className="hero-pro-title">
              Le plus grand comptoir de <span className="hero-title-highlight">produits surgelés</span> de qualité
            </h1>

            <p className="hero-pro-subtitle">
              Approvisionnez votre foyer et vos cuisines en poissons nobles d'Atlantique, volailles entières certifiées Halal, 
              viandes sélectionnées et frites belges avec garantie absolue de la chaîne du froid.
            </p>

            <div className="hero-metrics-grid">
              <div className="hero-metric-card">
                <div className="hero-metric-val">+20 Ans</div>
                <div className="hero-metric-label">D'expérience à Lomé</div>
              </div>
              <div className="hero-metric-card">
                <div className="hero-metric-val">-18°C</div>
                <div className="hero-metric-label">Froid certifié constant</div>
              </div>
              <div className="hero-metric-card">
                <div className="hero-metric-val">100% Halal</div>
                <div className="hero-metric-label">Contrôle vétérinaire strict</div>
              </div>
            </div>

            <div className="hero-cta-btns">
              <a href="#catalogue" className="btn-hero-primary">
                Consulter le catalogue
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              <a href="#magasin" className="btn-hero-secondary">
                Visiter nos magasins (Tokoin & Adidogomé)
              </a>
            </div>
          </div>

          {/* Visual Showcase Carousel - Grande Famille des Produits */}
          <div 
            className="hero-visual-card"
            onMouseEnter={() => setIsSlidePaused(true)}
            onMouseLeave={() => setIsSlidePaused(false)}
          >
            {/* Slides track avec transition de fondu soignée */}
            <div className="hero-slides-track">
              {heroSlides.map((slide) => (
                <div 
                  key={slide.id}
                  className={`hero-slide-item ${slide === diapo ? 'active' : ''}`}
                >
                  <img 
                    src={slide.image} 
                    alt={slide.alt} 
                    className="hero-visual-img"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/heistal_hero_banner.jpg'; }}
                  />
                  <div className="hero-slide-gradient-overlay" />
                </div>
              ))}
            </div>

            {/* Boutons de navigation Précédent / Suivant */}
            {plusieursDiapos && (
              <>
                <button 
                  type="button" 
                  className="hero-slider-nav hero-slider-prev" 
                  onClick={prevHeroSlide}
                  aria-label="Diapositive précédente"
                >
                  ‹
                </button>
                <button 
                  type="button" 
                  className="hero-slider-nav hero-slider-next" 
                  onClick={nextHeroSlide}
                  aria-label="Diapositive suivante"
                >
                  ›
                </button>
              </>
            )}

            {/* Badge de la famille en haut à gauche */}
            <div className="hero-slide-tag-pill">
              <span className="hero-slide-tag-pulse" />
              <span>{diapo.tag}</span>
            </div>

            {/* Indicateurs de pagination (Dots) en haut à droite */}
            {plusieursDiapos && pointsVisibles && (
              <div className="hero-slider-dots">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-slider-dot ${slide === diapo ? 'active' : ''}`}
                    onClick={() => setCurrentSlideIndex(idx)}
                    aria-label={idx === 0 ? 'Revenir à la présentation' : `Voir la famille ${slide.title}`}
                  />
                ))}
              </div>
            )}
            {plusieursDiapos && !pointsVisibles && (
              <div className="hero-slider-dots hero-slider-compteur">
                {heroSlides.indexOf(diapo) + 1} / {heroSlides.length}
              </div>
            )}

            {/* Cartouche flottante : sur une famille, elle mène à ses produits. */}
            {diapo.lien ? (
              <Link to={diapo.lien} className="hero-floating-glass hero-floating-lien" aria-label={`Voir les produits de la famille ${diapo.title}`}>
                {cartouche}
              </Link>
            ) : (
              <div className="hero-floating-glass">{cartouche}</div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Pillars of Excellence */}
      <section className="pro-pillars-bar">
        <div className="pro-pillars-grid">
          <div className="pro-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#0284c7' }} />
            <div className="pillar-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>❄️</div>
            <div className="pillar-text-content">
              <div className="pillar-title">Respect Absolu du Froid</div>
              <div className="pillar-sub">Chambres froides et véhicules isothermes régulés en continu à <strong>-18°C</strong>.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#16a34a' }} />
            <div className="pillar-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>🥩</div>
            <div className="pillar-text-content">
              <div className="pillar-title">Produits Certifiés Halal</div>
              <div className="pillar-sub">Volailles et viandes rigoureusement contrôlées par les autorités sanitaires.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#ea580c' }} />
            <div className="pillar-icon-box" style={{ background: '#ffedd5', color: '#ea580c' }}>🚚</div>
            <div className="pillar-text-content">
              <div className="pillar-title">Livraison Lomé & Environs</div>
              <div className="pillar-sub">Livraison en 45 à 90 minutes. <strong>Gratuite</strong> dès 25 000 FCFA d'achat.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#f59e0b' }} />
            <div className="pillar-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>💳</div>
            <div className="pillar-text-content">
              <div className="pillar-title">Paiements Locaux Faciles</div>
              <div className="pillar-sub">Règlement par <strong>TMoney</strong>, <strong>Flooz</strong> ou espèces à la livraison.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Visual Category Showcase - 4 Cartes de Famille & Flèche de redirection vers la page dédiée */}
      <section className="pro-section">
        <div className="section-pro-head">
          <div>
            <span className="section-pro-tag">Rayons Spécialisés Heistal Togo</span>
            <h2 className="section-pro-title">Nos Grandes Familles de Produits</h2>
            <p className="section-pro-desc">Sélectionnez une famille pour explorer directement les stocks frais et surgelés disponibles</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link 
              to="/familles" 
              className="btn-familles-all-link"
              title="Explorer toutes les familles Heistal et leurs produits"
            >
              <span>Voir les {familles.length} familles & produits</span>
              <span className="familles-arrow-icon" aria-hidden="true">➔</span>
            </Link>
          </div>
        </div>

        {/* Grille limitée à SEULEMENT 4 cartes de famille + Flèche de redirection vers la page des familles */}
        <div className="cat-cards-row-wrapper">
          <div className="cat-cards-grid cat-cards-grid-four">
            {(familles && familles.length > 0 ? familles : defaultFamilles).slice(0, 4).map((fam) => {
              const countText = fam.produits_count !== undefined && fam.produits_count > 0 
                ? `${fam.produits_count} article${fam.produits_count > 1 ? 's' : ''}`
                : 'Bientôt disponible';

              return (
                <Link 
                  key={fam.id || fam.code} 
                  to={`/familles?code=${fam.code}`}
                  className="cat-showcase-card"
                  title={`Découvrir la famille ${fam.nom} et sa contenance en produits`}
                >
                  <div className="cat-card-media">
                    <img 
                      src={getImageUrl(fam.image)} 
                      alt={fam.nom} 
                      className="cat-card-img"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/familles/volaille.jpg'; }}
                    />
                  </div>
                  <div className="cat-card-body">
                    <div className="cat-card-title">{fam.nom}</div>
                    <div className="cat-card-desc-text">
                      {fam.description ? fam.description.slice(0, 75) + (fam.description.length > 75 ? '...' : '') : 'Produits surgelés de haute qualité sélectionnés par Heistal.'}
                    </div>
                    <div className="cat-card-footer-row">
                      <span className="cat-card-count">{countText}</span>
                      <span className="cat-card-arrow-cta">Voir les produits ➔</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Flèche interactive latérale dirigeant vers la page complète des familles et leur contenance */}
          <Link 
            to="/familles" 
            className="famille-row-arrow-btn"
            title="Voir toutes les familles et leurs produits"
            aria-label="Voir toutes les familles et leurs produits"
          >
            <div className="arrow-btn-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
            <span className="arrow-btn-label">Toutes les familles</span>
            <span className="arrow-btn-sub">{familles.length} rayons</span>
          </Link>
        </div>

        {/* 6. Product Catalog */}
        <div id="catalogue" className="section-pro-head" style={{ marginTop: '2rem' }}>
          <div>
            <span className="section-pro-tag">Magasin en Ligne</span>
            <h2 className="section-pro-title">Catalogue des Produits Surgelés</h2>
            <p className="section-pro-desc">Commandez au détail ou en carton avec livraison rapide à domicile ou au restaurant</p>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
            {disponibles > 1 ? `${disponibles} articles disponibles en stock` : `${disponibles} article disponible en stock`}
          </div>
        </div>

        {/* Catalog Filter & Sort Toolbar */}
        <div className="catalog-toolbar">
          <BandeDefilante className="catalog-tabs" ton="clair">
            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Tous ({catalogProducts.length})
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'poissons' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('poissons')}
            >
              Poissons & Fruits de mer
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'volailles' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('volailles')}
            >
              Volailles Halal
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'viandes' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('viandes')}
            >
              Boucherie & Viandes
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'legumes' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('legumes')}
            >
              Frites & Légumes
            </button>

            {['all', 'poissons', 'volailles', 'viandes', 'legumes'].indexOf(selectedCategory) === -1 && (
              <button 
                type="button" 
                className="tab-pill active"
                style={{ background: '#007a3d', borderColor: '#007a3d', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                onClick={() => { setSelectedCategory('all'); setCategoryFilterSelect('all'); showToast("Filtre réinitialisé"); }}
                title="Cliquer pour afficher tous les produits"
              >
                <span>Rayon : {familles.find(f => f.code === selectedCategory || f.nom.toLowerCase() === String(selectedCategory).toLowerCase())?.nom || 'Sélection'}</span>
                <span style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>✕</span>
              </button>
            )}
          </BandeDefilante>

          <div className="catalog-sort-wrapper">
            <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>Trier par :</span>
            <select 
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popular">Nom (A → Z)</option>
              <option value="price-asc">Prix : Moins cher d'abord</option>
              <option value="price-desc">Prix : Plus cher d'abord</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {catalogueEtat === 'chargement' && <p className="catalog-etat">Chargement des produits…</p>}
        {catalogueEtat === 'erreur' && (
          <p className="catalog-etat" role="alert">Impossible de charger les produits. Vérifiez votre connexion internet, puis rechargez la page.</p>
        )}
        {catalogueEtat === 'pret' && filteredProducts.length === 0 && (
          <p className="catalog-etat">Aucun produit dans ce rayon pour le moment.</p>
        )}
        <div className="pro-products-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="pro-product-card">
              <div className="product-media">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="product-image"
                  loading="lazy"
                />

                <div className="product-tag-list">
                  {product.badge && (
                    <span className={product.badge.includes('Promo') ? 'tag-promo' : 'tag-halal'}>
                      {product.badge}
                    </span>
                  )}
                  {product.isHalal && (
                    <span className="tag-halal">Halal</span>
                  )}
                  <span className="tag-cold">-18°C</span>
                </div>
              </div>

              <div className="product-details">
                <div className="product-category-line">{product.categoryName}</div>
                <h3 className="product-name-title" title={product.name}>{product.name}</h3>

                <div className="product-stock-status">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: product.enStock ? '#16a34a' : '#94a3b8' }}></span>
                  <span>{product.stock}</span>
                </div>

                <div className="product-spec-row">
                  <span className="spec-val">{product.weight}</span>
                </div>

                <div className="product-price-section">
                  <div>
                    <span className="price-current">{product.price.toLocaleString('fr-FR')} FCFA</span>
                    <span className="price-measure"> /{product.unit}</span>
                  </div>
                  {product.oldPrice && (
                    <span className="price-strikethrough">{product.oldPrice.toLocaleString('fr-FR')} FCFA</span>
                  )}
                </div>

                <div className="product-actions-bar">
                  <button 
                    type="button" 
                    className="btn-add-primary"
                    onClick={() => addToCart(product)}
                    disabled={!product.enStock}
                  >
                    {product.enStock ? <><span>+</span> Ajouter au panier</> : 'Bientôt disponible'}
                  </button>

                  <button 
                    type="button" 
                    className="btn-eye-quick"
                    title="Aperçu rapide"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Pro B2B & Wholesale Section */}
      <section id="b2b" className="pro-section" style={{ paddingTop: 0 }}>
        <div className="pro-b2b-banner">
          <div>
            <span className="b2b-tag">Espace Professionnels & Restauration</span>
            <h2 className="b2b-title">Vous gérez un restaurant, un hôtel ou un supermarché à Lomé ?</h2>
            <p className="b2b-text">
              La Boutique Heistal est le partenaire d'approvisionnement numéro un des professionnels de la gastronomie. 
              Profitez de volumes de stockage garantis, de facturations claires et de livraisons planifiées.
            </p>

            <div className="b2b-perks">
              <div className="b2b-perk-item">✓ Tarifs de gros dégressifs par cartons entiers</div>
              <div className="b2b-perk-item">✓ Arrivages réguliers et stock de sécurité garanti toute l'année</div>
              <div className="b2b-perk-item">✓ Gestionnaire de compte dédié et livraison frigorifique programmée</div>
            </div>

            <a 
              href="https://wa.me/22896373842?text=Bonjour%20La%20Boutique%20Heistal,%20je%20suis%20un%20professionnel%20(Restaurant/H%C3%B4tel)%20et%20je%20souhaite%20obtenir%20la%20grille%20tarifaire%20grossiste"
              target="_blank"
              rel="noreferrer"
              className="btn-hero-primary"
              style={{ display: 'inline-flex' }}
            >
              Demander notre grille tarifaire grossiste
            </a>
          </div>

          <div className="b2b-commercial-card">
            <div className="b2b-card-header">
              <span className="b2b-card-badge">Pôle Entreprises</span>
              <h4 className="b2b-card-title">Service Commercial Heistal B2B</h4>
            </div>
            <div className="b2b-contact-grid">
              <div className="b2b-contact-row">
                <span className="b2b-contact-icon">🏢</span>
                <div className="b2b-contact-info">
                  <span className="b2b-contact-lbl">Siège & Entrepôt</span>
                  <span className="b2b-contact-val">Boulevard Léopold Sédar Senghor, Tokoin Wuiti, Lomé</span>
                </div>
              </div>
              <div className="b2b-contact-row">
                <span className="b2b-contact-icon">☎️</span>
                <div className="b2b-contact-info">
                  <span className="b2b-contact-lbl">Ligne Pro Fixe</span>
                  <a href="tel:+22822264229" className="b2b-contact-val">(+228) 22 26 42 29</a>
                </div>
              </div>
              <div className="b2b-contact-row">
                <span className="b2b-contact-icon">📱</span>
                <div className="b2b-contact-info">
                  <span className="b2b-contact-lbl">Mobile Direct & WhatsApp</span>
                  <a href="tel:+22896373842" className="b2b-contact-val">(+228) 96 37 38 42</a>
                </div>
              </div>
              <div className="b2b-contact-row">
                <span className="b2b-contact-icon">✉️</span>
                <div className="b2b-contact-info">
                  <span className="b2b-contact-lbl">Courriel Professionnel</span>
                  <a href="mailto:info@heistal.com" className="b2b-contact-val">info@heistal.com</a>
                </div>
              </div>
            </div>
            <div className="b2b-guarantee-note">
              <span className="guarantee-icon">⚡</span>
              <span>Réponse garantie sous 2 heures ouvrées pour toute demande grossiste.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Physical Store & Central Counter */}
      <section id="magasin" className="pro-section">
        <div className="pro-store-wrapper">
          <div>
            <span className="section-pro-tag">Point de Vente Central</span>
            <h2 className="section-pro-title" style={{ marginBottom: '1rem' }}>Notre Magasin Central à Lomé</h2>
            <p style={{ color: '#475569', fontSize: '1.025rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              Venez découvrir nos comptoirs réfrigérés modernes au cœur de Lomé. Notre équipe vous accueille 
              du lundi au samedi avec des conseils de découpe personnalisés et des produits garantis au meilleur prix.
            </p>

            <div className="store-detail-card">
              <div className="store-card-icon-wrap" style={{ background: '#dcfce7', color: '#007a3d' }}>🏬</div>
              <div className="store-card-body">
                <div className="store-card-header">
                  <span className="store-card-title">Magasin Central Tokoin Wuiti</span>
                  <span className="store-type-badge">Siège Principal</span>
                </div>
                <div className="store-card-address">Boulevard Léopold Sédar Senghor (à côté du CEG Tokoin Wuiti), Lomé</div>
              </div>
            </div>

            <div className="store-detail-card store-card-secondary">
              <div className="store-card-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>🏪</div>
              <div className="store-card-body">
                <div className="store-card-header">
                  <span className="store-card-title">Boutique Heistal Adidogomé</span>
                  <span className="store-type-badge store-type-badge-alt">Retrait Express</span>
                </div>
                <div className="store-card-address">Quartier Adidogomé, Grand Lomé • Retrait express & comptoir de vente directe</div>
              </div>
            </div>

            <div className="store-detail-card">
              <div className="store-card-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>⏱️</div>
              <div className="store-card-body">
                <div className="store-card-header">
                  <span className="store-card-title">Horaires d'Ouverture des Comptoirs</span>
                  <span className="store-open-pill">Service continu samedi</span>
                </div>
                <div className="store-schedule-grid">
                  <div className="schedule-row">
                    <span className="schedule-days">Lundi au Vendredi :</span>
                    <span className="schedule-hours">07h30 – 12h30 & 14h30 – 17h30</span>
                  </div>
                  <div className="schedule-row">
                    <span className="schedule-days">Samedi :</span>
                    <span className="schedule-hours">07h30 – 13h30 (continu)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="store-detail-card">
              <div className="store-card-icon-wrap" style={{ background: '#fee2e2', color: '#d90429' }}>📞</div>
              <div className="store-card-body">
                <div className="store-card-header">
                  <span className="store-card-title">Lignes Directes & Commandes</span>
                </div>
                <div className="store-phones-wrap">
                  <a href="tel:+22822264229" className="store-phone-tag">
                    <span className="phone-type">Fixe</span> (+228) 22 26 42 29
                  </a>
                  <a href="tel:+22822618680" className="store-phone-tag">
                    <span className="phone-type">Standard</span> (+228) 22 61 86 80
                  </a>
                  <a href="tel:+22896373842" className="store-phone-tag phone-highlight">
                    <span className="phone-type">Direct / WhatsApp</span> (+228) 96 37 38 42
                  </a>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <a 
                href="https://maps.google.com/?q=CEG+Tokoin+Wuiti+Lome"
                target="_blank"
                rel="noreferrer"
                className="btn-hero-primary"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
              >
                Itinéraire Google Maps
              </a>

              <a 
                href="tel:+22822264229" 
                className="btn-store-call"
              >
                <span>📞</span>
                <span>Appeler le magasin</span>
              </a>
            </div>
          </div>

          <div>
            <img 
              src="/heistal_hero_banner.jpg" 
              alt="Magasin Central La Boutique Heistal" 
              className="store-hero-img"
            />
          </div>
        </div>
      </section>

      {/* 9. Slide-in Cart Drawer */}
      {isCartOpen && (
        <div className="pro-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="pro-cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="drawer-title">Votre Panier ({totalItemCount} articles)</div>
              <button 
                type="button" 
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                <h4 style={{ color: '#0b1f3a', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Votre panier est vide</h4>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Parcourez nos poissons, volailles Halal et légumes surgelés.</p>
                <button 
                  type="button" 
                  className="btn-hero-primary"
                  onClick={() => setIsCartOpen(false)}
                >
                  Continuer mes achats
                </button>
              </div>
            ) : (
              <>
                <div className="drawer-body">
                  {cart.map(item => (
                    <div key={item.id} className="drawer-item">
                      <img src={item.image} alt={item.name} className="drawer-item-img" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0b1f3a', marginBottom: '0.2rem' }}>
                          {item.name}
                        </div>
                        <div style={{ color: '#0284c7', fontWeight: 800, fontSize: '0.88rem' }}>
                          {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 700 }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.quantity}</span>
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 700 }}
                          >
                            +
                          </button>
                          <button 
                            type="button" 
                            onClick={() => removeFromCart(item.id)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="drawer-foot">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span>Sous-total articles :</span>
                    <strong>{cartSubtotal.toLocaleString('fr-FR')} FCFA</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#64748b' }}>
                    <span>Retrait en boutique (24h) :</span>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>Gratuit (Réservation 24h)</span>
                  </div>

                  <div style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Réservation immédiate au grand froid • Retrait sous 24h garanti sans création de compte
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 900, color: '#0b1f3a', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                    <span>Total à régler :</span>
                    <span style={{ color: '#0284c7' }}>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  <button 
                    type="button" 
                    className="btn-proceed-checkout"
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/commander');
                    }}
                  >
                    Commander (avec ou sans compte) →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="pro-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div 
            className="pro-quickview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge-tag-halal" style={{ marginRight: '0.5rem' }}>{selectedProduct.categoryName}</span>
                {selectedProduct.isHalal && <span className="badge-tag-halal">Certifié Halal</span>}
                <h3 style={{ color: '#0b1f3a', fontSize: '1.45rem', marginTop: '0.5rem', fontWeight: 800 }}>{selectedProduct.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name} 
              className="quickview-modal-img"
            />

            <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              {selectedProduct.desc}
            </p>

            <div className="quickview-specs-card">
              <div className="quickview-spec-row">
                <span className="spec-row-label">Conditionnement</span>
                <span className="spec-row-value">{selectedProduct.weight}</span>
              </div>
              <div className="quickview-spec-row">
                <span className="spec-row-label">Température de conservation</span>
                <span className="spec-row-value cold-val">Congélateur à -18°C</span>
              </div>
              <div className="quickview-spec-row">
                <span className="spec-row-label">Disponibilité</span>
                <span className="spec-row-value stock-val">{selectedProduct.stock}</span>
              </div>
              <div className="quickview-price-row">
                <span className="price-row-label">Prix unitaire</span>
                <span className="price-row-value">
                  {selectedProduct.price.toLocaleString('fr-FR')} FCFA <span className="price-unit-sub">/{selectedProduct.unit}</span>
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-add-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
              onClick={() => {
                addToCart(selectedProduct);
                setSelectedProduct(null);
              }}
            >
              + Ajouter au panier ({selectedProduct.price.toLocaleString('fr-FR')} FCFA)
            </button>
          </div>
        </div>
      )}

      {/* 12. Corporate & Retail Footer */}
      <footer className="pro-footer">
        <div className="pro-footer-inner">
          <div className="footer-top-grid">
            <div>
              <div className="pro-brand" style={{ marginBottom: '1rem' }}>
                <div className="pro-brand-signboard" style={{ padding: '0.25rem 0.75rem', minWidth: '130px' }}>
                  <div className="sign-text-container">
                    <span className="sign-la-boutique" style={{ fontSize: '0.72rem' }}>La Boutique</span>
                    <span className="sign-heistal" style={{ fontSize: '1.65rem' }}>Heistal</span>
                  </div>
                </div>
                <div>
                  <div className="pro-brand-name-full" style={{ color: '#ffffff' }}>La Boutique Heistal</div>
                  <div className="pro-brand-tagline" style={{ color: '#ffd000' }}>Comptoirs Tokoin & Adidogomé</div>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#94a3b8', marginBottom: '1.5rem' }}>
                Leader de la distribution de produits congelés et surgelés de qualité depuis plus de 20 ans. 
                Importation directe, chambres froides aux normes ISO et livraison rapide pour foyers, hôtels et restaurants.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span className="badge-cold-chain">-18°C Garanti</span>
                <span className="badge-tag-halal">Certifié Halal</span>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Nos Rayons Surgelés</div>
              <ul className="footer-links-list">
                <li><a href="#catalogue" onClick={() => setSelectedCategory('poissons')}>Poissons & Crustacés d'Atlantique</a></li>
                <li><a href="#catalogue" onClick={() => setSelectedCategory('volailles')}>Volailles Entières & Cuisses Halal</a></li>
                <li><a href="#catalogue" onClick={() => setSelectedCategory('viandes')}>Bœuf & Agneau Façon Bouchère</a></li>
                <li><a href="#catalogue" onClick={() => setSelectedCategory('legumes')}>Frites Belges & Légumes Croquants</a></li>
                <li><a href="#catalogue">Snacks & Nuggets Croustillants</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Magasins & Contacts</div>
              <ul className="footer-links-list footer-contacts-list">
                <li className="footer-contact-item">
                  <span className="footer-contact-icon">📍</span>
                  <span className="footer-contact-text">Boulevard Léopold Sédar Senghor, Tokoin Wuiti, Lomé</span>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon">☎️</span>
                  <span className="footer-contact-text">Fixe : <a href="tel:+22822264229">(+228) 22 26 42 29</a></span>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon">📱</span>
                  <span className="footer-contact-text">Mobile & WA : <a href="tel:+22896373842">(+228) 96 37 38 42</a></span>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon">✉️</span>
                  <span className="footer-contact-text">Courriel : <a href="mailto:info@heistal.com">info@heistal.com</a></span>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-icon">⏱️</span>
                  <span className="footer-contact-text">Lun - Ven : 07h30-17h30 | Sam : 07h30-13h30</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Services & Engagements</div>
              <ul className="footer-links-list">
                <li><Link to="/a-propos">À Propos de La Boutique Heistal</Link></li>
                <li><a href="#b2b">Espace Restauration & Hôtellerie</a></li>
                <li><a href="#b2b">Commandes en Gros par Cartons</a></li>
                <li><a href="#catalogue">Chaîne du Froid -18°C Garantie</a></li>
                <li><a href="#catalogue">Retrait Express en Magasin</a></li>
                <li><a href="#catalogue">Livraison Frigorifique Lomé</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>© {new Date().getFullYear()} La Boutique Heistal. Tous droits réservés. Référence du surgelé à Lomé.</div>
            <div className="footer-payment-methods">
              <span>Paiements acceptés : Espèces à la livraison • TMoney • Flooz</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 13. Mobile Bottom Sticky Navigation Bar */}
      <nav className="pro-mobile-bottom-nav" aria-label="Navigation mobile rapide">
        <button 
          type="button" 
          className={`bottom-nav-item ${activePage === 'accueil' ? 'active' : ''}`}
          onClick={() => navigateToSection('top', 'accueil')}
        >
          <span className="bottom-nav-icon">🏠</span>
          <span className="bottom-nav-label">Accueil</span>
        </button>

        <button 
          type="button" 
          className={`bottom-nav-item ${activePage === 'catalogue' ? 'active' : ''}`}
          onClick={() => navigateToSection('catalogue', 'catalogue')}
        >
          <span className="bottom-nav-icon">📦</span>
          <span className="bottom-nav-label">Rayons</span>
        </button>

        <a 
          href="https://wa.me/22896373842?text=Bonjour%20La%20Boutique%20Heistal,%20je%20souhaite%20commander%20des%20produits%20surgel%C3%A9s"
          target="_blank"
          rel="noopener noreferrer"
          className="bottom-nav-item bottom-nav-whatsapp"
        >
          <span className="bottom-nav-icon whatsapp-icon">💬</span>
          <span className="bottom-nav-label">WhatsApp</span>
        </a>

        <Link
          to="/mes-commandes"
          className="bottom-nav-item"
        >
          <span className="bottom-nav-icon">📋</span>
          <span className="bottom-nav-label">Commandes</span>
        </Link>

        <button 
          type="button" 
          className="bottom-nav-item bottom-nav-cart"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="bottom-cart-badge-wrap">
            <span className="bottom-nav-icon">🛒</span>
            {totalItemCount > 0 && <span className="bottom-cart-badge">{totalItemCount}</span>}
          </div>
          <span className="bottom-nav-label">Panier</span>
        </button>
      </nav>
    </div>
  );
}
