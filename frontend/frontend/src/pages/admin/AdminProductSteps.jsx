import React, { useState } from 'react';
import { comparerNoms, formaterNombre } from './catalogue';
import { MessageErreur, Vignette } from './CatalogueUi';

const CHIFFRES_MAX = 9;
const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'];

const garderLesChiffres = (texte) => String(texte).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, CHIFFRES_MAX);

export function EtapeFamille({ familles, choisie, onChoisir, onCreer }) {
  return (
    <>
      <div className="pf-familles">
        {[...familles].sort(comparerNoms).map((famille) => {
          const active = String(choisie) === String(famille.id);
          return (
            <button
              key={famille.id}
              type="button"
              className={`pf-famille ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => onChoisir(famille.id)}
            >
              <Vignette image={famille.image} icone={famille.icone} className="pf-famille-image" />
              <span className="pf-famille-nom">{famille.nom}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="pf-link" onClick={onCreer}>+ Créer une nouvelle famille</button>
    </>
  );
}

export function GrilleChoix({ choix, estChoisi, onChoisir }) {
  return (
    <div className="pf-tuiles">
      {choix.map(({ valeur, libelle, icone }) => (
        <button
          key={valeur}
          type="button"
          className={`pf-tuile ${estChoisi(valeur) ? 'active' : ''}`}
          aria-pressed={estChoisi(valeur)}
          onClick={() => onChoisir(valeur)}
        >
          {estChoisi(valeur) && <span className="pf-tuile-coche" aria-hidden="true">✓</span>}
          <span className="pf-tuile-icone" aria-hidden="true">{icone}</span>
          {libelle}
        </button>
      ))}
    </div>
  );
}

// Pavé à l'écran : sur téléphone, le clavier du système ne s'ouvre pas et ne cache pas les boutons.
// Sur ordinateur, on peut aussi taper les chiffres au clavier.
export function PaveNumerique({ libelle, valeur, suffixe, onChange }) {
  const texte = String(valeur);

  return (
    <div className="pf-pave">
      <div className="pf-pave-ecran">
        <input
          data-saisie
          type="text"
          inputMode="none"
          autoComplete="off"
          aria-label={libelle}
          placeholder="0"
          value={texte === '' ? '' : formaterNombre(texte)}
          onChange={(e) => onChange(garderLesChiffres(e.target.value))}
        />
        <span>{suffixe}</span>
      </div>
      <div className="pf-pave-touches">
        {TOUCHES.map((touche) => (
          <button key={touche} type="button" onClick={() => onChange(garderLesChiffres(`${texte}${touche}`))}>
            {touche}
          </button>
        ))}
        <button type="button" aria-label="Effacer le dernier chiffre" onClick={() => onChange(texte.slice(0, -1))}>⌫</button>
      </div>
    </div>
  );
}

export function EtapePhotos({ photos, photosMax, preparation, onAjouter, onRetirer }) {
  const [survol, setSurvol] = useState(false);
  const places = photosMax - photos.length;

  return (
    <>
      {places > 0 ? (
        <label
          className={`pf-dropzone ${survol ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            onAjouter(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="pf-visually-hidden"
            onChange={(e) => {
              onAjouter(e.target.files);
              e.target.value = '';
            }}
          />
          <span className="pf-dropzone-icon" aria-hidden="true">📷</span>
          <strong>{preparation ? 'Préparation des images…' : 'Choisir une image'}</strong>
          <span>{places > 1 ? `${places} images possibles` : '1 image possible'}</span>
        </label>
      ) : (
        <p className="pf-help">Vous avez atteint le maximum de {photosMax} images. Retirez-en une pour en ajouter une autre.</p>
      )}

      {photos.length > 0 && (
        <ul className="pf-photos">
          {photos.map((photo, index) => (
            <li key={photo.cle} className="pf-photo">
              <img src={photo.url} alt={`Aperçu de l'image ${index + 1}`} />
              {index === 0 && <span className="pf-photo-badge">Principale</span>}
              <button
                type="button"
                className="pf-photo-remove"
                onClick={() => onRetirer(photo)}
                aria-label={`Retirer l'image ${index + 1}`}
                title="Retirer cette image"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function LigneResume({ titre, erreur, onModifier, children }) {
  const contenu = (
    <>
      <span className="pf-resume-titre">{titre}</span>
      <span className="pf-resume-valeur">{children}</span>
      {onModifier && <span className="pf-resume-action">Modifier</span>}
    </>
  );

  return (
    <li>
      {onModifier ? (
        <button type="button" className="pf-resume-ligne" onClick={onModifier}>{contenu}</button>
      ) : (
        <div className="pf-resume-ligne">{contenu}</div>
      )}
      <MessageErreur>{erreur}</MessageErreur>
    </li>
  );
}

export function OptionsProduit({ form, erreurs, typesStock, ouvertes, onOuvrir, onModifier, onCreerTypeStock }) {
  return (
    <details className="pf-options" open={ouvertes} onToggle={(e) => onOuvrir(e.currentTarget.open)}>
      <summary>Plus d'options (description, prix de gros, alerte, référence, type de stock)</summary>
      <div className="pf-options-content">
        <div className="pf-field">
          <label htmlFor="pf-description">Description affichée sur le site</label>
          <textarea
            id="pf-description"
            rows="3"
            className="pf-input"
            placeholder="Ex : Poisson entier nettoyé, surgelé à -18°C."
            value={form.description}
            onChange={(e) => onModifier('description', e.target.value)}
          />
          <MessageErreur>{erreurs.description}</MessageErreur>
        </div>
        <div className="pf-row">
          <div className="pf-field">
            <label htmlFor="pf-prix-gros">Prix de gros par carton (FCFA)</label>
            <input
              id="pf-prix-gros"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="pf-input"
              placeholder="Facultatif"
              value={form.prix_gros}
              onChange={(e) => onModifier('prix_gros', e.target.value)}
              aria-invalid={Boolean(erreurs.prix_gros)}
            />
            <MessageErreur>{erreurs.prix_gros}</MessageErreur>
          </div>
          <div className="pf-field">
            <label htmlFor="pf-seuil">Alerte stock faible à partir de</label>
            <input
              id="pf-seuil"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="pf-input"
              value={form.seuil_alerte}
              onChange={(e) => onModifier('seuil_alerte', e.target.value)}
              aria-invalid={Boolean(erreurs.seuil_alerte)}
            />
            <MessageErreur>{erreurs.seuil_alerte}</MessageErreur>
          </div>
        </div>
        <div className="pf-field">
          <label htmlFor="pf-reference">Référence</label>
          <input
            id="pf-reference"
            type="text"
            className="pf-input"
            placeholder="Créée automatiquement si vide"
            value={form.reference}
            onChange={(e) => onModifier('reference', e.target.value)}
            aria-invalid={Boolean(erreurs.reference)}
          />
          <MessageErreur>{erreurs.reference}</MessageErreur>
        </div>
        <div className="pf-field">
          <label htmlFor="pf-type-stock">Type de stock</label>
          <select
            id="pf-type-stock"
            className="pf-input"
            value={form.type_stock}
            onChange={(e) => onModifier('type_stock', e.target.value)}
          >
            <option value="">Non précisé</option>
            {typesStock.map((type) => (
              <option key={type.id} value={type.id}>{type.nom}</option>
            ))}
          </select>
          <MessageErreur>{erreurs.type_stock}</MessageErreur>
          <button type="button" className="pf-link" onClick={onCreerTypeStock}>+ Créer un type de stock</button>
        </div>
      </div>
    </details>
  );
}
