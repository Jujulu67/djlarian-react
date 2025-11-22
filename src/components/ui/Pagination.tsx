import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  maxVisiblePages?: number;
}

interface PageButtonProps {
  page: number;
  isCurrent: boolean;
  onPageChange: (page: number) => void;
}

interface NavButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
}

// Composants extraits pour éviter la recréation à chaque render
const PageButton: React.FC<PageButtonProps> = ({ page, isCurrent, onPageChange }) => (
  <button
    className={cn(
      'relative w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      isCurrent
        ? 'bg-purple-600 text-white'
        : 'bg-gray-800/70 text-gray-300 hover:bg-purple-900/50 hover:text-white',
      'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-1 focus:ring-offset-gray-900',
      'disabled:opacity-50 disabled:pointer-events-none'
    )}
    onClick={() => onPageChange(page)}
    disabled={isCurrent}
    aria-current={isCurrent ? 'page' : undefined}
    aria-label={`Page ${page}`}
  >
    {page}
  </button>
);

const NavButton: React.FC<NavButtonProps> = ({ icon, onClick, disabled, ariaLabel }) => (
  <button
    className={cn(
      'relative w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors',
      'bg-gray-800/70 text-gray-300 hover:bg-purple-900/50 hover:text-white',
      'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-1 focus:ring-offset-gray-900',
      disabled ? 'opacity-50 pointer-events-none' : ''
    )}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
  >
    {icon}
  </button>
);

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  maxVisiblePages = 5,
}) => {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisiblePages = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(currentPage - halfVisiblePages, 1);
    const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(endPage - maxVisiblePages + 1, 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const pages = getVisiblePages();

  return (
    <div className={cn('flex items-center justify-center space-x-1', className)}>
      <NavButton
        icon={<ChevronsLeft size={16} />}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        ariaLabel="Première page"
      />
      <NavButton
        icon={<ChevronLeft size={16} />}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        ariaLabel="Page précédente"
      />

      {pages.map((page) => (
        <PageButton
          key={page}
          page={page}
          isCurrent={page === currentPage}
          onPageChange={onPageChange}
        />
      ))}

      <NavButton
        icon={<ChevronRight size={16} />}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        ariaLabel="Page suivante"
      />
      <NavButton
        icon={<ChevronsRight size={16} />}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        ariaLabel="Dernière page"
      />
    </div>
  );
};
