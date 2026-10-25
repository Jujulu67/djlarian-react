'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { RevealGroup } from '@/components/ui/Reveal';

import { EventCard } from './components/EventCard';
import { EventsContactCta } from './components/EventsContactCta';
import { EventsFilters } from './components/EventsFilters';
import { EventsHeader } from './components/EventsHeader';
import { EventsListToolbar } from './components/EventsListToolbar';
import { EventsPagination } from './components/EventsPagination';
import {
  EVENTS_CONTAINER_CLASS,
  EVENTS_PAGE_CLASS,
  EventsEmptyState,
  EventsErrorState,
  EventsLoadingState,
  EventsSuspenseFallback,
} from './components/EventsStates';
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
    return <EventsLoadingState />;
  }

  if (error) {
    return <EventsErrorState error={error} />;
  }

  return (
    <div className={EVENTS_PAGE_CLASS}>
      <div className={EVENTS_CONTAINER_CLASS}>
        <EventsHeader />

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
          <EventsEmptyState
            searchTerm={searchTerm}
            selectedStatus={selectedStatus}
            onClearSearch={() => setSearchTerm('')}
          />
        ) : (
          <>
            {/* Sélection du nombre d'éléments par page */}
            <EventsListToolbar
              first={indexOfFirstEvent + 1}
              last={Math.min(indexOfLastEvent, filteredEvents.length)}
              total={filteredEvents.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1); // Retour à la première page lors du changement
              }}
            />

            {/* En v2, chaque carte (motion) apparaît en cascade ; en legacy, simple <div> */}
            <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 v3:grid-cols-1 v3:gap-0 v3:rule-t md:v3:grid-cols-1 lg:v3:grid-cols-1 sm:v3:gap-0 lg:v3:gap-0">
              {currentEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </RevealGroup>

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
        <EventsContactCta />
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsSuspenseFallback />}>
      <EventsContent />
    </Suspense>
  );
}
