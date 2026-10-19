import React from 'react';
import { Routes, Route } from 'react-router-dom';
import IndexPage from './pages/index/IndexPage';
import { AdminLayout, AdminDashboard, AdminPOS, AdminProducts, AdminUsers, AdminSettings } from './pages/admin';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <div className="app-container">
      {/* Configuration des routes principales et de l'administration */}
      <Routes>
        {/* Page Principale / Vitrine E-commerce Heistal Togo */}
        <Route path="/" element={<IndexPage />} />
        <Route path="/index" element={<IndexPage />} />

        {/* Espace Administration */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="pos" element={<AdminPOS />} />
          <Route path="ventes" element={<AdminPOS />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="produits" element={<AdminProducts />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>


        {/* Page 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
