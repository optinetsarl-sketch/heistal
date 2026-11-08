import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './aboutPage.css';

export default function AboutPage() {
  useEffect(() => {
    document.title = "À Propos de La Boutique Heistal Togo | Leader des Surgelés de Qualité à Lomé";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="about-page-wrapper">
      {/* 1. Bandeau supérieur officiel */}
      <div className="about-topbar">
        <div className="about-topbar-inner">
          <div className="about-topbar-left">
            <span>Direct Entrepôt Lomé • Particuliers & Professionnels</span>
            <span style={{ color: '#ffd000' }}>•</span>
            <span>Froid Constant Garanti -18°C</span>
          </div>
          <div className="about-topbar-right">
            <span>Ouvert du Lundi au Samedi dès 07h30</span>
            <a 
              href="https://wa.me/22896373842" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="about-topbar-link"
            >
              Service Client WhatsApp : (+228) 96 37 38 42
            </a>
          </div>
        </div>
      </div>

      {/* 2. En-tête officiel de navigation */}
      <header className="about-header">
        <div className="about-header-inner">
          {/* Logo officiel enseigne */}
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

          {/* Liens de navigation */}
          <nav className="about-nav-links" aria-label="Navigation principale">
            <Link to="/" className="about-nav-btn">
              Accueil
            </Link>
            <Link to="/#catalogue" className="about-nav-btn">
              Catalogue & Rayons
            </Link>
            <Link to="/#offres" className="about-nav-btn">
              Offres Flash
            </Link>
            <Link to="/#b2b" className="about-nav-btn">
              Tarifs Grossistes B2B
            </Link>
            <Link to="/#magasin" className="about-nav-btn">
              Nos Magasins
            </Link>
            <Link to="/a-propos" className="about-nav-btn active">
              À Propos
            </Link>
          </nav>

          {/* Bouton CTA Action */}
          <Link to="/#catalogue" className="about-header-cta">
            Commander en Ligne →
          </Link>
        </div>
      </header>

      {/* 3. Hero Section - Histoire & Vocation */}
      <section className="about-hero">
        <div className="about-hero-container">
          <div>
            <div className="about-hero-tag">
              Notre Histoire & Savoir-Faire
            </div>
            <h1 className="about-hero-title">
              L'Excellence du Froid et la Fraîcheur des Surgelés à Lomé depuis <span>plus de 20 Ans</span>.
            </h1>
            <p className="about-hero-lead">
              Fondée avec la volonté de démocratiser l'accès à des protéines saines, 
              sûres et certifiées, <strong>La Boutique Heistal</strong> s'est imposée 
              comme le premier comptoir d'importation et de distribution de produits de mer, 
              volailles halal, viandes bovines et légumes surgelés au Togo.
            </p>

            <div className="about-hero-badges">
              <span className="about-pill-badge">Froid Strict -18°C Continu</span>
              <span className="about-pill-badge">Volailles & Viandes 100% Halal</span>
              <span className="about-pill-badge">Importation Directe Agréée</span>
              <span className="about-pill-badge">Comptoirs Tokoin & Adidogomé</span>
            </div>

            <div className="about-hero-actions">
              <Link to="/#catalogue" className="about-btn-primary">
                Découvrir nos Produits Frais
              </Link>
              <a href="#engagement" className="about-btn-secondary">
                Nos Engagements Qualité ↓
              </a>
            </div>
          </div>

          {/* Carte visuelle Showcase */}
          <div className="about-hero-card">
            <img 
              src="/heistal_hero_banner.jpg" 
              alt="Comptoir La Boutique Heistal Lomé" 
              className="about-hero-img"
            />
            <div className="about-hero-card-glass">
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                Comptoirs Tokoin Wuiti & Adidogomé
              </div>
              <div style={{ fontSize: '0.82rem', color: '#ffd000', fontWeight: 600 }}>
                Arrivages maritimes continus • Particuliers, Restaurants & Hôtels
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Barre de Chiffres Clés */}
      <section className="about-stats-bar" aria-label="Chiffres clés Heistal">
        <div className="about-stats-grid">
          <div className="about-stat-item">
            <div className="about-stat-number">20<span>+</span></div>
            <div className="about-stat-label">Années d'Expertise</div>
            <div className="about-stat-sub">Au service des familles togolaises et des professionnels de la restauration.</div>
          </div>

          <div className="about-stat-item">
            <div className="about-stat-number">500<span>T</span></div>
            <div className="about-stat-label">Capacité Frigorifique</div>
            <div className="about-stat-sub">Stockage négatif moderne régulé selon les standards sanitaires stricts.</div>
          </div>

          <div className="about-stat-item">
            <div className="about-stat-number">15<span>k+</span></div>
            <div className="about-stat-label">Clients Satisfaits</div>
            <div className="about-stat-sub">Foyers, cantines, hôtels étoilés et maquis partenaires fidèles à Lomé.</div>
          </div>

          <div className="about-stat-item">
            <div className="about-stat-number">-18<span>°C</span></div>
            <div className="about-stat-label">Froid Continu Garanti</div>
            <div className="about-stat-sub">Surveillance thermique informatisée 24h/24 sans rupture de température.</div>
          </div>
        </div>
      </section>

      {/* 5. Présentation & Maîtrise de la Chaîne du Froid */}
      <section id="engagement" className="about-section">
        <div className="about-section-header">
          <span className="about-section-tag">Notre Mission</span>
          <h2 className="about-section-title">
            Nourrir Lomé avec des Produits Sains, Abordables et d'une Fraîcheur Absolue
          </h2>
          <p className="about-section-lead">
            Au Togo, la conservation des aliments est un défi sanitaire majeur. Chez La Boutique Heistal, 
            nous avons fait du respect absolu de la chaîne du froid notre exigence première pour préserver 
            toutes les qualités nutritionnelles et gustatives de chaque aliment.
          </p>
        </div>

        <div className="about-story-grid">
          <div className="about-story-text">
            <h3>Une Traçabilité Rigoureuse de l'Origine à Votre Assiette</h3>
            <p>
              Tous nos produits proviennent de partenaires maritimes et d'élevages rigoureusement sélectionnés 
              dans les meilleures zones de pêche et de production au monde. Dès le port autonome de Lomé, 
              nos marchandises sont acheminées sous température dirigée vers nos entrepôts centraux.
            </p>
            <p>
              Chaque lot fait l'objet d'un contrôle vétérinaire certifié à l'arrivée. Nos équipements de découpe 
              et de conditionnement répondent aux normes d'hygiène les plus strictes pour vous garantir 
              des viandes tendres et des poissons d'une netteté parfaite.
            </p>

            <div className="about-story-highlights">
              <div className="about-highlight-box">
                <div className="about-highlight-title">Groupes Électrogènes Relais</div>
                <div className="about-highlight-desc">Alimentation électrique sécurisée 24/7 pour un froid sans fluctuation.</div>
              </div>
              <div className="about-highlight-box">
                <div className="about-highlight-title">Certification Halal Vérifiée</div>
                <div className="about-highlight-desc">Attestations conformes pour chaque arrivage de volailles et viandes.</div>
              </div>
            </div>
          </div>

          <div className="about-story-visual">
            <img 
              src="/heistal_fish.jpg" 
              alt="Sélection de poissons frais La Boutique Heistal" 
            />
            <div className="about-story-badge">
              Contrôlé & Garanti -18°C
            </div>
          </div>
        </div>
      </section>

      {/* 6. Les 4 Piliers Fondateurs */}
      <section className="about-pillars-container">
        <div className="about-section-header" style={{ marginBottom: '3rem' }}>
          <span className="about-section-tag">Nos Engagements</span>
          <h2 className="about-section-title">
            Les 4 Piliers qui Forgent la Confiance de nos Clients
          </h2>
        </div>

        <div className="about-pillars-grid">
          <div className="about-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#0284c7' }} />
            <h3 className="about-pillar-title">Froid Ininterrompu</h3>
            <p className="about-pillar-desc">
              Chambres frigorifiques modernes et véhicules isothermes régulés pour éviter tout dégel intermédiaire.
            </p>
          </div>

          <div className="about-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#16a34a' }} />
            <h3 className="about-pillar-title">100% Halal Garanti</h3>
            <p className="about-pillar-desc">
              Toutes nos volailles et pièces de boucherie sont découpées et certifiées halal selon les préceptes reconnus.
            </p>
          </div>

          <div className="about-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#ea580c' }} />
            <h3 className="about-pillar-title">Tarifs Équitables</h3>
            <p className="about-pillar-desc">
              Suppression des intermédiaires superflus pour offrir des prix grossistes accessibles au détail et par carton.
            </p>
          </div>

          <div className="about-pillar-card">
            <div className="pillar-accent-bar" style={{ background: '#f59e0b' }} />
            <h3 className="about-pillar-title">Livraison Lomé Express</h3>
            <p className="about-pillar-desc">
              Acheminement frigorifique soigné de vos commandes à domicile, en cuisine de restaurant ou en point relais.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Les Grandes Familles de Produits */}
      <section className="about-section">
        <div className="about-section-header">
          <span className="about-section-tag">Notre Gamme</span>
          <h2 className="about-section-title">
            La Grande Famille des Produits Heistal
          </h2>
          <p className="about-section-lead">
            Découvrez une sélection variée répondant à tous les besoins culinaires du quotidien 
            comme aux exigences des grands banquets et réceptions.
          </p>
        </div>

        <div className="about-families-grid">
          <div className="about-family-card">
            <div className="about-family-img-wrap">
              <img src="/heistal_fish.jpg" alt="Poissons et Fruits de mer Heistal" />
              <span className="about-family-badge">45 Références</span>
            </div>
            <div className="about-family-body">
              <h3 className="about-family-title">Poissons & Crustacés</h3>
              <p className="about-family-desc">
                Capitaine, Tilapia écaillé, Saumon sauvage, Crevettes géantes Jumbo et calamars entiers.
              </p>
              <div className="about-family-meta">
                <span>Pêche Atlantique</span>
                <span>Frais Surgelé</span>
              </div>
            </div>
          </div>

          <div className="about-family-card">
            <div className="about-family-img-wrap">
              <img src="/heistal_poultry.jpg" alt="Volailles Halal Découpées" />
              <span className="about-family-badge">32 Références</span>
            </div>
            <div className="about-family-body">
              <h3 className="about-family-title">Volailles Découpées Halal</h3>
              <p className="about-family-desc">
                Poulets entiers charnus, cuisses, pilons calibrés, ailerons et gésiers pour braisés savoureux.
              </p>
              <div className="about-family-meta">
                <span>100% Halal</span>
                <span>Prêt à braiser</span>
              </div>
            </div>
          </div>

          <div className="about-family-card">
            <div className="about-family-img-wrap">
              <img src="/heistal_meat.jpg" alt="Boucherie & Viandes Surgelées" />
              <span className="about-family-badge">24 Références</span>
            </div>
            <div className="about-family-body">
              <h3 className="about-family-title">Boucherie & Viandes</h3>
              <p className="about-family-desc">
                Bœuf désossé de premier choix, côtelettes tendres, jarret pour sauces togolaises et abats nettoyés.
              </p>
              <div className="about-family-meta">
                <span>Découpe Façon Bouchère</span>
                <span>Sous vide</span>
              </div>
            </div>
          </div>

          <div className="about-family-card">
            <div className="about-family-img-wrap">
              <img src="/heistal_fries.jpg" alt="Frites Belges & Légumes" />
              <span className="about-family-badge">28 Références</span>
            </div>
            <div className="about-family-body">
              <h3 className="about-family-title">Frites Belges & Légumes</h3>
              <p className="about-family-desc">
                Frites belges croustillantes 9x9, petits pois extra-fins, haricots verts et macédoine sélectionnée.
              </p>
              <div className="about-family-meta">
                <span>Qualité Restauration</span>
                <span>Cuisson Rapide</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Frise Chronologique / Évolution */}
      <section className="about-timeline-section">
        <div className="about-section-header">
          <span className="about-section-tag">Notre Parcours</span>
          <h2 className="about-section-title">
            20 Ans de Croissance et d'Innovations au Togo
          </h2>
        </div>

        <div className="about-timeline-grid">
          <div className="about-timeline-node">
            <div className="about-timeline-card">
              <span className="about-timeline-year">2004</span>
              <h3 className="about-timeline-title">Ouverture du 1er Comptoir</h3>
              <p className="about-timeline-text">
                Inauguration du point de vente historique à Tokoin Wuiti pour offrir aux ménages des poissons et poulets de qualité supérieure.
              </p>
            </div>
            <div className="about-timeline-circle">01</div>
          </div>

          <div className="about-timeline-node">
            <div className="about-timeline-card">
              <span className="about-timeline-year">2012</span>
              <h3 className="about-timeline-title">Hub Frigorifique Industriel</h3>
              <p className="about-timeline-text">
                Installation de nos premières chambres froides industrielles haute capacité avec contrôle thermique informatisé.
              </p>
            </div>
            <div className="about-timeline-circle">02</div>
          </div>

          <div className="about-timeline-node">
            <div className="about-timeline-card">
              <span className="about-timeline-year">2018</span>
              <h3 className="about-timeline-title">Comptoir Adidogomé & Espace B2B</h3>
              <p className="about-timeline-text">
                Extension de notre réseau vers l'ouest de Lomé et création de la division dédiée aux hôtels, restaurants et traiteurs.
              </p>
            </div>
            <div className="about-timeline-circle">03</div>
          </div>

          <div className="about-timeline-node">
            <div className="about-timeline-card">
              <span className="about-timeline-year">Aujourd'hui</span>
              <h3 className="about-timeline-title">Commande en Ligne & Livraison Frigo</h3>
              <p className="about-timeline-text">
                Lancement de notre plateforme digitale moderne pour commander en direct et se faire livrer en toute sérénité à Lomé.
              </p>
            </div>
            <div className="about-timeline-circle">04</div>
          </div>
        </div>
      </section>

      {/* 9. Nos Boutiques à Lomé */}
      <section className="about-section">
        <div className="about-section-header">
          <span className="about-section-tag">Venez Nous Rencontrer</span>
          <h2 className="about-section-title">
            Nos Deux Points de Vente à Lomé
          </h2>
          <p className="about-section-lead">
            Nos équipes vous accueillent avec le sourire et vous conseillent sur les meilleures découpes pour vos repas et réceptions.
          </p>
        </div>

        <div className="about-locations-grid">
          <div className="about-location-card">
            <div className="about-location-header">
              <div>
                <h3 className="about-location-name">Magasin Central Tokoin Wuiti</h3>
                <div className="about-location-sub">Quartier Tokoin Wuiti, Grand Lomé</div>
              </div>
            </div>
            <ul className="about-location-info-list">
              <li>
                <strong>Adresse :</strong> Boulevard Léopold Sédar Senghor (à côté du CEG Tokoin Wuiti)
              </li>
              <li>
                <strong>Horaires :</strong> Lun - Ven : 07h30 - 12h30 & 14h30 - 17h30 | Sam : 07h30 - 13h30
              </li>
              <li>
                <strong>Services :</strong> Vente au détail, commandes en gros au carton, comptoir réfrigéré moderne
              </li>
              <li>
                <strong>Téléphone :</strong> (+228) 22 26 42 29 / (+228) 96 37 38 42
              </li>
            </ul>
          </div>

          <div className="about-location-card" style={{ borderColor: '#ffd000' }}>
            <div className="about-location-header">
              <div>
                <h3 className="about-location-name">Boutique Heistal Adidogomé</h3>
                <div className="about-location-sub">Quartier Adidogomé, Grand Lomé</div>
              </div>
            </div>
            <ul className="about-location-info-list">
              <li>
                <strong>Adresse :</strong> Quartier Adidogomé, Carrefour principal, Lomé
              </li>
              <li>
                <strong>Horaires :</strong> Lun - Ven : 07h30 - 12h30 & 14h30 - 17h30 | Sam : 07h30 - 13h30
              </li>
              <li>
                <strong>Services :</strong> Retrait express de commandes en ligne, vente au détail & demi-gros
              </li>
              <li>
                <strong>Téléphone :</strong> (+228) 96 37 38 42
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 10. Bannière d'Appel à l'Action (CTA) */}
      <section className="about-cta-section">
        <div className="about-cta-inner">
          <h2 className="about-cta-title">
            Prêt à Découvrir la Fraîcheur <span>La Boutique Heistal</span> ?
          </h2>
          <p className="about-cta-text">
            Parcourez notre catalogue complet en ligne, composez votre panier en quelques clics 
            et profitez de notre service de livraison frigorifique express partout à Lomé.
          </p>
          <div className="about-cta-buttons">
            <Link to="/#catalogue" className="about-btn-primary" style={{ padding: '0.95rem 2rem', fontSize: '1rem' }}>
              Consulter le Catalogue Complet →
            </Link>
            <a 
              href="https://wa.me/22896373842" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="about-btn-secondary"
              style={{ padding: '0.95rem 1.85rem', fontSize: '1rem' }}
            >
              Discuter sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* 11. Footer Officiel Heistal */}
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
                <li><Link to="/#catalogue">Poissons & Crustacés d'Atlantique</Link></li>
                <li><Link to="/#catalogue">Volailles Entières & Cuisses Halal</Link></li>
                <li><Link to="/#catalogue">Bœuf & Agneau Façon Bouchère</Link></li>
                <li><Link to="/#catalogue">Frites Belges & Légumes Croquants</Link></li>
                <li><Link to="/a-propos">À Propos de La Boutique Heistal</Link></li>
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
                <li><Link to="/#b2b">Espace Restauration & Hôtellerie</Link></li>
                <li><Link to="/#b2b">Commandes en Gros par Cartons</Link></li>
                <li><Link to="/#catalogue">Chaîne du Froid -18°C Garantie</Link></li>
                <li><Link to="/#magasin">Retrait Express en Magasin</Link></li>
                <li><Link to="/a-propos">Notre Histoire & Nos Engagements</Link></li>
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
