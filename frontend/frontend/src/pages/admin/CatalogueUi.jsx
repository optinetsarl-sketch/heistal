import React, { useEffect, useRef, useState } from 'react';
import { getImageUrl } from '../../api';

export function MessageErreur({ children }) {
  if (!children) return null;
  return <p className="pf-error" role="alert">{children}</p>;
}

// Une image, ou l'icône prévue si elle n'existe pas ou que le fichier est introuvable.
export function Vignette({ image, icone, className }) {
  const [imageEnPanne, setImageEnPanne] = useState(null);
  if (!image || image === imageEnPanne) {
    return <span className={`${className} vignette-icone`} aria-hidden="true">{icone || '📦'}</span>;
  }
  return <img className={className} src={getImageUrl(image)} alt="" loading="lazy" onError={() => setImageEnPanne(image)} />;
}

// Fenêtre native du navigateur : elle garde le clavier à l'intérieur et se ferme avec Échap.
// Toucher à côté ne la ferme pas, pour ne pas perdre une saisie sur un téléphone.
export function Fenetre({ titre, sousTitre, onFermer, children }) {
  const dialogue = useRef(null);

  useEffect(() => {
    const element = dialogue.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialogue}
      className="pr-dialog"
      aria-label={titre}
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
    >
      <header className="pr-dialog-head">
        <div>
          <h2 className="pr-dialog-title">{titre}</h2>
          {sousTitre && <p className="pr-dialog-subtitle">{sousTitre}</p>}
        </div>
        <button type="button" className="pr-dialog-close" onClick={onFermer} aria-label="Fermer">✕</button>
      </header>
      {children}
    </dialog>
  );
}
