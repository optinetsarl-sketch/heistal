import React, { useState, useEffect } from 'react';
import { apiErrorMessage, apiFetch } from '../../api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000/api' : '/api');

// Quartiers phares de Lomé pour géolocalisation rapide en 1 clic
const PRESET_LOCATIONS_LOME = [
  { name: 'Tokoin Wuiti (Lomé Ouest)', lat: 6.1485000, lng: 1.2180000, quartier: 'Tokoin Wuiti' },
  { name: 'Adidogomé (Lomé Ouest)', lat: 6.1720000, lng: 1.1650000, quartier: 'Adidogomé' },
  { name: 'Agoè-Assiyéyé (Lomé Nord)', lat: 6.2150000, lng: 1.1890000, quartier: 'Agoè' },
  { name: 'Centre-Ville / Dékon (Lomé)', lat: 6.1375000, lng: 1.2123000, quartier: 'Centre-ville' },
  { name: 'Bè / Port Autonome (Lomé Est)', lat: 6.1280000, lng: 1.2400000, quartier: 'Bè' },
  { name: 'Kégué / Stade (Lomé Nord-Est)', lat: 6.1850000, lng: 1.2350000, quartier: 'Kégué' },
];

const INITIAL_STORES = [
  {
    id: 1,
    nom: 'Boutique Tokoin Wuiti',
    code: 'BQT-TOK-01',
    telephone: '+228 22 26 42 29',
    localisation: 'Tokoin Wuiti, Boulevard de la Paix, face station Total',
    ville: 'Lomé',
    quartier: 'Tokoin Wuiti',
    latitude: 6.1485000,
    longitude: 1.2180000,
    lien_map: 'https://www.google.com/maps?q=6.1485,1.2180',
    responsable: 'Samuel Kpelly',
    horaires: 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
    statut: 'Active',
    is_siege: false,
    image: '/heistal_store_1.jpg'
  },
  {
    id: 2,
    nom: 'Boutique Adidogomé',
    code: 'BQT-ADI-02',
    telephone: '+228 90 11 22 33',
    localisation: "Adidogomé Douane, Avenue d'Aflao, près du carrefour Limousine",
    ville: 'Lomé',
    quartier: 'Adidogomé',
    latitude: 6.1720000,
    longitude: 1.1650000,
    lien_map: 'https://www.google.com/maps?q=6.1720,1.1650',
    responsable: 'Estelle Foli',
    horaires: 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
    statut: 'Active',
    is_siege: false,
    image: '/heistal_store_2.jpg'
  },
  {
    id: 3,
    nom: 'Siège Direction Heistal',
    code: 'BQT-SIEG-00',
    telephone: '+228 90 01 02 03',
    localisation: 'Zone Administrative et Commerciale, Lomé',
    ville: 'Lomé',
    quartier: 'Centre-ville',
    latitude: 6.1375000,
    longitude: 1.2123000,
    lien_map: 'https://www.google.com/maps?q=6.1375,1.2123',
    responsable: 'Direction Générale (PDG)',
    horaires: 'Lun - Ven: 08h00 - 18h00',
    statut: 'Active',
    is_siege: true,
    image: '/heistal_store_siege.jpg'
  }
];

export default function AdminStores() {
  const [stores, setStores] = useState(INITIAL_STORES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [activeTab, setActiveTab] = useState('cards'); // 'cards', 'map', 'table'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    nom: '',
    telephone: '+228 ',
    localisation: '',
    ville: 'Lomé',
    quartier: '',
    latitude: 6.1485000,
    longitude: 1.2180000,
    lien_map: 'https://www.google.com/maps?q=6.1485,1.2180',
    responsable: '',
    horaires: 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
    statut: 'Active',
    is_siege: false
  });

  // État pour affectation de caissière (Règle : Seule la caissière)
  const [cashiers, setCashiers] = useState([]);
  const [assignCashierStore, setAssignCashierStore] = useState(null);
  const [selectedCashierId, setSelectedCashierId] = useState('');

  const notify = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Chargement depuis le Backend
  const loadStores = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/boutiques/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
        }
      }
    } catch (e) {
      console.log('Utilisation des données locales pour les boutiques');
    }
  };

  const loadCashiers = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/profiles/caissieres/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCashiers(data);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadStores();
    loadCashiers();
  }, []);

  // Ouvrir modal affectation caissière pour cette boutique
  const handleOpenAssignCashierModal = (store) => {
    setAssignCashierStore(store);
    const existing = cashiers.find(c => c.boutique === store.id);
    setSelectedCashierId(existing ? String(existing.id) : (cashiers[0]?.id ? String(cashiers[0].id) : ''));
  };

  const handleAssignCashierSubmit = async (e) => {
    e.preventDefault();
    if (!assignCashierStore || !selectedCashierId) return;

    const chosenCashier = cashiers.find(c => String(c.id) === String(selectedCashierId));
    if (!chosenCashier) return;

    try {
      const res = await apiFetch(`${API_BASE}/profiles/${selectedCashierId}/affecter_boutique/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique: assignCashierStore.id })
      });
      if (!res.ok) {
        notify(await apiErrorMessage(res, "L'affectation a été refusée."));
        return;
      }
    } catch (err) {
      console.warn('Affectation impossible :', err);
      notify("Serveur injoignable : l'affectation n'a pas été enregistrée.");
      return;
    }

    // Mise à jour locale
    setCashiers(prev => prev.map(c => String(c.id) === String(selectedCashierId) ? { ...c, boutique: assignCashierStore.id, boutique_nom: assignCashierStore.nom } : c));
    setStores(prev => prev.map(s => {
      if (s.id === assignCashierStore.id) {
        return {
          ...s,
          caissieres: [{ id: chosenCashier.id, nom_complet: chosenCashier.nom_complet, username: chosenCashier.username, telephone: chosenCashier.telephone }]
        };
      }
      return s;
    }));

    notify(`Caissière ${chosenCashier.nom_complet} affectée à la boutique "${assignCashierStore.nom}" !`);
    setAssignCashierStore(null);
  };

  // Ouvrir modal création
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({
      id: null,
      nom: '',
      telephone: '+228 ',
      localisation: '',
      ville: 'Lomé',
      quartier: 'Tokoin',
      latitude: 6.1485000,
      longitude: 1.2180000,
      lien_map: 'https://www.google.com/maps?q=6.1485,1.2180',
      responsable: '',
      horaires: 'Lun - Sam: 07h30 - 20h00, Dim: 08h00 - 14h00',
      statut: 'Active',
      is_siege: false
    });
    setShowModal(true);
  };

  // Ouvrir modal modification
  const handleOpenEditModal = (store) => {
    setIsEditing(true);
    setFormData({
      id: store.id,
      nom: store.nom,
      telephone: store.telephone || '+228 ',
      localisation: store.localisation,
      ville: store.ville || 'Lomé',
      quartier: store.quartier || '',
      latitude: store.latitude || 6.1485000,
      longitude: store.longitude || 1.2180000,
      lien_map: store.lien_map || `https://www.google.com/maps?q=${store.latitude},${store.longitude}`,
      responsable: store.responsable || '',
      horaires: store.horaires || 'Lun - Sam: 07h30 - 20h00',
      statut: store.statut || 'Active',
      is_siege: store.is_siege || false
    });
    setShowModal(true);
  };

  // Détection GPS par le navigateur
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          lien_map: `https://www.google.com/maps?q=${lat},${lng}`
        }));
        setIsDetectingGps(false);
        notify("Position GPS détectée avec succès !");
      },
      (err) => {
        setIsDetectingGps(false);
        alert("Impossible de récupérer la position GPS. Vous pouvez choisir un quartier dans la liste ci-dessous.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Appliquer un quartier pré-défini de Lomé
  const handleSelectPresetLocation = (preset) => {
    setFormData(prev => ({
      ...prev,
      quartier: preset.quartier,
      latitude: preset.lat,
      longitude: preset.lng,
      lien_map: `https://www.google.com/maps?q=${preset.lat},${preset.lng}`
    }));
  };

  // Enregistrer (Création / Modification)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.telephone.trim() || !formData.localisation.trim()) {
      alert("Veuillez renseigner le nom, le numéro de téléphone et la localisation de la boutique.");
      return;
    }

    const mapUrl = formData.lien_map || `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;

    const payload = {
      ...formData,
      lien_map: mapUrl
    };

    if (isEditing) {
      setStores(stores.map(s => s.id === formData.id ? { ...s, ...payload } : s));
      try {
        await apiFetch(`${API_BASE}/boutiques/${formData.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}
      notify(`Boutique "${payload.nom}" modifiée avec succès !`);
    } else {
      const newStore = {
        ...payload,
        id: Date.now(),
        code: `BQT-${payload.nom.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${stores.length + 1}`
      };
      setStores([...stores, newStore]);
      try {
        await apiFetch(`${API_BASE}/boutiques/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}
      notify(`Nouvelle boutique "${payload.nom}" créée avec son enregistrement Map !`);
    }

    setShowModal(false);
  };

  // Supprimer une boutique
  const handleDeleteStore = async (store) => {
    if (!window.confirm(`Supprimer définitivement la boutique "${store.nom}" (${store.localisation}) ?`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/boutiques/${store.id}/`, { method: 'DELETE' });
      if (!res.ok) {
        notify(await apiErrorMessage(res, `La boutique "${store.nom}" n'a pas été supprimée.`));
        return;
      }
    } catch (err) {
      console.warn('Suppression de la boutique impossible :', err);
      notify(`Serveur injoignable : la boutique "${store.nom}" n'a pas été supprimée.`);
      return;
    }
    setStores(stores.filter(s => s.id !== store.id));
    notify(`Boutique "${store.nom}" supprimée.`);
  };

  // Filtrage
  const filteredStores = stores.filter(s => {
    const matchesSearch =
      s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.telephone.includes(searchTerm) ||
      s.localisation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.quartier && s.quartier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatut = filterStatut === 'Tous' || s.statut === filterStatut;
    return matchesSearch && matchesStatut;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '25px',
          background: '#007a3d',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 9999,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="admin-panel-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏪</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Gestion des Boutiques & Points de Vente
              </h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
              Créez et gérez vos boutiques physiques avec leur <strong>Nom</strong>, <strong>Téléphone</strong>, <strong>Localisation</strong> et <strong>enregistrement sur Carte (Map)</strong>.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            style={{
              padding: '0.7rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#007a3d'
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
            Créer une Boutique
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginTop: '1.5rem',
          paddingBottom: '0.2rem',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            style={{
              background: activeTab === 'cards' ? '#ffd000' : 'transparent',
              color: activeTab === 'cards' ? '#00361a' : '#94a3b8',
              fontWeight: 700,
              padding: '0.55rem 1.15rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem'
            }}
          >
            <span>🏪</span> Fiches Boutiques & Map ({stores.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            style={{
              background: activeTab === 'map' ? '#ffd000' : 'transparent',
              color: activeTab === 'map' ? '#00361a' : '#94a3b8',
              fontWeight: 700,
              padding: '0.55rem 1.15rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem'
            }}
          >
            <span>🗺️</span> Vue Carte Générale (Lomé)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            style={{
              background: activeTab === 'table' ? '#ffd000' : 'transparent',
              color: activeTab === 'table' ? '#00361a' : '#94a3b8',
              fontWeight: 700,
              padding: '0.55rem 1.15rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.88rem'
            }}
          >
            <span>📋</span> Tableau Récapitulatif
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-panel-card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {/* Search */}
            <div className="admin-search-wrapper" style={{ minWidth: '280px', flex: '1 1 300px' }}>
              <span className="admin-search-icon">🔍</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Rechercher par nom, téléphone, adresse ou quartier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter by Status */}
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              style={{
                background: '#092815',
                color: '#f8fafc',
                border: '1px solid rgba(0, 122, 61, 0.4)',
                borderRadius: '8px',
                padding: '0.6rem 0.9rem',
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <option value="Tous">Tous les statuts</option>
              <option value="Active">Actives (Ouvertes)</option>
              <option value="En travaux">En travaux</option>
              <option value="Fermée">Fermées</option>
            </select>
          </div>

          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            <strong>{filteredStores.length}</strong> boutique(s)
          </div>
        </div>
      </div>

      {/* ==============================================================
          VUE 1 : FICHES BOUTIQUES AVEC MAP EMBEDDED
          ============================================================== */}
      {activeTab === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
          {filteredStores.length === 0 ? (
            <div className="admin-panel-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Aucune boutique trouvée. Cliquez sur <strong>« + Créer une Boutique »</strong> pour ajouter votre premier magasin.
            </div>
          ) : (
            filteredStores.map((store) => (
              <div
                key={store.id}
                className="admin-panel-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px'
                }}
              >
                {/* Store Map Banner Preview */}
                <div style={{ position: 'relative', width: '100%', height: '180px', background: '#020f07' }}>
                  <iframe
                    title={`Carte de ${store.nom}`}
                    width="100%"
                    height="180"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(store.longitude) - 0.008}%2C${parseFloat(store.latitude) - 0.008}%2C${parseFloat(store.longitude) + 0.008}%2C${parseFloat(store.latitude) + 0.008}&layer=mapnik&marker=${store.latitude}%2C${store.longitude}`}
                    style={{ border: 0, opacity: 0.9 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    gap: '0.4rem'
                  }}>
                    <span style={{
                      background: store.statut === 'Active' ? '#007a3d' : '#eab308',
                      color: 'white',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      ● {store.statut}
                    </span>
                    {store.is_siege && (
                      <span style={{
                        background: '#17365d',
                        color: '#60a5fa',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #3b82f6'
                      }}>
                        🏛️ Siège Central
                      </span>
                    )}
                  </div>
                </div>

                {/* Store Body Information */}
                <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1.25rem', fontWeight: 800 }}>
                      {store.nom}
                    </h3>
                    <span style={{ color: '#ffd000', fontSize: '0.78rem', fontWeight: 700 }}>
                      {store.code || 'Boutique Heistal Togo'}
                    </span>
                  </div>

                  {/* Telephone (Exigence User) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#05180c', border: '1px solid rgba(0, 122, 61, 0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📞</span>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Téléphone direct</div>
                      <a href={`tel:${store.telephone}`} style={{ color: '#4ade80', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem' }}>
                        {store.telephone}
                      </a>
                    </div>
                  </div>

                  {/* Localisation (Exigence User) */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: '#05180c', border: '1px solid rgba(0, 122, 61, 0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>📍</span>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Localisation & Adresse</div>
                      <div style={{ color: '#f1f5f9', fontSize: '0.86rem', lineHeight: 1.4, fontWeight: 500 }}>
                        {store.localisation}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        {store.ville} {store.quartier ? `• Quartier ${store.quartier}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Caissière affectée à la boutique (Règle Métier : Seule la caissière) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 122, 61, 0.1)',
                    border: '1px solid rgba(0, 122, 61, 0.3)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1.25rem' }}>👩‍💼</span>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#4ade80', textTransform: 'uppercase', fontWeight: 800 }}>
                          Caissière en poste
                        </div>
                        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {store.caissieres && store.caissieres.length > 0
                            ? store.caissieres.map(c => c.nom_complet).join(', ')
                            : (cashiers.find(c => c.boutique === store.id)?.nom_complet || 'Aucune caissière affectée')}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignCashierModal(store)}
                      style={{
                        background: '#ffd000',
                        color: '#00361a',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="Affecter ou changer la caissière de cette boutique"
                    >
                      Affecter
                    </button>
                  </div>

                  {/* Coordonnées Map & GPS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
                    <span>Coordonnées GPS :</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                      {parseFloat(store.latitude).toFixed(4)}, {parseFloat(store.longitude).toFixed(4)}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <a
                      href={store.lien_map || `https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        fontSize: '0.8rem',
                        padding: '0.5rem',
                        textDecoration: 'none',
                        textAlign: 'center',
                        color: '#ffd000',
                        borderColor: 'rgba(255,208,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                      title="Ouvrir dans Google Maps"
                    >
                      <span>🗺️</span>
                      <span>Google Maps</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(store)}
                      style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStore(store)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'rgba(248, 113, 113, 0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(248, 113, 113, 0.25)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      title="Supprimer la boutique"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==============================================================
          VUE 2 : GRANDE CARTE INTERACTIVE (Lomé & Régions)
          ============================================================== */}
      {activeTab === 'map' && (
        <div className="admin-panel-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc', fontSize: '1.2rem' }}>
                Cartographie Interactive des Boutiques à Lomé
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Visualisez l'implantation de vos magasins physiques à travers la capitale togolaise.
              </p>
            </div>
            <span style={{ background: 'rgba(0,122,61,0.2)', color: '#4ade80', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
              📍 {stores.length} points de vente enregistrés
            </span>
          </div>

          <div style={{ width: '100%', height: '480px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <iframe
              title="Carte générale Heistal Togo"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src="https://www.openstreetmap.org/export/embed.html?bbox=1.1200%2C6.1100%2C1.2700%2C6.2300&layer=mapnik"
              style={{ border: 0 }}
            />
          </div>

          {/* Quick list of markers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
            {stores.map(s => (
              <div key={s.id} style={{ background: '#05180c', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(0, 122, 61, 0.25)' }}>
                <div style={{ fontWeight: 700, color: '#ffd000', fontSize: '0.9rem' }}>📍 {s.nom}</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>{s.localisation}</div>
                <div style={{ fontSize: '0.78rem', color: '#4ade80', marginTop: '0.3rem' }}>📞 {s.telephone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================
          VUE 3 : TABLEAU RÉCAPITULATIF
          ============================================================== */}
      {activeTab === 'table' && (
        <div className="admin-panel-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom de la boutique</th>
                  <th>Numéro de téléphone</th>
                  <th>Localisation / Adresse</th>
                  <th>Caissière en poste</th>
                  <th>Coordonnées Map (GPS)</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map(store => (
                  <tr key={store.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{store.nom}</div>
                      <div style={{ fontSize: '0.75rem', color: '#ffd000' }}>{store.code}</div>
                    </td>
                    <td>
                      <a href={`tel:${store.telephone}`} style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>
                        {store.telephone}
                      </a>
                    </td>
                    <td>
                      <div style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{store.localisation}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{store.ville}</div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          color: (store.caissieres && store.caissieres.length > 0) || cashiers.some(c => c.boutique === store.id) ? '#4ade80' : '#facc15',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          👩‍💼 {store.caissieres && store.caissieres.length > 0
                            ? store.caissieres.map(c => c.nom_complet).join(', ')
                            : (cashiers.find(c => c.boutique === store.id)?.nom_complet || 'Non affectée')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignCashierModal(store)}
                          style={{
                            background: 'rgba(255, 208, 0, 0.12)',
                            border: '1px solid rgba(255, 208, 0, 0.3)',
                            color: '#ffd000',
                            borderRadius: '5px',
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Affecter une caissière à cette boutique"
                        >
                          Affecter
                        </button>
                      </div>
                    </td>
                    <td>
                      <a
                        href={store.lien_map || `https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <span>🗺️</span>
                        <span>{parseFloat(store.latitude).toFixed(4)}, {parseFloat(store.longitude).toFixed(4)}</span>
                      </a>
                    </td>
                    <td>
                      <span className={`badge-admin-status ${store.statut === 'Active' ? 'status-active' : 'status-pending'}`}>
                        {store.statut}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(store)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStore(store)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: 'rgba(248, 113, 113, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.25)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL : CRÉER / MODIFIER UNE BOUTIQUE AVEC SON MAP
          ============================================================== */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: '1.25rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #092815 0%, #03140a 100%)',
            border: '1.5px solid rgba(0, 122, 61, 0.5)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '94vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.75)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>🏪</span>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                  {isEditing ? "Modifier la Boutique" : "Créer une Nouvelle Boutique"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.4rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* NOM DE LA BOUTIQUE (Exigence 1) */}
              <div className="form-field">
                <label style={{ color: '#ffd000', fontWeight: 800, fontSize: '0.88rem' }}>
                  1. Nom de la boutique *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boutique Tokoin Wuiti, Boutique Agoè-Assiyéyé..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  style={{ fontSize: '0.95rem', fontWeight: 600 }}
                />
              </div>

              {/* NUMÉRO DE TÉLÉPHONE (Exigence 2) */}
              <div className="form-grid-2">
                <div className="form-field">
                  <label style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.88rem' }}>
                    2. Numéro de téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +228 22 26 42 29 ou +228 90 12 34 56"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    style={{ fontSize: '0.95rem', fontWeight: 600 }}
                  />
                </div>

                <div className="form-field">
                  <label>Ville & Quartier</label>
                  <input
                    type="text"
                    placeholder="Ex: Lomé - Tokoin Wuiti"
                    value={formData.quartier}
                    onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                  />
                </div>
              </div>

              {/* LOCALISATION PHYSIQUE (Exigence 3) */}
              <div className="form-field">
                <label style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.88rem' }}>
                  3. Localisation / Adresse physique précise *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Ex: Tokoin Wuiti, Boulevard de la Paix, face station Total, à côté de la pharmacie..."
                  value={formData.localisation}
                  onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                  style={{ fontSize: '0.92rem' }}
                />
              </div>

              {/* ENREGISTREMENT DE SON MAP (Exigence 4) */}
              <div style={{
                background: '#0d1522',
                border: '1.5px solid rgba(255, 208, 0, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ color: '#ffd000', fontWeight: 800, fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🗺️</span>
                    <span>4. Enregistrement de son Map (Géolocalisation GPS)</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isDetectingGps}
                    style={{
                      background: '#007a3d',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>📍</span>
                    <span>{isDetectingGps ? "Détection en cours..." : "Détecter ma position GPS"}</span>
                  </button>
                </div>

                {/* Quick Presets for Lomé */}
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Ou choisir un quartier de Lomé pour positionner automatiquement la carte :
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {PRESET_LOCATIONS_LOME.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleSelectPresetLocation(p)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                      >
                        📍 {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Latitude & Longitude Inputs */}
                <div className="form-grid-2">
                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Latitude GPS</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          latitude: val,
                          lien_map: `https://www.google.com/maps?q=${val},${formData.longitude}`
                        });
                      }}
                    />
                  </div>

                  <div className="form-field">
                    <label style={{ fontSize: '0.8rem' }}>Longitude GPS</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          longitude: val,
                          lien_map: `https://www.google.com/maps?q=${formData.latitude},${val}`
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Live Interactive Map Preview */}
                <div style={{ marginTop: '0.35rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Aperçu du repère enregistré sur la carte :
                  </div>
                  <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <iframe
                      title="Prévisualisation carte"
                      width="100%"
                      height="160"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.longitude) - 0.006}%2C${parseFloat(formData.latitude) - 0.006}%2C${parseFloat(formData.longitude) + 0.006}%2C${parseFloat(formData.latitude) + 0.006}&layer=mapnik&marker=${formData.latitude}%2C${formData.longitude}`}
                      style={{ border: 0 }}
                    />
                  </div>
                </div>
              </div>

              {/* Responsable & Statut */}
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Responsable / Gérant de la boutique</label>
                  <input
                    type="text"
                    placeholder="Ex: Samuel Kpelly"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    <option value="Active">Active (Ouverte au public)</option>
                    <option value="En travaux">En travaux / Rénovation</option>
                    <option value="Fermée">Fermée temporairement</option>
                  </select>
                </div>
              </div>

              {/* Boutons d'action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ background: 'transparent', color: '#cbd5e1' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#007a3d', padding: '0.7rem 1.6rem', fontWeight: 800 }}
                >
                  {isEditing ? "Enregistrer les modifications" : "Créer et enregistrer la boutique"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL AFFECTER UNE CAISSIÈRE À LA BOUTIQUE (RÈGLE STRICTE)
          ============================================================== */}
      {assignCashierStore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1.25rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #092815 0%, #03140a 100%)',
            border: '1.5px solid rgba(0, 122, 61, 0.5)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem' }}>👩‍💼</span>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', fontWeight: 800 }}>
                    Affecter une Caissière
                  </h3>
                  <span style={{ color: '#ffd000', fontSize: '0.85rem', fontWeight: 700 }}>
                    {assignCashierStore.nom} ({assignCashierStore.ville})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignCashierStore(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* RÈGLE MÉTIER OFFICIELLE */}
            <div style={{
              background: 'rgba(0, 122, 61, 0.12)',
              borderLeft: '4px solid #007a3d',
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              color: '#dcfce7',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              marginBottom: '1.5rem'
            }}>
              💡 <strong>Règle d'affectation :</strong> Seules les personnes ayant le profil ou le poste de <strong>Caissière</strong> peuvent être affectées à une boutique physique.
            </div>

            <form onSubmit={handleAssignCashierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-field">
                <label style={{ color: '#f8fafc', fontWeight: 800 }}>
                  Choisir la caissière à affecter à cette caisse *
                </label>
                {cashiers.length === 0 ? (
                  <div style={{ padding: '0.85rem', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', borderRadius: '8px', fontSize: '0.85rem' }}>
                    Aucun profil Caissière disponible. Créez d'abord une caissière dans l'onglet « Utilisateurs & Postes ».
                  </div>
                ) : (
                  <select
                    value={selectedCashierId}
                    onChange={(e) => setSelectedCashierId(e.target.value)}
                    required
                    style={{
                      background: '#092815',
                      border: '1.5px solid #007a3d',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <option value="">-- Choisir une caissière --</option>
                    {cashiers.map(c => {
                      const currentStore = c.boutique ? `Actuellement à ${c.boutique_nom}` : 'Disponible / Non affectée';
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nom_complet} (@{c.username}) — {currentStore}
                        </option>
                      );
                    })}
                  </select>
                )}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Cette caissière assurera l'encaissement et le point de vente sur cette boutique.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAssignCashierStore(null)}
                  className="btn btn-outline"
                  style={{ background: 'transparent', color: '#cbd5e1' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={!selectedCashierId}
                  className="btn btn-primary"
                  style={{ background: '#007a3d', fontWeight: 800, padding: '0.7rem 1.4rem' }}
                >
                  Valider l'affectation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
