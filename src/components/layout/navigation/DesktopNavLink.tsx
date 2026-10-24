import Link from 'next/link';
import type { NavLink } from './navigationConfig';

interface DesktopNavLinkProps {
  link: NavLink;
  isActive: boolean;
}

export function DesktopNavLink({ link, isActive }: DesktopNavLinkProps) {
  return (
    <Link
      key={link.href}
      href={link.href}
      className="text-white/90 hover:text-white transition-all duration-300 flex items-center gap-1.5 xl:gap-2 hover:scale-105 group relative px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg focus:outline-none text-sm xl:text-base"
    >
      {/* Glassmorphism overlay on focus/active - iOS style with improved texture */}
      <span
        className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none overflow-hidden ${
          isActive
            ? 'opacity-100'
            : 'opacity-0 group-focus-within:opacity-100 focus-within:opacity-100'
        }`}
        style={{
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          backgroundImage: isActive
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.08) 75%, rgba(255, 255, 255, 0.18) 100%)'
            : 'none',
          backgroundSize: isActive ? '300% 300%' : 'auto',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          boxShadow: isActive
            ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
            : 'none',
          animation: isActive ? 'veil-shift 6s ease-in-out infinite' : 'none',
        }}
      >
        {/* Animated texture overlay for visible movement */}
        <span
          className={`absolute inset-0 transition-opacity duration-200 ${
            isActive ? 'opacity-40' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `
            radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.12) 0%, transparent 40%),
            linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)
          `,
            backgroundSize: '150% 150%, 150% 150%, 250% 250%',
            mixBlendMode: 'overlay',
            animation: isActive ? 'veil-shift 8s ease-in-out infinite reverse' : 'none',
          }}
        />
      </span>

      {link.icon && (
        <link.icon
          size={18}
          className={`relative z-10 transition-all duration-300 ${
            isActive
              ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
              : 'group-hover:text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]'
          }`}
        />
      )}
      <span className="relative z-10">
        {link.label}
        <span
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${
            isActive ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        />
      </span>
    </Link>
  );
}
