const PHOTO_COTE_MAX = 1600;

function chargerImage(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    image.src = url;
  });
}

// Une photo de téléphone pèse plusieurs Mo. La réduire ici accélère l'envoi sur réseau mobile,
// reste sous la limite du serveur et retire les métadonnées de la photo, position GPS comprise.
export async function preparerPhoto(fichier) {
  const image = await chargerImage(fichier);
  const echelle = Math.min(1, PHOTO_COTE_MAX / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * echelle);
  canvas.height = Math.round(image.naturalHeight * echelle);

  const contexte = canvas.getContext('2d');
  contexte.fillStyle = '#ffffff';
  contexte.fillRect(0, 0, canvas.width, canvas.height);
  contexte.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Conversion impossible');
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}
