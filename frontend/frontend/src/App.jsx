import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import IndexPage from './pages/index/IndexPage';
import AboutPage from './pages/about/AboutPage';
import FamillesPage from './pages/familles/FamillesPage';
import LoginPage from './pages/auth/LoginPage';
import { AdminClients, AdminLayout, AdminDashboard, AdminMovements, AdminPOS, AdminProducts, AdminOrders, AdminSalesSpaces, AdminUsers, AdminStores, AdminSettings } from './pages/admin';
import CommanderPage from './pages/commande/CommanderPage';
import MesCommandesPage from './pages/commande/MesCommandesPage';
import NotFoundPage from './pages/NotFoundPage';
import { useCompterVisites } from './compteurVisites';

function App() {
  useCompterVisites();

  return (
    <div className="app-container">
      {/* Configuration des routes principales et de l'administration */}
      <Routes>
        {/* Page Principale / Vitrine E-commerce Heistal Togo */}
        <Route path="/" element={<IndexPage />} />
        <Route path="/index" element={<IndexPage />} />

        {/* Page Dédiée des Familles de Produits & Contenance */}
        <Route path="/familles" element={<FamillesPage />} />
        <Route path="/famille/:code" element={<FamillesPage />} />
        <Route path="/familles-produits" element={<FamillesPage />} />

        {/* Commander (avec ou sans compte) et retrouver ses commandes par leur code */}
        <Route path="/commander" element={<CommanderPage />} />
        <Route path="/panier" element={<Navigate to="/commander" replace />} />
        <Route path="/mes-commandes" element={<MesCommandesPage />} />
        <Route path="/mes-commandes/:code" element={<MesCommandesPage />} />

        {/* Page À Propos */}
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Page de Connexion / Authentification */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Espace Administration */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="pos" element={<AdminSalesSpaces />} />
          <Route path="pos/:boutiqueId" element={<AdminPOS />} />
          <Route path="ventes" element={<Navigate to="/admin/pos" replace />} />
          <Route path="products/*" element={<AdminProducts />} />
          <Route path="produits/*" element={<Navigate to="/admin/products" replace />} />
          <Route path="commandes" element={<AdminOrders />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="boutiques" element={<AdminStores />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="mouvements" element={<AdminMovements />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>


        {/* Page 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
