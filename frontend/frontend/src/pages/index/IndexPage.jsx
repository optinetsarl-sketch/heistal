import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './indexPage.css';

export default function IndexPage() {
  // Catalogue complet des produits La Boutique Heistal
  const catalogProducts = [
    {
      id: 1,
      name: "Tilapia Frais Surgelé de Première Qualité",
      category: "poissons",
      categoryName: "Poissons & Fruits de mer",
      price: 2800,
      oldPrice: 3200,
      unit: "kg",
      image: "/heistal_fish.jpg",
      badge: "Promo",
      isHalal: true,
      desc: "Poisson entier nettoyé et écaillé, surgelé immédiatement après pêche à -18°C pour préserver sa chair tendre et sa saveur naturelle.",
      weight: "1 kg (environ 2 à 3 pièces)",
      stock: "En stock • Magasin Tokoin",
      rating: 4.9,
      reviews: 124
    },
    {
      id: 2,
      name: "Crevettes Géantes Royales Tigrées (Jumbo)",
      category: "poissons",
      categoryName: "Poissons & Fruits de mer",
      price: 6500,
      oldPrice: 7200,
      unit: "barquette 800g",
      image: "/heistal_fish.jpg",
      badge: "Coup de cœur",
      isHalal: true,
      desc: "Grosses crevettes d'eau profonde décortiquées et prêtes à cuire. Idéales pour grillades, brochettes et sauces raffinées.",
      weight: "Barquette scellée 800g",
      stock: "En stock • Livraison express",
      rating: 5.0,
      reviews: 86
    },
    {
      id: 3,
      name: "Maquereau de l'Atlantique Calibre 300/500",
      category: "poissons",
      categoryName: "Poissons & Fruits de mer",
      price: 2200,
      oldPrice: 2500,
      unit: "kg",
      image: "/heistal_hero_banner.jpg",
      badge: "Populaire",
      isHalal: true,
      desc: "Riche en acides gras oméga-3 essentiels. Chair dense et savoureuse, parfait pour le braisage ou les sauces traditionnelles.",
      weight: "1 kg (2 à 3 maquereaux)",
      stock: "En stock • Magasin Tokoin",
      rating: 4.8,
      reviews: 210
    },
    {
      id: 4,
      name: "Dorade Royale Éviscérée Qualité Supérieure",
      category: "poissons",
      categoryName: "Poissons & Fruits de mer",
      price: 3900,
      oldPrice: 4400,
      unit: "kg",
      image: "/heistal_fish.jpg",
      badge: "Chef Sélection",
      isHalal: true,
      desc: "Poisson noble très prisé par les chefs de restaurants et hôtels de Lomé. Chair blanche délicate et sans arêtes résiduelles.",
      weight: "1 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.9,
      reviews: 67
    },
    {
      id: 5,
      name: "Poulet Fermier Entier Prêt à Cuire Halal",
      category: "volailles",
      categoryName: "Volailles Halal",
      price: 3500,
      oldPrice: null,
      unit: "pièce (~1.3kg)",
      image: "/heistal_poultry.jpg",
      badge: "Certifié Halal",
      isHalal: true,
      desc: "Poulet de première qualité abattu selon le rite Halal sous strict contrôle vétérinaire. Idéal pour rôtissage et plats mijotés.",
      weight: "Pièce entière d'environ 1.3 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.9,
      reviews: 312
    },
    {
      id: 6,
      name: "Cuisses de Poulet Surgelées (Carton 10kg ou au kg)",
      category: "volailles",
      categoryName: "Volailles Halal",
      price: 2400,
      oldPrice: 2700,
      unit: "kg",
      image: "/heistal_poultry.jpg",
      badge: "Meilleure vente",
      isHalal: true,
      desc: "Découpe de cuisse charnue avec haut de cuisse. Conditionnement au détail ou en carton de 10 kg pour les familles et événements.",
      weight: "1 kg (ou carton de 10 kg)",
      stock: "En stock • Magasin Tokoin",
      rating: 4.8,
      reviews: 450
    },
    {
      id: 7,
      name: "Ailes de Poulet Croustillantes (Wings Halal)",
      category: "volailles",
      categoryName: "Volailles Halal",
      price: 2600,
      oldPrice: null,
      unit: "kg",
      image: "/heistal_poultry.jpg",
      badge: "Certifié Halal",
      isHalal: true,
      desc: "Ailes de poulet calibrées idéales pour beignets, marinades épicées, friture et barbecues festifs.",
      weight: "1 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.7,
      reviews: 140
    },
    {
      id: 8,
      name: "Steak Haché Pur Bœuf Façon Bouchère",
      category: "viandes",
      categoryName: "Viandes & Boucherie",
      price: 4200,
      oldPrice: 4700,
      unit: "kg (8 steaks)",
      image: "/heistal_meat.jpg",
      badge: "Certifié Halal",
      isHalal: true,
      desc: "100% viande bovine sélectionnée sans conservateurs ni colorants. Moelleux garanti pour burgers faits maison et repas rapides.",
      weight: "1 kg (8 portions de 125g)",
      stock: "En stock • Magasin Tokoin",
      rating: 4.9,
      reviews: 95
    },
    {
      id: 9,
      name: "Côtes d'Agneau & Mouton Découpées",
      category: "viandes",
      categoryName: "Viandes & Boucherie",
      price: 5800,
      oldPrice: null,
      unit: "kg",
      image: "/heistal_meat.jpg",
      badge: "Qualité Supérieure",
      isHalal: true,
      desc: "Découpe artisanale tendre et savoureuse. Parfait pour méchoui, ragoûts et grillades dominicales.",
      weight: "1 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.8,
      reviews: 58
    },
    {
      id: 10,
      name: "Frites Belges Golden Cut Surgelées 2.5kg",
      category: "legumes",
      categoryName: "Frites & Légumes",
      price: 3200,
      oldPrice: 3800,
      unit: "sac 2.5kg",
      image: "/heistal_fries.jpg",
      badge: "Format Éco",
      isHalal: true,
      desc: "Pommes de terre d'origine européenne précuites à l'huile végétale. Texture ultra croustillante à l'extérieur et fondante à cœur.",
      weight: "Grand sac 2.5 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.9,
      reviews: 280
    },
    {
      id: 11,
      name: "Macédoine de Légumes & Petits Pois 1kg",
      category: "legumes",
      categoryName: "Frites & Légumes",
      price: 1800,
      oldPrice: null,
      unit: "sachet 1kg",
      image: "/heistal_fries.jpg",
      badge: "Fraîcheur Récolte",
      isHalal: true,
      desc: "Mélange coloré de carottes en dés, petits pois doux, haricots verts coupés et grains de maïs surgelés immédiatement après récolte.",
      weight: "Sachet 1 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.7,
      reviews: 72
    },
    {
      id: 12,
      name: "Nuggets de Poulet Extra Croustillants 1kg",
      category: "legumes",
      categoryName: "Frites & Légumes",
      price: 3400,
      oldPrice: 3900,
      unit: "sachet 1kg",
      image: "/heistal_fries.jpg",
      badge: "Favori Enfants",
      isHalal: true,
      desc: "Bouchées de filets de poulet panées avec une chapelure dorée et croustillante. Prêtes en 8 minutes à la poêle ou au four.",
      weight: "Sachet 1 kg",
      stock: "En stock • Magasin Tokoin",
      rating: 4.8,
      reviews: 165
    }
  ];

  // Catégories vitrines
  const categoryHighlights = [
    { id: 'poissons', name: 'Poissons & Fruits de mer', count: '45 références', image: '/heistal_fish.jpg' },
    { id: 'volailles', name: 'Volailles Découpées Halal', count: '32 références', image: '/heistal_poultry.jpg' },
    { id: 'viandes', name: 'Boucherie & Viandes', count: '24 références', image: '/heistal_meat.jpg' },
    { id: 'legumes', name: 'Frites Belges & Légumes', count: '28 références', image: '/heistal_fries.jpg' }
  ];

  // États de l'application
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilterSelect, setCategoryFilterSelect] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  
  // Panier initialisé avec 2 articles pour démonstration vivante
  const [cart, setCart] = useState([
    { ...catalogProducts[0], quantity: 2 },
    { ...catalogProducts[4], quantity: 1 }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [activePage, setActivePage] = useState("accueil");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

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

  const goToOffers = () => {
    setActivePage('offres');
    setIsCategoryDropdownOpen(false);
    const el = document.getElementById('offres');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      const catEl = document.getElementById('catalogue');
      if (catEl) catEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Formulaire de commande Lomé
  const [orderForm, setOrderForm] = useState({
    name: "",
    phone: "",
    quarter: "Tokoin Wuiti (Proximité Magasin)",
    addressDetails: "",
    paymentMethod: "delivery_cash"
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showToast(`✓ "${product.name}" ajouté à votre panier !`);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculs totaux
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = cartSubtotal >= 25000 || cartSubtotal === 0 ? 0 : 1500;
  const cartTotal = cartSubtotal + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filtrage et Tri
  const filteredProducts = catalogProducts
    .filter(p => {
      const matchCat = (selectedCategory === "all" || p.category === selectedCategory) &&
                       (categoryFilterSelect === "all" || p.category === categoryFilterSelect);
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.rating - a.rating; // Default 'popular'
    });

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    setOrderConfirmed(true);
    setCart([]);
  };

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
              <div className="pro-brand-locations">
                <span className="location-pill">📍 Tokoin</span>
                <span className="location-pill">📍 Adidogomé</span>
              </div>
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
              placeholder="Rechercher tilapia, poulet halal, crevettes, frites belges..."
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
              className="pro-action-item"
              title="Discuter directement sur WhatsApp"
            >
              <div className="pro-action-icon-circle" style={{ background: '#ecfdf5', color: '#16a34a' }}>
                💬
              </div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Assistance</div>
                <div style={{ fontWeight: 700 }}>WhatsApp</div>
              </div>
            </a>

            <a 
              href="tel:+22822264229" 
              className="pro-action-item"
              title="Appeler directement La Boutique Heistal"
            >
              <div className="pro-action-icon-circle" style={{ background: '#ecfdf5', color: '#007a3d' }}>📞</div>
              <div className="pro-action-text-group">
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Appel Direct</div>
                <div style={{ fontWeight: 700 }}>22 26 42 29</div>
              </div>
            </a>

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
          </div>
        </div>

        {/* Bande des Pages en haut de la page */}
        <nav className="heistal-pages-bar" aria-label="Bande des pages de navigation">
          <div className="heistal-pages-inner">
            <div className="pages-items-wrapper">
              {/* 1. Page Accueil */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'accueil' ? 'active' : ''}`}
                onClick={() => navigateToSection('top', 'accueil')}
              >
                <span className="page-nav-icon">🏠</span>
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
                  onClick={() => navigateToSection('catalogue', 'catalogue')}
                >
                  <span className="page-nav-icon">🛒</span>
                  <span className="page-nav-label">Catalogue & Rayons</span>
                  <span className="page-badge-counter">{catalogProducts.length}</span>
                  <span className="page-chevron">▾</span>
                </button>

                {isCategoryDropdownOpen && (
                  <div className="pages-dropdown-menu">
                    <div className="dropdown-menu-header">
                      Rayons disponibles Heistal
                    </div>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'all' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('all')}
                    >
                      <span>📦 Tous nos rayons</span>
                      <span className="dropdown-item-qty">{catalogProducts.length} articles</span>
                    </button>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'poissons' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('poissons')}
                    >
                      <span>🐟 Poissons & Fruits de mer</span>
                      <span className="dropdown-item-qty">45 réf.</span>
                    </button>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'volailles' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('volailles')}
                    >
                      <span>🍗 Volailles Découpées Halal</span>
                      <span className="dropdown-item-qty">32 réf.</span>
                    </button>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'viandes' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('viandes')}
                    >
                      <span>🥩 Boucherie & Viandes</span>
                      <span className="dropdown-item-qty">24 réf.</span>
                    </button>
                    <button 
                      type="button" 
                      className={`dropdown-item ${selectedCategory === 'legumes' ? 'selected' : ''}`}
                      onClick={() => selectCategoryFromNav('legumes')}
                    >
                      <span>🍟 Frites Belges & Légumes</span>
                      <span className="dropdown-item-qty">28 réf.</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Page Ventes Flash & Promos */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'offres' ? 'active' : ''}`}
                onClick={goToOffers}
              >
                <span className="page-nav-icon">🔥</span>
                <span className="page-nav-label">Offres Flash</span>
                <span className="page-badge-flash">-15%</span>
              </button>

              {/* 4. Page Grossistes B2B */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'b2b' ? 'active' : ''}`}
                onClick={() => navigateToSection('b2b', 'b2b')}
              >
                <span className="page-nav-icon">📦</span>
                <span className="page-nav-label">Tarifs Grossistes B2B</span>
                <span className="page-tag-pro">Pro / Resto</span>
              </button>

              {/* 5. Page Magasins Lomé */}
              <button 
                type="button" 
                className={`page-nav-link ${activePage === 'magasin' ? 'active' : ''}`}
                onClick={() => navigateToSection('magasin', 'magasin')}
              >
                <span className="page-nav-icon">📍</span>
                <span className="page-nav-label">Nos Magasins</span>
                <span className="page-status-open">Tokoin • Adidogomé</span>
              </button>

              {/* 6. Livraison & Froid */}
              <button 
                type="button" 
                className="page-nav-link"
                onClick={() => {
                  showToast("❄️ Froid -18°C Garanti : Livraison frigorifique express partout à Lomé !");
                }}
              >
                <span className="page-nav-icon">🚚</span>
                <span className="page-nav-label">Livraison Lomé</span>
                <span className="page-cold-chip">-18°C</span>
              </button>
            </div>

            {/* Côté Droit : Horaires & Disponibilité Magasins */}
            <div className="heistal-pages-badge">
              <span className="pages-status-indicator"></span>
              <span className="pages-status-text">Magasins Ouverts • 07h30 - 17h30</span>
            </div>
          </div>
        </nav>
      </header>

      {/* 3. Hero Retail Section */}
      <section className="pro-hero-section">
        <div className="pro-hero-container">
          <div>
            <div className="hero-pro-tag">
              <span>❄️</span>
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
                📍 Visiter Tokoin & Adidogomé
              </a>
            </div>
          </div>

          {/* Visual Card */}
          <div className="hero-visual-card">
            <img 
              src="/heistal_hero_banner.jpg" 
              alt="Comptoir La Boutique Heistal" 
              className="hero-visual-img"
            />
            <div className="hero-floating-glass">
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff' }}>Comptoir Fraîcheur & Froid -18°C</div>
                <div style={{ fontSize: '0.8rem', color: '#ffd000', fontWeight: 600 }}>Arrivages quotidiens • Particuliers & Pros</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#ffd000', fontSize: '0.95rem' }}>★★★★★</div>
                <div style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 700 }}>4.9/5 Avis Clients</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pillars of Excellence */}
      <section className="pro-pillars-bar">
        <div className="pro-pillars-grid">
          <div className="pro-pillar-card">
            <div className="pillar-icon-box">❄️</div>
            <div>
              <div className="pillar-title">Respect Absolu du Froid</div>
              <div className="pillar-sub">Chambres froides et véhicules isothermes régulés en continu à -18°C.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-icon-box">🍗</div>
            <div>
              <div className="pillar-title">Produits Certifiés Halal</div>
              <div className="pillar-sub">Volailles et viandes rigoureusement contrôlées par les autorités sanitaires.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-icon-box">🚚</div>
            <div>
              <div className="pillar-title">Livraison Lomé & Environs</div>
              <div className="pillar-sub">Livraison en 45 à 90 minutes. Gratuite pour toute commande dès 25 000 FCFA.</div>
            </div>
          </div>

          <div className="pro-pillar-card">
            <div className="pillar-icon-box">💳</div>
            <div>
              <div className="pillar-title">Paiements Locaux Faciles</div>
              <div className="pillar-sub">Règlement par TMoney, Flooz ou paiement en espèces directement à la livraison.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Visual Category Showcase */}
      <section className="pro-section">
        <div className="section-pro-head">
          <div>
            <span className="section-pro-tag">Rayons Spécialisés</span>
            <h2 className="section-pro-title">Nos Grandes Familles de Produits</h2>
            <p className="section-pro-desc">Sélectionnez une catégorie pour filtrer instantanément les stocks disponibles</p>
          </div>
        </div>

        <div className="cat-cards-grid">
          {categoryHighlights.map((cat) => (
            <div 
              key={cat.id} 
              className="cat-showcase-card"
              onClick={() => {
                setSelectedCategory(cat.id);
                const el = document.getElementById('catalogue');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="cat-card-media">
                <img src={cat.image} alt={cat.name} className="cat-card-img" />
              </div>
              <div className="cat-card-body">
                <div className="cat-card-title">{cat.name}</div>
                <div className="cat-card-count">{cat.count} • Découvrir →</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ventes Flash & Offres Promotionnelles Heistal */}
        <div id="offres" className="flash-deals-banner">
          <div className="flash-deals-content">
            <div className="flash-icon-box">🔥</div>
            <div>
              <div className="flash-title">Ventes Flash & Promotions de la Semaine</div>
              <div className="flash-subtitle">
                Profitez de remises exclusives jusqu'à -15% sur une sélection de poissons, viandes et découpes surgelées à Lomé.
              </div>
            </div>
          </div>
          <div className="flash-timer-box">
            <div className="flash-timer-pill">
              <span>⏱️ Offres de la semaine</span>
              <span>• Stock spécial Tokoin</span>
            </div>
            <button 
              type="button" 
              className="btn-hero-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.86rem' }}
              onClick={() => {
                const el = document.getElementById('catalogue');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                showToast("🔥 Sélection des produits en promotion affichée !");
              }}
            >
              Découvrir les offres ↓
            </button>
          </div>
        </div>

        {/* 6. Product Catalog */}
        <div id="catalogue" className="section-pro-head" style={{ marginTop: '2rem' }}>
          <div>
            <span className="section-pro-tag">Magasin en Ligne</span>
            <h2 className="section-pro-title">Catalogue des Produits Surgelés</h2>
            <p className="section-pro-desc">Commandez au détail ou en carton avec livraison rapide à domicile ou au restaurant</p>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
            {filteredProducts.length} articles disponibles en stock
          </div>
        </div>

        {/* Catalog Filter & Sort Toolbar */}
        <div className="catalog-toolbar">
          <div className="catalog-tabs">
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
              🐟 Poissons & Fruits de mer
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'volailles' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('volailles')}
            >
              🍗 Volailles Halal
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'viandes' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('viandes')}
            >
              🥩 Boucherie & Viandes
            </button>

            <button 
              type="button" 
              className={`tab-pill ${selectedCategory === 'legumes' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('legumes')}
            >
              🍟 Frites & Légumes
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Trier par :</span>
            <select 
              className="catalog-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popular">Popularité & Avis</option>
              <option value="price-asc">Prix : Moins cher d'abord</option>
              <option value="price-desc">Prix : Plus cher d'abord</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
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
                <h3 className="product-name-title">{product.name}</h3>

                <div className="product-stock-status">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                  <span>{product.stock}</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.85rem' }}>
                  Conditionnement : <strong>{product.weight}</strong>
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
                  >
                    <span>+</span> Ajouter au panier
                  </button>

                  <button 
                    type="button" 
                    className="btn-eye-quick"
                    title="Aperçu rapide"
                    onClick={() => setSelectedProduct(product)}
                  >
                    👁️
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
              Demander notre grille tarifaire grossiste 📋
            </a>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '2rem' }}>
            <h4 style={{ color: '#38bdf8', marginBottom: '1rem', fontSize: '1.15rem' }}>Service Commercial Heistal B2B</h4>
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              <div>🏢 <strong>Siège :</strong> Boulevard Léopold Sédar Senghor, Lomé</div>
              <div>📞 <strong>Ligne Pro :</strong> (+228) 22 26 42 29</div>
              <div>📱 <strong>Mobile Direct :</strong> (+228) 96 37 38 42</div>
              <div>✉️ <strong>Email Pro :</strong> info@heistal.com</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Réponse garantie sous 2 heures ouvrées pour toute demande de devis en gros.
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
              <div className="store-icon-cube">📍</div>
              <div>
                <div style={{ fontWeight: 800, color: '#00361a', fontSize: '0.98rem' }}>Magasin Central Tokoin Wuiti</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Boulevard Léopold Sédar Senghor (à côté du CEG Tokoin Wuiti), Lomé</div>
              </div>
            </div>

            <div className="store-detail-card" style={{ borderLeft: '4px solid #ffd000' }}>
              <div className="store-icon-cube" style={{ background: '#fffadb', color: '#007a3d' }}>🏪</div>
              <div>
                <div style={{ fontWeight: 800, color: '#00361a', fontSize: '0.98rem' }}>Boutique Heistal Adidogomé</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Quartier Adidogomé, Grand Lomé • Retrait express & comptoir de vente directe</div>
              </div>
            </div>

            <div className="store-detail-card">
              <div className="store-icon-cube">🕒</div>
              <div>
                <div style={{ fontWeight: 800, color: '#0b1f3a', fontSize: '0.98rem' }}>Horaires d'Ouverture</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Lundi au Vendredi : <strong>07h30 - 12h30</strong> et <strong>14h30 - 17h30</strong><br />
                  Samedi : <strong>07h30 - 13h30</strong> (service continu)
                </div>
              </div>
            </div>

            <div className="store-detail-card">
              <div className="store-icon-cube">📞</div>
              <div>
                <div style={{ fontWeight: 800, color: '#0b1f3a', fontSize: '0.98rem' }}>Téléphones Directs</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>(+228) 22 26 42 29 • (+228) 22 61 86 80 • (+228) 96 37 38 42</div>
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
                Itinéraire Google Maps 🗺️
              </a>

              <a 
                href="tel:+22822264229"
                className="btn-eye-quick"
                style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                Appeler le magasin 📞
              </a>
            </div>
          </div>

          <div>
            <img 
              src="/heistal_hero_banner.jpg" 
              alt="Magasin Central La Boutique Heistal" 
              style={{ width: '100%', height: '420px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
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
                <span style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛒</span>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span>Livraison frigorifique (Lomé) :</span>
                    <span>{deliveryFee === 0 ? <strong style={{ color: '#16a34a' }}>Gratuite</strong> : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}</span>
                  </div>

                  {cartSubtotal < 25000 && (
                    <div style={{ background: '#f0f9ff', color: '#0284c7', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                      Ajoutez <strong>{(25000 - cartSubtotal).toLocaleString('fr-FR')} FCFA</strong> pour la <strong>livraison offerte</strong> à Lomé !
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 900, color: '#0b1f3a', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                    <span>Total à régler :</span>
                    <span style={{ color: '#0284c7' }}>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  <button 
                    type="button" 
                    className="btn-proceed-checkout"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                  >
                    Valider ma commande ({cartTotal.toLocaleString('fr-FR')} FCFA) →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 10. Checkout Modal */}
      {isCheckoutOpen && (
        <div className="pro-drawer-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div 
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '520px',
              margin: 'auto',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {orderConfirmed ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <span style={{ fontSize: '4rem' }}>🎉</span>
                <h3 style={{ color: '#0b1f3a', fontSize: '1.6rem', margin: '1rem 0 0.5rem', fontWeight: 800 }}>Commande Confirmée !</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Merci <strong>{orderForm.name || "cher client"}</strong> ! Notre équipe logistique La Boutique Heistal prépare vos produits dans notre chambre froide à -18°C.
                  <br />Nous vous joindrons au <strong>{orderForm.phone || "votre numéro"}</strong> avant le départ du livreur vers <strong>{orderForm.quarter}</strong>.
                </p>
                <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 700 }}>
                  🚚 Délai de livraison estimé à Lomé : 45 à 90 minutes
                </div>
                <button 
                  type="button" 
                  className="btn-hero-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOrderConfirmed(false);
                    setIsCheckoutOpen(false);
                  }}
                >
                  Retourner au catalogue
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#0b1f3a', fontSize: '1.4rem', fontWeight: 800 }}>Finaliser ma commande</h3>
                  <button type="button" onClick={() => setIsCheckoutOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    <span>Nombre d'articles :</span>
                    <strong>{totalItemCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: '#0284c7' }}>
                    <span>Total à régler :</span>
                    <span>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0b1f3a', marginBottom: '0.4rem' }}>Nom et Prénom *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: Adjété Wilson"
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0b1f3a', marginBottom: '0.4rem' }}>Numéro de téléphone de contact *</label>
                    <input 
                      type="tel" 
                      required 
                      placeholder="Ex: 90 00 00 00 / 96 00 00 00"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0b1f3a', marginBottom: '0.4rem' }}>Quartier de livraison à Lomé *</label>
                    <select 
                      value={orderForm.quarter}
                      onChange={(e) => setOrderForm({ ...orderForm, quarter: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', outline: 'none', background: 'white' }}
                    >
                      <option value="Tokoin Wuiti (Proximité Magasin)">Tokoin Wuiti (Proximité Magasin)</option>
                      <option value="Tokoin / Doumasséssé / Hôpital">Tokoin / Doumasséssé / Hôpital</option>
                      <option value="Hedzranawoé / Aéroport">Hedzranawoé / Aéroport</option>
                      <option value="Agoè (Nyivé / Assiyéyé / Cacaveli)">Agoè (Nyivé / Assiyéyé / Cacaveli)</option>
                      <option value="Adidogomé / Amadahomé">Adidogomé / Amadahomé</option>
                      <option value="Bè / Akodésséwa / Port">Bè / Akodésséwa / Port</option>
                      <option value="Nyékonakpoè / Kodjoviakopé">Nyékonakpoè / Kodjoviakopé</option>
                      <option value="Centre-ville / Grand Marché">Centre-ville / Grand Marché</option>
                      <option value="Baguida / Avépozo">Baguida / Avépozo</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0b1f3a', marginBottom: '0.4rem' }}>Mode de règlement</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="payment" 
                          checked={orderForm.paymentMethod === 'delivery_cash'}
                          onChange={() => setOrderForm({ ...orderForm, paymentMethod: 'delivery_cash' })}
                        />
                        Espèces à la livraison
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="payment" 
                          checked={orderForm.paymentMethod === 'tmoney'}
                          onChange={() => setOrderForm({ ...orderForm, paymentMethod: 'tmoney' })}
                        />
                        TMoney / Flooz
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-proceed-checkout"
                    style={{ marginTop: '0.75rem', width: '100%', fontSize: '1.05rem' }}
                  >
                    Confirmer ma commande ({cartTotal.toLocaleString('fr-FR')} FCFA)
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* 11. Quick View Modal */}
      {selectedProduct && (
        <div className="pro-drawer-overlay" onClick={() => setSelectedProduct(null)}>
          <div 
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '560px',
              margin: 'auto',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
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
              style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '14px', marginBottom: '1.25rem' }}
            />

            <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              {selectedProduct.desc}
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Conditionnement :</span>
                <strong>{selectedProduct.weight}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Température de conservation :</span>
                <strong>Congélateur à -18°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Disponibilité :</span>
                <strong style={{ color: '#16a34a' }}>{selectedProduct.stock}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 900, color: '#0284c7', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0' }}>
                <span>Prix :</span>
                <span>{selectedProduct.price.toLocaleString('fr-FR')} FCFA /{selectedProduct.unit}</span>
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
                <span className="badge-cold-chain">❄️ -18°C Garanti</span>
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
              <ul className="footer-links-list">
                <li>Boulevard Léopold Sédar Senghor</li>
                <li>CEG Tokoin Wuiti, Lomé</li>
                <li>Tél Fixe : (+228) 22 26 42 29</li>
                <li>Commercial : (+228) 96 37 38 42</li>
                <li>Email : info@heistal.com</li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Services & Engagements</div>
              <ul className="footer-links-list">
                <li><a href="#b2b">Espace Restauration & Hôtellerie</a></li>
                <li><a href="#b2b">Commandes en Gros par Cartons</a></li>
                <li><a href="#catalogue">❄️ Chaîne du Froid -18°C Garantie</a></li>
                <li><a href="#catalogue">⚡ Retrait Express en Magasin</a></li>
                <li><a href="#catalogue">🚚 Livraison Frigorifique Lomé</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>© {new Date().getFullYear()} La Boutique Heistal. Tous droits réservés. Référence du surgelé à Lomé.</div>
            <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8' }}>
              <span>Paiements acceptés : Espèces à la livraison • TMoney • Flooz</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
