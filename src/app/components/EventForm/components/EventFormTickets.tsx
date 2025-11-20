import React from 'react';
import { Switch } from '@/components/ui';
import { useEventTickets } from '../hooks/useEventTickets';
import { EventFormData } from '../types';

interface EventFormTicketsProps {
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  errors: Record<string, string>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const inputBaseClass =
  'w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200';
const labelBaseClass = 'block text-gray-300 font-medium mb-2';

/**
 * Component for event tickets section
 */
export const EventFormTickets: React.FC<EventFormTicketsProps> = ({
  formData,
  setFormData,
  errors,
  handleChange,
  handleCheckboxChange,
}) => {
  const { hasTickets, featured, tickets, toggleHasTickets, toggleFeatured } = useEventTickets({
    formData,
    setFormData,
    handleChange,
    handleCheckboxChange,
  });

  return (
    <div className="space-y-6 pt-2">
      <h2 className="text-xl font-bold text-white mb-6 pb-3 border-b border-gray-700/60 flex items-center">
        <span className="flex items-center justify-center h-7 w-7 bg-purple-500/20 text-purple-400 rounded-lg mr-3 text-sm font-semibold">
          3
        </span>
        Billetterie et mise en avant
      </h2>

      <div className="mb-6">
        <div className="flex items-center justify-between py-2">
          <label htmlFor="hasTickets" className="text-gray-300 font-medium">
            Cet événement propose des billets
          </label>
          <Switch id="hasTickets" name="hasTickets" checked={hasTickets} onCheckedChange={toggleHasTickets} />
        </div>
      </div>

      {hasTickets && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="tickets.price" className={labelBaseClass}>
              Prix (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="tickets.price"
                name="tickets.price"
                value={tickets.price}
                onChange={handleChange}
                className={`${inputBaseClass} pr-10 ${errors['tickets.price'] ? 'border-red-500 bg-red-900/10' : ''}`}
                min="0"
                step="0.01"
                required
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
            </div>
            {errors['tickets.price'] && (
              <p className="mt-2 text-red-500 text-sm">{errors['tickets.price']}</p>
            )}
          </div>

          <div>
            <label htmlFor="tickets.buyUrl" className={labelBaseClass}>
              URL de billetterie <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="tickets.buyUrl"
              name="tickets.buyUrl"
              value={tickets.buyUrl || ''}
              onChange={handleChange}
              className={`${inputBaseClass} ${errors['tickets.buyUrl'] ? 'border-red-500 bg-red-900/10' : ''}`}
              placeholder="https://..."
              required
            />
            {errors['tickets.buyUrl'] && (
              <p className="mt-2 text-red-500 text-sm">{errors['tickets.buyUrl']}</p>
            )}
          </div>
        </div>
      )}

      {hasTickets && (
        <div className="mt-6">
          <label htmlFor="tickets.quantity" className={labelBaseClass}>
            Quantité de billets disponibles
          </label>
          <input
            type="number"
            id="tickets.quantity"
            name="tickets.quantity"
            value={tickets.quantity || ''}
            onChange={handleChange}
            className={`${inputBaseClass} ${errors['tickets.quantity'] ? 'border-red-500 bg-red-900/10' : ''}`}
            min="0"
            step="1"
          />
          {errors['tickets.quantity'] && (
            <p className="mt-2 text-red-500 text-sm">{errors['tickets.quantity']}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between py-2 mt-6">
        <label htmlFor="featured" className="text-gray-300 font-medium">
          Mettre en avant cet événement
        </label>
        <Switch id="featured" name="featured" checked={featured} onCheckedChange={toggleFeatured} />
      </div>
    </div>
  );
};

