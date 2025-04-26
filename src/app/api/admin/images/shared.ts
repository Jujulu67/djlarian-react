// Types d'images
export interface ImageMeta {
  id: string;
  url: string;
  name: string;
  size: number;
  date: string;
  type: string;
  linkedTo: null | { type: string; id: string; title: string };
  isDuplicate: boolean;
}

// Mock data
const mockImages: ImageMeta[] = [
  {
    id: 'img1',
    url: 'https://placehold.co/400x300/9042f5/ffffff?text=cover1.jpg',
    name: 'cover1.jpg',
    size: 234567,
    date: '2024-04-21T20:30:24Z',
    type: 'cover',
    linkedTo: { type: 'track', id: 'track1', title: 'Track One' },
    isDuplicate: false,
  },
  {
    id: 'img2',
    url: 'https://placehold.co/400x300/4287f5/ffffff?text=event1.jpg',
    name: 'event1.jpg',
    size: 345678,
    date: '2024-04-20T18:10:00Z',
    type: 'event',
    linkedTo: { type: 'event', id: 'event1', title: 'Event Alpha' },
    isDuplicate: true,
  },
  {
    id: 'img3',
    url: 'https://placehold.co/400x300/9042f5/ffffff?text=cover2.jpg',
    name: 'cover2.jpg',
    size: 234567,
    date: '2024-04-19T15:00:00Z',
    type: 'cover',
    linkedTo: null,
    isDuplicate: false,
  },
  {
    id: 'img4',
    url: 'https://placehold.co/400x300/4287f5/ffffff?text=event2.jpg',
    name: 'event2.jpg',
    size: 122567,
    date: '2024-04-18T14:15:00Z',
    type: 'event',
    linkedTo: { type: 'event', id: 'event2', title: 'Event Beta' },
    isDuplicate: false,
  },
  {
    id: 'img5',
    url: 'https://placehold.co/400x300/f5a742/ffffff?text=promo1.jpg',
    name: 'promo1.jpg',
    size: 345678,
    date: '2024-04-17T12:30:00Z',
    type: 'other',
    linkedTo: null,
    isDuplicate: false,
  },
];

// En-mémoire storage (remplacer par DB plus tard)
// Note: Cette mémoire est remise à zéro à chaque redéploiement ou redémarrage serveur
export let images: ImageMeta[] = [...mockImages];

// Fonction pour récupérer toutes les images
export function getAllImages(): ImageMeta[] {
  return images;
}

// Fonction pour supprimer une image
export function removeImage(id: string): boolean {
  const initialLength = images.length;
  images = images.filter((img) => img.id !== id);
  return images.length < initialLength;
}

// Fonction pour réinitialiser au mock data
export function resetImages(): void {
  images = [...mockImages];
}
