import React, { useState, useEffect } from 'react';
import { API_BASE, apiErrorMessage, apiFetch } from '../../api';
import { boutiquesActives } from './catalogue';

const CLIENT_TYPES = [
  { code: 'PARTICULIER', label: 'Particulier / Foyer', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: '#0284c7' },
  { code: 'RESTAURANT', label: 'Restaurant / Maquis', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)', border: '#ea580c' },
  { code: 'HOTEL', label: 'Hôtel / Complexe', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.15)', border: '#7c3aed' },
  { code: 'GROSSISTE', label: 'Grossiste B2B', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)', border: '#16a34a' },
];


export default function AdminClients() {
  const [availableBoutiques, setAvailableBoutiques] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('Tous');
  const [clientStatutFilter, setClientStatutFilter] = useState('Tous');
  const [showClientModal, setShowClientModal] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [selectedClientOrders, setSelectedClientOrders] = useState(null);
  const [clientOrdersLoading, setClientOrdersLoading] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    id: null,
    nom_complet: '',
    telephone: '+228 ',
    telephone_secondaire: '',
    email: '',
    mot_de_passe: '',
    type_client: 'PARTICULIER',
    quartier: '',
    ville: 'Lomé',
    adresse: '',
    boutique_preferee: 'Boutique Tokoin Wuiti',
    notes: '',
    est_actif: true,
  });

  // Toast
  const [toast, setToast] = useState('');

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // Chargement des données
  const loadClients = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/clients/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClients(data);
        }
      }
    } catch (err) {
      console.log('Erreur chargement clients:', err);
    }
  };


  const loadBoutiques = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/boutiques/`);
      if (res.ok) setAvailableBoutiques(boutiquesActives(await res.json()));
    } catch (err) {
      console.warn('Chargement des boutiques impossible :', err);
    }
  };

  useEffect(() => {
    loadClients();
    loadBoutiques();
  }, []);

  // ===================== ACTIONS CLIENTS =====================
  const handleOpenCreateClientModal = () => {
    setIsEditingClient(false);
    setClientFormData({
      id: null,
      nom_complet: '',
      telephone: '+228 ',
      telephone_secondaire: '',
      email: '',
      mot_de_passe: '',
      type_client: 'PARTICULIER',
      quartier: '',
      ville: 'Lomé',
      adresse: '',
      boutique_preferee: availableBoutiques[0]?.nom || 'Boutique Tokoin Wuiti',
      notes: '',
      est_actif: true,
    });
    setShowClientModal(true);
  };

  const handleOpenEditClientModal = (client) => {
    setIsEditingClient(true);
    setClientFormData({
      id: client.id,
      nom_complet: client.nom_complet || '',
      telephone: client.telephone || '+228 ',
      telephone_secondaire: client.telephone_secondaire || '',
      email: client.email || '',
      mot_de_passe: '',
      type_client: client.type_client || 'PARTICULIER',
      quartier: client.quartier || '',
      ville: client.ville || 'Lomé',
      adresse: client.adresse || '',
      boutique_preferee: client.boutique_preferee || 'Boutique Tokoin Wuiti',
      notes: client.notes || '',
      est_actif: client.est_actif !== false,
    });
    setShowClientModal(true);
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    if (!clientFormData.nom_complet.trim() || !clientFormData.telephone.trim()) {
      alert("Le nom complet et le numéro de téléphone sont obligatoires.");
      return;
    }

    const payload = {
      ...clientFormData,
      telephone: clientFormData.telephone.trim()
    };
    // Un champ vide conserve le mot de passe actuel.
    const nouveauMotDePasse = clientFormData.mot_de_passe.trim();
    if (nouveauMotDePasse) {
      payload.mot_de_passe = nouveauMotDePasse;
    } else {
      delete payload.mot_de_passe;
    }

    try {
      const res = await apiFetch(
        isEditingClient ? `${API_BASE}/clients/${clientFormData.id}/` : `${API_BASE}/clients/`,
        {
          method: isEditingClient ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        alert(await apiErrorMessage(res, "L'enregistrement du client a été refusé."));
        return;
      }
      if (isEditingClient) {
        loadClients();
      } else {
        const created = await res.json();
        setClients([created, ...clients]);
      }
    } catch (err) {
      console.warn('Enregistrement du client impossible :', err);
      alert("Serveur injoignable : la fiche client n'a pas été enregistrée.");
      return;
    }

    notify(isEditingClient
      ? `Fiche client ${payload.nom_complet} mise à jour avec succès !`
      : `Nouveau client ${payload.nom_complet} enregistré dans la base !`);
    setShowClientModal(false);
  };

  const handleToggleClientStatus = async (client) => {
    const nextStatus = !client.est_actif;
    setClients(clients.map(c => c.id === client.id ? { ...c, est_actif: nextStatus } : c));
    try {
      await apiFetch(`${API_BASE}/clients/${client.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ est_actif: nextStatus })
      });
    } catch (e) {}
    notify(`Client ${client.nom_complet} ${nextStatus ? 'activé' : 'désactivé'}.`);
  };

  const handleDeleteClient = async (client) => {
    if (window.confirm(`Supprimer définitivement le client "${client.nom_complet}" (${client.telephone}) de la base de données ?`)) {
      setClients(clients.filter(c => c.id !== client.id));
      try {
        await apiFetch(`${API_BASE}/clients/${client.id}/`, { method: 'DELETE' });
      } catch (e) {}
      notify(`Client ${client.nom_complet} supprimé de la base.`);
    }
  };

  const handleViewClientOrders = async (client) => {
    setSelectedClientOrders({ client, orders: [] });
    setClientOrdersLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/clients/${client.id}/commandes/`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClientOrders({ client, orders: Array.isArray(data) ? data : [] });
      }
    } catch (e) {
      console.log('Erreur chargement commandes client:', e);
    } finally {
      setClientOrdersLoading(false);
    }
  };

  const getClientTypeObj = (code) => {
    return CLIENT_TYPES.find(t => t.code === code) || { label: code || 'Particulier', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: '#0284c7' };
  };

  // Filtrage Clients
  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    const matchesSearch =
      (c.nom_complet && c.nom_complet.toLowerCase().includes(q)) ||
      (c.telephone && c.telephone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.quartier && c.quartier.toLowerCase().includes(q));

    const matchesType = clientTypeFilter === 'Tous' || c.type_client === clientTypeFilter;
    const matchesStatut =
      clientStatutFilter === 'Tous' ||
      (clientStatutFilter === 'Actif' && c.est_actif) ||
      (clientStatutFilter === 'Inactif' && !c.est_actif);

    return matchesSearch && matchesType && matchesStatut;
  });

  // Calcul des métriques clients
  const totalDepensesClients = clients.reduce((acc, c) => acc + (c.total_depense || 0), 0);
  const totalCommandesClients = clients.reduce((acc, c) => acc + (c.total_commandes || 0), 0);
  const countParticuliers = clients.filter(c => c.type_client === 'PARTICULIER').length;
  const countPros = clients.filter(c => c.type_client !== 'PARTICULIER').length;

  return (
    <div className="admin-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
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
          <span>{toast}</span>
        </div>
      )}

      <>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="admin-panel-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ffd000' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Clients Enregistrés</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', marginTop: '0.25rem' }}>{clients.length}</div>
              <div style={{ color: '#ffd000', fontSize: '0.78rem', marginTop: '0.25rem' }}>Base e-commerce & comptoirs</div>
            </div>

            <div className="admin-panel-card" style={{ padding: '1.25rem', borderLeft: '4px solid #007a3d' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Particuliers & Foyers</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ade80', marginTop: '0.25rem' }}>{countParticuliers}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>Consommation des ménages</div>
            </div>

            <div className="admin-panel-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Professionnels (Restos / Hôtels)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fb923c', marginTop: '0.25rem' }}>{countPros}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>Comptes B2B & réguliers</div>
            </div>

            <div className="admin-panel-card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Commandes Rattachées</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.25rem' }}>{totalCommandesClients}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>Commandes web & magasins</div>
            </div>

            <div className="admin-panel-card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700 }}>Chiffre d'Affaires Cumulé</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#4ade80', marginTop: '0.35rem' }}>
                {totalDepensesClients.toLocaleString('fr-FR')} <span style={{ fontSize: '0.85rem' }}>FCFA</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>Achats récupérés & validés</div>
            </div>
          </div>

          {/* Client Filter and Action Bar */}
          <div className="admin-panel-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffd000', margin: '0 0 0.25rem 0' }}>
                  Répertoire des Clients Heistal Togo
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: 0 }}>
                  Gérez les coordonnées, l'historique des achats, les numéros TMoney / Flooz et l'accès client.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreateClientModal}
                style={{
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #ffd000 0%, #e5b800 100%)',
                  color: '#002813',
                  border: 'none'
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
                Ajouter un client
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="admin-search-wrapper" style={{ minWidth: '260px', flex: '1 1 280px' }}>
                <span className="admin-search-icon">🔍</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Rechercher par nom, téléphone, quartier, email..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <select
                value={clientTypeFilter}
                onChange={(e) => setClientTypeFilter(e.target.value)}
                style={{
                  background: '#092815',
                  color: '#f8fafc',
                  border: '1px solid rgba(0, 122, 61, 0.4)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <option value="Tous">Tous les types de clients</option>
                <option value="PARTICULIER">Particulier / Foyer</option>
                <option value="RESTAURANT">Restaurant / Maquis</option>
                <option value="HOTEL">Hôtel / Complexe</option>
                <option value="GROSSISTE">Grossiste B2B</option>
              </select>

              {/* Status Filter */}
              <select
                value={clientStatutFilter}
                onChange={(e) => setClientStatutFilter(e.target.value)}
                style={{
                  background: '#092815',
                  color: '#f8fafc',
                  border: '1px solid rgba(0, 122, 61, 0.4)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <option value="Tous">Tous les statuts</option>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>

              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: 'auto' }}>
                Affichage : <strong>{filteredClients.length}</strong> / {clients.length} clients
              </div>
            </div>
          </div>

          {/* Table of Clients */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client & Date Inscription</th>
                  <th>Type de Client</th>
                  <th>Téléphones & Contact</th>
                  <th>Localisation & Retrait</th>
                  <th>Commandes & Dépenses</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      Aucun client ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => {
                    const typeObj = getClientTypeObj(c.type_client);

                    return (
                      <tr key={c.id} style={{ opacity: c.est_actif ? 1 : 0.6 }}>
                        {/* Client Identity */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0284c7 0%, #034f77 100%)',
                              border: `1.5px solid ${typeObj.border}`,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem'
                            }}>
                              {(c.nom_complet || 'CL').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                                {c.nom_complet}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                Inscrit le {new Date(c.date_inscription).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: typeObj.bg,
                            color: typeObj.color,
                            border: `1px solid ${typeObj.border}44`
                          }}>
                            {typeObj.label}
                          </span>
                        </td>

                        {/* Phone */}
                        <td>
                          <div>
                            <a
                              href={`tel:${c.telephone}`}
                              style={{ color: '#ffd000', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <span>📞</span>
                              <span>{c.telephone}</span>
                            </a>
                            {c.telephone_secondaire && (
                              <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.15rem' }}>
                                Alt: {c.telephone_secondaire}
                              </div>
                            )}
                            {c.email && (
                              <div style={{ color: '#64748b', fontSize: '0.74rem' }}>
                                {c.email}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Location */}
                        <td>
                          <div>
                            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.88rem' }}>
                              📍 {c.quartier || 'Lomé'} {c.ville ? `(${c.ville})` : ''}
                            </div>
                            <div style={{ color: '#4ade80', fontSize: '0.76rem', marginTop: '0.15rem' }}>
                              Retrait : {c.boutique_preferee || 'Boutique Tokoin Wuiti'}
                            </div>
                          </div>
                        </td>

                        {/* Orders & Total Spent */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 800, color: '#ffd000', fontSize: '0.92rem' }}>
                              {(c.total_depense || 0).toLocaleString('fr-FR')} FCFA
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.15rem' }}>
                              {c.total_commandes || (c.dernieres_commandes ? c.dernieres_commandes.length : 0)} commande(s)
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: c.est_actif ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: c.est_actif ? '#4ade80' : '#f87171',
                            border: `1px solid ${c.est_actif ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: c.est_actif ? '#22c55e' : '#ef4444'
                            }} />
                            {c.est_actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                            {/* Voir commandes */}
                            <button
                              type="button"
                              onClick={() => handleViewClientOrders(c)}
                              title="Consulter l'historique des commandes de ce client"
                              style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              📦
                            </button>

                            {/* Modifier */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditClientModal(c)}
                              title="Modifier la fiche client"
                              style={{
                                background: 'rgba(0, 122, 61, 0.2)',
                                border: '1px solid rgba(0, 122, 61, 0.4)',
                                color: '#4ade80',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              ✏️
                            </button>

                            {/* Toggle Actif/Inactif */}
                            <button
                              type="button"
                              onClick={() => handleToggleClientStatus(c)}
                              title={c.est_actif ? "Désactiver le compte" : "Réactiver le compte"}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: c.est_actif ? '#f59e0b' : '#22c55e',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700
                              }}
                            >
                              {c.est_actif ? 'Désactiver' : 'Activer'}
                            </button>

                            {/* Supprimer */}
                            <button
                              type="button"
                              onClick={() => handleDeleteClient(c)}
                              title="Supprimer définitivement"
                              style={{
                                background: 'rgba(217, 4, 41, 0.15)',
                                border: '1px solid rgba(217, 4, 41, 0.3)',
                                color: '#ff6b6b',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </>


      {/* =========================================================
          MODAL CRÉATION / MODIFICATION CLIENT WEB
          ========================================================= */}
      {showClientModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #092815 0%, #03140a 100%)',
            border: '1.5px solid rgba(255, 208, 0, 0.4)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>👥</span>
                <div>
                  <h3 style={{ color: '#ffd000', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    {isEditingClient ? "Modifier le Client" : "Nouveau Client Heistal"}
                  </h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    Fiche client pour suivi des commandes et fidélité
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field">
                <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                  Nom complet ou Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Koffi Mensah ou Restaurant Le Gourmet"
                  value={clientFormData.nom_complet}
                  onChange={(e) => setClientFormData({ ...clientFormData, nom_complet: e.target.value })}
                  style={{ background: '#092815', border: '1.5px solid #007a3d', color: '#ffffff', padding: '0.75rem 1rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Téléphone Principal (TMoney/Flooz) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+228 90 12 34 56"
                    value={clientFormData.telephone}
                    onChange={(e) => setClientFormData({ ...clientFormData, telephone: e.target.value })}
                    style={{ background: '#092815', border: '1.5px solid #007a3d', color: '#ffffff', padding: '0.75rem 1rem' }}
                  />
                </div>

                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Téléphone Secondaire / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+228 96 11 22 33"
                    value={clientFormData.telephone_secondaire}
                    onChange={(e) => setClientFormData({ ...clientFormData, telephone_secondaire: e.target.value })}
                    style={{ background: '#092815', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.75rem 1rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Type de Client *
                  </label>
                  <select
                    value={clientFormData.type_client}
                    onChange={(e) => setClientFormData({ ...clientFormData, type_client: e.target.value })}
                    style={{ background: '#092815', border: '1.5px solid #007a3d', color: '#ffffff', padding: '0.75rem 1rem', fontWeight: 700 }}
                  >
                    <option value="PARTICULIER">Particulier / Foyer</option>
                    <option value="RESTAURANT">Restaurant / Maquis</option>
                    <option value="HOTEL">Hôtel / Complexe</option>
                    <option value="GROSSISTE">Grossiste / Revendeur B2B</option>
                  </select>
                </div>

                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Boutique Favorite de Retrait
                  </label>
                  <select
                    value={clientFormData.boutique_preferee}
                    onChange={(e) => setClientFormData({ ...clientFormData, boutique_preferee: e.target.value })}
                    style={{ background: '#092815', border: '1.5px solid #007a3d', color: '#ffffff', padding: '0.75rem 1rem' }}
                  >
                    {availableBoutiques.map(b => (
                      <option key={b.id || b.nom} value={b.nom}>{b.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Quartier à Lomé
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tokoin Wuiti, Adidogomé..."
                    value={clientFormData.quartier}
                    onChange={(e) => setClientFormData({ ...clientFormData, quartier: e.target.value })}
                    style={{ background: '#092815', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.75rem 1rem' }}
                  />
                </div>

                <div className="form-field">
                  <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                    Adresse Email (Optionnel)
                  </label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                    style={{ background: '#092815', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.75rem 1rem' }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                  Mot de passe de l'espace client
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={isEditingClient ? 'Laisser vide pour ne pas changer' : 'Facultatif : 8 caractères minimum'}
                  value={clientFormData.mot_de_passe}
                  onChange={(e) => setClientFormData({ ...clientFormData, mot_de_passe: e.target.value })}
                  style={{ background: '#092815', border: '1px solid rgba(255,255,255,0.15)', color: '#ffd000', fontWeight: 700, padding: '0.75rem 1rem' }}
                />
              </div>

              <div className="form-field">
                <label style={{ fontWeight: 800, color: '#f8fafc' }}>
                  Notes ou Préférences Client
                </label>
                <textarea
                  rows="2"
                  placeholder="Ex: Habitué du carton de poulet, préfère être contacté par WhatsApp..."
                  value={clientFormData.notes}
                  onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                  style={{ background: '#092815', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="btn btn-outline"
                  style={{ background: 'transparent', color: '#cbd5e1' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#007a3d', fontWeight: 800, padding: '0.75rem 1.6rem' }}
                >
                  {isEditingClient ? "Enregistrer les modifications" : "Créer le client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL COMMANDES DU CLIENT
          ========================================================= */}
      {selectedClientOrders && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #092815 0%, #03140a 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>📦</span>
                <div>
                  <h3 style={{ color: '#38bdf8', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    Historique des Commandes
                  </h3>
                  <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 700 }}>
                    Client : {selectedClientOrders.client?.nom_complet} ({selectedClientOrders.client?.telephone})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientOrders(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {clientOrdersLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                Chargement des commandes...
              </div>
            ) : selectedClientOrders.orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>Aucune commande pour le moment</div>
                <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Ce client n'a pas encore validé de commande en ligne ou au comptoir.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedClientOrders.orders.map((cmd) => (
                  <div
                    key={cmd.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#ffd000', fontWeight: 800, fontSize: '0.95rem' }}>
                          {cmd.numero_commande}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                          {new Date(cmd.date_commande).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: cmd.statut === 'RECUPEREE' ? 'rgba(34, 197, 94, 0.15)' : cmd.statut === 'PRETE' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(234, 88, 12, 0.15)',
                        color: cmd.statut === 'RECUPEREE' ? '#4ade80' : cmd.statut === 'PRETE' ? '#38bdf8' : '#fb923c',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {cmd.statut}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: '#cbd5e1' }}>
                        🏪 Retrait : <strong>{cmd.boutique_retrait}</strong>
                      </span>
                      <span style={{ color: '#ffd000', fontWeight: 900, fontSize: '1.05rem' }}>
                        {(cmd.total || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {cmd.items && cmd.items.length > 0 && (
                      <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Articles : {cmd.items.map(it => `${it.quantite}x ${it.nom_produit}`).join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedClientOrders(null)}
                className="btn btn-outline"
                style={{ background: 'transparent', color: '#cbd5e1' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
