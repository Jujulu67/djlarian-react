interface EventsPaginationProps {
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
}

export function EventsPagination({ currentPage, totalPages, paginate }: EventsPaginationProps) {
  return (
    <div
      className="mt-8 sm:mt-10 flex justify-center v2:mt-12"
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {/* Bouton précédent */}
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm v2:h-9 v2:rounded-full v2:px-4 v2:py-0 v2:font-medium v2:ring-1 v2:ring-inset v2:ring-white/10 v2:transition-colors sm:v2:h-10 ${
            currentPage === 1
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed v2:bg-white/[0.02] v2:text-white/30'
              : 'bg-gray-800/80 text-white hover:bg-purple-600/70 v2:bg-white/[0.04] v2:text-white/70 v2:hover:bg-white/[0.08] v2:hover:text-white v2:active:scale-[0.98]'
          }`}
        >
          <span className="hidden sm:inline">Précédent</span>
          <span className="sm:hidden">Préc.</span>
        </button>

        {/* Numéros de page */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
          // Afficher uniquement les 3 premières pages, les 3 dernières et la page courante ± 1
          if (
            pageNumber <= 3 ||
            pageNumber > totalPages - 3 ||
            Math.abs(pageNumber - currentPage) <= 1
          ) {
            return (
              <button
                key={pageNumber}
                onClick={() => paginate(pageNumber)}
                aria-current={currentPage === pageNumber ? 'page' : undefined}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm v2:h-9 v2:w-9 v2:rounded-full v2:font-medium v2:transition-colors sm:v2:h-10 sm:v2:w-10 ${
                  currentPage === pageNumber
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold v2:bg-none v2:bg-white v2:text-zinc-950'
                    : 'bg-gray-800/80 text-white hover:bg-gray-700/80 v2:bg-white/[0.04] v2:text-white/70 v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.08] v2:hover:text-white v2:active:scale-[0.98]'
                }`}
              >
                {pageNumber}
              </button>
            );
          } else if (
            (pageNumber === 4 && currentPage < 4) ||
            (pageNumber === totalPages - 3 && currentPage > totalPages - 3)
          ) {
            // Afficher des points de suspension pour indiquer des pages manquantes
            return (
              <span
                key={pageNumber}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 text-xs sm:text-sm v2:text-white/40"
              >
                ...
              </span>
            );
          }
          return null;
        })}

        {/* Bouton suivant */}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm v2:h-9 v2:rounded-full v2:px-4 v2:py-0 v2:font-medium v2:ring-1 v2:ring-inset v2:ring-white/10 v2:transition-colors sm:v2:h-10 ${
            currentPage === totalPages
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed v2:bg-white/[0.02] v2:text-white/30'
              : 'bg-gray-800/80 text-white hover:bg-purple-600/70 v2:bg-white/[0.04] v2:text-white/70 v2:hover:bg-white/[0.08] v2:hover:text-white v2:active:scale-[0.98]'
          }`}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
