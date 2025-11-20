import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export interface EventData {
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  isPublished?: boolean;
  imageId?: string;
  tickets?: {
    price: number;
    currency: string;
    buyUrl: string;
    quantity: number;
  } | null;
  featured?: boolean;
  recurrence?: {
    isRecurring: boolean;
    frequency: 'weekly' | 'monthly';
    day?: number;
    endDate?: string;
    excludedDates?: string[];
  };
}

export const useEditEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const saveEvent = async (eventId: string | undefined, data: EventData) => {
    setLoading(true);
    setError(null);

    const isCreate = !eventId;
    const url = isCreate ? '/api/events' : `/api/events/${eventId}`;
    const method = isCreate ? 'POST' : 'PATCH';

    try {
      logger.debug(`Sending ${method} request to ${url} with data:`, data);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      logger.debug(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          logger.error('API Error Response:', errorData);
          errorMessage =
            errorData.error || errorData.message || errorData.details || response.statusText;
        } catch (parseError) {
          logger.error('Error parsing error response:', parseError);
          errorMessage = `${response.status}: ${response.statusText} (Couldn't parse error)`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      logger.debug(`Event ${isCreate ? 'created' : 'updated'} successfully:`, result);
      setLoading(false);
      return result;
    } catch (err: unknown) {
      logger.error('Error saving event:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Upload failed:', errorText);
        throw new Error(`Erreur lors de l'upload de l'image: ${response.statusText}`);
      }

      const result = await response.json();
      return result.imageId;
    } catch (error: unknown) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  };

  return {
    saveEvent,
    uploadImage,
    loading,
    error,
  };
};

export default useEditEvent;
