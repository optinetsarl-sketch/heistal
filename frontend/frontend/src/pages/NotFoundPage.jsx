import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0f19',
      color: '#f8fafc',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '6rem',
        fontWeight: 900,
        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1,
        marginBottom: '1rem'
      }}>
        404
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        Page non trouvée
      </h1>

      <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '2rem', fontSize: '1.05rem' }}>
        Désolé, l'adresse demandée n'existe pas ou a été déplacée sur La Boutique Heistal.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link 
          to="/" 
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.5rem', textDecoration: 'none' }}
        >
          🏠 Retour à la page d'accueil
        </Link>
        <a 
          href="https://wa.me/22896373842" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', background: '#007a3d', borderColor: '#007a3d', color: '#ffffff', fontWeight: 700 }}
        >
          💬 Contacter le Support WhatsApp
        </a>
      </div>
    </div>
  );
}
