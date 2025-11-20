import { useCallback } from 'react';

import { EventFormData, TicketInfo } from '../types';

interface UseEventTicketsProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Hook to manage event tickets logic
 */
export const useEventTickets = ({
  formData,
  setFormData,
  handleChange,
  handleCheckboxChange,
}: UseEventTicketsProps) => {
  const toggleHasTickets = useCallback(
    (checked: boolean) => {
      const event = {
        target: {
          type: 'checkbox',
          name: 'hasTickets',
          id: 'hasTickets',
          checked,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      handleCheckboxChange(event);
    },
    [handleCheckboxChange]
  );

  const toggleFeatured = useCallback(
    (checked: boolean) => {
      const event = {
        target: {
          type: 'checkbox',
          name: 'featured',
          id: 'featured',
          checked,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      handleCheckboxChange(event);
    },
    [handleCheckboxChange]
  );

  return {
    hasTickets: formData.hasTickets || false,
    featured: formData.featured || false,
    tickets: formData.tickets || ({} as TicketInfo),
    toggleHasTickets,
    toggleFeatured,
    handleChange,
  };
};
