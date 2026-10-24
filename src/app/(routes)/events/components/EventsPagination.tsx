interface EventsPaginationProps {
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
}

export function EventsPagination({ currentPage, totalPages, paginate }: EventsPaginationProps) {
  return (
    <div className="mt-8 sm:mt-10 flex justify-center">
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {/* Bouton précédent */}
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
            currentPage === 1
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
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
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm ${
                  currentPage === pageNumber
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold'
                    : 'bg-gray-800/80 text-white hover:bg-gray-700/80'
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
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 text-xs sm:text-sm"
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
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${
            currentPage === totalPages
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800/80 text-white hover:bg-purple-600/70'
          }`}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
