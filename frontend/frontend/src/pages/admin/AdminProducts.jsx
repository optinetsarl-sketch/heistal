import React, { useState, useEffect } from 'react';
import './admin.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000/api' : '/api');

export default function AdminProducts() {
  // Onglet actif : 'rayons' (Vue par Rayons & Bacs), 'register' (Formulaire d'enregistrement), 'inventory' (Tableau complet), 'settings' (Gestion Rayons & Catégories)
  const [activeTab, setActiveTab] = useState('rayons');
  
  const [products, setProducts] = useState([]);
  const [rayons, setRayons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres pour l'inventaire
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRayon, setFilterRayon] = useState('Tous');
  const [filterCategory, setFilterCategory] = useState('Tous');
  const [filterStockStatus, setFilterStockStatus] = useState('Tous');

  // Modals
  const [showRayonModal, setShowRayonModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Formulaire d'enregistrement / édition de produit
  const initialProductForm = {
    nom: '',
    reference: '',
    rayon: '',
    category: '',
    emplacement_bac: 'Bac A-01 (Bahut Central)',
    temperature_conservation: '-18°C Surgelé',
    prix_vente: '',
    prix_gros: '',
    cout_achat: '',
    stock_tokoin: 50,
    stock_adidogome: 50,
    unite: 'kg',
    seuil_alerte: 10,
    description: '',
    image: '/heistal_fish.jpg'
  };
  const [productForm, setProductForm] = useState(initialProductForm);

  // Formulaire de création de Rayon
  const initialRayonForm = {
    nom: '',
    code: '',
    temperature: '-18°C Surgelé',
    zone_magasin: 'Zone Centrale - Bacs Bahuts',
    description: ''
  };
  const [rayonForm, setRayonForm] = useState(initialRayonForm);

  // Formulaire de création de Catégorie
  const initialCategoryForm = {
    nom: '',
    slug: '',
    rayon: '',
    description: ''
  };
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Chargement des données depuis l'API Django
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, rayRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/products/`),
        fetch(`${API_BASE}/rayons/`),
        fetch(`${API_BASE}/categories/`)
      ]);

      if (prodRes.ok && rayRes.ok) {
        const prodData = await prodRes.json();
        const rayData = await rayRes.json();
        const catData = catRes.ok ? await catRes.json() : [];
        setProducts(prodData);
        setRayons(rayData);
        setCategories(catData);
      } else {
        throw new Error('API hors ligne');
      }
    } catch (err) {
      console.warn("Utilisation des données locales La Boutique Heistal:", err);
      // Données de secours réalistes pour la boutique
      const fallbackRayons = [
        { id: 1, nom: "Rayon Poissons & Mers", code: "RAY-POISS-01", temperature: "-18°C Surgelé", zone_magasin: "Zone Centrale - Bacs Bahuts A1 à A4", description: "Tilapia entier, Capitaine, Bar, Saumon, Crevettes géantes" },
        { id: 2, nom: "Rayon Volailles & Découpes", code: "RAY-VOL-02", temperature: "-18°C Surgelé", zone_magasin: "Zone Latérale Gauche - Bacs B1 à B4", description: "Poulets entiers, Cuisses gros calibre, Ailerons, Gésiers" },
        { id: 3, nom: "Rayon Viandes Rouges & Bovins", code: "RAY-VIAND-03", temperature: "-18°C Surgelé", zone_magasin: "Zone Fond Magasin - Bacs C1 à C3", description: "Filets de bœuf, Côtes de porc, Mouton découpé" },
        { id: 4, nom: "Rayon Frites, Légumes & Glaces", code: "RAY-LEG-04", temperature: "-18°C Surgelé", zone_magasin: "Zone Entrée - Armoires Vitrées D1 & D2", description: "Frites McCain, Petits pois, Haricots, Bacs de glaces" },
        { id: 5, nom: "Rayon Snacks & Croustillants", code: "RAY-SNA-05", temperature: "-18°C Surgelé", zone_magasin: "Zone Caisse - Bacs E1", description: "Nuggets, Croquettes de poisson, Samosas" }
      ];
      const fallbackCategories = [
        { id: 1, nom: "Poissons & Fruits de mer", slug: "poissons", rayon: 1, rayon_nom: "Rayon Poissons & Mers" },
        { id: 2, nom: "Volailles & Découpes", slug: "volailles", rayon: 2, rayon_nom: "Rayon Volailles & Découpes" },
        { id: 3, nom: "Viandes Rouges & Bovins", slug: "viandes", rayon: 3, rayon_nom: "Rayon Viandes Rouges & Bovins" },
        { id: 4, nom: "Frites & Légumes", slug: "frites-legumes", rayon: 4, rayon_nom: "Rayon Frites, Légumes & Glaces" },
        { id: 5, nom: "Snacks & Panés", slug: "snacks-panes", rayon: 5, rayon_nom: "Rayon Snacks & Croustillants" }
      ];
      const fallbackProducts = [
        { id: 1, nom: "Tilapia Frais Surgelé de Première Qualité", reference: "HST-TIL-001", rayon: 1, rayon_nom: "Rayon Poissons & Mers", category: 1, category_nom: "Poissons & Fruits de mer", emplacement_bac: "Bac A-01", prix_vente: 2800, prix_gros: 26000, cout_achat: 2200, stock_tokoin: 83, stock_adidogome: 60, unite: "kg", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" },
        { id: 2, nom: "Cuisses de Poulet Gros Calibre (Carton 10kg)", reference: "HST-VOL-002", rayon: 2, rayon_nom: "Rayon Volailles & Découpes", category: 2, category_nom: "Volailles & Découpes", emplacement_bac: "Bac B-01", prix_vente: 18500, prix_gros: 17500, cout_achat: 15000, stock_tokoin: 42, stock_adidogome: 35, unite: "carton", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" },
        { id: 3, nom: "Filet de Bœuf Tendre Sans Os", reference: "HST-BOV-003", rayon: 3, rayon_nom: "Rayon Viandes Rouges & Bovins", category: 3, category_nom: "Viandes Rouges & Bovins", emplacement_bac: "Bac C-01", prix_vente: 4500, prix_gros: 42000, cout_achat: 3600, stock_tokoin: 28, stock_adidogome: 20, unite: "kg", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" },
        { id: 4, nom: "Frites Croustillantes McCain Original (Sachet 2.5kg)", reference: "HST-FRI-004", rayon: 4, rayon_nom: "Rayon Frites, Légumes & Glaces", category: 4, category_nom: "Frites & Légumes", emplacement_bac: "Armoire D-01", prix_vente: 3800, prix_gros: 14000, cout_achat: 2900, stock_tokoin: 65, stock_adidogome: 48, unite: "sachet", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" },
        { id: 5, nom: "Nuggets de Poulet Extra Croustillants (1kg)", reference: "HST-SNA-005", rayon: 5, rayon_nom: "Rayon Snacks & Croustillants", category: 5, category_nom: "Snacks & Panés", emplacement_bac: "Bac E-01", prix_vente: 3200, prix_gros: 30000, cout_achat: 2400, stock_tokoin: 54, stock_adidogome: 38, unite: "sachet", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" },
        { id: 6, nom: "Capitaine Frais Entier Écaillé", reference: "HST-CAP-006", rayon: 1, rayon_nom: "Rayon Poissons & Mers", category: 1, category_nom: "Poissons & Fruits de mer", emplacement_bac: "Bac A-03", prix_vente: 3500, prix_gros: 32000, cout_achat: 2800, stock_tokoin: 12, stock_adidogome: 8, unite: "kg", seuil_alerte: 10, temperature_conservation: "-18°C Surgelé" }
      ];
      setRayons(fallbackRayons);
      setCategories(fallbackCategories);
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Catégories filtrées selon le rayon sélectionné dans le formulaire
  const availableCategoriesForSelectedRayon = productForm.rayon
    ? categories.filter(c => !c.rayon || c.rayon.toString() === productForm.rayon.toString())
    : categories;

  // Ouvrir formulaire d'enregistrement de produit vierge
  const handleStartNewProduct = (preselectedRayonId = null) => {
    setEditingProduct(null);
    const chosenRayonId = preselectedRayonId || rayons[0]?.id || '';
    const matchingCats = categories.filter(c => !c.rayon || c.rayon.toString() === chosenRayonId.toString());

    setProductForm({
      ...initialProductForm,
      reference: `HST-${Math.floor(100 + Math.random() * 900)}`,
      rayon: chosenRayonId,
      category: matchingCats[0]?.id || '',
      emplacement_bac: preselectedRayonId ? `Bac R${preselectedRayonId}-01` : 'Bac A-01'
    });
    setActiveTab('register');
  };

  // Éditer un produit existant
  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      nom: prod.nom,
      reference: prod.reference,
      rayon: prod.rayon || '',
      category: prod.category || '',
      emplacement_bac: prod.emplacement_bac || 'Bac A-01',
      temperature_conservation: prod.temperature_conservation || '-18°C Surgelé',
      prix_vente: prod.prix_vente,
      prix_gros: prod.prix_gros || '',
      cout_achat: prod.cout_achat || '',
      stock_tokoin: prod.stock_tokoin,
      stock_adidogome: prod.stock_adidogome,
      unite: prod.unite || 'kg',
      seuil_alerte: prod.seuil_alerte || 10,
      description: prod.description || '',
      image: prod.image || '/heistal_fish.jpg'
    });
    setActiveTab('register');
  };

  // Soumission de l'enregistrement ou modification
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!productForm.nom || !productForm.prix_vente) {
      showToast("Veuillez renseigner le nom et le prix de vente !");
      return;
    }

    const payload = {
      ...productForm,
      prix_vente: parseInt(productForm.prix_vente, 10),
      prix_gros: productForm.prix_gros ? parseInt(productForm.prix_gros, 10) : null,
      cout_achat: productForm.cout_achat ? parseInt(productForm.cout_achat, 10) : null,
      stock_tokoin: parseInt(productForm.stock_tokoin, 10) || 0,
      stock_adidogome: parseInt(productForm.stock_adidogome, 10) || 0,
      seuil_alerte: parseInt(productForm.seuil_alerte, 10) || 10,
      rayon: productForm.rayon ? parseInt(productForm.rayon, 10) : null,
      category: productForm.category ? parseInt(productForm.category, 10) : null
    };

    try {
      if (editingProduct) {
        const res = await fetch(`${API_BASE}/products/${editingProduct.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(`✅ Produit "${payload.nom}" mis à jour avec succès !`);
        } else {
          setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...payload } : p));
          showToast(`✅ Produit "${payload.nom}" mis à jour localement !`);
        }
      } else {
        const res = await fetch(`${API_BASE}/products/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast(`✅ Produit "${payload.nom}" enregistré dans son rayon !`);
        } else {
          const selectedRay = rayons.find(r => r.id === payload.rayon);
          const selectedCat = categories.find(c => c.id === payload.category);
          const newProd = {
            id: Date.now(),
            ...payload,
            rayon_nom: selectedRay ? selectedRay.nom : "Rayon Surgelé",
            category_nom: selectedCat ? selectedCat.nom : "Catégorie"
          };
          setProducts([newProd, ...products]);
          showToast(`✅ Produit "${payload.nom}" enregistré localement !`);
        }
      }
      setEditingProduct(null);
      setProductForm(initialProductForm);
      setActiveTab('rayons');
      fetchData();
    } catch (err) {
      console.error(err);
      setActiveTab('rayons');
      fetchData();
    }
  };

  // Suppression produit
  const handleDeleteProduct = async (id, nom) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer le produit "${nom}" du rayon ?`)) return;

    try {
      await fetch(`${API_BASE}/products/${id}/`, { method: 'DELETE' });
      setProducts(products.filter(p => p.id !== id));
      showToast(`Produit "${nom}" supprimé.`);
    } catch (err) {
      setProducts(products.filter(p => p.id !== id));
      showToast(`Produit "${nom}" retiré.`);
    }
  };

  // Ajustement rapide de stock
  const handleQuickStockAdjust = async (product, delta, magasin) => {
    const isAdidogome = magasin === 'adidogome';
    const currentStock = isAdidogome ? product.stock_adidogome : product.stock_tokoin;
    const newStock = Math.max(0, currentStock + delta);

    try {
      await fetch(`${API_BASE}/products/${product.id}/adjust_stock/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, magasin })
      });
      fetchData();
    } catch (err) {
      setProducts(products.map(p => {
        if (p.id === product.id) {
          return isAdidogome ? { ...p, stock_adidogome: newStock } : { ...p, stock_tokoin: newStock };
        }
        return p;
      }));
    }
    showToast(`Stock ${product.nom} (${isAdidogome ? 'Adidogomé' : 'Tokoin'}) : ${newStock} ${product.unite}`);
  };

  // Création d'un Rayon
  const handleCreateRayon = async (e) => {
    e.preventDefault();
    if (!rayonForm.nom) return;
    const code = rayonForm.code || `RAY-${rayonForm.nom.slice(0, 4).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const payload = { ...rayonForm, code };

    try {
      const res = await fetch(`${API_BASE}/rayons/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`✅ Rayon "${payload.nom}" créé avec succès !`);
      } else {
        setRayons([...rayons, { id: Date.now(), ...payload, produits_count: 0 }]);
        showToast(`✅ Rayon "${payload.nom}" créé localement !`);
      }
    } catch (err) {
      setRayons([...rayons, { id: Date.now(), ...payload, produits_count: 0 }]);
      showToast(`✅ Rayon "${payload.nom}" créé !`);
    }
    setShowRayonModal(false);
    setRayonForm(initialRayonForm);
    fetchData();
  };

  // Création d'une Catégorie
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.nom) return;
    const slug = categoryForm.slug || categoryForm.nom.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const payload = {
      nom: categoryForm.nom,
      slug: slug,
      rayon: categoryForm.rayon ? parseInt(categoryForm.rayon, 10) : null,
      description: categoryForm.description
    };

    try {
      const res = await fetch(`${API_BASE}/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`✅ Catégorie "${payload.nom}" ajoutée !`);
      } else {
        const ray = rayons.find(r => r.id === payload.rayon);
        setCategories([...categories, { id: Date.now(), ...payload, rayon_nom: ray ? ray.nom : '' }]);
        showToast(`✅ Catégorie "${payload.nom}" ajoutée !`);
      }
    } catch (err) {
      const ray = rayons.find(r => r.id === payload.rayon);
      setCategories([...categories, { id: Date.now(), ...payload, rayon_nom: ray ? ray.nom : '' }]);
      showToast(`✅ Catégorie "${payload.nom}" ajoutée !`);
    }
    setShowCategoryModal(false);
    setCategoryForm(initialCategoryForm);
    fetchData();
  };

  // Statistiques globales
  const totalReferences = products.length;
  const stockTokoinTotal = products.reduce((sum, p) => sum + (p.stock_tokoin || 0), 0);
  const stockAdidogomeTotal = products.reduce((sum, p) => sum + (p.stock_adidogome || 0), 0);
  const totalStockValue = products.reduce((sum, p) => {
    const qty = (p.stock_tokoin || 0) + (p.stock_adidogome || 0);
    return sum + (qty * (p.prix_vente || 0));
  }, 0);
  const lowStockAlerts = products.filter(p => {
    const total = (p.stock_tokoin || 0) + (p.stock_adidogome || 0);
    return total <= (p.seuil_alerte || 10);
  }).length;

  // Calcul de marge pour le formulaire en direct
  const currentMargin = (productForm.prix_vente && productForm.cout_achat)
    ? (parseInt(productForm.prix_vente, 10) - parseInt(productForm.cout_achat, 10))
    : null;

  return (
    <div className="admin-products-page">
      {/* Toast Notification */}
      {toastMessage && <div className="pos-toast">{toastMessage}</div>}

      {/* Top Header & Fast Actions */}
      <div className="products-hero-header">
        <div>
          <div className="products-hero-tag">
            <span>❄️</span>
            FROID -18°C GARANTI • LA BOUTIQUE HEISTAL
          </div>
          <h1 className="products-hero-title">Organisation des Rayons, Bacs & Produits</h1>
          <p className="products-hero-sub">
            Gérez l'implantation physique des congélateurs, bacs bahuts et l'enregistrement des articles à <strong>Tokoin Wuiti</strong> et <strong>Adidogomé</strong>.
          </p>
        </div>

        <div className="products-hero-buttons">
          <button
            type="button"
            className={`btn-hero-action primary ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleStartNewProduct()}
          >
            <span>➕</span>
            <span>{editingProduct ? 'Modifier Produit' : 'Enregistrer un Produit'}</span>
          </button>
          <button
            type="button"
            className="btn-hero-action secondary"
            onClick={() => setShowRayonModal(true)}
          >
            <span>❄️</span>
            <span>Nouveau Rayon / Bac</span>
          </button>
          <button
            type="button"
            className="btn-hero-action outline"
            onClick={() => setShowCategoryModal(true)}
          >
            <span>🏷️</span>
            <span>Nouvelle Catégorie</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Clean, Modern, Informative) */}
      <div className="products-kpi-grid">
        <div className="kpi-box">
          <div className="kpi-box-icon kpi-blue">📦</div>
          <div>
            <div className="kpi-box-value">{totalReferences}</div>
            <div className="kpi-box-label">Produits Référencés</div>
          </div>
          <div className="kpi-box-sub">Répartis dans les rayons</div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-icon kpi-cyan">❄️</div>
          <div>
            <div className="kpi-box-value">{rayons.length} Rayons</div>
            <div className="kpi-box-label">Bacs & Bahuts -18°C</div>
          </div>
          <div className="kpi-box-sub">{categories.length} catégories actives</div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-icon kpi-green">🏬</div>
          <div>
            <div className="kpi-box-value">{stockTokoinTotal.toLocaleString('fr-FR')} <span className="kpi-unit">unités</span></div>
            <div className="kpi-box-label">Stock Tokoin Wuiti</div>
          </div>
          <div className="kpi-box-sub">Boutique CEG Tokoin</div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-icon kpi-green">🏪</div>
          <div>
            <div className="kpi-box-value">{stockAdidogomeTotal.toLocaleString('fr-FR')} <span className="kpi-unit">unités</span></div>
            <div className="kpi-box-label">Stock Adidogomé</div>
          </div>
          <div className="kpi-box-sub">Boutique Grand Lomé</div>
        </div>

        <div className="kpi-box highlight">
          <div className="kpi-box-icon kpi-gold">💰</div>
          <div>
            <div className="kpi-box-value">{totalStockValue.toLocaleString('fr-FR')} <span className="kpi-unit">FCFA</span></div>
            <div className="kpi-box-label">Valeur du Stock Total</div>
          </div>
          <div className="kpi-box-sub">{lowStockAlerts > 0 ? `⚠️ ${lowStockAlerts} alertes de stock` : '🟢 Niveaux de stock optimaux'}</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Clean & Organized) */}
      <div className="products-main-tabs">
        <button
          type="button"
          className={`tab-link ${activeTab === 'rayons' ? 'active' : ''}`}
          onClick={() => setActiveTab('rayons')}
        >
          <span className="tab-icon">🧊</span>
          <span>1. Organisation par Rayons & Bacs ({rayons.length})</span>
        </button>

        <button
          type="button"
          className={`tab-link ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => {
            if (!editingProduct) handleStartNewProduct();
            else setActiveTab('register');
          }}
        >
          <span className="tab-icon">✍️</span>
          <span>2. {editingProduct ? 'Modifier le Produit' : 'Formulaire d\'Enregistrement'}</span>
        </button>

        <button
          type="button"
          className={`tab-link ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="tab-icon">📋</span>
          <span>3. Inventaire Global & Table des Stocks ({products.length})</span>
        </button>

        <button
          type="button"
          className={`tab-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          <span>4. Paramétrage Rayons & Catégories</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : ORGANISATION PAR RAYONS & BACS                                */}
      {/* ========================================================================= */}
      {activeTab === 'rayons' && (
        <div className="tab-rayons-section">
          <div className="rayons-section-intro">
            <div>
              <h2 className="section-title">Structure des Rayons Frigorifiques & Bacs Bahuts</h2>
              <p className="section-subtitle">
                Consultez chaque rayon de La Boutique Heistal, ses bacs d'implantation physique et les produits qui y sont rangés.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowRayonModal(true)}
                style={{ fontSize: '0.85rem' }}
              >
                + Ajouter un Rayon
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleStartNewProduct()}
                style={{ background: '#007a3d', borderColor: '#007a3d', fontWeight: 800, fontSize: '0.85rem' }}
              >
                + Enregistrer un Produit
              </button>
            </div>
          </div>

          <div className="rayons-shelf-grid">
            {rayons.map(rayon => {
              const rayProducts = products.filter(p => p.rayon === rayon.id || p.rayon_nom === rayon.nom);
              const rayStockTotal = rayProducts.reduce((sum, p) => sum + (p.stock_tokoin || 0) + (p.stock_adidogome || 0), 0);
              const rayValueTotal = rayProducts.reduce((sum, p) => sum + (((p.stock_tokoin || 0) + (p.stock_adidogome || 0)) * (p.prix_vente || 0)), 0);

              return (
                <div key={rayon.id} className="shelf-zone-card">
                  {/* Rayon Header */}
                  <div className="shelf-zone-header">
                    <div className="shelf-header-left">
                      <div className="shelf-icon-badge">
                        {rayon.nom.includes('Poisson') ? '🐟' :
                         rayon.nom.includes('Volaille') ? '🍗' :
                         rayon.nom.includes('Viande') ? '🥩' :
                         rayon.nom.includes('Frite') ? '🍟' : '❄️'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 className="shelf-title">{rayon.nom}</h3>
                          <span className="shelf-code-tag">{rayon.code}</span>
                        </div>
                        <div className="shelf-location">
                          📍 {rayon.zone_magasin || "Zone Centrale"} • <span style={{ color: '#38bdf8', fontWeight: 700 }}>❄️ {rayon.temperature}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shelf-header-right">
                      <div className="shelf-stat">
                        <span className="shelf-stat-val">{rayProducts.length}</span>
                        <span className="shelf-stat-lbl">Articles</span>
                      </div>
                      <div className="shelf-stat">
                        <span className="shelf-stat-val">{rayStockTotal}</span>
                        <span className="shelf-stat-lbl">Stock total</span>
                      </div>
                      <button
                        type="button"
                        className="btn-add-to-shelf"
                        onClick={() => handleStartNewProduct(rayon.id)}
                        title={`Ajouter un produit dans ${rayon.nom}`}
                      >
                        + Ajouter ici
                      </button>
                    </div>
                  </div>

                  {/* Rayon Description */}
                  {rayon.description && (
                    <div className="shelf-description">
                      ℹ️ {rayon.description}
                    </div>
                  )}

                  {/* Products Table in this Rayon */}
                  <div className="shelf-products-table-wrapper">
                    {rayProducts.length === 0 ? (
                      <div className="shelf-empty">
                        <span>Ce rayon ne contient aucun produit pour l'instant.</span>
                        <button
                          type="button"
                          className="shelf-empty-btn"
                          onClick={() => handleStartNewProduct(rayon.id)}
                        >
                          + Enregistrer le premier article dans ce bac
                        </button>
                      </div>
                    ) : (
                      <table className="shelf-table">
                        <thead>
                          <tr>
                            <th>Emplacement Bac</th>
                            <th>Produit & Réf</th>
                            <th>Catégorie</th>
                            <th>Prix Client</th>
                            <th>Stock Tokoin</th>
                            <th>Stock Adidogomé</th>
                            <th>Statut</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rayProducts.map(prod => {
                            const totalStock = (prod.stock_tokoin || 0) + (prod.stock_adidogome || 0);
                            const isOutOfStock = totalStock <= 0;
                            const isLowStock = totalStock > 0 && totalStock <= (prod.seuil_alerte || 10);

                            return (
                              <tr key={prod.id}>
                                <td>
                                  <div className="bac-tag">
                                    <span style={{ fontSize: '0.85rem' }}>🧊</span>
                                    <span>{prod.emplacement_bac || 'Bac Central'}</span>
                                  </div>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 800, color: '#f8fafc' }}>{prod.nom}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Réf : <span style={{ color: '#cbd5e1' }}>{prod.reference}</span> • {prod.unite}
                                  </div>
                                </td>

                                <td>
                                  <span className="cat-badge">
                                    {prod.category_nom || "Général"}
                                  </span>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 800, color: '#ffd000' }}>
                                    {prod.prix_vente?.toLocaleString('fr-FR')} FCFA
                                  </div>
                                  {prod.prix_gros && (
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                      Gros: {prod.prix_gros.toLocaleString('fr-FR')} F
                                    </div>
                                  )}
                                </td>

                                <td>
                                  <div className="stock-counter-cell">
                                    <span style={{ fontWeight: 700 }}>{prod.stock_tokoin} {prod.unite}</span>
                                    <div className="counter-btns">
                                      <button type="button" onClick={() => handleQuickStockAdjust(prod, -1, 'tokoin')}>-</button>
                                      <button type="button" onClick={() => handleQuickStockAdjust(prod, 1, 'tokoin')}>+</button>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div className="stock-counter-cell">
                                    <span style={{ fontWeight: 700 }}>{prod.stock_adidogome} {prod.unite}</span>
                                    <div className="counter-btns">
                                      <button type="button" onClick={() => handleQuickStockAdjust(prod, -1, 'adidogome')}>-</button>
                                      <button type="button" onClick={() => handleQuickStockAdjust(prod, 1, 'adidogome')}>+</button>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <span className={`status-pill ${isOutOfStock ? 'pill-danger' : isLowStock ? 'pill-warning' : 'pill-success'}`}>
                                    {isOutOfStock ? 'Rupture' : isLowStock ? 'Faible' : 'En stock'}
                                  </span>
                                </td>

                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                                    <button
                                      type="button"
                                      className="btn-action-icon"
                                      onClick={() => handleEditProduct(prod)}
                                      title="Modifier ce produit"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-icon delete"
                                      onClick={() => handleDeleteProduct(prod.id, prod.nom)}
                                      title="Supprimer ce produit"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : FORMULAIRE D'ENREGISTREMENT DE PRODUIT (STRUCTURÉ)             */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="tab-register-section">
          <div className="register-layout-grid">
            
            {/* Formulaire Principal (À Gauche) */}
            <div className="register-form-card">
              <div className="register-form-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="form-header-badge">
                    {editingProduct ? '✏️' : '📦'}
                  </div>
                  <div>
                    <h2 className="form-main-title">
                      {editingProduct ? `Modifier le Produit : ${editingProduct.nom}` : "Enregistrer un Nouveau Produit Surgelé"}
                    </h2>
                    <p className="form-main-subtitle">
                      Renseignez l'identification, le rayon d'implantation, la catégorie et les stocks par boutique.
                    </p>
                  </div>
                </div>

                {editingProduct && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleStartNewProduct()}
                    style={{ fontSize: '0.8rem' }}
                  >
                    + Passer à un nouvel enregistrement
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitProduct} className="structured-product-form">
                
                {/* BLOC 1 : IDENTIFICATION PRODUIT */}
                <div className="form-section-block">
                  <div className="section-block-title">
                    <span className="step-number">1</span>
                    <span>Identification & Désignation Commerciale</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Nom Officiel du Produit *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tilapia Frais Entier Surgelé, Cuisses de Poulet Gros Calibre..."
                        value={productForm.nom}
                        onChange={(e) => setProductForm({ ...productForm, nom: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Nom complet qui apparaîtra sur le ticket de caisse et en vitrine.</span>
                    </div>

                    <div className="form-group">
                      <label>Référence SKU / Code-barres *</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          required
                          placeholder="Ex: HST-TIL-001"
                          value={productForm.reference}
                          onChange={(e) => setProductForm({ ...productForm, reference: e.target.value })}
                          className="form-input"
                        />
                        <button
                          type="button"
                          className="btn-gen-ref"
                          onClick={() => setProductForm({ ...productForm, reference: `HST-${Math.floor(100 + Math.random() * 900)}` })}
                          title="Générer automatiquement une référence"
                        >
                          Auto 🎲
                        </button>
                      </div>
                      <span className="field-hint">Identifiant unique utilisé pour le scan et l'inventaire.</span>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Unité de Vente</label>
                      <select
                        value={productForm.unite}
                        onChange={(e) => setProductForm({ ...productForm, unite: e.target.value })}
                        className="form-input"
                      >
                        <option value="kg">Kilogramme (kg) - Pesée au kilo</option>
                        <option value="carton">Carton - Conditionnement gros</option>
                        <option value="sachet">Sachet individuel scellé</option>
                        <option value="piece">Pièce unitaire</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Seuil d'Alerte Stock Minimum</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.seuil_alerte}
                        onChange={(e) => setProductForm({ ...productForm, seuil_alerte: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Alerte déclenchée en dessous de cette quantité restante.</span>
                    </div>
                  </div>
                </div>

                {/* BLOC 2 : IMPLANTATION EN RAYON, BAC & CATÉGORIE */}
                <div className="form-section-block">
                  <div className="section-block-title">
                    <span className="step-number">2</span>
                    <span>Implantation dans les Rayons & Bacs Frigorifiques</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Rayon d'Implantation *</label>
                        <button
                          type="button"
                          onClick={() => setShowRayonModal(true)}
                          className="btn-inline-add"
                        >
                          + Créer Rayon
                        </button>
                      </div>
                      <select
                        required
                        value={productForm.rayon}
                        onChange={(e) => {
                          const newRayonId = e.target.value;
                          const matchingCats = categories.filter(c => !c.rayon || c.rayon.toString() === newRayonId.toString());
                          setProductForm({
                            ...productForm,
                            rayon: newRayonId,
                            category: matchingCats[0]?.id || ''
                          });
                        }}
                        className="form-input"
                      >
                        <option value="">Sélectionner un Rayon Surgelé...</option>
                        {rayons.map(r => (
                          <option key={r.id} value={r.id}>
                            ❄️ {r.nom} ({r.temperature})
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">Zone frigorifique générale où le produit est stocké.</span>
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Catégorie du Produit *</label>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="btn-inline-add"
                        >
                          + Créer Catégorie
                        </button>
                      </div>
                      <select
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="form-input"
                      >
                        <option value="">Sélectionner une Catégorie...</option>
                        {availableCategoriesForSelectedRayon.map(c => (
                          <option key={c.id} value={c.id}>
                            🏷️ {c.nom}
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">Famille de produit pour le classement client.</span>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Emplacement Précis du Bac / Bahut</label>
                      <input
                        type="text"
                        placeholder="Ex: Bac Bahut A-01, Bac B-02, Armoire Vitrée D-01"
                        value={productForm.emplacement_bac}
                        onChange={(e) => setProductForm({ ...productForm, emplacement_bac: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Numéro exact du bac pour aider les préparateurs de commande et caissiers.</span>
                    </div>

                    <div className="form-group">
                      <label>Température de Conservation Requise</label>
                      <select
                        value={productForm.temperature_conservation}
                        onChange={(e) => setProductForm({ ...productForm, temperature_conservation: e.target.value })}
                        className="form-input"
                      >
                        <option value="-18°C Surgelé">❄️ -18°C Surgelé Garanti (Poissons, Viandes, Poulets)</option>
                        <option value="-22°C Grand Froid">🧊 -22°C Grand Froid (Glaces, Crèmes glacées)</option>
                        <option value="0°C / +4°C Frais Réfrigéré">🥬 0°C / +4°C Frais Réfrigéré</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* BLOC 3 : TARIFICATION & MARGE */}
                <div className="form-section-block">
                  <div className="section-block-title">
                    <span className="step-number">3</span>
                    <span>Tarification & Rentabilité Commerciale</span>
                  </div>

                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Prix de Vente Client (FCFA) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ex: 2800"
                        value={productForm.prix_vente}
                        onChange={(e) => setProductForm({ ...productForm, prix_vente: e.target.value })}
                        className="form-input highlight-price"
                      />
                      <span className="field-hint">Prix affiché au détail en magasin.</span>
                    </div>

                    <div className="form-group">
                      <label>Prix de Gros / Carton (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 26000"
                        value={productForm.prix_gros}
                        onChange={(e) => setProductForm({ ...productForm, prix_gros: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Tarif spécial pour restaurants et hôtels B2B.</span>
                    </div>

                    <div className="form-group">
                      <label>Coût Fournisseur / Achat (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 2200"
                        value={productForm.cout_achat}
                        onChange={(e) => setProductForm({ ...productForm, cout_achat: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Prix d'achat pour calcul de la rentabilité.</span>
                    </div>
                  </div>

                  {currentMargin !== null && (
                    <div className="margin-indicator-box">
                      <span>Marge commerciale unitaire estimée :</span>
                      <strong style={{ color: currentMargin >= 0 ? '#10b981' : '#ef4444', fontSize: '1.05rem' }}>
                        {currentMargin.toLocaleString('fr-FR')} FCFA / {productForm.unite}
                        {productForm.prix_vente > 0 && ` (${Math.round((currentMargin / parseInt(productForm.prix_vente, 10)) * 100)}%)`}
                      </strong>
                    </div>
                  )}
                </div>

                {/* BLOC 4 : STOCKS PAR BOUTIQUE */}
                <div className="form-section-block">
                  <div className="section-block-title">
                    <span className="step-number">4</span>
                    <span>Stocks Initiaux par Boutique Physique</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Stock Boutique Tokoin Wuiti</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.stock_tokoin}
                        onChange={(e) => setProductForm({ ...productForm, stock_tokoin: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Quantité disponible au CEG Tokoin Wuiti.</span>
                    </div>

                    <div className="form-group">
                      <label>Stock Boutique Adidogomé</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.stock_adidogome}
                        onChange={(e) => setProductForm({ ...productForm, stock_adidogome: e.target.value })}
                        className="form-input"
                      />
                      <span className="field-hint">Quantité disponible à Adidogomé.</span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="form-submit-row">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm(initialProductForm);
                      setActiveTab('rayons');
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="btn-submit-product"
                  >
                    <span>💾</span>
                    <span>{editingProduct ? 'Mettre à jour le Produit' : 'Valider & Enregistrer dans le Rayon'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Volet Latéral : Aperçu en Direct de l'Étiquette Produit */}
            <div className="register-preview-sidebar">
              <div className="preview-card-sticky">
                <div className="preview-card-header">
                  <span>Aperçu de l'Étiquette Rayon</span>
                  <span className="live-dot"></span>
                </div>

                <div className="store-tag-preview">
                  <div className="preview-brand">LA BOUTIQUE HEISTAL</div>
                  <div className="preview-category">
                    {categories.find(c => c.id.toString() === productForm.category?.toString())?.nom || "Catégorie Surgelé"}
                  </div>
                  
                  <div className="preview-product-name">
                    {productForm.nom || "Nom du Produit Surgelé"}
                  </div>

                  <div className="preview-bac-tag">
                    📍 {productForm.emplacement_bac || "Bac A-01"} • {productForm.temperature_conservation}
                  </div>

                  <div className="preview-price-box">
                    <div className="preview-price">
                      {productForm.prix_vente ? parseInt(productForm.prix_vente, 10).toLocaleString('fr-FR') : "0"}{' '}
                      <span style={{ fontSize: '1rem', color: '#007a3d' }}>FCFA</span>
                    </div>
                    <div className="preview-unit">le {productForm.unite}</div>
                  </div>

                  {productForm.prix_gros && (
                    <div className="preview-gros-box">
                      Prix Gros B2B : <strong>{parseInt(productForm.prix_gros, 10).toLocaleString('fr-FR')} FCFA</strong> / carton
                    </div>
                  )}

                  <div className="preview-barcode-mock">
                    <div className="barcode-lines">||| | |||| | ||| || |||| | ||</div>
                    <div className="barcode-text">{productForm.reference || "HST-REF-000"}</div>
                  </div>

                  <div className="preview-stock-status">
                    <div>
                      <span>Stock Tokoin :</span>{' '}
                      <strong>{productForm.stock_tokoin} {productForm.unite}</strong>
                    </div>
                    <div>
                      <span>Stock Adidogomé :</span>{' '}
                      <strong>{productForm.stock_adidogome} {productForm.unite}</strong>
                    </div>
                  </div>
                </div>

                <div className="preview-instructions">
                  💡 <strong>Astuce Organisation :</strong> Affecter chaque produit à un bac précis (ex: <em>Bac A-01</em>) permet aux vendeurs et caissiers de retrouver instantanément l'article dans les congélateurs bahuts.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : INVENTAIRE GLOBAL & TABLE DES STOCKS                           */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="tab-inventory-section">
          {/* Filters Bar */}
          <div className="inventory-filters-card">
            <div className="inventory-search-wrap">
              <span className="search-ico">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un produit, référence SKU, code-barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="inventory-search-input"
              />
            </div>

            <div className="inventory-selects">
              <select
                value={filterRayon}
                onChange={(e) => setFilterRayon(e.target.value)}
                className="inv-select"
              >
                <option value="Tous">Tous les Rayons ({rayons.length})</option>
                {rayons.map(r => (
                  <option key={r.id} value={r.nom}>{r.nom}</option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="inv-select"
              >
                <option value="Tous">Toutes les Catégories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.nom}>{c.nom}</option>
                ))}
              </select>

              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value)}
                className="inv-select"
              >
                <option value="Tous">Tous les Statuts</option>
                <option value="Normal">🟢 En Stock Normal</option>
                <option value="Faible">🟡 Stock Faible (≤10)</option>
                <option value="Rupture">🔴 En Rupture (0)</option>
              </select>
            </div>
          </div>

          {/* Full Inventory Table */}
          <div className="inventory-table-card">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Article / Référence</th>
                    <th>Rayon & Bac d'Implantation</th>
                    <th>Catégorie</th>
                    <th>Prix Client (FCFA)</th>
                    <th>Stock Tokoin</th>
                    <th>Stock Adidogomé</th>
                    <th>Total Cumulé</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter(p => {
                      const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesRayon = filterRayon === 'Tous' || p.rayon_nom === filterRayon || p.rayon?.toString() === filterRayon;
                      const matchesCat = filterCategory === 'Tous' || p.category_nom === filterCategory || p.category?.toString() === filterCategory;
                      const total = (p.stock_tokoin || 0) + (p.stock_adidogome || 0);
                      let matchesStatus = true;
                      if (filterStockStatus === 'Normal') matchesStatus = total > (p.seuil_alerte || 10);
                      if (filterStockStatus === 'Faible') matchesStatus = total > 0 && total <= (p.seuil_alerte || 10);
                      if (filterStockStatus === 'Rupture') matchesStatus = total <= 0;
                      return matchesSearch && matchesRayon && matchesCat && matchesStatus;
                    })
                    .map(prod => {
                      const totalStock = (prod.stock_tokoin || 0) + (prod.stock_adidogome || 0);
                      const isOutOfStock = totalStock <= 0;
                      const isLowStock = totalStock > 0 && totalStock <= (prod.seuil_alerte || 10);

                      return (
                        <tr key={prod.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="product-table-thumb">
                                {prod.nom.includes('Poisson') || prod.nom.includes('Tilapia') ? '🐟' :
                                 prod.nom.includes('Poulet') || prod.nom.includes('Cuisse') ? '🍗' :
                                 prod.nom.includes('Bœuf') || prod.nom.includes('Viande') ? '🥩' :
                                 prod.nom.includes('Frite') ? '🍟' : '❄️'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#f8fafc' }}>{prod.nom}</div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  Réf : <strong style={{ color: '#cbd5e1' }}>{prod.reference}</strong>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="rayon-table-badge">
                              <span style={{ fontSize: '0.9rem' }}>❄️</span>
                              <div>
                                <div style={{ fontWeight: 700 }}>{prod.rayon_nom || "Rayon"}</div>
                                <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{prod.emplacement_bac || 'Bac Central'}</div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="category-pill-badge">
                              {prod.category_nom || "Général"}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontWeight: 800, color: '#ffd000' }}>
                              {prod.prix_vente?.toLocaleString('fr-FR')} FCFA
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>/{prod.unite}</span>
                            </div>
                          </td>

                          <td>
                            <div className="stock-counter-cell">
                              <span style={{ fontWeight: 700 }}>{prod.stock_tokoin} {prod.unite}</span>
                              <div className="counter-btns">
                                <button type="button" onClick={() => handleQuickStockAdjust(prod, -1, 'tokoin')}>-</button>
                                <button type="button" onClick={() => handleQuickStockAdjust(prod, 1, 'tokoin')}>+</button>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="stock-counter-cell">
                              <span style={{ fontWeight: 700 }}>{prod.stock_adidogome} {prod.unite}</span>
                              <div className="counter-btns">
                                <button type="button" onClick={() => handleQuickStockAdjust(prod, -1, 'adidogome')}>-</button>
                                <button type="button" onClick={() => handleQuickStockAdjust(prod, 1, 'adidogome')}>+</button>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong style={{ color: '#ffffff' }}>{totalStock} {prod.unite}</strong>
                          </td>

                          <td>
                            <span className={`status-pill ${isOutOfStock ? 'pill-danger' : isLowStock ? 'pill-warning' : 'pill-success'}`}>
                              {isOutOfStock ? 'Rupture' : isLowStock ? 'Faible' : 'En stock'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={() => handleEditProduct(prod)}
                                title="Modifier ce produit"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn-action-icon delete"
                                onClick={() => handleDeleteProduct(prod.id, prod.nom)}
                                title="Supprimer ce produit"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 4 : GESTION DES RAYONS & CATÉGORIES                                */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="tab-settings-section">
          <div className="settings-split-grid">
            
            {/* Colonne Gauche : Rayons Frigorifiques */}
            <div className="settings-col-card">
              <div className="settings-col-header">
                <div>
                  <h3 className="settings-col-title">Rayons & Bacs Frigorifiques</h3>
                  <p className="settings-col-sub">Zones de froid négatif (-18°C) configurées en magasin.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowRayonModal(true)}
                  style={{ background: '#007a3d', borderColor: '#007a3d', fontWeight: 800, fontSize: '0.8rem' }}
                >
                  + Nouveau Rayon
                </button>
              </div>

              <div className="settings-items-list">
                {rayons.map(rayon => (
                  <div key={rayon.id} className="settings-item-row">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{rayon.nom}</strong>
                        <span className="shelf-code-tag">{rayon.code}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        📍 {rayon.zone_magasin || "Zone centrale"} • <span style={{ color: '#38bdf8' }}>{rayon.temperature}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="settings-count-chip">
                        {products.filter(p => p.rayon === rayon.id || p.rayon_nom === rayon.nom).length} produits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne Droite : Catégories Associées */}
            <div className="settings-col-card">
              <div className="settings-col-header">
                <div>
                  <h3 className="settings-col-title">Catégories Commerciales</h3>
                  <p className="settings-col-sub">Familles de produits rattachées aux rayons.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCategoryModal(true)}
                  style={{ borderColor: '#ffd000', color: '#ffd000', fontWeight: 800, fontSize: '0.8rem' }}
                >
                  + Nouvelle Catégorie
                </button>
              </div>

              <div className="settings-items-list">
                {categories.map(cat => (
                  <div key={cat.id} className="settings-item-row">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{cat.nom}</strong>
                        <span className="cat-slug-tag">#{cat.slug}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Rayon rattaché : <span style={{ color: '#cbd5e1' }}>{cat.rayon_nom || "Général"}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="settings-count-chip">
                        {products.filter(p => p.category === cat.id || p.category_nom === cat.nom).length} produits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CRÉER UN RAYON                                                    */}
      {/* ========================================================================= */}
      {showRayonModal && (
        <div className="pos-modal-backdrop" onClick={() => setShowRayonModal(false)}>
          <div className="rayon-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>❄️</span>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Créer un Nouveau Rayon / Bac Frigorifique</h3>
              </div>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => setShowRayonModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRayon} className="product-form-body">
              <div className="form-field">
                <label>Nom du Rayon *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rayon Glaces & Desserts Givrés, Rayon Gibiers..."
                  value={rayonForm.nom}
                  onChange={(e) => setRayonForm({ ...rayonForm, nom: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Code Rayon</label>
                  <input
                    type="text"
                    placeholder="Ex: RAY-GLACE-06 (Auto si vide)"
                    value={rayonForm.code}
                    onChange={(e) => setRayonForm({ ...rayonForm, code: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Température de maintien</label>
                  <select
                    value={rayonForm.temperature}
                    onChange={(e) => setRayonForm({ ...rayonForm, temperature: e.target.value })}
                  >
                    <option value="-18°C Surgelé">❄️ -18°C Surgelé Standard</option>
                    <option value="-22°C Grand Froid">🧊 -22°C Grand Froid (Glaces)</option>
                    <option value="0°C / +4°C Frais">🥬 0°C / +4°C Frais Réfrigéré</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label>Emplacement physique dans le magasin</label>
                <input
                  type="text"
                  placeholder="Ex: Allée Droite - Bacs Bahuts F1 à F3"
                  value={rayonForm.zone_magasin}
                  onChange={(e) => setRayonForm({ ...rayonForm, zone_magasin: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Description & Articles accueillis</label>
                <textarea
                  rows="2"
                  placeholder="Description des articles accueillis dans ce rayon..."
                  value={rayonForm.description}
                  onChange={(e) => setRayonForm({ ...rayonForm, description: e.target.value })}
                />
              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRayonModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#007a3d', borderColor: '#007a3d', fontWeight: 800 }}
                >
                  ❄️ Valider la Création du Rayon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CRÉER UNE CATÉGORIE                                              */}
      {/* ========================================================================= */}
      {showCategoryModal && (
        <div className="pos-modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="rayon-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏷️</span>
                <h3 style={{ margin: 0, fontWeight: 800 }}>Créer une Nouvelle Catégorie de Produit</h3>
              </div>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => setShowCategoryModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="product-form-body">
              <div className="form-field">
                <label>Nom de la Catégorie *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Crevettes & Gambas, Ailerons de Poulet, Découpes..."
                  value={categoryForm.nom}
                  onChange={(e) => setCategoryForm({ ...categoryForm, nom: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Rayon d'Attachement (Optionnel)</label>
                <select
                  value={categoryForm.rayon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, rayon: e.target.value })}
                >
                  <option value="">Tous les Rayons (Général)</option>
                  {rayons.map(r => (
                    <option key={r.id} value={r.id}>❄️ {r.nom}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Description & Spécificités</label>
                <textarea
                  rows="2"
                  placeholder="Description de la catégorie..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#007a3d', borderColor: '#007a3d', fontWeight: 800 }}
                >
                  🏷️ Valider la Catégorie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
