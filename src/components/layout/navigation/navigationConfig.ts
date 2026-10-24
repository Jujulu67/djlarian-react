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
  icon: LucideIcon;
}

/** Liens de navigation principaux. Le lien Shop est masqué si désactivé (sauf admin). */
export function getNavLinks(shopEnabled: boolean, isAdmin: boolean): NavLink[] {
  return [
    { href: '/', label: 'Home', icon: Home },
    { href: '/music', label: 'Music', icon: Music },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/live', label: 'Live', icon: Radio },
    { href: '/gallery', label: 'Gallery', icon: ImageIcon },
    // Only show Shop if enabled OR user is admin
    ...(shopEnabled || isAdmin ? [{ href: '/shop', label: 'Shop', icon: ShoppingBag }] : []),
    { href: '/contact', label: 'Contact', icon: Mail },
  ];
}
