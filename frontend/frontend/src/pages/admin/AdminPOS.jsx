import React, { useState, useEffect } from 'react';
import { apiErrorMessage, apiFetch, getUser } from '../../api';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formaterPrix, nomBoutique } from './catalogue';
import { Fenetre } from './CatalogueUi';
import RetraitCommande from './RetraitCommande';
import { CAISSIERE, CONTROLEUR } from './roles';
import './admin.css';
import './productForm.css';
import './products.css';
import './salesSpaces.css';
import './orders.css';

const estAujourdhui = (date) => new Date(date).toDateString() === new Date().toDateString();

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000/api' : '/api');

// La clé repart d'un ticket vide à chaque boutique : un panier ne passe jamais d'un stock à l'autre.
export default function AdminPOS() {
  const { boutiqueId } = useParams();
  return <CaisseBoutique key={boutiqueId} boutiqueId={boutiqueId} />;
}

function CaisseBoutique({ boutiqueId }) {
  const navigate = useNavigate();
  const employe = getUser();

  const [products, setProducts] = useState([]);
  const [rayons, setRayons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [espaces, setEspaces] = useState([]);
  const [panne, setPanne] = useState(false);
  const [selectedRayon, setSelectedRayon] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockOnlyFilter, setStockOnlyFilter] = useState(false);

  // Panier de vente en cours
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [clientType, setClientType] = useState('Passager');
  const [clientName, setClientName] = useState('Client Comptoir');
  const [clientTel, setClientTel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [amountReceived, setAmountReceived] = useState('');
  const [transactionNote, setTransactionNote] = useState('');

  // Modals & Toasts
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [retraitOuvert, setRetraitOuvert] = useState(false);
  const [recentSales, setRecentSales] = useState([]);

  // Horloge en direct
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-TG'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-TG'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Chargement de cet espace de vente. En cas de panne, un message : jamais de produits inventés.
  const fetchData = async () => {
    try {
      setLoading(true);
      setPanne(false);
      const reponses = await Promise.all([
        apiFetch(`${API_BASE}/products/`),
        apiFetch(`${API_BASE}/rayons/`),
        apiFetch(`${API_BASE}/sales/?boutique=${boutiqueId}`),
        apiFetch(`${API_BASE}/boutiques/espaces-de-vente/`)
      ]);
      if (reponses.some((reponse) => !reponse.ok)) throw new Error('Réponse refusée par le serveur');
      const [prodData, rayData, salesData, espacesData] = await Promise.all(reponses.map((reponse) => reponse.json()));
      setProducts(prodData);
      setRayons(rayData);
      setRecentSales(salesData);
      setEspaces(espacesData);
    } catch (err) {
      console.warn('Chargement de la caisse impossible :', err);
      setPanne(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [boutiqueId]);

  const boutiqueVente = espaces.find((espace) => String(espace.id) === boutiqueId);
  const nomVente = nomBoutique(boutiqueVente?.nom);

  // Stock dans la boutique sélectionnée
  const getProductStock = (product) => {
    return product.stocks?.find((stock) => stock.boutique === boutiqueVente?.id)?.quantite ?? 0;
  };

  // Ajout au panier de vente
  const addToCart = (product) => {
    const currentStock = getProductStock(product);
    if (currentStock <= 0) {
      showToast(`⚠️ Rupture de stock pour "${product.nom}" à la boutique ${nomVente}`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.qty + 1 > currentStock) {
        showToast(`Stock maximal atteint (${currentStock} ${product.unite})`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: product.id,
        nom: product.nom,
        reference: product.reference,
        prix: product.prix_vente,
        unite: product.unite,
        qty: 1,
        maxStock: currentStock,
        rayon: product.rayon_nom || "Rayon Surgelé",
        emplacement_bac: product.emplacement_bac || "Bac A-01"
      }]);
    }
  };

  // Ajuster quantité
  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const nextQty = item.qty + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.maxStock) {
          showToast(`Stock disponible limité à ${item.maxStock} ${item.unite}`);
          return item;
        }
        return { ...item, qty: nextQty };
      }
      return item;
    }).filter(Boolean));
  };

  // Retirer article
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculs financiers
  const subTotal = cart.reduce((sum, item) => sum + (item.prix * item.qty), 0);
  const discountAmount = Math.round(subTotal * (discountPercent / 100));
  const finalTotal = Math.max(0, subTotal - discountAmount);

  const numericReceived = parseFloat(amountReceived) || 0;
  const changeToReturn = Math.max(0, numericReceived - finalTotal);

  // Validation de l'encaissement
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("Le ticket de vente est vide !");
      return;
    }

    if (paymentMethod === 'Espèces' && numericReceived > 0 && numericReceived < finalTotal) {
      showToast("Le montant reçu est insuffisant pour régler le total !");
      return;
    }

    const saleRef = `HST-${Date.now().toString().slice(-6)}`;
    const salePayload = {
      reference: saleRef,
      boutique: boutiqueVente.id,
      client_nom: clientName || "Client Comptoir",
      client_tel: clientTel || "",
      mode_paiement: paymentMethod,
      sous_total: subTotal,
      remise: discountAmount,
      total_ttc: finalTotal,
      montant_recu: paymentMethod === 'Espèces' ? (numericReceived || finalTotal) : finalTotal,
      monnaie_rendue: paymentMethod === 'Espèces' ? changeToReturn : 0,
      items: cart.map(item => ({
        produit: item.id,
        nom_produit: item.nom,
        reference_produit: item.reference,
        prix_unitaire: item.prix,
        quantite: item.qty,
        total_ligne: item.prix * item.qty
      }))
    };

    try {
      const response = await apiFetch(`${API_BASE}/sales/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (!response.ok) {
        showToast(`⚠️ ${await apiErrorMessage(response, "La vente n'a pas été enregistrée.")}`);
        return;
      }

      const createdSale = await response.json();
      setLastSaleReceipt({
        ...createdSale,
        items: cart,
        date: new Date().toLocaleString('fr-TG')
      });
      showToast("✅ Encaissement validé avec succès !");
    } catch (err) {
      console.warn('Encaissement impossible :', err);
      showToast("⚠️ Serveur injoignable : la vente n'a pas été enregistrée.");
      return;
    }

    // Décrémenter les stocks
    setProducts(products.map(prod => {
      const inCart = cart.find(c => c.id === prod.id);
      if (!inCart) return prod;
      const stocks = (prod.stocks ?? []).map((stock) => (
        stock.boutique === boutiqueVente?.id ? { ...stock, quantite: Math.max(0, stock.quantite - inCart.qty) } : stock
      ));
      return { ...prod, stocks };
    }));

    // Réinitialisation du ticket
    setCart([]);
    setAmountReceived('');
    setDiscountPercent(0);
    setShowReceiptModal(true);
    fetchData();
  };

  // Les ventes du jour de cette boutique
  const ventesDuJour = recentSales.filter((vente) => estAujourdhui(vente.date_vente));
  const todayTurnover = ventesDuJour.reduce((sum, s) => sum + (s.total_ttc || 0), 0);

  // Chaque boutique ne montre que les produits qu'elle a en stock, même épuisés.
  const produitsBoutique = products.filter((produit) => produit.stocks?.some((stock) => stock.boutique === boutiqueVente?.id));

  // Filtrage des produits pour la grille
  const filteredProducts = produitsBoutique.filter(p => {
    const matchesRayon = selectedRayon === 'all' || p.rayon?.toString() === selectedRayon || p.rayon_nom === selectedRayon;
    const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const stock = getProductStock(p);
    const matchesStock = !stockOnlyFilter || stock > 0;
    return matchesRayon && matchesSearch && matchesStock;
  });

  // Une panne après une vente ne ferme pas la caisse : le reçu reste à l'écran.
  if (panne && espaces.length === 0) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Impossible d'ouvrir la caisse</p>
        <p>Vérifiez votre connexion, puis réessayez. Aucune vente ne peut être enregistrée sans le serveur.</p>
        <button type="button" className="btn btn-primary" onClick={fetchData}>Réessayer</button>
      </div>
    );
  }

  if (!loading && !boutiqueVente) {
    return (
      <div className="ev-message" role="alert">
        <p className="ev-message-titre">Espace de vente indisponible</p>
        <p>Cette boutique est fermée, ou vous n'y êtes pas affecté.</p>
        <Link to="/admin/pos" className="btn btn-primary">Retour aux boutiques</Link>
      </div>
    );
  }

  return (
    <div className="pos-workspace-container">
      {/* Toast Alert */}
      {toastMessage && <div className="pos-toast">{toastMessage}</div>}

      {/* POS Top Command Bar */}
      <div className="pos-command-bar">
        {/* Left: Active Store Selector */}
        <div className="pos-store-selector-group">
          <div className="store-pin-icon">🏬</div>
          <div>
            <div className="store-pin-label">Espace de vente</div>
            <div className="store-pin-nom">{nomVente}</div>
            {espaces.length > 1 && <Link to="/admin/pos" className="store-pin-lien">← Changer de boutique</Link>}
          </div>
        </div>

        {/* Center: Live Session Indicators */}
        <div className="pos-session-indicators">
          <div className="session-badge">
            <span className="session-lbl">Caissier :</span>
            <strong style={{ color: '#ffffff' }}>{employe?.nom_complet}</strong>
          </div>

          <div className="session-badge highlight">
            <span className="session-lbl">Ventes du jour :</span>
            <strong style={{ color: '#34d399' }}>{formaterPrix(todayTurnover)}</strong>
          </div>

          <div className="session-badge clock">
            <span>🕒 {currentTime}</span>
          </div>
        </div>

        {/* Right: Quick POS Tools */}
        <div className="pos-command-tools">
          <button
            type="button"
            className="btn-pos-tool co-outil-retrait"
            onClick={() => setRetraitOuvert(true)}
            title="Le client donne le code de sa commande passée sur le site"
          >
            <span aria-hidden="true">📦</span>
            <span>Retrait commande</span>
          </button>

          <button
            type="button"
            className="btn-pos-tool"
            onClick={() => setShowHistory(true)}
            title="Consulter le journal des ventes du jour"
          >
            <span>📋</span>
            <span>Journal ({ventesDuJour.length})</span>
          </button>

          {employe?.role !== CAISSIERE && (
          <button
            type="button"
            className="btn-pos-tool outline"
            onClick={() => navigate('/admin/products')}
            title="Aller sur la gestion des stocks et rayons"
          >
            <span>📦</span>
            <span>Rayons & Bacs</span>
          </button>
          )}
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="pos-two-col-layout">
        
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : SÉLECTION RAPIDE DES PRODUITS & RAYONS                  */}
        {/* ========================================================================= */}
        <div className="pos-catalog-column">
          
          {/* Search Bar & Fast Filters */}
          <div className="pos-search-filter-card">
            <div className="pos-search-inner-wrap">
              <span className="pos-search-ico">🔍</span>
              <input
                type="text"
                placeholder="Scanner le code-barres ou saisir le nom du produit (poisson, poulet, frites...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pos-search-input-field"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick stock toggle */}
            <div className="pos-quick-toggles">
              <button
                type="button"
                className={`btn-stock-toggle ${stockOnlyFilter ? 'active' : ''}`}
                onClick={() => setStockOnlyFilter(!stockOnlyFilter)}
              >
                {stockOnlyFilter ? '🟢 Produits en Stock Uniquement' : '📦 Tous les Articles'}
              </button>
            </div>
          </div>

          {/* Rayons Bar (Touch-Friendly Chips) */}
          <div className="pos-rayons-shelf-bar">
            <button
              type="button"
              className={`pos-shelf-tab ${selectedRayon === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedRayon('all')}
            >
              <span>❄️ Tous les Rayons</span>
              <span className="tab-badge">{produitsBoutique.length}</span>
            </button>

            {rayons.map(rayon => {
              const rayCount = produitsBoutique.filter(p => p.rayon === rayon.id || p.rayon_nom === rayon.nom).length;
              const icon = rayon.nom.includes('Poisson') ? '🐟' :
                           rayon.nom.includes('Volaille') ? '🍗' :
                           rayon.nom.includes('Viande') ? '🥩' :
                           rayon.nom.includes('Frite') ? '🍟' : '🥟';

              return (
                <button
                  key={rayon.id}
                  type="button"
                  className={`pos-shelf-tab ${selectedRayon === rayon.id.toString() || selectedRayon === rayon.nom ? 'active' : ''}`}
                  onClick={() => setSelectedRayon(rayon.id.toString())}
                >
                  <span>{icon} {rayon.nom}</span>
                  <span className="tab-badge">{rayCount}</span>
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="pos-products-shelf-grid">
            {loading ? (
              <div className="pos-grid-loading">
                Chargement des rayons frigorifiques...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-grid-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
                  {produitsBoutique.length === 0 ? `Aucun produit à ${nomVente}` : 'Aucun produit trouvé'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {produitsBoutique.length === 0
                    ? 'Ajoutez du stock à cette boutique depuis la page Produits.'
                    : 'Modifiez votre recherche ou sélectionnez un autre rayon.'}
                </div>
              </div>
            ) : (
              filteredProducts.map(product => {
                const stock = getProductStock(product);
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= (product.seuil_alerte || 10);
                const inCart = cart.find(c => c.id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`pos-shelf-card ${isOutOfStock ? 'is-out' : ''} ${inCart ? 'is-in-cart' : ''}`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                  >
                    {/* Card Top: Bac Location & Stock Badge */}
                    <div className="shelf-card-top">
                      <span className="shelf-card-bac">
                        🧊 {product.emplacement_bac || 'Bac Central'}
                      </span>

                      <span className={`shelf-card-stock ${isOutOfStock ? 'badge-out' : isLowStock ? 'badge-low' : 'badge-ok'}`}>
                        {isOutOfStock ? 'Rupture' : `${stock} ${product.unite}`}
                      </span>
                    </div>

                    {/* Card Body: Product Info */}
                    <div className="shelf-card-body">
                      <div className="shelf-card-name">{product.nom}</div>
                      <div className="shelf-card-ref">
                        Réf : {product.reference} • <span style={{ color: '#38bdf8' }}>{product.rayon_nom || "Surgelé"}</span>
                      </div>
                    </div>

                    {/* Card Footer: Price & Add Button */}
                    <div className="shelf-card-footer">
                      <div>
                        <div className="shelf-card-price">
                          {product.prix_vente?.toLocaleString('fr-FR')} <span className="price-cfa">FCFA</span>
                        </div>
                        <div className="shelf-card-unit">le {product.unite}</div>
                      </div>

                      <button
                        type="button"
                        className={`btn-add-touch ${inCart ? 'in-cart' : ''}`}
                        disabled={isOutOfStock}
                        title="Ajouter au ticket de vente"
                      >
                        {inCart ? `✓ ${inCart.qty}` : '+'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE DROITE : TICKET DE CAISSE INTERACTIF & ENCAISSEMENT              */}
        {/* ========================================================================= */}
        <div className="pos-ticket-column">
          <div className="pos-register-ticket-card">
            
            {/* Ticket Header */}
            <div className="register-ticket-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="ticket-ico-box">🧾</div>
                <div>
                  <h3 className="ticket-main-title">Ticket de Vente Caisse</h3>
                  <div className="ticket-main-sub">
                    {nomVente} • {new Date().toLocaleDateString('fr-TG')}
                  </div>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-ticket"
                  onClick={() => setCart([])}
                  title="Vider tous les articles du ticket"
                >
                  Vider
                </button>
              )}
            </div>

            {/* Customer Selector Bar */}
            <div className="ticket-customer-bar">
              <div className="customer-type-select-wrap">
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  className="customer-type-select"
                >
                  <option value="Passager">👤 Client Comptoir (Passager)</option>
                  <option value="Regulier">⭐ Client Fidélité</option>
                  <option value="B2B">🏢 Restauration & Traiteur (Gros)</option>
                </select>
              </div>

              {clientType !== 'Passager' && (
                <input
                  type="text"
                  placeholder="Nom ou contact client..."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="customer-name-field"
                />
              )}
            </div>

            {/* Cart Items List */}
            <div className="register-ticket-items">
              {cart.length === 0 ? (
                <div className="ticket-empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛒</div>
                  <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1rem', marginBottom: '0.35rem' }}>
                    Aucun article dans le ticket
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '280px', lineHeight: 1.4 }}>
                    Cliquez sur un produit à gauche ou scannez un article pour l'ajouter à la commande.
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="ticket-item-row">
                    <div className="item-row-info">
                      <div className="item-row-name">{item.nom}</div>
                      <div className="item-row-sub">
                        {item.prix?.toLocaleString('fr-FR')} FCFA/{item.unite} • <span style={{ color: '#38bdf8' }}>{item.emplacement_bac}</span>
                      </div>
                    </div>

                    <div className="item-row-controls">
                      {/* Stepper */}
                      <div className="item-stepper">
                        <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>

                      {/* Total Line */}
                      <div className="item-row-total">
                        {(item.prix * item.qty).toLocaleString('fr-FR')}{' '}
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>F</span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        className="btn-item-delete"
                        onClick={() => removeFromCart(item.id)}
                        title="Supprimer la ligne"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pricing & Totals Summary */}
            <div className="ticket-pricing-summary">
              <div className="pricing-line">
                <span>Articles ({cart.reduce((sum, i) => sum + i.qty, 0)})</span>
                <span>{subTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>

              <div className="pricing-line">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Remise accordée :</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="select-discount"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>-5%</option>
                    <option value={10}>-10%</option>
                    <option value={15}>-15%</option>
                    <option value={20}>-20%</option>
                  </select>
                </span>
                <span style={{ color: discountAmount > 0 ? '#ef4444' : '#94a3b8', fontWeight: discountAmount > 0 ? 800 : 'normal' }}>
                  {discountAmount > 0 ? `-${discountAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                </span>
              </div>

              {/* Big Grand Total */}
              <div className="grand-total-banner">
                <div>
                  <div className="grand-total-lbl">Total Net à Payer</div>
                  <div className="grand-total-amt">
                    {finalTotal.toLocaleString('fr-FR')}{' '}
                    <span style={{ fontSize: '1.15rem', color: '#ffffff' }}>FCFA</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                  TVA incluse
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="payment-modes-grid">
                {[
                  { id: 'Espèces', label: '💵 Espèces', sub: 'Cash' },
                  { id: 'TMoney', label: '📱 TMoney', sub: 'Mobile' },
                  { id: 'Flooz', label: '📲 Flooz', sub: 'Moov' },
                  { id: 'Carte', label: '💳 Carte', sub: 'Bancaire' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`btn-pay-mode ${paymentMethod === mode.id ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(mode.id)}
                  >
                    <div style={{ fontWeight: 800 }}>{mode.label}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>{mode.sub}</div>
                  </button>
                ))}
              </div>

              {/* Cash Calculator (When Espèces is active) */}
              {paymentMethod === 'Espèces' && finalTotal > 0 && (
                <div className="cash-calculator-box">
                  <div className="cash-input-row">
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Montant reçu du client :
                    </span>
                    <input
                      type="number"
                      placeholder="Ex: 10000"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="cash-received-field"
                    />
                  </div>

                  {/* Fast Banknote Buttons */}
                  <div className="fast-bills-row">
                    {[1000, 2000, 5000, 10000, 20000, 50000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountReceived(val.toString())}
                        className="btn-fast-bill"
                      >
                        {val >= 1000 ? `${val / 1000}k` : val} F
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountReceived(finalTotal.toString())}
                      className="btn-fast-bill exact"
                    >
                      Exact
                    </button>
                  </div>

                  {/* Change To Return Indicator */}
                  {numericReceived >= finalTotal && numericReceived > 0 && (
                    <div className="change-return-row">
                      <span>Monnaie à Rendre au Client :</span>
                      <strong className="change-amount">
                        {changeToReturn.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Primary Action Button */}
              <button
                type="button"
                className="btn-primary-checkout"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🛒</span>
                  <span>Valider l'Encaissement</span>
                </div>
                <div className="checkout-total-bubble">
                  {finalTotal.toLocaleString('fr-FR')} FCFA →
                </div>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL : TICKET DE CAISSE IMPRIMABLE OFFICIEL                              */}
      {/* ========================================================================= */}
      {showReceiptModal && lastSaleReceipt && (
        <div className="pos-modal-backdrop" onClick={() => setShowReceiptModal(false)}>
          <div className="pos-receipt-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-paper-printable" id="printable-pos-receipt">
              
              <div className="receipt-head">
                <div className="receipt-brand-title">LA BOUTIQUE HEISTAL</div>
                <div className="receipt-sub">Spécialiste Surgelé de Qualité • Lomé</div>
                <div className="receipt-sub">Boutique : {nomBoutique(lastSaleReceipt.boutique_nom)}</div>
                <div className="receipt-sub">Tél Fixe : (+228) 22 26 42 29 • Commercial : (+228) 96 37 38 42</div>
                <div className="receipt-line-dashed">----------------------------------------</div>
              </div>

              <div className="receipt-metadata">
                <div>Réf Ticket : <strong>{lastSaleReceipt.reference}</strong></div>
                <div>Date & Heure : {lastSaleReceipt.date || new Date().toLocaleString('fr-TG')}</div>
                <div>Client : {lastSaleReceipt.client_nom}</div>
                <div>Caissier : {lastSaleReceipt.caissier}</div>
                <div className="receipt-line-dashed">----------------------------------------</div>
              </div>

              <div className="receipt-body-items">
                {lastSaleReceipt.items?.map((item, idx) => (
                  <div key={idx} className="receipt-item-entry">
                    <div>
                      <div className="entry-title">{item.nom}</div>
                      <div className="entry-qty">
                        {item.qty} {item.unite || 'kg'} x {item.prix?.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    <div className="entry-price">
                      {((item.prix || 0) * (item.qty || 1)).toLocaleString('fr-FR')} F
                    </div>
                  </div>
                ))}
                <div className="receipt-line-dashed">----------------------------------------</div>
              </div>

              <div className="receipt-foot-summary">
                <div className="receipt-sum-line">
                  <span>Sous-total articles :</span>
                  <span>{lastSaleReceipt.sous_total?.toLocaleString('fr-FR')} FCFA</span>
                </div>

                {lastSaleReceipt.remise > 0 && (
                  <div className="receipt-sum-line">
                    <span>Remise commerciale :</span>
                    <span>-{lastSaleReceipt.remise?.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}

                <div className="receipt-sum-line grand-bold">
                  <span>TOTAL NET PAYÉ :</span>
                  <span>{lastSaleReceipt.total_ttc?.toLocaleString('fr-FR')} FCFA</span>
                </div>

                <div className="receipt-sum-line">
                  <span>Mode de Règlement :</span>
                  <span>{lastSaleReceipt.mode_paiement}</span>
                </div>

                {lastSaleReceipt.mode_paiement === 'Espèces' && (
                  <>
                    <div className="receipt-sum-line">
                      <span>Montant Reçu :</span>
                      <span>{lastSaleReceipt.montant_recu?.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="receipt-sum-line">
                      <span>Monnaie Rendue :</span>
                      <strong style={{ color: '#007a3d' }}>
                        {lastSaleReceipt.monnaie_rendue?.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  </>
                )}
              </div>

              <div className="receipt-foot-note">
                <div className="receipt-line-dashed">----------------------------------------</div>
                <div>❄️ Chaîne du froid -18°C certifiée</div>
                <div>Merci de votre fidélité chez La Boutique Heistal !</div>
                <div style={{ fontSize: '0.68rem', marginTop: '0.35rem' }}>
                  Conservez ce ticket comme justificatif d'achat.
                </div>
              </div>

            </div>

            <div className="receipt-modal-actions">
              <button
                type="button"
                className="btn-print-receipt"
                onClick={() => window.print()}
              >
                🖨️ Imprimer le Reçu de Caisse
              </button>
              <button
                type="button"
                className="btn-close-receipt"
                onClick={() => setShowReceiptModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : JOURNAL DES VENTES DU JOUR                                        */}
      {/* ========================================================================= */}
      {retraitOuvert && (
        <Fenetre titre="Retrait d'une commande" sousTitre={nomVente} onFermer={() => setRetraitOuvert(false)}>
          <div className="pr-dialog-body">
            <RetraitCommande
              boutiqueCaisse={boutiqueId}
              peutVendre={employe?.role !== CONTROLEUR}
              onEncaissee={() => fetchData()}
            />
          </div>
        </Fenetre>
      )}

      {showHistory && (
        <div className="pos-modal-backdrop" onClick={() => setShowHistory(false)}>
          <div className="pos-history-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, color: '#ffffff' }}>Journal des Ventes de Caisse</h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Aperçu des encaissements de la journée • Total : <strong style={{ color: '#ffd000' }}>{todayTurnover.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowHistory(false)}
              >
                ✕
              </button>
            </div>

            <div className="history-modal-body">
              {ventesDuJour.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Aucune vente enregistrée pour aujourd'hui.
                </div>
              ) : (
                ventesDuJour.map(sale => (
                  <div key={sale.id} className="history-sale-entry">
                    <div className="history-entry-top">
                      <div>
                        <span className="sale-ref-chip">{sale.reference}</span>
                        <span className="sale-boutique-chip">📍 {nomBoutique(sale.boutique_nom)}</span>
                      </div>
                      <div className="sale-total-badge">
                        {sale.total_ttc?.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>

                    <div className="history-entry-details">
                      <span>Client : <strong>{sale.client_nom}</strong></span>
                      <span>Règlement : <strong>{sale.mode_paiement}</strong></span>
                      <span>Caissier : <strong>{sale.caissier}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
