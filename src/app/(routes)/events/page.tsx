'use client';

import { motion } from 'framer-motion';
import { Calendar, Loader2, Sparkles, XCircle, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { EventCard } from './components/EventCard';
import { EventsFilters } from './components/EventsFilters';
import { EventsPagination } from './components/EventsPagination';
import { useEventsList } from './hooks/useEventsList';
import { filterEventsBySearch } from './utils';

function EventsContent() {
  const searchParams = useSearchParams();
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const itemsPerPageOptions = [20, 50, 100];

  const { events, loading, error } = useEventsList(selectedStatus);

  // Filtrer les événements par recherche
  const filteredEvents = filterEventsBySearch(events, searchTerm);

  // Pagination des événements filtrés
  const indexOfLastEvent = currentPage * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

  // Changer de page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Gérer le changement de filtre de statut
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-16 h-16 text-purple-500 mb-4 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-white mt-4">
                Chargement des événements...
              </h2>
              <p className="text-gray-400 mt-2">Préparez-vous à vivre des expériences uniques</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="bg-gray-800/40 backdrop-blur-sm border border-red-500/30 p-8 rounded-xl text-center max-w-lg shadow-xl">
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Une erreur est survenue</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-purple-900/30"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-900 to-black p-8 pt-28 pb-20">
      <div className="container mx-auto max-w-6xl">
        {/* Titre avec animation et icône */}
        <div className="relative mb-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          >
            Événements
          </motion.h1>
          <Sparkles className="absolute top-0 right-[calc(50%-150px)] md:right-[calc(50%-180px)] w-8 h-8 md:w-10 md:h-10 text-yellow-400 transform -translate-y-1 animate-pulse" />
        </div>

        {/* Sous-titre */}
        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
          Découvrez les prochaines dates de Larian et rejoignez-nous pour des soirées électroniques
          inoubliables.
        </p>

        <EventsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedStatus={selectedStatus}
          handleStatusChange={handleStatusChange}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />

        {/* Liste des événements */}
        {filteredEvents.length === 0 ? (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-10 border border-gray-700/50 text-center shadow-xl">
            <div className="w-24 h-24 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-12 h-12 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Aucun événement trouvé</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm
                ? `Aucun résultat ne correspond à &quot;${searchTerm}&quot;`
                : selectedStatus === 'all'
                  ? 'Aucun événement disponible pour le moment'
                  : `Aucun événement ${selectedStatus === 'UPCOMING' ? 'à venir' : selectedStatus === 'COMPLETED' ? 'passé' : 'annulé'}`}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-2.5 bg-purple-600/80 hover:bg-purple-500/80 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Sélection du nombre d'éléments par page */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div className="text-xs sm:text-sm text-gray-400">
                Affichage de {indexOfFirstEvent + 1}-
                {Math.min(indexOfLastEvent, filteredEvents.length)} sur {filteredEvents.length}{' '}
                événements
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label
                  htmlFor="itemsPerPage"
                  className="text-xs sm:text-sm text-gray-300 whitespace-nowrap"
                >
                  Par page:
                </label>
                <select
                  id="itemsPerPage"
                  className="bg-gray-800/70 text-white rounded-lg px-2 sm:px-3 py-1.5 border border-gray-700/50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Retour à la première page lors du changement
                  }}
                >
                  {itemsPerPageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {currentEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <EventsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                paginate={paginate}
              />
            )}
          </>
        )}

        {/* Section CTA en bas de page */}
        <div className="mt-16 py-10 px-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-md rounded-2xl border border-purple-500/20 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Vous organisez un événement ?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            DJ Larian est disponible pour animer vos soirées, clubs et festivals. Contactez-nous
            pour discuter de votre projet et obtenir un devis personnalisé.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-700/30 hover:shadow-purple-700/50 transform hover:-translate-y-1"
          >
            Nous contacter
            <ChevronDown className="w-5 h-5 transform -rotate-90" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
          <div className="container mx-auto max-w-6xl">
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-pulse flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-purple-500 mb-4 animate-spin" />
                <h2 className="text-2xl font-semibold text-white mt-4">
                  Chargement des événements...
                </h2>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
