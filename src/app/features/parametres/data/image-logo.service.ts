import { Injectable } from '@angular/core';

/** Côté le plus long d'un logo ré-encodé, en pixels. */
export const LOGO_DIMENSION_MAX = 512;

/**
 * Ré-encode le logo dans le navigateur avant l'envoi (audit S2.3) : retire les métadonnées (EXIF, position GPS) d'une
 * photo publiée dans un bucket public, rejette un fichier qui n'est pas une vraie image et réduit sa taille.
 * WebP si le navigateur sait l'encoder, sinon PNG (transparence conservée dans les deux cas).
 */
@Injectable({ providedIn: 'root' })
export class ImageLogoService {
    /** Lève une erreur si le fichier n'est pas une image lisible. */
    async reencoder(fichier: Blob): Promise<Blob> {
        const image = await createImageBitmap(fichier);
        try {
            const echelle = Math.min(1, LOGO_DIMENSION_MAX / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * echelle));
            canvas.height = Math.max(1, Math.round(image.height * echelle));
            const contexte = canvas.getContext('2d');
            if (!contexte) {
                throw new Error('canvas_indisponible');
            }
            contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resoudre) => canvas.toBlob(resoudre, 'image/webp', 0.9));
            if (!blob) {
                throw new Error('encodage_impossible');
            }
            return blob;
        } finally {
            image.close();
        }
    }
}
