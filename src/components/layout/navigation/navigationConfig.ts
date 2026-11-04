import {
  Music,
  Calendar,
  ImageIcon,
  Mail,
  Home,
  Radio,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  /** Libellé français utilisé par l'UI v3 (le legacy et la v2 gardent `label`) */
  labelFr?: string;
  icon: LucideIcon;
}

/** Liens de navigation principaux. Le lien Shop est masqué si désactivé (sauf admin). */
export function getNavLinks(shopEnabled: boolean, isAdmin: boolean): NavLink[] {
  return [
    { href: '/', label: 'Home', labelFr: 'Accueil', icon: Home },
    { href: '/music', label: 'Music', labelFr: 'Musique', icon: Music },
    { href: '/events', label: 'Events', labelFr: 'Dates', icon: Calendar },
    { href: '/live', label: 'Live', icon: Radio },
    { href: '/gallery', label: 'Gallery', labelFr: 'Galerie', icon: ImageIcon },
    // Only show Shop if enabled OR user is admin
    ...(shopEnabled || isAdmin
      ? [{ href: '/shop', label: 'Shop', labelFr: 'Boutique', icon: ShoppingBag }]
      : []),
    { href: '/contact', label: 'Contact', icon: Mail },
  ];
}
