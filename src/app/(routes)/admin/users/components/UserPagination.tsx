'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UserPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  currentParams: URLSearchParams;
}

export const UserPagination = ({
  currentPage,
  totalPages,
  baseUrl,
  currentParams,
}: UserPaginationProps) => {
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(currentParams);
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center mt-8 space-x-4">
      {currentPage <= 1 ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronLeft className="h-5 w-5" />
        </span>
      ) : (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
          aria-label="Page précédente"
          prefetch={false}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <span className="text-sm text-gray-300 font-medium">
        Page {currentPage} sur {totalPages}
      </span>
      {currentPage >= totalPages ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
          aria-label="Page suivante"
          prefetch={false}
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
};
