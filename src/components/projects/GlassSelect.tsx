'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface GlassSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface GlassSelectProps {
  value: string;
  options: GlassSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isCompact?: boolean;
  className?: string;
  disabled?: boolean;
  currentColor?: string;
}

export const GlassSelect = ({
  value,
  options,
  onChange,
  placeholder = '-',
  isCompact = false,
  className = '',
  disabled = false,
  currentColor = 'blue',
}: GlassSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ left: number; top: number } | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [badgeWidth, setBadgeWidth] = useState<number | undefined>(undefined);

  const selectedOption = options.find((opt) => opt.value === value);

  // Calculer la largeur maximale nécessaire pour tous les badges
  useEffect(() => {
    const calculateMaxWidth = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        setBadgeWidth(undefined);
        return;
      }

      // Utiliser les styles du trigger si disponible, sinon des valeurs par défaut
      const fontSize = isCompact ? '10px' : '12px';
      const fontFamily = 'system-ui, -apple-system, sans-serif';
      const fontWeight = '500';
      context.font = `${fontWeight} ${fontSize} ${fontFamily}`;

      // Trouver le label le plus large
      const maxWidth = options.reduce((max, opt) => {
        const metrics = context.measureText(opt.label || placeholder);
        return Math.max(max, metrics.width);
      }, 0);

      // Ajouter le padding horizontal + espace pour l'icône chevron
      const paddingX = isCompact ? 8 : 24; // px-3 = 12px de chaque côté = 24px total
      const chevronSpace = isCompact ? 12 : 20; // espace pour l'icône chevron
      const calculatedWidth = Math.ceil(maxWidth + paddingX + chevronSpace);

      setBadgeWidth(calculatedWidth);
    };

    calculateMaxWidth();
  }, [options, placeholder, isCompact]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (selectRef.current && selectRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      if (selectRef.current && !selectRef.current.contains(target)) {
        setIsOpen(false);
        setHoveredValue(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/30 text-blue-200 border-blue-400/50 backdrop-blur-md',
    green: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 backdrop-blur-md',
    red: 'bg-red-500/30 text-red-200 border-red-400/50 backdrop-blur-md',
    orange: 'bg-amber-500/30 text-amber-200 border-amber-400/50 backdrop-blur-md',
    purple: 'bg-purple-500/30 text-purple-200 border-purple-400/50 backdrop-blur-md',
    slate: 'bg-slate-500/30 text-slate-200 border-slate-400/50 backdrop-blur-md',
  };

  const glassSelectBase =
    'inline-flex items-center font-medium rounded-full border bg-gray-900/40 backdrop-blur-md shadow-[0_12px_40px_-18px_rgba(0,0,0,0.9)]';
  const glassDropdownBase =
    'fixed mt-1 min-w-full rounded-xl border backdrop-blur-md bg-gray-900/90 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)] border-gray-700/50 overflow-hidden';

  const sizeClasses = isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs';
  const dropdownItemClasses = isCompact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs';

  // Calculer la largeur optimale et la position
  const updateDropdownLayout = () => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const triggerWidth = triggerEl.getBoundingClientRect().width;
    const triggerRect = triggerEl.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      setDropdownWidth(triggerWidth);
      setDropdownPosition({ left: triggerRect.left, top: triggerRect.bottom + 4 });
      return;
    }
    const computedStyle = getComputedStyle(triggerEl);
    context.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

    const longest = options.reduce((max, opt) => {
      const metrics = context.measureText(opt.label);
      return Math.max(max, metrics.width);
    }, 0);

    // Ajouter un padding horizontal équivalent à celui du trigger
    const paddingX = isCompact ? 16 : 24;
    const finalWidth = Math.max(triggerWidth, longest + paddingX);
    setDropdownWidth(Math.min(finalWidth, 400)); // limite raisonnable
    setDropdownPosition({ left: triggerRect.left, top: triggerRect.bottom + 4 });
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownLayout();
      const handleResize = () => updateDropdownLayout();
      const handleScroll = () => updateDropdownLayout();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, options, isCompact]);

  return (
    <div ref={selectRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        ref={triggerRef}
        className={`${glassSelectBase} ${sizeClasses} cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/60 hover:opacity-90 transition-all ${
          selectedOption?.color
            ? colorMap[selectedOption.color] || colorMap.blue
            : colorMap[currentColor] || colorMap.blue
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        style={{
          paddingRight: isCompact ? '1rem' : '1.75rem',
          minWidth: isCompact ? 'auto' : badgeWidth ? `${badgeWidth}px` : 'auto',
          width: isCompact ? 'auto' : badgeWidth ? `${badgeWidth}px` : 'auto',
        }}
      >
        <span className="whitespace-nowrap">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={isCompact ? 10 : 12}
          className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{
            position: 'absolute',
            right: isCompact ? '0.15rem' : '0.5rem',
          }}
        />
      </button>

      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className={glassDropdownBase}
            style={{
              minWidth: dropdownWidth ?? 'max-content',
              width: dropdownWidth ?? 'max-content',
              zIndex: 500,
              left: dropdownPosition.left,
              top: dropdownPosition.top,
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.value === value;
                const isHovered = hoveredValue === option.value;
                const optionColor = option.color || currentColor;
                const colorClass = colorMap[optionColor] || colorMap.blue;
                const buttonStyle =
                  isHovered || isSelected ? undefined : { transitionProperty: 'background,color' };
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setHoveredValue(null);
                    }}
                    onMouseEnter={() => setHoveredValue(option.value)}
                    onMouseLeave={() => setHoveredValue(null)}
                    className={`${dropdownItemClasses} w-full text-left transition-all whitespace-nowrap font-medium ${
                      isSelected || isHovered
                        ? `${colorClass} !opacity-100`
                        : 'bg-gray-800/50 text-gray-200'
                    } hover:opacity-100`}
                    style={buttonStyle}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
