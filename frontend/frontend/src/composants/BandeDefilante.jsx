import React, { useCallback, useEffect, useRef, useState } from 'react';
import './bandeDefilante.css';

// Une rangée de boutons qui défile de côté. Quand des boutons sont cachés, une flèche le montre
// (à droite, et à gauche une fois qu'on a avancé) ; la toucher fait défiler la rangée.
export default function BandeDefilante({ className = '', ton = 'clair', children, ...reste }) {
  const rangee = useRef(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });

  const mesurer = useCallback(() => {
    const element = rangee.current;
    if (!element) return;
    const gauche = element.scrollLeft > 4;
    const droite = element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
    setBords((actuels) => (actuels.gauche === gauche && actuels.droite === droite ? actuels : { gauche, droite }));
  }, []);

  useEffect(() => {
    const element = rangee.current;
    mesurer();
    element.addEventListener('scroll', mesurer, { passive: true });
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    // Les boutons peuvent arriver après le chargement (familles reçues du serveur).
    const mutations = new MutationObserver(mesurer);
    mutations.observe(element, { childList: true, subtree: true, characterData: true });
    return () => {
      element.removeEventListener('scroll', mesurer);
      observateur.disconnect();
      mutations.disconnect();
    };
  }, [mesurer]);

  const defiler = (sens) => {
    const element = rangee.current;
    element.scrollBy({ left: sens * Math.max(120, element.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div className={`bd-cadre bd-${ton} ${bords.gauche ? 'bd-cache-a-gauche' : ''} ${bords.droite ? 'bd-cache-a-droite' : ''}`}>
      {/* Les flèches aident au doigt et à la souris ; au clavier, chaque bouton défile déjà jusqu'à lui. */}
      {bords.gauche && (
        <button type="button" className="bd-fleche bd-fleche-gauche" onClick={() => defiler(-1)} tabIndex={-1} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}
      <div ref={rangee} className={className} {...reste}>{children}</div>
      {bords.droite && (
        <button type="button" className="bd-fleche bd-fleche-droite" onClick={() => defiler(1)} tabIndex={-1} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}
    </div>
  );
}
